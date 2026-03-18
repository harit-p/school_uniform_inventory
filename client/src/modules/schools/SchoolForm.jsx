import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSchool, createSchool, updateSchool } from '../../api/schools';

export default function SchoolForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    name: '',
    code: '',
    address: '',
    contactPerson: '',
    phone: '',
  });

  useEffect(() => {
    if (!isEdit) return;
    getSchool(id)
      .then((s) => setForm({
        name: s.name || '',
        code: s.code || '',
        address: s.address || '',
        contactPerson: s.contactPerson || '',
        phone: s.phone || '',
      }))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === 'code') setForm((prev) => ({ ...prev, code: value.trim().toUpperCase() }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (isEdit) {
        await updateSchool(id, form);
        navigate(`/schools/${id}/presets`);
      } else {
        const created = await createSchool(form);
        navigate(`/schools/${created._id}/presets`);
      }
    } catch (e) {
      setError(e.body?.error || e.message);
    }
  };

  if (loading) return <p className="text-slate-600">Loading…</p>;

  return (
    <div className="max-w-lg">
      <h2 className="text-lg font-semibold text-slate-800">
        {isEdit ? 'Edit School' : 'Add School'}
      </h2>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Name</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Code</label>
          <input
            type="text"
            name="code"
            value={form.code}
            onChange={handleChange}
            required
            placeholder="e.g. DPS"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-mono uppercase focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            readOnly={isEdit}
          />
          {isEdit && <p className="mt-0.5 text-xs text-slate-500">Code cannot be changed.</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Address</label>
          <input
            type="text"
            name="address"
            value={form.address}
            onChange={handleChange}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Contact Person</label>
          <input
            type="text"
            name="contactPerson"
            value={form.contactPerson}
            onChange={handleChange}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Phone</label>
          <input
            type="text"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            {isEdit ? 'Save' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => navigate(isEdit ? `/schools/${id}/presets` : '/schools')}
            className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
