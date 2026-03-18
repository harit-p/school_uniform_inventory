import { useState, useRef, useEffect, useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { searchProducts } from '../../api/products';
import { getNextBillNumber, createBill } from '../../api/bills';
import { listSchools } from '../../api/schools';

function calcLine(qty, unitPrice, gstRate) {
  const taxableAmount = Math.round(qty * unitPrice * 100) / 100;
  const half = gstRate / 2;
  const cgst = Math.round(taxableAmount * half) / 100;
  const sgst = Math.round(taxableAmount * half) / 100;
  return { taxableAmount, cgst, sgst, totalAmount: taxableAmount + cgst + sgst };
}

export default function BillingScreen() {
  const scanRef = useRef(null);
  const amountPaidRef = useRef(null);
  const [billNumber, setBillNumber] = useState('');
  const [customerName, setCustomerName] = useState('CASH CUSTOMER');
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [scanQuery, setScanQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [discount, setDiscount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const subtotal = items.reduce((s, i) => s + (i.taxableAmount || 0), 0);
  const totalCgst = items.reduce((s, i) => s + (i.cgst || 0), 0);
  const totalSgst = items.reduce((s, i) => s + (i.sgst || 0), 0);
  const totalTax = totalCgst + totalSgst;
  const totalBeforeRound = subtotal + totalTax - Number(discount) || 0;
  const roundOff = Math.round(totalBeforeRound) - totalBeforeRound;
  const finalAmount = Math.round(totalBeforeRound);

  useEffect(() => {
    getNextBillNumber().then((r) => setBillNumber(r.billNumber || '')).catch(() => {});
    listSchools().then(setSchools).catch(() => {});
  }, []);

  useEffect(() => {
    if (!scanQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      searchProducts(scanQuery).then(setSearchResults).catch(() => setSearchResults([]));
    }, 150);
    return () => clearTimeout(t);
  }, [scanQuery]);

  const addProduct = useCallback((product, qty = 1) => {
    const unitPrice = product.sellingPrice ?? 0;
    const gstRate = product.gstRate ?? 5;
    const { taxableAmount, cgst, sgst, totalAmount } = calcLine(qty, unitPrice, gstRate);
    setItems((prev) => [
      ...prev,
      {
        productId: product._id,
        product: { sku: product.sku, name: product.name, gstRate },
        quantity: qty,
        unitPrice,
        taxableAmount,
        cgst,
        sgst,
        totalAmount,
      },
    ]);
    setScanQuery('');
    setSearchResults([]);
    scanRef.current?.focus();
  }, []);

  const removeItem = useCallback((index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setSelectedIndex(-1);
  }, []);

  const updateItem = useCallback((index, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };
      const { taxableAmount, cgst, sgst, totalAmount } = calcLine(
        item.quantity,
        item.unitPrice,
        item.product?.gstRate ?? 5
      );
      next[index] = { ...item, taxableAmount, cgst, sgst, totalAmount };
      return next;
    });
  }, []);

  const handleScanKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = scanQuery.trim();
      if (!q) return;
      const exact = searchResults.find((p) => (p.sku || '').toUpperCase() === q.toUpperCase());
      if (exact) {
        addProduct(exact, 1);
        return;
      }
      if (searchResults.length === 1) {
        addProduct(searchResults[0], 1);
        return;
      }
      if (searchResults.length > 1) {
        addProduct(searchResults[0], 1);
      }
    }
  };

  const handleSave = async (openPdf = false) => {
    if (items.length === 0) {
      setError('Add at least one item');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload = {
        customer: { name: customerName || 'CASH CUSTOMER', school: selectedSchoolId || undefined },
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
        discount: Number(discount) || 0,
        paymentMode,
        amountPaid: Number(amountPaid) || 0,
        notes: '',
      };
      const bill = await createBill(payload);
      if (openPdf) {
        const pdfUrl = `/api/bills/${bill._id}/pdf`;
        window.open(pdfUrl, '_blank');
      }
      setItems([]);
      setDiscount(0);
      setAmountPaid('');
      getNextBillNumber().then((r) => setBillNumber(r.billNumber || '')).catch(() => {});
    } catch (e) {
      setError(e.body?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  useHotkeys('f2', () => { setItems([]); setDiscount(0); setAmountPaid(''); setError(null); getNextBillNumber().then((r) => setBillNumber(r.billNumber || '')).catch(() => {}); scanRef.current?.focus(); }, { enableOnFormTags: false });
  useHotkeys('f3', () => scanRef.current?.focus(), { enableOnFormTags: false });
  useHotkeys('f10', () => amountPaidRef.current?.focus(), { enableOnFormTags: false });
  useHotkeys('f12', (e) => { e.preventDefault(); handleSave(true); }, { enableOnFormTags: false });
  useHotkeys('delete', () => { if (selectedIndex >= 0 && selectedIndex < items.length) removeItem(selectedIndex); }, { enableOnFormTags: ['INPUT', 'SELECT'] });

  return (
    <div className="flex flex-1 min-h-0 flex-col bg-white border-b border-slate-200">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-slate-200 px-4 py-2">
        <span className="text-sm font-semibold text-slate-800">New Bill [F2]</span>
        <span className="font-mono text-sm text-slate-600">Bill No: {billNumber || '—'}</span>
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Customer name"
          className="w-40 border border-slate-300 px-2 py-1 text-sm"
        />
        <select
          value={selectedSchoolId}
          onChange={(e) => setSelectedSchoolId(e.target.value)}
          className="border border-slate-300 px-2 py-1 text-sm"
        >
          <option value="">School (optional)</option>
          {schools.map((s) => (
            <option key={s._id} value={s._id}>{s.code}</option>
          ))}
        </select>
      </div>

      {/* Scan bar */}
      <div className="border-b border-slate-200 px-4 py-2">
        <label className="text-xs text-slate-500">Scan / Search [F3]</label>
        <div className="relative mt-0.5">
          <input
            ref={scanRef}
            type="text"
            value={scanQuery}
            onChange={(e) => setScanQuery(e.target.value)}
            onKeyDown={handleScanKeyDown}
            placeholder="Type SKU or product name, press Enter to add"
            className="w-full max-w-xl border border-slate-300 px-3 py-2 font-mono text-sm"
            autoComplete="off"
          />
          {searchResults.length > 0 && (
            <ul className="absolute z-10 mt-0.5 max-h-48 w-full max-w-xl overflow-auto border border-slate-200 bg-white shadow">
              {searchResults.slice(0, 10).map((p) => (
                <li key={p._id}>
                  <button
                    type="button"
                    onClick={() => addProduct(p, 1)}
                    className="block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 font-mono"
                  >
                    {p.sku} — {p.name} — ₹{p.sellingPrice ?? 0}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Items table */}
      <div className="flex-1 overflow-auto border-b border-slate-200">
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead className="bg-slate-50 sticky top-0">
            <tr>
              <th className="border-b border-slate-200 px-2 py-1.5 text-left font-medium text-slate-600 w-8">#</th>
              <th className="border-b border-slate-200 px-2 py-1.5 text-left font-medium text-slate-600">Item</th>
              <th className="border-b border-slate-200 px-2 py-1.5 text-right font-medium text-slate-600 w-16">Qty</th>
              <th className="border-b border-slate-200 px-2 py-1.5 text-right font-medium text-slate-600 w-20">Rate</th>
              <th className="border-b border-slate-200 px-2 py-1.5 text-right font-medium text-slate-600 w-14">GST</th>
              <th className="border-b border-slate-200 px-2 py-1.5 text-right font-medium text-slate-600 w-20">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={6} className="px-2 py-4 text-center text-slate-500 text-sm">No items. Scan or search to add.</td></tr>
            ) : (
              items.map((item, idx) => (
                <tr
                  key={idx}
                  className={selectedIndex === idx ? 'bg-slate-100' : 'hover:bg-slate-50'}
                  onClick={() => setSelectedIndex(idx)}
                >
                  <td className="border-b border-slate-100 px-2 py-1">{idx + 1}</td>
                  <td className="border-b border-slate-100 px-2 py-1">{item.product?.name}</td>
                  <td className="border-b border-slate-100 px-2 py-1 text-right">
                    <input
                      type="number"
                      min={0.01}
                      step={item.product?.unit === 'meters' ? 0.1 : 1}
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                      className="w-14 border border-slate-200 px-1 py-0.5 text-right text-sm"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="border-b border-slate-100 px-2 py-1 text-right">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.unitPrice}
                      onChange={(e) => updateItem(idx, 'unitPrice', Number(e.target.value))}
                      className="w-16 border border-slate-200 px-1 py-0.5 text-right text-sm"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="border-b border-slate-100 px-2 py-1 text-right text-slate-600">{item.product?.gstRate ?? 5}%</td>
                  <td className="border-b border-slate-100 px-2 py-1 text-right font-medium">₹{(item.totalAmount || 0).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex border-b border-slate-200 px-4 py-2 gap-8 text-sm">
        <div>
          <span className="text-slate-500">Subtotal:</span> <span className="font-medium">₹{subtotal.toFixed(2)}</span>
          <span className="ml-4 text-slate-500">CGST:</span> <span>₹{totalCgst.toFixed(2)}</span>
          <span className="ml-4 text-slate-500">SGST:</span> <span>₹{totalSgst.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-slate-500">Discount:</span>
          <input
            type="number"
            min={0}
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className="w-20 border border-slate-200 px-1 py-0.5 text-sm mx-1"
          />
          <span className="text-slate-500 ml-2">Round off:</span> <span>{roundOff.toFixed(2)}</span>
        </div>
        <div className="font-semibold text-slate-800">TOTAL: ₹{finalAmount.toFixed(2)}</div>
      </div>

      {/* Payment row */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-slate-200">
        <span className="text-sm text-slate-600">Payment:</span>
        <select
          value={paymentMode}
          onChange={(e) => setPaymentMode(e.target.value)}
          className="border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="card">Card</option>
          <option value="credit">Credit</option>
        </select>
        <label className="text-sm text-slate-600">Amount:</label>
        <input
          ref={amountPaidRef}
          type="number"
          min={0}
          step={0.01}
          value={amountPaid}
          onChange={(e) => setAmountPaid(e.target.value)}
          placeholder="Amount received"
          className="w-28 border border-slate-300 px-2 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={() => handleSave(false)}
          disabled={saving || items.length === 0}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => handleSave(true)}
          disabled={saving || items.length === 0}
          className="rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          [F12] Save & Print
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-100 text-xs text-slate-600 border-t border-slate-200">
        <span>Bill # {billNumber || '—'}  |  Items: {items.length}  |  Total: ₹{finalAmount.toFixed(2)}</span>
        <span>F2 New  F3 Scan  F10 Payment  F12 Save & Print  Del Remove line</span>
      </div>
    </div>
  );
}
