const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a room name (e.g., Flat 302)'],
      trim: true,
    },
    joinCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    joinCodeExpiresAt: {
      type: Date,
      default: null, // Null means no expiration, or set a future date if needed
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
    },
    settings: {
      currency: {
        type: String,
        default: 'INR',
      },
      simplifyDebts: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Room', roomSchema);
