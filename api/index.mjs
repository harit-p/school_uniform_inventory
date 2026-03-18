import 'dotenv/config';
import { createApp } from '../server/app.js';
import { connectDB } from '../server/db.js';

const app = createApp();

export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (err) {
    // Still allow health endpoint to respond; other endpoints will likely fail without DB.
    // Keep logs minimal on serverless.
    console.warn('MongoDB not available:', err.message);
  }
  return app(req, res);
}

