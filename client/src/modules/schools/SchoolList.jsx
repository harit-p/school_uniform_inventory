import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listSchools, deleteSchool } from '../../api/schools';

export default function SchoolList() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    listSchools()
      .then(setSchools)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Deactivate school "${name}"?`)) return;
    try {
      await deleteSchool(id);
      setSchools((prev) => prev.filter((s) => s._id !== id));
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) return <p className="text-slate-600">Loading schools…</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Schools</h2>
        <Link
          to="/schools/new"
          className="rounded bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          Add School
        </Link>
      </div>

      {schools.length === 0 ? (
        <p className="text-slate-500">No schools yet. Add one to get started.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-600">Code</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-600">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-600">Contact</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-600">Presets</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {schools.map((s) => (
                <tr key={s._id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono text-sm">{s.code}</td>
                  <td className="px-4 py-2 font-medium text-slate-800">{s.name}</td>
                  <td className="px-4 py-2 text-sm text-slate-600">{s.contactPerson || '—'}</td>
                  <td className="px-4 py-2 text-sm text-slate-600">
                    {s.uniformPresets?.length ?? 0} preset(s)
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      to={`/schools/${s._id}/presets`}
                      className="mr-2 text-sm text-blue-600 hover:underline"
                    >
                      Presets
                    </Link>
                    <Link
                      to={`/schools/${s._id}/edit`}
                      className="mr-2 text-sm text-slate-600 hover:underline"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(s._id, s.name)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Deactivate
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
