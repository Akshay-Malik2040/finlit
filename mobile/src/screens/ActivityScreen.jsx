import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useMobileRoomStore } from '../store/useMobileRoomStore';

export default function ActivityScreen() {
  const { expenses, settlements, room, isLoading, fetchDashboardData } = useMobileRoomStore();
  const [filter, setFilter] = useState('All'); // 'All', 'Shared', 'Personal', 'Settlements'

  // Combine expenses and settlements into chronological timeline
  const normalizedExpenses = (expenses || []).map((e) => ({
    _id: e._id || e.id,
    type: 'expense',
    title: e.description || 'Shared Expense',
    subtitle: `Paid by ${e.paidBy?.name || 'Flatmate'} • ${new Date(e.createdAt || Date.now()).toLocaleDateString()}`,
    amount: e.amount,
    category: e.category || 'Other',
    scope: e.expenseScope || 'shared',
    isPendingSync: e.isPendingSync,
    sortTime: new Date(e.createdAt || Date.now()).getTime(),
  }));

  const normalizedSettlements = (settlements || []).map((s) => ({
    _id: s._id || s.id,
    type: 'settlement',
    title: `${s.fromMember?.name || 'Flatmate'} paid ${s.toMember?.name || 'Flatmate'}`,
    subtitle: `Settlement via ${s.paymentMethod || 'UPI'} • ${new Date(s.createdAt || Date.now()).toLocaleDateString()}`,
    amount: s.amount,
    category: 'Settlement',
    scope: 'settlement',
    isPendingSync: s.isPendingSync,
    sortTime: new Date(s.createdAt || Date.now()).getTime(),
  }));

  const allActivities = [...normalizedExpenses, ...normalizedSettlements].sort(
    (a, b) => b.sortTime - a.sortTime
  );

  const filteredActivities = allActivities.filter((item) => {
    if (filter === 'Shared') return item.scope === 'shared';
    if (filter === 'Personal') return item.scope === 'personal';
    if (filter === 'Settlements') return item.type === 'settlement';
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{room?.name || 'Flat'} Activity Feed</Text>
        <Text style={styles.subtitle}>All recorded household transactions & settlements</Text>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {['All', 'Shared', 'Personal', 'Settlements'].map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filterPill, filter === f && styles.filterPillActive]}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={fetchDashboardData} tintColor="#10b981" />
          }
        >
          {filteredActivities.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No recent activity found for filter "{filter}".</Text>
            </View>
          ) : (
            filteredActivities.map((item) => (
              <View key={item._id} style={styles.card}>
                <View style={styles.left}>
                  <View style={[styles.iconBox, item.type === 'settlement' && styles.iconBoxSettlement]}>
                    <Text style={styles.iconText}>
                      {item.type === 'settlement'
                        ? '🤝'
                        : item.category === 'Milk & Daily'
                        ? '🥛'
                        : item.category === 'Food & Dining'
                        ? '🍕'
                        : '🛒'}
                    </Text>
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={styles.desc}>{item.title}</Text>
                    <Text style={styles.sub}>{item.subtitle}</Text>
                  </View>
                </View>

                <View style={styles.right}>
                  <Text style={[styles.amount, item.type === 'settlement' && styles.settlementAmount]}>
                    ₹{item.amount}
                  </Text>
                  <Text style={[styles.badge, item.type === 'settlement' && styles.settlementBadge]}>
                    {item.isPendingSync ? '⏳ Offline' : item.scope}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
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
    padding: 20,
    flex: 1,
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
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  filterPillActive: {
    backgroundColor: '#059669',
    borderColor: '#10b981',
  },
  filterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  list: {
    gap: 8,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#064e3b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxSettlement: {
    backgroundColor: '#1e3a8a',
  },
  iconText: {
    fontSize: 16,
  },
  infoCol: {
    flex: 1,
  },
  desc: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  sub: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
  },
  settlementAmount: {
    color: '#60a5fa',
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10b981',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  settlementBadge: {
    color: '#93c5fd',
  },
  emptyCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#9ca3af',
  },
});
