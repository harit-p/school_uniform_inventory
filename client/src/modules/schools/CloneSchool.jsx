import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listSchools, cloneSchool } from '../../api/schools';

export default function CloneSchool() {
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    sourceSchoolId: '',
    name: '',
    code: '',
    address: '',
    contactPerson: '',
    phone: '',
  });

  useEffect(() => {
    listSchools()
      .then(setSchools)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSourceChange = (e) => {
    const id = e.target.value;
    const school = schools.find((s) => s._id === id);
    setForm((prev) => ({
      ...prev,
      sourceSchoolId: id,
      name: school ? `${school.name} (Copy)` : prev.name,
      code: school ? `${school.code}2` : prev.code,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const created = await cloneSchool(form);
      navigate(`/schools/${created._id}/presets`);
    } catch (e) {
      setError(e.body?.error || e.message);
    }
  };

  if (loading) return <p className="text-slate-600">Loading schools…</p>;

  return (
    <div className="max-w-lg">
      <h2 className="text-lg font-semibold text-slate-800">Clone School</h2>
      <p className="mt-1 text-sm text-slate-600">
        Create a new school by copying presets from an existing school.
      </p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Copy presets from</label>
          <select
            value={form.sourceSchoolId}
            onChange={handleSourceChange}
            required
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="">Select school…</option>
            {schools.map((s) => (
              <option key={s._id} value={s._id}>
                {s.code} — {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">New school name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">New school code</label>
          <input
            type="text"
            value={form.code}
            onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.trim().toUpperCase() }))}
            required
            placeholder="e.g. DPS2"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-mono uppercase focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Address (optional)</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Clone & open presets
          </button>
          <button
            type="button"
            onClick={() => navigate('/schools')}
            className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
