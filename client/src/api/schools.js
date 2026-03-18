import { api } from './client';

export function listSchools() {
  return api.get('/schools');
}

export function getSchool(id) {
  return api.get(`/schools/${id}`);
}

export function createSchool(data) {
  return api.post('/schools', data);
}

export function updateSchool(id, data) {
  return api.put(`/schools/${id}`, data);
}

export function deleteSchool(id) {
  return api.delete(`/schools/${id}`);
}

export function cloneSchool(data) {
  return api.post('/schools/clone', data);
}

export function addPreset(schoolId, data) {
  return api.post(`/schools/${schoolId}/presets`, data);
}

export function updatePreset(schoolId, presetId, data) {
  return api.put(`/schools/${schoolId}/presets/${presetId}`, data);
}

export function deletePreset(schoolId, presetId) {
  return api.delete(`/schools/${schoolId}/presets/${presetId}`);
}
