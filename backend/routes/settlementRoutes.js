const express = require('express');
const router = express.Router();
const { createSettlement, getSettlements } = require('../controllers/settlementController');
const { protectMember } = require('../middlewares/memberAuth');

router.post('/', protectMember, createSettlement);
router.get('/', protectMember, getSettlements);

module.exports = router;
