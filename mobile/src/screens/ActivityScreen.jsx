import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useMobileRoomStore } from '../store/useMobileRoomStore';

export default function ActivityScreen() {
  const { expenses, room } = useMobileRoomStore();
  const [filter, setFilter] = useState('All'); // 'All', 'Shared', 'Personal'

  const filteredExpenses = expenses.filter((e) => {
    if (filter === 'Shared') return e.expenseScope === 'shared';
    if (filter === 'Personal') return e.expenseScope === 'personal';
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{room?.name || 'Flat'} Activity Feed</Text>
        <Text style={styles.subtitle}>All recorded household transactions</Text>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {['All', 'Shared', 'Personal'].map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filterPill, filter === f && styles.filterPillActive]}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.list}>
          {filteredExpenses.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No transactions found for filter "{filter}".</Text>
            </View>
          ) : (
            filteredExpenses.map((e) => (
              <View key={e._id} style={styles.card}>
                <View style={styles.left}>
                  <View style={styles.iconBox}>
                    <Text style={styles.iconText}>
                      {e.category === 'Milk & Daily' ? '🥛' : e.category === 'Food & Dining' ? '🍕' : '🛒'}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.desc}>{e.description}</Text>
                    <Text style={styles.sub}>
                      Paid by {e.paidBy?.name || 'Flatmate'} • {new Date(e.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                <View style={styles.right}>
                  <Text style={styles.amount}>₹{e.amount}</Text>
                  <Text style={styles.badge}>{e.expenseScope || 'shared'}</Text>
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
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 14,
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
    fontSize: 12,
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
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#064e3b',
    alignItems: 'center',
    justify.content: 'center',
  },
  iconText: {
    fontSize: 16,
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
  badge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10b981',
    marginTop: 2,
    textTransform: 'uppercase',
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
