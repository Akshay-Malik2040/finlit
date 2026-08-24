package com.splitsense.data.remote.dto

import kotlinx.serialization.KSerializer
import kotlinx.serialization.Serializable
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.*

object StringOrObjectSerializer : KSerializer<String> {
    override val descriptor: SerialDescriptor = PrimitiveSerialDescriptor("StringOrObject", PrimitiveKind.STRING)

    override fun deserialize(decoder: Decoder): String {
        val jsonDecoder = decoder as? JsonDecoder
            ?: return decoder.decodeString()

        return when (val element = jsonDecoder.decodeJsonElement()) {
            is JsonPrimitive -> element.content
            is JsonObject -> {
                element["_id"]?.jsonPrimitive?.content
                    ?: element["id"]?.jsonPrimitive?.content
                    ?: element["name"]?.jsonPrimitive?.content
                    ?: element.toString()
            }
            else -> element.toString()
        }
    }

    override fun serialize(encoder: Encoder, value: String) {
        encoder.encodeString(value)
    }
}

@Serializable
data class ExpenseDto(
    val _id: String,
    val roomId: String = "",
    @Serializable(with = StringOrObjectSerializer::class)
    val paidBy: String = "",
    val amount: Double = 0.0,
    val description: String = "",
    val category: String = "Other",
    val participants: List<ParticipantDto> = emptyList(),
    val splitType: String = "equal",
    val expenseScope: String = "shared",
    val notes: String = "",
    val receiptUrl: String = "",
    val source: String = "quick",
    val clientExpenseId: String? = null,
    val createdAt: String? = null
)

@Serializable
data class ParticipantDto(
    @Serializable(with = StringOrObjectSerializer::class)
    val memberId: String = "",
    val share: Double = 0.0
)

@Serializable
data class CreateExpenseRequest(
    val amount: Double,
    val description: String,
    val paidBy: String,
    val participants: List<ParticipantDto>,
    val category: String = "Other",
    val splitType: String = "equal",
    val clientExpenseId: String
)
