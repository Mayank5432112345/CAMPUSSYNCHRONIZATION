const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
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
    await client.connect();
    console.log('Connected to PostgreSQL database.');
    
    const schemaPath = path.join(__dirname, '..', 'supabase', 'schema.sql');
    console.log('Reading schema from:', schemaPath);
    const sql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Executing schema...');
    await client.query(sql);
    console.log('Schema executed successfully!');
    
  } catch (err) {
    console.error('Error executing schema:', err);
  } finally {
    await client.end();
  }
}

run();
