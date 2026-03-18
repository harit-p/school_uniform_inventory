import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSchool, addPreset, updatePreset } from '../../api/schools';
import { ITEM_TYPES, GENDERS, STOCK_TYPES, GST_RATES } from 'shared/types.js';

const emptyItem = () => ({
  itemType: 'shirt',
  gender: 'boys',
  stockType: 'readymade',
  sizesInput: '',
  unit: 'meters',
  defaultPrice: 0,
  defaultCostPrice: 0,
  hsnCode: '',
  gstRate: 5,
});

function sizesFromString(s) {
  return s
    .split(/[,;\s]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function PresetForm() {
  const { id: schoolId, pid } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(pid);

  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    label: '',
    classRange: { from: 1, to: 5 },
    items: [emptyItem()],
  });

  useEffect(() => {
    getSchool(schoolId)
      .then((s) => {
        setSchool(s);
        if (isEdit && s.uniformPresets) {
          const p = s.uniformPresets.find((preset) => preset._id === pid);
          if (p) {
            setForm({
              label: p.label || '',
              classRange: {
                from: p.classRange?.from ?? 1,
                to: p.classRange?.to ?? 5,
              },
              items: (p.items && p.items.length) ? p.items.map((i) => ({
                ...i,
                sizesInput: Array.isArray(i.sizes) ? i.sizes.join(', ') : '',
              })) : [emptyItem()],
            });
          }
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [schoolId, pid, isEdit]);

  const updateItem = (idx, field, value) => {
    setForm((prev) => {
      const next = { ...prev };
      next.items = [...next.items];
      next.items[idx] = { ...next.items[idx], [field]: value };
      return next;
    });
  };

  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
  };

  const removeItem = (idx) => {
    if (form.items.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const payload = {
      label: form.label,
      classRange: form.classRange,
      items: form.items.map((i) => ({
        itemType: i.itemType,
        gender: i.gender,
        stockType: i.stockType,
        sizes: sizesFromString(i.sizesInput),
        unit: i.stockType === 'fabric' ? 'meters' : undefined,
        defaultPrice: Number(i.defaultPrice) || 0,
        defaultCostPrice: Number(i.defaultCostPrice) || 0,
        hsnCode: (i.hsnCode || '').trim(),
        gstRate: Number(i.gstRate) || 5,
      })),
    };
    try {
      if (isEdit) {
        await updatePreset(schoolId, pid, payload);
      } else {
        await addPreset(schoolId, payload);
      }
      navigate(`/schools/${schoolId}/presets`);
    } catch (e) {
      setError(e.body?.error || e.message);
    }
  };

  if (loading || !school) return <p className="text-slate-600">Loading…</p>;

  return (
    <div className="max-w-5xl">
      <h2 className="text-lg font-semibold text-slate-800">
        {isEdit ? 'Edit Preset' : 'Add Preset'} — {school.name}
      </h2>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700">Label</label>
            <input
              type="text"
              value={form.label}
              onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
              placeholder="e.g. Class 1-5"
              required
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
          <div className="w-24">
            <label className="block text-sm font-medium text-slate-700">Class From</label>
            <input
              type="number"
              min={1}
              value={form.classRange.from}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  classRange: { ...p.classRange, from: Number(e.target.value) || 1 },
                }))
              }
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
          <div className="w-24">
            <label className="block text-sm font-medium text-slate-700">To</label>
            <input
              type="number"
              min={1}
              value={form.classRange.to}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  classRange: { ...p.classRange, to: Number(e.target.value) || 5 },
                }))
              }
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-700">Items</label>
            <button
              type="button"
              onClick={addItem}
              className="text-sm text-blue-600 hover:underline"
            >
              + Add item
            </button>
          </div>
          <div className="mt-2 overflow-x-auto rounded border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium text-slate-600">Type</th>
                  <th className="px-2 py-1.5 text-left font-medium text-slate-600">Gender</th>
                  <th className="px-2 py-1.5 text-left font-medium text-slate-600">Stock</th>
                  <th className="px-2 py-1.5 text-left font-medium text-slate-600">Sizes</th>
                  <th className="px-2 py-1.5 text-left font-medium text-slate-600">Price</th>
                  <th className="px-2 py-1.5 text-left font-medium text-slate-600">HSN</th>
                  <th className="px-2 py-1.5 text-left font-medium text-slate-600">GST%</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {form.items.map((item, idx) => (
                  <tr key={idx} className="bg-white">
                    <td className="px-2 py-1">
                      <select
                        value={item.itemType}
                        onChange={(e) => updateItem(idx, 'itemType', e.target.value)}
                        className="w-full rounded border border-slate-200 py-1 text-slate-800"
                      >
                        {ITEM_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <select
                        value={item.gender}
                        onChange={(e) => updateItem(idx, 'gender', e.target.value)}
                        className="w-full rounded border border-slate-200 py-1 text-slate-800"
                      >
                        {GENDERS.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <select
                        value={item.stockType}
                        onChange={(e) => updateItem(idx, 'stockType', e.target.value)}
                        className="w-full rounded border border-slate-200 py-1 text-slate-800"
                      >
                        {STOCK_TYPES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="text"
                        value={item.sizesInput ?? ''}
                        onChange={(e) => updateItem(idx, 'sizesInput', e.target.value)}
                        placeholder="18, 20, 22, 24 or S, M, L"
                        className="min-w-[8rem] rounded border border-slate-200 px-2 py-1 text-slate-800"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.defaultPrice}
                        onChange={(e) => updateItem(idx, 'defaultPrice', e.target.value)}
                        className="w-20 rounded border border-slate-200 px-2 py-1 text-slate-800"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="text"
                        value={item.hsnCode || ''}
                        onChange={(e) => updateItem(idx, 'hsnCode', e.target.value)}
                        placeholder="6203"
                        className="w-16 rounded border border-slate-200 px-2 py-1 text-slate-800"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <select
                        value={item.gstRate}
                        onChange={(e) => updateItem(idx, 'gstRate', Number(e.target.value))}
                        className="w-full rounded border border-slate-200 py-1 text-slate-800"
                      >
                        {GST_RATES.map((r) => (
                          <option key={r} value={r}>{r}%</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-red-600 hover:underline"
                        title="Remove item"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            {isEdit ? 'Save Preset' : 'Add Preset'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/schools/${schoolId}/presets`)}
            className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
