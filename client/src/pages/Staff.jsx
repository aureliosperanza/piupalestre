import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Lock, Unlock, ShieldAlert, Key } from 'lucide-react';
import PasswordInput from '../components/PasswordInput';
import { useAuth } from '../context/AuthContext';

export default function Staff() {
  const { gym } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [formData, setFormData] = useState({
    id: null,
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'reception',
    status: 'active'
  });

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/staff', {
        headers: { Authorization: `Bearer ${localStorage.getItem('gym_token')}` }
      });
      if (!res.ok) throw new Error('Errore nel recupero dello staff');
      const data = await res.json();
      setStaff(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleOpenCreate = () => {
    setModalMode('create');
    setFormData({
      id: null,
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      role: 'reception',
      status: 'active'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (member) => {
    setModalMode('edit');
    setFormData({
      id: member.id,
      first_name: member.first_name,
      last_name: member.last_name,
      email: member.email,
      password: '', // Non mostriamo la password attuale, se compilata aggiorna
      role: member.role,
      status: member.status
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = modalMode === 'create' ? '/api/staff' : `/api/staff/${formData.id}`;
      const method = modalMode === 'create' ? 'POST' : 'PUT';
      
      const payload = { ...formData };
      if (modalMode === 'edit' && !payload.password) {
        delete payload.password; // Non inviare la password se non è stata modificata
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('gym_token')}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Operazione fallita');
      }

      setIsModalOpen(false);
      fetchStaff();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo account staff? Questa azione è irreversibile.')) return;
    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('gym_token')}` }
      });
      if (!res.ok) throw new Error('Errore durante l\'eliminazione');
      fetchStaff();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('gym_token')}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      if (!res.ok) throw new Error('Errore durante l\'aggiornamento dello stato');
      fetchStaff();
    } catch (err) {
      alert(err.message);
    }
  };

  const getRoleBadge = (role) => {
    switch(role) {
      case 'admin': return <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-md">Admin</span>;
      case 'trainer': return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-md">Trainer</span>;
      case 'reception': return <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-md">Reception</span>;
      default: return <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-md">{role}</span>;
    }
  };

  const userRole = gym?.role || 'owner';

  // Se l'utente non è admin o owner, mostra blocco
  if (userRole !== 'owner' && userRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <ShieldAlert className="h-16 w-16 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Accesso Negato</h2>
        <p className="text-slate-500 mt-2">Non hai i permessi per accedere alla Gestione Team.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Gestione Team</h1>
          <p className="text-sm text-slate-500 mt-1">Crea account secondari per trainer, receptionist o amministratori.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gymPrimary text-white rounded-xl font-bold text-sm hover:bg-gymPrimaryHover transition-colors cursor-pointer"
        >
          <Plus className="h-5 w-5" /> Nuovo Collaboratore
        </button>
      </div>

      {/* List */}
      <div className="bg-gymCard border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Caricamento in corso...</div>
        ) : error ? (
          <div className="p-12 text-center text-rose-600">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-widest text-slate-500">
                  <th className="px-6 py-4">Collaboratore</th>
                  <th className="px-6 py-4">Ruolo</th>
                  <th className="px-6 py-4">Stato Accesso</th>
                  <th className="px-6 py-4 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Visualizziamo anche l'Owner in cima, per completezza */}
                <tr className="bg-emerald-50/50">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">Proprietario Palestra</div>
                    <div className="text-xs text-slate-500">{gym.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-md">Owner</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-emerald-600 text-xs font-bold flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Master Account
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-xs text-slate-400">Non modificabile</td>
                </tr>

                {staff.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{member.first_name} {member.last_name}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{member.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      {getRoleBadge(member.role)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                        member.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {member.status === 'active' ? 'Attivo' : 'Sospeso'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleStatus(member.id, member.status)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded-md transition-colors"
                          title={member.status === 'active' ? 'Sospendi Accesso' : 'Riattiva Accesso'}
                        >
                          {member.status === 'active' ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleOpenEdit(member)}
                          className="p-1.5 text-slate-400 hover:text-gymPrimary hover:bg-gymPrimaryLight rounded-md transition-colors"
                          title="Modifica"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(member.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-md transition-colors"
                          title="Elimina"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {staff.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-sm text-slate-500">
                      Nessun account staff creato. Il proprietario è l'unico utente abilitato.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-extrabold text-lg text-slate-800">
                {modalMode === 'create' ? 'Nuovo Collaboratore' : 'Modifica Collaboratore'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-slate-800 text-sm font-semibold cursor-pointer"
              >
                Chiudi
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nome</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={e => setFormData(p => ({...p, first_name: e.target.value}))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-gymPrimary focus:ring-1 focus:ring-gymPrimary outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Cognome</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={e => setFormData(p => ({...p, last_name: e.target.value}))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-gymPrimary focus:ring-1 focus:ring-gymPrimary outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Indirizzo Email</label>
                <input
                  type="email"
                  required
                  disabled={modalMode === 'edit'}
                  value={formData.email}
                  onChange={e => setFormData(p => ({...p, email: e.target.value}))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-gymPrimary focus:ring-1 focus:ring-gymPrimary outline-none transition-colors disabled:bg-slate-50 disabled:text-slate-500"
                />
                {modalMode === 'edit' && <p className="text-[10px] text-slate-400">L'email non è modificabile</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
                {modalMode === 'create' ? (
                  <input
                    type="text"
                    required
                    placeholder="Password provvisoria"
                    value={formData.password}
                    onChange={e => setFormData(p => ({...p, password: e.target.value}))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-gymPrimary focus:ring-1 focus:ring-gymPrimary outline-none transition-colors"
                  />
                ) : (
                  <PasswordInput
                    placeholder="Lascia vuoto per non cambiare"
                    value={formData.password}
                    onChange={e => setFormData(p => ({...p, password: e.target.value}))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-gymPrimary focus:ring-1 focus:ring-gymPrimary outline-none transition-colors"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Ruolo Assegnato</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData(p => ({...p, role: e.target.value}))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-gymPrimary focus:ring-1 focus:ring-gymPrimary outline-none transition-colors"
                >
                  <option value="admin">Amministratore (Accesso Completo)</option>
                  <option value="reception">Receptionist (Cassa, Vendita, Check-in)</option>
                  <option value="trainer">Trainer (Corsi, Presenze, Anagrafiche)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gymPrimary text-white rounded-xl text-sm font-bold hover:bg-gymPrimaryHover cursor-pointer"
                >
                  {modalMode === 'create' ? 'Crea Account' : 'Salva Modifiche'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
