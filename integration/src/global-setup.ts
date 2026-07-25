import { execSync } from 'child_process';
import { readFileSync, rmSync } from 'fs';
import path from 'path';
import { Client } from 'pg';

const envPath = path.resolve(__dirname, '../.env.test');

function loadEnvFile() {
  try {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.test is optional if env vars are set externally
  }
}

async function resetDatabase(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const dbName = url.pathname.slice(1);

  // Connect to the 'postgres' maintenance DB to drop/recreate the test DB
  url.pathname = '/postgres';
  const client = new Client({ connectionString: url.toString() });
  await client.connect();

  try {
    // Terminate existing connections to the test database
    await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = $1
        AND pid <> pg_backend_pid()
    `, [dbName]);

    await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    await client.query(`CREATE DATABASE "${dbName}"`);
  } finally {
    await client.end();
  }
}

async function runMigrations(databaseUrl: string) {
  const serverDir = path.resolve(__dirname, '../../../server');
  execSync('npx prisma migrate deploy', {
    cwd: serverDir,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'pipe',
  });
}

async function runSeed(databaseUrl: string) {
  const serverDir = path.resolve(__dirname, '../../../server');
  execSync('npx prisma db seed', {
    cwd: serverDir,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'pipe',
  });
}

export default async function globalSetup() {
  loadEnvFile();

  const testDbUrl = process.env.TEST_DATABASE_URL;
  if (!testDbUrl) {
    throw new Error(
      'TEST_DATABASE_URL environment variable is required.\n' +
      'Set it to a PostgreSQL connection string for the test database.\n' +
      'Example: TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/ai_clinic_test',
    );
  }

  console.log('\n[Integration] Resetting test database...');
  await resetDatabase(testDbUrl);

  console.log('[Integration] Running Prisma migrations...');
  await runMigrations(testDbUrl);

  console.log('[Integration] Seeding superadmin...');
  await runSeed(testDbUrl);

  console.log('[Integration] Database ready.\n');

  // Make the URL available to test files via env
  process.env.DATABASE_URL = testDbUrl;

  return async () => {
    const uploadsDir = path.resolve(__dirname, '../.tmp-uploads');
    try {
      rmSync(uploadsDir, { recursive: true, force: true });
    } catch {
      // ignore if doesn't exist
    }
    console.log('[Integration] Cleanup complete.');
  };
}
