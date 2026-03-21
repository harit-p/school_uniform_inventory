import Product from '../models/Product.js';
import StockTransaction from '../models/StockTransaction.js';
import { withOptionalTransaction } from '../utils/withOptionalTransaction.js';

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

    const lines = [];
    for (const line of items) {
      const { productId, quantity, unitPrice } = line;
      if (!productId || quantity == null || quantity <= 0) continue;
      const product = await Product.findById(productId).lean();
      if (!product) continue;
      const q = Number(quantity);
      const price = Number(unitPrice) ?? product.costPrice ?? 0;
      lines.push({ productId, product, q, price });
    }

    if (lines.length === 0) {
      return res.status(400).json({ error: 'No valid items to import' });
    }

    let results = [];
    await withOptionalTransaction(async (session) => {
      const opts = session ? { session } : {};
      const batch = [];
      for (const { productId, product, q, price } of lines) {
        await Product.findByIdAndUpdate(productId, { $inc: { currentStock: q } }, opts);
        if (price && (product.costPrice === 0 || product.costPrice == null)) {
          await Product.findByIdAndUpdate(productId, { costPrice: price }, opts);
        }
        const [txn] = await StockTransaction.create(
          [
            {
              type: 'import',
              product: productId,
              quantity: q,
              unitPrice: price,
              note: note || '',
              createdBy: createdBy || 'system',
            },
          ],
          opts
        );
        batch.push(txn);
      }
      results = batch;
    });

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
    const q = Number(quantity);
    const filter = { _id: productId };
    if (q < 0) {
      filter.$expr = {
        $gte: [{ $add: [{ $ifNull: ['$currentStock', 0] }, q] }, 0],
      };
    }

    let txn;
    await withOptionalTransaction(async (session) => {
      const opts = session ? { session } : {};
      const updated = await Product.findOneAndUpdate(filter, { $inc: { currentStock: q } }, {
        ...opts,
        new: true,
      });
      if (!updated) {
        const product = await Product.findById(productId).lean();
        if (!product) {
          const err = new Error('NOT_FOUND');
          err.code = 'NOT_FOUND';
          throw err;
        }
        const err = new Error('NEGATIVE_STOCK');
        err.code = 'NEGATIVE_STOCK';
        throw err;
      }
      const [created] = await StockTransaction.create(
        [
          {
            type: 'adjustment',
            product: productId,
            quantity: q,
            unitPrice: updated.costPrice ?? 0,
            note: note || 'Manual adjustment',
            createdBy: createdBy || 'system',
          },
        ],
        opts
      );
      txn = created;
    });

    res.status(201).json(txn);
  } catch (err) {
    if (err.code === 'NOT_FOUND') return res.status(404).json({ error: 'Product not found' });
    if (err.code === 'NEGATIVE_STOCK') {
      return res.status(400).json({ error: 'Resulting stock cannot be negative' });
    }
    res.status(400).json({ error: err.message });
  }
}

export async function stockSummary(req, res) {
  try {
    const [summary] = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalStock: { $sum: { $ifNull: ['$currentStock', 0] } },
          lowCount: {
            $sum: {
              $cond: [
                { $lt: [{ $ifNull: ['$currentStock', 0] }, { $ifNull: ['$lowStockAlert', 5] }] },
                1,
                0,
              ],
            },
          },
          outCount: {
            $sum: { $cond: [{ $lte: [{ $ifNull: ['$currentStock', 0] }, 0] }, 1, 0] },
          },
        },
      },
    ]);
    res.json({
      totalProducts: summary?.totalProducts ?? 0,
      totalStock: summary?.totalStock ?? 0,
      lowStockCount: summary?.lowCount ?? 0,
      outOfStockCount: summary?.outCount ?? 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function lowStock(req, res) {
  try {
    const low = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $addFields: {
          threshold: { $ifNull: ['$lowStockAlert', 5] },
          stock: { $ifNull: ['$currentStock', 0] },
        },
      },
      { $match: { $expr: { $lt: ['$stock', '$threshold'] } } },
      { $sort: { stock: 1 } },
      { $limit: 100 },
      {
        $lookup: {
          from: 'schools',
          localField: 'school',
          foreignField: '_id',
          as: 'schoolDoc',
          pipeline: [{ $project: { name: 1, code: 1 } }],
        },
      },
      {
        $set: {
          school: { $arrayElemAt: ['$schoolDoc', 0] },
          currentStock: '$stock',
          lowStockAlert: '$threshold',
        },
      },
      { $unset: ['schoolDoc', 'threshold', 'stock'] },
      { $project: { __v: 0 } },
    ]);
    res.json(low);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
