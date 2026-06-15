const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eznrxzbievvkyjvvdeps.supabase.co';
const supabaseKey = 'sb_publishable_CYlm2RpUSVgMsDN3xlyDaQ_urG9RBhv'; // Anon key
// Wait! To manage buckets, we should use the service role key or admin client.
// But wait! We don't have the service role key since it was a placeholder in .env.local!
// Wait, is there a service role key in our postgres database auth settings, or can we check if we have another way?
// Actually, we can run SQL commands directly using the PostgreSQL connection to insert the bucket row!
// In Supabase, storage buckets are rows in `storage.buckets`!
// Let's check if we can insert a bucket row into `storage.buckets` via postgres!
// Table: storage.buckets
// Schema:
//   id TEXT PRIMARY KEY
//   name TEXT UNIQUE NOT NULL
//   owner UUID
//   created_at TIMESTAMP WITH TIME ZONE
//   updated_at TIMESTAMP WITH TIME ZONE
//   public BOOLEAN DEFAULT false
//   avif_autofit BOOLEAN DEFAULT false
//   allowed_mime_types TEXT[]
//   file_size_limit BIGINT

const { Client } = require('pg');

const pgClient = new Client({
  host: 'db.eznrxzbievvkyjvvdeps.supabase.co',
  port: 5432,
  user: 'postgres',
  password: '3Reh@n@987%',
  database: 'postgres',
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  try {
    await pgClient.connect();
    console.log('Connected to database.');

    // Check if storage.buckets table exists
    const checkTable = await pgClient.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'storage' 
        AND table_name = 'buckets'
      )
    `);
    
    if (checkTable.rows[0].exists) {
      console.log('storage.buckets table exists.');
      
      // Check if certificates bucket exists
      const checkBucket = await pgClient.query("SELECT id FROM storage.buckets WHERE id = 'certificates'");
      if (checkBucket.rows.length === 0) {
        console.log('Creating certificates bucket in storage.buckets...');
        await pgClient.query(`
          INSERT INTO storage.buckets (id, name, public, created_at, updated_at, avif_autofit)
          VALUES ('certificates', 'certificates', true, NOW(), NOW(), false)
        `);
        console.log('Certificates bucket created successfully!');
      } else {
        console.log('Certificates bucket already exists.');
      }
    } else {
      console.log('storage schema or buckets table does not exist.');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pgClient.end();
  }
}

run();
