import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, Edit2, Trash2, MessageCircle, AlertCircle, FileText, Ticket, Sparkles, XCircle, Clock } from 'lucide-react';
import { getClientStatusFlags, formatDate } from '../utils/dateHelpers';
import ClientModal from '../components/ClientModal';
import PlanAssignmentModal from '../components/PlanAssignmentModal';
import { useAuth } from '../context/AuthContext';

export default function Clienti() {
  const { gym } = useAuth();
  const gymName = gym?.name || 'piupalestre';

  // Gestione dei parametri URL provenienti dai click sui KPI della Dashboard
  const [searchParams, setSearchParams] = useSearchParams();
  const urlStatus = searchParams.get('status') || '';
  const urlFilter = searchParams.get('filter') || '';

  const [clients, setClients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Sincronizziamo lo stato della select con il parametro dell'URL
  const [statusFilter, setStatusFilter] = useState(urlStatus);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtri lato client (applicati sulla lista già caricata, senza refetch)
  const [certFilter, setCertFilter] = useState('');     // '' | valid | expiring | expired
  const [planFilter, setPlanFilter] = useState('');     // '' | none | type:time | type:count | plan:<id>
  const [expiringSoon, setExpiringSoon] = useState(false);
  const [onlyPromo, setOnlyPromo] = useState(false);

  // Listino piani per popolare la tendina "Abbonamento"
  const [plans, setPlans] = useState([]);

  // Controlli del Modale Crea/Modifica
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  // Controlli del Modale di Assegnazione Abbonamento/Promo
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planClient, setPlanClient] = useState(null);

  // Fetch lato server: solo ricerca testuale (q) e stato abbonamento (active/expired).
  // Gli altri filtri sono applicati lato client sulla lista risultante.
  const fetchClients = (q = '', status = '') => {
    setLoading(true);
    let url = '/api/clients';
    const params = [];
    if (q) params.push(`q=${encodeURIComponent(q)}`);
    if (status) params.push(`status=${encodeURIComponent(status)}`);
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Impossibile caricare i dati dei clienti');
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
  };

  // Carichiamo il listino piani una sola volta per la tendina "Abbonamento"
  useEffect(() => {
    fetch('/api/plans')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setPlans(data))
      .catch(() => setPlans([]));
  }, []);

  // Sincronizza ed effettua il fetch ogni volta che cambiano i parametri della URL (es. click consecutivi KPI)
  useEffect(() => {
    setStatusFilter(urlStatus);
    // Mappiamo le scorciatoie dei KPI della Dashboard sui filtri client
    if (urlFilter === 'expiring') setExpiringSoon(true);
    else if (urlFilter === 'expired-med') setCertFilter('expired');
    fetchClients(searchQuery, urlStatus);
  }, [urlStatus, urlFilter]);

  // Handler per la barra di ricerca live
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    fetchClients(value, statusFilter);
  };

  // Reset di tutti i filtri client + stato
  const handleResetFilters = () => {
    setCertFilter('');
    setPlanFilter('');
    setExpiringSoon(false);
    setOnlyPromo(false);
    setStatusFilter('');
    setSearchParams({});
  };

  // Applica i filtri lato client sulla lista già caricata dal server
  const visibleClients = clients.filter((c) => {
    const flags = getClientStatusFlags(c);
    const m = c.active_membership;

    // Certificato medico
    if (certFilter === 'valid' && (flags.isCertificateExpired || flags.isCertificateExpiringSoon)) return false;
    if (certFilter === 'expiring' && !flags.isCertificateExpiringSoon) return false;
    if (certFilter === 'expired' && !flags.isCertificateExpired) return false;

    // Abbonamento / piano
    if (planFilter === 'none' && m) return false;
    if (planFilter === 'type:time' && (!m || m.type !== 'time')) return false;
    if (planFilter === 'type:count' && (!m || m.type !== 'count')) return false;
    if (planFilter.startsWith('plan:')) {
      const pid = Number(planFilter.split(':')[1]);
      if (!m || m.plan_id !== pid) return false;
    }

    // In scadenza entro 7 giorni (o carnet quasi esaurito)
    if (expiringSoon && !flags.isMembershipExpiringSoon) return false;

    // Solo promo
    if (onlyPromo && !(m && m.is_promo)) return false;

    return true;
  });

  const hasActiveFilters =
    certFilter || planFilter || expiringSoon || onlyPromo || statusFilter;

  // Gestore del cambio filtro manuale dalla tendina select
  const handleStatusFilterChange = (e) => {
    const value = e.target.value;
    setStatusFilter(value);

    // Se l'utente usa la tendina manualmente, ripuliamo i filtri avanzati per evitare conflitti logici
    if (value === '') {
      setSearchParams({});
    } else {
      setSearchParams({ status: value });
    }
  };

  // Azioni del Modale
  const handleOpenAddModal = () => {
    setSelectedClient(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (client) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedClient(null);
    setIsModalOpen(false);
  };

  // Apertura/chiusura del modale di assegnazione abbonamento
  const handleOpenPlanModal = (client) => {
    setPlanClient(client);
    setIsPlanModalOpen(true);
  };

  const handleClosePlanModal = () => {
    setPlanClient(null);
    setIsPlanModalOpen(false);
  };

  // Invio del form (Crea o Modifica)
  const handleFormSubmit = (formData) => {
    const isEdit = !!selectedClient;
    const url = isEdit ? `/api/clients/${selectedClient.id}` : '/api/clients';
    const method = isEdit ? 'PUT' : 'POST';

    // Costruiamo un multipart/form-data per supportare l'upload del certificato medico.
    const payload = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'certificate_file') {
        // Alleghiamo il file solo se è un nuovo upload reale (istanza File)
        if (value instanceof File) {
          payload.append('certificate_file', value);
        }
      } else if (value !== null && value !== undefined) {
        payload.append(key, value);
      }
    });

    // Se l'utente ha rimosso un certificato già salvato senza caricarne uno nuovo,
    // segnaliamo al backend di eliminarlo.
    const removedExistingCert =
      isEdit &&
      selectedClient.certificate_file_path &&
      !(formData.certificate_file instanceof File) &&
      formData.certificate_file == null;
    if (removedExistingCert) {
      payload.append('remove_certificate', 'true');
    }

    // Nota: non impostiamo 'Content-Type' manualmente, così il browser
    // genera il boundary corretto per il multipart.
    fetch(url, {
      method,
      body: payload
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((errData) => {
            throw new Error(errData.error || 'Errore nel salvataggio del cliente');
          });
        }
        return res.json();
      })
      .then(() => {
        handleCloseModal();
        if (!isEdit) {
          // Nuovo cliente: azzeriamo i filtri così è sempre visibile (è in cima alla lista)
          setCertFilter('');
          setPlanFilter('');
          setExpiringSoon(false);
          setOnlyPromo(false);
          setStatusFilter('');
          setSearchQuery('');
          setSearchParams({});
          fetchClients('', '');
        } else {
          fetchClients(searchQuery, statusFilter);
        }
      })
      .catch((err) => {
        alert(err.message);
      });
  };

  // Cancellazione anagrafica cliente
  const handleDeleteClient = (id, firstName, lastName) => {
    if (!window.confirm(`Sei sicuro di voler rimuovere definitivamente l'anagrafica di ${firstName} ${lastName}?`)) {
      return;
    }

    fetch(`/api/clients/${id}`, {
      method: 'DELETE'
    })
      .then((res) => {
        if (!res.ok) throw new Error('Errore durante la cancellazione del record');
        return res.json();
      })
      .then(() => {
        fetchClients(searchQuery, statusFilter);
      })
      .catch((err) => {
        alert(err.message);
      });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 font-sans">Gestione Clienti</h1>
          <p className="text-slate-500 mt-1 font-medium">Visualizza, aggiungi e modifica le anagrafiche della palestra.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-gymPrimary hover:bg-gymPrimaryHover text-white rounded-xl font-bold text-sm transition-all duration-200 shadow-md shadow-gymPrimary/10 self-start sm:self-auto active:scale-[0.98] cursor-pointer"
        >
          <Plus className="h-5 w-5" />
          Nuovo Cliente
        </button>
      </div>

      {/* Barre di Ricerca e Filtri */}
      <div className="bg-gymCard border border-slate-200/60 rounded-2xl p-4 space-y-3 shadow-sm font-sans">

        {/* Riga 1: Ricerca testuale */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cerca per nome, cognome, email o telefono..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full bg-white border border-slate-300 rounded-xl pl-11 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-gymPrimary focus:ring-1 focus:ring-gymPrimary transition-colors"
          />
        </div>

        {/* Riga 2: Filtri */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Stato abbonamento */}
          <select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-gymPrimary focus:ring-1 focus:ring-gymPrimary transition-colors cursor-pointer"
          >
            <option value="">Tutti gli stati</option>
            <option value="active">Attivi</option>
            <option value="expired">Scaduti</option>
          </select>

          {/* Certificato medico */}
          <select
            value={certFilter}
            onChange={(e) => setCertFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-gymPrimary focus:ring-1 focus:ring-gymPrimary transition-colors cursor-pointer"
          >
            <option value="">Certificato: tutti</option>
            <option value="valid">Certificato valido</option>
            <option value="expiring">Certificato in scadenza</option>
            <option value="expired">Certificato scaduto</option>
          </select>

          {/* Abbonamento / Piano */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-gymPrimary focus:ring-1 focus:ring-gymPrimary transition-colors cursor-pointer"
          >
            <option value="">Tutti gli abbonamenti</option>
            <option value="none">Senza abbonamento</option>
            <option value="type:time">— Tipo: a tempo</option>
            <option value="type:count">— Tipo: a ingressi</option>
            {plans.map((p) => (
              <option key={p.id} value={`plan:${p.id}`}>{p.name}</option>
            ))}
          </select>

          {/* Toggle: in scadenza 7gg */}
          <button
            type="button"
            onClick={() => setExpiringSoon((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
              expiringSoon
                ? 'bg-amber-50 text-amber-700 border-amber-300'
                : 'bg-white text-slate-500 border-slate-300 hover:border-amber-300'
            }`}
          >
            <AlertCircle className="h-4 w-4" />
            In scadenza (7gg)
          </button>

          {/* Toggle: solo promo */}
          <button
            type="button"
            onClick={() => setOnlyPromo((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
              onlyPromo
                ? 'bg-gymAccent/10 text-gymAccent border-gymAccent/40'
                : 'bg-white text-slate-500 border-slate-300 hover:border-gymAccent/40'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Solo Promo
          </button>

          {/* Reset */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-rose-600 transition-colors cursor-pointer ml-auto"
            >
              <XCircle className="h-4 w-4" />
              Azzera filtri
            </button>
          )}
        </div>
      </div>

      {/* Tabella Principale Clienti */}
      <div className="bg-gymCard border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gymPrimary"></div>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-500 font-medium text-sm">
            Errore caricamento dati: {error}
          </div>
        ) : (
          <div className="overflow-x-auto font-sans">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                  <th className="px-6 py-4">Iscritto</th>
                  <th className="px-6 py-4">Abbonamento</th>
                  <th className="px-6 py-4">Certificato Medico</th>
                  <th className="px-6 py-4">Stato Accesso</th>
                  <th className="px-6 py-4 text-center">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleClients.map((client) => {
                  const {
                    membership,
                    expiryDate,
                    remainingCheckins,
                    isMembershipExpired,
                    isMembershipExpiringSoon,
                    isCertificateExpired,
                    isCertificateExpiringSoon
                  } = getClientStatusFlags(client);

                  // Setup URL precompilato WhatsApp intelligente
                  const cleanPhone = client.phone.replace(/[+\s-()]/g, '');
                  const formattedExpiry = formatDate(expiryDate);
                  const isCountPlan = membership?.type === 'count';

                  // Raccogliamo TUTTE le criticità (certificato + abbonamento) e le combiniamo in un unico messaggio.
                  const issues = [];

                  if (isCertificateExpired) {
                    issues.push(`il tuo certificato medico è scaduto il ${formatDate(client.medical_certificate_expiry)}`);
                  } else if (isCertificateExpiringSoon) {
                    issues.push(`il tuo certificato medico scade il ${formatDate(client.medical_certificate_expiry)}`);
                  }

                  if (!membership) {
                    issues.push('non risulta un abbonamento attivo');
                  } else if (isCountPlan) {
                    if (isMembershipExpired) issues.push(`il tuo carnet "${membership.plan_name}" ha esaurito gli ingressi`);
                    else if (isMembershipExpiringSoon) issues.push(`sul tuo carnet "${membership.plan_name}" restano solo ${remainingCheckins} ingressi`);
                  } else {
                    if (isMembershipExpired) issues.push(`il tuo abbonamento è scaduto il ${formattedExpiry}`);
                    else if (isMembershipExpiringSoon) issues.push(`il tuo abbonamento scade il ${formattedExpiry}`);
                  }

                  let messageText;
                  if (issues.length === 0) {
                    messageText = `Ciao ${client.first_name}, ti aspettiamo in palestra! - ${gymName}`;
                  } else if (issues.length === 1) {
                    messageText = `Ciao ${client.first_name}, ti ricordiamo che ${issues[0]}. Ti aspettiamo in reception per regolarizzare la tua posizione! - ${gymName}`;
                  } else {
                    messageText = `Ciao ${client.first_name}, ti ricordiamo che ${issues[0]} e che ${issues[1]}. Ti aspettiamo in reception per regolarizzare entrambe le posizioni! - ${gymName}`;
                  }

                  const waText = encodeURIComponent(messageText);
                  const waUrl = `https://wa.me/${cleanPhone}?text=${waText}`;

                  return (
                    <tr key={client.id} className="group hover:bg-slate-50 transition-colors">
                      {/* Dettagli Anagrafici */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-sm text-slate-800">
                          {client.first_name} {client.last_name}
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{client.email}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{client.phone}</div>
                      </td>

                      {/* Abbonamento attivo (piano + scadenza/ingressi) */}
                      <td className="px-6 py-4">
                        {membership ? (
                          <>
                            <span className="text-sm font-semibold text-slate-700">
                              {membership.plan_name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-1 text-xs">
                              {isCountPlan ? (
                                <>
                                  <span className="text-slate-400 font-medium">Ingressi:</span>
                                  <span className={`font-mono font-bold ${isMembershipExpired
                                      ? 'text-rose-600'
                                      : isMembershipExpiringSoon
                                        ? 'text-amber-600'
                                        : 'text-slate-600'
                                    }`}>
                                    {remainingCheckins} rimasti
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="text-slate-400 font-medium">Scadenza:</span>
                                  <span className={`font-mono font-bold ${isMembershipExpired
                                      ? 'text-rose-600'
                                      : isMembershipExpiringSoon
                                        ? 'text-amber-600'
                                        : 'text-slate-600'
                                    }`}>
                                    {formattedExpiry}
                                  </span>
                                </>
                              )}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Nessun abbonamento</span>
                        )}
                      </td>

                      {/* Certificato Medico */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-700 font-mono">
                            {formatDate(client.medical_certificate_expiry)}
                          </span>
                          {client.certificate_file_path && (
                            <a
                              href={client.certificate_file_path}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Apri certificato caricato"
                              className="p-1.5 bg-gymPrimaryLight hover:bg-gymPrimaryLight text-gymPrimary hover:text-gymPrimaryHover rounded-lg transition-all duration-200 border border-gymPrimary/20"
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                        {!(client.medical_certificate_expiry || client.certificate_file_path) ? (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-slate-500">
                            <Clock className="h-3 w-3" />
                            Certificato in attesa
                          </span>
                        ) : isCertificateExpired ? (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-rose-600">
                            <AlertCircle className="h-3 w-3" />
                            Certificato Scaduto
                          </span>
                        ) : isCertificateExpiringSoon ? (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-amber-600">
                            <AlertCircle className="h-3 w-3" />
                            Scade a breve
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">In regola</span>
                        )}
                      </td>

                      {/* Stato di accesso reale: abbonamento valido E certificato valido (come al check-in) */}
                      <td className="px-6 py-4">
                        {(() => {
                          const canAccess = !isMembershipExpired && !isCertificateExpired;
                          let blockReason = '';
                          if (isCertificateExpired) blockReason = 'Certificato scaduto';
                          else if (!membership) blockReason = 'Senza abbonamento';
                          else if (isMembershipExpired) blockReason = isCountPlan ? 'Ingressi esauriti' : 'Abbonamento scaduto';

                          return (
                            <>
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${canAccess
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50'
                                  : 'bg-rose-50 text-rose-700 border-rose-200/50'
                                }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${canAccess ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                {canAccess ? 'Attivo' : 'Bloccato'}
                              </span>
                              {!canAccess && (
                                <div className="text-[10px] text-slate-400 mt-1">{blockReason}</div>
                              )}
                            </>
                          );
                        })()}
                      </td>

                      {/* Pulsanti d'Azione */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 min-w-[120px]">

                          {/* Assegna Abbonamento / Promo */}
                          <button
                            onClick={() => handleOpenPlanModal(client)}
                            className="flex items-center gap-2 px-2.5 py-1.5 bg-gymPrimaryLight hover:bg-gymPrimaryLight text-gymPrimary hover:text-gymPrimaryHover rounded-lg transition-all duration-200 border border-gymPrimary/20 cursor-pointer text-xs font-bold w-full"
                          >
                            <Ticket className="h-3.5 w-3.5 shrink-0" />
                            Abbonamenti
                          </button>

                          {/* WhatsApp Link */}
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-600 hover:text-emerald-700 rounded-lg transition-all duration-200 border border-emerald-100 text-xs font-bold w-full"
                          >
                            <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                            WhatsApp
                          </a>

                          <div className="flex items-center gap-1.5 w-full">
                            {/* Modifica */}
                            <button
                              onClick={() => handleOpenEditModal(client)}
                              title="Modifica Anagrafica"
                              className="flex-1 flex items-center justify-center py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 rounded-lg transition-all duration-200 border border-slate-200 cursor-pointer"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>

                            {/* Elimina */}
                            <button
                              onClick={() => handleDeleteClient(client.id, client.first_name, client.last_name)}
                              title="Rimuovi Iscritto"
                              className="flex-1 flex items-center justify-center py-1.5 bg-rose-50 hover:bg-rose-100/80 text-rose-600 hover:text-rose-700 rounded-lg transition-all duration-200 border border-rose-100 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {visibleClients.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-12 text-sm text-slate-500">
                      Nessun cliente trovato con i filtri selezionati.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modale di Input (Crea/Modifica) */}
      <ClientModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleFormSubmit}
        client={selectedClient}
      />

      {/* Modale di Assegnazione Abbonamento / Promo */}
      {planClient && (
        <PlanAssignmentModal
          isOpen={isPlanModalOpen}
          onClose={handleClosePlanModal}
          onSuccess={() => fetchClients(searchQuery, statusFilter)}
          client={planClient}
        />
      )}

    </div>
  );
}