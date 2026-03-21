import { useHotkeys } from 'react-hotkeys-hook';

const SHORTCUTS = [
  { key: 'F1', action: 'Help / Shortcuts' },
  { key: 'F2', action: 'New Bill (go to Billing)' },
  { key: 'F3', action: 'Focus scan/search (on Billing)' },
  { key: 'F4', action: 'Stock Import' },
  { key: 'F5', action: 'Products' },
  { key: 'F6', action: 'Schools' },
  { key: 'F8', action: 'Bill History' },
  { key: 'F9', action: 'Focus discount field (on Billing)' },
  { key: 'F10', action: 'Focus advance amount (on Billing)' },
  { key: 'F12', action: 'Save & Print Bill' },
  { key: 'Ctrl+S', action: 'Save bill as draft' },
  { key: 'Ctrl+P', action: 'Print current bill' },
  { key: 'Escape', action: 'Close / Cancel' },
];

export default function HelpPanel({ open, onClose }) {
  useHotkeys('escape', (e) => { e?.preventDefault(); onClose(); }, { enableOnFormTags: true }, [onClose]);
  // F1 is handled in GlobalShortcuts (capture phase) so it works when the browser would open Help

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 className="text-lg font-semibold text-slate-800">Keyboard shortcuts</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800"
            aria-label="Close"
          >
            Esc
          </button>
        </div>
        <ul className="mt-3 space-y-2">
          {SHORTCUTS.map(({ key, action }) => (
            <li key={key} className="flex justify-between text-sm">
              <kbd className="rounded bg-slate-100 px-2 py-0.5 font-mono text-slate-700">{key}</kbd>
              <span className="text-slate-600">{action}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500">
          Mac: If F-keys don’t work, hold <kbd className="rounded bg-slate-100 px-1">Fn</kbd> when pressing them, or enable “Use F1, F2, etc. as standard function keys” in System Settings → Keyboard.
        </p>
      </div>
    </div>
  );
}
