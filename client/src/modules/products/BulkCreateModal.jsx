import { useState, useEffect } from 'react';
import { listSchools, getSchool } from '../../api/schools';
import { bulkCreateFromPreset } from '../../api/products';

export default function BulkCreateModal({ onClose, onCreated }) {
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [presets, setPresets] = useState([]);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    listSchools().then(setSchools).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedSchoolId) {
      setPresets([]);
      setSelectedPresetId('');
      return;
    }
    getSchool(selectedSchoolId).then((s) => {
      setPresets(s.uniformPresets || []);
      setSelectedPresetId('');
    }).catch(() => setPresets([]));
  }, [selectedSchoolId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSchoolId || !selectedPresetId) return;
    setError(null);
    setLoading(true);
    try {
      const res = await bulkCreateFromPreset(selectedSchoolId, selectedPresetId);
      setResult(res);
      if (res.count > 0) onCreated();
    } catch (e) {
      setError(e.body?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-slate-800">Create products from preset</h3>
        <p className="mt-1 text-sm text-slate-600">Generate one product per size for each item in the preset.</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {result && <p className="mt-2 text-sm text-green-700">Created {result.count} product(s).</p>}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600">School</label>
            <select
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              required
              className="mt-0.5 w-full rounded border border-slate-300 px-3 py-2 text-slate-900"
            >
              <option value="">Select school</option>
              {schools.map((s) => (
                <option key={s._id} value={s._id}>{s.code} — {s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Preset</label>
            <select
              value={selectedPresetId}
              onChange={(e) => setSelectedPresetId(e.target.value)}
              required
              disabled={!presets.length}
              className="mt-0.5 w-full rounded border border-slate-300 px-3 py-2 text-slate-900"
            >
              <option value="">Select preset</option>
              {presets.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.label} (Class {p.classRange?.from}-{p.classRange?.to}) — {p.items?.length ?? 0} items
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading || !selectedPresetId}
              className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {loading ? 'Creating…' : 'Create products'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
