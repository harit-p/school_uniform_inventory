import Counter from '../models/Counter.js';

const COUNTER_ID = 'billNumber';

/**
 * @param {import('mongoose').ClientSession | null | undefined} [session] - When provided (inside a transaction),
 *   counter increment commits with the same transaction so failed bills do not consume numbers.
 */
export async function getNextBillNumber(session) {
  const year = new Date().getFullYear();
  const key = `${COUNTER_ID}_${year}`;
  const updated = await Counter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, ...(session ? { session } : {}) }
  );
  const seq = updated.seq;
  const num = String(seq).padStart(4, '0');
  return `INV-${year}-${num}`;
}
