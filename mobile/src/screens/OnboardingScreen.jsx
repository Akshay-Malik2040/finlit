import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useMobileRoomStore } from '../store/useMobileRoomStore';

export default function OnboardingScreen() {
  const { createRoom, joinRoom, isLoading, error } = useMobileRoomStore();

  const [mode, setMode] = useState('choose'); // 'choose', 'create', 'join'
  const [name, setName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const handleCreate = async () => {
    if (!name.trim() || !roomName.trim()) return;
    await createRoom(roomName.trim(), name.trim());
  };

  const handleJoin = async () => {
    if (!name.trim() || !joinCode.trim()) return;
    await joinRoom(joinCode.trim(), name.trim());
  };

  if (mode === 'choose') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.brandHeader}>
            <View style={styles.brandIcon}>
              <Text style={styles.iconText}>🏠</Text>
            </View>
            <Text style={styles.title}>FinLit</Text>
            <Text style={styles.subtitle}>SPEND. SPLIT. FORGET.</Text>
            <Text style={styles.desc}>
              Zero-friction expense tracking and bill splitting for flatmates. No passwords or email required.
            </Text>
          </View>

          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setMode('create')}>
              <Text style={styles.primaryButtonText}>+ Create New Flat / Room</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={() => setMode('join')}>
              <Text style={styles.secondaryButtonText}>Join Existing Room</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => setMode('choose')}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{mode === 'create' ? 'Create Flat' : 'Join Flat'}</Text>
        <Text style={styles.subtitle}>
          {mode === 'create' ? 'Set up a household group for your flatmates' : 'Enter the code given by your room admin'}
        </Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.formGroup}>
          <Text style={styles.label}>YOUR NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Akshay"
            placeholderTextColor="#4b5563"
            value={name}
            onChangeText={setName}
          />
        </View>

        {mode === 'create' ? (
          <View style={styles.formGroup}>
            <Text style={styles.label}>FLAT / ROOM NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Flat 302"
              placeholderTextColor="#4b5563"
              value={roomName}
              onChangeText={setRoomName}
            />
          </View>
        ) : (
          <View style={styles.formGroup}>
            <Text style={styles.label}>JOIN CODE</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. FLAT-5DE4DA03"
              placeholderTextColor="#4b5563"
              autoCapitalize="characters"
              value={joinCode}
              onChangeText={setJoinCode}
            />
          </View>
        )}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={mode === 'create' ? handleCreate : handleJoin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {mode === 'create' ? 'Create Room' : 'Join Room'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  content: {
    padding: 24,
    flex: 1,
    justifyContent: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  brandIcon: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10b981',
    letterSpacing: 2,
    marginTop: 4,
  },
  desc: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  buttonGroup: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#059669',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
  },
  secondaryButton: {
    backgroundColor: '#1f2937',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#d1d5db',
  },
  backButton: {
    marginBottom: 20,
  },
  backText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10b981',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6b7280',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#111827',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  errorText: {
    color: '#f43f5e',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
});
