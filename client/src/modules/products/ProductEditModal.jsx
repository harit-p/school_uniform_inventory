import { useState, useEffect } from 'react';
import { updateProduct } from '../../api/products';

export default function ProductEditModal({ product, onClose, onSaved }) {
  const [form, setForm] = useState({
    sellingPrice: 0,
    costPrice: 0,
    lowStockAlert: 5,
    hsnCode: '',
    gstRate: 5,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (product) {
      setForm({
        sellingPrice: product.sellingPrice ?? 0,
        costPrice: product.costPrice ?? 0,
        lowStockAlert: product.lowStockAlert ?? 5,
        hsnCode: product.hsnCode ?? '',
        gstRate: product.gstRate ?? 5,
      });
    }
  }, [product]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const updated = await updateProduct(product._id, form);
      onSaved(updated);
    } catch (e) {
      setError(e.body?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-slate-800">Edit Product</h3>
        <p className="mt-1 text-sm text-slate-600 font-mono">{product.sku}</p>
        <p className="text-sm text-slate-700">{product.name}</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600">Selling price (₹)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.sellingPrice}
              onChange={(e) => setForm((f) => ({ ...f, sellingPrice: e.target.value }))}
              className="mt-0.5 w-full rounded border border-slate-300 px-3 py-2 text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Cost price (₹)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.costPrice}
              onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))}
              className="mt-0.5 w-full rounded border border-slate-300 px-3 py-2 text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Low stock alert</label>
            <input
              type="number"
              min={0}
              value={form.lowStockAlert}
              onChange={(e) => setForm((f) => ({ ...f, lowStockAlert: e.target.value }))}
              className="mt-0.5 w-full rounded border border-slate-300 px-3 py-2 text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">HSN code</label>
            <input
              type="text"
              value={form.hsnCode}
              onChange={(e) => setForm((f) => ({ ...f, hsnCode: e.target.value }))}
              className="mt-0.5 w-full rounded border border-slate-300 px-3 py-2 text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">GST %</label>
            <select
              value={form.gstRate}
              onChange={(e) => setForm((f) => ({ ...f, gstRate: Number(e.target.value) }))}
              className="mt-0.5 w-full rounded border border-slate-300 px-3 py-2 text-slate-900"
            >
              <option value={5}>5%</option>
              <option value={12}>12%</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
