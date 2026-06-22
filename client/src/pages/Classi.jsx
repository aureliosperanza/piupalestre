import React, { useState, useEffect } from 'react';
import { Plus, CalendarDays, Users } from 'lucide-react';
import CourseModal, { WEEKDAYS } from '../components/CourseModal';
import CourseDetailModal from '../components/CourseDetailModal';

const SHORT_DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

export default function Classi() {
  const [classes, setClasses] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dettaglio corso aperto (per id, così resta agganciato ai dati aggiornati)
  const [detailCourseId, setDetailCourseId] = useState(null);

  // Modale Crea/Modifica corso
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/classes').then((res) => {
        if (!res.ok) throw new Error('Errore nel caricamento del palinsesto');
        return res.json();
      }),
      fetch('/api/clients').then((res) => {
        if (!res.ok) throw new Error('Errore nel caricamento degli iscritti');
        return res.json();
      })
    ])
      .then(([classesData, clientsData]) => {
        setClasses(classesData);
        setClients(clientsData);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Prenotazione: ritorna una Promise (la gestisce il modale di dettaglio)
  const handleBook = (classId, clientId) =>
    fetch('/api/classes/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: parseInt(clientId, 10), class_id: classId })
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Impossibile completare la prenotazione');
        return data;
      })
      .then((data) => {
        fetchData();
        return data;
      });

  // --- CRUD corso ---
  const handleOpenAdd = () => {
    setEditingCourse(null);
    setIsCourseModalOpen(true);
  };

  const handleEditFromDetail = (course) => {
    setDetailCourseId(null);
    setEditingCourse(course);
    setIsCourseModalOpen(true);
  };

  const handleCloseCourseModal = () => {
    setEditingCourse(null);
    setIsCourseModalOpen(false);
  };

  const handleSubmitCourse = (payload) => {
    const isEdit = !!editingCourse;
    const url = isEdit ? `/api/classes/${editingCourse.id}` : '/api/classes';
    const method = isEdit ? 'PUT' : 'POST';

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => { throw new Error(d.error || 'Errore nel salvataggio del corso'); });
        return res.json();
      })
      .then(() => {
        handleCloseCourseModal();
        fetchData();
      })
      .catch((err) => alert(err.message));
  };

  const handleDeleteCourse = (course) => {
    if (!window.confirm(`Eliminare il corso "${course.name}" di ${WEEKDAYS[course.weekday]}? Verranno rimosse anche le relative prenotazioni.`)) return;

    fetch(`/api/classes/${course.id}`, { method: 'DELETE' })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => { throw new Error(d.error || 'Errore durante la cancellazione'); });
        return res.json();
      })
      .then(() => {
        setDetailCourseId(null);
        fetchData();
      })
      .catch((err) => alert(err.message));
  };

  const detailCourse = classes.find((c) => c.id === detailCourseId) || null;
  const todayWeekday = (new Date().getDay() + 6) % 7;

  // Fasce orarie della griglia: dalla prima ora di inizio all'ultima ora di fine
  const toMinutes = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const startHourOf = (c) => Math.floor(toMinutes(c.time_start) / 60);
  const endHourOf = (c) => Math.ceil(toMinutes(c.time_end) / 60);

  let minHour = 9;
  let maxHour = 21;
  if (classes.length > 0) {
    minHour = Math.min(...classes.map(startHourOf));
    maxHour = Math.max(...classes.map(endHourOf));
  }
  const hours = [];
  for (let h = minHour; h < maxHour; h++) hours.push(h);

  // Colonne CSS: fascia oraria + 7 giorni
  const gridCols = { gridTemplateColumns: '60px repeat(7, minmax(0, 1fr))' };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">Palinsesto Corsi</h1>
          <p className="text-slate-500 mt-1">Vista settimanale dei corsi. Clicca un corso per prenotare o modificarlo.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-gymPrimary hover:bg-gymPrimaryHover text-white rounded-xl font-bold text-sm transition-all duration-200 shadow-md shadow-gymPrimary/10 self-start sm:self-auto active:scale-[0.98] cursor-pointer"
        >
          <Plus className="h-5 w-5" />
          Nuovo Corso
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gymPrimary"></div>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">{error}</div>
      ) : classes.length === 0 ? (
        <div className="bg-gymCard border border-dashed border-slate-300 rounded-2xl p-12 text-center">
          <CalendarDays className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Nessun corso nel palinsesto. Crea il primo corso settimanale!</p>
        </div>
      ) : (
        /* Griglia oraria settimanale (asse orario × giorni) */
        <div className="bg-gymCard border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              {/* Intestazione giorni */}
              <div className="grid border-b border-slate-200" style={gridCols}>
                <div className="border-r border-slate-100"></div>
                {SHORT_DAYS.map((d, i) => {
                  const isToday = i === todayWeekday;
                  return (
                    <div key={i} className={`px-2 py-3 text-center text-xs font-bold uppercase tracking-wider border-r border-slate-100 last:border-r-0 ${isToday ? 'bg-gymPrimaryLight/50 text-gymPrimary' : 'text-slate-600'}`}>
                      {d}
                    </div>
                  );
                })}
              </div>

              {/* Righe orarie */}
              {hours.map((h) => (
                <div key={h} className="grid border-b border-slate-100 last:border-b-0" style={gridCols}>
                  {/* Etichetta ora */}
                  <div className="border-r border-slate-100 px-2 py-1.5 text-right">
                    <span className="text-[11px] font-mono font-semibold text-slate-400">{String(h).padStart(2, '0')}:00</span>
                  </div>

                  {/* Celle giorno */}
                  {WEEKDAYS.map((_, day) => {
                    const isToday = day === todayWeekday;
                    const cellClasses = classes.filter((c) => c.weekday === day && startHourOf(c) === h);
                    return (
                      <div key={day} className={`border-r border-slate-100 last:border-r-0 p-1.5 min-h-[64px] space-y-1.5 ${isToday ? 'bg-gymPrimaryLight/20' : ''}`}>
                        {cellClasses.map((cls) => {
                          const isFull = cls.current_participants >= cls.max_participants;
                          const fillRatio = cls.current_participants / cls.max_participants;
                          return (
                            <button
                              key={cls.id}
                              onClick={() => setDetailCourseId(cls.id)}
                              className={`w-full text-left rounded-lg border p-2 bg-white hover:shadow-md transition-all duration-200 ${isFull ? 'border-rose-200' : 'border-slate-200 hover:border-gymPrimary/40'}`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-mono text-[10px] font-bold text-gymPrimary truncate">{cls.time_start}–{cls.time_end}</span>
                                <span className={`text-[9px] font-bold flex items-center gap-0.5 shrink-0 ${isFull ? 'text-rose-600' : 'text-slate-400'}`}>
                                  <Users className="h-2.5 w-2.5" />
                                  {cls.current_participants}/{cls.max_participants}
                                </span>
                              </div>
                              <div className="text-[11px] font-bold text-slate-800 truncate mt-0.5 leading-tight">{cls.name}</div>
                              {cls.instructor && (
                                <div className="text-[9px] text-slate-400 truncate">{cls.instructor}</div>
                              )}
                              <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden mt-1">
                                <div className={`h-full rounded-full ${isFull ? 'bg-rose-500' : fillRatio >= 0.75 ? 'bg-amber-500' : 'bg-gymPrimary'}`} style={{ width: `${Math.min(fillRatio * 100, 100)}%` }}></div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modale dettaglio corso (prenotazione + gestione) */}
      {detailCourse && (
        <CourseDetailModal
          course={detailCourse}
          clients={clients}
          onClose={() => setDetailCourseId(null)}
          onBook={handleBook}
          onEdit={handleEditFromDetail}
          onDelete={handleDeleteCourse}
        />
      )}

      {/* Modale Crea/Modifica corso */}
      <CourseModal isOpen={isCourseModalOpen} onClose={handleCloseCourseModal} onSubmit={handleSubmitCourse} course={editingCourse} />
    </div>
  );
}
