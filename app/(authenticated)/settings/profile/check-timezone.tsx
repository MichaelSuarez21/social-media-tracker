'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '@/lib/auth';

export default function CheckTimezone() {
  const { user } = useAuth();
  const [status, setStatus] = useState<string>('Checking database schema...');
  
  useEffect(() => {
    const checkAndUpdateSchema = async () => {
      if (!user) {
        setStatus('Must be logged in to check schema');
        return;
      }
      
      try {
        const supabase = createClientComponentClient();
        
        // Check if timezone column exists
        const { data: columnCheck, error: columnError } = await supabase
          .rpc('check_column_exists', {
            table_name: 'profiles',
            column_name: 'timezone'
          });
        
        if (columnError) {
          console.error('Error checking column existence:', columnError);
          setStatus(`Error: ${columnError.message}`);
          return;
        }
        
        if (!columnCheck) {
          setStatus('Timezone column does not exist. Adding it...');
          
          // Add timezone column using raw SQL
          const { error: alterError } = await supabase.rpc(
            'execute_sql',
            { sql: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone TEXT;' }
          );
          
          if (alterError) {
            console.error('Error adding timezone column:', alterError);
            setStatus(`Error adding column: ${alterError.message}`);
            return;
          }
          
          setStatus('Timezone column added successfully! Refreshing page...');
          // Refresh page after 1 second
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          setStatus('Timezone column exists. Schema is up to date.');
        }
      } catch (error) {
        console.error('Error in schema check:', error);
        setStatus(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    
    checkAndUpdateSchema();
  }, [user]);
  
  return (
    <div className="fixed bottom-4 right-4 p-4 bg-dark-600 rounded-lg shadow-lg text-sm">
      <div className="font-medium">Database Schema Check</div>
      <div className="text-gray-400">{status}</div>
    </div>
  );
} 