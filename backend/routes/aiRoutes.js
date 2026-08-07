const express = require('express');
const router = express.Router();
const Member = require('../models/Member');
const ExpenseV2 = require('../models/ExpenseV2');
const { protectMember } = require('../middlewares/memberAuth');
const { getMemberBalanceOverview } = require('../services/balanceService');
const {
  extractExpenseData,
  extractReceiptItems,
  answerAskSplitSense,
  generateFinancialInsights,
} = require('../utils/aiService');

router.use(protectMember);

// @desc    Parse natural text into structured expense payload
// @route   POST /api/ai/parse-expense
router.post('/parse-expense', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ message: 'Prompt text is required' });
    }

    const roomMembers = await Member.find({ roomId: req.room._id, isActive: true });
    const parsedData = await extractExpenseData(text, roomMembers);

    res.status(200).json(parsedData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Parse receipt text into line items
// @route   POST /api/ai/receipt
router.post('/receipt', async (req, res) => {
  try {
    const { receiptText } = req.body;
    if (!receiptText) {
      return res.status(400).json({ message: 'Receipt text or OCR input required' });
    }

    const parsedReceipt = await extractReceiptItems(receiptText);
    res.status(200).json(parsedReceipt);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Ask SplitSense factual Q&A over verified database records
// @route   POST /api/ai/ask
router.post('/ask', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ message: 'Question required' });
    }

    // 1. Fetch factual database facts first
    const balancesOverview = await getMemberBalanceOverview(req.room._id, req.member._id);
    const recentExpenses = await ExpenseV2.find({ roomId: req.room._id })
      .populate('paidBy', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    const factualContext = {
      roomName: req.room.name,
      askingMember: req.member.name,
      balancesSummary: balancesOverview.summary,
      debtsYouOwe: balancesOverview.youOwe,
      debtsOwedToYou: balancesOverview.youAreOwed,
      recentHouseholdExpenses: recentExpenses.map((e) => ({
        description: e.description,
        amount: e.amount,
        paidBy: e.paidBy ? e.paidBy.name : 'Unknown',
        category: e.category,
        date: e.createdAt.toISOString().split('T')[0],
      })),
    };

    // 2. Synthesize factual response via AI
    const answer = await answerAskSplitSense(question, factualContext);
    res.status(200).json({ answer, contextUsed: factualContext });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get AI spending insights
// @route   GET /api/ai/insights
router.get('/insights', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const expenses = await ExpenseV2.find({
      roomId: req.room._id,
      createdAt: { $gte: startOfMonth },
    });

    const categoryBreakdown = {};
    expenses.forEach((e) => {
      categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + e.amount;
    });

    const insightsText = await generateFinancialInsights({
      roomName: req.room.name,
      totalExpensesThisMonth: expenses.length,
      categoryBreakdown,
    });

    res.status(200).json({ insights: insightsText });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
