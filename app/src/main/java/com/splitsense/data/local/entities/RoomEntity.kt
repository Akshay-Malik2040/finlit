package com.splitsense.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "rooms")
data class RoomEntity(
    @PrimaryKey val id: String,
    val name: String,
    val joinCode: String,
    val currency: String = "INR",
    val simplifyDebts: Boolean = true
)
