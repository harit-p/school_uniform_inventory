import { useNavigate } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';

export default function GlobalShortcuts({ helpOpen, setHelpOpen }) {
  const navigate = useNavigate();

  const formOpts = { enableOnFormTags: false };

  useHotkeys('f1', (e) => { e.preventDefault(); setHelpOpen((v) => !v); }, formOpts, [setHelpOpen]);
  useHotkeys('f2', () => navigate('/billing'), formOpts);
  useHotkeys('f4', () => navigate('/stock/import'), formOpts);
  useHotkeys('f5', () => navigate('/products'), formOpts);
  useHotkeys('f6', () => navigate('/schools'), formOpts);
  useHotkeys('f8', () => navigate('/bills'), formOpts);

  return null;
}
