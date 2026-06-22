import React from 'react';
import { LayoutDashboard, Users, CreditCard, CalendarDays, Ticket, LogOut, CheckSquare, ShieldCheck, Tag, BookOpen, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

export default function Sidebar({ activePage, setActivePage, isOpen, setIsOpen }) {
  const { gym, logout, isImpersonating, stopImpersonating } = useAuth();
  
  // Roles: 'owner', 'admin', 'reception', 'trainer'
  const userRole = gym?.role || 'owner';

  const menuGroups = [];

  // Trainer sees only Dashboard and Classes (and maybe Clients read-only in the future)
  if (userRole === 'trainer') {
    menuGroups.push({
      label: 'Generale',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'classi', label: 'Classi e Prenotazioni', icon: CalendarDays }
      ]
    });
  } 
  // Reception sees daily operations
  else if (userRole === 'reception') {
    menuGroups.push({
      label: 'Generale',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'checkin', label: 'Check-in Desk', icon: Ticket },
      ]
    });
    menuGroups.push({
      label: 'Gestione Palestra',
      items: [
        { id: 'clienti', label: 'Clienti', icon: Users },
        { id: 'classi', label: 'Classi e Prenotazioni', icon: CalendarDays },
        { id: 'approvazioni', label: 'Approv. Certificati', icon: CheckSquare },
      ]
    });
    menuGroups.push({
      label: 'Amministrazione',
      items: [
        { id: 'vendite', label: 'Vendite', icon: CreditCard }
      ]
    });
  } 
  // Owner/Admin sees everything
  else {
    menuGroups.push({
      label: 'Generale',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'checkin', label: 'Check-in Desk', icon: Ticket },
      ]
    });
    menuGroups.push({
      label: 'Gestione Palestra',
      items: [
        { id: 'clienti', label: 'Clienti', icon: Users },
        { id: 'classi', label: 'Classi e Prenotazioni', icon: CalendarDays },
        { id: 'approvazioni', label: 'Approv. Certificati', icon: CheckSquare },
      ]
    });
    menuGroups.push({
      label: 'Amministrazione',
      items: [
        { id: 'vendite', label: 'Contabilità e Vendite', icon: CreditCard },
        { id: 'listino', label: 'Abbonamenti', icon: Tag },
        { id: 'staff', label: 'Gestione Team', icon: Users }
      ]
    });
    menuGroups.push({
      label: 'Supporto',
      items: [
        { id: 'guida', label: 'Guida & Assistenza', icon: BookOpen }
      ]
    });
  }

  if (gym?.is_admin && userRole === 'owner') {
    menuGroups.push({
      label: 'Sistema SaaS',
      items: [
        { id: 'superadmin', label: 'Superadmin', icon: ShieldCheck }
      ]
    });
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-gymCard border-r border-slate-200 flex flex-col z-50 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Brand logo header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-3">
          <img src={logo} alt="PiùPalestre" className="h-9 w-auto" />
          <button 
            onClick={() => setIsOpen(false)}
            className="md:hidden p-2 -mr-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Impersonation exit banner */}
        {isImpersonating && (
          <div className="p-3 bg-rose-50 border-b border-rose-100">
            <button
              onClick={stopImpersonating}
              className="w-full flex justify-center items-center gap-2 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm shadow-rose-200"
            >
              <LogOut className="h-4 w-4" />
              Torna alla Console
            </button>
          </div>
        )}
        
        {/* Navigation menu items */}
        <nav className="flex-1 p-4 overflow-y-auto space-y-6 mt-2">
          {menuGroups.map((group, idx) => (
            <div key={idx}>
              <h3 className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                {group.label}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activePage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActivePage(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-gymPrimaryLight text-gymPrimary font-semibold translate-x-1'
                          : 'text-slate-500 hover:bg-gymCardHover hover:text-slate-800'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        
        {/* Bottom user profile card */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <div className="flex items-center justify-between gap-2 px-2 py-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-gymPrimary/20 flex items-center justify-center text-gymPrimary font-bold text-sm shrink-0">
                {gym ? gym.name.substring(0, 2).toUpperCase() : 'PP'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-700 truncate">{gym?.user_name || gym?.name || 'Operatore'}</p>
                <span className="text-[10px] text-slate-500 block truncate">{gym?.name || 'Palestra'} • {userRole}</span>
              </div>
            </div>
            
            <button
              onClick={logout}
              title="Esci"
              className="p-2 text-slate-500 hover:text-red-650 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
