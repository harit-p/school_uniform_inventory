import 'dotenv/config';
import { connectDB } from './db.js';
import { createApp } from './app.js';

const app = createApp();
const PORT = process.env.PORT || 3001;

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
