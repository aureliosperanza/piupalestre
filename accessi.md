# piùpalestre - URL e Credenziali di Accesso

Questo file contiene l'elenco degli indirizzi locali della piattaforma e le credenziali di prova (seed) per testare le funzionalità utente e superadmin.

---

## 🌐 Indirizzi della Piattaforma

| Portale / Servizio | URL Locale | Descrizione |
| :--- | :--- | :--- |
| **Landing Page** (Pubblica) | [http://localhost:5173/](http://localhost:5173/) | Pagina vetrina e modulo di contatto per lead generation. |
| **Console Superadmin** | [http://localhost:5173/superadmin](http://localhost:5173/superadmin) | Gestione SaaS (approvazione lead, attivazione/sospensione palestre). |
| **CRM Palestra** (Iron Gym) | [http://localhost:5173/iron-gym](http://localhost:5173/iron-gym) | Dashboard, iscritti, classi e reception desk di Iron Gym. |
| **API Server** (Backend) | [http://localhost:3001/](http://localhost:3001/) | Server API Express e database SQLite. |

---

## 🔑 Credenziali Demo (Seed)

### 1. Super Amministratore (SaaS Cloud)
Gestisce l'intera infrastruttura, visualizza le richieste lead arrivate dalla landing page, crea nuove palestre e può sospendere/riattivare i loro account.
* **Email:** `admin@piupalestre.it`
* **Password:** `password123`
* **Accesso:** Tramite la pagina `/superadmin`.

### 2. Gestore Palestra (Iron Gym - Tenant)
Gestisce la ricezione, gli atleti di Iron Gym, le prenotazioni dei corsi e registra gli ingressi.
* **Email:** `iron@gym.com`
* **Password:** `password123`
* **Accesso:** Tramite la pagina `/iron-gym` (slug personalizzato).

---

## 🚀 Come avviare l'applicazione localmente

Se i server non sono già attivi in background, puoi aprirli usando i seguenti comandi:

1. **Avvia il server di Backend (Porta 3000):**
   ```bash
   cd server
   npm run dev
   ```
2. **Avvia il client di Frontend (Porta 5173):**
   ```bash
   cd client
   npm run dev
   ```
