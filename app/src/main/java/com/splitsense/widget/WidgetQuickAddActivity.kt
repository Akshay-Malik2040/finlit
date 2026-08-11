package com.splitsense.widget

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.state.getAppWidgetState
import androidx.glance.appwidget.state.updateAppWidgetState
import androidx.glance.state.PreferencesGlanceStateDefinition
import androidx.lifecycle.lifecycleScope
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.splitsense.data.local.SplitSenseDatabase
import com.splitsense.data.local.entities.ExpenseEntity
import com.splitsense.sync.SyncWorker
import com.splitsense.util.IdentityManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.util.UUID

@AndroidEntryPoint
class WidgetQuickAddActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Transparent),
                contentAlignment = Alignment.Center
            ) {
                LiveWidgetKeyboardListener(
                    onAmountChanged = { newAmount ->
                        updateWidgetAmountLive(newAmount)
                    },
                    onDone = { finalAmount ->
                        saveExpenseAndFinish(finalAmount)
                    },
                    onDismiss = { finish() }
                )
            }
        }
    }

    private fun updateWidgetAmountLive(amountStr: String) {
        lifecycleScope.launch {
            try {
                val glanceManager = GlanceAppWidgetManager(applicationContext)
                val glanceIds = glanceManager.getGlanceIds(SplitSenseWidget::class.java)
                for (glanceId in glanceIds) {
                    updateAppWidgetState(applicationContext, glanceId) { prefs ->
                        prefs[WidgetKeys.KEY_AMOUNT] = amountStr
                    }
                    SplitSenseWidget().update(applicationContext, glanceId)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun saveExpenseAndFinish(amountStr: String) {
        val amountDouble = amountStr.toDoubleOrNull() ?: 0.0
        if (amountDouble <= 0.0) {
            finish()
            return
        }

        lifecycleScope.launch {
            try {
                val identityManager = IdentityManager(applicationContext)
                val roomId = identityManager.roomId.first()
                val memberId = identityManager.memberId.first()

                if (!roomId.isNullOrBlank() && !memberId.isNullOrBlank()) {
                    val db = SplitSenseDatabase.getDatabase(applicationContext)
                    val clientExpenseId = UUID.randomUUID().toString()

                    val glanceManager = GlanceAppWidgetManager(applicationContext)
                    val glanceIds = glanceManager.getGlanceIds(SplitSenseWidget::class.java)
                    var categoryStr = "Other"

                    if (glanceIds.isNotEmpty()) {
                        try {
                            val prefs = getAppWidgetState(
                                applicationContext,
                                PreferencesGlanceStateDefinition,
                                glanceIds.first()
                            )
                            categoryStr = prefs[WidgetKeys.KEY_CATEGORY] ?: "Other"
                        } catch (e: Exception) {
                            e.printStackTrace()
                        }
                    }

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

                    // Enqueue background sync with immediate REPLACE policy
                    val syncWorkRequest = OneTimeWorkRequestBuilder<SyncWorker>().build()
                    WorkManager.getInstance(applicationContext).enqueueUniqueWork(
                        "widget_instant_sync",
                        androidx.work.ExistingWorkPolicy.REPLACE,
                        syncWorkRequest
                    )

                    // Update Glance Widget status banner
                    for (glanceId in glanceIds) {
                        updateAppWidgetState(applicationContext, glanceId) { prefs ->
                            prefs[WidgetKeys.KEY_AMOUNT] = ""
                            prefs[WidgetKeys.KEY_SHOW_KEYPAD] = false
                            prefs[WidgetKeys.KEY_STATUS_MSG] = "✓ Saved ₹${"%.0f".format(amountDouble)}!"
                        }
                        SplitSenseWidget().update(applicationContext, glanceId)
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                finish()
            }
        }
    }
}

@Composable
fun LiveWidgetKeyboardListener(
    onAmountChanged: (String) -> Unit,
    onDone: (String) -> Unit,
    onDismiss: () -> Unit
) {
    var text by remember { mutableStateOf("") }
    val focusRequester = remember { FocusRequester() }
    val keyboardController = LocalSoftwareKeyboardController.current

    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
        keyboardController?.show()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .clickable(
                indication = null,
                interactionSource = remember { MutableInteractionSource() }
            ) {
                onDismiss()
            },
        contentAlignment = Alignment.Center
    ) {
        BasicTextField(
            value = text,
            onValueChange = { input ->
                if (input.all { char -> char.isDigit() || char == '.' }) {
                    text = input
                    onAmountChanged(input)
                }
            },
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Decimal,
                imeAction = ImeAction.Done
            ),
            keyboardActions = KeyboardActions(
                onDone = { onDone(text) }
            ),
            textStyle = TextStyle(color = Color.Transparent, fontSize = 1.sp),
            modifier = Modifier
                .size(1.dp)
                .focusRequester(focusRequester)
        )
    }
}
