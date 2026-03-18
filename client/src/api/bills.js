import { api } from './client';

export function getNextBillNumber() {
  return api.get('/bills/next-number');
}

export function listBills(params = {}) {
  const sp = new URLSearchParams(params).toString();
  return api.get(sp ? `/bills?${sp}` : '/bills');
}

export function getBill(id) {
  return api.get(`/bills/${id}`);
}

export function createBill(data) {
  return api.post('/bills', data);
}

export function updateBill(id, data) {
  return api.put(`/bills/${id}`, data);
}

export function getBillPdfUrl(id) {
  return `/api/bills/${id}/pdf`;
}
