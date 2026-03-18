/**
 * SKU format: {SCHOOL_CODE}-{GENDER_CODE}-{ITEM_CODE}-{SIZE}
 * GENDER: B=boys, G=girls, U=unisex
 * ITEM: SHIRT, PANT, SKIRT, etc. (uppercase)
 */
const GENDER_CODE = { boys: 'B', girls: 'G', unisex: 'U' };
const ITEM_MAP = {
  tshirt: 'TSHIRT', shirt: 'SHIRT', pant: 'PANT', skirt: 'SKIRT',
  blazer: 'BLAZER', half_pant: 'HALF_PANT', tie: 'TIE', belt: 'BELT', fabric: 'FABRIC', vest: 'VEST',
};

export function buildSku(schoolCode, gender, itemType, size, isFabric = false) {
  const sc = (schoolCode || 'GENERIC').toString().trim().toUpperCase();
  const g = GENDER_CODE[gender] || 'U';
  const item = ITEM_MAP[itemType] || itemType?.toString().toUpperCase().replace(/\s+/g, '_') || 'ITEM';
  const prefix = isFabric ? `${sc}-FAB-${item}` : `${sc}-${g}-${item}`;
  const s = (size || '').toString().trim().toUpperCase() || (isFabric ? 'M' : '');
  return s ? `${prefix}-${s}` : prefix;
}

export function buildProductName(schoolName, gender, itemType, size, isFabric = false) {
  const g = gender?.charAt(0).toUpperCase() + (gender?.slice(1) || '');
  const item = (itemType || 'item').replace(/_/g, ' ');
  const school = schoolName || 'Generic';
  if (isFabric) return `${school} ${g} ${item} (Fabric)`;
  return size ? `${school} ${g} ${item} Size ${size}` : `${school} ${g} ${item}`;
}
