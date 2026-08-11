package com.splitsense.data.local.dao

import androidx.room.*
import com.splitsense.data.local.entities.RoomEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface RoomDao {
    @Query("SELECT * FROM rooms LIMIT 1")
    fun getRoom(): Flow<RoomEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRoom(room: RoomEntity)

    @Query("DELETE FROM rooms")
    suspend fun clearRoom()
}
