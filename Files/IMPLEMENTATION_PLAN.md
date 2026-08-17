# Personal EQ — Piano di Implementazione v2
### "Bring-your-own-AI" + Redesign completo + Orchestrazione automatica a sub-agenti

Versione: 1.1 · Target: esecuzione da parte di un ambiente agentico (OpenCode, opencode.ai) tramite agenti dedicati
Repo di riferimento: `ThatsSteve/EQ` (analisi di base: audit codebase allegato dall'utente, 08/2026)

---

## 0. Come va letto questo documento (istruzioni per l'agente)

Questo file è la **fonte di verità** del progetto. Non contiene codice da eseguire direttamente: contiene
*specifiche* che un sub-agente "prompt-writer" trasformerà, fase per fase, in task concreti per i sub-agenti
di sviluppo. Il file va letto insieme a:

- `implementation/plan_state.json` — stato macchina-leggibile (fase corrente, esito ultimo gate, cronologia)
- `.opencode/agents/*.md` — le 6 definizioni di agenti OpenCode allegate a questo pacchetto (un agente `primary`, cinque `subagent`)
- `implementation/prompts/phase-N.md` — prompt generato per la fase N (creato dal prompt-writer, non da te)
- `implementation/reports/phase-N-{security,qa}.md` — report dei gate, prodotti da security-auditor / qa-verifier

Il ciclo operativo completo è descritto alla sezione 4. **Non saltare le fasi e non avanzare senza un gate
di sicurezza PASS**: è il meccanismo che garantisce che il progetto resti pubblicabile in ogni momento.

---

## 1. Decisioni architetturali fondamentali

Queste sono le scelte strutturali su cui si basa tutto il resto. Sono presentate come alternative con una
raccomandazione, perché sono le uniche che vale la pena confermare esplicitamente prima di iniziare.

### 1.1 Distribuzione dell'app

Il Live Sync verso `EqualizerAPO` richiede accesso al filesystem locale di Windows: questo vincola comunque
l'app a girare come processo locale, non come SaaS multi-tenant.

| Opzione | Pro | Contro |
|---|---|---|
| **A. Electron (consigliata)** | Riusa il backend Node/Express esistente quasi 1:1; packaging maturo (`electron-builder`); `safeStorage` nativo per segreti cifrati legati all'account OS | Binario pesante (~150MB+) |
| B. Tauri | Binario leggero, sandboxing migliore | Richiede riscrivere il "shell" in Rust o far girare Node come sidecar — refactor non banale, non giustificato ora |
| C. Web app pura + installer separato "companion" per Live Sync | Aggiornamenti centralizzati | Complessità doppia (due processi da mantenere sincronizzati), esperienza utente peggiore |

**Raccomandazione: A.** Il backend Express resta quasi identico (continua a fare bind su `127.0.0.1`), il
frontend Vite diventa la `BrowserWindow` di Electron, i segreti (API key IA) vengono cifrati con
`safeStorage` invece che con crypto custom. Questo elimina anche buona parte dei problemi di "dove salvo le
chiavi in modo sicuro per un'app pubblica": non esiste un server centrale che le riceve, restano sul device.

### 1.2 Astrazione dei provider IA — il cuore della richiesta

Il progetto ha già la cosa più importante: **una netta separazione tra dominio semantico (IA) e dominio
fisico (DSP)**. L'IA, di qualunque provenienza, deve produrre *solo* un JSON a 6 intenti (`sub_bass_intent`
… `brilliance_intent`, range `-5.0..+5.0`). Questo significa che astrarre il provider non richiede toccare
`coreCalculator.js`: serve solo garantire che *qualsiasi* modello, locale o cloud, sappia emettere quel JSON
in modo affidabile.

**Pattern: Adapter + Registry + Contratto di output fisso.** È lo stesso approccio usato da progetti che
risolvono esattamente questo problema — utile come riferimento diretto:

- **Vercel AI SDK** — astrazione "providers" con interfaccia comune per generazione testo/strutturata
- **LiteLLM** — proxy/libreria che espone >100 provider dietro un'unica API OpenAI-compatibile
- **OpenRouter** — meta-provider: una sola chiave, decine di modelli cloud, utile come opzione "cloud rapida" senza dover integrare OpenAI/Anthropic/Google separatamente
- **Open WebUI / LibreChat** — per l'UX della schermata "Connessioni": endpoint personalizzato + chiave, test connessione, selezione modello

Struttura interna proposta (`engine/ai/`):

```
engine/ai/
  ProviderInterface.js       // contratto astratto
  registry.js                // mappa id -> adapter, CRUD profili
  adapters/
    openAICompatible.js      // LM Studio, Ollama, OpenAI, Groq, OpenRouter, Together, endpoint custom
    anthropic.js             // Claude nativo (tool_use per output strutturato)
    googleGemini.js           // opzionale, stessa logica
  schema/eqIntentSchema.js   // JSON Schema dei 6 intenti — UNICA fonte di verità, provider-agnostico
  capabilityProbe.js         // test automatico delle capacità del provider collegato
  jsonRepair.js              // validazione + retry con feedback per provider senza structured output nativo
  secretsVault.js            // cifratura/decifratura profili IA (safeStorage in Electron)
```

Contratto d'interfaccia minimo (ogni adapter lo implementa):

```js
class AIProvider {
  async testConnection() {}                 // {ok, latencyMs, modelName}
  async getCapabilities() {}                // {structuredOutput, functionCalling, streaming}
  async chat({ messages, schema, stream }) {}  // {raw, parsed, tier, usage}
}
```

**Livelli di affidabilità (capability tiers)** — determinati automaticamente al momento del collegamento:

| Tier | Descrizione | Comportamento |
|---|---|---|
| 1 — Nativo | Il provider supporta output strutturato / function calling reale (OpenAI recenti, Claude tool_use, Gemini function calling, LM Studio con grammar/json_schema) | Usato direttamente per generare i filtri EQ |
| 2 — Prompt-guidato | Nessun structured output nativo (molti modelli locali piccoli) | Prompt rigido + validazione JSON Schema + 1 retry con errore incluso nel feedback |
| 3 — Inaffidabile | Fallisce la validazione anche dopo retry | Il provider resta disponibile **solo per la chat conversazionale**; la generazione EQ ricade sul motore deterministico a grafo già esistente (`graphEngine.js`) — mai un errore visibile all'utente |

Questo risolve direttamente la richiesta "qualsiasi IA che l'utente inserisca deve diventare intelligente e
specifica per lo scopo": non è il modello a doversi adattare, è il layer che verifica cosa il modello sa
fare e reagisce di conseguenza, mantenendo sempre un fallback sicuro.

### 1.3 Segreti e privacy (vincolo trasversale, vale per ogni fase)

- Nessuna API key, endpoint privato o token **mai** in codice, `.git`, log o file di stato in chiaro.
- Profili IA cifrati con `safeStorage` (Electron) → file `ai-profiles.enc` fuori dal repo, in `app.getPath('userData')`.
- `.env` resta solo per variabili di sviluppo locali (porta, path E-APO), mai per chiavi utente finali.
- Ogni fase termina con un gate `security-auditor` (sezione 4) prima di poter procedere.

### 1.4 Redesign frontend e chat persistente — linee guida

- Mobile-first fin dallo start: breakpoint singola sorgente di verità nei design token, non media query sparse.
- Estetica "studio di regia audio premium": tema scuro come default, superfici vetro/profondità, accenti a
  gradiente ispirati a una forma d'onda, tipografia con un sans tecnico per UI + un display per i titoli.
  Va evitato l'aspetto "Tailwind di default" — vedi `frontend-design` skill per i vincoli di stile disponibili
  in questo ambiente quando si costruiscono i componenti.
- Chat IA come **pannello persistente**, non modale: dock laterale su desktop, bottom-sheet su mobile,
  presente su ogni step del wizard, consapevole dello stato corrente (step, hardware scelto, filtri attivi),
  con proposte di modifica mostrate come diff "prima/dopo" da accettare o rifiutare — mai applicate silenziosamente.
- Accessibilità: WCAG 2.1 AA, focus visibile, contrasto verificato, `prefers-reduced-motion` rispettato,
  vista tabellare alternativa per ogni grafico Recharts.

---

## 2. Struttura di governance introdotta nel repo

```
.opencode/agents/                 6 agenti (allegati, vedi cartella opencode-agents/ di questo pacchetto)
implementation/
  IMPLEMENTATION_PLAN.md         questo file, spostato nella root del progetto
  plan_state.json                stato macchina-leggibile del piano
  prompts/phase-N.md             prompt di esecuzione generato per la fase N
  reports/phase-N-security.md    report del gate di sicurezza
  reports/phase-N-qa.md          report del gate funzionale
```

---

## 3. I sei agenti (OpenCode)

OpenCode distingue due tipi di agente: **primary** (l'assistente con cui si interagisce direttamente,
selezionabile con Tab o `--agent`) e **subagent** (invocato automaticamente da un agente primary in base
alla propria `description`, oppure manualmente con `@nome-agente`). Non esiste un elenco di "tool"
assegnabili come in altri ambienti: l'accesso è governato dal blocco `permission`, che può usare pattern
glob per concedere/negare azioni in modo granulare (es. un comando bash specifico, o un percorso di file
specifico) invece che l'accesso on/off a un intero tool.

I file completi sono nella cartella `opencode-agents/` allegata a questa risposta. Vanno copiati in
`.opencode/agents/` dentro il repo del progetto (project-level, così restano versionati e condivisi — il
nome del file diventa il nome dell'agente, es. `security-auditor.md` → agente `security-auditor`). Dopo
averli copiati, verifica che vengano riconosciuti con `opencode agent list`.

| Agente | Mode | Ruolo | Permessi chiave |
|---|---|---|---|
| `architect-orchestrator` | `primary` | Legge il piano e lo stato, decide la fase successiva, invoca gli altri agenti in sequenza tramite Task tool, aggiorna `plan_state.json` | `edit` solo su `implementation/**`; `task` solo verso i 5 agenti sotto; `bash` solo comandi di sola lettura (`git status`, `git diff`, `git log`, `ls`, `cat`) |
| `prompt-writer` | `subagent`, `hidden: true` | Trasforma la specifica della fase N in un task prompt autosufficiente per l'agente di sviluppo, incorporando l'esito dei gate precedenti | `edit` solo su `implementation/prompts/*`; `bash`/`webfetch`/`task` negati |
| `backend-ai-dev` | `subagent` | Implementa il layer di astrazione IA, gli endpoint, la logica DSP/orchestrazione lato server | `edit`/`bash`/`webfetch` consentiti; `task` negato (non invoca altri agenti) |
| `frontend-redesign-dev` | `subagent` | Implementa design system, refactor componenti, wizard, chat persistente | `edit`/`bash`/`webfetch` consentiti; `task` negato |
| `security-auditor` | `subagent` | Gate obbligatorio dopo ogni fase: scansiona segreti, pattern insicuri, dipendenze | `edit` solo su `implementation/reports/*`; `bash` limitato a comandi diagnostici espliciti (`grep`, `git diff/log/status`, `npm audit`, `npm test`) |
| `qa-verifier` | `subagent` | Gate obbligatorio dopo il PASS di sicurezza: esegue test, verifica i criteri di accettazione della fase | `edit` solo su `implementation/reports/*`; `bash` limitato a `npm test/run`, `curl` verso `localhost`/`127.0.0.1`, `grep`, `git diff/log` |

Perché questa suddivisione: `security-auditor` e `qa-verifier` **non hanno mai un permesso `edit` generico
sul codice** — solo sul proprio file di report, tramite pattern glob nel blocco `permission.edit`. Questo
impedisce strutturalmente che un gate "si auto-approvi" modificando il codice per farlo passare; è una
restrizione applicata da OpenCode stesso, non solo una regola scritta nel prompt.

Nota sul campo `model`: i file allegati non fissano un modello specifico (i subagent ereditano di default
il modello dell'agente primary che li invoca; l'orchestrator userà il modello globale configurato in
`opencode.json` se non specificato). Puoi assegnare modelli diversi per costo/capacità con `opencode models`
per vedere l'elenco disponibile e aggiungere `model: provider/model-id` nel frontmatter di ciascun agente —
per esempio un modello economico e veloce per `prompt-writer`, uno più capace per `backend-ai-dev` e
`frontend-redesign-dev`. Dato che il progetto stesso mira a essere multi-provider, è naturale che anche
l'ambiente di sviluppo lo sia: puoi usare provider diversi per agenti diversi senza vincoli.

---

## 4. Ciclo operativo automatico

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. architect-orchestrator legge plan_state.json → fase corrente = N  │
│ 2. invoca prompt-writer(fase N, plan.md, report fase N-1)            │
│      → scrive implementation/prompts/phase-N.md                     │
│ 3. invoca backend-ai-dev o frontend-redesign-dev con quel prompt     │
│      → implementa, esegue self-check di base                        │
│ 4. invoca security-auditor                                          │
│      → scrive implementation/reports/phase-N-security.md            │
│      → FAIL? torna al punto 3 con la lista dei problemi allegata    │
│ 5. invoca qa-verifier                                                │
│      → scrive implementation/reports/phase-N-qa.md                  │
│      → FAIL? torna al punto 3 con la lista dei problemi allegata    │
│ 6. entrambi PASS → orchestrator aggiorna plan_state.json:            │
│      fase N → "done", fase N+1 → "ready"                            │
│ 7. torna al punto 1 per la fase N+1                                  │
└─────────────────────────────────────────────────────────────────────┘
```

Comando per avviare (o riprendere) l'esecuzione, da terminale nella root del repo:

```
opencode run --agent architect-orchestrator "Leggi implementation/IMPLEMENTATION_PLAN.md e implementation/plan_state.json, individua la fase corrente ed esegui il ciclo operativo descritto alla sezione 4 del piano fino a un gate PASS o a un blocco che richiede la mia decisione."
```

In alternativa, in modalità interattiva (`opencode`), premi **Tab** per selezionare l'agente primary
`architect-orchestrator` e scrivi lo stesso messaggio. Per riprendere una sessione già avviata invece di
ripartire da zero, aggiungi `--continue` (o `--session <id>`).

`implementation/plan_state.json` iniziale (allegato) — schema:

```json
{
  "current_phase": 0,
  "phases": {
    "0": { "status": "ready", "attempts": 0, "last_security": null, "last_qa": null },
    "1": { "status": "pending" }
  },
  "notes": []
}
```

Stati possibili di una fase: `pending → ready → in_progress → security_review → qa_review → done`,
oppure `blocked` se un gate fallisce due volte di fila (in quel caso l'orchestrator **si ferma e chiede
input umano** invece di ritentare all'infinito — vincolo esplicito per evitare loop incontrollati).

---

## 5. Fasi

Ogni fase è scope-limitata e termina con Definition of Done verificabile. I riferimenti a bug (es. "riga 125")
vengono dall'audit codebase fornito dall'utente e vanno ri-verificati sul codice reale al momento dell'esecuzione.

### FASE 0 — Governance & tooling
**Obiettivo:** mettere in piedi l'infrastruttura di esecuzione automatica, prima di toccare funzionalità.
**Sub-agente:** `architect-orchestrator` (setup), poi `backend-ai-dev` per il tooling.
**Scope:**
- Creare `implementation/`, copiare i 6 file agente in `.opencode/agents/` e confermarli con `opencode agent list`
- Introdurre un framework di test reale: **Vitest** (frontend) + **Vitest/Supertest** (backend), sostituendo `test-api.js` e `test_phase2.js` rotti
- Hook pre-commit di secret-scanning (es. gitleaks) + `npm audit` in CI
- `.env.example` allineato alle variabili reali; conferma `.gitignore` copra `ai-profiles.enc`, `*.env`, `knowledge_graph.json` se contiene dati utente
**Criteri di accettazione:** `npm test` gira (anche con 0 test reali ancora, ma pipeline funzionante); hook pre-commit blocca un secret di prova.
**Security checklist:** nessuna, è il gate stesso che nasce qui.

### FASE 1 — Stabilizzazione critica (pre-requisito funzionale)
**Obiettivo:** rendere end-to-end funzionante la pipeline attuale prima di aggiungere la nuova astrazione IA, altrimenti i test della Fase 2 non hanno una baseline affidabile.
**Sub-agente:** `backend-ai-dev`
**Scope (dai bug critici/funzionali già identificati):**
- `aiOrchestrator.js` — fix `ReferenceError: graphResult` (destrutturare anche `foundArtists`)
- Collegare `calculateWeightedArtistProfile` al flusso reale; `graphEngine.js` deve estrarre i `recommended_modifiers` dai nodi artista
- `coreCalculator.js` — il preamp calcolato con anti-clipping deve **combinarsi** col preamp AutoEq, non sovrascriverlo; i filtri base AutoEq devono passare dagli stessi guardrails degli "extra"
- Rimuovere `skipLMStudio = true` hardcoded da `server.js` — diventerà una scelta esplicita del profilo IA attivo (Fase 2/3)
**Criteri di accettazione:** un test end-to-end (hardware + 2 artisti → filtri generati) produce una curva EQ non vuota e coerente con i guardrails.
**Security checklist:** nessuna novità di superficie, ma verificare che il fix non riesponga log con dati hardware/artisti in chiaro oltre il necessario.

### FASE 2 — Layer di astrazione provider IA (backend)
**Obiettivo:** implementare quanto descritto in 1.2.
**Sub-agente:** `backend-ai-dev`
**Scope:**
- `engine/ai/` come da struttura in 1.2, con adapter OpenAI-compatibile (copre LM Studio/Ollama/OpenAI/Groq/OpenRouter/endpoint custom) e adapter Anthropic nativo
- `capabilityProbe.js`: al collegamento di un provider, esegue un test con lo schema reale e assegna il tier (1/2/3)
- `jsonRepair.js`: retry con feedback dell'errore di validazione per i provider tier 2
- `secretsVault.js`: cifratura profili (interfaccia pronta per `safeStorage`, con fallback dev-only chiaramente segnalato come non sicuro per produzione)
- Endpoint REST: `POST /api/ai/profiles`, `GET /api/ai/profiles`, `POST /api/ai/profiles/:id/test`, `POST /api/ai/profiles/:id/activate`
- Streaming (SSE) su `/api/chat` per supportare la chat persistente della Fase 6
**Criteri di accettazione:** stesso identico JSON di output (6 intenti validi) ottenuto da almeno due adapter diversi con lo stesso input semantico; provider "rotto" di test degrada a tier 3 senza crashare l'app.
**Security checklist:** nessuna chiave in log/errori restituiti al frontend; input testuale proveniente da fonti web (RAG hardware) sanificato prima di entrare nel prompt (mitigazione prompt injection, problema già annotato nell'audit originale).

### FASE 3 — Onboarding "Configura la tua IA" (frontend, nuovo Step 0 del wizard)
**Obiettivo:** UX per scegliere potenza di calcolo e provider, come richiesto.
**Sub-agente:** `frontend-redesign-dev`
**Scope:**
- Nuovo step iniziale: Locale (auto-detect LM Studio `:1234` / Ollama `:11434`, o endpoint manuale) vs Cloud (quick-start OpenAI/Anthropic/Gemini/OpenRouter, o endpoint OpenAI-compatibile personalizzato) vs "Nessuna IA" (motore a regole esistente, sempre disponibile)
- Test connessione in tempo reale con badge di tier (🟢 Ottimale / 🟡 Compatibile / 🔴 Solo chat)
- Multi-profilo: possibilità di salvare più configurazioni e cambiarle dalle impostazioni senza rifare l'onboarding
**Criteri di accettazione:** un utente senza alcuna IA configurata può comunque completare l'intero wizard (fallback deterministico sempre percorribile).
**Security checklist:** il campo API key non è mai loggato in console/network tab visibile in chiaro dopo il salvataggio (mascherato in UI).

### FASE 4 — Design system & rifattorizzazione frontend
**Obiettivo:** fondamenta del redesign, come da 1.4.
**Sub-agente:** `frontend-redesign-dev`
**Scope:**
- Token di design (colore, tipografia, spaziatura, breakpoint) centralizzati
- Scomposizione di `App.jsx` (2.673 righe) in `WizardShell`, step separati, `contexts/EqStateContext`, hook dedicati (`useEqCalculation`, `useLiveSync`)
- Layout responsive mobile/desktop dalla stessa base di componenti (no due codebase parallele)
**Criteri di accettazione:** nessun file di componente sopra ~300 righe; stesso comportamento funzionale pre/post refactor (regressione zero, verificata da qa-verifier contro la Fase 1).

### FASE 5 — Redesign wizard + player A/B
**Sub-agente:** `frontend-redesign-dev`
**Scope:**
- Applicazione del design system a tutti gli step
- Fix dei bug noti del player: `biquadNodesRef` mai popolato in modalità parametrica, doppio volume (`audioEl.volume` + `masterGain`), RAF loop senza cleanup a fine brano
- Grafici Recharts con vista tabellare alternativa accessibile
**Criteri di accettazione:** slider parametrici modificano l'audio in tempo reale; nessun leak di CPU rilevabile dopo 5 minuti di riproduzione continua.

### FASE 6 — Chat IA persistente e seamless
**Sub-agente:** `frontend-redesign-dev` (UI) + `backend-ai-dev` (streaming, già predisposto in Fase 2)
**Scope:**
- Pannello dockable desktop / bottom-sheet mobile, presente su tutti gli step
- Consapevolezza del contesto corrente (stato wizard) passata come contesto strutturato al provider attivo
- Proposte di modifica EQ mostrate come diff accettabile/rifiutabile, mai applicate in automatico
- Cronologia persistita localmente
**Criteri di accettazione:** la chat funziona in modo identico (stessa UX) indipendentemente dal provider selezionato in Fase 3.

### FASE 7 — Hardening finale & preparazione alla pubblicazione
**Sub-agente:** `security-auditor` guida, `backend-ai-dev`/`frontend-redesign-dev` eseguono i fix
**Scope (dal capitolo "Cosa c'è da sistemare" dell'audit originale, parti non coperte dalle fasi precedenti):**
- Error handler JSON globale, try/catch su `/api/resolve-artist`, CORS ristretto, rate-limit sugli endpoint che chiamano servizi terzi
- User-Agent reale per MusicBrainz (rischio ban con placeholder)
- Marcare esplicitamente come `estimated: true` i dati hardware stimati da euristiche; rimuovere i deficit fittizi salvati come se fossero reali
- Allineare il README ai numeri reali (es. DB DAC/Amp) e rimuovere feature dichiarate ma non implementate (export CSV/TMQ, OCR)
- Audit finale su dipendenze (`npm audit`), licenze di terze parti, e ultima scansione segreti a tappeto sull'intero repo prima del push pubblico
**Criteri di accettazione:** `security-auditor` produce PASS su un checklist esteso (allegato nel suo file agente) senza eccezioni aperte.

---

## 6. Criterio di successo complessivo

Il progetto è pronto per la pubblicazione quando:
1. Tutte le 8 fasi sono `done` in `plan_state.json`, ciascuna con report di sicurezza e QA in PASS conservati in `implementation/reports/`.
2. Un utente può collegare **qualunque** endpoint OpenAI-compatibile o le API native Anthropic/Google, ottenendo sempre un output EQ valido o un fallback dichiarato, mai un errore silenzioso.
3. Nessun segreto, path assoluto personale o dato inventato spacciato per reale resta nel repo pubblico.
4. Il redesign è utilizzabile da zero su mobile e desktop con la stessa base di componenti, con la chat sempre raggiungibile.
