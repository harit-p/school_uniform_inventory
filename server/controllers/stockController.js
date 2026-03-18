import Product from '../models/Product.js';
import StockTransaction from '../models/StockTransaction.js';

export async function listTransactions(req, res) {
  try {
    const { type, product, startDate, endDate } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (product) filter.product = product;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    const transactions = await StockTransaction.find(filter)
      .populate('product', 'sku name')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function recordImport(req, res) {
  try {
    const { items, note, createdBy } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }
    const results = [];
    for (const line of items) {
      const { productId, quantity, unitPrice } = line;
      if (!productId || quantity == null || quantity <= 0) continue;
      const product = await Product.findById(productId);
      if (!product) continue;
      const q = Number(quantity);
      const price = Number(unitPrice) ?? product.costPrice ?? 0;
      await Product.findByIdAndUpdate(productId, { $inc: { currentStock: q } });
      if (price && (product.costPrice === 0 || product.costPrice == null)) {
        await Product.findByIdAndUpdate(productId, { costPrice: price });
      }
      const txn = await StockTransaction.create({
        type: 'import',
        product: productId,
        quantity: q,
        unitPrice: price,
        note: note || '',
        createdBy: createdBy || 'system',
      });
      results.push(txn);
    }
    res.status(201).json({ count: results.length, transactions: results });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function recordAdjustment(req, res) {
  try {
    const { productId, quantity, note, createdBy } = req.body;
    if (!productId || quantity == null) {
      return res.status(400).json({ error: 'productId and quantity are required' });
    }
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const q = Number(quantity);
    const current = product.currentStock ?? 0;
    const newStock = current + q;
    if (newStock < 0) {
      return res.status(400).json({ error: 'Resulting stock cannot be negative' });
    }
    await Product.findByIdAndUpdate(productId, { currentStock: newStock });
    const txn = await StockTransaction.create({
      type: 'adjustment',
      product: productId,
      quantity: q,
      unitPrice: product.costPrice ?? 0,
      note: note || 'Manual adjustment',
      createdBy: createdBy || 'system',
    });
    res.status(201).json(txn);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function stockSummary(req, res) {
  try {
    const products = await Product.find({ isActive: true }).lean();
    const totalItems = products.length;
    const totalStock = products.reduce((s, p) => s + (p.currentStock || 0), 0);
    const lowCount = products.filter(
      (p) => (p.currentStock ?? 0) < (p.lowStockAlert ?? 5)
    ).length;
    const outCount = products.filter((p) => (p.currentStock ?? 0) <= 0).length;
    res.json({
      totalProducts: totalItems,
      totalStock,
      lowStockCount: lowCount,
      outOfStockCount: outCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function lowStock(req, res) {
  try {
    const products = await Product.find({ isActive: true })
      .populate('school', 'name code')
      .lean();
    const low = products.filter(
      (p) => (p.currentStock ?? 0) < (p.lowStockAlert ?? 5)
    );
    low.sort((a, b) => (a.currentStock ?? 0) - (b.currentStock ?? 0));
    res.json(low);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
