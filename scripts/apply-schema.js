const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://qkfnyntngqmjrtgkxwpv.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrZm55bnRuZ3FtanJ0Z2t4d3B2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTIwMTkxOCwiZXhwIjoyMDk0Nzc3OTE4fQ.JHZUaZ3b6AR-0iDamt2oMM2odXIyK2sQQEMCCTjidOw';

const sql = fs.readFileSync(
  path.join(__dirname, '../supabase/migrations/001_initial_schema.sql'),
  'utf-8'
);

async function applySchema() {
  console.log('Aplicando schema no Supabase...');

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    // Tentar via pg endpoint
    const res2 = await fetch(`${SUPABASE_URL}/pg`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });
    const body2 = await res2.text();
    console.log('Response pg:', res2.status, body2.substring(0, 500));
    return;
  }

  const body = await res.text();
  console.log('Sucesso:', res.status, body.substring(0, 200));
}

applySchema().catch(console.error);
