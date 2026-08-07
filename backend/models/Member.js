const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Please add a member name'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member',
    },
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    recoveryCodeHash: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Composite index to ensure fast lookup of member in a room by deviceId
memberSchema.index({ roomId: 1, deviceId: 1 });

module.exports = mongoose.model('Member', memberSchema);
