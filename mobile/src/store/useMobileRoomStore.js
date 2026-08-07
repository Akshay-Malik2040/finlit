import { create } from 'zustand';
import api, { getOrCreateDeviceId } from '../api/client';
import storage from '../storage/asyncStorage';

export const useMobileRoomStore = create((set, get) => ({
  room: null,
  currentMember: null,
  members: [],
  myRooms: [],
  recoveryCode: null,

  expenses: [],
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
      const recoveryCode = await storage.getItem('finlit_recovery_code');
      const queueRaw = await storage.getItem('finlit_offline_queue');

      const room = roomRaw ? JSON.parse(roomRaw) : null;
      const currentMember = memberRaw ? JSON.parse(memberRaw) : null;
      const offlineQueue = queueRaw ? JSON.parse(queueRaw) : [];

      set({ room, currentMember, recoveryCode, offlineQueue });

      if (room) {
        await get().fetchDashboardData();
      }
    } catch (err) {
      console.error('Init session error:', err);
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

  // Fetch Expenses & Balances
  fetchDashboardData: async () => {
    const { room } = get();
    if (!room) return;
    set({ isLoading: true });
    try {
      const [expensesRes, balancesRes, summaryRes, roomRes] = await Promise.all([
        api.get('/expenses'),
        api.get('/expenses/balances'),
        api.get('/expenses/monthly-summary'),
        api.get(`/rooms/${room.id || room._id}`),
      ]);

      set({
        expenses: expensesRes.data || [],
        balances: balancesRes.data || get().balances,
        monthlySummary: summaryRes.data || null,
        members: roomRes.data?.members || [],
        isLoading: false,
      });
    } catch (err) {
      console.error('Fetch mobile dashboard data error:', err);
      set({ isLoading: false });
    }
  },

  // Add Expense with Idempotency & Offline Queueing
  addExpense: async (expensePayload) => {
    const { room, currentMember, members, offlineQueue } = get();
    if (!room || !currentMember) return { success: false, error: 'No active room session' };

    const clientExpenseId = 'exp_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    const fullPayload = {
      ...expensePayload,
      clientExpenseId,
    };

    // Optimistic Local Store Update
    const optimisticExpense = {
      _id: clientExpenseId,
      description: fullPayload.description || 'Shared Expense',
      amount: parseFloat(fullPayload.amount),
      category: fullPayload.category || 'General',
      expenseScope: fullPayload.expenseScope || 'shared',
      paidBy: currentMember,
      participants: (fullPayload.participantIds || []).map((id) => ({
        memberId: members.find((m) => (m._id || m.id) === id) || { _id: id, name: 'Flatmate' },
        share: parseFloat(fullPayload.amount) / (fullPayload.participantIds?.length || 1),
      })),
      createdAt: new Date().toISOString(),
      isPendingSync: false,
    };

    set({ expenses: [optimisticExpense, ...get().expenses] });

    try {
      const res = await api.post('/expenses', fullPayload);
      set({
        expenses: [res.data.expense, ...get().expenses.filter((e) => e._id !== clientExpenseId)],
        balances: res.data.balances || get().balances,
      });
      await get().fetchDashboardData();
      return { success: true };
    } catch (err) {
      // Offline fallback: Queue for later sync
      optimisticExpense.isPendingSync = true;
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
        await api.post('/expenses', pendingItem);
      } catch (err) {
        remainingQueue.push(pendingItem);
      }
    }

    await storage.setItem('finlit_offline_queue', JSON.stringify(remainingQueue));
    set({ offlineQueue: remainingQueue, isSyncing: false });
    await get().fetchDashboardData();
  },

  // Record Settlement
  createSettlement: async (toMemberId, amount, paymentMethod = 'UPI') => {
    try {
      const res = await api.post('/settlements', { toMemberId, amount, paymentMethod });
      await get().fetchDashboardData();
      return { success: true, settlement: res.data.settlement };
    } catch (err) {
      const msg = err.response?.data?.message || 'Settlement failed';
      return { success: false, error: msg };
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
