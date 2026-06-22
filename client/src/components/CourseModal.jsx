import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Award, Users, ChevronDown } from 'lucide-react';

export const WEEKDAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

export default function CourseModal({ isOpen, onClose, onSubmit, course }) {
  const initialState = {
    name: '',
    instructor: '',
    weekday: 0,
    time_start: '18:00',
    time_end: '19:00',
    max_participants: 10
  };

  const [formData, setFormData] = useState(initialState);
  const [error, setError] = useState('');
  const [isSelectOpen, setIsSelectOpen] = useState(false);

  useEffect(() => {
    if (course) {
      setFormData({
        name: course.name || '',
        instructor: course.instructor || '',
        weekday: course.weekday ?? 0,
        time_start: course.time_start || '18:00',
        time_end: course.time_end || '19:00',
        max_participants: course.max_participants || 10
      });
    } else {
      setFormData(initialState);
    }
    setError('');
  }, [course, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Il nome del corso è obbligatorio.');
      return;
    }
    if (formData.time_end <= formData.time_start) {
      setError("L'orario di fine deve essere successivo a quello di inizio.");
      return;
    }
    onSubmit({
      name: formData.name.trim(),
      instructor: formData.instructor.trim(),
      weekday: Number(formData.weekday),
      time_start: formData.time_start,
      time_end: formData.time_end,
      max_participants: Number(formData.max_participants)
    });
  };

  const inputClass =
    'w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-gymPrimary focus:ring-1 focus:ring-gymPrimary transition-colors';
  const labelClass = 'block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-gymCard border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-gymPrimary">
            <Calendar size={18} />
            <h2 className="text-lg font-bold text-slate-800">{course ? 'Modifica Corso' : 'Nuovo Corso'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-gymCardHover hover:text-slate-700 transition-colors cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5 font-sans">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">{error}</div>
            )}

            <div>
              <label className={labelClass}>Nome Corso</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Es: Corso Pilates" className={inputClass} required />
            </div>

            <div>
              <label className={labelClass}><Award size={12} /> Istruttore</label>
              <input type="text" name="instructor" value={formData.instructor} onChange={handleChange} placeholder="Es: Elena Valeri" className={inputClass} />
            </div>

            <div className="relative">
              <label className={labelClass}><Calendar size={12} /> Giorno della Settimana</label>
              <div 
                onClick={() => setIsSelectOpen(!isSelectOpen)}
                className={`${inputClass} flex items-center justify-between cursor-pointer`}
              >
                <span>{WEEKDAYS[formData.weekday]}</span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isSelectOpen ? 'rotate-180' : ''}`} />
              </div>
              
              {isSelectOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsSelectOpen(false)}></div>
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1">
                    {WEEKDAYS.map((d, i) => (
                      <div 
                        key={i} 
                        className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-slate-50 transition-colors ${formData.weekday === i ? 'bg-gymPrimary/10 text-gymPrimary font-bold' : 'text-slate-700'}`}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, weekday: i }));
                          setIsSelectOpen(false);
                        }}
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}><Clock size={12} /> Inizio</label>
                <input type="time" name="time_start" value={formData.time_start} onChange={handleChange} className={`${inputClass} px-2 sm:px-4`} required />
              </div>
              <div>
                <label className={labelClass}><Clock size={12} /> Fine</label>
                <input type="time" name="time_end" value={formData.time_end} onChange={handleChange} className={`${inputClass} px-2 sm:px-4`} required />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className={labelClass}><Users size={12} /> Posti</label>
                <input type="number" min="1" name="max_participants" value={formData.max_participants} onChange={handleChange} className={inputClass} required />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer">
              Annulla
            </button>
            <button type="submit" className="px-5 py-2.5 rounded-xl bg-gymPrimary hover:bg-gymPrimaryHover text-sm font-bold text-white transition-all duration-200 hover:shadow-lg hover:shadow-gymPrimary/25 cursor-pointer">
              {course ? 'Salva Modifiche' : 'Crea Corso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
