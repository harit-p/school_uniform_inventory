# School Uniform Inventory Management System — PRD v1.0

**Document Version:** 1.0  
**Date:** March 14, 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Database Schema](#3-database-schema)
4. [Module Breakdown](#4-module-breakdown)
   - 4.1 [School & Uniform Preset Management](#41-school--uniform-preset-management)
   - 4.2 [Product & Stock Management](#42-product--stock-management)
   - 4.3 [Stock Import Module](#43-stock-import-module)
   - 4.4 [Sales & Billing Module](#44-sales--billing-module)
   - 4.5 [Barcode / Product Lookup](#45-barcode--product-lookup)
5. [GST Billing — Indian Tax Compliance](#5-gst-billing--indian-tax-compliance)
6. [Keyboard Shortcuts](#6-keyboard-shortcuts)
7. [UI/UX Principles — Desktop-Native Feel](#7-uiux-principles--desktop-native-feel)
8. [MVP Scope & Sprint Plan](#8-mvp-scope--sprint-plan)
9. [Out of Scope for MVP](#9-out-of-scope-for-mvp)
10. [Suggestions & Recommendations](#10-suggestions--recommendations)
11. [Open Questions](#11-open-questions)

---

## 1. Project Overview

A **web application** (Vite + React, Electron-ready) to help a school uniform retail shop manage:

- School-specific uniform catalogues with predefined item structures
- Real-time inventory tracking (stock in / stock out)
- GST-compliant billing with barcode scan support
- Fast keyboard-driven operations mimicking a native desktop POS system

**Reference Business:** Shri Hari Vastra Bhandar, Surat, Gujarat  
**GST Number (Sample from bill):** 24BHLPS3092M1Z0  
**Primary Users:** Shop owner / billing staff

---

## 2. Tech Stack

| Layer             | Technology                               | Notes                                                    |
| ----------------- | ---------------------------------------- | -------------------------------------------------------- |
| Frontend          | Vite + React                             | Fast dev server; easy Electron wrapper later             |
| State Management  | Zustand                                  | Lightweight, no boilerplate — better than Redux for MVP  |
| UI Components     | shadcn/ui + Tailwind CSS                 | Clean, accessible, keyboard-friendly                     |
| Backend           | Node.js + Express                        | REST API                                                 |
| Database          | MongoDB + Mongoose                       | Flexible schema for school presets                       |
| PDF Generation    | @react-pdf/renderer or pdfmake           | For GST bill printing                                    |
| Barcode (MVP)     | Keyboard wedge simulation via text input | Real scanner = USB HID, works as keyboard out of the box |
| Packaging (later) | Electron.js                              | Wraps the Vite/React app for desktop distribution        |

### Project Structure (Recommended)

```
/
├── client/                  # Vite + React
│   ├── src/
│   │   ├── modules/
│   │   │   ├── schools/
│   │   │   ├── products/
│   │   │   ├── stock/
│   │   │   ├── billing/
│   │   │   └── reports/
│   │   ├── components/      # Shared UI components
│   │   ├── hooks/           # Custom hooks (keyboard shortcuts, etc.)
│   │   ├── store/           # Zustand stores
│   │   └── utils/
├── server/                  # Express API
│   ├── models/              # Mongoose schemas
│   ├── routes/
│   ├── controllers/
│   └── middleware/
└── shared/                  # Types, constants shared between client/server
```

---

## 3. Database Schema

### 3.1 School

```js
{
  _id: ObjectId,
  name: String,                         // e.g. "Delhi Public School"
  code: String,                         // Short code e.g. "DPS" — used in barcode IDs
  address: String,
  contactPerson: String,
  phone: String,
  uniformPresets: [UniformPreset],      // Embedded array — see below
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### 3.2 UniformPreset (Embedded in School)

A preset defines what uniform items exist for a class group in a school.

```js
{
  _id: ObjectId,
  label: String,               // e.g. "Class 1-5", "Class 6-12", "Sports"
  classRange: {
    from: Number,              // 1
    to: Number                 // 5
  },
  items: [PresetItem]
}

PresetItem {
  itemType: String,            // "tshirt" | "shirt" | "pant" | "skirt" | "blazer" | "half_pant" | "tie" | "belt" | "fabric"
  gender: String,              // "boys" | "girls" | "unisex"
  stockType: "readymade" | "fabric",

  // If readymade — sizes like S, M, L, XL or numeric (18, 20, 22...)
  sizes: [String],             // e.g. ["18", "20", "22", "24", "26", "28", "30"] or ["S", "M", "L", "XL"]

  // If fabric — sold per meter
  unit: "meters",              // Only relevant when stockType = "fabric"

  defaultPrice: Number,        // Default selling price
  defaultCostPrice: Number,    // Purchase price (for margin reports)
  hsnCode: String,             // HSN code for GST (textile: 6203, 6204 etc.)
  gstRate: Number,             // 5 | 12 (percent) — most school uniform textile is 5% or 12%
}
```

### 3.3 Product

Each unique SKU in inventory. Products are linked to a school preset item or can be standalone.

```js
{
  _id: ObjectId,
  sku: String,                 // Auto-generated unique ID — also used as barcode substitute
                               // Format: {SCHOOL_CODE}-{ITEM_TYPE}-{SIZE}-{RANDOM4}
                               // Example: DPS-SHIRT-20-A4F2
  name: String,                // Display name e.g. "DPS Boys Shirt Size 20"
  school: ObjectId,            // Ref: School (null for generic items)
  itemType: String,
  gender: String,
  stockType: "readymade" | "fabric",
  size: String,                // For readymade
  unit: "piece" | "meters",    // For fabric
  sellingPrice: Number,
  costPrice: Number,
  hsnCode: String,
  gstRate: Number,             // 5 or 12
  currentStock: Number,        // Live stock (pieces or meters)
  lowStockAlert: Number,       // Alert threshold (default: 5)
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

> **Developer Note:** The `sku` field acts as the barcode value. During MVP, typing or pasting the SKU in the billing search box simulates a barcode scan. When a real USB barcode scanner is connected, it sends keystrokes ending in Enter — the same input field will capture it automatically. No extra code needed for real scanner support.

### 3.4 StockTransaction

Every inventory movement — import or sale — is recorded here. Source of truth for stock levels.

```js
{
  _id: ObjectId,
  type: "import" | "sale" | "return" | "adjustment",
  product: ObjectId,           // Ref: Product
  quantity: Number,            // Positive for import/return, negative for sale
  unitPrice: Number,           // Price at time of transaction
  bill: ObjectId,              // Ref: Bill (only for sale type)
  note: String,
  createdBy: String,           // User/staff name (auth is out of MVP scope)
  createdAt: Date
}
```

### 3.5 Bill

```js
{
  _id: ObjectId,
  billNumber: String,          // Auto-generated: "INV-2026-0001" (sequential)
  billDate: Date,
  customer: {
    name: String,              // Default: "CASH CUSTOMER"
    phone: String,
    school: ObjectId,          // Optional — if buying for specific school
    class: String,
  },
  items: [BillItem],
  subtotal: Number,
  totalCgst: Number,
  totalSgst: Number,
  totalTax: Number,
  totalAmount: Number,         // subtotal + totalTax - discount
  discount: Number,
  discountPercent: Number,
  roundOff: Number,
  finalAmount: Number,
  paymentMode: "cash" | "upi" | "card" | "credit",
  amountPaid: Number,
  amountPending: Number,
  status: "paid" | "partial" | "pending",
  notes: String,
  createdAt: Date,
  updatedAt: Date
}

BillItem {
  product: ObjectId,
  sku: String,                 // Denormalized for bill history
  name: String,                // Denormalized
  quantity: Number,
  unitPrice: Number,
  discount: Number,
  taxableAmount: Number,
  cgst: Number,
  sgst: Number,
  totalAmount: Number,
  hsnCode: String,
  gstRate: Number
}
```

---

## 4. Module Breakdown

### 4.1 School & Uniform Preset Management

**Route:** `/schools`

**Purpose:** Define schools and their standard uniform structures so billing staff can quickly look up what a student needs by selecting school + class.

#### Features

- **School List** — CRUD (Create, Read, Update, Delete) schools
- **Preset Builder** — For each school, define class group presets:
  - Class range (e.g., 1–5, 6–8, 9–12)
  - Items in that range (Shirt, Pant, Skirt, T-Shirt, Half Pant, Blazer, Tie, Belt)
  - Per item: gender, stock type (readymade/fabric), available sizes, default price, HSN, GST rate
- **Quick Clone** — Clone an existing school's presets to set up a new school faster

#### Sample Presets from Client Photos

From the handwritten notebook (Image 2), the client tracks:

| Section                                     | Shirt Sizes                | Pant/Skirt Sizes                                      | Notes                       |
| ------------------------------------------- | -------------------------- | ----------------------------------------------------- | --------------------------- |
| Gujarati Medium (likely Std 1–5 or similar) | 20, 22, 24, 26, 28, 30     | 13, 14, 15, 16, 17, 18 (skirt) & Half Pant same sizes | 3 Medium                    |
| 2 to 4 (likely class 2–4)                   | 18, 20, 22, 24, 26         | 26/20, 28/22, 30/23, 32/24, 34/25, 34/26              | Regular (Reg. A)            |
| 5 to 8                                      | 18, 20, 22, 23, 24, 25, 26 | Boys Coti (21–26), Girls Coti (21–26)                 | Int. Coti: CNG + Eng + CBSE |

This means the system needs to support **multiple sub-categories per school** (section/medium-wise if a school runs multiple boards like CNG, English Medium, CBSE).

#### API Endpoints

```
GET    /api/schools                     List all schools
POST   /api/schools                     Create school
GET    /api/schools/:id                 Get school with presets
PUT    /api/schools/:id                 Update school
DELETE /api/schools/:id                 Soft delete school

POST   /api/schools/:id/presets         Add preset to school
PUT    /api/schools/:id/presets/:pid    Update preset
DELETE /api/schools/:id/presets/:pid    Delete preset
```

---

### 4.2 Product & Stock Management

**Route:** `/products`

**Purpose:** Manage the master catalogue of all physical items in inventory.

#### Features

- **Product List** — Searchable, filterable by school / item type / size / stock type
- **Quick Create from Preset** — When a preset is defined for a school, system generates product records for all size variants automatically (e.g., creating DPS Boys Shirt preset sizes 18–30 creates 7 product records)
- **Stock Level Indicator** — Visual badge: Green (ok) / Yellow (low stock) / Red (out of stock)
- **SKU / Barcode Display** — Show the auto-generated SKU with a copyable barcode-style display
- **Product Edit** — Update price, low stock threshold, HSN, GST rate

#### SKU Generation Logic

```
Format: {SCHOOL_CODE}-{GENDER_CODE}-{ITEM_CODE}-{SIZE}
Example: DPS-B-SHIRT-20   → DPS Boys Shirt Size 20
         RPS-G-SKIRT-14   → RPS Girls Skirt Size 14
         GENERIC-FAB-BLAZER-M → Generic Fabric Blazer Medium
```

For MVP, keep this simple. The SKU is the "barcode value."

#### API Endpoints

```
GET    /api/products                    List (with filters: school, type, size, stockType)
POST   /api/products                    Create product
GET    /api/products/:id                Get single product
PUT    /api/products/:id                Update product
DELETE /api/products/:id                Soft delete

GET    /api/products/search?q=          Search by name/SKU (used by barcode scan input)
POST   /api/products/bulk-create        Create products from a school preset (batch)
```

---

### 4.3 Stock Import Module

**Route:** `/stock/import`

**Purpose:** Record incoming stock from suppliers / wholesalers and update inventory.

#### Features

- **Import Entry Form** — Select product (by name or SKU scan), enter quantity and cost price
- **Bulk Import** — Add multiple products in one session before confirming
- **Import History** — List past import transactions with date, product, quantity, value
- **Stock Adjustment** — Allow manual correction with a reason note (e.g., "Damaged goods removed")
- **Supplier Notes** — Optional free-text field for supplier / invoice reference

#### Import Flow (UI)

```
1. User opens Stock Import page
2. Types/scans SKU in search box → product auto-fills
3. Enters quantity + cost price (pre-filled with last cost price)
4. Clicks "Add to Import List" or presses Enter
5. Repeat for more items
6. Clicks "Confirm Import" → all stock quantities update, transactions logged
```

#### API Endpoints

```
GET    /api/stock/transactions          List transactions (filter by type, date, product)
POST   /api/stock/import                Record a stock import (single or batch)
POST   /api/stock/adjustment            Record a stock adjustment
GET    /api/stock/summary               Current stock levels summary
GET    /api/stock/low-stock             Products below low stock threshold
```

---

### 4.4 Sales & Billing Module

**Route:** `/billing`

**Purpose:** Create GST-compliant bills. This is the most-used screen — must be fast and keyboard-driven.

#### Bill Creation Flow

```
1. Press F2 (or Ctrl+N) to start new bill
2. Optional: Select School → Class (pre-filters product suggestions)
3. In barcode/product search field:
   a. Type SKU (or scan barcode) → product auto-fills into bill line
   b. OR: Type product name → dropdown appears → select with arrow keys + Enter
4. Set quantity (default: 1), price auto-fills from product default
5. Press Enter to add line → cursor jumps back to search field
6. Repeat for each item
7. Press F10 to go to Payment section
8. Enter payment mode + amount received
9. Press F12 (or Enter on "Save") → Bill saved, print dialog opens
10. Print or press Esc to skip printing
```

#### Bill Line Item Calculations

```
Taxable Amount = Quantity × Unit Price
CGST = Taxable Amount × (GST Rate / 2) / 100
SGST = Taxable Amount × (GST Rate / 2) / 100
Line Total = Taxable Amount + CGST + SGST

Bill Total = Sum of all Line Totals
Round Off = Round(Bill Total) - Bill Total
Final Amount = Bill Total + Round Off
```

> **GST Note:** Since the shop is in Gujarat and selling within Gujarat, both CGST and SGST apply (each at half the GST rate). IGST would apply only for inter-state sales (not in scope for MVP).

#### Key UI Behaviours

- **Customer Name** defaults to "CASH CUSTOMER" — editable
- **Bill number** auto-generated, non-editable
- **Delete a line** — Select row + Delete key
- **Edit line quantity** — Click or Tab to quantity field
- **Discount** — Per-line discount OR bill-level discount percent field
- **Hold Bill** — Save as draft, retrieve later (useful if customer goes to get more items)

#### API Endpoints

```
GET    /api/bills                        List bills (filter by date, status, customer)
POST   /api/bills                        Create bill (also deducts stock via transaction)
GET    /api/bills/:id                    Get bill details
PUT    /api/bills/:id                    Update bill (only drafts or pending)
GET    /api/bills/:id/pdf                Generate & return bill PDF
GET    /api/bills/next-number            Get next bill number preview
```

---

### 4.5 Barcode / Product Lookup

For MVP, barcode scanning is simulated via keyboard input.

#### How Real USB Barcode Scanners Work

USB barcode scanners act as a **keyboard HID device**. When a barcode is scanned, the scanner types the barcode value + presses Enter. This means:

- The product search input on the billing screen just needs to listen for Enter after text input
- When Enter is received and the input matches exactly one product SKU, auto-add to bill
- When Enter is received and input partially matches, show dropdown
- **No extra library needed for real scanner support — it works out of the box**

#### MVP Simulation

Add a **"🔍 Scan / Search"** input at the top of the bill. The developer can:

1. Type a full SKU and press Enter to simulate a scan
2. Type partial text to get a dropdown search

This exact behaviour works with a real scanner in production.

---

## 5. GST Billing — Indian Tax Compliance

### Bill Header Requirements (from sample bill)

| Field       | Value / Source                                                            |
| ----------- | ------------------------------------------------------------------------- |
| Shop Name   | Shri Hari Vastra Bhandar                                                  |
| Address     | Ashadeep S to 8 / A/B/40, 1PANT(12)HLLP5/1LC071 (as per GST registration) |
| GST Number  | 24BHLPS3092M1Z0                                                           |
| State       | Gujarat — Code 24                                                         |
| Bill Title  | TAX INVOICE                                                               |
| Bill Number | Sequential (e.g., INV-2026-0001)                                          |
| Bill Date   | Date of sale                                                              |

### Bill Line Item Columns (from sample bill)

| Column           | Description            |
| ---------------- | ---------------------- |
| No.              | Serial number          |
| Item Description | Product name           |
| Qty              | Quantity               |
| Rate             | Unit price (excl. tax) |
| Amount           | Qty × Rate             |
| CGST % + Amount  | e.g., 2.50%            |
| SGST % + Amount  | e.g., 2.50%            |
| Total Amount     | Including tax          |

### Footer

| Field          | Notes                                     |
| -------------- | ----------------------------------------- |
| Total in Words | "One Thousand Six Hundred Fifty One Only" |
| Subtotal       |                                           |
| CGST Total     |                                           |
| SGST Total     |                                           |
| Discount       |                                           |
| Round Off      |                                           |
| **Net Amount** |                                           |
| Advance        |                                           |
| Total Pending  |                                           |

### Common HSN Codes for School Uniforms

| Item                      | HSN Code    | GST Rate                               |
| ------------------------- | ----------- | -------------------------------------- |
| Shirts, T-Shirts, Blouses | 6205 / 6206 | 5% (if ≤ ₹1000 MRP) / 12% (if > ₹1000) |
| Trousers, Pants, Skirts   | 6203 / 6204 | 5% / 12%                               |
| Blazers, Jackets          | 6203        | 12%                                    |
| Fabric (by meter)         | 5208 / 5513 | 5%                                     |
| Ties, Belts (accessories) | 6217        | 12%                                    |

> **Developer Note:** For simplicity in MVP, store `gstRate` per product (5 or 12). The system does not need to auto-calculate based on MRP threshold for MVP — staff will set correct rate during product setup.

### PDF Bill Generation

Use `pdfmake` or `@react-pdf/renderer`. The bill should closely match the format in the sample photo:

- Shop letterhead at top
- GST details
- Item table with HSN column
- Tax summary at bottom
- Amount in words (use `num2words` npm package for Indian numbering)
- Declaration text: "Goods once sold will not be taken back" (customisable)

---

## 6. Keyboard Shortcuts

This is critical for a fast billing experience. Implement a global keyboard shortcut system using a custom `useKeyboardShortcut` hook.

### Global Shortcuts

| Shortcut | Action                               |
| -------- | ------------------------------------ |
| `F1`     | Open Help / Shortcut reference       |
| `F2`     | New Bill                             |
| `F3`     | Focus product search/scan input      |
| `F4`     | Open Stock Import                    |
| `F5`     | Open Product List                    |
| `F6`     | Open School Management               |
| `F8`     | Open Bill History                    |
| `F10`    | Move to Payment section (in billing) |
| `F12`    | Save & Print Bill                    |
| `Ctrl+S` | Save current bill as draft           |
| `Ctrl+P` | Print current bill                   |
| `Escape` | Cancel / Close modal                 |

### Billing Screen Shortcuts

| Shortcut                   | Action                                        |
| -------------------------- | --------------------------------------------- |
| `Enter` (in scan field)    | Add scanned/typed product to bill             |
| `↑ / ↓`                    | Navigate product dropdown                     |
| `Delete` (on selected row) | Remove bill line item                         |
| `Tab`                      | Move between Qty / Price / Discount in a line |
| `Ctrl+D`                   | Apply bill-level discount                     |
| `Ctrl+Z`                   | Undo last added item                          |

### Stock Import Shortcuts

| Shortcut                | Action                             |
| ----------------------- | ---------------------------------- |
| `Enter` (in scan field) | Add product to import list         |
| `Ctrl+Enter`            | Confirm & save entire import batch |

### Implementation Note

```js
// Custom hook example
function useKeyboardShortcut(key, callback, deps = []) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === key && /* modifier check */) {
        e.preventDefault();
        callback(e);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, deps);
}
```

Use a library like `react-hotkeys-hook` to simplify this — it handles edge cases like inputs capturing keys.

---

## 7. UI/UX Principles — Desktop-Native Feel

### Core Principles

1. **Keyboard-first** — Every critical action must be reachable without a mouse
2. **Dense layout** — Show more data per screen (not card-heavy like a mobile app)
3. **No page reloads** — Single-page app with instant navigation
4. **Status always visible** — Current stock, bill total, and keyboard hints always on screen
5. **Fast feedback** — Optimistic UI updates; don't wait for API to update the table

### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│ SIDEBAR          │  MAIN CONTENT AREA                   │
│                  │                                       │
│ [F2] New Bill    │  Module-specific content here        │
│ [F4] Stock Import│                                       │
│ [F5] Products    │                                       │
│ [F6] Schools     │                                       │
│ [F8] Bills       │                                       │
│                  │                                       │
│ Low Stock: 3 ⚠️  │                                       │
└─────────────────────────────────────────────────────────┘
│ Status Bar: Bill #INV-2026-0041 | Items: 3 | Total: ₹1,650 │
└─────────────────────────────────────────────────────────────┘
```

### Billing Screen Layout

```
┌──────────────────────────────────────────────────┐
│ NEW BILL [F2]         Bill No: INV-2026-0041      │
│ Customer: CASH CUSTOMER  School: [dropdown]        │
├──────────────────────────────────────────────────┤
│ 🔍 Scan / Search Product: [_______________] [F3]  │
├──────────────────────────────────────────────────┤
│ # │ Item           │ Qty │ Rate  │ GST │ Total    │
│ 1 │ DPS Boys Shirt │  1  │ 350   │ 5%  │ 367.50   │
│ 2 │ DPS Boys Pant  │  1  │ 450   │ 5%  │ 472.50   │
├──────────────────────────────────────────────────┤
│             Subtotal:  800.00                     │
│             CGST (2.5%): 20.00                   │
│             SGST (2.5%): 20.00                   │
│             Discount:   0.00                     │
│             Round Off: +0.00                     │
│             TOTAL:   ₹840.00                     │
├──────────────────────────────────────────────────┤
│ Payment: [Cash▼]  Amount: [_____]  [F12 Save & Print] │
└──────────────────────────────────────────────────┘
```

---

## 8. MVP Scope & Sprint Plan

### Goal: Working MVP by Thursday March 19, 2026

| Day             | Tasks                                                                          | Deliverable                                |
| --------------- | ------------------------------------------------------------------------------ | ------------------------------------------ |
| **Day 1 (Sat)** | Project setup: Vite+React, Express, MongoDB, folder structure, Mongoose models | Running skeleton app with DB connected     |
| **Day 2 (Sun)** | School & Preset Management module: CRUD APIs + UI                              | Add/edit schools and their uniform presets |
| **Day 3 (Mon)** | Product module: List, Create from preset, SKU generation, stock levels         | Product catalogue working                  |
| **Day 3 (Mon)** | Stock Import module: Import form, batch entry, transaction log                 | Stock import working                       |
| **Day 4 (Tue)** | Billing screen: Line item entry, barcode simulation, calculations              | Bill creation working                      |
| **Day 4 (Tue)** | GST PDF generation: Bill format matching sample invoice                        | Printable GST bill                         |
| **Day 5 (Wed)** | Keyboard shortcuts, status bar, low-stock alerts, quick fixes                  | Full keyboard-driven experience            |
| **Day 5 (Wed)** | Bill history, search, basic dashboard (stock summary)                          | End-to-end usable MVP                      |
| **Day 6 (Thu)** | Testing, bug fixes, client demo                                                | **MVP Demo Ready**                         |

### MVP Must-Have Features (P0)

- [x] School preset management
- [x] Product catalogue with SKU
- [x] Stock import with batch entry
- [x] Billing with barcode simulation (SKU lookup)
- [x] GST bill PDF generation
- [x] Real-time stock deduction on billing
- [x] Keyboard shortcuts (F2, F3, F10, F12, Enter for scan)
- [x] Bill history list

### MVP Should-Have Features (P1 — include if time permits)

- [ ] Low stock alerts sidebar widget
- [ ] Bill draft / hold feature
- [ ] Customer name + phone on bill
- [ ] Payment status (paid / pending)
- [ ] Basic stock summary dashboard

### Explicitly NOT in MVP (P2)

- User authentication / login
- Multi-user / role management
- Advanced reports & analytics
- SMS / WhatsApp bill sharing
- Supplier management
- Customer loyalty / account management
- Electron packaging

---

## 9. Out of Scope for MVP

The following are intentionally excluded to meet the Thursday deadline:

1. **Authentication** — No login required for MVP; add in v1.1
2. **Multiple shop locations** — Single shop only
3. **Electron packaging** — Run in browser for MVP, package later
4. **Advanced reporting** — Daily sales report, profit margins — post-MVP
5. **WhatsApp/SMS integration** — Bill sharing via mobile — post-MVP
6. **Barcode label printing** — Print barcode stickers for products — post-MVP
7. **Supplier management** — Vendor database, POs — post-MVP
8. **Customer accounts** — Credit tracking per customer — post-MVP

---

## 10. Suggestions & Recommendations

### Product Suggestions

1. **Electron-readiness from Day 1:** Structure the React app so all API calls go through an abstraction layer (`src/api/`). This makes it easy to swap to Electron's IPC or a local Express server later without refactoring components.

2. **SKU Design is Critical:** Invest time on Day 1 getting the SKU format right. Once bills are generated with a SKU, changing the format is painful. Suggested format: `{SCHOOL_CODE}-{GENDER}-{ITEM}-{SIZE}` (all uppercase, no spaces).

3. **HSN Code Defaults:** Pre-seed the database with common HSN codes and their GST rates for school uniforms. This saves billing staff from having to know HSN codes.

4. **Bill Number Format:** Use `INV-YYYY-NNNN` (e.g., `INV-2026-0001`). Store the current counter in a separate `Counters` collection in MongoDB for safe atomic increment (`findOneAndUpdate` with `$inc`).

5. **Keyboard Shortcut Cheat Sheet:** Add an always-visible (collapsed by default) shortcut reference panel, toggled by `F1`. This dramatically reduces staff training time.

6. **Preset Quick-Fill in Billing:** When a customer selects School + Class during billing, show a one-click "Add Full Uniform Set" button that adds all required items for that class at once. Staff only needs to adjust sizes. This would be the single biggest speed improvement for billing.

7. **Offline Resilience (post-MVP):** Since this runs as a desktop app eventually, consider IndexedDB or SQLite (via Electron) as a fallback for offline billing. For the web MVP this isn't needed.

8. **Fabric Products:** For fabric sold by the meter, the quantity field should accept decimals (e.g., 2.5 meters). The `unit` field on the product distinguishes pieces vs. meters.

9. **Rounding:** Indian billing typically rounds to the nearest rupee. Implement `Math.round()` on final amount and show the round-off amount separately on the bill (as seen in the sample bill).

10. **Backup Warning:** Even for MVP, add a one-click MongoDB export/download option so the client can take a daily backup. Data loss in a billing system is catastrophic.

### Tech Suggestions

- Use **React Query (TanStack Query)** for server state — handles caching, loading states, and re-fetching without manual `useEffect` chains
- Use **react-hotkeys-hook** instead of manual `addEventListener` — much cleaner
- Use **`num2words`** npm package for amount-in-words (Indian number system: lakhs/crores)
- Use **`pdfmake`** for bill PDF — easier to template than `@react-pdf/renderer` for tabular data

---
