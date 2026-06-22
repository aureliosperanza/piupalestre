import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, AlertTriangle, FileText, ChevronRight, Activity, ArrowUpRight, Clock } from 'lucide-react';
import { getClientStatusFlags, formatDate } from '../utils/dateHelpers';

export default function Dashboard({ setActivePage }) {
  const navigate = useNavigate();

  // Clients data
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Today's classes
  const [todayClasses, setTodayClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState(null);

  // Today's check‑ins (last 3)
  const [recentCheckins, setRecentCheckins] = useState([]);
  const [checkinsLoading, setCheckinsLoading] = useState(true);
  const [checkinsError, setCheckinsError] = useState(null);

  // Fetch clients (used for KPI & recent updates)
  useEffect(() => {
    fetch('/api/clients')
      .then((res) => {
        if (!res.ok) throw new Error('Impossibile recuperare i dati dei clienti');
        return res.json();
      })
      .then((data) => {
        setClients(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Fetch today's courses (recurring schedule -> filter by current weekday)
  useEffect(() => {
    const todayWeekday = (new Date().getDay() + 6) % 7; // 0=Lun ... 6=Dom
    fetch('/api/classes')
      .then((res) => {
        if (!res.ok) throw new Error('Impossibile recuperare i corsi di oggi');
        return res.json();
      })
      .then((data) => {
        setTodayClasses(data.filter((c) => c.weekday === todayWeekday));
        setClassesLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setClassesError(err.message);
        setClassesLoading(false);
      });
  }, []);

  // Fetch today's check‑ins (last 3)
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    fetch(`/api/checkins?date=${today}&limit=3`)
      .then((res) => {
        if (!res.ok) throw new Error('Impossibile recuperare i check‑in');
        return res.json();
      })
      .then((data) => {
        setRecentCheckins(data);
        setCheckinsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setCheckinsError(err.message);
        setCheckinsLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gymPrimary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-755 text-red-750 font-medium text-red-700">
        Si è verificato un errore: {error}
      </div>
    );
  }

  // Compute metrics from the active list of clients
  let activeCount = 0;
  let expiringCount = 0;
  let expiredCertificatesCount = 0;

  clients.forEach((client) => {
    const { isMembershipExpired, isMembershipExpiringSoon, isCertificateExpired } = getClientStatusFlags(client);

    if (!isMembershipExpired) activeCount++;
    if (isMembershipExpiringSoon) expiringCount++;
    if (isCertificateExpired) expiredCertificatesCount++;
  });

  // Recent client updates (max 5)
  const recentClients = [...clients]
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
    .slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">Dashboard</h1>
        <p className="text-slate-500 mt-1 font-medium">Panoramica in tempo reale degli iscritti e delle scadenze.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI: Active Members */}
        <div
          className="bg-gymCard border border-slate-200/60 rounded-2xl p-6 relative overflow-hidden group hover:border-gymPrimary/30 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer"
          onClick={() => {
            // Cambia la vista interna
            setActivePage('clienti');
            // Aggiorna l'URL aggiungendo il filtro di stato attivo
            navigate(`?status=active`);
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Iscritti Attivi</p>
              <h3 className="text-3xl font-black text-slate-800 mt-2 font-mono">{activeCount}</h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
              <Users className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
            Abbonamenti regolari attivi
          </div>
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-[0.015] pointer-events-none">
            <Users className="h-32 w-32 text-slate-200" />
          </div>
        </div>

        {/* KPI: Expiring Members */}
        <div
          className="bg-gymCard border border-slate-200/60 rounded-2xl p-6 relative overflow-hidden group hover:border-amber-500/30 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer"
          onClick={() => {
            setActivePage('clienti');
            navigate(`?filter=expiring`);
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">In Scadenza (7gg)</p>
              <h3 className="text-3xl font-black text-slate-800 mt-2 font-mono">{expiringCount}</h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-amber-700 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
            Rinnovi richiesti a breve
          </div>
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-[0.015] pointer-events-none">
            <AlertTriangle className="h-32 w-32 text-slate-200" />
          </div>
        </div>

        {/* KPI: Expired Certificates */}
        <div
          className="bg-gymCard border border-slate-200/60 rounded-2xl p-6 relative overflow-hidden group hover:border-red-500/30 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer"
          onClick={() => {
            setActivePage('clienti');
            navigate(`?filter=expired-med`);
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Certificati Scaduti</p>
              <h3 className="text-3xl font-black text-slate-800 mt-2 font-mono">{expiredCertificatesCount}</h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-red-50 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
              <FileText className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-red-700 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 inline-block animate-pulse" />
            Blocchi all'ingresso attivi
          </div>
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-[0.015] pointer-events-none">
            <FileText className="h-32 w-32 text-slate-200" />
          </div>
        </div>
      </div>

      {/* Next Courses & Recent Updates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Next courses of today */}
        <div className="bg-gymCard border border-slate-200/60 rounded-2xl p-6 shadow-sm">
          <h4 className="text-base font-bold text-slate-800 mb-3">I Prossimi Corsi di Oggi</h4>
          {classesLoading && <p className="text-xs text-slate-500">Caricamento...</p>}
          {classesError && <p className="text-xs text-rose-600">{classesError}</p>}
          {!classesLoading && todayClasses.length > 0 ? (
            <ul className="space-y-3">
              {todayClasses.map((cls) => {
                const progress = Math.min((cls.current_participants / cls.max_participants) * 100, 100);
                return (
                  <li key={cls.id} className="flex flex-col">
                    <div className="flex justify-between items-center text-sm text-slate-800">
                      <span className="font-medium">
                        {cls.time_start}
                      </span>
                      <span>{cls.current_participants} / {cls.max_participants}</span>
                    </div>
                    <div className="text-xs text-slate-600">{cls.name} – {cls.instructor}</div>
                    <div className="w-full bg-slate-200 rounded-full h-2 mt-1 overflow-hidden">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            !classesLoading && <p className="text-xs text-slate-500">Nessun corso previsto per oggi.</p>
          )}
        </div>

        {/* Recent updates table */}
        <div className="bg-gymCard border border-slate-200/60 rounded-2xl p-6 lg:col-span-1 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-bold text-slate-800">Ultimi Aggiornamenti Iscritti</h4>
            <button
              onClick={() => setActivePage('clienti')}
              className="text-xs text-gymPrimary hover:text-gymPrimaryHover font-bold flex items-center gap-0.5 transition-colors cursor-pointer"
            >
              Vedi Tutti
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="overflow-x-auto font-sans">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="pb-3">Iscritto</th>
                  <th className="pb-3">Abbonamento</th>
                  <th className="pb-3">Stato</th>
                  <th className="pb-3 text-right">Data Modifica</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50">
                {recentClients.map((client) => {
                  const { isMembershipExpired } = getClientStatusFlags(client);
                  return (
                    <tr key={client.id} className="group hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 pr-3">
                        <div className="font-semibold text-sm text-slate-800 transition-colors">
                          {client.first_name} {client.last_name}
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{client.email}</div>
                      </td>
                      <td className="py-3.5 text-xs text-slate-600 font-medium">
                        {client.active_membership ? client.active_membership.plan_name : '—'}
                      </td>
                      <td className="py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${!isMembershipExpired
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50'
                              : 'bg-rose-50 text-rose-700 border-rose-200/50'
                            }`}
                        >
                          {!isMembershipExpired ? 'Attivo' : 'Scaduto'}
                        </span>
                      </td>
                      <td className="py-3.5 text-right text-xs text-slate-400 font-mono">
                        {formatDate(client.updated_at || client.created_at)}
                      </td>
                    </tr>
                  );
                })}
                {recentClients.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-6 text-sm text-slate-500">
                      Nessun cliente registrato.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
