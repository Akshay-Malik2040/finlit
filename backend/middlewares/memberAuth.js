const mongoose = require('mongoose');
const Member = require('../models/Member');
const Room = require('../models/Room');

const protectMember = async (req, res, next) => {
  try {
    const deviceId = req.headers['x-device-id'] || req.query.deviceId;
    const memberId = req.headers['x-member-id'] || req.query.memberId;
    const roomId = req.headers['x-room-id'] || req.params.roomId || req.query.roomId;

    if (!deviceId && !memberId) {
      return res.status(401).json({ message: 'Authentication failed. Device or member identity required.' });
    }

    let member = null;

    // 1. Try finding by memberId if valid ObjectId
    if (memberId && mongoose.Types.ObjectId.isValid(memberId)) {
      member = await Member.findById(memberId);
    }

    // 2. Fallback: Try finding active member by deviceId and roomId if provided
    if ((!member || !member.isActive) && deviceId && roomId && mongoose.Types.ObjectId.isValid(roomId)) {
      member = await Member.findOne({ deviceId, roomId, isActive: true });
    }

    // 3. Fallback: Try finding most recently active member by deviceId
    if ((!member || !member.isActive) && deviceId) {
      member = await Member.findOne({ deviceId, isActive: true }).sort({ lastActiveAt: -1 });
    }

    if (!member || !member.isActive) {
      return res.status(401).json({ message: 'Member not found or inactive in room.' });
    }

    const room = await Room.findById(member.roomId);
    if (!room) {
      return res.status(404).json({ message: 'Associated room not found.' });
    }

    // Update lastActiveAt
    member.lastActiveAt = new Date();
    await member.save();

    req.member = member;
    req.room = room;
    next();
  } catch (error) {
    console.error('Member Auth Middleware Error:', error);
    res.status(500).json({ message: 'Server authentication error' });
  }
};

module.exports = { protectMember };
