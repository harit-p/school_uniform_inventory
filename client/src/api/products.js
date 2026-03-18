import { api } from './client';

export function listProducts(params = {}) {
  const sp = new URLSearchParams(params).toString();
  return api.get(sp ? `/products?${sp}` : '/products');
}

export function getProduct(id) {
  return api.get(`/products/${id}`);
}

export function createProduct(data) {
  return api.post('/products', data);
}

export function updateProduct(id, data) {
  return api.put(`/products/${id}`, data);
}

export function deleteProduct(id) {
  return api.delete(`/products/${id}`);
}

export function searchProducts(q) {
  return api.get(`/products/search?q=${encodeURIComponent(q || '')}`);
}

export function bulkCreateFromPreset(schoolId, presetId) {
  return api.post('/products/bulk-create', { schoolId, presetId });
}
