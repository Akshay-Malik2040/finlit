package com.splitsense.widget

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.glance.GlanceId
import androidx.glance.action.ActionParameters
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.state.updateAppWidgetState
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.splitsense.data.local.SplitSenseDatabase
import com.splitsense.data.local.entities.ExpenseEntity
import com.splitsense.sync.SyncWorker
import com.splitsense.util.IdentityManager
import kotlinx.coroutines.flow.first
import java.util.UUID

object WidgetKeys {
    val KEY_AMOUNT = stringPreferencesKey("widget_amount")
    val KEY_CATEGORY = stringPreferencesKey("widget_category")
    val KEY_UNSELECTED_MEMBERS = stringPreferencesKey("widget_unselected_members")
    val KEY_STATUS_MSG = stringPreferencesKey("widget_status_msg")
    val KEY_SHOW_KEYPAD = androidx.datastore.preferences.core.booleanPreferencesKey("widget_show_keypad")
    
    val PARAM_KEYPAD_VAL = ActionParameters.Key<String>("keypad_val")
    val PARAM_CATEGORY_VAL = ActionParameters.Key<String>("category_val")
    val PARAM_MEMBER_ID = ActionParameters.Key<String>("member_id")
}

class ToggleKeypadActionCallback : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters
    ) {
        updateAppWidgetState(context, glanceId) { prefs ->
            val current = prefs[WidgetKeys.KEY_SHOW_KEYPAD] ?: false
            prefs[WidgetKeys.KEY_SHOW_KEYPAD] = !current
        }
        SplitSenseWidget().update(context, glanceId)
    }
}

class KeypadActionCallback : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters
    ) {
        val input = parameters[WidgetKeys.PARAM_KEYPAD_VAL] ?: return

        updateAppWidgetState(context, glanceId) { prefs ->
            val currentAmount = prefs[WidgetKeys.KEY_AMOUNT] ?: ""
            val newAmount = when (input) {
                "CLEAR" -> ""
                "DEL" -> if (currentAmount.isNotEmpty()) currentAmount.dropLast(1) else ""
                "." -> if (!currentAmount.contains(".")) {
                    if (currentAmount.isEmpty()) "0." else "$currentAmount."
                } else currentAmount
                else -> {
                    if (currentAmount.length < 7) {
                        if (currentAmount == "0") input else "$currentAmount$input"
                    } else currentAmount
                }
            }
            prefs[WidgetKeys.KEY_AMOUNT] = newAmount
            prefs[WidgetKeys.KEY_STATUS_MSG] = ""
        }
        SplitSenseWidget().update(context, glanceId)
    }
}

class CategoryActionCallback : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters
    ) {
        val category = parameters[WidgetKeys.PARAM_CATEGORY_VAL] ?: "Other"
        updateAppWidgetState(context, glanceId) { prefs ->
            prefs[WidgetKeys.KEY_CATEGORY] = category
        }
        SplitSenseWidget().update(context, glanceId)
    }
}

class ToggleMemberActionCallback : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters
    ) {
        val memberId = parameters[WidgetKeys.PARAM_MEMBER_ID] ?: return
        updateAppWidgetState(context, glanceId) { prefs ->
            val raw = prefs[WidgetKeys.KEY_UNSELECTED_MEMBERS] ?: ""
            val currentUnselected = if (raw.isBlank()) mutableSetOf() else raw.split(",").toMutableSet()
            if (currentUnselected.contains(memberId)) {
                currentUnselected.remove(memberId)
            } else {
                currentUnselected.add(memberId)
            }
            prefs[WidgetKeys.KEY_UNSELECTED_MEMBERS] = currentUnselected.joinToString(",")
        }
        SplitSenseWidget().update(context, glanceId)
    }
}

class SubmitExpenseActionCallback : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters
    ) {
        val identityManager = IdentityManager(context)
        val roomId = identityManager.roomId.first()
        val memberId = identityManager.memberId.first()

        if (roomId.isNullOrBlank() || memberId.isNullOrBlank()) {
            updateAppWidgetState(context, glanceId) { prefs ->
                prefs[WidgetKeys.KEY_STATUS_MSG] = "Error: Open App to setup room"
            }
            SplitSenseWidget().update(context, glanceId)
            return
        }

        var amountDouble = 0.0
        var categoryStr = "Other"
        var unselectedSet = setOf<String>()

        updateAppWidgetState(context, glanceId) { prefs ->
            val amtStr = prefs[WidgetKeys.KEY_AMOUNT] ?: ""
            amountDouble = amtStr.toDoubleOrNull() ?: 0.0
            categoryStr = prefs[WidgetKeys.KEY_CATEGORY] ?: "Other"
            val raw = prefs[WidgetKeys.KEY_UNSELECTED_MEMBERS] ?: ""
            unselectedSet = if (raw.isBlank()) emptySet() else raw.split(",").toSet()
        }

        if (amountDouble <= 0.0) {
            updateAppWidgetState(context, glanceId) { prefs ->
                prefs[WidgetKeys.KEY_STATUS_MSG] = "Enter valid amount"
            }
            SplitSenseWidget().update(context, glanceId)
            return
        }

        try {
            val db = SplitSenseDatabase.getDatabase(context)
            val clientExpenseId = UUID.randomUUID().toString()

            val localExpense = ExpenseEntity(
                id = clientExpenseId,
                roomId = roomId,
                paidBy = memberId,
                amount = amountDouble,
                description = "$categoryStr Expense",
                category = categoryStr,
                clientExpenseId = clientExpenseId,
                isSynced = false,
                isEdited = false,
                editLog = ""
            )

            db.expenseDao().insertExpense(localExpense)

            val syncWorkRequest = OneTimeWorkRequestBuilder<SyncWorker>().build()
            WorkManager.getInstance(context).enqueue(syncWorkRequest)

            updateAppWidgetState(context, glanceId) { prefs ->
                prefs[WidgetKeys.KEY_AMOUNT] = ""
                prefs[WidgetKeys.KEY_SHOW_KEYPAD] = false
                prefs[WidgetKeys.KEY_STATUS_MSG] = "✓ Saved ₹${"%.0f".format(amountDouble)}!"
            }
            SplitSenseWidget().update(context, glanceId)
        } catch (e: Exception) {
            updateAppWidgetState(context, glanceId) { prefs ->
                prefs[WidgetKeys.KEY_STATUS_MSG] = "Failed to save: ${e.localizedMessage}"
            }
            SplitSenseWidget().update(context, glanceId)
        }
    }
}
