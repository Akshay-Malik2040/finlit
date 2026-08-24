import React from 'react';
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

export default function HomeScreen({ onOpenQuickAdd, onNavigateTab }) {
  const { room, currentMember, expenses, settlements, balances, monthlySummary, isLoading, fetchDashboardData, offlineQueue, syncOfflineQueue, isSyncing } = useMobileRoomStore();

  const { summary } = balances || {};
  const netBalance = summary?.netBalance || 0;

  // Combine expenses and settlements chronologically
  const recentActivities = [
    ...(expenses || []).map((e) => ({
      _id: e._id || e.id,
      type: 'expense',
      title: e.description || 'Shared Expense',
      payer: `Paid by ${e.paidBy?.name || 'Flatmate'} • ${e.category || 'General'}`,
      amount: e.amount,
      split: `${e.participants?.length || 1} split`,
      sortTime: new Date(e.createdAt || Date.now()).getTime(),
    })),
    ...(settlements || []).map((s) => ({
      _id: s._id || s.id,
      type: 'settlement',
      title: `${s.fromMember?.name || 'Flatmate'} paid ${s.toMember?.name || 'Flatmate'}`,
      payer: `Settlement via ${s.paymentMethod || 'UPI'}`,
      amount: s.amount,
      split: 'Settled',
      sortTime: new Date(s.createdAt || Date.now()).getTime(),
    })),
  ].sort((a, b) => b.sortTime - a.sortTime);

  return (
    <SafeAreaView style={styles.container}>
      {/* Offline Sync Banner */}
      {offlineQueue.length > 0 && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            📶 {offlineQueue.length} offline expense(s) saved on device.
          </Text>
          <TouchableOpacity onPress={syncOfflineQueue} disabled={isSyncing} style={styles.syncBtn}>
            <Text style={styles.syncBtnText}>{isSyncing ? 'Syncing...' : 'Sync Now'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchDashboardData} tintColor="#10b981" />}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.roomBadge}>{room?.name || 'Flat'}</Text>
            <Text style={styles.welcomeText}>👋 {currentMember?.name || 'User'}</Text>
          </View>

          <TouchableOpacity style={styles.quickAddHeaderBtn} onPress={onOpenQuickAdd}>
            <Text style={styles.quickAddHeaderBtnText}>+ ADD</Text>
          </TouchableOpacity>
        </View>

        {/* Primary Position Summary Card */}
        <TouchableOpacity style={styles.netCard} onPress={() => onNavigateTab('Balances')}>
          <View style={styles.netCardTop}>
            <Text style={styles.netCardLabel}>YOUR NET POSITION</Text>
            <Text style={styles.detailsLink}>Details →</Text>
          </View>

          <View style={styles.netAmountRow}>
            <Text style={styles.netAmount}>
              {netBalance >= 0 ? '+' : ''}₹{netBalance}
            </Text>
            <Text style={styles.netSubtitle}>
              {netBalance > 0 ? 'You are owed overall' : netBalance < 0 ? 'You owe overall' : 'All settled up! 🎉'}
            </Text>
          </View>

          <View style={styles.netGrid}>
            <View style={styles.netGridCol}>
              <Text style={styles.netGridLabel}>YOU OWE</Text>
              <Text style={styles.netGridOwe}>₹{summary?.totalIOwe || 0}</Text>
            </View>

            <View style={styles.netGridCol}>
              <Text style={styles.netGridLabel}>YOU'RE OWED</Text>
              <Text style={styles.netGridOwed}>₹{summary?.totalOwedToMe || 0}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Monthly Household Summary Banner */}
        {monthlySummary && (
          <View style={styles.monthlyCard}>
            <Text style={styles.monthlyLabel}>{monthlySummary.monthName} HOUSEHOLD TOTAL</Text>
            <Text style={styles.monthlyAmount}>₹{monthlySummary.totalMonthlyShared}</Text>
          </View>
        )}

        {/* Recent Household Expenses List */}
        {/* Recent Household Activities List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>RECENT HOUSEHOLD ACTIVITIES</Text>
          <TouchableOpacity onPress={() => onNavigateTab('Activity')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {recentActivities.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No activity logged yet in {room?.name}.</Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={onOpenQuickAdd}>
              <Text style={styles.emptyAddBtnText}>+ Log First Shared Expense</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.expenseList}>
            {recentActivities.slice(0, 5).map((item) => (
              <View key={item._id} style={styles.expenseItem}>
                <View style={styles.expenseLeft}>
                  <View style={[styles.expenseIcon, item.type === 'settlement' && { backgroundColor: '#1e3a8a' }]}>
                    <Text style={styles.expenseIconText}>
                      {item.type === 'settlement' ? '🤝' : '🛒'}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.expenseTitle}>{item.title}</Text>
                    <Text style={styles.expensePayer}>{item.payer}</Text>
                  </View>
                </View>

                <View style={styles.expenseRight}>
                  <Text style={[styles.expenseAmount, item.type === 'settlement' && { color: '#60a5fa' }]}>
                    ₹{item.amount}
                  </Text>
                  <Text style={styles.expenseSplit}>{item.split}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  offlineBanner: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offlineText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  syncBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  syncBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#78350f',
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  roomBadge: {
    fontSize: 12,
    fontWeight: '900',
    color: '#10b981',
    letterSpacing: 1.5,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
  },
  quickAddHeaderBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  quickAddHeaderBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ffffff',
  },
  netCard: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  netCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  netCardLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6b7280',
    letterSpacing: 1.5,
  },
  detailsLink: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10b981',
  },
  netAmountRow: {
    marginVertical: 4,
  },
  netAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
  },
  netSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  netGrid: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
  },
  netGridCol: {
    flex: 1,
  },
  netGridLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6b7280',
  },
  netGridOwe: {
    fontSize: 16,
    fontWeight: '900',
    color: '#f43f5e',
    marginTop: 2,
  },
  netGridOwed: {
    fontSize: 16,
    fontWeight: '900',
    color: '#10b981',
    marginTop: 2,
  },
  monthlyCard: {
    backgroundColor: '#064e3b',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  monthlyLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#a7f3d0',
    letterSpacing: 1,
  },
  monthlyAmount: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6b7280',
    letterSpacing: 1.5,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10b981',
  },
  emptyCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  emptyText: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 12,
  },
  emptyAddBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyAddBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
  },
  expenseList: {
    backgroundColor: '#111827',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1f2937',
    overflow: 'hidden',
  },
  expenseItem: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  expenseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  expenseIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#064e3b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseIconText: {
    fontSize: 18,
  },
  expenseTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  expensePayer: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  expenseRight: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
  },
  expenseSplit: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10b981',
    marginTop: 2,
  },
});
