import mongoose from 'mongoose';
import './models/School.js';
import './models/Product.js';
import './models/StockTransaction.js';
import './models/Bill.js';
import './models/Counter.js';
import './models/Combo.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/school_uniform';

export async function connectDB() {
  const g = globalThis;
  if (!g.__MONGO_CONN_PROMISE__) {
    g.__MONGO_CONN_PROMISE__ = mongoose
      .connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
      .then((conn) => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('MongoDB connected:', conn.connection.host);
        }
        return conn;
      });
  }
  return g.__MONGO_CONN_PROMISE__;
}
