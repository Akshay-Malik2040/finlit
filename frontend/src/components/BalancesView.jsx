import { useState } from 'react';
import { useRoomStore } from '../store/useRoomStore';
import { ArrowUpRight, ArrowDownLeft, CheckCircle2, DollarSign, Send, Sparkles, ArrowLeft } from 'lucide-react';

export default function BalancesView({ onBackToHome }) {
  const { balances, currentMember, createSettlement, isLoading } = useRoomStore();

  const [settleMember, setSettleMember] = useState(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { summary, youOwe, youAreOwed, simplifiedSettlementPlan } = balances || {};

  if (isLoading) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 space-y-3">
        <Sparkles className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
        <p className="text-xs font-bold text-gray-500">Calculating room balances...</p>
      </div>
    );
  }

  const handleOpenSettle = (member, defaultAmount) => {
    setSettleMember(member);
    setSettleAmount(defaultAmount.toString());
  };

  const handleConfirmSettle = async (e) => {
    e.preventDefault();
    if (!settleMember || !settleAmount || parseFloat(settleAmount) <= 0) return;

    setIsSubmitting(true);
    const res = await createSettlement(settleMember.id || settleMember._id, parseFloat(settleAmount), paymentMethod);
    setIsSubmitting(false);

    if (res.success) {
      setSettleMember(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back to Home Button */}
      {onBackToHome && (
        <button
          onClick={onBackToHome}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-xs rounded-xl transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>← Back to Home</span>
        </button>
      )}
      {/* Net Position Header Card */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-emerald-950 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <p className="text-xs uppercase tracking-widest font-semibold text-emerald-400 mb-1">
          Household Net Position
        </p>

        <div className="flex items-baseline space-x-2 my-2">
          <span className="text-4xl font-black">
            {summary?.netBalance >= 0 ? '+' : ''}₹{summary?.netBalance || 0}
          </span>
          <span className="text-xs text-gray-400">
            {summary?.netBalance > 0 ? 'You are net positive' : summary?.netBalance < 0 ? 'You have net debt' : 'Settled up'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-gray-700/60">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/20 text-rose-400">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">You Owe</p>
              <p className="text-lg font-extrabold text-rose-400">₹{summary?.totalIOwe || 0}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium font-sans">You're Owed</p>
              <p className="text-lg font-extrabold text-emerald-400">₹{summary?.totalOwedToMe || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Person-by-Person Debts: You Owe */}
      {youOwe && youOwe.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center">
            <ArrowUpRight className="w-4 h-4 mr-1" /> Flatmates You Owe
          </h3>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {youOwe.map((item) => (
              <div key={item.member.id || item.member._id} className="py-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 font-bold flex items-center justify-center text-sm border border-rose-200 dark:border-rose-900">
                    {item.member.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">{item.member.name}</p>
                    <p className="text-xs text-gray-500">You owe ₹{item.amount}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenSettle(item.member, item.amount)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Settle ₹{item.amount}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Person-by-Person Debts: You Are Owed */}
      {youAreOwed && youAreOwed.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center">
            <ArrowDownLeft className="w-4 h-4 mr-1" /> Flatmates Who Owe You
          </h3>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {youAreOwed.map((item) => (
              <div key={item.member.id || item.member._id} className="py-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 font-bold flex items-center justify-center text-sm border border-emerald-200 dark:border-emerald-900">
                    {item.member.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">{item.member.name}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Owes you ₹{item.amount}</p>
                  </div>
                </div>

                <span className="text-xs text-gray-400 font-medium bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                  Pending payment
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optimized Household Debt Simplification Plan */}
      {simplifiedSettlementPlan && simplifiedSettlementPlan.length > 0 && (
        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-3xl p-5 border border-emerald-200/60 dark:border-emerald-900/40 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center">
              <Sparkles className="w-4 h-4 mr-1 text-emerald-600" /> Simplified Settlement Plan
            </h3>
            <span className="text-xs text-emerald-600 font-semibold">{simplifiedSettlementPlan.length} payments total</span>
          </div>

          <div className="space-y-2">
            {simplifiedSettlementPlan.map((t, idx) => (
              <div
                key={idx}
                className="p-3 bg-white dark:bg-gray-800 rounded-xl text-xs font-semibold flex items-center justify-between text-gray-800 dark:text-gray-200 border border-emerald-100 dark:border-emerald-900/30"
              >
                <span>
                  <strong className="text-rose-600 dark:text-rose-400">{t.from.name}</strong> pays{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400">{t.to.name}</strong>
                </span>
                <span className="font-extrabold text-sm text-gray-900 dark:text-white">₹{t.amount}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Settled State */}
      {(!youOwe || youOwe.length === 0) && (!youAreOwed || youAreOwed.length === 0) && (
        <div className="text-center py-10 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h4 className="text-lg font-bold text-gray-900 dark:text-white">Everyone is Settled Up! 🎉</h4>
          <p className="text-xs text-gray-500 mt-1">No pending debts between flatmates.</p>
        </div>
      )}

      {/* Settle Debt Modal */}
      {settleMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Settle Debt with {settleMember.name}
            </h3>

            <form onSubmit={handleConfirmSettle} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                  Settlement Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="any"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    required
                    className="w-full pl-8 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-base font-extrabold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['UPI', 'Cash', 'Bank Transfer'].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${
                        paymentMethod === method
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSettleMember(null)}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  {isSubmitting ? 'Recording...' : 'Confirm Settle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
