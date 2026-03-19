import { api } from './client';

export function listCombos(schoolId) {
  return api.get(`/schools/${schoolId}/combos`);
}

export function createCombo(schoolId, data) {
  return api.post(`/schools/${schoolId}/combos`, data);
}

export function updateCombo(schoolId, comboId, data) {
  return api.put(`/schools/${schoolId}/combos/${comboId}`, data);
}

export function deleteCombo(schoolId, comboId) {
  return api.delete(`/schools/${schoolId}/combos/${comboId}`);
}

export function matchCombo({ schoolId, items }) {
  return api.post('/combos/match', { schoolId: schoolId || undefined, items });
}
