import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';

const F_KEYS = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'];

export default function GlobalShortcuts({ helpOpen, setHelpOpen }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Prevent browser/OS from handling F-keys so our shortcuts work on Windows and Mac
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (F_KEYS.includes(e.key)) e.preventDefault();
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  const opts = { enableOnFormTags: true };

  useHotkeys('f1', (e) => { e?.preventDefault(); setHelpOpen((v) => !v); }, opts, [setHelpOpen]);
  useHotkeys('f2', (e) => { e?.preventDefault(); if (location.pathname === '/billing') return; navigate('/billing'); }, opts, [navigate, location.pathname]);
  useHotkeys('f4', (e) => { e?.preventDefault(); navigate('/stock/import'); }, opts, [navigate]);
  useHotkeys('f5', (e) => { e?.preventDefault(); navigate('/products'); }, opts, [navigate]);
  useHotkeys('f6', (e) => { e?.preventDefault(); navigate('/schools'); }, opts, [navigate]);
  useHotkeys('f8', (e) => { e?.preventDefault(); navigate('/bills'); }, opts, [navigate]);

  return null;
}
