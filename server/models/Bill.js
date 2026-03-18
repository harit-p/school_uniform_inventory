import mongoose from 'mongoose';

const billItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  sku: { type: String, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0.001 },
  unitPrice: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  taxableAmount: { type: Number, required: true },
  cgst: { type: Number, required: true },
  sgst: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  hsnCode: { type: String, default: '' },
  gstRate: { type: Number, required: true },
}, { _id: true });

const billSchema = new mongoose.Schema({
  billNumber: { type: String, required: true, unique: true },
  billDate: { type: Date, default: Date.now },
  customer: {
    name: { type: String, default: 'CASH CUSTOMER' },
    phone: { type: String, default: '' },
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', default: null },
    class: { type: String, default: '' },
  },
  items: [billItemSchema],
  subtotal: { type: Number, required: true, default: 0 },
  totalCgst: { type: Number, default: 0 },
  totalSgst: { type: Number, default: 0 },
  totalTax: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true, default: 0 },
  discount: { type: Number, default: 0 },
  discountPercent: { type: Number, default: 0 },
  roundOff: { type: Number, default: 0 },
  finalAmount: { type: Number, required: true, default: 0 },
  paymentMode: { type: String, enum: ['cash', 'upi', 'card', 'credit'], default: 'cash' },
  amountPaid: { type: Number, default: 0 },
  amountPending: { type: Number, default: 0 },
  status: { type: String, enum: ['paid', 'partial', 'pending'], default: 'pending' },
  notes: { type: String, default: '' },
}, {
  timestamps: true,
});

billSchema.index({ billDate: -1 });
billSchema.index({ status: 1 });

export default mongoose.model('Bill', billSchema);
