package com.splitsense.util

import android.content.Context
import android.content.Intent
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import androidx.core.content.FileProvider
import com.splitsense.data.local.entities.ExpenseEntity
import com.splitsense.data.local.entities.MemberEntity
import com.splitsense.data.local.entities.RoomEntity
import com.splitsense.data.remote.BalancesResponse
import com.splitsense.data.remote.SettlementDto
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object PdfReportGenerator {

    fun generateAndSharePdf(
        context: Context,
        room: RoomEntity?,
        expenses: List<ExpenseEntity>,
        members: List<MemberEntity>,
        balances: BalancesResponse?,
        settlements: List<SettlementDto>,
        selectedMonth: String = "August 2026"
    ) {
        val pdfDocument = PdfDocument()
        val pageInfo = PdfDocument.PageInfo.Builder(595, 842, 1).create() // A4 Size
        val page = pdfDocument.startPage(pageInfo)
        val canvas: Canvas = page.canvas

        val paint = Paint()
        val titlePaint = Paint().apply {
            color = Color.rgb(15, 23, 42) // Dark Slate
            textSize = 20f
            isFakeBoldText = true
        }
        val subTitlePaint = Paint().apply {
            color = Color.rgb(16, 185, 129) // Emerald
            textSize = 12f
            isFakeBoldText = true
        }
        val textPaint = Paint().apply {
            color = Color.rgb(30, 41, 59)
            textSize = 10f
        }
        val boldTextPaint = Paint().apply {
            color = Color.rgb(30, 41, 59)
            textSize = 10f
            isFakeBoldText = true
        }
        val linePaint = Paint().apply {
            color = Color.rgb(226, 232, 240)
            strokeWidth = 1f
        }

        var y = 40f

        // 1. Header
        canvas.drawText("SPLITSENSE", 40f, y, titlePaint)
        canvas.drawText("HOUSEHOLD EXPENSE REPORT", 400f, y, subTitlePaint)
        y += 24f

        canvas.drawText("Room: ${room?.name ?: "Flat 302"} (Code: ${room?.joinCode ?: "---"})", 40f, y, boldTextPaint)
        canvas.drawText("Period: $selectedMonth | Generated: ${SimpleDateFormat("dd MMM yyyy", Locale.getDefault()).format(Date())}", 280f, y, textPaint)
        y += 16f
        canvas.drawLine(40f, y, 555f, y, linePaint)
        y += 20f

        // 2. Executive Summary Box
        val totalHouseholdSpent = expenses.sumOf { it.amount }
        val netBalance = balances?.summary?.values?.sum() ?: 0.0
        val youOweTotal = balances?.youOwe?.sumOf { it.amount } ?: 0.0
        val youAreOwedTotal = balances?.youAreOwed?.sumOf { it.amount } ?: 0.0

        canvas.drawText("EXECUTIVE SUMMARY", 40f, y, subTitlePaint)
        y += 16f

        canvas.drawText("Total Household Expenses: ₹${"%.2f".format(totalHouseholdSpent)}", 40f, y, boldTextPaint)
        canvas.drawText("Net Balance: ₹${"%.2f".format(netBalance)}", 300f, y, boldTextPaint)
        y += 14f

        canvas.drawText("You Owe Total: ₹${"%.2f".format(youOweTotal)}", 40f, y, textPaint)
        canvas.drawText("You Are Owed Total: ₹${"%.2f".format(youAreOwedTotal)}", 300f, y, textPaint)
        y += 20f
        canvas.drawLine(40f, y, 555f, y, linePaint)
        y += 20f

        // 3. Category Breakdown Table
        canvas.drawText("CATEGORY BREAKDOWN", 40f, y, subTitlePaint)
        y += 16f

        val categoryMap = expenses.groupBy { it.category }
        categoryMap.forEach { (category, list) ->
            val catTotal = list.sumOf { it.amount }
            canvas.drawText(category, 40f, y, textPaint)
            canvas.drawText("₹${"%.2f".format(catTotal)}", 200f, y, boldTextPaint)
            y += 14f
        }
        y += 10f
        canvas.drawLine(40f, y, 555f, y, linePaint)
        y += 20f

        // 4. Suggested Settlements (Who Owes Whom)
        canvas.drawText("SUGGESTED SETTLEMENTS (WHO OWES WHOM)", 40f, y, subTitlePaint)
        y += 16f

        val youOweList = balances?.youOwe ?: emptyList()
        val youAreOwedList = balances?.youAreOwed ?: emptyList()

        if (youOweList.isEmpty() && youAreOwedList.isEmpty()) {
            canvas.drawText("All settled up! No outstanding debts.", 40f, y, textPaint)
            y += 14f
        } else {
            youOweList.forEach { debt ->
                canvas.drawText("You owe ${debt.name}", 40f, y, textPaint)
                canvas.drawText("₹${"%.2f".format(debt.amount)}", 300f, y, boldTextPaint)
                y += 14f
            }
            youAreOwedList.forEach { debt ->
                canvas.drawText("${debt.name} owes You", 40f, y, textPaint)
                canvas.drawText("₹${"%.2f".format(debt.amount)}", 300f, y, boldTextPaint)
                y += 14f
            }
        }
        y += 10f
        canvas.drawLine(40f, y, 555f, y, linePaint)
        y += 20f

        // 5. Recent Expenses Log
        canvas.drawText("EXPENSE HISTORY", 40f, y, subTitlePaint)
        y += 16f

        expenses.take(8).forEach { expense ->
            val payer = members.find { it.id == expense.paidBy }?.name ?: "Member"
            canvas.drawText("${expense.description} (${expense.category})", 40f, y, textPaint)
            canvas.drawText("Paid by $payer", 280f, y, textPaint)
            canvas.drawText("₹${"%.2f".format(expense.amount)}", 480f, y, boldTextPaint)
            y += 14f
        }

        pdfDocument.finishPage(page)

        // Save PDF file to cache
        val pdfFile = File(context.cacheDir, "SplitSense_Monthly_Report.pdf")
        try {
            pdfDocument.writeTo(FileOutputStream(pdfFile))
            pdfDocument.close()

            // Open Share Sheet
            val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", pdfFile)
            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = "application/pdf"
                putExtra(Intent.EXTRA_STREAM, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            context.startActivity(Intent.createChooser(shareIntent, "Share Household Expense Report"))
        } catch (e: Exception) {
            e.printStackTrace()
            pdfDocument.close()
        }
    }
}
