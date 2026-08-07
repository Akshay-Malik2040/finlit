const ExpenseV2 = require('../models/ExpenseV2');
const Member = require('../models/Member');
const { getMemberBalanceOverview } = require('../services/balanceService');

// @desc    Add a new expense (v2 with quick-add & idempotency support)
// @route   POST /api/expenses
// @access  Protected
const addExpense = async (req, res) => {
  try {
    const {
      amount,
      description,
      category,
      participantIds,
      splits,
      splitType = 'equal',
      expenseScope = 'shared',
      notes,
      source = 'quick',
      clientExpenseId,
    } = req.body;

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: 'Valid positive amount required' });
    }

    // Idempotency check for offline sync retries
    if (clientExpenseId) {
      const existing = await ExpenseV2.findOne({
        roomId: req.room._id,
        clientExpenseId,
      })
        .populate('paidBy', 'name avatar')
        .populate('participants.memberId', 'name avatar');

      if (existing) {
        // Already processed cleanly! Return existing object
        const balances = await getMemberBalanceOverview(req.room._id, req.member._id);
        return res.status(200).json({
          expense: existing,
          balances,
          isDuplicate: true,
        });
      }
    }

    // Determine participants & split shares
    let computedParticipants = [];

    if (expenseScope === 'personal') {
      // Personal expense: only paidBy gets 100% share
      computedParticipants = [
        {
          memberId: req.member._id,
          share: numericAmount,
        },
      ];
    } else {
      // Shared expense
      if (splits && Array.isArray(splits) && splits.length > 0) {
        computedParticipants = splits.map((s) => ({
          memberId: s.memberId,
          share: parseFloat(s.share),
        }));
      } else if (participantIds && Array.isArray(participantIds) && participantIds.length > 0) {
        // Equal split among provided participant IDs
        const equalShare = parseFloat((numericAmount / participantIds.length).toFixed(2));
        computedParticipants = participantIds.map((id) => ({
          memberId: id,
          share: equalShare,
        }));
      } else {
        // DEFAULT: Select all active room members by default!
        const allMembers = await Member.find({ roomId: req.room._id, isActive: true });
        const count = allMembers.length;
        const equalShare = parseFloat((numericAmount / count).toFixed(2));
        computedParticipants = allMembers.map((m) => ({
          memberId: m._id,
          share: equalShare,
        }));
      }
    }

    const expense = await ExpenseV2.create({
      roomId: req.room._id,
      paidBy: req.member._id,
      amount: numericAmount,
      description: description ? description.trim() : 'Shared Expense',
      category: category || 'Other',
      participants: computedParticipants,
      splitType,
      expenseScope,
      notes: notes || '',
      source,
      clientExpenseId: clientExpenseId || null,
    });

    const populatedExpense = await ExpenseV2.findById(expense._id)
      .populate('paidBy', 'name avatar')
      .populate('participants.memberId', 'name avatar');

    const balances = await getMemberBalanceOverview(req.room._id, req.member._id);

    res.status(201).json({
      expense: populatedExpense,
      balances,
    });
  } catch (error) {
    console.error('Add Expense Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get room expenses with pagination & filters
// @route   GET /api/expenses
// @access  Protected
const getExpenses = async (req, res) => {
  try {
    const { scope, category, limit = 50, month } = req.query;
    const query = { roomId: req.room._id };

    if (scope && ['shared', 'personal'].includes(scope)) {
      query.expenseScope = scope;
    }

    if (category) {
      query.category = category;
    }

    if (month) {
      // month format e.g. YYYY-MM
      const start = new Date(`${month}-01T00:00:00.000Z`);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    }

    const expenses = await ExpenseV2.find(query)
      .populate('paidBy', 'name avatar')
      .populate('participants.memberId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get member balances overview
// @route   GET /api/expenses/balances
// @access  Protected
const getBalances = async (req, res) => {
  try {
    const overview = await getMemberBalanceOverview(req.room._id, req.member._id);
    res.status(200).json(overview);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete an expense
// @route   DELETE /api/expenses/:id
// @access  Protected
const deleteExpense = async (req, res) => {
  try {
    const expense = await ExpenseV2.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    if (expense.roomId.toString() !== req.room._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized room access' });
    }

    // Only owner or admin can delete
    if (expense.paidBy.toString() !== req.member._id.toString() && req.member.role !== 'admin') {
      return res.status(403).json({ message: 'Only the payer or room admin can delete this expense' });
    }

    await expense.deleteOne();
    const updatedBalances = await getMemberBalanceOverview(req.room._id, req.member._id);

    res.status(200).json({
      message: 'Expense deleted successfully',
      balances: updatedBalances,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get monthly household summary breakdown
// @route   GET /api/expenses/monthly-summary
// @access  Protected
const getMonthlySummary = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const sharedExpenses = await ExpenseV2.find({
      roomId: req.room._id,
      expenseScope: 'shared',
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
    });

    const categoryBreakdown = {};
    let totalMonthlyShared = 0;

    sharedExpenses.forEach((exp) => {
      totalMonthlyShared += exp.amount;
      categoryBreakdown[exp.category] = (categoryBreakdown[exp.category] || 0) + exp.amount;
    });

    res.status(200).json({
      monthName: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
      totalMonthlyShared,
      categoryBreakdown,
      expenseCount: sharedExpenses.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addExpense,
  getExpenses,
  getBalances,
  deleteExpense,
  getMonthlySummary,
};