import mongoose from 'mongoose';

const presetItemSchema = new mongoose.Schema({
  itemType: {
    type: String,
    required: true,
    enum: ['tshirt', 'shirt', 'pant', 'skirt', 'blazer', 'half_pant', 'tie', 'belt', 'fabric', 'vest'],
  },
  gender: { type: String, required: true, enum: ['boys', 'girls', 'unisex'] },
  stockType: { type: String, required: true, enum: ['readymade', 'fabric'] },
  sizes: [{ type: String }],
  unit: { type: String, default: 'meters' },
  defaultPrice: { type: Number, required: true, default: 0 },
  defaultCostPrice: { type: Number, default: 0 },
  hsnCode: { type: String, default: '' },
  gstRate: { type: Number, required: true, enum: [5, 12] },
}, { _id: true });

const uniformPresetSchema = new mongoose.Schema({
  label: { type: String, required: true },
  classRange: {
    from: { type: Number, required: true },
    to: { type: Number, required: true },
  },
  items: [presetItemSchema],
}, { _id: true });

const schoolSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, trim: true, uppercase: true },
  address: { type: String, default: '' },
  contactPerson: { type: String, default: '' },
  phone: { type: String, default: '' },
  uniformPresets: [uniformPresetSchema],
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

schoolSchema.index({ code: 1 }, { unique: true });

export default mongoose.model('School', schoolSchema);
