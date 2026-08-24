/**
 * Client-Side Debt Simplification Engine
 */
export function simplifyDebts(balances) {
  let debtors = [];
  let creditors = [];

  for (const [user, amount] of Object.entries(balances)) {
    if (amount < -0.01) debtors.push({ user, amount });
    else if (amount > 0.01) creditors.push({ user, amount });
  }

  debtors.sort((a, b) => a.amount - b.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  let transactions = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    let debtor = debtors[i];
    let creditor = creditors[j];
    let amountToSettle = Math.min(Math.abs(debtor.amount), creditor.amount);

    transactions.push({
      from: debtor.user,
      to: creditor.user,
      amount: parseFloat(amountToSettle.toFixed(2)),
    });

    debtor.amount += amountToSettle;
    creditor.amount -= amountToSettle;

    if (Math.abs(debtor.amount) < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }

  return transactions;
}

/**
 * Computes exact room balances, "You Owe", "You're Owed", and simplified debt plan client-side.
 * Works 100% offline with zero network dependency!
 */
export function computeLocalBalances({ members = [], expenses = [], settlements = [], currentMemberId }) {
  const memberMap = {};
  const rawBalances = {};

  (members || []).forEach((m) => {
    const id = (m._id || m.id || m).toString();
    if (!id) return;
    memberMap[id] = { id, _id: id, name: m.name || 'Flatmate', role: m.role || 'member', avatar: m.avatar || '' };
    rawBalances[id] = 0;
  });

  // Process shared expenses
  (expenses || []).forEach((e) => {
    if (e.expenseScope === 'personal') return;

    const payerId = typeof e.paidBy === 'object' ? (e.paidBy?._id || e.paidBy?.id) : e.paidBy;
    const payerStr = payerId ? payerId.toString() : null;

    if (payerStr && rawBalances[payerStr] !== undefined) {
      rawBalances[payerStr] += parseFloat(e.amount || 0);
    }

    if (e.participants && Array.isArray(e.participants)) {
      e.participants.forEach((p) => {
        const partId = typeof p.memberId === 'object' ? (p.memberId?._id || p.memberId?.id) : p.memberId;
        const partStr = partId ? partId.toString() : null;
        if (partStr && rawBalances[partStr] !== undefined) {
          rawBalances[partStr] -= parseFloat(p.share || 0);
        }
      });
    }
  });

  // Process settlements
  (settlements || []).forEach((s) => {
    const fromId = typeof s.fromMember === 'object' ? (s.fromMember?._id || s.fromMember?.id) : s.fromMember;
    const toId = typeof s.toMember === 'object' ? (s.toMember?._id || s.toMember?.id) : s.toMember;

    const fromStr = fromId ? fromId.toString() : null;
    const toStr = toId ? toId.toString() : null;

    if (fromStr && rawBalances[fromStr] !== undefined) rawBalances[fromStr] += parseFloat(s.amount || 0);
    if (toStr && rawBalances[toStr] !== undefined) rawBalances[toStr] -= parseFloat(s.amount || 0);
  });

  // Format member balances map
  const allMemberBalances = {};
  Object.keys(rawBalances).forEach((id) => {
    const net = parseFloat(rawBalances[id].toFixed(2));
    allMemberBalances[id] = {
      member: memberMap[id] || { id, _id: id, name: 'Flatmate' },
      netBalance: net,
      owedToMe: net > 0.01 ? net : 0,
      iOwe: net < -0.01 ? Math.abs(net) : 0,
    };
  });

  // Run debt simplification
  const rawTransactions = simplifyDebts(rawBalances);
  const simplifiedSettlementPlan = rawTransactions.map((t) => ({
    from: memberMap[t.from] || { id: t.from, _id: t.from, name: 'Flatmate' },
    to: memberMap[t.to] || { id: t.to, _id: t.to, name: 'Flatmate' },
    amount: t.amount,
  }));

  // Filter for target member (current user)
  const targetIdStr = currentMemberId ? currentMemberId.toString() : '';
  const currentNet = rawBalances[targetIdStr] ? parseFloat(rawBalances[targetIdStr].toFixed(2)) : 0;

  const youOwe = [];
  const youAreOwed = [];
  let totalIOwe = 0;
  let totalOwedToMe = 0;

  simplifiedSettlementPlan.forEach((t) => {
    const fromId = (t.from._id || t.from.id).toString();
    const toId = (t.to._id || t.to.id).toString();

    if (fromId === targetIdStr) {
      youOwe.push({ member: t.to, amount: t.amount });
      totalIOwe += t.amount;
    } else if (toId === targetIdStr) {
      youAreOwed.push({ member: t.from, amount: t.amount });
      totalOwedToMe += t.amount;
    }
  });

  return {
    summary: {
      netBalance: currentNet,
      totalIOwe: parseFloat(totalIOwe.toFixed(2)),
      totalOwedToMe: parseFloat(totalOwedToMe.toFixed(2)),
    },
    youOwe,
    youAreOwed,
    simplifiedSettlementPlan,
    allMemberBalances,
  };
}
