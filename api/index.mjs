import { createApp } from '../server/app.js';
import { connectDB } from '../server/db.js';

const app = createApp();

export default async function handler(req, res) {
  const path = req.url?.split('?')[0] || '';
  const isHealth = path === '/api/health' || path === '/health';
  if (!isHealth) {
    try {
      await connectDB();
    } catch (err) {
      console.warn('MongoDB not available:', err.message);
    }
  }
  return app(req, res);
}

