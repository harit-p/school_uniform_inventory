import express from 'express';
import {
  listSchools,
  getSchool,
  createSchool,
  updateSchool,
  deleteSchool,
  addPreset,
  updatePreset,
  deletePreset,
  cloneSchool,
} from '../controllers/schoolsController.js';
import {
  listBySchool as listCombos,
  createCombo,
  getCombo,
  updateCombo,
  deleteCombo,
} from '../controllers/combosController.js';

const router = express.Router();

router.get('/schools', listSchools);
router.post('/schools', createSchool);
router.post('/schools/clone', cloneSchool);

router.get('/schools/:id', getSchool);
router.put('/schools/:id', updateSchool);
router.delete('/schools/:id', deleteSchool);

router.post('/schools/:id/presets', addPreset);
router.put('/schools/:id/presets/:pid', updatePreset);
router.delete('/schools/:id/presets/:pid', deletePreset);

router.get('/schools/:id/combos', listCombos);
router.post('/schools/:id/combos', createCombo);
router.get('/schools/:id/combos/:cid', getCombo);
router.put('/schools/:id/combos/:cid', updateCombo);
router.delete('/schools/:id/combos/:cid', deleteCombo);

export default router;
