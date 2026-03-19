import express from 'express';
import { matchCombo } from '../controllers/combosController.js';

const router = express.Router();
router.post('/combos/match', matchCombo);

export default router;
