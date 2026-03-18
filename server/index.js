import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './db.js';
import healthRoutes from './routes/health.js';
import schoolsRoutes from './routes/schools.js';
import productsRoutes from './routes/products.js';
import stockRoutes from './routes/stock.js';
import billsRoutes from './routes/bills.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true }));
app.use(express.json());

app.use('/api', healthRoutes);
app.use('/api', schoolsRoutes);
app.use('/api', productsRoutes);
app.use('/api', stockRoutes);
app.use('/api', billsRoutes);

async function start() {
  try {
    await connectDB();
  } catch (err) {
    console.warn('MongoDB not available:', err.message);
    if (String(err.message || '').includes('querySrv') || String(err.message || '').includes('_mongodb._tcp')) {
      console.warn('It looks like a MongoDB Atlas SRV DNS lookup issue.');
      console.warn('Fix options:');
      console.warn('- Switch to a STANDARD connection string (mongodb://host1,host2,host3/...) instead of mongodb+srv://');
      console.warn('- Or fix DNS on your machine (try Google DNS 8.8.8.8 / 8.8.4.4) / disable VPN / firewall DNS filtering.');
    }
    console.warn('Server will run with database: disconnected. Start MongoDB for full functionality.');
  }
  const server = app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Health: http://localhost:${PORT}/api/health`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\nPort ${PORT} is already in use. Kill the other process and restart.`);
      console.error('  macOS/Linux: lsof -i :' + PORT + '  then  kill <PID>');
      process.exit(1);
    }
    throw err;
  });
}

start();
