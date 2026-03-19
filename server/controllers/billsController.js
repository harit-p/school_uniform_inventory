import Bill from '../models/Bill.js';
import Product from '../models/Product.js';
import StockTransaction from '../models/StockTransaction.js';
import { getNextBillNumber } from '../utils/billNumber.js';

function calcLineItem(qty, unitPrice, gstRate, lineDiscount = 0) {
  const taxableAmount = Math.round((qty * unitPrice - lineDiscount) * 100) / 100;
  const halfRate = gstRate / 2;
  const cgst = Math.round(taxableAmount * halfRate) / 100;
  const sgst = Math.round(taxableAmount * halfRate) / 100;
  const totalAmount = taxableAmount + cgst + sgst;
  return { taxableAmount, cgst, sgst, totalAmount };
}

export async function getNextNumber(req, res) {
  try {
    const billNumber = await getNextBillNumber();
    res.json({ billNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function listBills(req, res) {
  try {
    const { status, startDate, endDate, customer } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (customer) filter['customer.name'] = new RegExp(customer, 'i');
    if (startDate || endDate) {
      filter.billDate = {};
      if (startDate) filter.billDate.$gte = new Date(startDate);
      if (endDate) filter.billDate.$lte = new Date(endDate);
    }
    const bills = await Bill.find(filter).sort({ billDate: -1 }).limit(500).lean();
    res.json(bills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getBill(req, res) {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('customer.school', 'name code')
      .lean();
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createBill(req, res) {
  try {
    const {
      customer = {},
      items: rawItems,
      discount = 0,
      discountPercent = 0,
      paymentMode = 'cash',
      amountPaid = 0,
      notes = '',
    } = req.body;

    if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    const billNumber = await getNextBillNumber();
    const billDate = new Date();

    const lineItems = [];
    let subtotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;

    for (const row of rawItems) {
      const product = await Product.findById(row.productId).lean();
      if (!product) return res.status(400).json({ error: `Product not found: ${row.productId}` });
      const qty = Number(row.quantity) || 1;
      const unitPrice = Number(row.unitPrice) ?? product.sellingPrice ?? 0;
      const lineDiscount = Number(row.discount) || 0;
      const gstRate = product.gstRate ?? 5;
      const { taxableAmount, cgst, sgst, totalAmount } = calcLineItem(qty, unitPrice, gstRate, lineDiscount);

      lineItems.push({
        product: product._id,
        sku: product.sku,
        name: product.name,
        quantity: qty,
        unitPrice,
        discount: lineDiscount,
        taxableAmount,
        cgst,
        sgst,
        totalAmount,
        hsnCode: product.hsnCode || '',
        gstRate,
      });
      subtotal += taxableAmount;
      totalCgst += cgst;
      totalSgst += sgst;
    }

    const totalTax = totalCgst + totalSgst;
    const discountAmount = Number(discount) || (subtotal * Number(discountPercent) / 100);
    let totalAmount = subtotal + totalTax - discountAmount;
    const roundOff = Math.round(totalAmount) - totalAmount;
    const finalAmount = Math.round(totalAmount);
    const amountPaidNum = Number(amountPaid) || 0;
    const amountPending = Math.max(0, finalAmount - amountPaidNum);
    const status = amountPending <= 0 ? 'paid' : (amountPaidNum > 0 ? 'partial' : 'pending');

    const bill = await Bill.create({
      billNumber,
      billDate,
      customer: {
        name: customer.name || 'CASH CUSTOMER',
        phone: customer.phone || '',
        gst: customer.gst || '',
        school: customer.school || null,
        class: customer.class || '',
      },
      stateName: req.body.stateName ?? 'Gujarat',
      stateCode: req.body.stateCode ?? '24',
      items: lineItems,
      subtotal,
      totalCgst,
      totalSgst,
      totalTax,
      totalAmount: subtotal + totalTax,
      discount: discountAmount,
      discountPercent: Number(discountPercent) || 0,
      roundOff,
      finalAmount,
      paymentMode,
      amountPaid: amountPaidNum,
      amountPending,
      status,
      notes,
    });

    for (let i = 0; i < lineItems.length; i++) {
      const line = lineItems[i];
      await Product.findByIdAndUpdate(line.product, { $inc: { currentStock: -line.quantity } });
      await StockTransaction.create({
        type: 'sale',
        product: line.product,
        quantity: -line.quantity,
        unitPrice: line.unitPrice,
        bill: bill._id,
        note: '',
        createdBy: 'system',
      });
    }

    const populated = await Bill.findById(bill._id)
      .populate('customer.school', 'name code')
      .lean();
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function updateBill(req, res) {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    if (bill.status !== 'pending' && bill.status !== 'partial') {
      return res.status(400).json({ error: 'Only draft/pending bills can be updated' });
    }
    const { customer, discount, discountPercent, paymentMode, amountPaid, notes, status } = req.body;
    if (customer) bill.customer = { ...bill.customer.toObject(), ...customer };
    if (discount !== undefined) bill.discount = discount;
    if (discountPercent !== undefined) bill.discountPercent = discountPercent;
    if (paymentMode !== undefined) bill.paymentMode = paymentMode;
    if (amountPaid !== undefined) {
      bill.amountPaid = amountPaid;
      bill.amountPending = Math.max(0, bill.finalAmount - amountPaid);
      bill.status = bill.amountPending <= 0 ? 'paid' : (amountPaid > 0 ? 'partial' : 'pending');
    }
    if (notes !== undefined) bill.notes = notes;
    if (status !== undefined) bill.status = status;
    await bill.save();
    res.json(bill);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function getBillPdf(req, res) {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('customer.school', 'name code')
      .lean();
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    const pdfBuffer = await generatePdf(bill);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="bill-${bill.billNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function generatePdf(bill) {
  const PDFDocument = (await import('pdfkit')).default;
  const { toWords } = await import('number-to-words');

  const amountInWords = (n) => {
    const num = Math.round(Number(n) || 0);
    try {
      const words = toWords(num);
      const capitalized = (words || '').replace(/\b\w/g, (c) => c.toUpperCase());
      return `Rupees ${capitalized} Only`;
    } catch {
      return `Rupees ${num} Only`;
    }
  };

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(16).font('Helvetica-Bold').text('Shri Hari Vastra Bhandar', { align: 'center' });
    doc.fontSize(9).font('Helvetica').text('Ashadeep S to 8 / A/B/40, 1PANT(12)HLLP5/1LC071', { align: 'center' });
    doc.text(`GST No: 24BHLPS3092M1Z0  |  State: ${bill.stateName || 'Gujarat'} (${bill.stateCode || '24'})`, { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(14).font('Helvetica-Bold').text('TAX INVOICE', { align: 'center' });
    doc.moveDown(1);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Bill No: ${bill.billNumber}    Date: ${new Date(bill.billDate).toLocaleDateString('en-IN')}`);
    doc.text(`Customer: ${bill.customer?.name || 'CASH CUSTOMER'}`);
    if (bill.customer?.gst) doc.text(`Customer GST: ${bill.customer.gst}`);
    doc.moveDown(1);

    const tableTop = doc.y;
    const colWidths = [25, 180, 35, 45, 50, 55, 55, 45];
    const headers = ['No.', 'Item Description', 'Qty', 'Rate', 'Amount', 'CGST', 'SGST', 'Total'];
    doc.font('Helvetica-Bold').fontSize(8);
    let x = 50;
    headers.forEach((h, i) => {
      doc.text(h, x, tableTop, { width: colWidths[i] });
      x += colWidths[i];
    });
    doc.moveDown(0.5);
    let y = doc.y;
    doc.font('Helvetica').fontSize(8);
    (bill.items || []).forEach((item, i) => {
      x = 50;
      const row = [
        i + 1,
        item.name?.substring(0, 28) || '',
        item.quantity,
        (item.unitPrice || 0).toFixed(2),
        (item.taxableAmount || 0).toFixed(2),
        `${((item.gstRate || 0) / 2).toFixed(2)}% ${(item.cgst || 0).toFixed(2)}`,
        `${((item.gstRate || 0) / 2).toFixed(2)}% ${(item.sgst || 0).toFixed(2)}`,
        (item.totalAmount || 0).toFixed(2),
      ];
      row.forEach((cell, j) => {
        doc.text(String(cell), x, y, { width: colWidths[j] });
        x += colWidths[j];
      });
      y += 16;
    });
    doc.y = y + 10;

    const wordsText = `Amount in words: ${amountInWords(bill.finalAmount)}`;
    doc.fontSize(9).text(wordsText, 50, doc.y, { width: 495, lineGap: 3 });
    doc.moveDown(1);

    const summaryLeft = 50;
    const summaryValRight = 520;
    doc.fontSize(9).font('Helvetica');
    doc.text('Subtotal:', summaryLeft, doc.y);
    doc.text(`${(bill.subtotal || 0).toFixed(2)}`, summaryLeft + 350, doc.y, { width: 120, align: 'right' });
    doc.moveDown(0.45);
    doc.text('CGST:', summaryLeft, doc.y);
    doc.text(`${(bill.totalCgst || 0).toFixed(2)}`, summaryLeft + 350, doc.y, { width: 120, align: 'right' });
    doc.moveDown(0.45);
    doc.text('SGST:', summaryLeft, doc.y);
    doc.text(`${(bill.totalSgst || 0).toFixed(2)}`, summaryLeft + 350, doc.y, { width: 120, align: 'right' });
    doc.moveDown(0.45);
    doc.text('Discount:', summaryLeft, doc.y);
    doc.text(`${(bill.discount || 0).toFixed(2)}`, summaryLeft + 350, doc.y, { width: 120, align: 'right' });
    doc.moveDown(0.45);
    doc.text('Round Off:', summaryLeft, doc.y);
    doc.text(`${(bill.roundOff || 0).toFixed(2)}`, summaryLeft + 350, doc.y, { width: 120, align: 'right' });
    doc.moveDown(0.6);
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Net Amount:', summaryLeft, doc.y);
    doc.text(`₹${(bill.finalAmount || 0).toFixed(2)}`, summaryLeft + 350, doc.y, { width: 120, align: 'right' });
    doc.moveDown(1.5);
    doc.fontSize(8).font('Helvetica').text('Goods once sold will not be taken back.', { color: '#666' });
    doc.end();
  });
}
