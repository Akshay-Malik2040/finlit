import jsPDF from 'jspdf';

/**
 * Generates and downloads a clean "Mine vs Flat" PDF statement report.
 */
export const generateMineVsFlatPDF = ({ room, currentMember, expenses, balances, monthlySummary }) => {
  const doc = new jsPDF();
  const now = new Date();
  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Calculate personal metrics
  const myMemberId = currentMember?._id || currentMember?.id;
  let myTotalPaid = 0;
  let myCalculatedShare = 0;
  let myPersonalOnly = 0;

  expenses.forEach((e) => {
    const isPayer = (e.paidBy?._id || e.paidBy?.id || e.paidBy) === myMemberId;
    if (isPayer) {
      myTotalPaid += e.amount;
    }

    if (e.expenseScope === 'personal') {
      if (isPayer) myPersonalOnly += e.amount;
    } else {
      // Find my share in participants
      const p = (e.participants || []).find(
        (part) => (part.memberId?._id || part.memberId?.id || part.memberId) === myMemberId
      );
      if (p) {
        myCalculatedShare += p.share || 0;
      }
    }
  });

  const totalMySpendingThisMonth = myPersonalOnly + myCalculatedShare;
  const flatTotalShared = monthlySummary?.totalMonthlyShared || 0;

  // Title & Header
  doc.setFillColor(5, 150, 105); // Emerald-600
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('FinLit — Financial Statement', 14, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${now.toLocaleDateString()}`, 140, 18);

  // Metadata Block
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Household: ${room?.name || 'Flat'} (${room?.joinCode || ''})`, 14, 38);
  doc.text(`Member: ${currentMember?.name || 'User'}`, 14, 45);
  doc.text(`Report Period: ${monthName}`, 14, 52);

  doc.setDrawColor(229, 231, 235);
  doc.line(14, 56, 196, 56);

  // Summary Cards Table Header
  doc.setFillColor(243, 244, 246);
  doc.rect(14, 60, 182, 36, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text('MINE VS FLAT SUMMARY', 18, 68);

  doc.setFontSize(9);
  doc.setTextColor(55, 65, 81);
  doc.setFont('helvetica', 'normal');
  doc.text(`• Total Flat Shared Expenditure (${monthName}): INR ${flatTotalShared.toFixed(2)}`, 18, 76);
  doc.text(`• Your Total Out-of-Pocket Share (Personal + Shared): INR ${totalMySpendingThisMonth.toFixed(2)}`, 18, 83);
  doc.text(`• Total Paid Upfront By You: INR ${myTotalPaid.toFixed(2)}`, 18, 90);

  // Net Position Box
  const netBalance = balances?.summary?.netBalance || 0;
  doc.setFont('helvetica', 'bold');
  if (netBalance > 0.01) {
    doc.setTextColor(5, 150, 105);
    doc.text(`Net Standing: YOU ARE OWED INR ${netBalance.toFixed(2)}`, 14, 104);
  } else if (netBalance < -0.01) {
    doc.setTextColor(225, 29, 72);
    doc.text(`Net Standing: YOU OWE INR ${Math.abs(netBalance).toFixed(2)}`, 14, 104);
  } else {
    doc.setTextColor(75, 85, 99);
    doc.text('Net Standing: EVERYONE IS SETTLED UP (INR 0.00)', 14, 104);
  }

  // Itemized Expenses Table
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Recent Household Expenses', 14, 114);

  // Table Headers
  let y = 122;
  doc.setFillColor(16, 185, 129);
  doc.rect(14, y - 5, 182, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text('Date', 16, y);
  doc.text('Description', 45, y);
  doc.text('Category', 105, y);
  doc.text('Paid By', 145, y);
  doc.text('Amount (INR)', 172, y);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(55, 65, 81);

  expenses.slice(0, 15).forEach((e) => {
    y += 8;
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    const dateStr = new Date(e.createdAt).toLocaleDateString();
    const desc = (e.description || 'Shared Expense').substring(0, 25);
    const cat = (e.category || 'Other').substring(0, 15);
    const payer = (e.paidBy?.name || 'Flatmate').substring(0, 12);
    const amt = e.amount ? e.amount.toFixed(2) : '0.00';

    doc.text(dateStr, 16, y);
    doc.text(desc, 45, y);
    doc.text(cat, 105, y);
    doc.text(payer, 145, y);
    doc.text(amt, 172, y);
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text('FinLit — Smart Spend & Bill Splitting. Confidential Household Report.', 14, 288);

  // Save PDF
  const filename = `FinLit_${room?.name.replace(/\s+/g, '_')}_Report_${monthName.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
};
