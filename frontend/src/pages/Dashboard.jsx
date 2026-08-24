import { useState, useEffect } from 'react';
import { useRoomStore } from '../store/useRoomStore';
import QuickAddModal from '../components/QuickAddModal';
import BalancesView from '../components/BalancesView';
import RoomView from '../components/RoomView';
import AskAISenseModal from '../components/AskAISenseModal';
import RoomOnboardingPage from './RoomOnboardingPage';
import { generateMineVsFlatPDF } from '../utils/pdfExporter';
import {
  Plus,
  Home,
  Receipt,
  Scale,
  Users,
  Bot,
  WifiOff,
  RefreshCw,
  TrendingUp,
  ChevronDown,
  Layers,
  X,
  FileText,
  UserCheck,
} from 'lucide-react';

export default function Dashboard() {
  const {
    room,
    currentMember,
    members,
    expenses,
    balances,
    monthlySummary,
    fetchDashboardData,
    offlineQueue,
    syncOfflineQueue,
    isSyncing,
    myRooms,
    switchRoom,
  } = useRoomStore();

  const [activeTab, setActiveTab] = useState('home'); // 'home', 'activity', 'balances', 'room'
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isAskAIOpen, setIsAskAIOpen] = useState(false);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);

  useEffect(() => {
    if (room) {
      fetchDashboardData();
    }
  }, [room]);

  useEffect(() => {
    const handleOnline = () => {
      syncOfflineQueue();
    };
    window.addEventListener('online', handleOnline);

    if (navigator.onLine && offlineQueue.length > 0) {
      syncOfflineQueue();
    }

    const interval = setInterval(() => {
      if (navigator.onLine && useRoomStore.getState().offlineQueue.length > 0) {
        useRoomStore.getState().syncOfflineQueue();
      }
    }, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, [offlineQueue.length]);

  if (!room || !currentMember) {
    return <RoomOnboardingPage />;
  }

  const { summary } = balances || {};

  // Calculate personal metrics (Mine vs Flat)
  const myMemberId = currentMember?._id || currentMember?.id;
  let myTotalPaid = 0;
  let myCalculatedShare = 0;
  let myPersonalOnly = 0;

  (expenses || []).forEach((e) => {
    const isPayer = (e.paidBy?._id || e.paidBy?.id || e.paidBy) === myMemberId;
    if (isPayer) {
      myTotalPaid += e.amount;
    }

    if (e.expenseScope === 'personal') {
      if (isPayer) myPersonalOnly += e.amount;
    } else {
      const p = (e.participants || []).find(
        (part) => (part.memberId?._id || part.memberId?.id || part.memberId) === myMemberId
      );
      if (p) {
        myCalculatedShare += p.share || 0;
      }
    }
  });

  const totalMySpendingThisMonth = myPersonalOnly + myCalculatedShare;
  const flatTotalShared = monthlySummary?.totalMonthlyShared || 0;
  const myPercentageOfFlat =
    flatTotalShared > 0 ? Math.min(100, Math.round((totalMySpendingThisMonth / flatTotalShared) * 100)) : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 pb-24 sm:pb-8">
      {/* Offline Sync Banner */}
      {offlineQueue.length > 0 && (
        <div className="bg-amber-500 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <WifiOff className="w-4 h-4" />
            <span>{offlineQueue.length} pending offline expenses saved locally.</span>
          </div>
          <button
            onClick={syncOfflineQueue}
            disabled={isSyncing}
            className="px-3 py-1 bg-white text-amber-900 rounded-lg text-[11px] font-extrabold hover:bg-amber-100 flex items-center space-x-1"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>
      )}

      {/* Top Navbar with Multi-Group Switcher Dropdown */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          {/* Active Group / Trip Dropdown Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowGroupDropdown(!showGroupDropdown)}
              className="flex items-center space-x-2 p-1.5 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white font-extrabold flex items-center justify-center text-sm shadow-md shadow-emerald-600/30">
                {room.name.charAt(0)}
              </div>
              <div className="text-left">
                <div className="flex items-center space-x-1">
                  <h1 className="font-extrabold text-gray-900 dark:text-white text-sm leading-none">{room.name}</h1>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                  👋 {currentMember.name} • {members.length} members
                </p>
              </div>
            </button>

            {/* Dropdown Menu for Multi-Group/Trip Selection */}
            {showGroupDropdown && (
              <div className="absolute top-12 left-0 z-50 w-64 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 p-2 space-y-1 animate-in fade-in zoom-in duration-150">
                <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Your Groups & Trips ({myRooms.length})
                </p>

                {myRooms.map((entry) => {
                  const isCurrent = (entry.room.id || entry.room._id) === (room.id || room._id);
                  return (
                    <button
                      key={entry.room.id || entry.room._id}
                      onClick={() => {
                        switchRoom(entry.room.id || entry.room._id);
                        setShowGroupDropdown(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition ${isCurrent
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                    >
                      <div className="truncate">
                        <p className="truncate">{entry.room.name}</p>
                        <p className="text-[10px] text-gray-400 font-normal">{entry.room.joinCode}</p>
                      </div>
                      {isCurrent && <span className="h-2 w-2 rounded-full bg-emerald-500"></span>}
                    </button>
                  );
                })}

                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => {
                      setShowGroupDropdown(false);
                      setShowNewGroupModal(true);
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ New Group / Trip</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <div className="hidden sm:flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-bold mr-2">
              <button
                onClick={() => setActiveTab('home')}
                className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'home'
                    ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                Home
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'activity'
                    ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                Activity
              </button>
              <button
                onClick={() => setActiveTab('balances')}
                className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'balances'
                    ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                Balances
              </button>
              <button
                onClick={() => setActiveTab('room')}
                className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'room'
                    ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                Group
              </button>
            </div>

            <button
              onClick={() => setIsAskAIOpen(true)}
              className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition flex items-center space-x-1 text-xs font-bold"
            >
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-xl mx-auto p-4 space-y-6">
        {/* Tab 1: HOME */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* Quick Balance Summary Banner */}
            <div
              onClick={() => setActiveTab('balances')}
              className="bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-xs cursor-pointer hover:border-emerald-200 transition"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Your Position</span>
                <span className="text-xs text-emerald-600 font-bold">View Details →</span>
              </div>

              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-black text-gray-900 dark:text-white">
                  {summary?.netBalance >= 0 ? '+' : ''}₹{summary?.netBalance || 0}
                </span>
                <span className="text-xs text-gray-500">
                  {summary?.netBalance > 0 ? 'You are owed' : summary?.netBalance < 0 ? 'You owe overall' : 'All clear'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs">
                <div>
                  <span className="text-gray-400 block">You Owe</span>
                  <span className="font-extrabold text-rose-500 text-sm">₹{summary?.totalIOwe || 0}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">You're Owed</span>
                  <span className="font-extrabold text-emerald-500 text-sm">₹{summary?.totalOwedToMe || 0}</span>
                </div>
              </div>
            </div>

            {/* My Personal Spending Status & Mine vs Flat PDF Export */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">My Monthly Status</span>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white mt-0.5">
                    ₹{totalMySpendingThisMonth.toFixed(0)}{' '}
                    <span className="text-xs font-semibold text-gray-400">Total Out-of-Pocket</span>
                  </h3>
                </div>

                <button
                  onClick={() => generateMineVsFlatPDF({ room, currentMember, expenses, balances, monthlySummary })}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-1.5"
                >
                  <FileText className="w-4 h-4" />
                  <span>Export PDF</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-2xl">
                  <span className="text-gray-400 font-medium block">Paid Upfront By You</span>
                  <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">₹{myTotalPaid}</span>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-2xl">
                  <span className="text-gray-400 font-medium block">Your Share of Flat Bills</span>
                  <span className="text-base font-extrabold text-gray-900 dark:text-white">₹{myCalculatedShare.toFixed(0)}</span>
                </div>
              </div>

              {/* Mine vs Flat Comparison Progress Bar */}
              {flatTotalShared > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-500">Mine vs Flat Shared Expenditure</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{myPercentageOfFlat}% of Flat Total</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${myPercentageOfFlat}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Monthly Household Summary Card */}
            {monthlySummary && (
              <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white rounded-3xl p-5 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                      {monthlySummary.monthName} Household Total
                    </p>
                    <p className="text-2xl font-black mt-0.5">₹{monthlySummary.totalMonthlyShared}</p>
                  </div>
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                </div>

                {monthlySummary.categoryBreakdown && Object.keys(monthlySummary.categoryBreakdown).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-emerald-800/60">
                    {Object.entries(monthlySummary.categoryBreakdown).map(([cat, amt]) => (
                      <span key={cat} className="px-2.5 py-1 bg-emerald-800/60 rounded-lg text-[11px] font-medium text-emerald-200">
                        {cat}: <strong>₹{amt}</strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Recent Expenses List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Recent Expenses in {room.name}
                </h3>
                <button
                  onClick={() => setActiveTab('activity')}
                  className="text-xs text-emerald-600 font-bold hover:underline"
                >
                  See All
                </button>
              </div>

              {expenses.length === 0 ? (
                <div className="text-center py-10 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 space-y-3">
                  <Receipt className="w-10 h-10 text-emerald-500 mx-auto" />
                  <h4 className="font-bold text-gray-900 dark:text-white">No expenses recorded in {room.name} yet</h4>
                  <p className="text-xs text-gray-500">Tap below to log your first shared expense for this group!</p>
                  <button
                    onClick={() => setIsQuickAddOpen(true)}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-md transition"
                  >
                    + Add Expense
                  </button>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-900 rounded-3xl divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800 shadow-xs overflow-hidden">
                  {expenses.slice(0, 5).map((e) => (
                    <div key={e._id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-xs">
                          {e.category === 'Milk & Daily Essentials' ? '🥛' : e.category === 'Food & Dining' ? '🍕' : '🛒'}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight">{e.description}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Paid by <strong className="text-gray-700 dark:text-gray-300">{e.paidBy?.name || 'Flatmate'}</strong> • {e.category}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-black text-gray-900 dark:text-white text-sm">₹{e.amount}</p>
                        <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          {e.participants?.length || 1} split
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: ACTIVITY / ALL EXPENSES */}
        {activeTab === 'activity' && (
          <div className="space-y-4">
            <button
              onClick={() => setActiveTab('home')}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-xs rounded-xl transition"
            >
              <span>← Back to Home</span>
            </button>

            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{room.name} Expense Feed</h2>

            <div className="bg-white dark:bg-gray-900 rounded-3xl divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800 shadow-xs">
              {expenses.map((e) => (
                <div key={e._id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 font-bold flex items-center justify-center text-sm">
                      ₹
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-sm">{e.description}</p>
                      <p className="text-xs text-gray-400">
                        Paid by {e.paidBy?.name || 'Flatmate'} • {new Date(e.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-black text-gray-900 dark:text-white text-sm">₹{e.amount}</p>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                      {e.expenseScope}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: BALANCES */}
        {activeTab === 'balances' && (
          <BalancesView onBackToHome={() => setActiveTab('home')} />
        )}

        {/* Tab 4: ROOM */}
        {activeTab === 'room' && (
          <div className="space-y-4">
            <button
              onClick={() => setActiveTab('home')}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-xs rounded-xl transition"
            >
              <span>← Back to Home</span>
            </button>
            <RoomView onOpenNewRoomOnboarding={() => setShowNewGroupModal(true)} />
          </div>
        )}
      </main>

      {/* Floating Action Button (+ ADD EXPENSE) */}
      <div className="fixed bottom-20 sm:bottom-8 right-6 z-40">
        <button
          onClick={() => setIsQuickAddOpen(true)}
          className="px-5 py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black rounded-3xl shadow-xl shadow-emerald-600/40 flex items-center space-x-2 transition transform"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
          <span className="text-sm">ADD</span>
        </button>
      </div>

      {/* Bottom Navigation Bar (Mobile First) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-t border-gray-100 dark:border-gray-800 px-6 py-3 sm:hidden">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center space-y-1 transition ${activeTab === 'home' ? 'text-emerald-600 font-bold' : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px]">Home</span>
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            className={`flex flex-col items-center space-y-1 transition ${activeTab === 'activity' ? 'text-emerald-600 font-bold' : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            <Receipt className="w-5 h-5" />
            <span className="text-[10px]">Activity</span>
          </button>

          <button
            onClick={() => setActiveTab('balances')}
            className={`flex flex-col items-center space-y-1 transition ${activeTab === 'balances' ? 'text-emerald-600 font-bold' : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            <Scale className="w-5 h-5" />
            <span className="text-[10px]">Balances</span>
          </button>

          <button
            onClick={() => setActiveTab('room')}
            className={`flex flex-col items-center space-y-1 transition ${activeTab === 'room' ? 'text-emerald-600 font-bold' : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px]">Group</span>
          </button>
        </div>
      </nav>

      {/* New Group / Trip Modal */}
      {showNewGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl relative">
            <button
              onClick={() => setShowNewGroupModal(false)}
              className="absolute top-4 right-4 z-50 p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="max-h-[85vh] overflow-y-auto">
              <RoomOnboardingPage onSuccess={() => setShowNewGroupModal(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <QuickAddModal isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} />
      <AskAISenseModal isOpen={isAskAIOpen} onClose={() => setIsAskAIOpen(false)} />
    </div>
  );
}