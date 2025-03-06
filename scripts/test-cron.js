#!/usr/bin/env node

const { program } = require('commander');
const fetch = require('node-fetch');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configure CLI options
program
  .name('test-cron')
  .description('Test the metrics refresh cron job')
  .option('-u, --url <url>', 'Deployment URL (defaults to localhost:3000)')
  .option('-k, --key <key>', 'API key (defaults to value from .env file)')
  .parse(process.argv);

const options = program.opts();

async function main() {
  // Get the deployment URL and API key
  const baseUrl = options.url || 'http://localhost:3000';
  const apiKey = options.key || process.env.METRICS_REFRESH_API_KEY;
  
  if (!apiKey) {
    console.error('❌ No API key provided. Please specify with --key or add METRICS_REFRESH_API_KEY to your .env file');
    process.exit(1);
  }
  
  const url = `${baseUrl}/api/cron/refresh-metrics?key=${apiKey}`;
  
  console.log(`🚀 Testing cron job at: ${url}`);
  
  try {
    // Make the request
    const response = await fetch(url);
    const data = await response.json();
    
    // Check if the request was successful
    if (response.status === 200 && data.success) {
      console.log('✅ Cron job executed successfully!');
      console.log('📊 Result:', data.message);
      
      // Show detailed results if available
      if (data.results && data.results.length > 0) {
        console.log('\n📋 Processing details:');
        data.results.forEach(result => {
          if (result.status === 'fulfilled') {
            if (result.value.success) {
              console.log(`   ✅ Account ${result.value.account_id} (${result.value.platform}): Success`);
            } else {
              console.log(`   ❌ Account ${result.value.account_id} (${result.value.platform}): Failed - ${result.value.message || result.value.error || 'Unknown error'}`);
            }
          } else {
            console.log(`   ❌ Account processing rejected: ${result.reason}`);
          }
        });
      }
    } else {
      console.error('❌ Cron job failed');
      console.error('Status:', response.status);
      console.error('Response:', data);
    }
  } catch (error) {
    console.error('❌ Error calling cron endpoint:', error.message);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
}); 