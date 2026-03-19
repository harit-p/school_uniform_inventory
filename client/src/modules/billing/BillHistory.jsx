import { useEffect, useState } from 'react';
import { listBills } from '../../api/bills';

function getBillPdfUrl(id) {
  return `/api/bills/${id}/pdf`;
}

export default function BillHistory() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadBills = () => {
    setLoading(true);
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (dateFrom) params.startDate = dateFrom;
    if (dateTo) params.endDate = dateTo;
    listBills(params)
      .then(setBills)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBills();
  }, [statusFilter, dateFrom, dateTo]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Bill History [F8]</h2>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded border border-slate-200 bg-white p-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">All status</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="pending">Pending</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
        />
        <span className="text-slate-500">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={loadBills}
          className="rounded bg-slate-200 px-3 py-1.5 text-sm hover:bg-slate-300"
        >
          Refresh
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-slate-600">Loading…</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-600">Bill No</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-600">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-600">Customer</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase text-slate-600">Amount / Due</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-600">Status</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {bills.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">No bills found.</td>
                </tr>
              ) : (
                bills.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-mono text-sm">{b.billNumber}</td>
                    <td className="px-4 py-2 text-sm text-slate-600">
                      {new Date(b.billDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-2 text-sm">{b.customer?.name || '—'}</td>
                    <td className="px-4 py-2 text-right font-medium">
                      {b.status === 'paid'
                        ? `₹${(b.finalAmount || 0).toFixed(2)}`
                        : `₹${(b.amountPending ?? b.finalAmount ?? 0).toFixed(2)} remaining`}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                          b.status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : b.status === 'partial'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <a
                        href={getBillPdfUrl(b._id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View PDF
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
