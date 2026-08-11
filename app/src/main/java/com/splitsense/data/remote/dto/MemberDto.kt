package com.splitsense.data.remote.dto

import kotlinx.serialization.Serializable

@Serializable
data class MemberDto(
    val _id: String = "",
    val id: String = "",
    val roomId: String = "",
    val name: String,
    val deviceId: String = "",
    val role: String = "member",
    val avatar: String = "",
    val isActive: Boolean = true
) {
    val memberId: String get() = _id.ifBlank { id }
}
