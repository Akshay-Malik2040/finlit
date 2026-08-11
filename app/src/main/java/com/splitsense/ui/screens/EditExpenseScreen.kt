package com.splitsense.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.splitsense.viewmodel.HomeViewModel
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditExpenseScreen(
    expenseId: String,
    onNavigateBack: () -> Unit,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    val scope = rememberCoroutineScope()

    val targetExpense = state.expenses.find { it.id == expenseId }

    var amountText by remember(targetExpense) { mutableStateOf(targetExpense?.amount?.toString() ?: "") }
    var descriptionText by remember(targetExpense) { mutableStateOf(targetExpense?.description ?: "") }
    var selectedCategory by remember(targetExpense) { mutableStateOf(targetExpense?.category ?: "Other") }
    
    // Member contributions selection state
    val selectedMemberIds = remember(state.members) {
        mutableStateListOf<String>().apply {
            addAll(state.members.map { it.id })
        }
    }

    var isSaving by remember { mutableStateOf(false) }
    val categories = listOf("Food", "Groceries", "Bills", "Rent", "Transport", "Entertainment", "Other")

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Edit Expense", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            OutlinedTextField(
                value = amountText,
                onValueChange = { amountText = it },
                label = { Text("Amount (₹)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            OutlinedTextField(
                value = descriptionText,
                onValueChange = { descriptionText = it },
                label = { Text("Description (e.g. Dinner)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            // Category Selection
            Text("Category", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(categories) { category ->
                    FilterChip(
                        selected = selectedCategory == category,
                        onClick = { selectedCategory = category },
                        label = { Text(category) }
                    )
                }
            }

            // Member Contributions Selection Section
            Text(
                text = "Contributing Members (Split Between)",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                item {
                    FilterChip(
                        selected = selectedMemberIds.isEmpty(),
                        onClick = { selectedMemberIds.clear() },
                        label = { Text("None") }
                    )
                }

                items(state.members) { member ->
                    val isSelected = selectedMemberIds.contains(member.id)
                    EditMemberChip(
                        name = member.name,
                        isSelected = isSelected,
                        onClick = {
                            if (isSelected) {
                                selectedMemberIds.remove(member.id)
                            } else {
                                selectedMemberIds.add(member.id)
                            }
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            val isNoneSelected = selectedMemberIds.isEmpty()

            Button(
                onClick = {
                    val rawAmt = amountText.toDoubleOrNull() ?: 0.0
                    val finalAmt = if (isNoneSelected) 0.0 else rawAmt
                    val finalDesc = if (isNoneSelected) {
                        if (descriptionText.contains("(CANCELLED)")) descriptionText else "$descriptionText (CANCELLED)"
                    } else descriptionText
                    val finalCategory = if (isNoneSelected) "Cancelled" else selectedCategory

                    if (descriptionText.isNotBlank()) {
                        isSaving = true
                        scope.launch {
                            viewModel.repository.updateExpense(
                                expenseId = expenseId,
                                amount = finalAmt,
                                description = finalDesc,
                                participants = if (isNoneSelected) emptyList() else selectedMemberIds.toList(),
                                category = finalCategory
                            )
                            viewModel.refreshBalances()
                            isSaving = false
                            onNavigateBack()
                        }
                    }
                },
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isNoneSelected) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary
                ),
                modifier = Modifier.fillMaxWidth().height(50.dp),
                enabled = !isSaving && descriptionText.isNotBlank()
            ) {
                if (isSaving) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary)
                } else if (isNoneSelected) {
                    Text("Void / Cancel Expense (Amount → ₹0) 🚫", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                } else {
                    Text("Save Changes ⚡", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
            }
        }
    }
}

@Composable
fun EditMemberChip(name: String, isSelected: Boolean, onClick: () -> Unit) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.clickable { onClick() }
    ) {
        Box(contentAlignment = Alignment.Center) {
            Surface(
                modifier = Modifier.size(56.dp),
                shape = MaterialTheme.shapes.medium,
                color = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = name.take(1).uppercase(),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = if (isSelected) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            if (isSelected) {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .offset(x = 4.dp, y = (-4).dp)
                        .size(20.dp)
                )
            }
        }
        Text(
            text = name,
            style = MaterialTheme.typography.bodySmall,
            modifier = Modifier.padding(top = 4.dp)
        )
    }
}
