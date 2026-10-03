import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Modal,
  AppState,
} from 'react-native';
import { useMobileRoomStore } from './src/store/useMobileRoomStore';
import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import QuickAddScreen from './src/screens/QuickAddScreen';
import ActivityScreen from './src/screens/ActivityScreen';
import BalancesScreen from './src/screens/BalancesScreen';
import RoomScreen from './src/screens/RoomScreen';

export default function App() {
  const { room, currentMember, initSession } = useMobileRoomStore();

  const [activeTab, setActiveTab] = useState('Home'); // 'Home', 'Activity', 'Balances', 'Room'
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    initSession();

    // Background polling: sync every 30 seconds when app is active
    const interval = setInterval(() => {
      const state = useMobileRoomStore.getState();
      if (state.offlineQueue.length > 0) {
        state.syncOfflineQueue();
      } else if (state.room) {
        state.fetchDashboardData();
      }
    }, 30000);

    // AppState listener: refresh data when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground — sync immediately
        const state = useMobileRoomStore.getState();
        if (state.offlineQueue.length > 0) {
          state.syncOfflineQueue();
        } else if (state.room) {
          state.fetchDashboardData();
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  // Show accountless onboarding screen if no room or member session exists
  if (!room || !currentMember) {
    return <OnboardingScreen />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#090d16" />

      {/* Main Screen Content */}
      <View style={styles.mainContent}>
        {activeTab === 'Home' && (
          <HomeScreen
            onOpenQuickAdd={() => setIsQuickAddOpen(true)}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}
        {activeTab === 'Activity' && <ActivityScreen />}
        {activeTab === 'Balances' && <BalancesScreen />}
        {activeTab === 'Room' && <RoomScreen />}
      </View>

      {/* Floating Quick Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setIsQuickAddOpen(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
        <Text style={styles.fabText}>ADD</Text>
      </TouchableOpacity>

      {/* Bottom Navigation Bar */}
      <View style={styles.navbar}>
        {['Home', 'Activity', 'Balances', 'Room'].map((tab) => {
          const isActive = activeTab === tab;
          const icon = tab === 'Home' ? '🏠' : tab === 'Activity' ? '📜' : tab === 'Balances' ? '⚖️' : '👥';
          return (
            <TouchableOpacity
              key={tab}
              style={styles.navItem}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={styles.navIcon}>{icon}</Text>
              <Text style={[styles.navText, isActive && styles.navTextActive]}>{tab}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Quick Add Modal */}
      <Modal visible={isQuickAddOpen} animationType="slide" presentationStyle="fullScreen">
        <QuickAddScreen onClose={() => setIsQuickAddOpen(false)} />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  mainContent: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 74,
    right: 20,
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    elevation: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    zIndex: 40,
  },
  fabIcon: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
  },
  fabText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
  },
  navbar: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIcon: {
    fontSize: 18,
  },
  navText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6b7280',
    marginTop: 2,
  },
  navTextActive: {
    color: '#10b981',
    fontWeight: '900',
  },
});
