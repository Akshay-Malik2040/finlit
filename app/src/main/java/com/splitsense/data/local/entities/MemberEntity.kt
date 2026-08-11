package com.splitsense.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "members")
data class MemberEntity(
    @PrimaryKey val id: String,
    val roomId: String,
    val name: String,
    val role: String,
    val avatar: String = "",
    val isActive: Boolean = true
)
