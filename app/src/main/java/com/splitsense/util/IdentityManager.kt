package com.splitsense.util

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "splitsense_prefs")

@Singleton
class IdentityManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        private val DEVICE_ID = stringPreferencesKey("device_id")
        private val MEMBER_ID = stringPreferencesKey("member_id")
        private val ROOM_ID = stringPreferencesKey("room_id")
        private val MEMBER_NAME = stringPreferencesKey("member_name")
        private val ROOM_NAME = stringPreferencesKey("room_name")
    }

    val deviceId: Flow<String> = context.dataStore.data.map { preferences ->
        preferences[DEVICE_ID] ?: ""
    }

    val memberId: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[MEMBER_ID]
    }

    val roomId: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[ROOM_ID]
    }
    
    val roomName: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[ROOM_NAME]
    }

    suspend fun getOrCreateDeviceId(): String {
        var id = ""
        context.dataStore.edit { preferences ->
            val currentId = preferences[DEVICE_ID]
            if (currentId != null) {
                id = currentId
            } else {
                val newId = UUID.randomUUID().toString()
                preferences[DEVICE_ID] = newId
                id = newId
            }
        }
        return id
    }

    suspend fun saveIdentity(memberId: String, roomId: String, memberName: String, roomName: String) {
        context.dataStore.edit { preferences ->
            preferences[MEMBER_ID] = memberId
            preferences[ROOM_ID] = roomId
            preferences[MEMBER_NAME] = memberName
            preferences[ROOM_NAME] = roomName
        }
    }

    suspend fun clearIdentity() {
        context.dataStore.edit { preferences ->
            preferences.clear()
        }
    }
}
