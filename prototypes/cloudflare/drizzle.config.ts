// The REAL HMS schema, as migrations for a Durable Object's SQLite (migrations.js is bundled into the Worker).
import { defineConfig } from 'drizzle-kit';
export default defineConfig({ dialect: 'sqlite', driver: 'durable-sqlite', schema: '../../apps/api/src/db/schema.ts', out: './drizzle' });
