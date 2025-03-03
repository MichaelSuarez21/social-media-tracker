'use client';
import { useEffect } from 'react';

export default function AuthCallbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Add logging to understand when this layout is used
  useEffect(() => {
    console.log('AuthCallbackLayout mounted - no headers should show here');
  }, []);
  
  // This is a clean layout without any headers or footers
  // Just render the children directly
  return children;
} 