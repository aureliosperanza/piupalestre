import React, { useState, useEffect } from 'react';
import { CreditCard, Search, CheckCircle, AlertCircle, Clock, DollarSign, X } from 'lucide-react';

export default function Vendite() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  
  // Modal state
  const [selectedSale, setSelectedSale] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = () => {
    setLoading(true);
    fetch('/api/sales')
      .then(res => res.json())
      .then(data => {
        setSales(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  const handleOpenPayment = (sale) => {
    setSelectedSale(sale);
    const remaining = Number(sale.assigned_price) - Number(sale.paid_amount);
    setPayAmount(remaining > 0 ? remaining.toFixed(2) : '');
  };

  const submitPayment = (e) => {
    e.preventDefault();
    if (!selectedSale || !payAmount) return;

    setSubmitting(true);
    fetch(`/api/sales/${selectedSale.id}/pay`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Number(payAmount) })
    })
      .then(res => res.json())
      .then(() => {
        setSubmitting(false);
        setSelectedSale(null);
        fetchSales();
      })
      .catch(err => {
        console.error(err);
        setSubmitting(false);
      });
  };

  const formatPrice = (p) => `€ ${Number(p).toFixed(2)}`;

  const filteredSales = sales.filter(s => 
    `${s.first_name} ${s.last_name} ${s.plan_name}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-gymPrimary" />
            Contabilità e Vendite
          </h1>
          <p className="text-slate-500 font-medium mt-1">Gestisci gli incassi e recupera i crediti insoluti</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cerca per cliente o piano..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gymPrimary/20 focus:border-gymPrimary transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 font-medium">Caricamento vendite...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Data</th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Cliente</th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Abbonamento</th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest text-right">Prezzo</th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest text-right">Incassato</th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest text-center">Stato</th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest text-center">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSales.map((sale) => {
                  const isPaid = sale.payment_status === 'paid';
                  const isPartial = sale.payment_status === 'partial';
                  const isUnpaid = sale.payment_status === 'unpaid';
                  const remaining = Number(sale.assigned_price) - Number(sale.paid_amount);

                  return (
                    <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-slate-600">
                          {new Date(sale.created_at).toLocaleDateString('it-IT')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-slate-800">{sale.first_name} {sale.last_name}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                          {sale.plan_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <span className="text-sm font-bold text-slate-800">{formatPrice(sale.assigned_price)}</span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <span className={`text-sm font-bold ${isPaid ? 'text-emerald-600' : 'text-slate-800'}`}>
                          {formatPrice(sale.paid_amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                          isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                          isPartial ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                          'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {isPaid ? <CheckCircle className="h-3.5 w-3.5" /> : 
                           isPartial ? <Clock className="h-3.5 w-3.5" /> : 
                           <AlertCircle className="h-3.5 w-3.5" />}
                          {isPaid ? 'Pagato' : isPartial ? 'Acconto' : 'Insoluto'}
                        </span>
                        {!isPaid && (
                          <div className="text-[10px] text-slate-500 font-medium mt-1">
                            Restano {formatPrice(remaining)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {!isPaid ? (
                          <button
                            onClick={() => handleOpenPayment(sale)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gymPrimaryLight hover:bg-gymPrimary text-gymPrimary hover:text-white rounded-lg transition-colors text-xs font-bold"
                          >
                            <DollarSign className="h-3.5 w-3.5" />
                            Incassa
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {filteredSales.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500 font-medium">
                      Nessuna vendita trovata.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modale Incasso */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-gymCard border border-slate-200 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-gymPrimary" /> Registra Incasso
              </h2>
              <button onClick={() => setSelectedSale(null)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={submitPayment}>
              <div className="p-6 space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Da saldare</p>
                  <p className="text-2xl font-black text-amber-800 mt-1">
                    {formatPrice(Number(selectedSale.assigned_price) - Number(selectedSale.paid_amount))}
                  </p>
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Importo versato ora (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-lg font-bold text-slate-800 focus:outline-none focus:border-gymPrimary transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
                <button type="button" onClick={() => setSelectedSale(null)} className="px-4 py-2 font-semibold text-slate-500 hover:text-slate-800">
                  Annulla
                </button>
                <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-gymPrimary hover:bg-gymPrimaryHover text-white font-bold rounded-xl shadow-lg shadow-gymPrimary/25 transition-all">
                  {submitting ? 'Registrazione...' : 'Conferma Incasso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
