# Marin Study Club – come metterlo online gratis (Netlify o Vercel + Gemini)

## Cosa c'è nella cartella
- `index.html` – l'app intera (menu, intro, chat, giochi, classi, calendario)
- `api/chat.js` (Vercel) e `netlify/functions/chat.mjs` + `netlify.toml` (Netlify) – collegano l'app a Gemini tenendo nascosta la chiave
- `firebase-config.js` – qui incolli la configurazione Firebase (per account e classi)
- `firestore.rules` – regole di sicurezza del database
- `manifest.webmanifest`, `sw.js`, icone – rendono l'app installabile sul telefono
- `marin.webp`, `intro.mp3` – immagine della mascotte e musica dell'intro

---

## 1) Chiave gratuita di Gemini (2 minuti)
1. Vai su https://aistudio.google.com e accedi con Google.
2. Clicca **Get API key** → **Create API key**.
3. Copia la chiave (inizia con `AIza…`). Non condividerla con nessuno.

## 2) Carica la cartella su GitHub
1. Crea un account su https://github.com (gratis).
2. In alto a destra **+** → **New repository** → nome `marin-study-club` → **Create repository**.
3. Nella pagina del repository clicca **uploading an existing file**.
4. Trascina **tutto il contenuto** della cartella (anche la cartella `api`) → **Commit changes**.

## 3) Pubblica su Netlify (oppure su Vercel, punto 3B)
⚠️ **Non usare il trascinamento della cartella (Netlify Drop):** in quel modo il server dell'AI non parte e la chat dice "Qualcosa è andato storto". Va collegato da GitHub.

1. Su https://app.netlify.com → **Add new site → Import an existing project** → **GitHub** → scegli `marin-study-club`.
2. Lascia vuoti "Build command" e "Publish directory": li legge da `netlify.toml`. Premi **Deploy**.
3. Vai su **Site configuration → Environment variables → Add a variable**:
   - Key: `GEMINI_API_KEY` – Value: la chiave del punto 1
4. **Deploys → Trigger deploy → Deploy site**, così il sito riparte con la chiave.

Se hai già un sito creato col trascinamento, puoi eliminarlo, oppure in **Site configuration → Build & deploy → Link repository** collegarlo a GitHub.

## 3B) In alternativa: pubblica su Vercel
1. Vai su https://vercel.com e accedi con **Continue with GitHub**.
2. **Add New… → Project** → scegli `marin-study-club` → **Import**.
3. Apri **Environment Variables** e aggiungi:
   - Nome: `GEMINI_API_KEY` – Valore: la chiave del punto 1
4. Clicca **Deploy**. Dopo circa 1 minuto hai il link, es. `marin-study-club.vercel.app`.

✅ A questo punto chat, giochi, appunti e calendario funzionano (salvati sul dispositivo).

> Se l'AI non risponde: Vercel → progetto → **Settings → Environment Variables**, controlla la chiave, poi **Deployments → ⋯ → Redeploy**.
> Facoltativo: aggiungi `GEMINI_MODEL` per scegliere un modello preciso (predefinito `gemini-flash-latest`).

## 4) Account Google e Classi con Firebase (gratis, 10 minuti)
Serve per: classi tra compagni e docenti, statistiche, dati sincronizzati tra telefono e computer.

1. Vai su https://console.firebase.google.com → **Crea un progetto** (Google Analytics non serve).
2. **Authentication** → **Inizia** → **Metodo di accesso** → attiva **Google** → Salva.
3. Sempre in Authentication → **Impostazioni → Domini autorizzati** → **Aggiungi dominio** → scrivi il dominio del tuo sito (es. `snazzy-belekoy-5e8e7f.netlify.app` o `marin-study-club.vercel.app`).
4. **Firestore Database** → **Crea database** → modalità **produzione** → località europea (es. `eur3`).
5. Scheda **Regole**: cancella tutto, incolla il contenuto di `firestore.rules` → **Pubblica**.
6. ⚙️ **Impostazioni progetto** → in basso **Le tue app** → icona **</>** (Web) → dai un nome → **Registra app**.
7. Copia l'oggetto `firebaseConfig` che appare.
8. Su GitHub apri `firebase-config.js` → icona ✏️ → sostituisci `window.FIREBASE_CONFIG = null;` con:
   ```js
   window.FIREBASE_CONFIG = { ...incolla qui i valori di firebaseConfig... };
   ```
   → **Commit changes**. Netlify o Vercel ripubblicano da soli in circa 1 minuto.

✅ Ora nella barra laterale c'è **Accedi con Google** e le Classi funzionano per tutti.

## 5) Installare l'app sul telefono
- **Android (Chrome):** apri il sito → tasto **📲 Installa app** nel menu, oppure ⋮ → **Installa app**.
- **iPhone (Safari):** apri il sito → **Condividi** → **Aggiungi alla schermata Home**.

---

## Da sapere
- **Limiti gratuiti di Gemini:** ci sono richieste massime al minuto e al giorno. Con tanti utenti l'AI può dire "troppe richieste, riprova tra poco". Sul piano gratuito Google può usare le richieste per migliorare i suoi prodotti.
- **Sicurezza classi:** chiunque abbia fatto l'accesso può leggere e scrivere nelle classi. Creatore, admin e docente sono ruoli gestiti dall'app, non dal database. Va bene per una classe, non per dati sensibili.
- **Copyright:** l'immagine di Marin e la musica dell'intro appartengono ai rispettivi autori. Per un uso pubblico o a pagamento sostituiscile con contenuti tuoi: basta caricare sopra `marin.webp` e `intro.mp3` con gli stessi nomi.
