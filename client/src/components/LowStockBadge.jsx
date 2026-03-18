import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { lowStock } from '../api/stock';

export default function LowStockBadge() {
  const [count, setCount] = useState(null);

  useEffect(() => {
    lowStock()
      .then((list) => setCount(list.length))
      .catch(() => setCount(0));
  }, []);

  if (count === null || count === 0) return null;

  return (
    <Link
      to="/products"
      className="flex items-center gap-1 rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-200"
      title="View low stock products"
    >
      Low stock: {count} ⚠️
    </Link>
  );
}
