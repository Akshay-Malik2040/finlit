package com.splitsense.data.remote.dto

import kotlinx.serialization.Serializable

@Serializable
data class ExpenseDto(
    val _id: String,
    val roomId: String,
    val paidBy: String, // memberId
    val amount: Double,
    val description: String,
    val category: String,
    val participants: List<ParticipantDto>,
    val splitType: String = "equal",
    val expenseScope: String = "shared",
    val notes: String = "",
    val receiptUrl: String = "",
    val source: String = "quick",
    val clientExpenseId: String? = null,
    val createdAt: String? = null
)

@Serializable
data class ParticipantDto(
    val memberId: String,
    val share: Double
)

@Serializable
data class CreateExpenseRequest(
    val amount: Double,
    val description: String,
    val paidBy: String,
    val participants: List<ParticipantDto>,
    val category: String = "Other",
    val splitType: String = "equal",
    val clientExpenseId: String
)
