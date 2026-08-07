import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useMobileRoomStore } from '../store/useMobileRoomStore';

const CATEGORIES = ['Groceries', 'Milk & Daily', 'Food & Dining', 'WiFi & Bills', 'House Maid', 'Other'];

export default function QuickAddScreen({ onClose }) {
  const { room, currentMember, members, addExpense, isLoading } = useMobileRoomStore();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Groceries');
  const [selectedIds, setSelectedIds] = useState([]);
  const [scope, setScope] = useState('shared'); // 'shared', 'personal'
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-select ALL active room members by default
  useEffect(() => {
    if (members && members.length > 0) {
      setSelectedIds(members.map((m) => m._id || m.id));
    }
  }, [members]);

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 1) {
        setSelectedIds(selectedIds.filter((mId) => mId !== id));
      }
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    setIsSubmitting(true);
    const res = await addExpense({
      amount: parseFloat(amount),
      description: description.trim() || category,
      category,
      participantIds: scope === 'personal' ? [currentMember._id || currentMember.id] : selectedIds,
      expenseScope: scope,
    });
    setIsSubmitting(false);

    if (res.success) {
      setAmount('');
      setDescription('');
      if (onClose) onClose();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕ Close</Text>
          </TouchableOpacity>
          <Text style={styles.roomName}>{room?.name || 'Flat'}</Text>
        </View>

        {/* Dominant Numeric Input Card */}
        <View style={styles.amountCard}>
          <Text style={styles.cardLabel}>ENTER SPENT AMOUNT</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#4b5563"
              autoFocus
              value={amount}
              onChangeText={setAmount}
            />
          </View>
        </View>

        {/* Scope Selector: Shared vs Personal */}
        <View style={styles.scopeContainer}>
          <TouchableOpacity
            style={[styles.scopeBtn, scope === 'shared' && styles.scopeBtnActive]}
            onPress={() => setScope('shared')}
          >
            <Text style={[styles.scopeText, scope === 'shared' && styles.scopeTextActive]}>
              👥 Shared Bill ({selectedIds.length} split)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scopeBtn, scope === 'personal' && styles.scopeBtnActive]}
            onPress={() => setScope('personal')}
          >
            <Text style={[styles.scopeText, scope === 'personal' && styles.scopeTextActive]}>
              👤 Personal Only
            </Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Room Members Selector (Everyone Pre-selected) */}
        {scope === 'shared' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>WHO SHARED THIS?</Text>
            <View style={styles.membersGrid}>
              {members.map((m) => {
                const mId = m._id || m.id;
                const isSelected = selectedIds.includes(mId);
                return (
                  <TouchableOpacity
                    key={mId}
                    onPress={() => toggleSelect(mId)}
                    style={[styles.memberPill, isSelected ? styles.memberSelected : styles.memberUnselected]}
                  >
                    <Text style={[styles.memberText, isSelected && styles.memberTextSelected]}>
                      {m.name} {isSelected ? '✓' : '+'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Category Chips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CATEGORY</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(cat)}
                style={[styles.catChip, category === cat && styles.catChipActive]}
              >
                <Text style={[styles.catText, category === cat && styles.catTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Optional Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DESCRIPTION (OPTIONAL)</Text>
          <TextInput
            style={styles.descInput}
            placeholder="e.g. Milk & Eggs from Blinkit"
            placeholderTextColor="#4b5563"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Instant Save CTA */}
        <TouchableOpacity
          style={[styles.saveButton, (!amount || parseFloat(amount) <= 0) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!amount || parseFloat(amount) <= 0 || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>SAVE EXPENSE</Text>
          )}
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
    padding: 20,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  closeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#1f2937',
    borderRadius: 12,
  },
  closeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9ca3af',
  },
  roomName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10b981',
  },
  amountCard: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '800',
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
  scopeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  scopeBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#111827',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  scopeBtnActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  scopeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
  },
  scopeTextActive: {
    color: '#34d399',
    fontWeight: '800',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6b7280',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  membersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  catScroll: {
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#111827',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  catChipActive: {
    backgroundColor: '#059669',
    borderColor: '#10b981',
  },
  catText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
  },
  catTextActive: {
    color: '#ffffff',
  },
  descInput: {
    backgroundColor: '#111827',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  saveButton: {
    backgroundColor: '#059669',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 10,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#1f2937',
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
  },
});
