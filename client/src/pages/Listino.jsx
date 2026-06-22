import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Clock, Hash, Sparkles, Tag } from 'lucide-react';
import PlanModal from '../components/PlanModal';

export default function Listino() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const fetchPlans = () => {
    setLoading(true);
    fetch('/api/plans')
      .then((res) => {
        if (!res.ok) throw new Error('Impossibile caricare il listino abbonamenti');
        return res.json();
      })
      .then((data) => {
        setPlans(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleOpenAdd = () => {
    setSelectedPlan(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plan) => {
    setSelectedPlan(plan);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setSelectedPlan(null);
    setIsModalOpen(false);
  };

  const handleSubmit = (payload) => {
    const isEdit = !!selectedPlan;
    const url = isEdit ? `/api/plans/${selectedPlan.id}` : '/api/plans';
    const method = isEdit ? 'PUT' : 'POST';

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((d) => {
            throw new Error(d.error || 'Errore nel salvataggio del piano');
          });
        }
        return res.json();
      })
      .then(() => {
        handleClose();
        fetchPlans();
      })
      .catch((err) => alert(err.message));
  };

  const handleDelete = (plan) => {
    if (!window.confirm(`Eliminare definitivamente il piano "${plan.name}"?`)) return;

    fetch(`/api/plans/${plan.id}`, { method: 'DELETE' })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((d) => {
            throw new Error(d.error || 'Errore durante la cancellazione');
          });
        }
        return res.json();
      })
      .then(() => fetchPlans())
      .catch((err) => alert(err.message));
  };

  const formatPrice = (p) => `€ ${Number(p).toFixed(2)}`;

  const filteredPlans = plans.filter((plan) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'promo') return plan.is_promo;
    if (activeTab === 'time') return plan.type === 'time' && !plan.is_promo;
    if (activeTab === 'count') return plan.type === 'count' && !plan.is_promo;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 font-sans">Abbonamenti</h1>
          <p className="text-slate-500 mt-1 font-medium">Configura i piani della tua palestra, modificali e crea promozioni.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-gymPrimary hover:bg-gymPrimaryHover text-white rounded-xl font-bold text-sm transition-all duration-200 shadow-md shadow-gymPrimary/10 self-start sm:self-auto active:scale-[0.98] cursor-pointer"
        >
          <Plus className="h-5 w-5" />
          Nuovo Abbonamento
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
        {[
          { id: 'all', label: 'Tutti i Piani' },
          { id: 'time', label: 'Abbonamenti (a tempo)' },
          { id: 'count', label: 'Carnet (a ingressi)' },
          { id: 'promo', label: 'Promozioni' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gymPrimary"></div>
        </div>
      ) : error ? (
        <div className="p-6 text-center text-red-500 font-medium text-sm bg-gymCard rounded-2xl border border-slate-200/60">
          {error}
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-gymCard border border-dashed border-slate-300 rounded-2xl p-12 text-center">
          <Tag className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Nessun abbonamento configurato. Crea il tuo primo piano!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredPlans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-gymCard border rounded-2xl p-5 shadow-sm transition-all duration-200 hover:shadow-md ${
                plan.is_promo ? 'border-gymAccent/40 ring-1 ring-gymAccent/20' : 'border-slate-200/60'
              }`}
            >
              {/* Promo badge */}
              {Boolean(plan.is_promo) && (
                <span className="absolute -top-2.5 right-4 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gymAccent text-white shadow-sm">
                  <Sparkles size={11} /> PROMO
                </span>
              )}

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                    plan.type === 'time' ? 'bg-blue-50 text-blue-600' : 'bg-violet-50 text-violet-600'
                  }`}>
                    {plan.type === 'time' ? <Clock className="h-5 w-5" /> : <Hash className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm leading-tight">{plan.name}</h3>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {plan.type === 'time' ? 'Abbonamento a tempo' : 'Carnet a ingressi'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-2xl font-black text-slate-800 font-mono">{formatPrice(plan.price)}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {plan.type === 'time'
                      ? `${plan.duration_months} mese/i di validità`
                      : `${plan.max_checkins} ingressi totali`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(plan)}
                    title="Modifica"
                    className="p-2 bg-gymPrimaryLight hover:bg-gymPrimaryLight text-gymPrimary hover:text-gymPrimaryHover rounded-xl transition-all duration-200 border border-gymPrimary/20 cursor-pointer"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(plan)}
                    title="Elimina"
                    className="p-2 bg-red-50 hover:bg-red-100/80 text-red-600 hover:text-red-700 rounded-xl transition-all duration-200 border border-red-100 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredPlans.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 font-medium text-sm">
              Nessun abbonamento in questa categoria.
            </div>
          )}
        </div>
      )}

      {/* Modale Crea/Modifica */}
      <PlanModal
        isOpen={isModalOpen}
        onClose={handleClose}
        onSubmit={handleSubmit}
        plan={selectedPlan}
      />
    </div>
  );
}
