import { useState } from 'react';
import { ITEM_TYPES } from 'shared/types.js';

const itemTypeLabel = (t) => {
  const labels = {
    tshirt: 'T-Shirt',
    shirt: 'Shirt',
    pant: 'Pant',
    skirt: 'Skirt',
    blazer: 'Blazer',
    half_pant: 'Half Pant',
    tie: 'Tie',
    belt: 'Belt',
    fabric: 'Fabric',
    vest: 'Vest',
  };
  return labels[t] || t;
};

export default function ComboForm({ combo, onSave, onCancel }) {
  const isEdit = Boolean(combo?._id);
  const [name, setName] = useState(combo?.name ?? '');
  const [discountPercent, setDiscountPercent] = useState(combo?.discountPercent ?? 0);
  const [items, setItems] = useState(
    combo?.items?.length
      ? combo.items.map((i) => ({ itemType: i.itemType || 'shirt', size: i.size ?? '' }))
      : [{ itemType: 'shirt', size: '' }]
  );

  const addItem = () => {
    setItems((prev) => [...prev, { itemType: 'shirt', size: '' }]);
  };

  const removeItem = (idx) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name: name.trim(),
      discountPercent: Number(discountPercent) || 0,
      items: items.map((i) => ({ itemType: i.itemType, size: (i.size || '').trim() })),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Combo name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Full set (Shirt + Pant + Tie)"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Discount %</label>
        <input
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={discountPercent}
          onChange={(e) => setDiscountPercent(e.target.value)}
          className="mt-1 w-24 rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-slate-700">Products in combo</label>
          <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:underline">
            + Add product
          </button>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">Add item type and size. Leave size blank for any size.</p>
        <div className="mt-2 space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <select
                value={item.itemType}
                onChange={(e) => updateItem(idx, 'itemType', e.target.value)}
                className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              >
                {ITEM_TYPES.map((t) => (
                  <option key={t} value={t}>{itemTypeLabel(t)}</option>
                ))}
              </select>
              <input
                type="text"
                value={item.size}
                onChange={(e) => updateItem(idx, 'size', e.target.value)}
                placeholder="Size (optional)"
                className="w-24 rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="text-slate-500 hover:text-red-600 text-sm"
                disabled={items.length <= 1}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
          Cancel
        </button>
        <button type="submit" className="rounded bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700">
          {isEdit ? 'Update' : 'Add'} Combo
        </button>
      </div>
    </form>
  );
}
