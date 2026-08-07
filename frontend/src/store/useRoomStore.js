import { create } from 'zustand';
import api, { getOrCreateDeviceId } from '../api/axiosConfig';

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
  members: [],
  recoveryCode: localStorage.getItem('finlit_recovery_code') || localStorage.getItem('splitsense_recovery_code') || null,

  expenses: [],
  balances: {
    summary: { netBalance: 0, totalIOwe: 0, totalOwedToMe: 0, totalPersonalSpending: 0 },
    youOwe: [],
    youAreOwed: [],
    simplifiedSettlementPlan: [],
    allMemberBalances: {},
  },
  monthlySummary: null,
  recurringExpenses: [],

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

    // Update multi-room registry
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

  // Switch to a different joined room/group (e.g., trip, flat, vacation)
  switchRoom: async (roomId) => {
    const target = get().myRooms.find((r) => (r.room.id || r.room._id) === roomId);
    if (!target) return;

    get().saveSession(target.room, target.member, target.recoveryCode);
    await get().fetchDashboardData();
  },

  // Leave/Remove a specific room session from multi-room list
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

    localStorage.removeItem('splitsense_room_id');
    localStorage.removeItem('splitsense_member_id');
    localStorage.removeItem('splitsense_room');
    localStorage.removeItem('splitsense_member');
    localStorage.removeItem('splitsense_recovery_code');
    localStorage.removeItem('splitsense_joined_rooms');
    set({
      room: null,
      currentMember: null,
      members: [],
      recoveryCode: null,
      expenses: [],
      myRooms: [],
    });
  },

  // Create Room (Accountless - supports multiple rooms/trips)
  createRoom: async (name, creatorName) => {
    set({ isLoading: true, error: null });
    try {
      const deviceId = getOrCreateDeviceId();
      const res = await api.post('/rooms', { name, creatorName, deviceId });
      const { room, member, recoveryCode } = res.data;

      get().saveSession(room, member, recoveryCode);
      await get().fetchDashboardData();
      set({ isLoading: false });
      return { success: true, room, member, recoveryCode };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create room';
      set({ isLoading: false, error: msg });
      return { success: false, error: msg };
    }
  },

  // Join Room (Accountless - supports multiple rooms/trips)
  joinRoom: async (joinCode, name) => {
    set({ isLoading: true, error: null });
    try {
      const deviceId = getOrCreateDeviceId();
      const res = await api.post('/rooms/join', { joinCode, name, deviceId });
      const { room, member, members, recoveryCode } = res.data;

      get().saveSession(room, member, recoveryCode);
      set({ members, isLoading: false });
      await get().fetchDashboardData();
      return { success: true, room, member, recoveryCode };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to join room';
      set({ isLoading: false, error: msg });
      return { success: false, error: msg };
    }
  },

  // Recover Room Session using Recovery Code
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

  // Fetch Room details and active members
  fetchRoomDetails: async () => {
    const { room } = get();
    if (!room) return;
    try {
      const roomId = room.id || room._id;
      const res = await api.get(`/rooms/${roomId}`);
      set({
        room: res.data.room,
        currentMember: res.data.currentMember,
        members: res.data.members,
      });
    } catch (err) {
      console.error('Fetch Room Details Error:', err);
    }
  },

  // Remove member from room (Admin only)
  removeMember: async (memberId) => {
    const { room } = get();
    if (!room) return { success: false, error: 'No active room' };
    try {
      const roomId = room.id || room._id;
      const res = await api.delete(`/rooms/${roomId}/members/${memberId}`);
      set({ members: res.data.members });
      await get().fetchDashboardData();
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to remove member';
      return { success: false, error: msg };
    }
  },

  // Fetch Expenses & Balances
  fetchDashboardData: async () => {
    const { room } = get();
    if (!room) return;
    set({ isLoading: true });
    try {
      const [expensesRes, balancesRes, summaryRes, membersRes] = await Promise.all([
        api.get('/expenses'),
        api.get('/expenses/balances'),
        api.get('/expenses/monthly-summary'),
        api.get(`/rooms/${room.id || room._id}`),
      ]);

      set({
        expenses: expensesRes.data,
        balances: balancesRes.data,
        monthlySummary: summaryRes.data,
        members: membersRes.data.members,
        isLoading: false,
      });
    } catch (err) {
      console.error('Fetch Dashboard Error:', err);
      set({ isLoading: false });
    }
  },

  // Add Expense (with offline queueing support)
  addExpense: async (expensePayload) => {
    const clientExpenseId = 'exp_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const fullPayload = { ...expensePayload, clientExpenseId };

    if (!navigator.onLine) {
      const queue = [...get().offlineQueue, fullPayload];
      localStorage.setItem('splitsense_offline_queue', JSON.stringify(queue));
      set({ offlineQueue: queue });

      const mockExpense = {
        _id: clientExpenseId,
        description: fullPayload.description || 'Shared Expense',
        amount: parseFloat(fullPayload.amount),
        category: fullPayload.category || 'Other',
        paidBy: get().currentMember,
        participants: (fullPayload.participantIds || []).map((id) => ({
          memberId: get().members.find((m) => m._id === id || m.id === id) || { _id: id, name: 'Flatmate' },
          share: parseFloat(fullPayload.amount) / (fullPayload.participantIds?.length || 1),
        })),
        createdAt: new Date().toISOString(),
        isPendingSync: true,
      };

      set({ expenses: [mockExpense, ...get().expenses] });
      return { success: true, offline: true };
    }

    try {
      const res = await api.post('/expenses', fullPayload);
      set({
        expenses: [res.data.expense, ...get().expenses.filter((e) => e._id !== clientExpenseId)],
        balances: res.data.balances || get().balances,
      });
      get().fetchDashboardData();
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add expense';
      return { success: false, error: msg };
    }
  },

  // Process offline pending expenses sync queue
  syncOfflineQueue: async () => {
    const queue = get().offlineQueue;
    if (queue.length === 0 || get().isSyncing) return;

    set({ isSyncing: true });
    const remainingQueue = [];

    for (const pendingItem of queue) {
      try {
        await api.post('/expenses', pendingItem);
      } catch (err) {
        console.error('Failed to sync item:', pendingItem, err);
        remainingQueue.push(pendingItem);
      }
    }

    localStorage.setItem('splitsense_offline_queue', JSON.stringify(remainingQueue));
    set({ offlineQueue: remainingQueue, isSyncing: false });
    await get().fetchDashboardData();
  },

  // Record Settlement (Debt Payment)
  createSettlement: async (toMemberId, amount, paymentMethod = 'UPI', notes = '') => {
    try {
      const res = await api.post('/settlements', { toMemberId, amount, paymentMethod, notes });
      set({ balances: res.data.updatedBalances });
      await get().fetchDashboardData();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Settlement failed' };
    }
  },

  // AI Natural Language Parser helper
  parseExpenseWithAI: async (text) => {
    try {
      const res = await api.post('/ai/parse-expense', { text });
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'AI parsing failed' };
    }
  },

  // Ask SplitSense factual Q&A
  askAISense: async (question) => {
    try {
      const res = await api.post('/ai/ask', { question });
      return { success: true, answer: res.data.answer };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Ask SplitSense failed' };
    }
  },
}));
