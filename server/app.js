import express from 'express';
import cors from 'cors';

import healthRoutes from './routes/health.js';
import schoolsRoutes from './routes/schools.js';
import combosRoutes from './routes/combos.js';
import productsRoutes from './routes/products.js';
import stockRoutes from './routes/stock.js';
import billsRoutes from './routes/bills.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: true }));
  app.use(express.json());

  app.use('/api', healthRoutes);
  app.use('/api', schoolsRoutes);
  app.use('/api', combosRoutes);
  app.use('/api', productsRoutes);
  app.use('/api', stockRoutes);
  app.use('/api', billsRoutes);

  return app;
}

