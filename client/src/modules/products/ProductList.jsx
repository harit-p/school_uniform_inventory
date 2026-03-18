import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listSchools } from '../../api/schools';
import {
  listProducts as fetchProducts,
  deleteProduct,
  searchProducts,
} from '../../api/products';
import ProductEditModal from './ProductEditModal';
import BulkCreateModal from './BulkCreateModal';

function StockBadge({ product }) {
  const stock = product.currentStock ?? 0;
  const alert = product.lowStockAlert ?? 5;
  if (stock <= 0) return <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-800">Out</span>;
  if (stock < alert) return <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">Low</span>;
  return <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800">OK</span>;
}

function copySku(sku) {
  navigator.clipboard?.writeText(sku).then(() => {});
}

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ school: '', itemType: '', size: '', stockType: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const loadProducts = () => {
    setLoading(true);
    const params = {};
    if (filters.school) params.school = filters.school;
    if (filters.itemType) params.itemType = filters.itemType;
    if (filters.size) params.size = filters.size;
    if (filters.stockType) params.stockType = filters.stockType;
    fetchProducts(params)
      .then(setProducts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProducts();
  }, [filters.school, filters.itemType, filters.size, filters.stockType]);

  useEffect(() => {
    listSchools().then(setSchools).catch(() => {});
  }, []);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      loadProducts();
      return;
    }
    setLoading(true);
    searchProducts(searchQuery)
      .then(setProducts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Deactivate product "${name}"?`)) return;
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p._id !== id));
    } catch (e) {
      setError(e.message);
    }
  };

  const handleEditSaved = (updated) => {
    setProducts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
    setEditingProduct(null);
  };

  const handleBulkCreated = () => {
    setBulkOpen(false);
    loadProducts();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-800">Products</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setBulkOpen(true)}
            className="rounded bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            Create from preset
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-slate-600">Search</label>
          <div className="flex gap-1 mt-0.5">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="SKU or name"
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
            <button type="button" onClick={handleSearch} className="rounded bg-slate-200 px-2 py-1.5 text-sm hover:bg-slate-300">Search</button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">School</label>
          <select
            value={filters.school}
            onChange={(e) => setFilters((f) => ({ ...f, school: e.target.value }))}
            className="mt-0.5 rounded border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {schools.map((s) => (
              <option key={s._id} value={s._id}>{s.code}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Type</label>
          <select
            value={filters.itemType}
            onChange={(e) => setFilters((f) => ({ ...f, itemType: e.target.value }))}
            className="mt-0.5 rounded border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            <option value="shirt">Shirt</option>
            <option value="pant">Pant</option>
            <option value="skirt">Skirt</option>
            <option value="tshirt">T-Shirt</option>
            <option value="blazer">Blazer</option>
            <option value="half_pant">Half Pant</option>
            <option value="tie">Tie</option>
            <option value="belt">Belt</option>
            <option value="fabric">Fabric</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Stock type</label>
          <select
            value={filters.stockType}
            onChange={(e) => setFilters((f) => ({ ...f, stockType: e.target.value }))}
            className="mt-0.5 rounded border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            <option value="readymade">Readymade</option>
            <option value="fabric">Fabric</option>
          </select>
        </div>
        {(searchQuery || filters.school || filters.itemType || filters.stockType) && (
          <button
            type="button"
            onClick={() => { setSearchQuery(''); setFilters({ school: '', itemType: '', size: '', stockType: '' }); loadProducts(); }}
            className="text-sm text-slate-600 hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {error && <p className="text-red-600 text-sm">Error: {error}</p>}
      {loading ? (
        <p className="text-slate-600">Loading…</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-600">SKU</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-600">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-600">School</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-600">Stock</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-600">Price</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {products.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">No products found.</td></tr>
              ) : (
                products.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-mono text-sm">
                      <button
                        type="button"
                        onClick={() => copySku(p.sku)}
                        className="text-slate-800 hover:underline"
                        title="Copy SKU"
                      >
                        {p.sku}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-slate-800">{p.name}</td>
                    <td className="px-4 py-2 text-sm text-slate-600">{p.school?.code ?? '—'}</td>
                    <td className="px-4 py-2">
                      <StockBadge product={p} />
                      <span className="ml-1 text-sm text-slate-600">{p.currentStock ?? 0}</span>
                    </td>
                    <td className="px-4 py-2 text-sm">₹{p.sellingPrice ?? 0}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setEditingProduct(p)}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p._id, p.name)}
                        className="ml-2 text-sm text-red-600 hover:underline"
                      >
                        Deactivate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {editingProduct && (
        <ProductEditModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSaved={handleEditSaved}
        />
      )}
      {bulkOpen && (
        <BulkCreateModal
          onClose={() => setBulkOpen(false)}
          onCreated={handleBulkCreated}
        />
      )}
    </div>
  );
}
