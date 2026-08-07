import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import RoomOnboardingPage from './pages/RoomOnboardingPage';
import { useRoomStore } from './store/useRoomStore';
import { useThemeStore } from './store/useThemeStore';
import { useEffect } from 'react';

function App() {
  const { isDarkMode } = useThemeStore();
  const { room, currentMember } = useRoomStore();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100">
        <Routes>
          <Route
            path="/"
            element={room && currentMember ? <Dashboard /> : <RoomOnboardingPage />}
          />
          <Route path="/onboarding" element={<RoomOnboardingPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;