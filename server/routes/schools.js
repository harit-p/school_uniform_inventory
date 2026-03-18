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

export default router;
