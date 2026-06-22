import React, { useState } from 'react';
import {
  Activity,
  Calendar,
  Users,
  Smartphone,
  ShieldCheck,
  ChevronDown,
  ArrowRight,
  Eye,
  CheckCircle2,
  Mail,
  Phone,
  Building,
  User,
  Zap,
  Dumbbell
} from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';

export default function LandingPage() {
  const [formData, setFormData] = useState({
    nome: '',
    palestra: '',
    citta: '',
    telefono: '',
    email: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showPricingDetails, setShowPricingDetails] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.nome,
        gym_name: formData.palestra,
        city: formData.citta,
        phone: formData.telefono,
        email: formData.email
      })
    })
      .then((res) => {
        if (!res.ok) throw new Error('Errore durante l\'invio');
        return res.json();
      })
      .then(() => {
        setIsSubmitted(true);
        setFormData({ nome: '', palestra: '', citta: '', telefono: '', email: '' });
      })
      .catch((err) => alert(err.message));
  };

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const scrollToContact = (e) => {
    e.preventDefault();
    document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
  };

  const faqs = [
    {
      q: "Il prezzo cambia se aumentano i miei iscritti?",
      a: "No. Il nostro modello è a pacchetto unico. Che tu abbia 100 o 10.000 iscritti, il canone mensile rimane esattamente lo stesso. Vogliamo supportare la tua crescita, non penalizzarla."
    },
    {
      q: "Posso far accedere i miei collaboratori o trainer?",
      a: "Certamente. Puoi creare profili operatori illimitati. Ogni trainer o receptionist avrà il suo accesso dedicato con permessi personalizzati, senza alcun costo aggiuntivo."
    },
    {
      q: "Come funziona l'importazione dei miei dati attuali (Excel, vecchi gestionali)?",
      a: "Ti forniamo dei template pronti all'uso o pensiamo noi all'importazione dal tuo vecchio gestionale. I tuoi iscritti e le scadenze saranno trasferiti senza sforzo."
    },
    {
      q: "Cosa è incluso nel costo di Setup iniziale?",
      a: "Il setup comprende la configurazione tecnica del tuo club, l'importazione dei dati e la prima formazione per renderti subito operativo insieme al tuo staff."
    },
    {
      q: "I miei dati sono al sicuro?",
      a: "Assolutamente sì. Sei l'unico titolare dei dati dei tuoi atleti. Utilizziamo server sicuri con backup giornalieri protetti da crittografia di livello bancario."
    },
    {
      q: "PiùPalestre gestisce anche le prenotazioni dei corsi?",
      a: "Sì. I tuoi iscritti potranno scaricare la web-app sul loro smartphone e prenotare i corsi in totale autonomia, liberando il tempo della tua reception."
    }
  ];

  return (
    <div className="font-sans text-slate-800 bg-gymBg min-h-screen selection:bg-gymPrimary/20 selection:text-gymPrimary">
      {/* Navbar */}
      <nav className="fixed top-0 w-full px-6 md:px-12 py-5 flex justify-between items-center bg-white/85 backdrop-blur-md z-50 border-b border-black/5">
        <a href="#" className="flex items-center gap-3 no-underline">
          <img src={logo} alt="PiùPalestre" className="h-10 w-auto" />
        </a>
        <div className="flex items-center gap-6">
          <a href="#" className="hidden md:block font-semibold text-slate-900 hover:text-gymPrimary transition-colors">Demo</a>
          <a href="#contact" onClick={scrollToContact} className="bg-gymPrimary text-white font-bold px-6 py-3 rounded-xl shadow-[0_10px_25px_rgba(139,26,26,0.25)] hover:-translate-y-1 hover:shadow-[0_15px_35px_rgba(139,26,26,0.35)] transition-all flex items-center gap-2">
            <span className="hidden sm:inline">Parliamo del tuo Club</span>
            <Mail className="h-4 w-4 sm:hidden" />
          </a>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="pt-48 pb-24 px-6 text-center relative overflow-hidden" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(139, 26, 26, 0.05) 0%, transparent 60%)' }}>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-outfit font-black text-slate-900 leading-[1.1] max-w-5xl mx-auto mb-6">
            Il CRM per le palestre che <span className="text-gymPrimary">non vogliono perdere clienti.</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-500 max-w-3xl mx-auto mb-10 leading-relaxed">
            Progettato per chi gestisce centri fitness, box crossfit e piscine. PiùPalestre semplifica scadenze, ingressi e rinnovi, garantendo che ogni iscritto si senta seguito al momento perfetto.
          </p>
          
          <div className="flex justify-center gap-4 sm:gap-8 flex-wrap mb-12">
            <div className="flex items-center gap-2 font-outfit font-semibold text-slate-700 bg-white px-5 py-2 rounded-full shadow-sm border border-slate-100">
              <Dumbbell className="h-4 w-4 text-gymPrimary" /> Sala Pesi
            </div>
            <div className="flex items-center gap-2 font-outfit font-semibold text-slate-700 bg-white px-5 py-2 rounded-full shadow-sm border border-slate-100">
              <Activity className="h-4 w-4 text-gymPrimary" /> Corsi
            </div>
            <div className="flex items-center gap-2 font-outfit font-semibold text-slate-700 bg-white px-5 py-2 rounded-full shadow-sm border border-slate-100">
              <Zap className="h-4 w-4 text-gymPrimary" /> CrossFit
            </div>
            <div className="flex items-center gap-2 font-outfit font-semibold text-slate-700 bg-white px-5 py-2 rounded-full shadow-sm border border-slate-100">
              <ShieldCheck className="h-4 w-4 text-gymPrimary" /> Piscine
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-5">
            <a href="#contact" onClick={scrollToContact} className="bg-gymPrimary text-white font-bold px-8 py-4 rounded-xl shadow-[0_10px_25px_rgba(139,26,26,0.25)] hover:-translate-y-1 hover:shadow-[0_15px_35px_rgba(139,26,26,0.35)] transition-all flex items-center justify-center gap-2 text-lg">
              Proteggi il tuo portafoglio <ArrowRight className="h-5 w-5" />
            </a>
            <a href="#" className="bg-white text-gymPrimary border-2 border-gymPrimary font-bold px-8 py-4 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 text-lg">
              Guarda come funziona <Eye className="h-5 w-5" />
            </a>
          </div>
        </section>

        {/* Value Prop */}
        <section className="bg-white py-24 px-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="bg-gymBg p-12 rounded-[24px] text-center border border-slate-200">
              <div className="w-40 h-40 border-[10px] border-gymPrimary rounded-full flex items-center justify-center font-outfit text-6xl font-black text-gymPrimary bg-white mx-auto mb-6">
                0
              </div>
              <p className="font-outfit font-bold text-slate-900 text-xl tracking-wide uppercase">Sprechi di tempo</p>
            </div>
            <div>
              <h2 className="text-4xl md:text-5xl font-outfit font-black text-slate-900 leading-[1.2] mb-6">
                L'automazione che lavora per te quando non ci sei.
              </h2>
              <p className="text-slate-500 text-lg mb-6 leading-relaxed">
                Il vero valore di una palestra è nel numero di abbonamenti attivi. Ma senza un metodo, molti clienti smettono di venire semplicemente perché nessuno li ha stimolati a rinnovare.
              </p>
              <p className="text-slate-500 text-lg leading-relaxed">
                Attraverso scadenziari dinamici e automazioni, ogni abbonamento in scadenza viene monitorato. Hai tutto il tempo per proporre un rinnovo, inviare un promemoria via WhatsApp e fidelizzare il tuo atleta.
              </p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-gymBg py-24 px-6" id="features">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-outfit font-black text-slate-900 mb-6">Pochi strumenti, ma quelli giusti.</h2>
            <p className="text-slate-500 text-lg max-w-3xl mx-auto">Abbiamo rimosso il superfluo per concentrarci su quello che serve davvero a chi gestisce un centro sportivo moderno.</p>
          </div>

          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-10 rounded-[24px] border border-slate-200 hover:border-gymPrimary hover:-translate-y-2 hover:shadow-2xl hover:shadow-gymPrimary/10 transition-all duration-300">
              <Calendar className="h-10 w-10 text-gymPrimary mb-6" />
              <h3 className="text-2xl font-outfit font-bold text-slate-900 mb-4">Zero Fogli Excel</h3>
              <p className="text-slate-500 leading-relaxed">Gestione automatizzata di abbonamenti, rate e certificati medici. Il sistema cataloga le scadenze e blocca in automatico i tornelli a chi non è in regola.</p>
            </div>
            <div className="bg-white p-10 rounded-[24px] border border-slate-200 hover:border-gymPrimary hover:-translate-y-2 hover:shadow-2xl hover:shadow-gymPrimary/10 transition-all duration-300">
              <Users className="h-10 w-10 text-gymPrimary mb-6" />
              <h3 className="text-2xl font-outfit font-bold text-slate-900 mb-4">Gestione Team & Trainer</h3>
              <p className="text-slate-500 leading-relaxed">Crea accessi separati per i tuoi collaboratori. I trainer possono vedere i loro clienti e i turni, mentre la reception ha il controllo totale degli accessi.</p>
            </div>
            <div className="bg-white p-10 rounded-[24px] border border-slate-200 hover:border-gymPrimary hover:-translate-y-2 hover:shadow-2xl hover:shadow-gymPrimary/10 transition-all duration-300">
              <Activity className="h-10 w-10 text-gymPrimary mb-6" />
              <h3 className="text-2xl font-outfit font-bold text-slate-900 mb-4">Controllo Accessi Rapido</h3>
              <p className="text-slate-500 leading-relaxed">Integrazione perfetta con badge e passkey biometriche su smartphone. Check-in istantanei senza attese in reception, fluidità pura.</p>
            </div>
            <div className="bg-white p-10 rounded-[24px] border border-slate-200 hover:border-gymPrimary hover:-translate-y-2 hover:shadow-2xl hover:shadow-gymPrimary/10 transition-all duration-300">
              <Smartphone className="h-10 w-10 text-gymPrimary mb-6" />
              <h3 className="text-2xl font-outfit font-bold text-slate-900 mb-4">Esperienza App Atleta</h3>
              <p className="text-slate-500 leading-relaxed">I tuoi iscritti prenotano i corsi, gestiscono il loro profilo e visualizzano l'abbonamento direttamente dalla loro dashboard mobile personale.</p>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="bg-white py-24 px-6" id="pricing">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-outfit font-black text-slate-900 mb-6">Trasparenza Totale.</h2>
            <p className="text-slate-500 text-lg max-w-3xl mx-auto">Nessun costo nascosto o pacchetti complicati. Un unico piano che include ogni funzionalità presente e futura.</p>
          </div>

          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-[32px] p-12 border-2 border-gymPrimary shadow-[0_30px_60px_rgba(139,26,26,0.1)] relative text-center hover:-translate-y-2 hover:shadow-[0_40px_80px_rgba(139,26,26,0.15)] transition-all duration-400">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gymPrimary text-white px-6 py-2 rounded-full text-sm font-black tracking-widest shadow-[0_10px_20px_rgba(139,26,26,0.3)] uppercase">
                Tutto Incluso
              </div>
              <h3 className="text-3xl font-outfit font-bold text-slate-900 mb-2">Prezzo Chiaro</h3>
              <p className="text-slate-500 font-semibold mb-8">Un unico investimento per la tua palestra</p>
              
              <div className="text-slate-900 mb-8">
                <span className="text-3xl font-bold align-top mr-1">€</span>
                <span className="text-7xl font-outfit font-black leading-none">**,**</span>
                <span className="text-lg text-slate-500 font-semibold block mt-2">/mese + IVA</span>
                <p className="text-sm text-slate-500 font-semibold mt-4">Contattaci per scoprire l'offerta riservata al tuo club.</p>
              </div>

              <div className="bg-gymBg px-4 py-3 rounded-xl text-slate-900 font-medium inline-flex items-center gap-2 mb-8">
                <ShieldCheck className="h-5 w-5 text-gymPrimary" /> Setup iniziale una tantum: <strong>€ **</strong>
              </div>

              <div 
                className="bg-gymBg px-5 py-4 rounded-xl flex justify-between items-center cursor-pointer font-bold text-slate-900 hover:bg-white hover:border-gymPrimary border border-transparent transition-all mb-4"
                onClick={() => setShowPricingDetails(!showPricingDetails)}
              >
                <span>Cosa è incluso nel pacchetto?</span>
                <ChevronDown className={`h-4 w-4 text-gymPrimary transition-transform duration-300 ${showPricingDetails ? 'rotate-180' : ''}`} />
              </div>

              <div className={`text-left overflow-hidden transition-all duration-500 ${showPricingDetails ? 'max-h-[500px] mb-8' : 'max-h-0'}`}>
                <ul className="space-y-3 mt-4">
                  <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-gymPrimary shrink-0" /> Iscritti e Check-in illimitati</li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-gymPrimary shrink-0" /> Gestione Corsi e Prenotazioni</li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-gymPrimary shrink-0" /> Notifiche Scadenze e Certificati</li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-gymPrimary shrink-0" /> Integrazione Controllo Accessi</li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-gymPrimary shrink-0" /> Utenti e Trainer illimitati</li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-gymPrimary shrink-0" /> App Atleta Web</li>
                </ul>
              </div>

              <button onClick={scrollToContact} className="w-full bg-gymPrimary text-white font-bold py-5 rounded-xl hover:bg-gymPrimaryHover transition-colors text-lg flex justify-center items-center gap-2">
                Attiva il tuo Club <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="bg-slate-900 text-white py-24 px-6 text-center" id="contact">
          <div className="mb-12">
            <h2 className="text-4xl md:text-5xl font-outfit font-black mb-4">Iniziamo a proteggere i tuoi clienti?</h2>
            <p className="text-white/70 text-lg">Raccontaci come lavori oggi e vedremo insieme se PiùPalestre può aiutarti a lavorare meglio.</p>
          </div>

          <div className="max-w-2xl mx-auto bg-white p-10 md:p-14 rounded-[24px] shadow-[0_30px_60px_rgba(0,0,0,0.2)] text-left text-slate-800">
            {isSubmitted ? (
              <div className="bg-emerald-50 text-emerald-700 p-6 rounded-xl font-bold flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6" /> Richiesta inviata con successo! Ti contatteremo a breve.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block mb-2 font-semibold text-sm">Nome della Palestra</label>
                  <input type="text" name="palestra" required placeholder="La tua palestra" value={formData.palestra} onChange={handleInputChange}
                    className="w-full px-5 py-4 rounded-xl border-2 border-slate-100 outline-none focus:border-gymPrimary transition-colors"
                  />
                </div>
                <div>
                  <label className="block mb-2 font-semibold text-sm">Il tuo Nome</label>
                  <input type="text" name="nome" required placeholder="Mario Rossi" value={formData.nome} onChange={handleInputChange}
                    className="w-full px-5 py-4 rounded-xl border-2 border-slate-100 outline-none focus:border-gymPrimary transition-colors"
                  />
                </div>
                <div>
                  <label className="block mb-2 font-semibold text-sm">Email</label>
                  <input type="email" name="email" required placeholder="email@esempio.it" value={formData.email} onChange={handleInputChange}
                    className="w-full px-5 py-4 rounded-xl border-2 border-slate-100 outline-none focus:border-gymPrimary transition-colors"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block mb-2 font-semibold text-sm">Città</label>
                    <input type="text" name="citta" required placeholder="Milano" value={formData.citta} onChange={handleInputChange}
                      className="w-full px-5 py-4 rounded-xl border-2 border-slate-100 outline-none focus:border-gymPrimary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 font-semibold text-sm">Numero di Telefono</label>
                    <input type="tel" name="telefono" required placeholder="Per una breve chiacchierata" value={formData.telefono} onChange={handleInputChange}
                      className="w-full px-5 py-4 rounded-xl border-2 border-slate-100 outline-none focus:border-gymPrimary transition-colors"
                    />
                  </div>
                </div>
                <button type="submit" className="w-full bg-slate-900 text-white font-bold py-5 rounded-xl hover:bg-gymPrimary transition-colors text-lg mt-4">
                  Chiedi maggiori informazioni
                </button>
              </form>
            )}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="bg-gymBg py-24 px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-outfit font-black text-slate-900 mb-6">Domande Frequenti</h2>
            <p className="text-slate-500 text-lg">Tutto quello che devi sapere su PiùPalestre e sul nostro modello all-inclusive.</p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={index} className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${isOpen ? 'border-gymPrimary shadow-[0_10px_25px_rgba(139,26,26,0.08)]' : 'border-slate-200'}`}>
                  <button
                    className="w-full px-8 py-6 text-left flex justify-between items-center font-outfit font-bold text-lg text-slate-900 outline-none"
                    onClick={() => toggleFaq(index)}
                  >
                    {faq.q}
                    <ChevronDown className={`h-5 w-5 text-gymPrimary transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-400 ease-out bg-slate-50 ${isOpen ? 'max-h-96 border-t border-slate-100' : 'max-h-0'}`}>
                    <p className="px-8 py-6 text-slate-600 leading-relaxed m-0">
                      {faq.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#041424] text-white py-16 px-6 text-center">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-3 font-outfit font-black text-2xl opacity-90">
            <img src={logo} alt="PiùPalestre Logo" className="h-8 w-auto brightness-0 invert" />
          </div>
          <div className="text-sm opacity-70">
            P.IVA 04572840710 • Puglia (IT)
          </div>
          <div className="flex gap-6 text-sm font-semibold opacity-70">
            <Link to="/privacy" className="hover:text-gymPrimary transition-colors">Privacy Policy</Link>
            <Link to="/cookie" className="hover:text-gymPrimary transition-colors">Cookie Policy</Link>
          </div>
          <div className="text-xs opacity-50 mt-4">
            &copy; {new Date().getFullYear()} PiùPalestre. Al fianco del tuo centro sportivo.
          </div>
        </div>
      </footer>
    </div>
  );
}
