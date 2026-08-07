const mongoose = require('mongoose');

const recurringExpenseSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Please specify recurring expense title'],
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      default: 'Other',
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Member',
      },
    ],
    frequency: {
      type: String,
      enum: ['weekly', 'monthly'],
      default: 'monthly',
    },
    nextDueAt: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

recurringExpenseSchema.index({ roomId: 1, nextDueAt: 1 });

module.exports = mongoose.model('RecurringExpense', recurringExpenseSchema);
