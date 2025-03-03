import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  try {
    console.log('------- DEBUG TWITTER CALLBACK -------');
    console.log('Received callback request');
    
    // Log all request information
    const { searchParams } = req.nextUrl;
    console.log('URL:', req.url);
    console.log('Query Parameters:');
    
    searchParams.forEach((value, key) => {
      console.log(`- ${key}: ${key === 'code' ? value.substring(0, 5) + '...' : value}`);
    });
    
    // Verify the presence of code and state
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    console.log('Error:', error);
    console.log('Error Description:', errorDescription);
    
    // Read cookies
    console.log('Cookies:');
    const storedState = req.cookies.get('twitter_oauth_state')?.value;
    const codeVerifier = req.cookies.get('twitter_code_verifier')?.value;
    
    console.log('- twitter_oauth_state:', storedState);
    console.log('- twitter_code_verifier:', codeVerifier ? `${codeVerifier.substring(0, 5)}... (${codeVerifier.length} chars)` : 'Not found');
    
    // Validate state
    if (state && storedState) {
      console.log('State validation:', state === storedState ? 'PASSED ✅' : 'FAILED ❌');
    } else {
      console.log('State validation: FAILED ❌ (missing state or stored state)');
    }
    
    // Build response HTML with diagnostic information
    const htmlResponse = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Twitter OAuth Debug</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: system-ui, sans-serif; line-height: 1.5; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5; color: #333; }
        h1 { color: #1DA1F2; }
        .card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .error { color: #e0245e; }
        .success { color: #17bf63; }
        .info { color: #1DA1F2; }
        .warning { color: #ffad1f; }
        code { background: #f1f1f1; padding: 2px 4px; border-radius: 4px; font-size: 90%; }
        .param { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .param-name { font-weight: bold; margin-right: 10px; }
        .param-value { word-break: break-all; }
        button { background: #1DA1F2; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
        button:hover { background: #1a91da; }
      </style>
    </head>
    <body>
      <h1>Twitter OAuth Debug</h1>
      
      <div class="card">
        <h2>Request Information</h2>
        <div class="param">
          <span class="param-name">URL:</span>
          <span class="param-value">${req.url}</span>
        </div>
      </div>

      ${error ? `
      <div class="card">
        <h2 class="error">OAuth Error</h2>
        <div class="param">
          <span class="param-name">Error:</span>
          <span class="param-value error">${error}</span>
        </div>
        <div class="param">
          <span class="param-name">Description:</span>
          <span class="param-value error">${errorDescription || 'No description'}</span>
        </div>
      </div>
      ` : ''}
      
      <div class="card">
        <h2>OAuth Parameters</h2>
        <div class="param">
          <span class="param-name">Code:</span>
          <span class="param-value">${code ? `${code.substring(0, 10)}... (${code.length} chars)` : 'Not provided'}</span>
        </div>
        <div class="param">
          <span class="param-name">State:</span>
          <span class="param-value">${state || 'Not provided'}</span>
        </div>
      </div>
      
      <div class="card">
        <h2>Cookies</h2>
        <div class="param">
          <span class="param-name">Stored State:</span>
          <span class="param-value ${storedState ? (state === storedState ? 'success' : 'error') : 'error'}">
            ${storedState || 'Not found'}
            ${storedState ? (state === storedState ? ' ✅' : ' ❌ (mismatch)') : ' ❌'}
          </span>
        </div>
        <div class="param">
          <span class="param-name">Code Verifier:</span>
          <span class="param-value ${codeVerifier ? 'success' : 'error'}">
            ${codeVerifier ? `${codeVerifier.substring(0, 10)}... (${codeVerifier.length} chars) ✅` : 'Not found ❌'}
          </span>
        </div>
      </div>
      
      <div class="card">
        <h2>Next Steps</h2>
        <p>Go to:</p>
        <p><a href="/debug/twitter"><button>Debug Home</button></a></p>
        <p><a href="/accounts"><button>Accounts Page</button></a></p>
      </div>
    </body>
    </html>
    `;
    
    // Return HTML response
    return new Response(htmlResponse, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error in debug Twitter callback:', error);
    return NextResponse.json({ 
      error: 'Failed to process Twitter callback for debugging'
    }, { status: 500 });
  }
} 