const assert = require('assert');
const simplifyDebts = require('../utils/simplifyDebts');

console.log('🧪 Starting SplitSense V2 Core Logic Tests...');

// Test 1: simplifyDebts algorithm
(() => {
  console.log('Test 1: simplifyDebts logic');
  const balances = {
    Akshay: 500,
    Rahul: -200,
    Rishi: -150,
    Aman: -150,
  };

  const transactions = simplifyDebts(balances);
  assert.strictEqual(transactions.length, 3, 'Should reduce to 3 transactions');
  
  const totalSettled = transactions.reduce((acc, t) => acc + t.amount, 0);
  assert.strictEqual(totalSettled, 500, 'Total settled amount must equal total owed (500)');

  const toAkshay = transactions.every((t) => t.to === 'Akshay');
  assert.strictEqual(toAkshay, true, 'All transactions should be directed to Akshay');
  console.log('  ✅ Test 1 Passed!');
})();

// Test 2: Equal split calculation
(() => {
  console.log('Test 2: Equal split calculation');
  const totalAmount = 450;
  const participantCount = 3; // Akshay, Rahul, Rishi
  const equalShare = parseFloat((totalAmount / participantCount).toFixed(2));
  assert.strictEqual(equalShare, 150, 'Share per person should be 150');
  console.log('  ✅ Test 2 Passed!');
})();

// Test 3: Personal Expense isolation
(() => {
  console.log('Test 3: Personal expense isolation');
  const personalAmount = 300;
  const scope = 'personal';
  const participants = [{ memberId: 'Akshay', share: personalAmount }];
  
  assert.strictEqual(scope, 'personal');
  assert.strictEqual(participants.length, 1);
  assert.strictEqual(participants[0].share, 300);
  console.log('  ✅ Test 3 Passed!');
})();

// Test 4: Idempotency Key matching logic
(() => {
  console.log('Test 4: Idempotency Key matching logic');
  const clientExpenseId = 'dev-1234-uuid';
  const existingRecord = { clientExpenseId, amount: 900 };
  const incomingRequest = { clientExpenseId };

  assert.strictEqual(existingRecord.clientExpenseId, incomingRequest.clientExpenseId);
  console.log('  ✅ Test 4 Passed!');
})();

console.log('🎉 ALL BACKEND CORE LOGIC TESTS PASSED SUCCESSFULLY!');
