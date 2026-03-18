import express from 'express';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  bulkCreateFromPreset,
} from '../controllers/productsController.js';

const router = express.Router();

router.get('/products/search', searchProducts);
router.post('/products/bulk-create', bulkCreateFromPreset);

router.get('/products', listProducts);
router.get('/products/:id', getProduct);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

export default router;
