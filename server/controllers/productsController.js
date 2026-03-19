import Product from '../models/Product.js';
import School from '../models/School.js';
import { buildSku, buildProductName } from '../utils/sku.js';

export async function listProducts(req, res) {
  try {
    const { school, itemType, size, stockType } = req.query;
    const filter = { isActive: true };
    if (school) filter.school = school;
    if (itemType) filter.itemType = itemType;
    if (size) filter.size = size;
    if (stockType) filter.stockType = stockType;
    const products = await Product.find(filter)
      .select('sku name school itemType size currentStock lowStockAlert sellingPrice costPrice isActive')
      .populate('school', 'name code')
      .sort({ sku: 1 })
      .limit(500)
      .lean();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getProduct(req, res) {
  try {
    const product = await Product.findById(req.params.id)
      .populate('school', 'name code')
      .lean();
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createProduct(req, res) {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'SKU already exists' });
    res.status(400).json({ error: err.message });
  }
}

export async function updateProduct(req, res) {
  try {
    const { sellingPrice, costPrice, lowStockAlert, hsnCode, gstRate, isActive } = req.body;
    const update = {};
    if (sellingPrice !== undefined) update.sellingPrice = sellingPrice;
    if (costPrice !== undefined) update.costPrice = costPrice;
    if (lowStockAlert !== undefined) update.lowStockAlert = lowStockAlert;
    if (hsnCode !== undefined) update.hsnCode = hsnCode;
    if (gstRate !== undefined) update.gstRate = gstRate;
    if (isActive !== undefined) update.isActive = isActive;
    const product = await Product.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    }).lean();
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function deleteProduct(req, res) {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deactivated', product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function searchProducts(req, res) {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);
    const skuUpper = q.toUpperCase();
    // Exact SKU match is a single indexed lookup — return immediately
    const exact = await Product.findOne({ isActive: true, sku: skuUpper })
      .select('sku name sellingPrice costPrice currentStock lowStockAlert school')
      .populate('school', 'name code')
      .lean();
    if (exact) return res.json([exact]);

    const escaped = escapeRegex(q);
    const re = new RegExp(escaped, 'i');
    const products = await Product.find({
      isActive: true,
      $or: [{ sku: re }, { name: re }],
    })
      .select('sku name sellingPrice costPrice currentStock lowStockAlert school')
      .populate('school', 'name code')
      .limit(15)
      .lean();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function bulkCreateFromPreset(req, res) {
  try {
    const { schoolId, presetId } = req.body;
    if (!schoolId || !presetId) {
      return res.status(400).json({ error: 'schoolId and presetId are required' });
    }
    const school = await School.findById(schoolId).lean();
    if (!school) return res.status(404).json({ error: 'School not found' });
    const preset = school.uniformPresets?.find((p) => p._id.toString() === presetId);
    if (!preset) return res.status(404).json({ error: 'Preset not found' });

    const created = [];
    const code = school.code;
    const name = school.name;

    for (const item of preset.items || []) {
      const isFabric = item.stockType === 'fabric';
      const gender = item.gender || 'unisex';
      const itemType = item.itemType || 'fabric';
      const unit = isFabric ? 'meters' : 'piece';
      const sizes = isFabric ? ['M'] : (item.sizes && item.sizes.length ? item.sizes : ['']);

      for (const size of sizes) {
        const sku = buildSku(code, gender, itemType, size, isFabric);
        const existing = await Product.findOne({ sku }).lean();
        if (existing) continue;
        const productName = buildProductName(name, gender, itemType, size, isFabric);
        const product = await Product.create({
          sku,
          name: productName,
          school: school._id,
          itemType,
          gender,
          stockType: item.stockType,
          size: size || '',
          unit,
          sellingPrice: item.defaultPrice ?? 0,
          costPrice: item.defaultCostPrice ?? 0,
          hsnCode: item.hsnCode || '',
          gstRate: item.gstRate ?? 5,
          currentStock: 0,
          lowStockAlert: 5,
          isActive: true,
        });
        created.push(product);
      }
    }

    res.status(201).json({ count: created.length, products: created });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
