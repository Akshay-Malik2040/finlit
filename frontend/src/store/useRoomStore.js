import { create } from 'zustand';
import api, { getOrCreateDeviceId } from '../api/axiosConfig';
import { computeLocalBalances } from '../utils/localBalanceCalculator';

const getInitialRooms = () => {
  try {
    return JSON.parse(localStorage.getItem('finlit_joined_rooms') || localStorage.getItem('splitsense_joined_rooms') || '[]');
  } catch {
    return [];
  }
};

export const useRoomStore = create((set, get) => ({
  myRooms: getInitialRooms(),
  room: JSON.parse(localStorage.getItem('finlit_room') || localStorage.getItem('splitsense_room') || 'null'),
  currentMember: JSON.parse(localStorage.getItem('finlit_member') || localStorage.getItem('splitsense_member') || 'null'),
  members: JSON.parse(localStorage.getItem('finlit_members') || '[]'),

  expenses: JSON.parse(localStorage.getItem('finlit_expenses') || '[]'),
  balances: JSON.parse(localStorage.getItem('finlit_balances') || '{"summary":{"netBalance":0,"totalIOwe":0,"totalOwedToMe":0},"youOwe":[],"youAreOwed":[],"simplifiedSettlementPlan":[],"allMemberBalances":{}}'),
  monthlySummary: null,
  settlements: JSON.parse(localStorage.getItem('finlit_settlements') || '[]'),

  isLoading: false,
  isSyncing: false,
  error: null,
  offlineQueue: JSON.parse(localStorage.getItem('finlit_offline_queue') || localStorage.getItem('splitsense_offline_queue') || '[]'),

  // Save current active room & update joined rooms list
  saveSession: (room, member, recoveryCode = null) => {
    const roomId = room.id || room._id;
    const memberId = member.id || member._id;

    localStorage.setItem('finlit_room_id', roomId);
    localStorage.setItem('finlit_member_id', memberId);
    localStorage.setItem('finlit_room', JSON.stringify(room));
    localStorage.setItem('finlit_member', JSON.stringify(member));

    if (recoveryCode) {
      localStorage.setItem('finlit_recovery_code', recoveryCode);
    }

    const currentRooms = get().myRooms || [];
    const existingIndex = currentRooms.findIndex(
      (r) => (r.room.id || r.room._id) === roomId
    );

    const roomEntry = {
      room,
      member,
      recoveryCode: recoveryCode || (existingIndex >= 0 ? currentRooms[existingIndex].recoveryCode : null),
    };

    let updatedRooms = [];
    if (existingIndex >= 0) {
      updatedRooms = [...currentRooms];
      updatedRooms[existingIndex] = roomEntry;
    } else {
      updatedRooms = [roomEntry, ...currentRooms];
    }

    localStorage.setItem('finlit_joined_rooms', JSON.stringify(updatedRooms));

    set({
      room,
      currentMember: member,
      recoveryCode: roomEntry.recoveryCode,
      myRooms: updatedRooms,
    });
  },

  switchRoom: async (roomId) => {
    const target = get().myRooms.find((r) => (r.room.id || r.room._id) === roomId);
    if (!target) return;

    get().saveSession(target.room, target.member, target.recoveryCode);
    await get().fetchDashboardData();
  },

  leaveRoom: (targetRoomId) => {
    const updated = get().myRooms.filter((r) => (r.room.id || r.room._id) !== targetRoomId);
    localStorage.setItem('finlit_joined_rooms', JSON.stringify(updated));

    if (updated.length > 0) {
      const nextRoom = updated[0];
      get().saveSession(nextRoom.room, nextRoom.member, nextRoom.recoveryCode);
      get().fetchDashboardData();
    } else {
      get().clearSession();
    }
  },

  clearSession: () => {
    localStorage.removeItem('finlit_room_id');
    localStorage.removeItem('finlit_member_id');
    localStorage.removeItem('finlit_room');
    localStorage.removeItem('finlit_member');
    localStorage.removeItem('finlit_recovery_code');
    localStorage.removeItem('finlit_joined_rooms');
    localStorage.removeItem('finlit_expenses');
    localStorage.removeItem('finlit_balances');
    localStorage.removeItem('finlit_offline_queue');

    set({
      room: null,
      currentMember: null,
      members: [],
      recoveryCode: null,
      expenses: [],
      balances: { summary: { netBalance: 0, totalIOwe: 0, totalOwedToMe: 0 }, youOwe: [], youAreOwed: [], simplifiedSettlementPlan: [], allMemberBalances: {} },
      myRooms: [],
      offlineQueue: [],
    });
  },

  createRoom: async (name, creatorName) => {
    set({ isLoading: true, error: null });
    try {
      const deviceId = getOrCreateDeviceId();
      const res = await api.post('/rooms', { name, creatorName, deviceId });
      const { room, member, recoveryCode } = res.data;
      get().saveSession(room, member, recoveryCode);
      await get().fetchDashboardData();
      set({ isLoading: false });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create room';
      set({ isLoading: false, error: msg });
      return { success: false, error: msg };
    }
  },

  joinRoom: async (joinCode, name) => {
    set({ isLoading: true, error: null });
    try {
      const deviceId = getOrCreateDeviceId();
      const res = await api.post('/rooms/join', { joinCode, name, deviceId });
      const { room, member, members, recoveryCode } = res.data;
      get().saveSession(room, member, recoveryCode);
      set({ members: members || [] });
      await get().fetchDashboardData();
      set({ isLoading: false });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to join room';
      set({ isLoading: false, error: msg });
      return { success: false, error: msg };
    }
  },

  recoverRoom: async (recoveryCode) => {
    set({ isLoading: true, error: null });
    try {
      const deviceId = getOrCreateDeviceId();
      const res = await api.post('/rooms/recover', { recoveryCode, deviceId });
      const { room, member } = res.data;

      get().saveSession(room, member);
      await get().fetchDashboardData();
      set({ isLoading: false });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid recovery code';
      set({ isLoading: false, error: msg });
      return { success: false, error: msg };
    }
  },

  fetchRoomDetails: async () => {
    const { room } = get();
    if (!room) return;
    try {
      const roomId = room.id || room._id;
      const res = await api.get(`/rooms/${roomId}`);
      const members = res.data.members || [];
      localStorage.setItem('finlit_members', JSON.stringify(members));
      set({
        room: res.data.room,
        currentMember: res.data.currentMember,
        members,
      });
    } catch (err) {
      console.error('Fetch Room Details Error:', err);
      if (err.response?.status === 401) {
        get().clearSession();
      }
    }
  },

  removeMember: async (memberId) => {
    const { room } = get();
    if (!room) return { success: false, error: 'No active room' };
    try {
      const roomId = room.id || room._id;
      const res = await api.delete(`/rooms/${roomId}/members/${memberId}`);
      set({ members: res.data.members || [] });
      await get().fetchDashboardData();
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to remove member';
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
    localStorage.setItem('finlit_balances', JSON.stringify(computedBalances));
    set({ balances: computedBalances });
    return computedBalances;
  },

  // Fetch Expenses & Balances (with offline fallback & local calculation)
  fetchDashboardData: async () => {
    const { room, currentMember } = get();
    if (!room) return;
    set({ isLoading: true });
    try {
      const [expensesRes, balancesRes, summaryRes, membersRes] = await Promise.all([
        api.get('/expenses'),
        api.get('/expenses/balances'),
        api.get('/expenses/monthly-summary'),
        api.get(`/rooms/${room.id || room._id}`),
      ]);

      const expenses = expensesRes.data || [];
      const members = membersRes.data.members || [];

      localStorage.setItem('finlit_expenses', JSON.stringify(expenses));
      localStorage.setItem('finlit_members', JSON.stringify(members));

      // Calculate balances (prefer server balances if online, fallback to local calculator)
      let balances = balancesRes.data;
      if (!balances || !balances.summary) {
        balances = computeLocalBalances({
          members,
          expenses,
          settlements: get().settlements,
          currentMemberId: currentMember?._id || currentMember?.id,
        });
      }
      localStorage.setItem('finlit_balances', JSON.stringify(balances));

      set({
        expenses,
        balances,
        monthlySummary: summaryRes.data,
        members,
        isLoading: false,
      });

      // Auto-trigger offline queue sync if pending items exist and online
      if (get().offlineQueue.length > 0 && navigator.onLine) {
        get().syncOfflineQueue();
      }
    } catch (err) {
      console.warn('Network offline or fetch error, loading cached local state:', err);
      if (err.response?.status === 401) {
        get().clearSession();
        return;
      }
      // OFFLINE FALLBACK: Recalculate balances locally from cached expenses & members
      get().recalculateLocalBalances();
      set({ isLoading: false });
    }
  },

  // Add Expense (with instant offline mode & local balance calculation)
  addExpense: async (expensePayload) => {
    const { currentMember, members, expenses } = get();
    const clientExpenseId = 'exp_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const fullPayload = { ...expensePayload, clientExpenseId };

    const participantIds = fullPayload.participantIds || [];
    const equalShare = participantIds.length > 0 ? parseFloat((parseFloat(fullPayload.amount) / participantIds.length).toFixed(2)) : parseFloat(fullPayload.amount);

    const mockExpense = {
      _id: clientExpenseId,
      description: fullPayload.description || 'Shared Expense',
      amount: parseFloat(fullPayload.amount),
      category: fullPayload.category || 'Other',
      expenseScope: fullPayload.expenseScope || 'shared',
      paidBy: currentMember,
      participants: participantIds.map((id) => {
        const found = members.find((m) => (m._id || m.id) === id);
        return {
          memberId: found || { _id: id, id, name: 'Flatmate' },
          share: equalShare,
        };
      }),
      createdAt: new Date().toISOString(),
      isPendingSync: true,
    };

    // Instant local state update & local balance calculation
    const updatedExpenses = [mockExpense, ...expenses];
    localStorage.setItem('finlit_expenses', JSON.stringify(updatedExpenses));
    set({ expenses: updatedExpenses });
    get().recalculateLocalBalances();

    // If offline, save to queue and return immediately
    if (!navigator.onLine) {
      const queue = [...get().offlineQueue, fullPayload];
      localStorage.setItem('finlit_offline_queue', JSON.stringify(queue));
      set({ offlineQueue: queue });
      return { success: true, offline: true };
    }

    // Attempt online API post
    try {
      const res = await api.post('/expenses', fullPayload);
      const serverExpense = res.data.expense;
      const finalExpenses = [serverExpense, ...get().expenses.filter((e) => e._id !== clientExpenseId)];

      localStorage.setItem('finlit_expenses', JSON.stringify(finalExpenses));
      set({ expenses: finalExpenses });

      if (res.data.balances) {
        localStorage.setItem('finlit_balances', JSON.stringify(res.data.balances));
        set({ balances: res.data.balances });
      } else {
        get().recalculateLocalBalances();
      }

      get().fetchDashboardData();
      return { success: true };
    } catch (err) {
      console.warn('Expense POST failed (queued for sync):', err);
      const queue = [...get().offlineQueue, fullPayload];
      localStorage.setItem('finlit_offline_queue', JSON.stringify(queue));
      set({ offlineQueue: queue });
      return { success: true, offline: true };
    }
  },

  // Process offline pending expenses & settlements sync queue
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

    localStorage.setItem('finlit_offline_queue', JSON.stringify(remainingQueue));
    set({ offlineQueue: remainingQueue, isSyncing: false });

    await get().fetchDashboardData();
  },

  // Record Settlement (Debt Payment)
  createSettlement: async (toMemberId, amount, paymentMethod = 'UPI', notes = '') => {
    const { currentMember, settlements } = get();
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
    localStorage.setItem('finlit_settlements', JSON.stringify(updatedSettlements));
    set({ settlements: updatedSettlements });

    // Instantly update balances locally
    get().recalculateLocalBalances();

    if (!navigator.onLine) {
      const queue = [...get().offlineQueue, payload];
      localStorage.setItem('finlit_offline_queue', JSON.stringify(queue));
      set({ offlineQueue: queue });
      return { success: true, offline: true };
    }

    try {
      const res = await api.post('/settlements', payload);
      if (res.data.updatedBalances) {
        set({ balances: res.data.updatedBalances });
      } else {
        get().recalculateLocalBalances();
      }
      await get().fetchDashboardData();
      return { success: true };
    } catch (err) {
      const queue = [...get().offlineQueue, payload];
      localStorage.setItem('finlit_offline_queue', JSON.stringify(queue));
      set({ offlineQueue: queue });
      return { success: true, offline: true };
    }
  },
}));
