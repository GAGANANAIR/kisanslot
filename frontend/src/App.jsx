import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AuthPage from './pages/AuthPage';
import FarmerDashboard from './pages/FarmerDashboard';
import OperatorDesk from './pages/OperatorDesk';
import AdminAnalytics from './pages/AdminAnalytics';
import PublicDisplayBoard from './pages/PublicDisplayBoard';
import NotificationModal from './components/NotificationModal';
import { api, createWebSocket } from './api';

export default function App() {
  const [route, setRoute] = useState(() => window.location.hash || '#/');
  const [user, setUser] = useState(() => {
    const savedUser = sessionStorage.getItem('user') || localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [currentLang, setCurrentLang] = useState(() => {
    return sessionStorage.getItem('language_pref') || localStorage.getItem('language_pref') || 'en';
  });
  const [notifications, setNotifications] = useState([]);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [isWsConnected, setIsWsConnected] = useState(false);

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash || '#/');
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();

      const ws = createWebSocket(
        '/global',
        () => fetchNotifications(),
        null,
        (connected) => setIsWsConnected(connected)
      );

      return () => ws.close();
    }
  }, [user?.id]);

  const fetchNotifications = async () => {
    try {
      const list = await api.getMyNotifications();
      setNotifications(list);
    } catch (e) {
      console.log("Error loading notifications:", e);
    }
  };

  const handleAuthSuccess = (tokenData) => {
    sessionStorage.setItem('token', tokenData.access_token);
    const userData = {
      id: tokenData.id,
      phone: tokenData.phone,
      name: tokenData.name,
      role: tokenData.role,
      language_pref: tokenData.language_pref
    };
    sessionStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    if (tokenData.language_pref) {
      setCurrentLang(tokenData.language_pref);
      sessionStorage.setItem('language_pref', tokenData.language_pref);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const handleChangeLanguage = async (newLang) => {
    setCurrentLang(newLang);
    sessionStorage.setItem('language_pref', newLang);
    if (user) {
      try {
        await api.updateLang(newLang);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await api.markNotificationsRead([]);
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  // Seamless real-time role switch with actual JWT token re-issuance
  const handleSwitchRole = async (targetRole) => {
    try {
      let credentials = { phone: '9876543210', password: 'Farmer@123' };
      if (targetRole === 'OPERATOR') {
        credentials = { phone: '8888888888', password: 'Operator@123' };
      } else if (targetRole === 'ADMIN') {
        credentials = { phone: '9999999999', password: 'Admin@123' };
      }
      const tokenData = await api.login(credentials);
      handleAuthSuccess(tokenData);
    } catch (e) {
      console.error("Role switch failed:", e);
    }
  };

  // If viewing Public TV Display board
  if (route === '#display' || route === '#/display') {
    return <PublicDisplayBoard />;
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <Navbar
        user={user}
        onLogout={handleLogout}
        currentLang={currentLang}
        onChangeLang={handleChangeLanguage}
        unreadCount={unreadCount}
        onOpenNotifications={() => setIsNotifModalOpen(true)}
        isWsConnected={isWsConnected}
        onSwitchRole={handleSwitchRole}
      />

      {/* Main Role Content */}
      <main className="flex-1">
        {!user ? (
          <AuthPage onAuthSuccess={handleAuthSuccess} currentLang={currentLang} />
        ) : user.role === 'FARMER' ? (
          <FarmerDashboard user={user} currentLang={currentLang} onTriggerNotificationFetch={fetchNotifications} />
        ) : user.role === 'OPERATOR' ? (
          <OperatorDesk user={user} currentLang={currentLang} />
        ) : (
          <AdminAnalytics user={user} currentLang={currentLang} />
        )}
      </main>

      {/* In-app Notification Drawer Modal */}
      <NotificationModal
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
        notifications={notifications}
        onMarkAllRead={handleMarkAllNotificationsRead}
      />
    </div>
  );
}
