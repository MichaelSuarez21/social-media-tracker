'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function TwitterCallbackDebug() {
  const searchParams = useSearchParams();
  const [cookies, setCookies] = useState<string[]>([]);

  // Read URL parameters
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  
  // Load all cookies to display
  useEffect(() => {
    const allCookies = document.cookie.split(';').map(cookie => cookie.trim());
    setCookies(allCookies);
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto bg-gray-900 text-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6">Twitter OAuth Debug Page</h1>
      
      <div className="mb-8">
        <p className="text-yellow-300 mb-2">
          This page is for debugging Twitter OAuth integration issues.
          The presence of this page indicates that the OAuth flow completed but 
          there was an issue with authentication or session handling.
        </p>
      </div>
      
      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-2">URL Parameters</h2>
        <div className="grid grid-cols-1 gap-2">
          <div>
            <span className="text-gray-400">code:</span>{' '}
            <span className="font-mono">
              {code ? `${code.substring(0, 20)}... (${code.length} chars)` : 'Missing'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">state:</span>{' '}
            <span className="font-mono">{state || 'Missing'}</span>
          </div>
          <div>
            <span className="text-gray-400">error:</span>{' '}
            <span className="font-mono text-red-400">{error || 'None'}</span>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-2">Cookies</h2>
        {cookies.length > 0 ? (
          <ul className="list-disc list-inside font-mono text-sm">
            {cookies.map((cookie, index) => (
              <li key={index} className="break-all">{cookie}</li>
            ))}
          </ul>
        ) : (
          <p className="text-red-400">No cookies found!</p>
        )}
      </div>
      
      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-2">Common Issues</h2>
        <ul className="list-disc list-inside space-y-2 text-sm">
          <li>
            <strong>Session cookies not preserved during OAuth redirect</strong>
            <p className="ml-6 text-gray-400">
              Check if 'sb-auth-token' cookie exists. If not, session was lost during redirect.
            </p>
          </li>
          <li>
            <strong>Twitter OAuth state mismatch</strong>
            <p className="ml-6 text-gray-400">
              Check if 'twitter_oauth_state' cookie exists and matches the state parameter.
            </p>
          </li>
          <li>
            <strong>Code verifier missing</strong>
            <p className="ml-6 text-gray-400">
              Check if 'twitter_code_verifier' cookie exists.
            </p>
          </li>
          <li>
            <strong>Domain mismatch between localhost and 127.0.0.1</strong>
            <p className="ml-6 text-gray-400">
              Make sure all cookies are accessible regardless of using localhost or 127.0.0.1.
            </p>
          </li>
        </ul>
      </div>
      
      <div className="mt-8 flex gap-4">
        <Link href="/accounts" className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700">
          Go to Accounts
        </Link>
        <Link href="/" className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">
          Go to Home
        </Link>
      </div>
    </div>
  );
} 