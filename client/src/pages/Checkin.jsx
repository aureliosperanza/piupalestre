import React, { useState, useEffect, useRef } from 'react';
import { Search, CheckCircle, AlertTriangle, Clock, X, UserCheck, ShieldAlert, Users, MonitorSmartphone } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { formatDate } from '../utils/dateHelpers';

export default function Checkin() {
  const { gym_slug } = useParams();
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickClients, setQuickClients] = useState([]); // List of clients for quick-test simulation buttons
  const [recentCheckins, setRecentCheckins] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Active check-in result to display as fullscreen alert overlay
  const [activeCheckin, setActiveCheckin] = useState(null); // { status: 'allowed'|'denied', reason: '...', name: '...' }
  const overlayTimer = useRef(null);

  // Load entry logs history and quick clients list
  const loadHistoryAndClients = () => {
    setLoadingHistory(true);
    Promise.all([
      fetch('/api/checkins').then(res => res.json()),
      fetch('/api/clients').then(res => res.json())
    ])
      .then(([historyData, clientsData]) => {
        setRecentCheckins(historyData.slice(0, 5)); // Keep only last 5 entries
        setQuickClients(clientsData);
        setLoadingHistory(false);
      })
      .catch(err => {
        console.error('Error fetching checkin data:', err);
        setLoadingHistory(false);
      });
  };

  useEffect(() => {
    loadHistoryAndClients();
    return () => {
      if (overlayTimer.current) clearTimeout(overlayTimer.current);
    };
  }, []);

  // Live client lookup in database
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (!value.trim()) {
      setSearchResults([]);
      return;
    }

    fetch(`/api/clients?q=${encodeURIComponent(value)}`)
      .then(res => res.json())
      .then(data => {
        setSearchResults(data);
      })
      .catch(err => console.error('Error searching clients:', err));
  };

  // Perform Check-in POST
  const triggerCheckin = (clientId, firstName, lastName) => {
    // Clear search bar and results dropdown
    setSearchQuery('');
    setSearchResults([]);

    fetch('/api/checkins', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ client_id: clientId })
    })
      .then(res => {
        if (!res.ok) throw new Error('Errore durante la registrazione del check-in');
        return res.json();
      })
      .then(data => {
        // Set state to trigger fullscreen popup overlay
        setActiveCheckin({
          status: data.status, // 'allowed' or 'denied'
          reason: data.reason,
          name: `${firstName} ${lastName}`
        });

        // Reload the history list
        loadHistoryAndClients();

        // Configure auto-close after 3 seconds
        if (overlayTimer.current) clearTimeout(overlayTimer.current);
        overlayTimer.current = setTimeout(() => {
          setActiveCheckin(null);
        }, 3000);
      })
      .catch(err => {
        alert(err.message);
      });
  };

  const handleCloseOverlay = () => {
    if (overlayTimer.current) clearTimeout(overlayTimer.current);
    setActiveCheckin(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 relative min-h-[80vh]">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">Console Reception & Check-in</h1>
          <p className="text-slate-500 mt-1">Scannerizza i badge o cerca i clienti per registrare gli ingressi al desk.</p>
        </div>
        <a 
          href={`/${gym_slug}/admin/kiosk`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-5 py-3 bg-gymPrimary text-white rounded-xl font-bold text-sm hover:bg-gymPrimaryHover transition-colors shadow-lg shadow-gymPrimary/25 cursor-pointer"
        >
          <MonitorSmartphone className="h-5 w-5" />
          Avvia Modalità Kiosk Tablet
        </a>
      </div>

      {/* Check-in input box */}
      <div className="bg-gymCard text-slate-800 shadow-sm border border-slate-100 rounded-3xl p-8 max-w-5xl mx-auto relative">
        <label className="block text-center text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">
          Cerca Cliente per Check-in rapidissimo
        </label>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400" />
          <input
            type="text"
            placeholder="Digita nome, cognome o email dell'iscritto..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full bg-white text-slate-800 border border-slate-300 rounded-2xl pl-14 pr-4 py-4 text-base placeholder-slate-400 focus:outline-none focus:border-gymPrimary focus:ring-1 focus:ring-gymPrimary transition-all"
            autoFocus
          />
        </div>

        {/* Live results list dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute left-8 right-8 mt-2 bg-gymCard border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-30 max-h-60 overflow-y-auto divide-y divide-slate-100">
            {searchResults.map((client) => (
              <button
                key={client.id}
                onClick={() => triggerCheckin(client.id, client.first_name, client.last_name)}
                className="w-full text-left px-5 py-3.5 hover:bg-gymCardHover flex items-center justify-between transition-colors group"
              >
                <div>
                  <div className="font-semibold text-sm text-slate-800 group-hover:text-gymPrimary">
                    {client.first_name} {client.last_name}
                  </div>
                  <span className="text-xs text-slate-500 font-mono">{client.email}</span>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border capitalize ${
                  client.membership_status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50'
                    : 'bg-rose-50 text-rose-700 border-rose-200/50'
                }`}>
                  {client.membership_status === 'active' ? 'Attivo' : 'Scaduto'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Simulator shortcuts for easy user validation */}
      <div className="bg-gymCard text-slate-800 shadow-sm border border-slate-100 rounded-2xl p-6 max-w-5xl mx-auto space-y-4">
        <div className="flex items-center gap-2 text-gymPrimary border-b border-slate-100 pb-3">
          <Users className="h-5 w-5" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Simulatore Scansione Badge Rapido</h4>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Clicca su un nominativo qui sotto per simulare la lettura istantanea del suo QR code/badge all'ingresso:
        </p>
        <div className="flex flex-wrap gap-2.5">
          {quickClients.map((client) => {
            const isBlocked = client.membership_status !== 'active';
            return (
              <button
                key={client.id}
                onClick={() => triggerCheckin(client.id, client.first_name, client.last_name)}
                className="px-4 py-2.5 bg-white hover:bg-gymCardHover border border-slate-200 rounded-xl text-xs font-semibold text-slate-650 hover:text-slate-800 transition-all flex items-center gap-2 hover:border-gymPrimary/30 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <span className={`h-2 w-2 rounded-full ${isBlocked ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                {client.first_name} {client.last_name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Entries History Log */}
      <div className="max-w-5xl mx-auto bg-gymCard text-slate-800 shadow-sm border border-slate-100 rounded-2xl p-6">
        <h4 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-slate-400" />
          Ultimi Check-in Effettuati
        </h4>

        {loadingHistory ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gymPrimary"></div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentCheckins.map((log) => {
              const checkinTime = new Date(log.checkin_time).toLocaleTimeString('it-IT', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });
              const allowed = log.status === 'allowed';

              return (
                <div key={log.id} className="py-3.5 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    {allowed ? (
                      <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 border border-emerald-100">
                        <UserCheck className="h-4.5 w-4.5" />
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-700 border border-rose-100">
                        <ShieldAlert className="h-4.5 w-4.5" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-slate-850">{log.first_name} {log.last_name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {allowed ? 'Accesso autorizzato' : `Accesso bloccato: ${log.reason}`}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 font-mono font-medium">{checkinTime}</span>
                </div>
              );
            })}
            {recentCheckins.length === 0 && (
              <p className="text-center py-6 text-sm text-slate-500">Nessun check-in registrato oggi.</p>
            )}
          </div>
        )}
      </div>

      {/* FULLSCREEN RESPONSE OVERLAY BANNER */}
      {activeCheckin && (
        <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center text-center p-6 transition-all duration-300 ${
          activeCheckin.status === 'allowed' 
            ? 'bg-emerald-500 text-white animate-in fade-in duration-300' 
            : 'bg-rose-500 text-white animate-in fade-in duration-300'
        }`}>
          {/* Close button */}
          <button
            onClick={handleCloseOverlay}
            className="absolute top-6 right-6 p-2 rounded-full bg-black/10 hover:bg-black/25 text-white transition-colors"
          >
            <X className="h-8 w-8" />
          </button>

          <div className="space-y-6 max-w-md mx-auto animate-in zoom-in-95 duration-200">
            {activeCheckin.status === 'allowed' ? (
              <>
                <div className="h-24 w-24 bg-white/20 rounded-full flex items-center justify-center mx-auto text-white shadow-xl shadow-black/15">
                  <CheckCircle className="h-16 w-16" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-5xl font-black uppercase tracking-wider text-white">
                    Accesso Consentito
                  </h2>
                  <p className="text-2xl font-bold text-white/90">
                    Benvenuto, {activeCheckin.name}!
                  </p>
                </div>
                <p className="text-sm font-semibold text-emerald-100 bg-black/15 px-4 py-2 rounded-xl inline-block">
                  Abbonamento regolare • Certificato in regola
                </p>
              </>
            ) : (
              <>
                <div className="h-24 w-24 bg-white/20 rounded-full flex items-center justify-center mx-auto text-white shadow-xl shadow-black/15">
                  <ShieldAlert className="h-16 w-16" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-5xl font-black uppercase tracking-wider text-white">
                    Accesso Negato
                  </h2>
                  <p className="text-2xl font-bold text-white/90">
                    {activeCheckin.name}
                  </p>
                </div>
                <div className="text-base font-bold bg-black/25 text-rose-100 border border-white/10 px-5 py-3.5 rounded-2xl inline-block tracking-wide">
                  Motivo: {activeCheckin.reason}
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
