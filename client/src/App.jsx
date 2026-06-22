import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import './utils/api'; // Side-effect import patches window.fetch with auth tokens and 401 hooks
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clienti from './pages/Clienti';
import Listino from './pages/Listino';
import Vendite from './pages/Vendite';
import Classi from './pages/Classi';
import Checkin from './pages/Checkin';
import SuperadminDashboard from './pages/SuperadminDashboard';
import Staff from './pages/Staff';
import Guide from './pages/Guide';
import LandingPage from './pages/LandingPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import CookiePolicy from './pages/CookiePolicy';
import PublicRegistration from './pages/PublicRegistration';
import MemberArea from './pages/MemberArea';
import CheckinKiosk from './pages/CheckinKiosk';
import Approvazioni from './pages/Approvazioni';

// Superadmin Page Component / Route Guard
function SuperadminRoute() {
  const { isAuthenticated, gym } = useAuth();

  if (!isAuthenticated || !gym?.is_admin) {
    return <Login isSuperadminLogin={true} />;
  }

  // Render Superadmin directly inside a clean, centered layout (no gym sidebar needed)
  return (
    <div className="min-h-screen bg-gymBg text-slate-800 py-12 px-6 sm:px-12">
      <div className="max-w-7xl mx-auto">
        <SuperadminDashboard />
      </div>
    </div>
  );
}

// Gym Tenant CRM Layout / Router Wrapper
function GymRoute() {
  const { isAuthenticated, gym } = useAuth();
  const { gym_slug } = useParams();
  const [activePage, setActivePage] = useState('dashboard');

  if (!isAuthenticated) {
    return <Login />;
  }

  // Superadmin guard: prevent superadmin from using the gym dashboard unless impersonating
  if (gym?.is_admin && !useAuth().isImpersonating) {
    return <Navigate to="/superadmin" replace />;
  }

  // Tenant security guard: ensure logged-in gym matches the URL slug
  if (gym.slug !== gym_slug) {
    return <Navigate to={`/${gym.slug}/admin`} replace />;
  }

  return (
    <div className="min-h-screen bg-gymBg text-slate-800 flex">
      {/* Fixed Sidebar */}
      <Sidebar activePage={activePage} setActivePage={setActivePage} />

      {/* Main Panel */}
      <main className="flex-1 min-h-screen pl-64">
        <div className="max-w-7xl mx-auto px-8 py-8">
          {activePage === 'dashboard' && <Dashboard setActivePage={setActivePage} />}
          {activePage === 'clienti' && <Clienti />}
          {activePage === 'listino' && <Listino />}
          {activePage === 'vendite' && <Vendite />}
          {activePage === 'classi' && <Classi />}
          {activePage === 'checkin' && <Checkin />}
          {activePage === 'approvazioni' && <Approvazioni />}
          {activePage === 'staff' && <Staff />}
          {activePage === 'guida' && <Guide />}
          {activePage === 'superadmin' && <SuperadminDashboard />}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/cookie" element={<CookiePolicy />} />

          {/* Superadmin Console Route */}
          <Route path="/superadmin" element={<SuperadminRoute />} />

          {/* Public client self-registration (per gym) */}
          <Route path="/:gym_slug/registrati" element={<PublicRegistration />} />

          {/* Gym manager CRM (email + password) */}
          <Route path="/:gym_slug/admin" element={<GymRoute />} />
          <Route path="/:gym_slug/admin/kiosk" element={<CheckinKiosk />} />

          {/* Member entry point: OTP login + self-service area (per gym) */}
          <Route path="/:gym_slug" element={<MemberArea />} />

          {/* Catch all fallback redirects to Landing Page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
