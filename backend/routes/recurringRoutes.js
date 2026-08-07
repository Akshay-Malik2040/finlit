const express = require('express');
const router = express.Router();
const {
  createRecurringExpense,
  getRecurringExpenses,
  deleteRecurringExpense,
} = require('../controllers/recurringController');
const { protectMember } = require('../middlewares/memberAuth');

router.use(protectMember);

router.post('/', createRecurringExpense);
router.get('/', getRecurringExpenses);
router.delete('/:id', deleteRecurringExpense);

module.exports = router;
