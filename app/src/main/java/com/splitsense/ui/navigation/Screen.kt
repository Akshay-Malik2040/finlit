package com.splitsense.ui.navigation

sealed class Screen(val route: String) {
    object Onboarding : Screen("onboarding")
    object Home : Screen("home")
    object QuickAdd : Screen("quick_add")
    object RoomDetails : Screen("room_details")
    object EditExpense : Screen("edit_expense/{expenseId}") {
        fun createRoute(expenseId: String) = "edit_expense/$expenseId"
    }
    object Settlement : Screen("settlement/{memberId}/{memberName}/{amount}") {
        fun createRoute(memberId: String, memberName: String, amount: Double) = 
            "settlement/$memberId/$memberName/$amount"
    }
    object SettlementHistory : Screen("settlement_history")
    object RecurringExpenses : Screen("recurring_expenses")
    object AiInsights : Screen("ai_insights")
    object Settings : Screen("settings")
}
