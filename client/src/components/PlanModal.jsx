import React, { useState, useEffect } from 'react';
import { X, Tag, Clock, Hash, Sparkles } from 'lucide-react';

export default function PlanModal({ isOpen, onClose, onSubmit, plan }) {
  const initialState = {
    name: '',
    type: 'time',
    duration_months: 1,
    max_checkins: 10,
    price: '',
    is_promo: false
  };

  const [formData, setFormData] = useState(initialState);
  const [error, setError] = useState('');

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name || '',
        type: plan.type || 'time',
        duration_months: plan.duration_months || 1,
        max_checkins: plan.max_checkins || 10,
        price: plan.price ?? '',
        is_promo: !!plan.is_promo
      });
    } else {
      setFormData(initialState);
    }
    setError('');
  }, [plan, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Il nome dell\'abbonamento è obbligatorio.');
      return;
    }
    if (formData.price === '' || Number(formData.price) < 0) {
      setError('Inserisci un prezzo valido.');
      return;
    }

    // Normalizziamo i valori numerici e azzeriamo il campo non pertinente al tipo
    onSubmit({
      name: formData.name.trim(),
      type: formData.type,
      duration_months: formData.type === 'time' ? Number(formData.duration_months) : null,
      max_checkins: formData.type === 'count' ? Number(formData.max_checkins) : null,
      price: Number(formData.price),
      is_promo: formData.is_promo
    });
  };

  const inputClass =
    'w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-gymPrimary focus:ring-1 focus:ring-gymPrimary transition-colors';
  const labelClass =
    'block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-gymCard border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-gymPrimary">
            <Tag size={18} />
            <h2 className="text-lg font-bold text-slate-800">
              {plan ? 'Modifica Abbonamento' : 'Nuovo Abbonamento'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-gymCardHover hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5 font-sans">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {error}
              </div>
            )}

            {/* Nome */}
            <div>
              <label className={labelClass}>Nome Abbonamento *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Es: Mensile Open"
                className={inputClass}
                required
              />
            </div>

            {/* Tipologia (segmented) */}
            <div>
              <label className={labelClass}>Tipologia</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, type: 'time' }))}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    formData.type === 'time'
                      ? 'bg-gymPrimaryLight text-gymPrimary border-gymPrimary/30'
                      : 'bg-white text-slate-500 border-slate-300 hover:border-gymPrimary/30'
                  }`}
                >
                  <Clock size={15} /> A Tempo
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, type: 'count' }))}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    formData.type === 'count'
                      ? 'bg-gymPrimaryLight text-gymPrimary border-gymPrimary/30'
                      : 'bg-white text-slate-500 border-slate-300 hover:border-gymPrimary/30'
                  }`}
                >
                  <Hash size={15} /> A Ingressi
                </button>
              </div>
            </div>

            {/* Campo condizionale + prezzo */}
            <div className="grid grid-cols-2 gap-4">
              {formData.type === 'time' ? (
                <div>
                  <label className={labelClass}>Durata (mesi)</label>
                  <input
                    type="number" min="1" name="duration_months"
                    value={formData.duration_months} onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              ) : (
                <div>
                  <label className={labelClass}>N° Ingressi</label>
                  <input
                    type="number" min="1" name="max_checkins"
                    value={formData.max_checkins} onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              )}
              <div>
                <label className={labelClass}>Prezzo (€)</label>
                <input
                  type="number" min="0" step="0.01" name="price"
                  value={formData.price} onChange={handleChange}
                  placeholder="50.00" className={`${inputClass} font-mono`} required
                />
              </div>
            </div>

            {/* Flag Promo */}
            <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-gymAccent/40 transition-colors">
              <input
                type="checkbox" name="is_promo"
                checked={formData.is_promo} onChange={handleChange}
                className="h-4 w-4 accent-gymAccent cursor-pointer"
              />
              <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <Sparkles size={15} className="text-gymAccent" />
                Segna come Promozione
              </span>
            </label>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
            <button
              type="button" onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gymPrimary hover:bg-gymPrimaryHover text-sm font-bold text-white transition-all duration-200 hover:shadow-lg hover:shadow-gymPrimary/25 cursor-pointer"
            >
              {plan ? 'Salva Modifiche' : 'Crea Abbonamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
