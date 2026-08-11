const crypto = require('crypto');
const Room = require('../models/Room');
const Member = require('../models/Member');

// High-entropy cryptographically secure join code generator (e.g. FLAT-8A2F9B1C)
const generateJoinCode = () => {
  const bytes = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 high-entropy chars
  return `FLAT-${bytes}`;
};

// Helper to generate a recovery code e.g. X7K9-P2Q8
const generateRecoveryCode = () => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
    part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${part1}-${part2}`;
};

// Helper to hash recovery codes securely
const hashRecoveryCode = (code) => {
  return crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
};

// @desc    Create a new Room
// @route   POST /api/rooms
// @access  Public (device-based)
const createRoom = async (req, res) => {
  try {
    const { name, creatorName, memberName, deviceId } = req.body;
    const authorName = creatorName || memberName;

    if (!name || !authorName || !deviceId) {
      return res.status(400).json({ message: 'Room name, creator name, and device ID are required' });
    }

    let joinCode = generateJoinCode();
    let existingRoom = await Room.findOne({ joinCode });
    while (existingRoom) {
      joinCode = generateJoinCode();
      existingRoom = await Room.findOne({ joinCode });
    }

    const room = await Room.create({
      name: name.trim(),
      joinCode,
    });

    const recoveryCode = generateRecoveryCode();
    const recoveryCodeHash = hashRecoveryCode(recoveryCode);

    const now = new Date();
    const member = await Member.create({
      roomId: room._id,
      name: authorName.trim(),
      role: 'admin',
      deviceId,
      recoveryCodeHash,
      currentJoinedAt: now,
      membershipPeriods: [{ joinedAt: now, leftAt: null }],
    });

    room.createdBy = member._id;
    await room.save();

    res.status(201).json({
      room: {
        _id: room._id.toString(),
        id: room._id.toString(),
        name: room.name,
        joinCode: room.joinCode,
        createdAt: room.createdAt,
      },
      member: {
        _id: member._id.toString(),
        id: member._id.toString(),
        name: member.name,
        role: member.role,
        deviceId: member.deviceId,
        roomId: member.roomId.toString(),
        isActive: member.isActive,
      },
      recoveryCode, // Sent ONLY ONCE
    });
  } catch (error) {
    console.error('Create Room Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Join an existing Room strictly via high-entropy join code
// @route   POST /api/rooms/join
// @access  Public (device-based)
const joinRoom = async (req, res) => {
  try {
    const { joinCode, name, memberName, deviceId } = req.body;
    const authorName = name || memberName;

    if (!joinCode || !authorName || !deviceId) {
      return res.status(400).json({ message: 'Join code, member name, and device ID are required' });
    }

    const query = joinCode.trim();
    const rawCode = query.toUpperCase();
    const prefixedCode = rawCode.startsWith('FLAT-') ? rawCode : `FLAT-${rawCode}`;

    // Secure exact match by high-entropy join code
    const room = await Room.findOne({
      $or: [{ joinCode: prefixedCode }, { joinCode: rawCode }],
    });

    if (!room) {
      return res.status(404).json({
        message: 'Invalid room join code. Please ask your room admin for the exact secret code (e.g., FLAT-8A2F9B1C).',
      });
    }

    // Check if member with this deviceId OR name in room exists (Reinstallation Recovery)
    let member = await Member.findOne({
      roomId: room._id,
      $or: [
        { deviceId },
        { name: { $regex: new RegExp(`^${authorName.trim()}$`, 'i') } }
      ]
    });

    const recoveryCode = generateRecoveryCode();
    const recoveryCodeHash = hashRecoveryCode(recoveryCode);

    if (member) {
      member.name = authorName.trim();
      member.deviceId = deviceId; // Re-bind new device ID to existing account
      member.isActive = true; // Restore active status
      member.recoveryCodeHash = recoveryCodeHash;

      // Append new membership interval if previous interval was closed
      if (!member.membershipPeriods || member.membershipPeriods.length === 0) {
        member.membershipPeriods = [{ joinedAt: member.createdAt || new Date(), leftAt: null }];
      } else {
        const lastPeriod = member.membershipPeriods[member.membershipPeriods.length - 1];
        if (lastPeriod.leftAt) {
          member.membershipPeriods.push({ joinedAt: new Date(), leftAt: null });
        }
      }

      await member.save();
    } else {
      const now = new Date();
      member = await Member.create({
        roomId: room._id,
        name: authorName.trim(),
        role: 'member',
        deviceId,
        recoveryCodeHash,
        currentJoinedAt: now,
        membershipPeriods: [{ joinedAt: now, leftAt: null }],
      });
    }

    const allMembers = await Member.find({ roomId: room._id, isActive: true }).select('_id name role avatar lastActiveAt');

    res.status(200).json({
      room: {
        _id: room._id.toString(),
        id: room._id.toString(),
        name: room.name,
        joinCode: room.joinCode,
        createdAt: room.createdAt,
      },
      member: {
        _id: member._id.toString(),
        id: member._id.toString(),
        name: member.name,
        role: member.role,
        deviceId: member.deviceId,
        roomId: member.roomId.toString(),
        isActive: member.isActive,
      },
      members: allMembers,
      recoveryCode, // Sent ONLY ONCE
    });
  } catch (error) {
    console.error('Join Room Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Recover member identity using recovery code
// @route   POST /api/rooms/recover
// @access  Public
const recoverMember = async (req, res) => {
  try {
    const { recoveryCode, deviceId } = req.body;

    if (!recoveryCode || !deviceId) {
      return res.status(400).json({ message: 'Recovery code and device ID are required' });
    }

    const recoveryCodeHash = hashRecoveryCode(recoveryCode);
    const member = await Member.findOne({ recoveryCodeHash, isActive: true });

    if (!member) {
      return res.status(404).json({ message: 'Invalid recovery code. Member not found.' });
    }

    member.deviceId = deviceId;
    member.lastActiveAt = new Date();
    await member.save();

    const room = await Room.findById(member.roomId);

    res.status(200).json({
      room: {
        id: room._id,
        name: room.name,
        joinCode: room.joinCode,
      },
      member: {
        id: member._id,
        name: member.name,
        role: member.role,
        deviceId: member.deviceId,
        roomId: member.roomId,
      },
    });
  } catch (error) {
    console.error('Recover Member Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get details and members of a Room
// @route   GET /api/rooms/:roomId
// @access  Protected
const getRoomDetails = async (req, res) => {
  try {
    const members = await Member.find({ roomId: req.room._id, isActive: true }).select('_id name role avatar deviceId lastActiveAt');
    res.status(200).json({
      room: {
        id: req.room._id,
        name: req.room.name,
        joinCode: req.room.joinCode,
        settings: req.room.settings,
        createdAt: req.room.createdAt,
      },
      currentMember: req.member,
      members,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove a member from the room (Admin only)
// @route   DELETE /api/rooms/:roomId/members/:memberId
// @access  Protected (Admin)
const removeMember = async (req, res) => {
  try {
    if (req.member.role !== 'admin') {
      return res.status(403).json({ message: 'Only room admins can remove members from the room' });
    }

    const { memberId } = req.params;

    if (memberId === req.member._id.toString() || memberId === req.member.id) {
      return res.status(400).json({ message: 'Admin cannot remove themselves from the room.' });
    }

    const targetMember = await Member.findOne({ _id: memberId, roomId: req.room._id });
    if (!targetMember) {
      return res.status(404).json({ message: 'Member not found in room' });
    }

    targetMember.isActive = false;
    const now = new Date();
    targetMember.leftAt = now;

    if (targetMember.membershipPeriods && targetMember.membershipPeriods.length > 0) {
      const lastPeriod = targetMember.membershipPeriods[targetMember.membershipPeriods.length - 1];
      if (!lastPeriod.leftAt) {
        lastPeriod.leftAt = now;
      }
    }
    await targetMember.save();

    const remainingMembers = await Member.find({ roomId: req.room._id, isActive: true }).select('name role avatar deviceId lastActiveAt');

    res.status(200).json({
      message: 'Member removed successfully from room',
      members: remainingMembers,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Preview room details by joinCode
// @route   GET /api/rooms/preview/:query
// @access  Public
const previewRoom = async (req, res) => {
  try {
    const query = req.params.query.trim();
    const rawCode = query.toUpperCase();
    const prefixedCode = rawCode.startsWith('FLAT-') ? rawCode : `FLAT-${rawCode}`;

    const room = await Room.findOne({
      $or: [{ joinCode: prefixedCode }, { joinCode: rawCode }],
    });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const memberCount = await Member.countDocuments({ roomId: room._id, isActive: true });

    res.status(200).json({
      room: {
        id: room._id,
        name: room.name,
        joinCode: room.joinCode,
        memberCount,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createRoom,
  joinRoom,
  recoverMember,
  getRoomDetails,
  removeMember,
  previewRoom,
};
