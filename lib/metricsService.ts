import { createClient, SupabaseClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';
import { SocialMetrics, SocialMetricsRecord } from './social/BasePlatform';

/**
 * Service for managing social media metrics in the database
 */
export class MetricsService {
  private supabase: SupabaseClient;
  
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
  }
  
  /**
   * Store metrics data for a social account
   * @param accountId The social account ID
   * @param metrics The metrics data to store
   * @returns The ID of the stored metrics record
   */
  async storeMetrics(accountId: string, metrics: any): Promise<string | null> {
    try {
      logger.info(`Storing metrics for account ${accountId}`);
      
      // Calculate engagement rates
      let engagementRate = 0;
      let avgLikes = 0;
      let avgComments = 0;
      
      if (metrics.recentVideos && metrics.recentVideos.length > 0) {
        const totalLikes = metrics.recentVideos.reduce((sum: number, video: any) => sum + (video.likeCount || 0), 0);
        const totalComments = metrics.recentVideos.reduce((sum: number, video: any) => sum + (video.commentCount || 0), 0);
        
        avgLikes = totalLikes / metrics.recentVideos.length;
        avgComments = totalComments / metrics.recentVideos.length;
        
        // Engagement rate formula: (likes + comments) / subscriberCount * 100
        engagementRate = metrics.channel.subscriberCount > 0 
          ? ((totalLikes + totalComments) / metrics.channel.subscriberCount) * 100 
          : 0;
      }
      
      // Prepare metrics data
      const metricsData = {
        account_id: accountId,
        platform: 'youtube', // This would be dynamic in a more complete implementation
        followers: metrics.channel.subscriberCount,
        engagement_rate: engagementRate,
        total_posts: metrics.channel.videoCount,
        total_views: metrics.channel.viewCount,
        avg_likes: avgLikes,
        avg_comments: avgComments,
        raw_data: metrics,
        captured_at: new Date().toISOString()
      };
      
      // Store metrics using a stored procedure
      const { data, error } = await this.supabase.rpc(
        'store_social_metrics',
        { p_metrics: metricsData }
      );
      
      if (error) {
        logger.error(`Failed to store metrics`, { error });
        throw new Error(`Database error: ${error.message}`);
      }
      
      logger.info(`Successfully stored metrics with ID: ${data}`);
      return data;
    } catch (err) {
      logger.error(`Error storing metrics`, { error: err });
      return null;
    }
  }
  
  /**
   * Get the latest metrics for a social account
   * @param accountId The social account ID
   * @param maxAgeDays Maximum age of metrics in days
   * @returns The latest metrics data
   */
  async getLatestMetrics(accountId: string, maxAgeDays = 1): Promise<any> {
    try {
      logger.info(`Getting latest metrics for account ${accountId}`);
      
      const { data, error } = await this.supabase.rpc(
        'get_latest_metrics',
        { 
          p_account_id: accountId,
          p_max_age_days: maxAgeDays
        }
      );
      
      if (error) {
        logger.error(`Failed to get latest metrics`, { error });
        throw new Error(`Database error: ${error.message}`);
      }
      
      return data;
    } catch (err) {
      logger.error(`Error getting latest metrics`, { error: err });
      return null;
    }
  }
  
  /**
   * Update metadata for a social account
   * @param accountId The social account ID
   * @param metadata The metadata to update
   * @returns Success status
   */
  async updateAccountMetadata(accountId: string, metadata: { 
    username?: string, 
    avatar_url?: string,
    last_metrics_refresh?: string
  }): Promise<boolean> {
    try {
      logger.info(`Updating metadata for account ${accountId}`);
      
      const { error } = await this.supabase.rpc(
        'update_social_account_metadata',
        { 
          p_account_id: accountId,
          p_metadata: metadata
        }
      );
      
      if (error) {
        logger.error(`Failed to update account metadata`, { error });
        return false;
      }
      
      return true;
    } catch (err) {
      logger.error(`Error updating account metadata`, { error: err });
      return false;
    }
  }
  
  /**
   * Get historical metrics for an account
   * @param accountId The social account ID
   * @param days Number of days to retrieve
   * @returns Array of metrics records
   */
  async getMetricsHistory(accountId: string, days = 30): Promise<any[]> {
    try {
      logger.info(`Getting metrics history for account ${accountId}`);
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await this.supabase
        .from('social_metrics')
        .select('*')
        .eq('account_id', accountId)
        .gte('captured_at', startDate.toISOString())
        .order('captured_at', { ascending: false });
      
      if (error) {
        logger.error(`Failed to get metrics history`, { error });
        throw new Error(`Database error: ${error.message}`);
      }
      
      return data || [];
    } catch (err) {
      logger.error(`Error getting metrics history`, { error: err });
      return [];
    }
  }
} 