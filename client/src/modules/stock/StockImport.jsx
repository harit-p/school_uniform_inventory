import { useState, useEffect, useRef } from 'react';
import { searchProducts } from '../../api/products';
import { recordImport, recordAdjustment, listTransactions } from '../../api/stock';

function ImportLine({ line, onRemove, onQuantityChange, onPriceChange }) {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-2 py-1.5 text-sm font-mono">{line.product?.sku}</td>
      <td className="px-2 py-1.5 text-sm text-slate-800">{line.product?.name}</td>
      <td className="px-2 py-1.5">
        <input
          type="number"
          min={0.001}
          step={line.product?.unit === 'meters' ? 0.1 : 1}
          value={line.quantity}
          onChange={(e) => onQuantityChange(Number(e.target.value))}
          className="w-20 rounded border border-slate-200 px-2 py-1 text-sm"
        />
      </td>
      <td className="px-2 py-1.5">
        <input
          type="number"
          min={0}
          step={0.01}
          value={line.unitPrice}
          onChange={(e) => onPriceChange(Number(e.target.value))}
          className="w-24 rounded border border-slate-200 px-2 py-1 text-sm"
        />
      </td>
      <td className="px-2 py-1.5 text-sm text-slate-600">
        ₹{(line.quantity * line.unitPrice).toFixed(2)}
      </td>
      <td className="px-2 py-1.5">
        <button type="button" onClick={onRemove} className="text-red-600 hover:underline text-sm">×</button>
      </td>
    </tr>
  );
}

export default function StockImport() {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchHighlightIndex, setSearchHighlightIndex] = useState(-1);
  const [lines, setLines] = useState([]);
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [adjustSearch, setAdjustSearch] = useState('');
  const [adjustResults, setAdjustResults] = useState([]);
  const [adjustHighlightIndex, setAdjustHighlightIndex] = useState(-1);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustNote, setAdjustNote] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      setSearchHighlightIndex(-1);
      return;
    }
    const t = setTimeout(() => {
      searchProducts(search)
        .then((results) => {
          setSearchResults(results);
          setSearchHighlightIndex(results.length > 0 ? 0 : -1);
        })
        .catch(() => {
          setSearchResults([]);
          setSearchHighlightIndex(-1);
        });
    }, 200);
    return () => clearTimeout(t);
  }, [search]);

  const addProduct = (product) => {
    if (lines.some((l) => l.productId === product._id)) return;
    setLines((prev) => [
      ...prev,
      {
        productId: product._id,
        product: { sku: product.sku, name: product.name, unit: product.unit },
        quantity: product.unit === 'meters' ? 1 : 1,
        unitPrice: product.costPrice ?? 0,
      },
    ]);
    setSearch('');
    setSearchResults([]);
    setSearchHighlightIndex(-1);
    searchRef.current?.focus();
  };

  useEffect(() => {
    if (searchResults.length === 0 || searchHighlightIndex < 0) return;
    const id = searchResults[searchHighlightIndex]?._id;
    if (id) {
      const el = document.getElementById(`import-search-option-${id}`);
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [searchHighlightIndex, searchResults]);

  useEffect(() => {
    if (adjustResults.length === 0 || adjustHighlightIndex < 0) return;
    const id = adjustResults[adjustHighlightIndex]?._id;
    if (id) {
      const el = document.getElementById(`adjust-search-option-${id}`);
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [adjustHighlightIndex, adjustResults]);

  const handleSearchKeyDown = (e) => {
    if (searchResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSearchHighlightIndex((i) => (i < searchResults.length - 1 ? i + 1 : i));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSearchHighlightIndex((i) => (i <= 0 ? searchResults.length - 1 : i - 1));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const idx = searchHighlightIndex >= 0 ? searchHighlightIndex : 0;
      const product = searchResults[idx];
      if (product) addProduct(product);
    }
  };

  const removeLine = (index) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLine = (index, field, value) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleConfirm = async () => {
    setError(null);
    setConfirming(true);
    try {
      await recordImport({
        items: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
        note,
        createdBy: 'user',
      });
      setLines([]);
      setNote('');
      loadHistory();
    } catch (e) {
      setError(e.body?.error || e.message);
    } finally {
      setConfirming(false);
    }
  };

  const loadHistory = () => {
    listTransactions({ type: 'import' })
      .then(setHistory)
      .catch(() => {});
  };

  const handleAdjust = async () => {
    if (!adjustProduct || adjustQty === 0) return;
    setError(null);
    setAdjusting(true);
    try {
      await recordAdjustment({
        productId: adjustProduct._id,
        quantity: adjustQty,
        note: adjustNote || 'Manual adjustment',
        createdBy: 'user',
      });
      setAdjustProduct(null);
      setAdjustQty(0);
      setAdjustNote('');
      loadHistory();
    } catch (e) {
      setError(e.body?.error || e.message);
    } finally {
      setAdjusting(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const totalValue = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-800">Stock Import</h2>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <label className="block text-sm font-medium text-slate-700">Scan / Search product</label>
        <input
          ref={searchRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Type SKU or name, use ↑↓ to select, Enter to add"
          className="mt-1 w-full max-w-md rounded border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          autoComplete="off"
        />
        {searchResults.length > 0 && (
          <ul className="mt-2 max-h-48 overflow-auto rounded border border-slate-200 bg-slate-50" role="listbox">
            {searchResults.map((p, idx) => (
              <li key={p._id} id={`import-search-option-${p._id}`} role="option" aria-selected={idx === searchHighlightIndex}>
                <button
                  type="button"
                  onClick={() => addProduct(p)}
                  onMouseEnter={() => setSearchHighlightIndex(idx)}
                  className={`block w-full px-3 py-2 text-left text-sm ${idx === searchHighlightIndex ? 'bg-slate-300' : 'hover:bg-slate-200'}`}
                >
                  <span className="font-mono">{p.sku}</span> — {p.name} (₹{p.costPrice ?? 0})
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-700">Import list</h3>
          {lines.length > 0 && (
            <span className="text-sm text-slate-600">{lines.length} item(s) · ₹{totalValue.toFixed(2)}</span>
          )}
        </div>
        {lines.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Add products above. Press Enter or select from dropdown.</p>
        ) : (
          <>
            <table className="mt-2 min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-600">
                  <th className="px-2 py-1.5">SKU</th>
                  <th className="px-2 py-1.5">Name</th>
                  <th className="px-2 py-1.5">Qty</th>
                  <th className="px-2 py-1.5">Cost (₹)</th>
                  <th className="px-2 py-1.5">Total</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <ImportLine
                    key={idx}
                    line={line}
                    onRemove={() => removeLine(idx)}
                    onQuantityChange={(v) => updateLine(idx, 'quantity', v)}
                    onPriceChange={(v) => updateLine(idx, 'unitPrice', v)}
                  />
                ))}
              </tbody>
            </table>
            <div className="mt-3">
              <label className="block text-xs font-medium text-slate-600">Note (optional)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Supplier / invoice ref"
                className="mt-0.5 w-full max-w-md rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirming}
              className="mt-3 rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {confirming ? 'Confirming…' : 'Confirm Import'}
            </button>
          </>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-medium text-slate-700">Stock adjustment</h3>
        <p className="mt-1 text-xs text-slate-500">Correct stock (e.g. damaged goods removed). Enter + or − quantity.</p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs text-slate-600">Product</label>
            {adjustProduct ? (
              <span className="inline-flex items-center gap-1 mt-0.5 rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm">
                {adjustProduct.sku}
                <button type="button" onClick={() => { setAdjustProduct(null); setAdjustSearch(''); setAdjustResults([]); }} className="text-slate-500 hover:text-red-600">×</button>
              </span>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search SKU/name (↑↓ to select)"
                  value={adjustSearch}
                  onChange={(e) => {
                    const v = e.target.value;
                    setAdjustSearch(v);
                    if (!v.trim()) { setAdjustResults([]); setAdjustHighlightIndex(-1); return; }
                    searchProducts(v).then((results) => {
                      setAdjustResults(results);
                      setAdjustHighlightIndex(results.length > 0 ? 0 : -1);
                    }).catch(() => { setAdjustResults([]); setAdjustHighlightIndex(-1); });
                  }}
                  onKeyDown={(e) => {
                    if (adjustResults.length === 0) return;
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setAdjustHighlightIndex((i) => (i < adjustResults.length - 1 ? i + 1 : i));
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setAdjustHighlightIndex((i) => (i <= 0 ? adjustResults.length - 1 : i - 1));
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      const idx = adjustHighlightIndex >= 0 ? adjustHighlightIndex : 0;
                      const p = adjustResults[idx];
                      if (p) {
                        setAdjustProduct(p);
                        setAdjustSearch('');
                        setAdjustResults([]);
                        setAdjustHighlightIndex(-1);
                      }
                    }
                  }}
                  className="mt-0.5 w-48 rounded border border-slate-300 px-2 py-1.5 text-sm"
                  autoComplete="off"
                />
                {adjustResults.length > 0 && (
                  <ul className="absolute z-10 mt-0.5 max-h-36 w-64 overflow-auto rounded border border-slate-200 bg-white shadow" role="listbox">
                    {adjustResults.map((p, idx) => (
                      <li key={p._id} id={`adjust-search-option-${p._id}`} role="option" aria-selected={idx === adjustHighlightIndex}>
                        <button
                          type="button"
                          onClick={() => { setAdjustProduct(p); setAdjustSearch(''); setAdjustResults([]); setAdjustHighlightIndex(-1); }}
                          onMouseEnter={() => setAdjustHighlightIndex(idx)}
                          className={`block w-full px-2 py-1.5 text-left text-sm ${idx === adjustHighlightIndex ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
                        >
                          {p.sku} — {p.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs text-slate-600">Quantity (±)</label>
            <input
              type="number"
              value={adjustQty || ''}
              onChange={(e) => setAdjustQty(Number(e.target.value))}
              placeholder="e.g. -2"
              className="mt-0.5 w-24 rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600">Note</label>
            <input
              type="text"
              value={adjustNote}
              onChange={(e) => setAdjustNote(e.target.value)}
              placeholder="Reason"
              className="mt-0.5 w-40 rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={handleAdjust}
            disabled={adjusting || !adjustProduct || adjustQty === 0}
            className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {adjusting ? 'Applying…' : 'Apply'}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-medium text-slate-700">Recent imports</h3>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No import history yet.</p>
        ) : (
          <div className="mt-2 max-h-64 overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-600">
                  <th className="px-2 py-1.5">Date</th>
                  <th className="px-2 py-1.5">Product</th>
                  <th className="px-2 py-1.5">Qty</th>
                  <th className="px-2 py-1.5">Value</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 50).map((t) => (
                  <tr key={t._id} className="border-b border-slate-100">
                    <td className="px-2 py-1.5 text-slate-600">
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                    <td className="px-2 py-1.5 font-mono">{t.product?.sku}</td>
                    <td className="px-2 py-1.5">+{t.quantity}</td>
                    <td className="px-2 py-1.5">₹{(t.quantity * (t.unitPrice || 0)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
