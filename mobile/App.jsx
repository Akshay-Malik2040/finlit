import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';

export default function App() {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState(['Akshay', 'Rahul', 'Rishi', 'Aman']);
  const [selected, setSelected] = useState(['Akshay', 'Rahul', 'Rishi', 'Aman']);

  const toggleSelect = (name) => {
    if (selected.includes(name)) {
      if (selected.length > 1) {
        setSelected(selected.filter((m) => m !== name));
      }
    } else {
      setSelected([...selected, name]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.brandTitle}>SplitSense V2</Text>
          <Text style={styles.brandSubtitle}>Spend. Split. Forget.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>ENTER AMOUNT</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#4b5563"
              value={amount}
              onChangeText={setAmount}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>WHO SHARED THIS?</Text>
        <View style={styles.membersRow}>
          {members.map((m) => {
            const isSelected = selected.includes(m);
            return (
              <TouchableOpacity
                key={m}
                onPress={() => toggleSelect(m)}
                style={[styles.memberPill, isSelected ? styles.memberSelected : styles.memberUnselected]}
              >
                <Text style={[styles.memberText, isSelected && styles.memberTextSelected]}>
                  {m} {isSelected ? '✓' : '+'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.saveButton}>
          <Text style={styles.saveButtonText}>SAVE EXPENSE</Text>
        </TouchableOpacity>
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
    padding: 24,
  },
  header: {
    marginBottom: 24,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
  },
  brandSubtitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10b981',
    letterSpacing: 2,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 40,
    fontWeight: '900',
    color: '#10b981',
    marginRight: 6,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: '900',
    color: '#ffffff',
    minWidth: 120,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  membersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 32,
  },
  memberPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  memberSelected: {
    backgroundColor: '#059669',
    borderColor: '#10b981',
  },
  memberUnselected: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  memberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9ca3af',
  },
  memberTextSelected: {
    color: '#ffffff',
  },
  saveButton: {
    backgroundColor: '#059669',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
  },
});
