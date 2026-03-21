import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Bill from '../models/Bill.js';
import Product from '../models/Product.js';
import StockTransaction from '../models/StockTransaction.js';
import { getNextBillNumber } from '../utils/billNumber.js';
import { withOptionalTransaction } from '../utils/withOptionalTransaction.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GUJARATI_FONT_PATH = path.join(__dirname, '../fonts/NotoSansGujarati-Regular.ttf');

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

    const billPayload = {
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
    };

    let createdBillId;
    await withOptionalTransaction(async (session) => {
      const opts = session ? { session } : {};
      const billNumber = await getNextBillNumber(session);
      const billDate = new Date();
      const [bill] = await Bill.create(
        [{ ...billPayload, billNumber, billDate }],
        opts
      );
      createdBillId = bill._id;
      for (let i = 0; i < lineItems.length; i++) {
        const line = lineItems[i];
        await Product.findByIdAndUpdate(
          line.product,
          { $inc: { currentStock: -line.quantity } },
          opts
        );
        await StockTransaction.create(
          [
            {
              type: 'sale',
              product: line.product,
              quantity: -line.quantity,
              unitPrice: line.unitPrice,
              bill: bill._id,
              note: '',
              createdBy: 'system',
            },
          ],
          opts
        );
      }
    });

    const populated = await Bill.findById(createdBillId)
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

function strokeRect(doc, x, y, w, h, lineWidth = 0.5) {
  doc.save();
  doc.lineWidth(lineWidth);
  doc.rect(x, y, w, h).stroke();
  doc.restore();
}

function vLine(doc, x, y1, y2) {
  doc.moveTo(x, y1).lineTo(x, y2).stroke();
}

function hLine(doc, x1, x2, y) {
  doc.moveTo(x1, y).lineTo(x2, y).stroke();
}

async function generatePdf(bill) {
  const PDFDocument = (await import('pdfkit')).default;
  const { toWords } = await import('number-to-words');

  const amountInWords = (n) => {
    const num = Math.round(Number(n) || 0);
    try {
      const words = toWords(num);
      const capitalized = (words || '').replace(/\b\w/g, (c) => c.toUpperCase());
      return `${capitalized} Only`;
    } catch {
      return `${num} Only`;
    }
  };

  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const M = 32;
  const W = PAGE_W - M * 2;
  const LEFT = M;
  const INNER_PAD = 6;

  const subtotal = bill.subtotal || 0;
  const discountAmt = bill.discount || 0;
  const discPct = subtotal > 0 ? ((discountAmt / subtotal) * 100).toFixed(2) : '0.00';

  const school = bill.customer?.school;
  const schoolStr =
    school && typeof school === 'object'
      ? String(school.code || school.name || '').trim()
      : '';

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    let hasGujarati = false;
    if (fs.existsSync(GUJARATI_FONT_PATH)) {
      try {
        doc.registerFont('Gujarati', GUJARATI_FONT_PATH);
        hasGujarati = true;
      } catch {
        hasGujarati = false;
      }
    }

    const guj = (size, bold = false) => {
      if (hasGujarati) {
        doc.font('Gujarati').fontSize(size);
      } else {
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size);
      }
    };

    doc.lineWidth(0.4);
    strokeRect(doc, LEFT, M, W, PAGE_H - M * 2, 1.2);

    let y = M + INNER_PAD;
    const x0 = LEFT + INNER_PAD;
    const contentW = W - INNER_PAD * 2;

    /* —— Header (3 columns) —— */
    const headerH = 88;
    const colL = 118;
    const colC = contentW - colL * 2;
    const xMid = x0 + colL;
    const xRight = xMid + colC;

    strokeRect(doc, x0, y, contentW, headerH);
    vLine(doc, xMid, y, y + headerH);
    vLine(doc, xRight, y, y + headerH);

    doc.save();
    doc.lineWidth(0.35);
    const cx = x0 + colL / 2;
    const cy = y + 28;
    doc.circle(cx, cy, 18).stroke();
    doc.restore();

    doc.font('Helvetica-Bold').fontSize(8);
    doc.text('SHRI HARI VASTRA BHANDAR', x0 + 4, y + headerH - 22, { width: colL - 8, align: 'center' });

    if (hasGujarati) {
      guj(15, true);
      doc.text('શ્રી હરિ વસ્ત્ર ભંડાર', xMid + 4, y + 18, { width: colC - 8, align: 'center' });
      guj(11);
      doc.text('સ્કુલ યુનિફોર્મ', xMid + 4, y + 40, { width: colC - 8, align: 'center' });
    } else {
      doc.font('Helvetica-Bold').fontSize(14);
      doc.text('Shri Hari Vastra Bhandar', xMid + 4, y + 22, { width: colC - 8, align: 'center' });
      doc.font('Helvetica').fontSize(10);
      doc.text('School Uniform', xMid + 4, y + 42, { width: colC - 8, align: 'center' });
    }

    doc.font('Helvetica').fontSize(8);
    const addrRight = `Ashadeep S to 8 / A/B/40,\n1PANT(12)HLLP5/1LC071\nGST: 24BHLPS3092M1Z0`;
    doc.text(addrRight, xRight + 4, y + 14, { width: colL - 8, align: 'left' });

    y += headerH;
    hLine(doc, x0, x0 + contentW, y);

    /* —— Customer + Bill meta —— */
    const custH = 52;
    const splitX = x0 + contentW * 0.58;
    strokeRect(doc, x0, y, contentW, custH);
    vLine(doc, splitX, y, y + custH);

    doc.font('Helvetica-Bold').fontSize(10);
    doc.text(`M/s : ${bill.customer?.name || 'CASH CUSTOMER'}`, x0 + 6, y + 8, { width: splitX - x0 - 12 });

    doc.font('Helvetica').fontSize(8);
    if (hasGujarati) {
      guj(8);
      doc.text('બદલવાનો સમય : બપોરે ૧ થી ૩', x0 + 6, y + 26, { width: splitX - x0 - 12 });
    } else {
      doc.text('Return time: 1 PM to 3 PM', x0 + 6, y + 26, { width: splitX - x0 - 12 });
    }

    const dateStr = new Date(bill.billDate).toLocaleDateString('en-IN');
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('Bill No :', splitX + 6, y + 10, { width: 60 });
    doc.font('Helvetica').text(String(bill.billNumber || ''), splitX + 62, y + 10);
    doc.font('Helvetica-Bold').text('Date :', splitX + 6, y + 28, { width: 60 });
    doc.font('Helvetica').text(dateStr, splitX + 62, y + 28);

    y += custH;
    hLine(doc, x0, x0 + contentW, y);

    /* —— GST / State / School row —— */
    const gstRowH = 22;
    const gstW1 = contentW * 0.34;
    const gstW2 = contentW * 0.33;
    const gstW3 = contentW - gstW1 - gstW2;
    strokeRect(doc, x0, y, contentW, gstRowH);
    vLine(doc, x0 + gstW1, y, y + gstRowH);
    vLine(doc, x0 + gstW1 + gstW2, y, y + gstRowH);
    doc.font('Helvetica').fontSize(8);
    const gstCust = bill.customer?.gst ? String(bill.customer.gst) : '—';
    const stateLine = `${bill.stateName || 'Gujarat'}-${bill.stateCode || '24'}`;
    doc.text(`GST : ${gstCust}`, x0 + 4, y + 6, { width: gstW1 - 8 });
    doc.text(`State - Code: ${stateLine}`, x0 + gstW1 + 4, y + 6, { width: gstW2 - 8 });
    doc.text(`School - ${schoolStr || '—'}`, x0 + gstW1 + gstW2 + 4, y + 6, { width: gstW3 - 8 });

    y += gstRowH;
    hLine(doc, x0, x0 + contentW, y);

    /* —— Item table —— */
    const colWidths = [22, 210, 32, 42, 46, 52, 52, 63];
    const headers = ['No.', 'Item Description', 'Qnty', 'Rate', 'Amount', 'CGST', 'SGST', 'Total Amount'];
    const rowH = 15;
    const headerRowH = 20;
    const items = bill.items || [];
    const minBodyRows = Math.max(items.length, 12);
    const tableBodyH = headerRowH + minBodyRows * rowH + 18;

    strokeRect(doc, x0, y, contentW, tableBodyH);

    let tx = x0;
    for (let c = 0; c < colWidths.length; c++) {
      if (c > 0) vLine(doc, tx, y, y + tableBodyH);
      tx += colWidths[c];
    }

    hLine(doc, x0, x0 + contentW, y + headerRowH);

    doc.font('Helvetica-Bold').fontSize(7.5);
    tx = x0 + 2;
    headers.forEach((h, i) => {
      doc.text(h, tx, y + 5, { width: colWidths[i] - 4, align: i >= 2 ? 'right' : 'left' });
      tx += colWidths[i];
    });

    let rowY = y + headerRowH;
    doc.font('Helvetica').fontSize(7.5);

    const drawRow = (cells, alignRightFrom = 2) => {
      tx = x0 + 2;
      cells.forEach((cell, i) => {
        doc.text(String(cell), tx, rowY + 3, {
          width: colWidths[i] - 4,
          align: i >= alignRightFrom ? 'right' : 'left',
        });
        tx += colWidths[i];
      });
      hLine(doc, x0, x0 + contentW, rowY + rowH);
      rowY += rowH;
    };

    items.forEach((item, i) => {
      drawRow([
        i + 1,
        (item.name || '').substring(0, 42),
        item.quantity,
        (item.unitPrice || 0).toFixed(2),
        (item.taxableAmount || 0).toFixed(2),
        `${((item.gstRate || 0) / 2).toFixed(0)}% ${(item.cgst || 0).toFixed(2)}`,
        `${((item.gstRate || 0) / 2).toFixed(0)}% ${(item.sgst || 0).toFixed(2)}`,
        (item.totalAmount || 0).toFixed(2),
      ]);
    });

    const emptyRows = minBodyRows - items.length;
    for (let r = 0; r < emptyRows; r++) {
      hLine(doc, x0, x0 + contentW, rowY + rowH);
      rowY += rowH;
    }

    doc.font('Helvetica-Bold').fontSize(8);
    const totalItemsAmt = items.reduce((s, it) => s + (Number(it.totalAmount) || 0), 0);
    tx = x0 + 2;
    doc.text('Total :', x0 + colWidths[0] + 4, rowY + 4, { width: colWidths[1] - 8 });
    doc.text(totalItemsAmt.toFixed(2), x0 + colWidths.slice(0, 7).reduce((a, b) => a + b, 0) + 2, rowY + 4, {
      width: colWidths[7] - 4,
      align: 'right',
    });

    y += tableBodyH;
    hLine(doc, x0, x0 + contentW, y);

    /* —— Footer: words + terms | summary box —— */
    const footerH = 118;
    const splitFoot = x0 + contentW * 0.55;
    strokeRect(doc, x0, y, contentW, footerH);
    vLine(doc, splitFoot, y, y + footerH);

    const words = amountInWords(bill.finalAmount);
    doc.font('Helvetica').fontSize(8);
    doc.text('Rupees :', x0 + 6, y + 8, { width: 50 });
    doc.text(words, x0 + 52, y + 8, { width: splitFoot - x0 - 58, lineGap: 2 });

    doc.font('Helvetica').fontSize(7.5);
    doc.text('• Goods once sold will not be taken back.', x0 + 6, y + 36, { width: splitFoot - x0 - 12 });
    if (hasGujarati) {
      guj(7.5);
      doc.text('• બદલવાનો સમય : બપોરે ૧ થી ૩', x0 + 6, y + 50, { width: splitFoot - x0 - 12 });
    } else {
      doc.font('Helvetica').fontSize(7.5);
      doc.text('• Return time: 1 PM to 3 PM.', x0 + 6, y + 50, { width: splitFoot - x0 - 12 });
    }

    const boxW = contentW * 0.45 - 12;
    const bx = splitFoot + 6;
    let by = y + 8;
    const lineGap = 16;

    const summaryRow = (label, val) => {
      doc.font('Helvetica').fontSize(8);
      doc.text(label, bx + 4, by, { width: boxW * 0.52 });
      doc.text(String(val), bx + boxW * 0.48, by, { width: boxW * 0.48 - 8, align: 'right' });
      by += lineGap;
    };

    doc.save();
    doc.lineWidth(0.35);
    strokeRect(doc, bx, y + 4, boxW, 70);
    doc.restore();
    by = y + 12;
    summaryRow('Dis.(%) :', discPct);
    summaryRow('Net Amt. :', (bill.finalAmount || 0).toFixed(2));
    summaryRow('Advance :', (bill.amountPaid || 0).toFixed(2));
    summaryRow('Total Pending :', (bill.amountPending || 0).toFixed(2));

    doc.font('Helvetica').fontSize(8);
    doc.text('For, Shree Hari Vastra Bhandar', bx, y + footerH - 22, {
      width: boxW,
      align: 'right',
    });

    doc.end();
  });
}
