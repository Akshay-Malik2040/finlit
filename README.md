# 🏠 FinLit V2 — Production-Ready Flatmate Expense & Bill-Splitting Platform

> **Spend. Split. Forget.**  
> The fastest, most secure way for flatmates to track shared expenses, schedule recurring bills, export financial reports, and settle debts without passwords, spreadsheets, or manual math.

![FinLit V2](https://img.shields.io/badge/FinLit-V2.0_Production-emerald?style=for-the-badge)
![Mobile First](https://img.shields.io/badge/Client-React_Native_--_Vite-blue?style=for-the-badge)
![Android Widget](https://img.shields.io/badge/Android-Native_AppWidget-3DDC84?style=for-the-badge)
![PDF Export](https://img.shields.io/badge/Reports-PDF_Statement_Export-rose?style=for-the-badge)

---

## ⚡ Product Vision & Core Promise

Existing expense tools create too much friction for roommates. Users don't want to create account passwords, manually search for friends, or calculate who owes whom for ₹200 milk.

FinLit V2 operates on a zero-friction, mobile-first philosophy:
> **Spend → Tap Add → Enter Amount → Participants Pre-Selected → Save & Forget.**

---

## ✨ Key Features & Innovation Highlights

### 1. 🔒 Uncrackable High-Entropy Room Security & Permanent Room IDs
- **Cryptographic High-Entropy Join Codes**: Rooms are generated with 8-character hex codes (e.g., `FLAT-5DE4DA03`), providing over **4.29 billion combinations** ($16^8$), making random guessing mathematically impossible.
- **Strict Code Access Control**: Requires exact code authorization to join, keeping room data strictly private.
- **Permanent Immutable Room ID**: One room, one permanent code. Room IDs cannot be altered or hijacked once created.

### 2. 👑 Admin Member Management & Removal Power
- **Admin Control**: Room creators gain Admin privileges.
- **Member Removal**: Admins can safely remove inactive flatmates (`DELETE /api/rooms/:roomId/members/:memberId`), deactivating them from active splitting lists while preserving historical ledger accuracy.

### 3. 📄 1-Tap "Mine vs Flat" PDF Statement Exporter
- **Instant Client-Side PDF Generation**: Exports complete monthly financial statements (`FinLit_FlatName_Report.pdf`) built with `jsPDF`.
- **Financial Transparency**: Compares **Flat Total Shared Expenditure vs Your Personal Out-of-Pocket Share** with an itemized transaction ledger and settlement standing.

### 4. 📅 Recurring Household Bills & Subscriptions Scheduler
- **Fixed Monthly Bill Manager**: Schedule recurring flat expenses (WiFi Broadband, House Maid/Cook, Rent, Electricity, Gas).
- **1-Tap Log Paid Automation**: Click `[ Log Paid ]` to automatically calculate and split the bill equally among active room members.

### 5. 📊 Personal Monthly Status & Comparison Bar
- **Mine vs Flat Progress Bar**: Displays your out-of-pocket expenditure relative to the household total (e.g., `25% of Flat Total`).
- **Clear Net Position**: Instant view of your total paid upfront vs your calculated share.

### 6. ⚡ The 5-Second Quick Add UX
- **Dominant numeric input** with instant auto-focus.
- **Everyone selected by default** (`Akshay ✓, Rahul ✓, Rishi ✓, Aman ✓`).
- **One-tap flatmate toggles** to uncheck non-participants.

### 7. 🧠 Centralized Debt Simplification Engine
- Implements a greedy debt simplification algorithm (`simplifyDebts`) that reduces complex multi-person room debts down to the minimal number of direct 1-to-1 settlements.

### 8. 📴 Offline-First Sync & Idempotency
- Local queue saves pending expenses offline (`pendingSync`).
- Uses unique `clientExpenseId` keys to guarantee **idempotent retries** without duplicate entries.

### 9. 📱 Native Android Home Screen Widget
- Native Android `AppWidgetProvider` (`QuickExpenseWidget.kt`) allowing roomies to log expenses directly from the Android launcher.

---

## 🛠️ Tech Stack

- **Frontend**: React 19 + Vite, Tailwind CSS v4, Zustand, Lucide React, Recharts, jsPDF
- **Mobile**: React Native + Native Android AppWidget Provider (`AppWidgetProvider`, Glance layout)
- **Backend**: Node.js + Express.js
- **Database**: MongoDB + Mongoose (Indexed schemas)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB instance running locally (`mongodb://127.0.0.1:27017/splitsense_v2`) or via MongoDB Atlas

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
```

Create `backend/.env`:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/splitsense_v2
JWT_SECRET=splitsense_secret_12345
```

Run Core Logic Unit Tests:
```bash
node tests/balanceAndSplit.test.js
```

### 2. Frontend Web Client Setup
```bash
cd frontend
npm install
npm run dev
```

Build for Production:
```bash
npm run build
```

---

## 📂 System Architecture & Database Models

```
Room {
  _id, name, joinCode (FLAT-5DE4DA03), createdBy, settings, createdAt
}

Member {
  _id, roomId, name, role ('admin'|'member'), deviceId, recoveryCodeHash, isActive, lastActiveAt
}

ExpenseV2 {
  _id, roomId, paidBy, amount, description, category, participants: [{ memberId, share }],
  splitType ('equal'|'exact'|'percentage'), expenseScope ('shared'|'personal'), clientExpenseId
}

Settlement {
  _id, roomId, fromMember, toMember, amount, paymentMethod, createdAt
}
```

---

## 🔒 Security & Privacy

- Room data isolated per `roomId`.
- Member API requests validated via custom `memberAuth` middleware using headers (`X-Device-Id`, `X-Member-Id`, `X-Room-Id`).
- High-entropy cryptographic join codes prevent unauthorized room discovery.

---

*Engineered for roomies everywhere. Spend. Split. Forget.*