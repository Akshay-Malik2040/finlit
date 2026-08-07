const express = require('express');
const router = express.Router();
const {
  createRoom,
  joinRoom,
  recoverMember,
  getRoomDetails,
  removeMember,
  previewRoom,
} = require('../controllers/roomController');
const { protectMember } = require('../middlewares/memberAuth');

router.post('/', createRoom);
router.post('/join', joinRoom);
router.post('/recover', recoverMember);
router.get('/preview/:query', previewRoom);

router.get('/:roomId', protectMember, getRoomDetails);
router.delete('/:roomId/members/:memberId', protectMember, removeMember);

module.exports = router;
