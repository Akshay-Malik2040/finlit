package com.splitsense.data.remote.dto

import kotlinx.serialization.Serializable

@Serializable
data class RoomDto(
    val _id: String = "",
    val id: String = "",
    val name: String,
    val joinCode: String,
    val settings: RoomSettingsDto? = null,
    val createdAt: String? = null
) {
    val roomId: String get() = _id.ifBlank { id }
}

@Serializable
data class RoomSettingsDto(
    val currency: String = "INR",
    val simplifyDebts: Boolean = true
)

@Serializable
data class CreateRoomRequest(
    val name: String,
    val deviceId: String,
    val memberName: String
)

@Serializable
data class JoinRoomRequest(
    val joinCode: String,
    val deviceId: String,
    val memberName: String
)

@Serializable
data class RoomResponse(
    val message: String? = null,
    val room: RoomDto,
    val member: MemberDto,
    val members: List<MemberDto> = emptyList()
)
