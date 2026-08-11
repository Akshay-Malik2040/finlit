package com.splitsense.sync

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import androidx.work.ListenableWorker.Result
import com.splitsense.data.local.dao.ExpenseDao
import com.splitsense.data.remote.SplitSenseApi
import com.splitsense.data.remote.dto.CreateExpenseRequest
import com.splitsense.data.remote.dto.ParticipantDto
import com.splitsense.util.IdentityManager
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import kotlinx.coroutines.flow.first

@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val api: SplitSenseApi,
    private val expenseDao: ExpenseDao,
    private val memberDao: com.splitsense.data.local.dao.MemberDao,
    private val identityManager: IdentityManager
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result {
        return try {
            val unsyncedExpenses = expenseDao.getUnsyncedExpenses()
            if (unsyncedExpenses.isEmpty()) return Result.success()

            val deviceId = identityManager.deviceId.first()
            val memberId = identityManager.memberId.first() ?: return Result.failure()
            val roomId = identityManager.roomId.first() ?: return Result.failure()
            val members = memberDao.getMembersListForRoom(roomId)
            val participantIds = if (members.isNotEmpty()) members.map { it.id } else listOf(memberId)

            var allSynced = true
            for (expense in unsyncedExpenses) {
                val perShare = expense.amount / participantIds.size
                val request = CreateExpenseRequest(
                    amount = expense.amount,
                    description = expense.description,
                    paidBy = expense.paidBy,
                    participants = participantIds.map { ParticipantDto(it, perShare) },
                    category = expense.category,
                    clientExpenseId = expense.clientExpenseId ?: expense.id
                )

                val response = api.addExpense(deviceId, memberId, roomId, request)
                if (response.isSuccessful) {
                    expenseDao.markSynced(expense.clientExpenseId ?: expense.id)
                } else {
                    allSynced = false
                }
            }

            if (allSynced) Result.success() else Result.retry()
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
