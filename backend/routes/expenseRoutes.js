const express = require('express');
const router = express.Router();
const {
  addExpense,
  updateExpense,
  getExpenses,
  getBalances,
  deleteExpense,
  getMonthlySummary,
} = require('../controllers/expenseController');
const { protectMember } = require('../middlewares/memberAuth');

router.use(protectMember);

router.post('/', addExpense);
router.get('/', getExpenses);
router.put('/:id', updateExpense);
router.get('/balances', getBalances);
router.get('/monthly-summary', getMonthlySummary);
router.delete('/:id', deleteExpense);

module.exports = router;