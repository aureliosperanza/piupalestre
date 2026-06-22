import React, { useState, useEffect } from 'react';
import { X, Clock, Award, Users, Edit2, Trash2, Plus, CheckCircle, AlertCircle, CalendarDays, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { WEEKDAYS } from './CourseModal';

export default function CourseDetailModal({ course, clients, onClose, onBook, onEdit, onDelete }) {
  const [clientId, setClientId] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [booking, setBooking] = useState(false);

  // Lista iscritti (espandibile)
  const [showParticipants, setShowParticipants] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  const courseId = course && course.id;

  const loadParticipants = () => {
    if (!courseId) return;
    setLoadingParticipants(true);
    fetch(`/api/classes/${courseId}/bookings`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setParticipants(data);
        setLoadingParticipants(false);
      })
      .catch(() => setLoadingParticipants(false));
  };

  const toggleParticipants = () => {
    const next = !showParticipants;
    setShowParticipants(next);
    if (next) loadParticipants();
  };

  // Reset dei controlli quando si passa a un altro corso
  useEffect(() => {
    setClientId('');
    setQuery('');
    setOpen(false);
    setFeedback(null);
    setShowParticipants(false);
    setParticipants([]);
  }, [courseId]);

  if (!course) return null;

  // Suggerimenti filtrati per nome/cognome/email (max 6)
  const suggestions = query.trim()
    ? clients
        .filter((c) => `${c.first_name} ${c.last_name} ${c.email || ''}`.toLowerCase().includes(query.trim().toLowerCase()))
        .slice(0, 6)
    : [];

  const pickClient = (c) => {
    setClientId(String(c.id));
    setQuery(`${c.first_name} ${c.last_name}`);
    setOpen(false);
  };

  const isFull = course.current_participants >= course.max_participants;
  const fillRatio = course.current_participants / course.max_participants;

  const handleBook = async () => {
    if (!clientId) {
      setFeedback({ type: 'error', message: 'Seleziona un cliente.' });
      return;
    }
    setBooking(true);
    setFeedback(null);
    try {
      await onBook(course.id, clientId);
      setFeedback({ type: 'success', message: 'Cliente aggiunto al corso!' });
      setClientId('');
      setQuery('');
      if (showParticipants) loadParticipants();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-gymCard border border-slate-200 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{course.name}</h2>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
              <span className="flex items-center gap-1"><CalendarDays size={13} /> {WEEKDAYS[course.weekday]}</span>
              <span className="flex items-center gap-1 font-mono"><Clock size={13} /> {course.time_start}–{course.time_end}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-gymCardHover hover:text-slate-700 transition-colors cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 font-sans">
          <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
            <Award className="h-3.5 w-3.5 text-gymPrimary" />
            Istruttore: {course.instructor || 'N/D'}
          </p>

          {/* Capienza (cliccabile per vedere gli iscritti) */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={toggleParticipants}
              className="w-full flex justify-between items-center text-xs font-semibold group"
            >
              <span className="text-slate-500 flex items-center gap-1 group-hover:text-gymPrimary transition-colors">
                <Users className="h-3.5 w-3.5" /> Partecipanti
                {showParticipants ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </span>
              <span className="text-slate-800 font-mono">{course.current_participants} / {course.max_participants}</span>
            </button>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/30">
              <div className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-rose-500' : fillRatio >= 0.75 ? 'bg-amber-500' : 'bg-gymPrimary'}`} style={{ width: `${Math.min(fillRatio * 100, 100)}%` }}></div>
            </div>

            {/* Lista iscritti */}
            {showParticipants && (
              <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/60 divide-y divide-slate-100 max-h-40 overflow-y-auto animate-in fade-in duration-200">
                {loadingParticipants ? (
                  <div className="px-3 py-2.5 text-xs text-slate-400">Caricamento iscritti...</div>
                ) : participants.length === 0 ? (
                  <div className="px-3 py-2.5 text-xs text-slate-400">Nessun iscritto a questo corso.</div>
                ) : (
                  participants.map((p) => (
                    <div key={p.booking_id} className="px-3 py-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-700 truncate">{p.first_name} {p.last_name}</span>
                      <span className="text-[10px] text-slate-400 font-mono truncate">{p.email}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Prenotazione */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aggiungi una prenotazione</label>
            <div className="flex gap-2">
              {/* Autocomplete cliente */}
              <div className="relative flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={query}
                    disabled={isFull}
                    placeholder="Cerca cliente per nome..."
                    onChange={(e) => { setQuery(e.target.value); setClientId(''); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 120)}
                    className="w-full bg-white text-slate-800 border border-slate-300 rounded-xl pl-8 pr-3 py-2.5 text-xs focus:outline-none focus:border-gymPrimary focus:ring-1 focus:ring-gymPrimary transition-colors disabled:opacity-50"
                  />
                </div>

                {open && suggestions.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-gymCard border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto divide-y divide-slate-100">
                    {suggestions.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); pickClient(c); }}
                        className="w-full text-left px-3 py-2 hover:bg-gymCardHover flex items-center justify-between gap-2 transition-colors"
                      >
                        <span className="text-xs font-semibold text-slate-800 truncate">{c.first_name} {c.last_name}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${c.membership_status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          {c.membership_status === 'active' ? 'Attivo' : 'Bloccato'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {open && query.trim() && suggestions.length === 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-gymCard border border-slate-200 rounded-xl shadow-xl px-3 py-2.5 text-[11px] text-slate-400">
                    Nessun cliente trovato
                  </div>
                )}
              </div>

              <button
                onClick={handleBook}
                disabled={isFull || booking}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all duration-200 flex items-center gap-1 shrink-0 ${isFull || booking ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-gymPrimary hover:bg-gymPrimaryHover active:scale-95'}`}
              >
                <Plus className="h-4 w-4" />
                {isFull ? 'Completo' : 'Aggiungi'}
              </button>
            </div>

            {feedback && (
              <div className={`p-3 rounded-xl flex items-start gap-2 border text-xs ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50' : 'bg-rose-50 text-rose-700 border-rose-200/50'}`}>
                {feedback.type === 'success' ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                <p className="font-medium">{feedback.message}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer: gestione corso */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
          <button
            onClick={() => onDelete(course)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <Trash2 className="h-4 w-4" /> Elimina
          </button>
          <button
            onClick={() => onEdit(course)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gymPrimaryLight text-gymPrimary hover:text-gymPrimaryHover border border-gymPrimary/20 text-xs font-bold transition-colors cursor-pointer"
          >
            <Edit2 className="h-4 w-4" /> Modifica Corso
          </button>
        </div>
      </div>
    </div>
  );
}
