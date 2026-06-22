import React, { useState, useEffect } from 'react';
import { Check, X, Eye, ShieldAlert } from 'lucide-react';
import { formatDate } from '../utils/dateHelpers';

export default function Approvazioni() {
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState(null);
  const [newExpiry, setNewExpiry] = useState('');

  const loadPending = () => {
    setLoading(true);
    fetch('/api/certificates/pending')
      .then(res => res.json())
      .then(data => {
        setCerts(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleApprove = (e) => {
    e.preventDefault();
    if (!newExpiry) return alert('Inserisci la data di scadenza');
    
    fetch(`/api/certificates/${selectedCert.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiry_date: newExpiry })
    }).then(res => res.json()).then(d => {
      if (d.success) {
        setSelectedCert(null);
        setNewExpiry('');
        loadPending();
      } else {
        alert(d.error);
      }
    });
  };

  const handleReject = () => {
    const reason = prompt("Motivo del rifiuto (es. foto illeggibile):");
    if (reason === null) return;
    
    fetch(`/api/certificates/${selectedCert.id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    }).then(res => res.json()).then(d => {
      if (d.success) {
        setSelectedCert(null);
        loadPending();
      } else {
        alert(d.error);
      }
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Approvazioni</h1>
          <p className="text-slate-500">Gestisci i certificati medici caricati dagli iscritti.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gymPrimary"></div></div>
      ) : certs.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
          <ShieldAlert className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          Nessun certificato in coda di approvazione.
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Iscritto</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Data Caricamento</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Azione</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {certs.map(cert => (
                <tr key={cert.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold text-slate-800">{cert.first_name} {cert.last_name}</div>
                    <div className="text-sm text-slate-500">{cert.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {formatDate(cert.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => setSelectedCert(cert)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gymPrimary/10 text-gymPrimary hover:bg-gymPrimary hover:text-white font-semibold rounded-xl transition-colors text-sm cursor-pointer"
                    >
                      <Eye className="h-4 w-4" />
                      Esamina
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal / Overlay per esaminare */}
      {selectedCert && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden">
            {/* Foto del documento */}
            <div className="md:w-2/3 bg-slate-100 flex items-center justify-center p-4 overflow-auto border-b md:border-b-0 md:border-r border-slate-200 min-h-[300px]">
              {selectedCert.file_path.toLowerCase().endsWith('.pdf') ? (
                <iframe src={selectedCert.file_path} className="w-full h-full min-h-[500px]" />
              ) : (
                <img src={selectedCert.file_path} alt="Certificato" className="max-w-full max-h-full object-contain shadow-lg rounded" />
              )}
            </div>
            
            {/* Pannello azioni */}
            <div className="md:w-1/3 flex flex-col bg-white p-6 md:p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{selectedCert.first_name} {selectedCert.last_name}</h3>
                  <p className="text-sm text-slate-500">In attesa di approvazione</p>
                </div>
                <button onClick={() => setSelectedCert(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-1">
                <form onSubmit={handleApprove} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Data di scadenza letta dal documento</label>
                    <input 
                      type="date" 
                      required
                      value={newExpiry}
                      onChange={e => setNewExpiry(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gymPrimary focus:border-gymPrimary transition-all"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      Leggi la data dal certificato a fianco e inseriscila qui per approvare.
                    </p>
                  </div>

                  <button type="submit" className="w-full mt-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer">
                    <Check className="h-5 w-5" />
                    Approva e Salva
                  </button>
                </form>

                <div className="mt-8 pt-8 border-t border-slate-100">
                  <p className="text-sm text-slate-500 mb-3">Se la foto è illeggibile o il documento non è valido:</p>
                  <button onClick={handleReject} className="w-full py-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold rounded-xl transition-colors cursor-pointer">
                    Rifiuta Documento
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
