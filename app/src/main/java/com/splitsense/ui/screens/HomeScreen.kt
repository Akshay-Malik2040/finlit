package com.splitsense.ui.screens

import android.content.Intent
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.splitsense.data.local.entities.ExpenseEntity
import com.splitsense.data.remote.DebtDto
import com.splitsense.util.PdfReportGenerator
import com.splitsense.viewmodel.HomeState
import com.splitsense.viewmodel.HomeViewModel
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onNavigateToQuickAdd: () -> Unit,
    onNavigateToRoomDetails: () -> Unit,
    onNavigateToSettlementHistory: () -> Unit,
    onNavigateToRecurringExpenses: () -> Unit,
    onNavigateToAiInsights: () -> Unit,
    onNavigateToSettings: () -> Unit,
    onNavigateToEditExpense: (String) -> Unit,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var selectedExpenseForDetails by remember { mutableStateOf<ExpenseEntity?>(null) }
    var selectedSettlementDebt by remember { mutableStateOf<DebtDto?>(null) }

    var searchQuery by remember { mutableStateOf("") }
    var selectedCategoryFilter by remember { mutableStateOf("All") }
    var selectedMonthFilter by remember { mutableStateOf("This Month") }

    val categories = listOf("All", "Food", "Groceries", "Bills", "Rent", "Transport", "Entertainment", "Other")

    val filteredExpenses = remember(state.expenses, searchQuery, selectedCategoryFilter) {
        state.expenses.filter { expense ->
            val matchesSearch = searchQuery.isBlank() || 
                expense.description.contains(searchQuery, ignoreCase = true) ||
                expense.category.contains(searchQuery, ignoreCase = true)
            val matchesCategory = selectedCategoryFilter == "All" || 
                expense.category.equals(selectedCategoryFilter, ignoreCase = true)
            matchesSearch && matchesCategory
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Column {
                        Text(state.room?.name ?: "SplitSense", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        state.room?.let {
                            Text("Code: ${it.joinCode}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                        }
                    }
                },
                actions = {
                    IconButton(onClick = onNavigateToAiInsights) {
                        Icon(Icons.Default.AutoAwesome, contentDescription = "AI & Insights", tint = MaterialTheme.colorScheme.primary)
                    }
                    IconButton(onClick = onNavigateToRecurringExpenses) {
                        Icon(Icons.Default.Refresh, contentDescription = "Recurring Bills")
                    }
                    IconButton(onClick = onNavigateToSettlementHistory) {
                        Icon(Icons.Default.History, contentDescription = "Settlement History")
                    }
                    IconButton(onClick = onNavigateToSettings) {
                        Icon(Icons.Default.Settings, contentDescription = "Settings")
                    }
                }
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = onNavigateToQuickAdd,
                icon = { Icon(Icons.Default.Add, contentDescription = null) },
                text = { Text("Add Expense") }
            )
        }
    ) { padding ->
        if (state.isLoading && state.expenses.isEmpty()) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                item {
                    Spacer(modifier = Modifier.height(4.dp))
                    HouseholdFinancialOverview(
                        state = state,
                        selectedMonth = selectedMonthFilter,
                        onMonthSelected = { selectedMonthFilter = it },
                        onExportPdf = {
                            PdfReportGenerator.generateAndSharePdf(
                                context = context,
                                room = state.room,
                                expenses = state.expenses,
                                members = state.members,
                                balances = state.balances,
                                settlements = emptyList(),
                                selectedMonth = selectedMonthFilter
                            )
                        }
                    )
                }

                // Suggested Settlements / Who Needs To Pay Whom Section
                item {
                    SuggestedSettlementsCard(
                        state = state,
                        onSettleClick = { debt ->
                            selectedSettlementDebt = debt
                        }
                    )
                }

                // Search & Category Filter Section
                item {
                    Column(modifier = Modifier.padding(vertical = 4.dp)) {
                        OutlinedTextField(
                            value = searchQuery,
                            onValueChange = { searchQuery = it },
                            placeholder = { Text("Search expenses...") },
                            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                            trailingIcon = {
                                if (searchQuery.isNotBlank()) {
                                    IconButton(onClick = { searchQuery = "" }) {
                                        Icon(Icons.Default.Close, contentDescription = "Clear")
                                    }
                                }
                            },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            items(categories) { category ->
                                FilterChip(
                                    selected = selectedCategoryFilter == category,
                                    onClick = { selectedCategoryFilter = category },
                                    label = { Text(category) }
                                )
                            }
                        }
                    }
                }

                item {
                    Text(
                        text = "Recent Activity (${filteredExpenses.size})",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(vertical = 2.dp)
                    )
                }

                if (filteredExpenses.isEmpty() && !state.isLoading) {
                    item {
                        Text(
                            "No expenses found.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.fillMaxWidth().padding(vertical = 24.dp),
                            textAlign = TextAlign.Center
                        )
                    }
                }

                items(filteredExpenses, key = { it.id }) { expense ->
                    ExpenseItem(
                        expense = expense,
                        onClick = { selectedExpenseForDetails = expense }
                    )
                }
                
                item {
                    Spacer(modifier = Modifier.height(80.dp))
                }
            }
        }
    }

    selectedExpenseForDetails?.let { expense ->
        ExpenseDetailsBottomSheet(
            expense = expense,
            members = state.members,
            onDismiss = { selectedExpenseForDetails = null },
            onEdit = { expenseId ->
                onNavigateToEditExpense(expenseId)
            }
        )
    }

    selectedSettlementDebt?.let { debt ->
        SettlementModalDialog(
            debt = debt,
            onDismiss = { selectedSettlementDebt = null },
            onConfirm = { toMemberId, amt, method, notes ->
                selectedSettlementDebt = null
                scope.launch {
                    viewModel.repository.createSettlement(
                        toMemberId = toMemberId,
                        amount = amt,
                        paymentMethod = method,
                        notes = notes
                    )
                    viewModel.refreshBalances()
                }
            }
        )
    }
}

@Composable
fun HouseholdFinancialOverview(
    state: HomeState,
    selectedMonth: String,
    onMonthSelected: (String) -> Unit,
    onExportPdf: () -> Unit
) {
    val totalHouseholdSpent = state.expenses.sumOf { it.amount }
    val outOfPocket = state.expenses.filter { it.paidBy == state.members.firstOrNull()?.id }.sumOf { it.amount }
    val memberCount = if (state.members.isNotEmpty()) state.members.size else 1
    val userShare = totalHouseholdSpent / memberCount
    val difference = outOfPocket - userShare

    val youOweTotal = state.balances?.youOwe?.sumOf { it.amount } ?: 0.0
    val youAreOwedTotal = state.balances?.youAreOwed?.sumOf { it.amount } ?: 0.0
    val netBalance = youAreOwedTotal - youOweTotal

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        // Month Filter Bar + Beautifully Styled PDF Export Pill
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier.weight(1f)
            ) {
                items(listOf("This Month", "Last Month", "All Time")) { monthOption ->
                    FilterChip(
                        selected = selectedMonth == monthOption,
                        onClick = { onMonthSelected(monthOption) },
                        label = { Text(monthOption) }
                    )
                }
            }

            Spacer(modifier = Modifier.width(8.dp))

            Surface(
                onClick = onExportPdf,
                shape = CircleShape,
                color = Color(0xFFEF4444).copy(alpha = 0.12f),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFEF4444).copy(alpha = 0.3f))
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)
                ) {
                    Icon(
                        Icons.Default.PictureAsPdf,
                        contentDescription = "Export PDF Report",
                        tint = Color(0xFFDC2626),
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "PDF Report",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFFDC2626)
                    )
                }
            }
        }

        // 1. Total Household Expenses Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
        ) {
            Column(modifier = Modifier.padding(18.dp)) {
                Text("Total Household Expenses", style = MaterialTheme.typography.labelMedium)
                Text(
                    text = "₹${"%.2f".format(totalHouseholdSpent)}",
                    style = MaterialTheme.typography.displaySmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                Text("Selected Period: $selectedMonth", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onPrimaryContainer)
            }
        }

        // 2. Out-of-Pocket vs Share Row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Card(
                modifier = Modifier.weight(1f),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text("Out-of-Pocket", style = MaterialTheme.typography.labelSmall)
                    Text("₹${"%.0f".format(outOfPocket)}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text("You actually paid", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            Card(
                modifier = Modifier.weight(1f),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text("Your Share", style = MaterialTheme.typography.labelSmall)
                    Text("₹${"%.0f".format(userShare)}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text(
                        text = if (difference >= 0) "+₹${"%.0f".format(difference)}" else "-₹${"%.0f".format(-difference)}",
                        style = MaterialTheme.typography.labelSmall,
                        color = if (difference >= 0) Color(0xFF10B981) else MaterialTheme.colorScheme.error,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        // 3. You Owe vs You're Owed Cards
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Card(
                modifier = Modifier.weight(1f),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text("You Owe", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onErrorContainer)
                    Text("₹${"%.2f".format(youOweTotal)}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.error)
                }
            }

            Card(
                modifier = Modifier.weight(1f),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer)
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text("You're Owed", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSecondaryContainer)
                    Text("₹${"%.2f".format(youAreOwedTotal)}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Color(0xFF10B981))
                }
            }
        }

        // 4. Net Balance Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Net Balance", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(
                    text = if (netBalance >= 0) "+₹${"%.2f".format(netBalance)}" else "-₹${"%.2f".format(-netBalance)}",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = if (netBalance >= 0) Color(0xFF10B981) else MaterialTheme.colorScheme.error
                )
            }
        }
    }
}

@Composable
fun SuggestedSettlementsCard(
    state: HomeState,
    onSettleClick: (DebtDto) -> Unit
) {
    val youOweList = state.balances?.youOwe ?: emptyList()
    val youAreOwedList = state.balances?.youAreOwed ?: emptyList()

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "Who Needs To Pay Whom",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(10.dp))

            if (youOweList.isEmpty() && youAreOwedList.isEmpty()) {
                Text(
                    text = "✓ All debts settled up!",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color(0xFF10B981)
                )
            } else {
                youOweList.forEach { debt ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("You → ${debt.name}", fontWeight = FontWeight.SemiBold)
                            Text("You owe ₹${"%.2f".format(debt.amount)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
                        }

                        Button(
                            onClick = { onSettleClick(debt) },
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                        ) {
                            Text("Settle", fontWeight = FontWeight.Bold)
                        }
                    }
                }

                youAreOwedList.forEach { debt ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("${debt.name} → You", fontWeight = FontWeight.SemiBold)
                            Text("Owes you ₹${"%.2f".format(debt.amount)}", style = MaterialTheme.typography.bodySmall, color = Color(0xFF10B981))
                        }

                        Text(
                            text = "₹${"%.2f".format(debt.amount)}",
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF10B981)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun SettlementModalDialog(
    debt: DebtDto,
    onDismiss: () -> Unit,
    onConfirm: (toMemberId: String, amount: Double, paymentMethod: String, notes: String) -> Unit
) {
    var amountInput by remember { mutableStateOf(debt.amount.toString()) }
    var selectedMethod by remember { mutableStateOf("UPI") }
    var notesInput by remember { mutableStateOf("") }

    val methods = listOf("UPI", "Cash", "Bank Transfer", "Other")

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Confirm Settlement") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Settling debt with ${debt.name}", fontWeight = FontWeight.SemiBold)
                OutlinedTextField(
                    value = amountInput,
                    onValueChange = { amountInput = it },
                    label = { Text("Settlement Amount (₹)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Text("Payment Method", style = MaterialTheme.typography.labelMedium)
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    methods.forEach { m ->
                        FilterChip(
                            selected = selectedMethod == m,
                            onClick = { selectedMethod = m },
                            label = { Text(m) }
                        )
                    }
                }

                OutlinedTextField(
                    value = notesInput,
                    onValueChange = { notesInput = it },
                    label = { Text("Notes (Optional)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val amt = amountInput.toDoubleOrNull() ?: 0.0
                    if (amt > 0.0) {
                        onConfirm(debt.memberId, amt, selectedMethod, notesInput)
                    }
                }
            ) {
                Text("Confirm Payment")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}

@Composable
fun ExpenseItem(
    expense: ExpenseEntity,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                modifier = Modifier.size(48.dp),
                shape = MaterialTheme.shapes.small,
                color = MaterialTheme.colorScheme.secondaryContainer
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(expense.category.take(1).uppercase(), fontWeight = FontWeight.Bold)
                }
            }
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                Text(expense.description, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(expense.category, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    if (expense.isEdited) {
                        Text(
                            text = "• EDITED 📝",
                            style = MaterialTheme.typography.labelSmall,
                            color = Color(0xFFD97706),
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
            
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "₹${"%.2f".format(expense.amount)}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                if (!expense.isSynced) {
                    Text("Pending sync", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.error)
                }
            }
        }
    }
}
