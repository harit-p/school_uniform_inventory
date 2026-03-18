/**
 * Shared constants and type hints (JSDoc) for client/server.
 * For strict TypeScript later, migrate to shared/types.ts
 */

export const ITEM_TYPES = [
  'tshirt', 'shirt', 'pant', 'skirt', 'blazer', 'half_pant', 'tie', 'belt', 'fabric', 'vest'
];

export const GENDERS = ['boys', 'girls', 'unisex'];

export const STOCK_TYPES = ['readymade', 'fabric'];

export const UNITS = ['piece', 'meters'];

export const GST_RATES = [5, 12];

export const PAYMENT_MODES = ['cash', 'upi', 'card', 'credit'];

export const BILL_STATUSES = ['paid', 'partial', 'pending'];

export const TRANSACTION_TYPES = ['import', 'sale', 'return', 'adjustment'];
