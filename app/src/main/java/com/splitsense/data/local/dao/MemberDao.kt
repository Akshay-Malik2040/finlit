package com.splitsense.data.local.dao

import androidx.room.*
import com.splitsense.data.local.entities.MemberEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface MemberDao {
    @Query("SELECT * FROM members WHERE roomId = :roomId")
    fun getMembersForRoom(roomId: String): Flow<List<MemberEntity>>

    @Query("SELECT * FROM members WHERE roomId = :roomId")
    suspend fun getMembersListForRoom(roomId: String): List<MemberEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMembers(members: List<MemberEntity>)

    @Query("DELETE FROM members")
    suspend fun clearMembers()
}
