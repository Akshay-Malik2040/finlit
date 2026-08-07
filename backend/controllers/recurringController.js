const RecurringExpense = require('../models/RecurringExpense');

// @desc    Create a new recurring expense schedule
// @route   POST /api/recurring-expenses
// @access  Protected
const createRecurringExpense = async (req, res) => {
  try {
    const { title, amount, category, frequency, nextDueAt, participantIds } = req.body;

    if (!title || !amount || !nextDueAt) {
      return res.status(400).json({ message: 'Title, amount, and next due date are required' });
    }

    const recurring = await RecurringExpense.create({
      roomId: req.room._id,
      title: title.trim(),
      amount: parseFloat(amount),
      category: category || 'Other',
      paidBy: req.member._id,
      participants: participantIds || [],
      frequency: frequency || 'monthly',
      nextDueAt: new Date(nextDueAt),
    });

    const populated = await RecurringExpense.findById(recurring._id)
      .populate('paidBy', 'name avatar')
      .populate('participants', 'name avatar');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get recurring expenses for room
// @route   GET /api/recurring-expenses
// @access  Protected
const getRecurringExpenses = async (req, res) => {
  try {
    const recurringList = await RecurringExpense.find({
      roomId: req.room._id,
      isActive: true,
    })
      .populate('paidBy', 'name avatar')
      .populate('participants', 'name avatar')
      .sort({ nextDueAt: 1 });

    res.status(200).json(recurringList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete/Deactivate a recurring expense
// @route   DELETE /api/recurring-expenses/:id
// @access  Protected
const deleteRecurringExpense = async (req, res) => {
  try {
    const item = await RecurringExpense.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Recurring expense schedule not found' });
    }

    item.isActive = false;
    await item.save();

    res.status(200).json({ message: 'Recurring expense schedule removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createRecurringExpense,
  getRecurringExpenses,
  deleteRecurringExpense,
};
