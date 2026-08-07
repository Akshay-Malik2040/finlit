import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useMobileRoomStore } from '../store/useMobileRoomStore';

export default function BalancesScreen() {
  const { balances, createSettlement } = useMobileRoomStore();

  const [settleTarget, setSettleTarget] = useState(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { summary, youOwe, youAreOwed, simplifiedSettlementPlan } = balances || {};
  const netBalance = summary?.netBalance || 0;

  const handleOpenSettle = (item) => {
    setSettleTarget(item.member);
    setSettleAmount(item.amount.toString());
  };

  const handleConfirmSettle = async () => {
    if (!settleTarget || !settleAmount || parseFloat(settleAmount) <= 0) return;

    setIsSubmitting(true);
    const targetId = settleTarget._id || settleTarget.id;
    const res = await createSettlement(targetId, parseFloat(settleAmount), paymentMethod);
    setIsSubmitting(false);

    if (res.success) {
      setSettleTarget(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Household Balances</Text>
        <Text style={styles.subtitle}>Person-by-person debt standings & settlements</Text>

        {/* Position Banner */}
        <View style={styles.positionCard}>
          <Text style={styles.positionLabel}>HOUSEHOLD NET POSITION</Text>
          <Text style={styles.positionAmount}>
            {netBalance >= 0 ? '+' : ''}₹{netBalance}
          </Text>
          <Text style={styles.positionSub}>
            {netBalance > 0 ? 'You are net positive' : netBalance < 0 ? 'You have net debt' : 'All clear'}
          </Text>
        </View>

        {/* You Owe Section */}
        {youOwe && youOwe.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionOweTitle}>↗ FLATMATES YOU OWE</Text>
            {youOwe.map((item) => (
              <View key={item.member._id || item.member.id} style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={styles.avatarOwe}>
                    <Text style={styles.avatarOweText}>{item.member.name.charAt(0)}</Text>
                  </View>
                  <View>
                    <Text style={styles.name}>{item.member.name}</Text>
                    <Text style={styles.oweSub}>You owe ₹{item.amount}</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.settleBtn} onPress={() => handleOpenSettle(item)}>
                  <Text style={styles.settleBtnText}>Settle ₹{item.amount}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* You're Owed Section */}
        {youAreOwed && youAreOwed.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionOwedTitle}>↙ FLATMATES OWING YOU</Text>
            {youAreOwed.map((item) => (
              <View key={item.member._id || item.member.id} style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={styles.avatarOwed}>
                    <Text style={styles.avatarOwedText}>{item.member.name.charAt(0)}</Text>
                  </View>
                  <View>
                    <Text style={styles.name}>{item.member.name}</Text>
                    <Text style={styles.owedSub}>Owes you ₹{item.amount}</Text>
                  </View>
                </View>

                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>Pending</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Simplified Settlement Plan */}
        {simplifiedSettlementPlan && simplifiedSettlementPlan.length > 0 && (
          <View style={styles.planCard}>
            <Text style={styles.planTitle}>⚡ OPTIMIZED SETTLEMENT PLAN</Text>
            {simplifiedSettlementPlan.map((t, idx) => (
              <View key={idx} style={styles.planRow}>
                <Text style={styles.planText}>
                  <Text style={styles.planFrom}>{t.from.name}</Text> pays{' '}
                  <Text style={styles.planTo}>{t.to.name}</Text>
                </Text>
                <Text style={styles.planAmount}>₹{t.amount}</Text>
              </View>
            ))}
          </View>
        )}

        {/* All Settled State */}
        {(!youOwe || youOwe.length === 0) && (!youAreOwed || youAreOwed.length === 0) && (
          <View style={styles.allSettledCard}>
            <Text style={styles.allSettledIcon}>🎉</Text>
            <Text style={styles.allSettledTitle}>Everyone is Settled Up!</Text>
            <Text style={styles.allSettledSub}>No pending debts between flatmates.</Text>
          </View>
        )}
      </ScrollView>

      {/* Settle Debt Modal */}
      {settleTarget && (
        <Modal transparent animationType="fade" visible={!!settleTarget}>
          <View style={styles.modalBg}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Settle Debt with {settleTarget.name}</Text>

              <Text style={styles.modalLabel}>SETTLEMENT AMOUNT (₹)</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={settleAmount}
                onChangeText={setSettleAmount}
              />

              <Text style={styles.modalLabel}>PAYMENT METHOD</Text>
              <View style={styles.methodRow}>
                {['UPI', 'Cash', 'Bank'].map((m) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setPaymentMethod(m)}
                    style={[styles.methodChip, paymentMethod === m && styles.methodChipActive]}
                  >
                    <Text style={[styles.methodText, paymentMethod === m && styles.methodTextActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setSettleTarget(null)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmSettle} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.confirmText}>Confirm Settle</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
  positionCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  positionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10b981',
    letterSpacing: 1.5,
  },
  positionAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 4,
  },
  positionSub: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  sectionOweTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#f43f5e',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  sectionOwedTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10b981',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarOwe: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#881337',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOweText: {
    color: '#fda4af',
    fontWeight: '900',
  },
  avatarOwed: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#064e3b',
    alignItems: 'center',
    justify.content: 'center',
  },
  avatarOwedText: {
    color: '#6ee7b7',
    fontWeight: '900',
  },
  name: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  oweSub: {
    fontSize: 11,
    color: '#f43f5e',
    marginTop: 1,
  },
  owedSub: {
    fontSize: 11,
    color: '#10b981',
    marginTop: 1,
  },
  settleBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  settleBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
  },
  pendingBadge: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pendingBadgeText: {
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: '700',
  },
  planCard: {
    backgroundColor: '#064e3b',
    borderRadius: 20,
    padding: 16,
  },
  planTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#a7f3d0',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  planText: {
    fontSize: 12,
    color: '#ffffff',
  },
  planFrom: {
    fontWeight: '900',
    color: '#fda4af',
  },
  planTo: {
    fontWeight: '900',
    color: '#6ee7b7',
  },
  planAmount: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ffffff',
  },
  allSettledCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  allSettledIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  allSettledTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
  },
  allSettledSub: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6b7280',
    letterSpacing: 1,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#1f2937',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 16,
  },
  methodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  methodChip: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    alignItems: 'center',
  },
  methodChipActive: {
    backgroundColor: '#059669',
  },
  methodText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
  },
  methodTextActive: {
    color: '#ffffff',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#1f2937',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#9ca3af',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#059669',
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ffffff',
  },
});
