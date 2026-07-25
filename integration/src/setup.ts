import 'reflect-metadata';
import { readFileSync } from 'fs';
import path from 'path';
import { beforeAll, afterAll } from 'vitest';
import { bootstrapTestServer, shutdownTestServer } from './helpers/server.js';

function loadEnvFile() {
  const envPath = path.resolve(__dirname, '../.env.test');
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
    // .env.test is optional
  }
}

loadEnvFile();

// Ensure DATABASE_URL is set from TEST_DATABASE_URL
if (!process.env.DATABASE_URL && process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

beforeAll(async () => {
  await bootstrapTestServer();
}, 120_000);

afterAll(async () => {
  await shutdownTestServer();
}, 30_000);
