import mongoose from 'mongoose';

const comboItemSchema = new mongoose.Schema({
  itemType: {
    type: String,
    required: true,
    enum: ['tshirt', 'shirt', 'pant', 'skirt', 'blazer', 'half_pant', 'tie', 'belt', 'fabric', 'vest'],
  },
  size: { type: String, default: '' },
}, { _id: true });

const comboSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  name: { type: String, required: true },
  items: [comboItemSchema],
  discountPercent: { type: Number, required: true, min: 0, max: 100 },
}, {
  timestamps: true,
});

comboSchema.index({ school: 1 });

export default mongoose.model('Combo', comboSchema);
