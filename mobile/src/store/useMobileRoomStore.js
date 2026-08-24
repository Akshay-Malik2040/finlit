import { create } from 'zustand';
import api, { getOrCreateDeviceId } from '../api/client';
import storage from '../storage/asyncStorage';
import { computeLocalBalances } from '../utils/localBalanceCalculator';

export const useMobileRoomStore = create((set, get) => ({
  room: null,
  currentMember: null,
  members: [],
  myRooms: [],
  recoveryCode: null,

  expenses: [],
  settlements: [],
  balances: {
    summary: { netBalance: 0, totalIOwe: 0, totalOwedToMe: 0 },
    youOwe: [],
    youAreOwed: [],
    simplifiedSettlementPlan: [],
    allMemberBalances: {},
  },
  monthlySummary: null,

  isLoading: false,
  isSyncing: false,
  error: null,
  offlineQueue: [],

  // Initialize session from storage
  initSession: async () => {
    try {
      const roomRaw = await storage.getItem('finlit_room');
      const memberRaw = await storage.getItem('finlit_member');
      const membersRaw = await storage.getItem('finlit_members');
      const expensesRaw = await storage.getItem('finlit_expenses');
      const settlementsRaw = await storage.getItem('finlit_settlements');
      const balancesRaw = await storage.getItem('finlit_balances');
      const recoveryCode = await storage.getItem('finlit_recovery_code');
      const queueRaw = await storage.getItem('finlit_offline_queue');

      const room = roomRaw ? JSON.parse(roomRaw) : null;
      const currentMember = memberRaw ? JSON.parse(memberRaw) : null;
      const members = membersRaw ? JSON.parse(membersRaw) : [];
      const expenses = expensesRaw ? JSON.parse(expensesRaw) : [];
      const settlements = settlementsRaw ? JSON.parse(settlementsRaw) : [];
      const balances = balancesRaw ? JSON.parse(balancesRaw) : get().balances;
      const offlineQueue = queueRaw ? JSON.parse(queueRaw) : [];

      set({ room, currentMember, members, expenses, settlements, balances, recoveryCode, offlineQueue });

      if (room) {
        get().recalculateLocalBalances();
        await get().fetchDashboardData();
      }
    } catch (err) {
      console.error('Init mobile session error:', err);
    }
  },

  // Save session
  saveSession: async (room, member, recoveryCode = null) => {
    const roomId = room.id || room._id;
    const memberId = member.id || member._id;

    await storage.setItem('finlit_room_id', roomId);
    await storage.setItem('finlit_member_id', memberId);
    await storage.setItem('finlit_room', JSON.stringify(room));
    await storage.setItem('finlit_member', JSON.stringify(member));

    if (recoveryCode) {
      await storage.setItem('finlit_recovery_code', recoveryCode);
    }

    set({ room, currentMember: member, recoveryCode });
  },

  // Create Room
  createRoom: async (roomName, creatorName) => {
    set({ isLoading: true, error: null });
    try {
      const deviceId = await getOrCreateDeviceId();
      const res = await api.post('/rooms', {
        name: roomName,
        creatorName,
        deviceId,
      });

      const { room, member, recoveryCode } = res.data;
      await get().saveSession(room, member, recoveryCode);
      await get().fetchDashboardData();
      set({ isLoading: false });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create room';
      set({ isLoading: false, error: msg });
      return { success: false, error: msg };
    }
  },

  // Join Room
  joinRoom: async (joinCode, name) => {
    set({ isLoading: true, error: null });
    try {
      const deviceId = await getOrCreateDeviceId();
      const res = await api.post('/rooms/join', {
        joinCode,
        name,
        deviceId,
      });

      const { room, member, members, recoveryCode } = res.data;
      await get().saveSession(room, member, recoveryCode);
      set({ members: members || [] });
      await get().fetchDashboardData();
      set({ isLoading: false });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid room code';
      set({ isLoading: false, error: msg });
      return { success: false, error: msg };
    }
  },

  // Recalculates balances locally from current state
  recalculateLocalBalances: () => {
    const { members, expenses, settlements, currentMember } = get();
    const currentMemberId = currentMember?._id || currentMember?.id;
    const computedBalances = computeLocalBalances({
      members,
      expenses,
      settlements,
      currentMemberId,
    });
    storage.setItem('finlit_balances', JSON.stringify(computedBalances));
    set({ balances: computedBalances });
    return computedBalances;
  },

  // Fetch Expenses & Balances
  fetchDashboardData: async () => {
    const { room, currentMember } = get();
    if (!room) return;
    set({ isLoading: true });
    try {
      const [expensesRes, balancesRes, summaryRes, roomRes] = await Promise.all([
        api.get('/expenses'),
        api.get('/expenses/balances'),
        api.get('/expenses/monthly-summary'),
        api.get(`/rooms/${room.id || room._id}`),
      ]);

      const expenses = expensesRes.data || [];
      const members = roomRes.data?.members || [];

      await storage.setItem('finlit_expenses', JSON.stringify(expenses));
      await storage.setItem('finlit_members', JSON.stringify(members));

      let balances = balancesRes.data;
      if (!balances || !balances.summary) {
        balances = computeLocalBalances({
          members,
          expenses,
          settlements: get().settlements,
          currentMemberId: currentMember?._id || currentMember?.id,
        });
      }
      await storage.setItem('finlit_balances', JSON.stringify(balances));

      set({
        expenses,
        balances,
        monthlySummary: summaryRes.data || null,
        members,
        isLoading: false,
      });

      // Auto-trigger offline queue sync if pending items exist
      if (get().offlineQueue.length > 0) {
        get().syncOfflineQueue();
      }
    } catch (err) {
      console.warn('Fetch mobile dashboard data offline fallback:', err);
      get().recalculateLocalBalances();
      set({ isLoading: false });
    }
  },

  // Add Expense with Idempotency & Offline Queueing
  addExpense: async (expensePayload) => {
    const { room, currentMember, members, expenses, offlineQueue } = get();
    if (!room || !currentMember) return { success: false, error: 'No active room session' };

    const clientExpenseId = 'exp_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    const fullPayload = {
      ...expensePayload,
      clientExpenseId,
    };

    const participantIds = fullPayload.participantIds || [];
    const equalShare = participantIds.length > 0 ? parseFloat((parseFloat(fullPayload.amount) / participantIds.length).toFixed(2)) : parseFloat(fullPayload.amount);

    const optimisticExpense = {
      _id: clientExpenseId,
      description: fullPayload.description || 'Shared Expense',
      amount: parseFloat(fullPayload.amount),
      category: fullPayload.category || 'General',
      expenseScope: fullPayload.expenseScope || 'shared',
      paidBy: currentMember,
      participants: participantIds.map((id) => ({
        memberId: members.find((m) => (m._id || m.id) === id) || { _id: id, id, name: 'Flatmate' },
        share: equalShare,
      })),
      createdAt: new Date().toISOString(),
      isPendingSync: true,
    };

    // Instant local state update & balance recalculation
    const updatedExpenses = [optimisticExpense, ...expenses];
    await storage.setItem('finlit_expenses', JSON.stringify(updatedExpenses));
    set({ expenses: updatedExpenses });
    get().recalculateLocalBalances();

    try {
      const res = await api.post('/expenses', fullPayload);
      const serverExpense = res.data.expense;
      const finalExpenses = [serverExpense, ...get().expenses.filter((e) => e._id !== clientExpenseId)];

      await storage.setItem('finlit_expenses', JSON.stringify(finalExpenses));
      set({ expenses: finalExpenses });

      if (res.data.balances) {
        await storage.setItem('finlit_balances', JSON.stringify(res.data.balances));
        set({ balances: res.data.balances });
      } else {
        get().recalculateLocalBalances();
      }

      await get().fetchDashboardData();
      return { success: true };
    } catch (err) {
      // Offline fallback: Queue for later sync
      const updatedQueue = [...offlineQueue, fullPayload];
      await storage.setItem('finlit_offline_queue', JSON.stringify(updatedQueue));
      set({ offlineQueue: updatedQueue });
      return { success: true, offline: true };
    }
  },

  // Sync Offline Queue
  syncOfflineQueue: async () => {
    const queue = get().offlineQueue;
    if (queue.length === 0 || get().isSyncing) return;

    set({ isSyncing: true });
    const remainingQueue = [];

    for (const pendingItem of queue) {
      try {
        if (pendingItem.type === 'settlement') {
          await api.post('/settlements', pendingItem);
        } else {
          await api.post('/expenses', pendingItem);
        }
      } catch (err) {
        console.error('Failed to sync offline item:', pendingItem, err);
        remainingQueue.push(pendingItem);
      }
    }

    await storage.setItem('finlit_offline_queue', JSON.stringify(remainingQueue));
    set({ offlineQueue: remainingQueue, isSyncing: false });
    await get().fetchDashboardData();
  },

  // Record Settlement
  createSettlement: async (toMemberId, amount, paymentMethod = 'UPI', notes = '') => {
    const { currentMember, settlements, offlineQueue } = get();
    const payload = { toMemberId, amount: parseFloat(amount), paymentMethod, notes, type: 'settlement' };

    const mockSettlement = {
      _id: 'set_' + Date.now().toString(36),
      fromMember: currentMember,
      toMember: get().members.find((m) => (m._id || m.id) === toMemberId) || { _id: toMemberId, name: 'Flatmate' },
      amount: parseFloat(amount),
      paymentMethod,
      createdAt: new Date().toISOString(),
      isPendingSync: true,
    };

    const updatedSettlements = [mockSettlement, ...(settlements || [])];
    await storage.setItem('finlit_settlements', JSON.stringify(updatedSettlements));
    set({ settlements: updatedSettlements });

    // Instantly update balances locally
    get().recalculateLocalBalances();

    try {
      const res = await api.post('/settlements', payload);
      if (res.data.updatedBalances) {
        set({ balances: res.data.updatedBalances });
      } else {
        get().recalculateLocalBalances();
      }
      await get().fetchDashboardData();
      return { success: true, settlement: res.data.settlement };
    } catch (err) {
      const updatedQueue = [...offlineQueue, payload];
      await storage.setItem('finlit_offline_queue', JSON.stringify(updatedQueue));
      set({ offlineQueue: updatedQueue });
      return { success: true, offline: true };
    }
  },

  // Admin Remove Member
  removeMember: async (memberId) => {
    const { room } = get();
    if (!room) return { success: false, error: 'No room active' };
    try {
      const roomId = room.id || room._id;
      const res = await api.delete(`/rooms/${roomId}/members/${memberId}`);
      set({ members: res.data.members || [] });
      await get().fetchDashboardData();
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not remove member';
      return { success: false, error: msg };
    }
  },
}));
