package com.splitsense.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import com.splitsense.R

/**
 * SplitSense V2 Native Android Home Screen Widget Provider.
 * Allows flatmates to record ₹ amounts and adjust participants directly from launcher screen.
 */
class QuickExpenseWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        const fontColorGreen = 0xFF10B981.toInt()

        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            // Instantiate Android RemoteViews layout
            val views = RemoteViews(context.packageName, R.layout.quick_expense_widget)

            // Deep-link intent to open full SplitSense V2 App Quick Add Modal
            const ACTION_QUICK_ADD = "com.splitsense.ACTION_QUICK_ADD"
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("splitsense://quick-add")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // Attach click listener to ADD button
            views.setOnClickPendingIntent(R.id.btn_widget_add, pendingIntent)

            // Push layout update to Android Home Screen
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
