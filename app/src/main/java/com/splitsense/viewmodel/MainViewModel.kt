package com.splitsense.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.splitsense.util.IdentityManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class MainViewModel @Inject constructor(
    private val identityManager: IdentityManager
) : ViewModel() {

    private val _startDestination = MutableStateFlow<String?>(null)
    val startDestination: StateFlow<String?> = _startDestination.asStateFlow()

    init {
        checkIdentity()
    }

    private fun checkIdentity() {
        viewModelScope.launch {
            try {
                val roomId = identityManager.roomId.first()
                if (roomId.isNullOrBlank()) {
                    _startDestination.value = "onboarding"
                } else {
                    _startDestination.value = "home"
                }
            } catch (e: Exception) {
                _startDestination.value = "onboarding"
            }
        }
    }
}
