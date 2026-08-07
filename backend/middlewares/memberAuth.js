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
    if (memberId) {
      member = await Member.findById(memberId);
    } else if (deviceId && roomId) {
      member = await Member.findOne({ deviceId, roomId, isActive: true });
    } else if (deviceId) {
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
