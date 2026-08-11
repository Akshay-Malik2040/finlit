package com.splitsense.data.local.dao

import androidx.room.*
import com.splitsense.data.local.entities.ExpenseEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ExpenseDao {
    @Query("SELECT * FROM expenses WHERE roomId = :roomId ORDER BY createdAt DESC")
    fun getExpensesForRoom(roomId: String): Flow<List<ExpenseEntity>>

    @Query("SELECT * FROM expenses WHERE roomId = :roomId ORDER BY createdAt DESC")
    suspend fun getExpensesForRoomOnce(roomId: String): List<ExpenseEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertExpenses(expenses: List<ExpenseEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertExpense(expense: ExpenseEntity)

    @Query("SELECT * FROM expenses WHERE isSynced = 0")
    suspend fun getUnsyncedExpenses(): List<ExpenseEntity>

    @Query("UPDATE expenses SET isSynced = 1 WHERE clientExpenseId = :clientExpenseId")
    suspend fun markSynced(clientExpenseId: String)

    @Query("SELECT * FROM expenses WHERE id = :id LIMIT 1")
    suspend fun getExpenseById(id: String): ExpenseEntity?

    @Query("DELETE FROM expenses WHERE id = :id")
    suspend fun deleteExpenseById(id: String)

    @Query("DELETE FROM expenses")
    suspend fun clearExpenses()
}
