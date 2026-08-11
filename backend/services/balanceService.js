const ExpenseV2 = require('../models/ExpenseV2');
const Settlement = require('../models/Settlement');
const Member = require('../models/Member');
const simplifyDebts = require('../utils/simplifyDebts');

/**
 * Calculates net balances and debt simplification for a room.
 * @param {String} roomId
 * @returns {Object} { memberBalances, netTransactions, rawPairwise }
 */
const calculateRoomBalances = async (roomId) => {
  const members = await Member.find({ roomId, isActive: true });
  const memberMap = {};
  const balances = {};

  members.forEach((m) => {
    const id = m._id.toString();
    memberMap[id] = { id, name: m.name, role: m.role, avatar: m.avatar };
    balances[id] = 0;
  });

  // Fetch all shared expenses for room
  const expenses = await ExpenseV2.find({ roomId, expenseScope: 'shared' });

  expenses.forEach((expense) => {
    const payerId = expense.paidBy.toString();
    if (balances[payerId] !== undefined) {
      balances[payerId] += expense.amount;
    }

    if (expense.participants && expense.participants.length > 0) {
      expense.participants.forEach((p) => {
        const participantId = p.memberId.toString();
        if (balances[participantId] !== undefined) {
          balances[participantId] -= p.share;
        }
      });
    }
  });

  // Fetch all settlements for room
  const settlements = await Settlement.find({ roomId });

  settlements.forEach((s) => {
    const fromId = s.fromMember.toString();
    const toId = s.toMember.toString();
    // Paid by fromId to toId -> fromId's balance increases (paid off debt), toId's decreases
    if (balances[fromId] !== undefined) balances[fromId] += s.amount;
    if (balances[toId] !== undefined) balances[toId] -= s.amount;
  });

  // Calculate net balances per member
  const memberBalances = {};
  Object.keys(balances).forEach((id) => {
    const net = parseFloat(balances[id].toFixed(2));
    memberBalances[id] = {
      member: memberMap[id] || { id, name: 'Unknown' },
      netBalance: net,
      owedToMe: net > 0.01 ? net : 0,
      iOwe: net < -0.01 ? Math.abs(net) : 0,
    };
  });

  // Run debt simplification algorithm
  const simplifiedRaw = simplifyDebts(balances);
  const netTransactions = simplifiedRaw.map((t) => ({
    from: memberMap[t.from] || { id: t.from, name: 'Unknown' },
    to: memberMap[t.to] || { id: t.to, name: 'Unknown' },
    amount: t.amount,
  }));

  return {
    memberBalances,
    netTransactions,
    rawBalances: balances,
  };
};

/**
 * Gets specific member balance overview
 */
const getMemberBalanceOverview = async (roomId, targetMemberId) => {
  const roomData = await calculateRoomBalances(roomId);
  const targetIdStr = targetMemberId.toString();
  const currentMemberBalance = roomData.memberBalances[targetIdStr] || {
    netBalance: 0,
    owedToMe: 0,
    iOwe: 0,
  };

  // Filter transactions involving target member
  const oweList = [];
  const owedByList = [];

  roomData.netTransactions.forEach((t) => {
    if (t.from.id === targetIdStr) {
      oweList.push({
        memberId: t.to.id,
        name: t.to.name,
        amount: t.amount,
        member: t.to,
      });
    } else if (t.to.id === targetIdStr) {
      owedByList.push({
        memberId: t.from.id,
        name: t.from.name,
        amount: t.amount,
        member: t.from,
      });
    }
  });

  // Also fetch personal spending total for target member
  const personalExpenses = await ExpenseV2.find({
    roomId,
    paidBy: targetMemberId,
    expenseScope: 'personal',
  });
  const totalPersonalSpending = personalExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  return {
    summary: {
      netBalance: currentMemberBalance.netBalance,
      totalIOwe: currentMemberBalance.iOwe,
      totalOwedToMe: currentMemberBalance.owedToMe,
      totalPersonalSpending,
    },
    youOwe: oweList,
    youAreOwed: owedByList,
    allMemberBalances: roomData.memberBalances,
    simplifiedSettlementPlan: roomData.netTransactions,
  };
};

module.exports = {
  calculateRoomBalances,
  getMemberBalanceOverview,
};
