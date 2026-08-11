package com.splitsense.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "expenses")
data class ExpenseEntity(
    @PrimaryKey val id: String,
    val roomId: String,
    val paidBy: String,
    val amount: Double,
    val description: String,
    val category: String,
    val splitType: String = "equal",
    val clientExpenseId: String? = null,
    val isSynced: Boolean = true,
    val isEdited: Boolean = false,
    val editLog: String = "",
    val createdAt: Long = System.currentTimeMillis()
)
