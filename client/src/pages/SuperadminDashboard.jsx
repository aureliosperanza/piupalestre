import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  UserCheck, 
  MessageSquare, 
  Plus, 
  UserPlus, 
  Lock, 
  Unlock, 
  Mail, 
  Phone, 
  MapPin, 
  ShieldAlert, 
  Loader2, 
  CheckCircle, 
  Archive, 
  FileText,
  LogOut 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SuperadminDashboard() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('panoramica');
  const [leads, setLeads] = useState([]);
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Create Gym Modal Controls
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGymData, setNewGymData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [modalLoading, setModalLoading] = useState(false);

  // Fetch all administrative data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [leadsRes, gymsRes] = await Promise.all([
        fetch('/api/admin/leads'),
        fetch('/api/admin/gyms')
      ]);

      if (!leadsRes.ok || !gymsRes.ok) {
        throw new Error('Errore durante il recupero dei dati SaaS');
      }

      const leadsData = await leadsRes.json();
      const gymsData = await gymsRes.json();

      setLeads(leadsData);
      setGyms(gymsData);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update Lead Status
  const handleUpdateLeadStatus = async (leadId, newStatus) => {
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Errore durante l\'aggiornamento del lead');
      }

      // Refresh list
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Toggle Gym Status (Suspend / Activate)
  const handleToggleGymStatus = async (gymId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const actionWord = nextStatus === 'suspended' ? 'sospendere' : 'riattivare';
    
    if (!window.confirm(`Sei sicuro di voler ${actionWord} l'accesso per questa palestra?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/gyms/${gymId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: nextStatus })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Impossibile cambiare lo stato della palestra');
      }

      // Refresh list
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Handle Gym Creation Form Submission
  const handleCreateGymSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    try {
      const res = await fetch('/api/admin/gyms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newGymData)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Errore durante la creazione della palestra');
      }

      // Reset & Close
      setNewGymData({ name: '', email: '', password: '' });
      setIsModalOpen(false);
      fetchData();
      alert('Nuova palestra registrata con successo!');
    } catch (err) {
      alert(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // Calculate SaaS Metrics
  const activeGyms = gyms.filter(g => g.status === 'active' && !g.is_admin).length;
  const suspendedGyms = gyms.filter(g => g.status === 'suspended').length;
  const totalLeads = leads.length;
  const newLeads = leads.filter(l => l.status === 'new').length;
  const saasClientsCount = gyms.reduce((acc, g) => acc + parseInt(g.client_count || 0), 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="h-10 w-10 text-gymPrimary animate-spin" />
        <span className="text-sm text-slate-500 font-medium">Caricamento console superadmin...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl text-center max-w-xl mx-auto my-12">
        <ShieldAlert className="h-10 w-10 mx-auto mb-4 text-rose-500" />
        <h3 className="text-lg font-bold">Errore di Caricamento</h3>
        <p className="text-sm mt-1">{error}</p>
        <button 
          onClick={fetchData} 
          className="mt-4 px-4 py-2 bg-gymPrimary text-white rounded-xl text-xs font-bold hover:bg-gymPrimaryHover transition-colors"
        >
          Riprova
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2.5">
            Console SaaS Superadmin
          </h1>
          <p className="text-slate-500 mt-1">Gestisci la piattaforma, monitora le palestre e contatta i nuovi lead.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-gymPrimary hover:bg-gymPrimaryHover text-white rounded-xl font-bold text-sm transition-all duration-200 hover:shadow-lg hover:shadow-gymPrimary/25 active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-5 w-5" />
            Nuova Palestra
          </button>
          <button
            onClick={logout}
            title="Esci"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-red-600 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer"
          >
            <LogOut className="h-5 w-5" />
            Esci
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-1">
        {[
          { id: 'panoramica', label: 'Panoramica' },
          { id: 'leads', label: `Richieste (${newLeads})` },
          { id: 'gyms', label: `Gestione Palestre (${gyms.filter(g => !g.is_admin).length})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3.5 text-sm font-bold border-b-2 transition-all duration-250 cursor-pointer ${
              activeTab === tab.id 
                ? 'border-gymPrimary text-gymPrimary bg-gymPrimaryLight/50' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: PANORAMICA */}
      {activeTab === 'panoramica' && (
        <div className="space-y-6">
          {/* KPI Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            
            {/* KPI 1 */}
            <div className="bg-gymCard border border-slate-100 p-5 rounded-2xl shadow-sm text-slate-850">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] uppercase font-bold tracking-wider">Palestre Attive</span>
                <Building2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="text-3xl font-black text-slate-800 mt-2">{activeGyms}</div>
              <p className="text-[10px] text-slate-500 mt-1">Tenant operativi nel sistema</p>
            </div>

            {/* KPI 2 */}
            <div className="bg-gymCard border border-slate-100 p-5 rounded-2xl shadow-sm text-slate-850">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] uppercase font-bold tracking-wider">Richieste Pendenti</span>
                <UserCheck className="h-5 w-5 text-gymPrimary" />
              </div>
              <div className="text-3xl font-black text-slate-800 mt-2">{newLeads}</div>
              <p className="text-[10px] text-slate-500 mt-1">Lead in attesa di contatto</p>
            </div>

            {/* KPI 3 */}
            <div className="bg-gymCard border border-slate-100 p-5 rounded-2xl shadow-sm text-slate-850">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] uppercase font-bold tracking-wider">Clienti Totali SaaS</span>
                <Users className="h-5 w-5 text-gymPrimary" />
              </div>
              <div className="text-3xl font-black text-slate-800 mt-2">{saasClientsCount}</div>
              <p className="text-[10px] text-slate-500 mt-1">Atleti registrati globalmente</p>
            </div>

            {/* KPI 4 */}
            <div className="bg-gymCard border border-slate-100 p-5 rounded-2xl shadow-sm text-slate-850">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] uppercase font-bold tracking-wider">Sospese / Disattivate</span>
                <ShieldAlert className="h-5 w-5 text-rose-500" />
              </div>
              <div className="text-3xl font-black text-slate-800 mt-2">{suspendedGyms}</div>
              <p className="text-[10px] text-slate-500 mt-1">Accessi temporaneamente bloccati</p>
            </div>

          </div>

          {/* Quick List (Leads & Gyms Overview) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Last 5 Leads */}
            <div className="bg-gymCard border border-slate-100 rounded-2xl p-5 shadow-sm text-slate-850">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-sm text-slate-800">Ultimi Lead Landing Page</h3>
                <button 
                  onClick={() => setActiveTab('leads')} 
                  className="text-xs text-gymPrimary hover:underline cursor-pointer"
                >
                  Vedi tutti
                </button>
              </div>
              <div className="space-y-3">
                {leads.slice(0, 5).map((lead) => (
                  <div key={lead.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/50 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-xs text-slate-800">{lead.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{lead.gym_name} — {lead.city}</div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                      lead.status === 'new' 
                        ? 'bg-gymPrimaryLight text-gymPrimary border-gymPrimary/20/50' 
                        : lead.status === 'contacted'
                        ? 'bg-gymPrimaryLight text-gymPrimary border-gymPrimary/20/50'
                        : lead.status === 'converted'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50'
                        : 'bg-slate-100 text-slate-500 border-slate-200/50'
                    }`}>
                      {lead.status === 'new' && 'Nuovo'}
                      {lead.status === 'contacted' && 'Contattato'}
                      {lead.status === 'converted' && 'Convertito'}
                      {lead.status === 'archived' && 'Archiviato'}
                    </span>
                  </div>
                ))}
                {leads.length === 0 && (
                  <p className="text-center py-6 text-xs text-slate-500">Nessuna richiesta lead registrata.</p>
                )}
              </div>
            </div>

            {/* Top performing Gyms (based on clients) */}
            <div className="bg-gymCard border border-slate-100 rounded-2xl p-5 shadow-sm text-slate-850">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-sm text-slate-800">Classifica Palestre (per Iscritti)</h3>
                <button 
                  onClick={() => setActiveTab('gyms')} 
                  className="text-xs text-gymPrimary hover:underline cursor-pointer"
                >
                  Vedi tutte
                </button>
              </div>
              <div className="space-y-3">
                {gyms.filter(g => !g.is_admin).slice(0, 5).map((gym) => (
                  <div key={gym.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/50 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-xs text-slate-800">{gym.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{gym.email}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-xs text-slate-700">{gym.client_count}</span>
                      <span className="text-[9px] text-slate-500 block">iscritti</span>
                    </div>
                  </div>
                ))}
                {gyms.filter(g => !g.is_admin).length === 0 && (
                  <p className="text-center py-6 text-xs text-slate-500">Nessuna palestra registrata.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB: RICHIESTE (LEADS) */}
      {activeTab === 'leads' && (
        <div className="bg-gymCard border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50">
                  <th className="px-6 py-4">Richiedente</th>
                  <th className="px-6 py-4">Palestra & Città</th>
                  <th className="px-6 py-4">Dettagli Contatto</th>
                  <th className="px-6 py-4">Stato</th>
                  <th className="px-6 py-4 text-center">Azioni di Gestione</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {leads.map((lead) => (
                  <tr key={lead.id} className="group hover:bg-slate-55/40 transition-colors">
                    
                    {/* Richiedente */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-sm text-slate-850">{lead.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Ricevuto il: {new Date(lead.created_at).toLocaleDateString('it-IT')}
                      </div>
                    </td>

                    {/* Palestra */}
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        {lead.gym_name}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {lead.city}
                      </div>
                    </td>

                    {/* Contatti */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-700 flex items-center gap-1.5 font-mono">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        {lead.email}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        {lead.phone}
                      </div>
                    </td>

                    {/* Stato */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                        lead.status === 'new' 
                          ? 'bg-gymPrimaryLight text-gymPrimary border-gymPrimary/20/50' 
                          : lead.status === 'contacted'
                          ? 'bg-gymPrimaryLight text-gymPrimary border-gymPrimary/20/50'
                          : lead.status === 'converted'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50'
                          : 'bg-slate-100 text-slate-500 border-slate-200/50'
                      }`}>
                        {lead.status === 'new' && 'Nuovo'}
                        {lead.status === 'contacted' && 'Contattato'}
                        {lead.status === 'converted' && 'Convertito'}
                        {lead.status === 'archived' && 'Archiviato'}
                      </span>
                    </td>

                    {/* Azioni */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {lead.status === 'new' && (
                          <button
                            onClick={() => handleUpdateLeadStatus(lead.id, 'contacted')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-gymPrimaryLight hover:bg-gymPrimaryLight text-gymPrimary rounded-lg text-xs font-bold border border-gymPrimary/20/60 transition-all cursor-pointer"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            Segna Contattato
                          </button>
                        )}
                        {lead.status === 'contacted' && (
                          <button
                            onClick={() => handleUpdateLeadStatus(lead.id, 'converted')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200/60 transition-all cursor-pointer"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Convertito (SaaS)
                          </button>
                        )}
                        {lead.status !== 'archived' && (
                          <button
                            onClick={() => handleUpdateLeadStatus(lead.id, 'archived')}
                            title="Archivia"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-lg border border-slate-200 transition-all cursor-pointer"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                ))}
                {leads.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-12 text-sm text-slate-500">
                      Nessuna richiesta lead registrata in archivio.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: GESTIONE PALESTRE */}
      {activeTab === 'gyms' && (
        <div className="bg-gymCard border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50">
                  <th className="px-6 py-4">Palestra</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Iscritti Totali</th>
                  <th className="px-6 py-4">Stato Accesso</th>
                  <th className="px-6 py-4 text-center">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {gyms.filter(g => !g.is_admin).map((gym) => (
                  <tr key={gym.id} className="group hover:bg-slate-55/40 transition-colors">
                    
                    {/* Nome & Data iscrizione */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-sm text-slate-850">{gym.name}</div>
                      <div className="text-xs font-mono text-slate-500 mt-0.5">/{gym.slug}</div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Registrata il: {new Date(gym.created_at).toLocaleDateString('it-IT')}
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-slate-600">{gym.email}</span>
                    </td>

                    {/* Client Count */}
                    <td className="px-6 py-4">
                      <span className="text-sm font-extrabold text-slate-800">{gym.client_count}</span>
                    </td>

                    {/* Status Accesso */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                        gym.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50'
                          : 'bg-rose-50 text-rose-700 border-rose-200/50'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${gym.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                        {gym.status === 'active' ? 'Attivo' : 'Sospeso'}
                      </span>
                    </td>

                    {/* Azioni */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {gym.status === 'active' ? (
                          <button
                            onClick={() => handleToggleGymStatus(gym.id, gym.status)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold border border-rose-200/50 transition-all cursor-pointer"
                          >
                            <Lock className="h-3.5 w-3.5" />
                            Sospendi
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleGymStatus(gym.id, gym.status)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200/50 transition-all cursor-pointer"
                          >
                            <Unlock className="h-3.5 w-3.5" />
                            Riattiva
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                ))}
                {gyms.filter(g => !g.is_admin).length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-12 text-sm text-slate-500">
                      Nessuna palestra registrata nella piattaforma SaaS.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: CREA NUOVA PALESTRA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gymCard border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-gymPrimary/35 to-transparent"></div>
            
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-extrabold text-lg text-slate-800">Nuova Palestra</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-slate-800 text-sm font-semibold transition-colors cursor-pointer"
              >
                Chiudi
              </button>
            </div>

            <form onSubmit={handleCreateGymSubmit} className="p-6 space-y-4">
              
              {/* Gym Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Nome Palestra</label>
                <input
                  type="text"
                  required
                  placeholder="es. Elite Fitness Box"
                  value={newGymData.name}
                  onChange={(e) => setNewGymData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-white text-slate-800 border border-slate-300 rounded-xl px-4 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:border-gymPrimary focus:ring-1 focus:ring-gymPrimary transition-colors"
                />
              </div>

              {/* Gym Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Indirizzo Email</label>
                <input
                  type="email"
                  required
                  placeholder="es. info@elitefitness.it"
                  value={newGymData.email}
                  onChange={(e) => setNewGymData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-white text-slate-800 border border-slate-300 rounded-xl px-4 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:border-gymPrimary focus:ring-1 focus:ring-gymPrimary transition-colors"
                />
              </div>

              {/* Temporary Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Password Temporanea</label>
                <input
                  type="password"
                  required
                  placeholder="Minimo 6 caratteri"
                  value={newGymData.password}
                  onChange={(e) => setNewGymData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full bg-white text-slate-800 border border-slate-300 rounded-xl px-4 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:border-gymPrimary focus:ring-1 focus:ring-gymPrimary transition-colors"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex-1 py-3 bg-gymPrimary hover:bg-gymPrimaryHover text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-gymPrimary/10 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {modalLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Crea account
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
