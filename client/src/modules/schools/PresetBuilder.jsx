import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getSchool, deletePreset } from '../../api/schools';

export default function PresetBuilder() {
  const { id: schoolId } = useParams();
  const navigate = useNavigate();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getSchool(schoolId)
      .then(setSchool)
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

  if (loading) return <p className="text-slate-600">Loading…</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;
  if (!school) return null;

  const presets = school.uniformPresets || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/schools" className="text-sm text-slate-600 hover:underline">← Schools</Link>
          <h2 className="mt-1 text-lg font-semibold text-slate-800">
            Presets — {school.name} ({school.code})
          </h2>
        </div>
        <Link
          to={`/schools/${schoolId}/presets/new`}
          className="rounded bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          Add Preset
        </Link>
      </div>

      {presets.length === 0 ? (
        <p className="text-slate-500">No presets yet. Add one to define class-wise uniform items.</p>
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
  );
}
