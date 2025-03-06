#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const { program } = require('commander');

// Load environment variables
dotenv.config();

// Configure CLI options
program
  .name('run-migrations')
  .description('Run database migrations for the Social Media Tracker')
  .option('-d, --db-only', 'Only run the database schema migrations')
  .option('-f, --functions-only', 'Only run the function migrations')
  .option('-a, --all', 'Run all migrations (default)')
  .option('-s, --single <file>', 'Run a single migration file')
  .parse(process.argv);

const options = program.opts();

// Default to running all migrations if no specific option is provided
if (!options.dbOnly && !options.functionsOnly && !options.single) {
  options.all = true;
}

async function main() {
  console.log('🚀 Starting database migrations...');

  // Check for required environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables:');
    if (!supabaseUrl) console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseServiceKey) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  
  // Create Supabase client with service role key
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Run a single specific migration if requested
    if (options.single) {
      const filePath = options.single;
      if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        process.exit(1);
      }
      
      await runMigration(supabase, filePath);
      console.log('✅ Single migration completed successfully!');
      return;
    }
    
    // Run database schema migrations
    if (options.dbOnly || options.all) {
      console.log('📊 Running database schema migrations...');
      const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');
      
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort(); // Run in alphabetical order
      
      for (const file of migrationFiles) {
        const filePath = path.join(migrationsDir, file);
        await runMigration(supabase, filePath);
      }
      
      console.log('✅ Database schema migrations completed!');
    }
    
    // Run function migrations
    if (options.functionsOnly || options.all) {
      console.log('⚙️ Running database function migrations...');
      const functionsDir = path.join(__dirname, '..', 'db', 'functions');
      
      const functionFiles = fs.readdirSync(functionsDir)
        .filter(file => file.endsWith('.sql'))
        .sort(); // Run in alphabetical order
      
      for (const file of functionFiles) {
        const filePath = path.join(functionsDir, file);
        await runMigration(supabase, filePath);
      }
      
      console.log('✅ Database function migrations completed!');
    }
    
    console.log('🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

async function runMigration(supabase, filePath) {
  const fileName = path.basename(filePath);
  const sql = fs.readFileSync(filePath, 'utf8');
  
  console.log(`📄 Running migration: ${fileName}`);
  
  try {
    const { error } = await supabase.rpc('pgexec', { command: sql });
    
    if (error) {
      console.error(`❌ Error running ${fileName}:`, error.message);
      throw error;
    }
    
    console.log(`✅ Completed: ${fileName}`);
  } catch (error) {
    console.error(`❌ Failed to run ${fileName}:`, error.message);
    throw error;
  }
}

main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
}); 