package com.splitsense.data.repository

import com.splitsense.data.local.dao.ExpenseDao
import com.splitsense.data.local.dao.MemberDao
import com.splitsense.data.local.dao.RoomDao
import com.splitsense.data.local.entities.ExpenseEntity
import com.splitsense.data.local.entities.MemberEntity
import com.splitsense.data.local.entities.RoomEntity
import com.splitsense.data.remote.*
import com.splitsense.data.remote.dto.*
import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.splitsense.sync.SyncWorker
import com.splitsense.util.IdentityManager
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SplitSenseRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val api: SplitSenseApi,
    private val roomDao: RoomDao,
    private val memberDao: MemberDao,
    private val expenseDao: ExpenseDao,
    private val identityManager: IdentityManager
) {
    private fun enqueueOfflineSync() {
        try {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val syncWorkRequest = OneTimeWorkRequestBuilder<SyncWorker>()
                .setConstraints(constraints)
                .build()

            WorkManager.getInstance(context).enqueueUniqueWork(
                "splitsense_offline_sync",
                ExistingWorkPolicy.APPEND_OR_REPLACE,
                syncWorkRequest
            )
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    val currentRoom: Flow<RoomEntity?> = roomDao.getRoom()
    
    fun getMembers(roomId: String): Flow<List<MemberEntity>> = memberDao.getMembersForRoom(roomId)

    fun getExpenses(roomId: String): Flow<List<ExpenseEntity>> = expenseDao.getExpensesForRoom(roomId)

    suspend fun createRoom(roomName: String, memberName: String): Result<Unit> {
        return try {
            val deviceId = identityManager.getOrCreateDeviceId()
            val response = api.createRoom(CreateRoomRequest(roomName, deviceId, memberName))
            
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                val roomIdStr = body.room.roomId
                val memberIdStr = body.member.memberId

                roomDao.insertRoom(RoomEntity(
                    id = roomIdStr,
                    name = body.room.name,
                    joinCode = body.room.joinCode,
                    currency = body.room.settings?.currency ?: "INR",
                    simplifyDebts = body.room.settings?.simplifyDebts ?: true
                ))
                
                memberDao.insertMembers(listOf(MemberEntity(
                    id = memberIdStr,
                    roomId = roomIdStr,
                    name = body.member.name,
                    role = body.member.role,
                    avatar = body.member.avatar,
                    isActive = body.member.isActive
                )))
                
                identityManager.saveIdentity(
                    memberId = memberIdStr,
                    roomId = roomIdStr,
                    memberName = body.member.name,
                    roomName = body.room.name
                )
                
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to create room: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun joinRoom(joinCode: String, memberName: String): Result<Unit> {
        return try {
            val deviceId = identityManager.getOrCreateDeviceId()
            val response = api.joinRoom(JoinRoomRequest(joinCode, deviceId, memberName))
            
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                val roomIdStr = body.room.roomId
                val memberIdStr = body.member.memberId
                
                roomDao.insertRoom(RoomEntity(
                    id = roomIdStr,
                    name = body.room.name,
                    joinCode = body.room.joinCode,
                    currency = body.room.settings?.currency ?: "INR",
                    simplifyDebts = body.room.settings?.simplifyDebts ?: true
                ))
                
                memberDao.insertMembers(listOf(MemberEntity(
                    id = memberIdStr,
                    roomId = roomIdStr,
                    name = body.member.name,
                    role = body.member.role,
                    avatar = body.member.avatar,
                    isActive = body.member.isActive
                )))
                
                identityManager.saveIdentity(
                    memberId = memberIdStr,
                    roomId = roomIdStr,
                    memberName = body.member.name,
                    roomName = body.room.name
                )
                
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to join room: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun removeMember(targetMemberId: String): Result<Unit> {
        return try {
            val deviceId = identityManager.deviceId.first()
            val memberId = identityManager.memberId.first() ?: return Result.failure(Exception("No member ID"))
            val roomId = identityManager.roomId.first() ?: return Result.failure(Exception("No room ID"))

            val response = api.removeMember(roomId, targetMemberId, deviceId, memberId)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception(response.message().ifBlank { "Failed to remove member" }))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun addExpense(
        amount: Double,
        description: String,
        participants: List<String>, // memberIds
        category: String = "Other"
    ): Result<Unit> {
        return try {
            val deviceId = identityManager.deviceId.first()
            val memberId = identityManager.memberId.first() ?: return Result.failure(Exception("No member ID"))
            val roomId = identityManager.roomId.first() ?: return Result.failure(Exception("No room ID"))
            val clientExpenseId = UUID.randomUUID().toString()

            // Optimistic save
            val localExpense = ExpenseEntity(
                id = clientExpenseId,
                roomId = roomId,
                paidBy = memberId,
                amount = amount,
                description = description,
                category = category,
                clientExpenseId = clientExpenseId,
                isSynced = false
            )
            expenseDao.insertExpense(localExpense)

            val request = CreateExpenseRequest(
                amount = amount,
                description = description,
                paidBy = memberId,
                participants = participants.map { ParticipantDto(it, amount / participants.size) },
                category = category,
                clientExpenseId = clientExpenseId
            )
            try {
                val response = api.addExpense(deviceId, memberId, roomId, request)
                if (response.isSuccessful) {
                    expenseDao.markSynced(clientExpenseId)
                } else {
                    enqueueOfflineSync()
                }
            } catch (e: Exception) {
                enqueueOfflineSync()
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateExpense(
        expenseId: String,
        amount: Double,
        description: String,
        participants: List<String>,
        category: String = "Other"
    ): Result<Unit> {
        return try {
            val deviceId = identityManager.deviceId.first()
            val memberId = identityManager.memberId.first() ?: return Result.failure(Exception("No member ID"))
            val roomId = identityManager.roomId.first() ?: return Result.failure(Exception("No room ID"))

            val existing = expenseDao.getExpenseById(expenseId)
            val changes = mutableListOf<String>()

            if (existing != null) {
                if (existing.amount != amount) {
                    changes.add("Amount: ₹${"%.2f".format(existing.amount)} → ₹${"%.2f".format(amount)}")
                }
                if (!existing.description.equals(description, ignoreCase = true)) {
                    changes.add("Description: '${existing.description}' → '$description'")
                }
                if (!existing.category.equals(category, ignoreCase = true)) {
                    changes.add("Category: ${existing.category} → $category")
                }
                if (participants.isEmpty()) {
                    changes.add("Expense CANCELLED / VOIDED (None selected, Amount set to ₹0.00)")
                } else {
                    changes.add("Contributors: ${participants.size} members")
                }
            } else {
                changes.add("Expense details updated")
            }

            val timeStr = java.text.SimpleDateFormat("dd MMM, HH:mm", java.util.Locale.getDefault()).format(java.util.Date())
            val newEntry = "• $timeStr: " + changes.joinToString(" | ")

            val fullEditLog = if (existing?.editLog.isNullOrBlank()) {
                newEntry
            } else {
                existing!!.editLog + "\n" + newEntry
            }

            val localExpense = ExpenseEntity(
                id = expenseId,
                roomId = roomId,
                paidBy = memberId,
                amount = amount,
                description = description,
                category = category,
                clientExpenseId = expenseId,
                isSynced = false,
                isEdited = true,
                editLog = fullEditLog
            )
            expenseDao.insertExpense(localExpense)

            val perShare = if (participants.isNotEmpty()) amount / participants.size else 0.0
            val participantDtos = if (participants.isNotEmpty()) {
                participants.map { ParticipantDto(it, perShare) }
            } else {
                listOf(ParticipantDto(memberId, 0.0))
            }

            val request = CreateExpenseRequest(
                amount = amount,
                description = description,
                paidBy = memberId,
                participants = participantDtos,
                category = category,
                clientExpenseId = expenseId
            )
            try {
                val response = api.updateExpense(expenseId, deviceId, memberId, roomId, request)
                if (response.isSuccessful) {
                    expenseDao.markSynced(expenseId)
                } else {
                    enqueueOfflineSync()
                }
            } catch (e: Exception) {
                enqueueOfflineSync()
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteExpense(expenseId: String): Result<Unit> {
        return try {
            val deviceId = identityManager.deviceId.first()
            val memberId = identityManager.memberId.first() ?: return Result.failure(Exception("No member ID"))
            val roomId = identityManager.roomId.first() ?: return Result.failure(Exception("No room ID"))

            // Remove locally
            expenseDao.deleteExpenseById(expenseId)

            val response = api.deleteExpense(expenseId, deviceId, memberId, roomId)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to delete expense: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getBalances(): Result<BalancesResponse> {
        return try {
            val deviceId = identityManager.deviceId.first()
            val memberId = identityManager.memberId.first() ?: return Result.failure(Exception("No member ID"))
            val roomId = identityManager.roomId.first() ?: return Result.failure(Exception("No room ID"))
            
            val response = api.getBalances(deviceId, memberId, roomId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to fetch balances"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getSettlements(): Result<List<SettlementDto>> {
        return try {
            val deviceId = identityManager.deviceId.first()
            val memberId = identityManager.memberId.first() ?: return Result.failure(Exception("No member ID"))
            val roomId = identityManager.roomId.first() ?: return Result.failure(Exception("No room ID"))

            val response = api.getSettlements(deviceId, memberId, roomId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to fetch settlements"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createSettlement(
        toMemberId: String,
        amount: Double,
        paymentMethod: String = "UPI",
        notes: String = ""
    ): Result<Unit> {
        return try {
            val deviceId = identityManager.deviceId.first()
            val memberId = identityManager.memberId.first() ?: return Result.failure(Exception("No member ID"))
            val roomId = identityManager.roomId.first() ?: return Result.failure(Exception("No room ID"))

            val request = CreateSettlementRequest(toMemberId, amount, paymentMethod, notes)
            val response = api.createSettlement(deviceId, memberId, roomId, request)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to record settlement"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getRecurringExpenses(): Result<List<RecurringExpenseDto>> {
        return try {
            val deviceId = identityManager.deviceId.first()
            val memberId = identityManager.memberId.first() ?: return Result.failure(Exception("No member ID"))
            val roomId = identityManager.roomId.first() ?: return Result.failure(Exception("No room ID"))

            val response = api.getRecurringExpenses(deviceId, memberId, roomId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to fetch recurring expenses"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createRecurringExpense(
        title: String,
        amount: Double,
        category: String,
        frequency: String
    ): Result<Unit> {
        return try {
            val deviceId = identityManager.deviceId.first()
            val memberId = identityManager.memberId.first() ?: return Result.failure(Exception("No member ID"))
            val roomId = identityManager.roomId.first() ?: return Result.failure(Exception("No room ID"))

            val request = CreateRecurringRequest(title, amount, category, frequency, memberId)
            val response = api.createRecurringExpense(deviceId, memberId, roomId, request)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to create recurring expense"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteRecurringExpense(id: String): Result<Unit> {
        return try {
            val deviceId = identityManager.deviceId.first()
            val memberId = identityManager.memberId.first() ?: return Result.failure(Exception("No member ID"))
            val roomId = identityManager.roomId.first() ?: return Result.failure(Exception("No room ID"))

            val response = api.deleteRecurringExpense(id, deviceId, memberId, roomId)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to delete recurring expense"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun askAi(question: String): Result<String> {
        return try {
            val deviceId = identityManager.deviceId.first()
            val memberId = identityManager.memberId.first() ?: return Result.failure(Exception("No member ID"))
            val roomId = identityManager.roomId.first() ?: return Result.failure(Exception("No room ID"))

            val response = api.askAi(deviceId, memberId, roomId, AiAskRequest(question))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.answer)
            } else {
                Result.failure(Exception("AI unavailable"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getAiInsights(): Result<String> {
        return try {
            val deviceId = identityManager.deviceId.first()
            val memberId = identityManager.memberId.first() ?: return Result.failure(Exception("No member ID"))
            val roomId = identityManager.roomId.first() ?: return Result.failure(Exception("No room ID"))

            val response = api.getAiInsights(deviceId, memberId, roomId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.insights)
            } else {
                Result.failure(Exception("AI insights unavailable"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
