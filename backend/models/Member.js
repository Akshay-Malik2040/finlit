const membershipPeriodSchema = new mongoose.Schema(
  {
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    leftAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

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
    currentJoinedAt: {
      type: Date,
      default: Date.now,
    },
    leftAt: {
      type: Date,
    },
    membershipPeriods: {
      type: [membershipPeriodSchema],
      default: function () {
        return [{ joinedAt: new Date(), leftAt: null }];
      },
    },
  },
  {
    timestamps: true,
  }
);

// Composite index to ensure fast lookup of member in a room by deviceId
memberSchema.index({ roomId: 1, deviceId: 1 });

module.exports = mongoose.model('Member', memberSchema);
