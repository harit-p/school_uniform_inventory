import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';

const F_KEYS = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'];

function isF1Key(e) {
  return e.key === 'F1' || e.code === 'F1' || e.code === 'Help';
}

export default function GlobalShortcuts({ setHelpOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const setHelpOpenRef = useRef(setHelpOpen);
  setHelpOpenRef.current = setHelpOpen;

  // Capture phase: block browser F1 (help) / other F-keys and handle F1 here — react-hotkeys often never receives F1.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isF1Key(e)) {
        e.preventDefault();
        e.stopPropagation();
        setHelpOpenRef.current((v) => !v);
        return;
      }
      if (F_KEYS.includes(e.key)) e.preventDefault();
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  const opts = { enableOnFormTags: true };
  useHotkeys('f2', (e) => { e?.preventDefault(); if (location.pathname === '/billing') return; navigate('/billing'); }, opts, [navigate, location.pathname]);
  useHotkeys('f4', (e) => { e?.preventDefault(); navigate('/stock/import'); }, opts, [navigate]);
  useHotkeys('f5', (e) => { e?.preventDefault(); navigate('/products'); }, opts, [navigate]);
  useHotkeys('f6', (e) => { e?.preventDefault(); navigate('/schools'); }, opts, [navigate]);
  useHotkeys('f8', (e) => { e?.preventDefault(); navigate('/bills'); }, opts, [navigate]);

  return null;
}
