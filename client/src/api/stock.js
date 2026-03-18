import { api } from './client';

export function listTransactions(params = {}) {
  const sp = new URLSearchParams(params).toString();
  return api.get(sp ? `/stock/transactions?${sp}` : '/stock/transactions');
}

export function recordImport(body) {
  return api.post('/stock/import', body);
}

export function recordAdjustment(body) {
  return api.post('/stock/adjustment', body);
}

export function stockSummary() {
  return api.get('/stock/summary');
}

export function lowStock() {
  return api.get('/stock/low-stock');
}
