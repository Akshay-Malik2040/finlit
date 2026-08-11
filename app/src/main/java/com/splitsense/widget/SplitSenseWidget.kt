package com.splitsense.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.datastore.preferences.core.Preferences
import androidx.glance.Button
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.actionParametersOf
import androidx.glance.action.actionStartActivity
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.currentState
import androidx.glance.layout.*
import androidx.glance.state.GlanceStateDefinition
import androidx.glance.state.PreferencesGlanceStateDefinition
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.splitsense.data.local.SplitSenseDatabase
import com.splitsense.data.local.entities.MemberEntity
import com.splitsense.util.IdentityManager
import kotlinx.coroutines.flow.first

class SplitSenseWidget : GlanceAppWidget() {

    override val stateDefinition: GlanceStateDefinition<Preferences> = PreferencesGlanceStateDefinition

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val identityManager = IdentityManager(context)
        val roomName = identityManager.roomName.first() ?: "Flat 302"
        val roomId = identityManager.roomId.first() ?: ""

        val members = if (roomId.isNotBlank()) {
            try {
                val db = SplitSenseDatabase.getDatabase(context)
                db.memberDao().getMembersListForRoom(roomId)
            } catch (e: Exception) {
                emptyList()
            }
        } else emptyList()

        provideContent {
            val prefs = currentState<Preferences>()
            val amountStr = prefs[WidgetKeys.KEY_AMOUNT] ?: ""
            val statusMsg = prefs[WidgetKeys.KEY_STATUS_MSG] ?: ""
            val unselectedRaw = prefs[WidgetKeys.KEY_UNSELECTED_MEMBERS] ?: ""
            val unselectedSet = if (unselectedRaw.isBlank()) emptySet() else unselectedRaw.split(",").toSet()

            WidgetContent(
                roomName = roomName,
                amountStr = amountStr,
                statusMsg = statusMsg,
                members = members,
                unselectedSet = unselectedSet
            )
        }
    }

    @Composable
    private fun WidgetContent(
        roomName: String,
        amountStr: String,
        statusMsg: String,
        members: List<MemberEntity>,
        unselectedSet: Set<String>
    ) {
        // Translucent Dark Glass Container Theme
        val backgroundColor = ColorProvider(Color(0xD90F172A)) // 85% translucent slate glass
        val primaryAccent = ColorProvider(Color(0xFF10B981)) // Emerald Green accent
        val textColor = ColorProvider(Color(0xFFF8FAFC))

        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .padding(10.dp)
                .background(backgroundColor),
            horizontalAlignment = Alignment.Horizontal.CenterHorizontally,
            verticalAlignment = Alignment.Vertical.CenterVertically
        ) {
            // 1. Room Name Pill Title
            Text(
                text = "• ${roomName.uppercase()} •",
                style = TextStyle(
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    color = primaryAccent
                ),
                modifier = GlanceModifier.padding(bottom = 2.dp)
            )

            // Status message toast banner if present
            if (statusMsg.isNotBlank()) {
                Text(
                    text = statusMsg,
                    style = TextStyle(
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = primaryAccent
                    ),
                    modifier = GlanceModifier.padding(bottom = 2.dp)
                )
            }

            // 2. Rectangular Amount Field Card
            Button(
                text = if (amountStr.isEmpty()) "₹ 0 (Tap to Type)" else "₹ $amountStr",
                onClick = actionStartActivity<WidgetQuickAddActivity>(),
                modifier = GlanceModifier.fillMaxWidth().padding(vertical = 4.dp)
            )

            Spacer(modifier = GlanceModifier.height(6.dp))

            // 3. Row of Minimal Circles with Checkmarks (Matches sketch 4 circles with ✓)
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                horizontalAlignment = Alignment.Horizontal.CenterHorizontally,
                verticalAlignment = Alignment.Vertical.CenterVertically
            ) {
                if (members.isNotEmpty()) {
                    members.take(4).forEach { member ->
                        val isSelected = !unselectedSet.contains(member.id)
                        val initials = member.name.take(2).uppercase()
                        val badgeLabel = if (isSelected) "$initials ✓" else "$initials ✗"
                        
                        Button(
                            text = badgeLabel,
                            onClick = actionRunCallback<ToggleMemberActionCallback>(
                                actionParametersOf(WidgetKeys.PARAM_MEMBER_ID to member.id)
                            ),
                            modifier = GlanceModifier.defaultWeight().padding(1.dp)
                        )
                    }
                } else {
                    val defaultMembers = listOf("YO", "RA", "AK", "AM")
                    defaultMembers.forEach { initials ->
                        Button(
                            text = "$initials ✓",
                            onClick = actionStartActivity<WidgetQuickAddActivity>(),
                            modifier = GlanceModifier.defaultWeight().padding(1.dp)
                        )
                    }
                }
            }
        }
    }
}
