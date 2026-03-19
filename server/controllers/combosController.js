import Combo from '../models/Combo.js';
import Product from '../models/Product.js';

export async function listBySchool(req, res) {
  try {
    const combos = await Combo.find({ school: req.params.id }).sort({ name: 1 }).lean();
    res.json(combos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createCombo(req, res) {
  try {
    const combo = await Combo.create({ ...req.body, school: req.params.id });
    res.status(201).json(combo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function getCombo(req, res) {
  try {
    const combo = await Combo.findOne({ _id: req.params.cid, school: req.params.id }).lean();
    if (!combo) return res.status(404).json({ error: 'Combo not found' });
    res.json(combo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateCombo(req, res) {
  try {
    const combo = await Combo.findOneAndUpdate(
      { _id: req.params.cid, school: req.params.id },
      req.body,
      { new: true, runValidators: true }
    ).lean();
    if (!combo) return res.status(404).json({ error: 'Combo not found' });
    res.json(combo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function deleteCombo(req, res) {
  try {
    const result = await Combo.deleteOne({ _id: req.params.cid, school: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Combo not found' });
    res.json({ message: 'Combo deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/** POST /api/combos/match
 * Body: { schoolId?: string, items: [{ productId, quantity }] }
 * Returns: { match: boolean, discountPercent?: number, comboName?: string }
 */
export async function matchCombo(req, res) {
  try {
    const { schoolId, items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.json({ match: false });
    }
    const productIds = [...new Set(items.map((i) => i.productId).filter(Boolean))];
    const products = await Product.find({ _id: { $in: productIds } })
      .select('_id itemType size')
      .lean();
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    const cartKeys = [];
    for (const row of items) {
      const p = productMap.get(row.productId?.toString());
      if (!p) continue;
      const qty = Math.max(0, Number(row.quantity) || 1);
      const type = (p.itemType || '').toString().trim().toLowerCase();
      const sz = (p.size || '').toString().trim().toLowerCase();
      for (let i = 0; i < qty; i++) {
        cartKeys.push(`${type}|${sz}`);
      }
    }
    if (cartKeys.length === 0) return res.json({ match: false });

    const comboFilter = schoolId ? { school: schoolId } : {};
    const combos = await Combo.find(comboFilter).sort({ discountPercent: -1 }).lean();
    if (combos.length === 0) return res.json({ match: false });

    for (const combo of combos) {
      // Each combo item can have a single size or comma-separated sizes (any of them matches)
      const requiredGroups = (combo.items || []).map((it) => {
        const t = (it.itemType || '').toString().trim().toLowerCase();
        const sizeStr = (it.size || '').toString().trim().toLowerCase();
        if (!sizeStr) return [`${t}|`];
        const sizes = sizeStr.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
        if (sizes.length === 0) return [`${t}|`];
        return sizes.map((s) => `${t}|${s}`);
      });
      if (requiredGroups.length === 0) continue;
      const cartCopy = [...cartKeys];
      let matched = true;
      for (const keyGroup of requiredGroups) {
        let found = false;
        for (const reqKey of keyGroup) {
          const idx = cartCopy.indexOf(reqKey);
          if (idx !== -1) {
            cartCopy.splice(idx, 1);
            found = true;
            break;
          }
          if (reqKey.endsWith('|')) {
            const prefix = reqKey.slice(0, -1);
            const anyIdx = cartCopy.findIndex((k) => k.startsWith(prefix + '|'));
            if (anyIdx !== -1) {
              cartCopy.splice(anyIdx, 1);
              found = true;
              break;
            }
          }
        }
        if (!found) {
          matched = false;
          break;
        }
      }
      if (matched) {
        return res.json({
          match: true,
          discountPercent: combo.discountPercent,
          comboName: combo.name,
        });
      }
    }
    res.json({ match: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
