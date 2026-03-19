import { useEffect, useState } from 'react';
import { Link, Routes, Route } from 'react-router-dom';
import { api } from './api/client';
import SchoolList from './modules/schools/SchoolList';
import SchoolForm from './modules/schools/SchoolForm';
import PresetBuilder from './modules/schools/PresetBuilder';
import PresetForm from './modules/schools/PresetForm';
import CloneSchool from './modules/schools/CloneSchool';
import ProductList from './modules/products/ProductList';
import StockImport from './modules/stock/StockImport';
import BillingScreen from './modules/billing/BillingScreen';
import BillHistory from './modules/billing/BillHistory';
import GlobalShortcuts from './components/GlobalShortcuts';
import LowStockBadge from './components/LowStockBadge';
import HelpPanel from './components/HelpPanel';

function App() {
  const [helpOpen, setHelpOpen] = useState(false);
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <GlobalShortcuts helpOpen={helpOpen} setHelpOpen={setHelpOpen} />
      <header className="border-b border-slate-200 bg-white px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-xl font-semibold text-slate-800">
            School Uniform Inventory
          </Link>
          <nav className="flex items-center gap-4">
            <Link to="/schools" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              [F6] Schools
            </Link>
            <Link to="/schools/clone" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Clone School
            </Link>
            <Link to="/products" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              [F5] Products
            </Link>
            <Link to="/stock/import" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              [F4] Stock
            </Link>
            <Link to="/billing" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              [F2] Billing
            </Link>
            <Link to="/bills" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              [F8] Bills
            </Link>
            <LowStockBadge />
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="text-sm font-medium text-slate-500 hover:text-slate-700"
              title="Keyboard shortcuts"
            >
              [F1] Help
            </button>
          </nav>
        </div>
      </header>
      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} />
      <main className="flex-1 flex flex-col min-h-0">
        <Routes>
          <Route path="/" element={<div className="p-6"><Home /></div>} />
          <Route path="/schools" element={<div className="p-6"><SchoolList /></div>} />
          <Route path="/schools/new" element={<div className="p-6"><SchoolForm /></div>} />
          <Route path="/schools/clone" element={<div className="p-6"><CloneSchool /></div>} />
          <Route path="/schools/:id/edit" element={<div className="p-6"><SchoolForm /></div>} />
          <Route path="/schools/:id/presets" element={<div className="p-6"><PresetBuilder /></div>} />
          <Route path="/schools/:id/presets/new" element={<div className="p-6"><PresetForm /></div>} />
          <Route path="/schools/:id/presets/:pid/edit" element={<div className="p-6"><PresetForm /></div>} />
          <Route path="/products" element={<div className="p-6"><ProductList /></div>} />
          <Route path="/stock/import" element={<div className="p-6"><StockImport /></div>} />
          <Route path="/billing" element={<BillingScreen />} />
          <Route path="/bills" element={<div className="p-6"><BillHistory /></div>} />
        </Routes>
      </main>
    </div>
  );
}

function Home() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/stock/summary')
      .then(setSummary)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-800">Dashboard</h2>
      {error && (
        <p className="text-sm text-red-600">API error: {error}</p>
      )}

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Products</p>
            <p className="text-2xl font-semibold text-slate-800">{summary.totalProducts ?? 0}</p>
          </div>
          <div className="rounded border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Total Stock</p>
            <p className="text-2xl font-semibold text-slate-800">{summary.totalStock ?? 0}</p>
          </div>
          <div className="rounded border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Low Stock</p>
            <p className="text-2xl font-semibold text-amber-600">{summary.lowStockCount ?? 0}</p>
          </div>
          <div className="rounded border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Out of Stock</p>
            <p className="text-2xl font-semibold text-red-600">{summary.outOfStockCount ?? 0}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          to="/billing"
          className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          [F2] New Bill
        </Link>
        <Link
          to="/stock/import"
          className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          [F4] Stock Import
        </Link>
        <Link
          to="/products"
          className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          [F5] Products
        </Link>
        <Link
          to="/schools"
          className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          [F6] Schools
        </Link>
        <Link
          to="/bills"
          className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          [F8] Bill History
        </Link>
      </div>
    </div>
  );
}

export default App;
