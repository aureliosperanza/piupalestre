import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Menu } from 'lucide-react';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
    <div className="min-h-screen bg-gymBg text-slate-800 flex flex-col md:flex-row relative">
      
      {/* Mobile TopBar */}
      <div className="md:hidden bg-gymCard border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gymPrimary/20 flex items-center justify-center text-gymPrimary font-bold text-xs">
            {gym?.name?.substring(0, 2).toUpperCase() || 'PP'}
          </div>
          <span className="font-bold text-slate-800 truncate">{gym?.name}</span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-slate-500 hover:text-gymPrimary transition-colors"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Sidebar with mobile support */}
      <Sidebar 
        activePage={activePage} 
        setActivePage={(page) => {
          setActivePage(page);
          setIsSidebarOpen(false); // Close on mobile after selection
        }} 
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      {/* Main Panel */}
      <main className="flex-1 min-h-screen w-full md:pl-64 flex flex-col">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8">
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
