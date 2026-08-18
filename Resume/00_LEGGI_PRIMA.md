# Leggi questo file per primo — architettura snellita (v2)

Scritto da Claude dopo aver analizzato `EQBackup` e il piano originale. Nota di trasparenza: GitHub
blocca il crawling automatico delle pagine "tree" per repo poco indicizzate, quindi ho potuto leggere
`README.md`, `package.json` e l'elenco dei file di primo livello, **non** il contenuto reale di
`Resume/`, `implementation/`, `.opencode/agents/`, `engine/`, `src/`. Quello che segue è quindi un
**refactor da applicare ora**, non un diff contro lo stato esatto — è la sessione OpenCode corrente
(o la prossima) a doverlo confrontare col proprio stato attuale e migrare.

## Perché cambiare

Con un modello free/flash e 200k di contesto, il costo dominante non è "capire il compito", è
**ricaricare un piano enorme ad ogni hop tra agenti**. La catena originale
`prompt-writer → backend-ai-dev/frontend-redesign-dev → security-auditor → qa-verifier` fa 3-4 reload
completi per fase. Questo refactor taglia gli hop, non le garanzie di sicurezza.

## Cosa cambia

1. **Il piano non si legge più tutto intero.** `IMPLEMENTATION_PLAN.md` resta come riferimento
   archivistico, ma il lavoro quotidiano usa `implementation/phases/phase-N.md`: un file per fase,
   15-25 righe, autosufficiente. Sono allegati e pronti all'uso.
2. **Agenti: da 6 a 4.** `prompt-writer` è eliminato (l'orchestratore ora legge direttamente
   `phase-N.md` e lo passa al dev agent, senza sintetizzare un prompt intermedio).
   `security-auditor` + `qa-verifier` sono fusi in un unico `verifier` (un solo reload, un solo report
   con due sezioni, permessi comunque separati dal codice applicativo). Restano invariati
   `backend-ai-dev` e `frontend-redesign-dev`.
3. **Niente più catena automatica di 8 fasi senza fermarsi.** Di default l'orchestratore esegue **una
   fase, poi si ferma e ti riporta l'esito.** Tu scrivi "continua" per la fase successiva. Meno
   autonomia, più affidabilità — è il trade-off giusto per un modello free-tier.
4. **Heartbeat + limite passi, per vedere se si è inceppato dall'esterno.** `plan_state.json` ha ora
   `heartbeat` (timestamp aggiornato ad ogni checkpoint) e `current_step` (una riga di testo libero
   su cosa sta facendo *adesso*). Se apri quel file e l'`heartbeat` è fermo da minuti mentre il
   processo risulta ancora "in esecuzione" nel terminale → è bloccato. Interrompi il processo e
   rilancia lo stesso comando: l'orchestratore riparte da `plan_state.json`, non perde lavoro fatto.
   C'è anche un tetto di passi per fase (`step_count_this_phase`, max 25): superato quel numero,
   l'orchestratore si ferma da solo scrivendo `blocked` invece di continuare a girare a vuoto.

## Cosa fare ora, in ordine

1. **Migra `.opencode/agents/`**: sostituisci `architect-orchestrator.md` con la versione allegata in
   `opencode-agents-v2/`, aggiungi `verifier.md` (allegato), **elimina** `prompt-writer.md`,
   `security-auditor.md`, `qa-verifier.md`. Lascia invariati `backend-ai-dev.md` e
   `frontend-redesign-dev.md`. Verifica con `opencode agent list` che risultino solo questi 3
   subagent + 1 primary.
2. **Copia** la cartella `implementation/phases/` allegata (8 file, fase 0-7) dentro `implementation/`
   del progetto.
3. **Migra `plan_state.json`**: apri quello attuale, riporta gli stessi valori di `current_phase` e di
   `phases.*.status/attempts` nel nuovo schema qui sotto (aggiungendo solo i campi mancanti). Se una
   fase risultava già `in_progress` o `security_review`/`qa_review`, riportala a `ready` per ripartire
   pulita col nuovo flusso — non fidarti di uno stato a metà scritto con l'architettura vecchia.

```json
{
  "plan_version": "2.0",
  "current_phase": 0,
  "heartbeat": null,
  "current_step": "in attesa di avvio",
  "step_count_this_phase": 0,
  "phases": {
    "0": { "title": "Governance & tooling", "status": "ready", "attempts": 0, "last_verify": null },
    "1": { "title": "Stabilizzazione critica", "status": "pending", "attempts": 0, "last_verify": null },
    "2": { "title": "Layer astrazione provider IA", "status": "pending", "attempts": 0, "last_verify": null },
    "3": { "title": "Onboarding Configura la tua IA", "status": "pending", "attempts": 0, "last_verify": null },
    "4": { "title": "Design system & rifattorizzazione frontend", "status": "pending", "attempts": 0, "last_verify": null },
    "5": { "title": "Redesign wizard + player A/B", "status": "pending", "attempts": 0, "last_verify": null },
    "6": { "title": "Chat IA persistente e seamless", "status": "pending", "attempts": 0, "last_verify": null },
    "7": { "title": "Hardening finale & pre-pubblicazione", "status": "pending", "attempts": 0, "last_verify": null }
  },
  "notes": []
}
```

   Se non sai a che punto era rimasto (i due commit visibili nel repo non bastano a dirlo con
   certezza), imposta prudenzialmente `current_phase: 0`, `phases.0.status: "ready"` e lascia che il
   nuovo `verifier` controlli concretamente cosa è già a posto (test che passano, hook husky presente,
   ecc.) invece di fidarti a memoria — è un controllo economico e ti evita di ripartire da zero per
   errore.

4. **Controlla subito questi 3 punti** (li ho notati dal README/`package.json`, vanno confermati e
   corretti se ancora presenti): `"main": "index.js"` in `package.json` senza quel file + nessuno
   script `start`; licenza `ISC` nel `package.json` contro `MIT` dichiarata nel README; eventuale
   coesistenza di `test-api.js`/`test_phase2.js` (rotti, da rimuovere) con la nuova cartella `test/`.
   Sono correzioni piccole, mettile nella Fase 0 se non sono già coperte.
5. **Riprendi con il comando standard**, invariato:
   ```
   opencode run --agent architect-orchestrator "Leggi implementation/plan_state.json, individua la fase corrente, esegui SOLO quella fase seguendo implementation/phases/phase-N.md, poi fermati e riportami l'esito."
   ```
   Nota l'aggiunta "esegui SOLO quella fase... poi fermati": è la modalità a checkpoint manuale del
   punto 3 sopra. Quando vuoi l'esecuzione automatica di più fasi di fila (es. per farlo girare durante
   la notte), dillo esplicitamente nel prompt: "esegui tutte le fasi in sequenza senza fermarti finché
   non trovi un blocco" — l'orchestratore lo supporta comunque, è solo disattivato di default.

## Se vuoi che ti faccia un audit puntuale del codice reale

Non sono riuscito a leggere i file interni della repo per limiti di GitHub sul crawling automatico.
Se vuoi che confronti byte-per-byte il lavoro fatto col piano, incollami qui in chat (o dammi i link
diretti `blob/main/...`, che riesco ad aprire una volta che me li dai tu) almeno:
`implementation/plan_state.json` attuale, l'ultimo `implementation/reports/phase-N-*.md`, e il
contenuto attuale di `.opencode/agents/architect-orchestrator.md`. Con quello ti do un riscontro preciso
invece che solo strutturale.
