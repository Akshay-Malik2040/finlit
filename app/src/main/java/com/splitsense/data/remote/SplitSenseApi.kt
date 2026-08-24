package com.splitsense.data.remote

import com.splitsense.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*
import kotlinx.serialization.Serializable

interface SplitSenseApi {

    // --- Rooms & Members ---
    @POST("api/rooms")
    suspend fun createRoom(@Body request: CreateRoomRequest): Response<RoomResponse>

    @POST("api/rooms/join")
    suspend fun joinRoom(@Body request: JoinRoomRequest): Response<RoomResponse>

    @GET("api/rooms/{roomId}")
    suspend fun getRoomDetails(
        @Path("roomId") roomId: String,
        @Header("x-device-id") deviceId: String,
        @Header("x-member-id") memberId: String
    ): Response<RoomResponse>

    @DELETE("api/rooms/{roomId}/members/{memberId}")
    suspend fun removeMember(
        @Path("roomId") roomId: String,
        @Path("memberId") memberId: String,
        @Header("x-device-id") deviceId: String,
        @Header("x-member-id") currentMemberId: String
    ): Response<GenericMessageResponse>

    // --- Expenses CRUD ---
    @GET("api/expenses")
    suspend fun getExpenses(
        @Header("x-device-id") deviceId: String,
        @Header("x-member-id") memberId: String,
        @Header("x-room-id") roomId: String
    ): Response<List<ExpenseDto>>

    @POST("api/expenses")
    suspend fun addExpense(
        @Header("x-device-id") deviceId: String,
        @Header("x-member-id") memberId: String,
        @Header("x-room-id") roomId: String,
        @Body request: CreateExpenseRequest
    ): Response<ExpenseDto>

    @PUT("api/expenses/{id}")
    suspend fun updateExpense(
        @Path("id") expenseId: String,
        @Header("x-device-id") deviceId: String,
        @Header("x-member-id") memberId: String,
        @Header("x-room-id") roomId: String,
        @Body request: CreateExpenseRequest
    ): Response<ExpenseDto>

    @DELETE("api/expenses/{id}")
    suspend fun deleteExpense(
        @Path("id") expenseId: String,
        @Header("x-device-id") deviceId: String,
        @Header("x-member-id") memberId: String,
        @Header("x-room-id") roomId: String
    ): Response<GenericMessageResponse>

    @GET("api/expenses/balances")
    suspend fun getBalances(
        @Header("x-device-id") deviceId: String,
        @Header("x-member-id") memberId: String,
        @Header("x-room-id") roomId: String
    ): Response<BalancesResponse>

    @GET("api/expenses/monthly-summary")
    suspend fun getMonthlySummary(
        @Header("x-device-id") deviceId: String,
        @Header("x-member-id") memberId: String,
        @Header("x-room-id") roomId: String
    ): Response<MonthlySummaryResponse>

    // --- Settlements ---
    @POST("api/settlements")
    suspend fun createSettlement(
        @Header("x-device-id") deviceId: String,
        @Header("x-member-id") memberId: String,
        @Header("x-room-id") roomId: String,
        @Body request: CreateSettlementRequest
    ): Response<SettlementDto>

    @GET("api/settlements")
    suspend fun getSettlements(
        @Header("x-device-id") deviceId: String,
        @Header("x-member-id") memberId: String,
        @Header("x-room-id") roomId: String
    ): Response<List<SettlementDto>>

    // --- Recurring Expenses ---
    @POST("api/recurring")
    suspend fun createRecurringExpense(
        @Header("x-device-id") deviceId: String,
        @Header("x-member-id") memberId: String,
        @Header("x-room-id") roomId: String,
        @Body request: CreateRecurringRequest
    ): Response<RecurringExpenseDto>

    @GET("api/recurring")
    suspend fun getRecurringExpenses(
        @Header("x-device-id") deviceId: String,
        @Header("x-member-id") memberId: String,
        @Header("x-room-id") roomId: String
    ): Response<List<RecurringExpenseDto>>

    @DELETE("api/recurring/{id}")
    suspend fun deleteRecurringExpense(
        @Path("id") recurringId: String,
        @Header("x-device-id") deviceId: String,
        @Header("x-member-id") memberId: String,
        @Header("x-room-id") roomId: String
    ): Response<GenericMessageResponse>

    // --- AI Capabilities ---
    @POST("api/ai/parse-expense")
    suspend fun parseExpenseAi(
        @Header("x-device-id") deviceId: String,
        @Header("x-member-id") memberId: String,
        @Header("x-room-id") roomId: String,
        @Body request: AiParseRequest
    ): Response<AiParseResponse>

    @POST("api/ai/ask")
    suspend fun askAi(
        @Header("x-device-id") deviceId: String,
        @Header("x-member-id") memberId: String,
        @Header("x-room-id") roomId: String,
        @Body request: AiAskRequest
    ): Response<AiAskResponse>

    @GET("api/ai/insights")
    suspend fun getAiInsights(
        @Header("x-device-id") deviceId: String,
        @Header("x-member-id") memberId: String,
        @Header("x-room-id") roomId: String
    ): Response<AiInsightsResponse>
}

@Serializable
data class GenericMessageResponse(
    val message: String
)

@Serializable
data class BalancesResponse(
    val summary: Map<String, Double> = emptyMap(),
    val youOwe: List<DebtDto> = emptyList(),
    val youAreOwed: List<DebtDto> = emptyList()
)

@Serializable
data class DebtDto(
    @Serializable(with = StringOrObjectSerializer::class)
    val memberId: String = "",
    val name: String = "",
    val amount: Double = 0.0
)

@Serializable
data class MonthlySummaryResponse(
    val totalSpent: Double = 0.0,
    val categoryBreakdown: Map<String, Double> = emptyMap()
)

@Serializable
data class CreateSettlementRequest(
    val toMemberId: String,
    val amount: Double,
    val paymentMethod: String = "UPI",
    val notes: String = ""
)

@Serializable
data class SettlementDto(
    val _id: String = "",
    @Serializable(with = StringOrObjectSerializer::class)
    val fromMember: String = "",
    @Serializable(with = StringOrObjectSerializer::class)
    val toMember: String = "",
    val amount: Double = 0.0,
    val paymentMethod: String = "UPI",
    val createdAt: String = ""
)

@Serializable
data class CreateRecurringRequest(
    val title: String,
    val amount: Double,
    val category: String = "Bills",
    val frequency: String = "monthly",
    val paidBy: String = "",
    val splitBetween: List<String> = emptyList()
)

@Serializable
data class RecurringExpenseDto(
    val _id: String,
    val title: String,
    val amount: Double,
    val category: String,
    val frequency: String = "monthly",
    val paidBy: String = "",
    val splitBetween: List<String> = emptyList(),
    val nextDueDate: String = ""
)

@Serializable
data class AiParseRequest(
    val text: String
)

@Serializable
data class AiParseResponse(
    val amount: Double? = null,
    val description: String? = null,
    val category: String? = null,
    val participants: List<String>? = null
)

@Serializable
data class AiAskRequest(
    val question: String
)

@Serializable
data class AiAskResponse(
    val answer: String
)

@Serializable
data class AiInsightsResponse(
    val insights: String
)
