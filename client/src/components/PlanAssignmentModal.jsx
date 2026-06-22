import React, { useState, useEffect } from 'react';
import { X, Ticket, CheckCircle, Calendar, Tag, Clock, Hash, Search } from 'lucide-react';

// Restituisce la data odierna in formato YYYY-MM-DD per l'input date
const todayISO = () => new Date().toISOString().split('T')[0];

export default function PlanAssignmentModal({ isOpen, onClose, onSuccess, client }) {
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [planQuery, setPlanQuery] = useState('');
  const [planOpen, setPlanOpen] = useState(false);
  const [startDate, setStartDate] = useState(todayISO());
  const [assignedPrice, setAssignedPrice] = useState('');
  const [paymentType, setPaymentType] = useState('full');
  const [paidAmount, setPaidAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Al montaggio/apertura del modale recuperiamo il listino della palestra
  useEffect(() => {
    if (!isOpen) return;

    // Reset dello stato ad ogni apertura
    setSelectedPlanId('');
    setPlanQuery('');
    setPlanOpen(false);
    setStartDate(todayISO());
    setAssignedPrice('');
    setPaymentType('full');
    setPaidAmount('');
    setError('');
    setSuccess(false);

    setLoadingPlans(true);
    fetch('/api/plans')
      .then((res) => {
        if (!res.ok) throw new Error('Impossibile caricare il listino abbonamenti');
        return res.json();
      })
      .then((data) => {
        setPlans(data);
        if (data.length > 0) {
          setSelectedPlanId(String(data[0].id));
          setPlanQuery(data[0].name); 
          setAssignedPrice(data[0].price);
          setPaidAmount(data[0].price);
        }
        setLoadingPlans(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoadingPlans(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedPlan = plans.find((p) => String(p.id) === String(selectedPlanId));

  // Suggerimenti: filtra per nome; con query vuota mostra tutto il listino
  const planSuggestions = planQuery.trim()
    ? plans.filter((p) => p.name.toLowerCase().includes(planQuery.trim().toLowerCase()))
    : plans;

  const pickPlan = (p) => {
    setSelectedPlanId(String(p.id));
    setPlanQuery(p.name);
    setAssignedPrice(p.price);
    setPaymentType('full');
    setPaidAmount(p.price);
    setPlanOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedPlanId) {
      setError('Seleziona un abbonamento dal listino.');
      return;
    }

    setSubmitting(true);
    setError('');

    fetch('/api/client-memberships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: client.id,
        plan_id: Number(selectedPlanId),
        start_date: startDate,
        assigned_price: Number(assignedPrice),
        paid_amount: Number(paidAmount)
      })
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((d) => {
            throw new Error(d.error || 'Errore durante l\'attivazione dell\'abbonamento');
          });
        }
        return res.json();
      })
      .then(() => {
        setSuccess(true);
        setSubmitting(false);
        // Chiusura automatica con refresh dopo il feedback di successo
        setTimeout(() => {
          onSuccess && onSuccess();
          onClose();
        }, 1400);
      })
      .catch((err) => {
        setError(err.message);
        setSubmitting(false);
      });
  };

  const formatPrice = (p) => `€ ${Number(p).toFixed(2)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-gymCard border border-slate-200 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-gymPrimary">
            <Ticket size={18} />
            <h2 className="text-lg font-bold text-slate-800">Assegna Abbonamento</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-gymCardHover hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          /* Feedback di successo */
          <div className="p-10 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-200">
            <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle className="h-9 w-9" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Abbonamento Attivato!</h3>
              <p className="text-sm text-slate-500 mt-1">
                {client.first_name} {client.last_name} è ora attivo.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-5 font-sans">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                  {error}
                </div>
              )}

              {/* Cliente target */}
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Atleta</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">
                  {client.first_name} {client.last_name}
                </p>
              </div>

              {/* Select listino */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Tag size={12} /> Abbonamento / Promo
                </label>
                {loadingPlans ? (
                  <div className="text-xs text-slate-400 py-2.5">Caricamento listino...</div>
                ) : plans.length === 0 ? (
                  <div className="text-xs text-rose-600 py-2.5">Nessun piano configurato nel listino.</div>
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={planQuery}
                        placeholder="Cerca un abbonamento..."
                        onChange={(e) => { setPlanQuery(e.target.value); setSelectedPlanId(''); setPlanOpen(true); }}
                        onFocus={() => setPlanOpen(true)}
                        onBlur={() => setTimeout(() => setPlanOpen(false), 120)}
                        className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-gymPrimary focus:ring-1 focus:ring-gymPrimary transition-colors"
                      />
                    </div>

                    {planOpen && planSuggestions.length > 0 && (
                      <div className="absolute z-20 left-0 right-0 mt-1 bg-gymCard border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto divide-y divide-slate-100">
                        {planSuggestions.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); pickPlan(p); }}
                            className="w-full text-left px-3 py-2.5 hover:bg-gymCardHover flex items-center justify-between gap-2 transition-colors"
                          >
                            <span className="text-sm font-semibold text-slate-800 truncate flex items-center gap-1.5">
                              {p.is_promo ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gymAccent text-white">PROMO</span> : null}
                              {p.name}
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-500 shrink-0">{formatPrice(p.price)}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {planOpen && planQuery.trim() && planSuggestions.length === 0 && (
                      <div className="absolute z-20 left-0 right-0 mt-1 bg-gymCard border border-slate-200 rounded-xl shadow-xl px-3 py-2.5 text-[11px] text-slate-400">
                        Nessun abbonamento trovato
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Dettaglio piano selezionato */}
              {selectedPlan && (
                <div className="flex items-center gap-2 p-3 bg-gymPrimaryLight rounded-xl border border-gymPrimary/10 text-xs text-slate-700">
                  {selectedPlan.type === 'time' ? (
                    <>
                      <Clock size={14} className="text-gymPrimary" />
                      <span>Durata: <strong>{selectedPlan.duration_months} mese/i</strong> — la scadenza sarà calcolata in automatico.</span>
                    </>
                  ) : (
                    <>
                      <Hash size={14} className="text-gymPrimary" />
                      <span>Carnet a ingressi: <strong>{selectedPlan.max_checkins} accessi</strong> verranno caricati.</span>
                    </>
                  )}
                </div>
              )}

              {/* Data inizio */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar size={12} /> Data Inizio Validità
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-gymPrimary focus:ring-1 focus:ring-gymPrimary transition-colors"
                  required
                />
              </div>

              {/* Sezione Contabile / Prezzi */}
              {selectedPlan && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        Prezzo Concordato (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={assignedPrice}
                        onChange={(e) => {
                          setAssignedPrice(e.target.value);
                          if (paymentType === 'full') setPaidAmount(e.target.value);
                        }}
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-gymPrimary transition-colors"
                        required
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        Pagamento
                      </label>
                      <select
                        value={paymentType}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPaymentType(val);
                          if (val === 'full') setPaidAmount(assignedPrice);
                          else if (val === 'unpaid') setPaidAmount('0');
                        }}
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-gymPrimary transition-colors cursor-pointer"
                      >
                        <option value="full">Pagato tutto</option>
                        <option value="partial">Acconto (Parziale)</option>
                        <option value="unpaid">Da Pagare</option>
                      </select>
                    </div>
                  </div>
                  {paymentType === 'partial' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        Acconto Versato Subito (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-gymPrimary transition-colors"
                        required
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={submitting || loadingPlans || plans.length === 0}
                className="px-5 py-2.5 rounded-xl bg-gymPrimary hover:bg-gymPrimaryHover text-sm font-bold text-white transition-all duration-200 hover:shadow-lg hover:shadow-gymPrimary/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Attivazione...' : 'Attiva Abbonamento'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
