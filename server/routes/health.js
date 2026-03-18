import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

router.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbOk = dbState === 1; // 1 = connected
  res.json({
    ok: true,
    server: 'running',
    database: dbOk ? 'connected' : 'disconnected',
    dbState,
  });
});

export default router;
