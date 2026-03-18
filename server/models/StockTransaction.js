import mongoose from 'mongoose';

const stockTransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['import', 'sale', 'return', 'adjustment'],
  },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, default: 0 },
  bill: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill', default: null },
  note: { type: String, default: '' },
  createdBy: { type: String, default: 'system' },
}, {
  timestamps: { createdAt: true, updatedAt: false },
});

stockTransactionSchema.index({ product: 1, createdAt: -1 });
stockTransactionSchema.index({ type: 1, createdAt: -1 });

export default mongoose.model('StockTransaction', stockTransactionSchema);
