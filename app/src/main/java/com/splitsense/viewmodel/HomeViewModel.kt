package com.splitsense.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.splitsense.data.local.entities.ExpenseEntity
import com.splitsense.data.local.entities.RoomEntity
import com.splitsense.data.remote.BalancesResponse
import com.splitsense.data.repository.SplitSenseRepository
import com.splitsense.util.IdentityManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

import com.splitsense.data.local.entities.MemberEntity

data class HomeState(
    val room: RoomEntity? = null,
    val expenses: List<ExpenseEntity> = emptyList(),
    val members: List<MemberEntity> = emptyList(),
    val balances: BalancesResponse? = null,
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    val repository: SplitSenseRepository,
    private val identityManager: IdentityManager
) : ViewModel() {

    private val _state = MutableStateFlow(HomeState())
    val state: StateFlow<HomeState> = _state.asStateFlow()

    init {
        loadData()
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    private fun loadData() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            
            // 1. Observe local Room DB immediately so UI opens instantly without waiting for network
            launch {
                identityManager.roomId.flatMapLatest { roomId ->
                    if (!roomId.isNullOrBlank()) {
                        combine(
                            repository.currentRoom,
                            repository.getExpenses(roomId),
                            repository.getMembers(roomId)
                        ) { room, expenses, members ->
                            Triple(room, expenses, members)
                        }
                    } else {
                        flowOf(Triple(null, emptyList(), emptyList()))
                    }
                }.collect { (room, expenses, members) ->
                    _state.update { it.copy(room = room, expenses = expenses, members = members, isLoading = false) }
                    if (room != null) {
                        refreshBalances()
                    }
                }
            }

            // 2. Sync latest room details, members & expenses in background safely
            launch {
                try {
                    repository.syncLatestRoomData()
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }

    fun reloadExpenses() {
        viewModelScope.launch {
            try {
                repository.syncLatestRoomData()
            } catch (e: Exception) {
                e.printStackTrace()
            }
            val roomId = identityManager.roomId.first()
            if (!roomId.isNullOrBlank()) {
                val latestExpenses = repository.fetchExpensesFromDb(roomId)
                _state.update { it.copy(expenses = latestExpenses) }
                refreshBalances()
            }
        }
    }

    fun refreshBalances() {
        viewModelScope.launch {
            val result = repository.getBalances()
            if (result.isSuccess) {
                _state.update { it.copy(balances = result.getOrNull()) }
            } else {
                _state.update { it.copy(error = result.exceptionOrNull()?.message) }
            }
        }
    }
}
