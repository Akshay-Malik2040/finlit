package com.splitsense

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.splitsense.ui.navigation.Screen
import com.splitsense.ui.screens.*
import com.splitsense.ui.theme.SplitSenseTheme
import com.splitsense.viewmodel.MainViewModel
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            SplitSenseTheme {
                SplitSenseAppRoot()
            }
        }
    }
}

@Composable
fun SplitSenseAppRoot(viewModel: MainViewModel = hiltViewModel()) {
    val navController = rememberNavController()
    val startDestination by viewModel.startDestination.collectAsState()

    if (startDestination == null) return

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        NavHost(
            navController = navController,
            startDestination = startDestination!!
        ) {
            composable(Screen.Onboarding.route) {
                OnboardingScreen(
                    onNavigateToHome = {
                        navController.navigate(Screen.Home.route) {
                            popUpTo(Screen.Onboarding.route) { inclusive = true }
                        }
                    }
                )
            }
            composable(Screen.Home.route) {
                HomeScreen(
                    onNavigateToQuickAdd = {
                        navController.navigate(Screen.QuickAdd.route)
                    },
                    onNavigateToRoomDetails = {
                        navController.navigate(Screen.RoomDetails.route)
                    },
                    onNavigateToSettlementHistory = {
                        navController.navigate(Screen.SettlementHistory.route)
                    },
                    onNavigateToRecurringExpenses = {
                        navController.navigate(Screen.RecurringExpenses.route)
                    },
                    onNavigateToAiInsights = {
                        navController.navigate(Screen.AiInsights.route)
                    },
                    onNavigateToSettings = {
                        navController.navigate(Screen.Settings.route)
                    },
                    onNavigateToEditExpense = { expenseId ->
                        navController.navigate(Screen.EditExpense.createRoute(expenseId))
                    }
                )
            }
            composable(Screen.QuickAdd.route) {
                QuickAddScreen(
                    onNavigateBack = {
                        navController.popBackStack()
                    }
                )
            }
            composable(Screen.RoomDetails.route) {
                RoomDetailsScreen(
                    onNavigateBack = {
                        navController.popBackStack()
                    }
                )
            }
            composable(
                route = Screen.EditExpense.route,
                arguments = listOf(navArgument("expenseId") { type = NavType.StringType })
            ) { backStackEntry ->
                val expenseId = backStackEntry.arguments?.getString("expenseId") ?: ""
                EditExpenseScreen(
                    expenseId = expenseId,
                    onNavigateBack = { navController.popBackStack() }
                )
            }
            composable(Screen.SettlementHistory.route) {
                SettlementHistoryScreen(
                    onBackClick = { navController.popBackStack() }
                )
            }
            composable(Screen.RecurringExpenses.route) {
                RecurringExpenseScreen(
                    onBackClick = { navController.popBackStack() }
                )
            }
            composable(Screen.AiInsights.route) {
                AiInsightsScreen(
                    onBackClick = { navController.popBackStack() }
                )
            }
            composable(Screen.Settings.route) {
                val scope = androidx.compose.runtime.rememberCoroutineScope()
                SettingsScreen(
                    onBackClick = { navController.popBackStack() },
                    onLeaveRoom = {
                        scope.launch {
                            viewModel.repository.leaveRoom()
                            navController.navigate(Screen.Onboarding.route) {
                                popUpTo(Screen.Home.route) { inclusive = true }
                            }
                        }
                    }
                )
            }
            composable(
                route = Screen.Settlement.route,
                arguments = listOf(
                    navArgument("memberId") { type = NavType.StringType },
                    navArgument("memberName") { type = NavType.StringType },
                    navArgument("amount") { type = NavType.FloatType }
                )
            ) { backStackEntry ->
                val memberId = backStackEntry.arguments?.getString("memberId") ?: ""
                val memberName = backStackEntry.arguments?.getString("memberName") ?: ""
                val amount = backStackEntry.arguments?.getFloat("amount") ?: 0f
                
                SettlementScreen(
                    memberId = memberId,
                    memberName = memberName,
                    amount = amount.toDouble(),
                    onNavigateBack = { navController.popBackStack() }
                )
            }
        }
    }
}
