import express from 'express';
import {
  listTransactions,
  recordImport,
  recordAdjustment,
  stockSummary,
  lowStock,
} from '../controllers/stockController.js';

const router = express.Router();

router.get('/stock/transactions', listTransactions);
router.post('/stock/import', recordImport);
router.post('/stock/adjustment', recordAdjustment);
router.get('/stock/summary', stockSummary);
router.get('/stock/low-stock', lowStock);

export default router;
