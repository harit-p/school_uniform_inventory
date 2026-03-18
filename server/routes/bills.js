import express from 'express';
import {
  getNextNumber,
  listBills,
  getBill,
  createBill,
  updateBill,
  getBillPdf,
} from '../controllers/billsController.js';

const router = express.Router();

router.get('/bills/next-number', getNextNumber);
router.get('/bills', listBills);
router.get('/bills/:id/pdf', getBillPdf);
router.get('/bills/:id', getBill);
router.post('/bills', createBill);
router.put('/bills/:id', updateBill);

export default router;
