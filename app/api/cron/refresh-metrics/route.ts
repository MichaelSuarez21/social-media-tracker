import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import logger from '@/lib/logger'
import { MetricsService } from '@/lib/metricsService'

// For now, we'll define YouTubePlatform directly here until we have the proper implementation
class YouTubePlatform {
  constructor(private account: any) {}
  
  async ensureValidTokens(): Promise<void> {
    logger.info(`Ensuring valid tokens for account ${this.account.id}`)
    // Implementation will be in the real platform file
  }
  
  async getMetrics(): Promise<any> {
    logger.info(`Getting metrics for account ${this.account.id}`)
    // Mock implementation
    return {
      channel: {
        id: 'channel123',
        title: 'Test Channel',
        thumbnail: 'https://example.com/thumbnail.jpg'
      }
    }
  }
}

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max execution time

// Create a service client to fetch all accounts across users
const createServiceClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
}

interface SocialAccount {
  id: string
  platform: string
  access_token: string
  refresh_token?: string
  token_secret?: string
  expires_at?: string
  is_active: boolean
  user_id: string
}

/**
 * Cron job handler to refresh metrics for all connected social accounts
 * This endpoint should be called with a valid API key:
 * GET /api/cron/refresh-metrics?key=YOUR_API_KEY
 */
export async function GET() {
  try {
    logger.info('[cron] Starting metrics refresh job')
    
    // Create service client and metrics service
    const supabase = createServiceClient()
    const metricsService = new MetricsService()
    
    // Fetch all connected social accounts
    const { data: accounts, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('is_active', true)
    
    if (error) {
      logger.error('[cron] Error fetching social accounts', { error })
      return NextResponse.json({ 
        success: false, 
        message: 'Error fetching social accounts', 
        error: error.message 
      }, { status: 500 })
    }
    
    if (!accounts || accounts.length === 0) {
      logger.info('[cron] No active social accounts found')
      return NextResponse.json({ 
        success: true, 
        message: 'No active social accounts found' 
      })
    }
    
    logger.info(`[cron] Found ${accounts.length} active accounts to process`)
    
    // Process each account
    const results = await Promise.allSettled(
      accounts.map(async (account: SocialAccount) => {
        try {
          logger.info(`[cron] Processing account: ${account.platform} - ${account.id}`)
          
          // Currently only YouTube is implemented
          if (account.platform === 'youtube') {
            const platform = new YouTubePlatform(account)
            
            // Refresh tokens if needed
            await platform.ensureValidTokens()
            
            // Get metrics
            const metrics = await platform.getMetrics()
            
            // Store metrics
            const result = await metricsService.storeMetrics(account.id, metrics)
            
            // Update account metadata
            await metricsService.updateAccountMetadata(account.id, { 
              username: metrics.channel.title,
              avatar_url: metrics.channel.thumbnail,
              last_metrics_refresh: new Date().toISOString()
            })
            
            return { 
              account_id: account.id, 
              platform: account.platform,
              success: true, 
              metrics_stored: result 
            }
          } else {
            // Skip other platforms for now
            return { 
              account_id: account.id, 
              platform: account.platform,
              success: false, 
              message: 'Platform not supported yet' 
            }
          }
        } catch (err: any) {
          logger.error(`[cron] Error processing account ${account.id}`, { error: err })
          return { 
            account_id: account.id, 
            platform: account.platform,
            success: false, 
            error: err.message || 'Unknown error' 
          }
        }
      })
    )
    
    // Count successes and failures
    const succeeded = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length
    const failed = results.length - succeeded
    
    logger.info(`[cron] Metrics refresh job completed. Success: ${succeeded}, Failed: ${failed}`)
    
    return NextResponse.json({ 
      success: true, 
      message: `Processed ${results.length} accounts. Success: ${succeeded}, Failed: ${failed}`,
      results
    })
  } catch (err: any) {
    logger.error('[cron] Error in metrics refresh job', { error: err })
    return NextResponse.json({ 
      success: false, 
      message: 'Error in metrics refresh job', 
      error: err.message || 'Unknown error' 
    }, { status: 500 })
  }
} 