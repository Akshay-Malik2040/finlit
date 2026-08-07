import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useMobileRoomStore } from '../store/useMobileRoomStore';

export default function RoomScreen() {
  const { room, currentMember, members, recoveryCode, removeMember } = useMobileRoomStore();

  const handleCopyCode = () => {
    if (room?.joinCode) {
      Alert.alert('Join Code Copied', room.joinCode);
    }
  };

  const handleRemoveMember = (mId, mName) => {
    Alert.alert('Remove Member', `Are you sure you want to remove ${mName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeMember(mId),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Group Settings</Text>
        <Text style={styles.subtitle}>Household identity & members management</Text>

        {/* Identity Card */}
        <View style={styles.card}>
          <Text style={styles.label}>ACTIVE HOUSEHOLD</Text>
          <Text style={styles.roomName}>{room?.name || 'Flat'}</Text>
          <Text style={styles.memberCount}>👋 {currentMember?.name} • {members.length} members</Text>
        </View>

        {/* Join Code Box */}
        <View style={styles.codeCard}>
          <View>
            <Text style={styles.codeLabel}>HIGH-ENTROPY JOIN CODE</Text>
            <Text style={styles.codeText}>{room?.joinCode}</Text>
          </View>

          <TouchableOpacity style={styles.copyBtn} onPress={handleCopyCode}>
            <Text style={styles.copyBtnText}>Copy Code</Text>
          </TouchableOpacity>
        </View>

        {/* Recovery Code Box */}
        {recoveryCode && (
          <View style={styles.recoveryCard}>
            <Text style={styles.recoveryLabel}>🔑 IDENTITY RECOVERY KEY</Text>
            <Text style={styles.recoveryCodeText}>{recoveryCode}</Text>
            <Text style={styles.recoveryHelp}>Use this key to recover your identity if you reinstall the app.</Text>
          </View>
        )}

        {/* Members List */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>ACTIVE ROOM MEMBERS ({members.length})</Text>
          {members.map((m) => {
            const mId = m._id || m.id;
            const isMe = mId === (currentMember?._id || currentMember?.id);
            const isAdmin = currentMember?.role === 'admin';

            return (
              <View key={mId} style={styles.memberRow}>
                <View style={styles.memberLeft}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{m.name.charAt(0)}</Text>
                  </View>
                  <View>
                    <Text style={styles.memberName}>
                      {m.name} {isMe ? '(You)' : ''}
                    </Text>
                    <Text style={styles.memberRole}>{m.role === 'admin' ? 'Room Admin' : 'Member'}</Text>
                  </View>
                </View>

                {isAdmin && !isMe && (
                  <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveMember(mId, m.name)}>
                    <Text style={styles.removeBtnText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10b981',
    letterSpacing: 1.5,
  },
  roomName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 4,
  },
  memberCount: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  codeCard: {
    backgroundColor: '#064e3b',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#a7f3d0',
    letterSpacing: 1,
  },
  codeText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 2,
    marginTop: 2,
  },
  copyBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
  },
  recoveryCard: {
    backgroundColor: '#78350f',
    borderRadius: 20,
    padding: 16,
  },
  recoveryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fef3c7',
    letterSpacing: 1,
  },
  recoveryCodeText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 2,
    marginVertical: 4,
  },
  recoveryHelp: {
    fontSize: 11,
    color: '#fde68a',
  },
  sectionCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6b7280',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#064e3b',
    alignItems: 'center',
    justify.content: 'center',
  },
  avatarText: {
    color: '#6ee7b7',
    fontWeight: '900',
  },
  memberName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  memberRole: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 1,
  },
  removeBtn: {
    backgroundColor: '#881337',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  removeBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#fda4af',
  },
});
