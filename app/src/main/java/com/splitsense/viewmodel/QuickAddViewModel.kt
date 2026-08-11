package com.splitsense.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.splitsense.data.local.entities.MemberEntity
import com.splitsense.data.repository.SplitSenseRepository
import com.splitsense.util.IdentityManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class QuickAddState(
    val members: List<MemberEntity> = emptyList(),
    val selectedMemberIds: Set<String> = emptySet(),
    val isLoading: Boolean = false,
    val isSuccess: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class QuickAddViewModel @Inject constructor(
    private val repository: SplitSenseRepository,
    private val identityManager: IdentityManager
) : ViewModel() {

    private val _state = MutableStateFlow(QuickAddState())
    val state: StateFlow<QuickAddState> = _state.asStateFlow()

    init {
        loadMembers()
    }

    private fun loadMembers() {
        viewModelScope.launch {
            identityManager.roomId.collect { roomId ->
                if (roomId != null) {
                    repository.getMembers(roomId).collect { members ->
                        _state.update { 
                            it.copy(
                                members = members,
                                selectedMemberIds = members.map { m -> m.id }.toSet()
                            )
                        }
                    }
                }
            }
        }
    }

    fun toggleMember(memberId: String) {
        _state.update { currentState ->
            val newSelected = if (currentState.selectedMemberIds.contains(memberId)) {
                currentState.selectedMemberIds - memberId
            } else {
                currentState.selectedMemberIds + memberId
            }
            currentState.copy(selectedMemberIds = newSelected)
        }
    }

    fun clearAllMembers() {
        _state.update { it.copy(selectedMemberIds = emptySet()) }
    }

    fun addExpense(amount: Double, description: String) {
        if (amount <= 0) {
            _state.update { it.copy(error = "Amount must be greater than 0") }
            return
        }
        if (_state.value.selectedMemberIds.isEmpty()) {
            _state.update { it.copy(error = "Select at least one participant") }
            return
        }

        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            val result = repository.addExpense(
                amount = amount,
                description = description.ifBlank { "Shared Expense" },
                participants = _state.value.selectedMemberIds.toList()
            )
            if (result.isSuccess) {
                _state.update { it.copy(isLoading = false, isSuccess = true) }
            } else {
                _state.update { it.copy(isLoading = false, error = result.exceptionOrNull()?.message) }
            }
        }
    }
}
