import { useState } from 'react';
import { useRoomStore } from '../store/useRoomStore';
import { Calendar, CheckCircle2, Clock, Plus, Zap, Wifi, Home, Utensils } from 'lucide-react';

export default function RecurringBillsCard({ onQuickAddBill }) {
  const { room, members, addExpense } = useRoomStore();

  const [bills, setBills] = useState([
    { id: '1', title: 'WiFi Broadband', amount: 999, category: 'Bills & Utilities', dueDate: '1st of month', icon: 'wifi' },
    { id: '2', title: 'House Maid / Cook', amount: 4000, category: 'Services', dueDate: '5th of month', icon: 'service' },
    { id: '3', title: 'Electricity Bill', amount: 1500, category: 'Bills & Utilities', dueDate: '10th of month', icon: 'zap' },
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

  const handleCreateBill = (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAmount) return;
    const newBill = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      amount: parseFloat(newAmount),
      category: 'Bills & Utilities',
      dueDate: newDueDate.trim() || 'Monthly',
      icon: 'zap',
    };
    setBills([...bills, newBill]);
    setNewTitle('');
    setNewAmount('');
    setNewDueDate('');
    setShowAddForm(false);
  };

  const handleLogPaidBill = async (bill) => {
    if (onQuickAddBill) {
      onQuickAddBill(bill);
    } else {
      // Auto add
      const participantShares = (members || []).map((m) => ({
        memberId: m._id || m.id,
        share: Math.round((bill.amount / (members.length || 1)) * 100) / 100,
      }));
      await addExpense({
        description: bill.title,
        amount: bill.amount,
        category: bill.category,
        participants: participantShares,
        expenseScope: 'group',
      });
      alert(`Logged "${bill.title}" (₹${bill.amount}) as a shared group expense!`);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center">
            <Calendar className="w-4 h-4 mr-1" /> Recurring Household Bills
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Fixed monthly flat expenses & subscriptions</p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded-xl text-xs font-bold transition flex items-center space-x-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Recurring</span>
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleCreateBill} className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl space-y-3 animate-in fade-in zoom-in duration-150">
          <p className="text-xs font-bold text-gray-700 dark:text-gray-200">New Monthly Recurring Bill</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Bill Title (e.g. WiFi)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="p-2.5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-900 dark:text-white"
              required
            />
            <input
              type="number"
              placeholder="Amount (₹)"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              className="p-2.5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-900 dark:text-white"
              required
            />
          </div>
          <input
            type="text"
            placeholder="Due Date (e.g. 5th of every month)"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            className="w-full p-2.5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-900 dark:text-white"
          />
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs text-gray-500 font-bold hover:underline"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
            >
              Save Schedule
            </button>
          </div>
        </form>
      )}

      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {bills.map((bill) => (
          <div key={bill.id} className="py-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 font-bold flex items-center justify-center text-sm">
                {bill.icon === 'wifi' ? <Wifi className="w-5 h-5" /> : bill.icon === 'service' ? <Home className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white text-sm">{bill.title}</p>
                <p className="text-[11px] text-gray-400 flex items-center">
                  <Clock className="w-3 h-3 mr-1" /> Due {bill.dueDate}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-right">
                <span className="font-extrabold text-sm text-gray-900 dark:text-white block">₹{bill.amount}</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Monthly Split</span>
              </div>

              <button
                onClick={() => handleLogPaidBill(bill)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1"
                title="Log as Paid Shared Expense"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Log Paid</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
