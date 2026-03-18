# Billing UI — Desktop App Feel (Not SaaS)

When building the billing section, follow these so it feels like a **desktop POS / invoice app**, not a typical SaaS web app.

---

## 1. Layout

- **Single main area**: One billing “window” — header + scan bar + items table + totals + payment. No dashboard cards or marketing blocks.
- **Dense**: Fit bill header, line items, totals, and payment on one view with minimal scroll. More rows visible; compact padding.
- **Sidebar** (optional for billing route): Narrow left rail with shortcut labels (e.g. `[F2] New Bill`, `[F4] Stock`, `[F8] Bills`) and low-stock count — like a desktop app menu, not a SaaS nav.
- **Status bar**: Fixed bottom strip showing **Bill #**, **Items: N**, **Total: ₹X,XXX** and shortcut hints. Always visible.

---

## 2. Visual Style (Avoid SaaS Look)

| Avoid (SaaS) | Prefer (Desktop app) |
|--------------|----------------------|
| Large rounded cards, hero sections | Plain panels with light borders |
| Gradient headers, marketing CTAs | Flat header: “New Bill”, Bill No, Customer |
| Big spacing, lots of whitespace | Tighter spacing, table-dominated layout |
| Centered “empty state” illustrations | Simple “No items. Scan to add.” text |
| Floating action buttons | Inline buttons (e.g. “Save & Print” in payment row) |
| Rounded corners everywhere | Subtle corners; table and inputs feel native |

- **Colors**: Neutral (grays, white background). Use one accent (e.g. dark slate/green) for primary actions only.
- **Typography**: Clear, readable; no decorative fonts. Monospace for SKU/bill number.
- **Borders**: Light `1px` borders (e.g. `#e2e8f0`) to define sections, like native windows.

---

## 3. Behaviour

- **Keyboard-first**: Scan/search always focusable (F3). Enter adds line; Tab between qty/rate; Delete removes line; F10 → payment; F12 Save & Print.
- **Scan bar prominent**: One clear “Scan / Search” input at top; no competing inputs. Works like a barcode wedge (type + Enter).
- **Table as focus**: Line items in a simple table (No., Item, Qty, Rate, GST, Total). No cards per line.
- **Totals always visible**: Subtotal, CGST, SGST, discount, round-off, **TOTAL** in a compact block (sidebar or below table), not hidden in a modal.

---

## 4. Reference

- **PRD**: §7 UI/UX Principles — Desktop-Native Feel; §4.4 Billing layout (ASCII mockup).
- **Mental model**: Desktop POS (e.g. Tally, local billing software), not Stripe or Shopify admin.

---

Use this doc when implementing `/billing` and any billing-related components.
