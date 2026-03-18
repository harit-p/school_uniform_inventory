import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
  name: { type: String, required: true },
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', default: null },
  itemType: { type: String, required: true },
  gender: { type: String, required: true, enum: ['boys', 'girls', 'unisex'] },
  stockType: { type: String, required: true, enum: ['readymade', 'fabric'] },
  size: { type: String, default: '' },
  unit: { type: String, required: true, enum: ['piece', 'meters'], default: 'piece' },
  sellingPrice: { type: Number, required: true, default: 0 },
  costPrice: { type: Number, default: 0 },
  hsnCode: { type: String, default: '' },
  gstRate: { type: Number, required: true, enum: [5, 12] },
  currentStock: { type: Number, default: 0 },
  lowStockAlert: { type: Number, default: 5 },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

productSchema.index({ school: 1, itemType: 1, size: 1 });
productSchema.index({ sku: 'text', name: 'text' });

export default mongoose.model('Product', productSchema);
