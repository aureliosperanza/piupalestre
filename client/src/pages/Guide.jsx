import React from 'react';
import { BookOpen, LayoutDashboard, Users, CreditCard, CalendarDays, Ticket, CheckSquare, Tag, Info } from 'lucide-react';

export default function Guide() {
  const sections = [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Panoramica in tempo reale della tua palestra.',
      details: 'Qui puoi vedere a colpo d\'occhio lo stato di salute della tua palestra. Troverai contatori rapidi per gli iscritti attivi, gli abbonamenti in scadenza nei prossimi 7 giorni e i certificati medici scaduti o mancanti. C\'è anche un rapido riepilogo delle classi della giornata e degli ultimi movimenti dei clienti.'
    },
    {
      title: 'Check-in Desk',
      icon: Ticket,
      description: 'Gestione degli ingressi e tornello virtuale.',
      details: 'È il cuore operativo della reception. Inserendo il nome o l\'email di un cliente, puoi registrarne l\'ingresso. Il sistema verificherà automaticamente in tempo reale se il cliente ha un abbonamento valido e un certificato medico in regola, mostrando un segnale verde o rosso a seconda del caso. C\'è anche una modalità "Kiosk" a schermo intero (sezione apposita) che permette ai clienti di auto-registrarsi tramite un PIN o un QRCode.'
    },
    {
      title: 'Clienti',
      icon: Users,
      description: 'Il database completo dei tuoi iscritti.',
      details: 'Questa sezione è il CRM vero e proprio. Da qui puoi aggiungere nuovi clienti manualmente (inserendo Nome, Email, Telefono, Data di nascita). Cliccando su un cliente entrerai nel suo profilo dettagliato dove potrai assegnargli un abbonamento (scegliendolo dal listino), caricare i suoi documenti (es. certificato medico), e visualizzare lo storico dei suoi accessi.'
    },
    {
      title: 'Classi e Prenotazioni',
      icon: CalendarDays,
      description: 'Calendario e gestione dei corsi.',
      details: 'Qui crei il palinsesto della palestra. Puoi aggiungere nuove classi (es. Yoga, Crossfit, Pilates), impostando il giorno, l\'orario, la durata e il numero massimo di partecipanti. I clienti potranno prenotarsi a queste classi direttamente dalla loro app member, e tu potrai vedere l\'elenco dei prenotati ed eventualmente aggiungere o rimuovere partecipanti manualmente.'
    },
    {
      title: 'Approvazione Certificati',
      icon: CheckSquare,
      description: 'Controllo dei documenti caricati dai clienti.',
      details: 'Quando un cliente carica il proprio certificato medico dalla sua app, il documento finisce in questa coda di approvazione. Tu o il tuo staff dovrete visionare il documento (per verificare che sia valido e leggibile) e inserire la data di scadenza reale riportata sul certificato, per poi approvarlo. Fino all\'approvazione, il certificato risulta "In attesa" e potrebbe bloccare l\'ingresso del cliente.'
    },
    {
      title: 'Contabilità e Vendite',
      icon: CreditCard,
      description: 'Riepilogo incassi e transazioni.',
      details: 'Ogni volta che vendi un abbonamento, registri un pagamento o assegni un piano a un cliente, viene generata una transazione. In questa sezione puoi monitorare tutti gli incassi, filtrare per periodo e avere un quadro chiaro delle performance economiche del tuo centro fitness.'
    },
    {
      title: 'Listino Piani',
      icon: Tag,
      description: 'Creazione e gestione degli abbonamenti.',
      details: 'Prima di poter assegnare un abbonamento a un cliente, devi crearlo qui. Puoi creare Piani di diverso tipo (es. Mensile, Trimestrale, Annuale, o Pacchetti ad Ingressi). Per ogni piano dovrai impostare il nome, il prezzo, la durata in mesi (o numero di ingressi) e una descrizione. Questi piani verranno mostrati sia in reception che nell\'app dei clienti se abiliti l\'acquisto online.'
    },
    {
      title: 'Gestione Team',
      icon: Users,
      description: 'I permessi per il tuo staff.',
      details: 'Non devi per forza dare le tue credenziali da proprietario a tutti. Da qui puoi creare account separati per Receptionist (che vedranno solo Check-in e Clienti), Trainer (che vedranno solo Classi e Prenotazioni) o altri Amministratori.'
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Guida & Supporto</h1>
        <p className="text-slate-500 text-sm max-w-2xl">
          Benvenuto su PiùPalestre! Questa guida rapida ti aiuterà a navigare e utilizzare al meglio tutte le funzionalità del tuo nuovo gestionale.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {sections.map((section, idx) => {
          const Icon = section.icon;
          return (
            <div key={idx} className="bg-gymCard border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-gymPrimary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-6 w-6 text-gymPrimary" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-extrabold text-lg text-slate-800">{section.title}</h3>
                  <p className="font-semibold text-sm text-slate-600">{section.description}</p>
                  <p className="text-sm text-slate-500 leading-relaxed pt-2 border-t border-slate-100">
                    {section.details}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 mt-8 flex gap-4">
        <Info className="h-6 w-6 text-indigo-600 shrink-0" />
        <div>
          <h4 className="font-bold text-indigo-900 mb-1">Hai bisogno di ulteriore assistenza?</h4>
          <p className="text-sm text-indigo-700">
            Se hai dubbi su come utilizzare una specifica funzione o hai riscontrato un problema tecnico, puoi contattare il nostro team di supporto inviando un'email a <strong>support@piupalestre.it</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
