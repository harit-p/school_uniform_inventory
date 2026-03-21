import mongoose from 'mongoose';

/**
 * Detects MongoDB environments where multi-document transactions are not available
 * (e.g. standalone mongod without replica set).
 */
function isTransactionUnsupported(err) {
  const msg = String(err?.message || '');
  return (
    /replica set/i.test(msg) ||
    /Transaction numbers are only allowed/i.test(msg) ||
    /multi-document transactions are not supported/i.test(msg) ||
    /Transactions are not supported/i.test(msg) ||
    /transaction.*not.*supported/i.test(msg)
  );
}

/**
 * Runs `work(session)` inside a multi-document transaction when the deployment
 * supports it (MongoDB replica set — e.g. Atlas, or local replica set).
 * If transactions are not supported, runs `work(null)` without a transaction
 * (same behaviour as before; single-document $inc updates remain atomic).
 *
 * @param {(session: import('mongoose').ClientSession | null) => Promise<void>} work
 */
export async function withOptionalTransaction(work) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(() => work(session));
  } catch (err) {
    await session.endSession();
    if (isTransactionUnsupported(err)) {
      await work(null);
      return;
    }
    throw err;
  }
  await session.endSession();
}
