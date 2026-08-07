const Settlement = require('../models/Settlement');
const { calculateRoomBalances, getMemberBalanceOverview } = require('../services/balanceService');

// @desc    Create a settlement record (debt payment)
// @route   POST /api/settlements
// @access  Protected
const createSettlement = async (req, res) => {
  try {
    const { toMemberId, amount, paymentMethod, notes } = req.body;

    if (!toMemberId || !amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid recipient member ID and amount required' });
    }

    const settlement = await Settlement.create({
      roomId: req.room._id,
      fromMember: req.member._id,
      toMember: toMemberId,
      amount: parseFloat(amount),
      paymentMethod: paymentMethod || 'UPI',
      notes: notes || '',
    });

    const populated = await Settlement.findById(settlement._id)
      .populate('fromMember', 'name avatar')
      .populate('toMember', 'name avatar');

    // Get updated room balances
    const updatedBalances = await getMemberBalanceOverview(req.room._id, req.member._id);

    res.status(201).json({
      settlement: populated,
      updatedBalances,
    });
  } catch (error) {
    console.error('Create Settlement Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get settlement history for room
// @route   GET /api/settlements
// @access  Protected
const getSettlements = async (req, res) => {
  try {
    const settlements = await Settlement.find({ roomId: req.room._id })
      .populate('fromMember', 'name avatar')
      .populate('toMember', 'name avatar')
      .sort({ createdAt: -1 });

    res.status(200).json(settlements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createSettlement,
  getSettlements,
};
