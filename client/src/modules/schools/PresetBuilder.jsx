import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getSchool, deletePreset } from '../../api/schools';
import { listCombos, createCombo, updateCombo, deleteCombo } from '../../api/combos';
import ComboForm from './ComboForm';

const itemTypeLabel = (t) => {
  const labels = { tshirt: 'T-Shirt', shirt: 'Shirt', pant: 'Pant', skirt: 'Skirt', blazer: 'Blazer', half_pant: 'Half Pant', tie: 'Tie', belt: 'Belt', fabric: 'Fabric', vest: 'Vest' };
  return labels[t] || t;
};

export default function PresetBuilder() {
  const { id: schoolId } = useParams();
  const [school, setSchool] = useState(null);
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comboModalOpen, setComboModalOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);

  useEffect(() => {
    Promise.all([getSchool(schoolId), listCombos(schoolId)])
      .then(([s, c]) => {
        setSchool(s);
        setCombos(c);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [schoolId]);

  const handleDeletePreset = async (presetId, label) => {
    if (!window.confirm(`Delete preset "${label}"?`)) return;
    try {
      await deletePreset(schoolId, presetId);
      setSchool((prev) => ({
        ...prev,
        uniformPresets: prev.uniformPresets.filter((p) => p._id !== presetId),
      }));
    } catch (e) {
      setError(e.message);
    }
  };

  const loadCombos = () => {
    listCombos(schoolId).then(setCombos).catch(() => {});
  };

  const handleSaveCombo = async (data) => {
    try {
      if (editingCombo) {
        await updateCombo(schoolId, editingCombo._id, data);
      } else {
        await createCombo(schoolId, data);
      }
      setComboModalOpen(false);
      setEditingCombo(null);
      loadCombos();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDeleteCombo = async (comboId, comboName) => {
    if (!window.confirm(`Delete combo "${comboName}"?`)) return;
    try {
      await deleteCombo(schoolId, comboId);
      loadCombos();
    } catch (e) {
      setError(e.message);
    }
  };

  const openAddCombo = () => {
    setEditingCombo(null);
    setComboModalOpen(true);
  };

  const openEditCombo = (combo) => {
    setEditingCombo(combo);
    setComboModalOpen(true);
  };

  if (loading) return <p className="text-slate-600">Loading…</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;
  if (!school) return null;

  const presets = school.uniformPresets || [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/schools" className="text-sm text-slate-600 hover:underline">← Schools</Link>
          <h2 className="mt-1 text-lg font-semibold text-slate-800">
            Presets & Combos — {school.name} ({school.code})
          </h2>
        </div>
      </div>

      {/* Presets */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-slate-800">Presets</h3>
          <Link
            to={`/schools/${schoolId}/presets/new`}
            className="rounded bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            Add Preset
          </Link>
        </div>
        {presets.length === 0 ? (
          <p className="text-slate-500 text-sm">No presets yet. Add one to define class-wise uniform items.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-600">Label</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-600">Class Range</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-600">Items</th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {presets.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-800">{p.label}</td>
                    <td className="px-4 py-2 text-sm text-slate-600">
                      {p.classRange?.from} – {p.classRange?.to}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-600">
                      {p.items?.length ?? 0} item(s)
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        to={`/schools/${schoolId}/presets/${p._id}/edit`}
                        className="mr-2 text-sm text-blue-600 hover:underline"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDeletePreset(p._id, p.label)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Combos */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-slate-800">Combos</h3>
          <button
            type="button"
            onClick={openAddCombo}
            className="rounded bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            Add Combo
          </button>
        </div>
        <p className="text-slate-500 text-sm mb-2">
          Combos define product sets (e.g. shirt + pant + tie) with a discount %. When billing, if the cart matches a combo, the discount is applied automatically.
        </p>
        {combos.length === 0 ? (
          <p className="text-slate-500 text-sm">No combos yet. Add one to offer discounts on product sets.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-600">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-600">Products</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-600">Discount</th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {combos.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-800">{c.name}</td>
                    <td className="px-4 py-2 text-sm text-slate-600">
                      {(c.items || []).map((i) => `${itemTypeLabel(i.itemType)}${i.size ? ` (${i.size})` : ''}`).join(', ')}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-600">{c.discountPercent}%</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => openEditCombo(c)}
                        className="mr-2 text-sm text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCombo(c._id, c.name)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Combo modal */}
      {comboModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setComboModalOpen(false); setEditingCombo(null); }}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-800 mb-3">{editingCombo ? 'Edit Combo' : 'Add Combo'}</h3>
            <ComboForm
              combo={editingCombo}
              onSave={handleSaveCombo}
              onCancel={() => { setComboModalOpen(false); setEditingCombo(null); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
