import Counter from '../models/Counter.js';

const COUNTER_ID = 'billNumber';

export async function getNextBillNumber() {
  const year = new Date().getFullYear();
  const key = `${COUNTER_ID}_${year}`;
  const updated = await Counter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const seq = updated.seq;
  const num = String(seq).padStart(4, '0');
  return `INV-${year}-${num}`;
}
