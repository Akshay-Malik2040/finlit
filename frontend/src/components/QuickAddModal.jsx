import { useState, useEffect } from 'react';
import { useRoomStore } from '../store/useRoomStore';
import { X, Check, Users, User } from 'lucide-react';

const CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Milk & Daily Essentials',
  'Electricity',
  'Internet',
  'Water',
  'Gas',
  'Rent',
  'Maid & Cleaning',
  'Transport',
  'Household',
  'Entertainment',
  'Subscriptions',
  'Repairs',
  'Other',
];

export default function QuickAddModal({ isOpen, onClose }) {
  const { members, currentMember, addExpense } = useRoomStore();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Other');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [expenseScope, setExpenseScope] = useState('shared');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize selected members to EVERYONE by default
  useEffect(() => {
    if (isOpen && members.length > 0) {
      setSelectedMemberIds(members.map((m) => m._id || m.id));
      setAmount('');
      setDescription('');
      setCategory('Other');
      setExpenseScope('shared');
    }
  }, [isOpen, members]);

  if (!isOpen) return null;

  const toggleMemberSelection = (id) => {
    if (selectedMemberIds.includes(id)) {
      // Don't allow deselecting everyone in a shared expense
      if (selectedMemberIds.length > 1) {
        setSelectedMemberIds(selectedMemberIds.filter((mId) => mId !== id));
      }
    } else {
      setSelectedMemberIds([...selectedMemberIds, id]);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) return;

    setIsSubmitting(true);
    const res = await addExpense({
      amount: numericAmount,
      description: description.trim() || (category !== 'Other' ? category : 'Shared Expense'),
      category,
      participantIds: expenseScope === 'shared' ? selectedMemberIds : [currentMember?._id || currentMember?.id],
      expenseScope,
      source: 'quick',
    });
    setIsSubmitting(false);

    if (res.success) {
      onClose();
    }
  };

  const currentSharePerPerson =
    expenseScope === 'shared' && selectedMemberIds.length > 0 && amount && parseFloat(amount) > 0
      ? (parseFloat(amount) / selectedMemberIds.length).toFixed(0)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden transition-all animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center space-x-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Quick Add Expense</h2>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>


        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Dominant Amount Input */}
          <div className="text-center bg-emerald-50/50 dark:bg-emerald-950/20 py-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">
              Enter Amount
            </span>
            <div className="flex items-center justify-center">
              <span className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 mr-1">₹</span>
              <input
                type="number"
                step="any"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                required
                className="w-44 text-5xl font-black text-gray-900 dark:text-white bg-transparent text-center focus:outline-none placeholder-gray-300 dark:placeholder-gray-700"
              />
            </div>
            {currentSharePerPerson > 0 && expenseScope === 'shared' && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Your share: <span className="font-bold text-gray-800 dark:text-gray-200">₹{currentSharePerPerson}</span> ({selectedMemberIds.length} flatmates)
              </p>
            )}
          </div>

          {/* Scope Selector: Shared vs Personal */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setExpenseScope('shared')}
              className={`py-2 rounded-lg flex items-center justify-center space-x-1.5 transition ${
                expenseScope === 'shared'
                  ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Shared Expense</span>
            </button>
            <button
              type="button"
              onClick={() => setExpenseScope('personal')}
              className={`py-2 rounded-lg flex items-center justify-center space-x-1.5 transition ${
                expenseScope === 'personal'
                  ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Personal Only</span>
            </button>
          </div>

          {/* Participants Selection (Everyone selected by default) */}
          {expenseScope === 'shared' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Who Shared This?
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedMemberIds(members.map((m) => m._id || m.id))}
                  className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                >
                  Select All
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const mId = m._id || m.id;
                  const isSelected = selectedMemberIds.includes(mId);
                  return (
                    <button
                      key={mId}
                      type="button"
                      onClick={() => toggleMemberSelection(mId)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      <span>{m.name}</span>
                      {isSelected ? <Check className="w-3.5 h-3.5" /> : <span className="text-xs opacity-50">+</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Optional Details: Description & Category */}
          <div className="space-y-3 pt-2">
            <div>
              <input
                type="text"
                placeholder="Description (Optional, e.g. Milk, WiFi)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORIES.slice(0, 6).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap border transition ${
                    category === cat
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-600/30 text-base transition flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{isSubmitting ? 'Saving Expense...' : 'Save Expense'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
