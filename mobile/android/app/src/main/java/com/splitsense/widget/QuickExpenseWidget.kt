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
 * FinLit Native Android Home Screen Widget Provider.
 * Allows flatmates to quickly enter ₹ amount and log shared household expenses directly from the launcher.
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
        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            // Instantiate Android RemoteViews layout
            val views = RemoteViews(context.packageName, R.layout.quick_expense_widget)

            // Read active room and member data from SharedPreferences
            val prefs = context.getSharedPreferences("finlit_widget_prefs", Context.MODE_PRIVATE)
            val roomName = prefs.getString("active_room_name", "Flat 302")
            val memberSummary = prefs.getString("active_members_summary", "Everyone ✓")

            views.setTextViewText(R.id.txt_room_title, "FinLit 🏠 $roomName")

            // Deep-link intent to launch FinLit Quick Add Screen
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("finlit://quick-add")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // Attach click listener to ADD button & widget container
            views.setOnClickPendingIntent(R.id.btn_widget_add, pendingIntent)

            // Push layout update to Android Home Screen
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
