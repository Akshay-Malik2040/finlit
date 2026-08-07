const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    share: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const expenseV2Schema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Please add expense amount'],
      min: [0.01, 'Amount must be greater than zero'],
    },
    description: {
      type: String,
      default: 'Shared Expense',
      trim: true,
    },
    category: {
      type: String,
      enum: [
        'Food & Dining',
        'Groceries',
        'Milk & Daily Essentials',
        'Electricity',
        'Internet',
        'Water',
        'Gas',
        'Rent',
        'Maid & Cleaning',
        'Transport',
        'Household',
        'Entertainment',
        'Subscriptions',
        'Repairs',
        'Other',
      ],
      default: 'Other',
    },
    participants: [participantSchema],
    splitType: {
      type: String,
      enum: ['equal', 'exact', 'percentage'],
      default: 'equal',
    },
    expenseScope: {
      type: String,
      enum: ['shared', 'personal'],
      default: 'shared',
    },
    notes: {
      type: String,
      default: '',
    },
    receiptUrl: {
      type: String,
      default: '',
    },
    source: {
      type: String,
      enum: ['quick', 'widget', 'ai', 'standard', 'ocr'],
      default: 'quick',
    },
    clientExpenseId: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for query performance
expenseV2Schema.index({ roomId: 1, createdAt: -1 });
expenseV2Schema.index({ roomId: 1, clientExpenseId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('ExpenseV2', expenseV2Schema);
