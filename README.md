<div align="center">
  <h1>🎛️ Personal EQ</h1>
  <h3>Intelligent Acoustic Calibration & Semantic DSP Engine</h3>

  <p>
    <img src="https://img.shields.io/badge/Node.js-v18%2B-339933?logo=node.js&style=for-the-badge" alt="Node.js" />
    <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&style=for-the-badge" alt="React" />
    <img src="https://img.shields.io/badge/Vite-646CFF?logo=vite&style=for-the-badge" alt="Vite" />
    <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License: MIT" />
    <img src="https://img.shields.io/badge/Security_Audit-Passed-success?style=for-the-badge" alt="Security Passed" />
    <img src="https://img.shields.io/badge/Local_AI-Ready-ff416c?style=for-the-badge" alt="Local AI Ready" />
  </p>
</div>

---

## 1. Visione Generale

**Personal EQ** colma il divario tra gli equalizzatori avanzati per ingegneri del suono (come Equalizer APO o REW) e gli equalizzatori commerciali banali e limitati. 

Ispirato al lusso e all'estetica dei sistemi di infotainment di fascia altissima (es. Burmester su Mercedes), questo software unisce una calibrazione acustica matematicamente rigorosa a un'interfaccia elegante, guidata semanticamente dall'Intelligenza Artificiale locale. Non avrai più bisogno di calcolare manualmente il fattore di merito (Q) o le risonanze di fase: **esprimi le tue preferenze a parole o seleziona i tuoi artisti preferiti, al resto pensa il DSP Engine.**

---

## 2. Architettura del Sistema & Flusso Dati (RAG & DSP Engine)

Il cuore del sistema opera attraverso una rigida separazione delle responsabilità (Separation of Concerns). Nessuna "allucinazione" dell'IA può corrompere il segnale audio.

```text
+-------------------------------------------------+
|          Input Hardware & Web RAG               |
|  (Selezione Cuffie, DAC, Artisti e Preferenze)  |
+------------------------+------------------------+
                         |
                         v
+------------------------+------------------------+
|    Analisi Semantica LLM (LM Studio / Qwen)     |
| (Traduce intenzioni in vettori da -5.0 a +5.0)  |
+------------------------+------------------------+
                         |
                         v
+------------------------+------------------------+
|           Determined DSP Engine                 |
| (Filtri Fisici, Guardrails e Anti-Clipping)     |
+------------------------+------------------------+
                         |
                         v
+------------------------+------------------------+
|         Live Sync Windows APO & Export          |
|    (Generazione file .txt / JSON Passport)      |
+-------------------------------------------------+
```

### Separazione delle Responsabilità:
- **LLM (LM Studio)**: Opera *esclusivamente* nel dominio semantico. Traduce gli intenti linguistici dell'utente (o i tag generici degli artisti) in vettori normalizzati su 6 bande (valori da `-5.0` a `+5.0`). Non tocca mai i parametri fisici dei filtri.
- **DSP Engine (`coreCalculator.js`)**: Modulo deterministico puro e isolato. Gestisce la vera fisica dei filtri, implementando rigorosi *Guardrails* (limiti fisici invalicabili come Guadagno max [-12dB, +9dB], Fattore Q tra [0.5, 3.5]) e l'algoritmo di **Anti-Clipping** logaritmico basato su una simulazione a 100 punti della risposta in frequenza.

---

## 3. Catalogazione Hardware Massiva & Web RAG Fallback

L'ecosistema sfrutta un approccio **RAG (Retrieval-Augmented Generation)** a 3 livelli per mappare l'hardware dell'utente e neutralizzare le distorsioni della catena:

1. **Database Locale Nativo**:
   - **6.047 Profili Cuffie/IEM** con standard Harman, sincronizzati e processati dal progetto open-source *AutoEq* (dati di Crinacle, Oratory1990, Innerfidelity, Rtings).
   - **78 Profili DAC & Amplificatori** precompilati in `dac_amp_db.json`.
2. **Scraper Web + AI Local (Fallback 1)**: Se l'hardware non è in archivio, il server avvia una scansione web per recuperarne le specifiche (potenza, impedenza) e l'IA locale le interpreta. Le specifiche stimate da euristiche sono marcate come `estimated` e non generano correzioni EQ automatiche.
3. **`ManualSpecsCard` (Fallback 2)**: L'utente può inserire a mano i dati della scheda tecnica dell'amplificatore.

---

## 4. Gestione Artisti On-Demand & Ingestion Semantica

L'equalizzazione si adatta ai tuoi idoli musicali tramite una risoluzione dinamica *on-demand*:

- **MusicBrainz API**: Interrogazione in tempo reale del più grande database musicale globale per estrarre tag, generi secondari ed epoche musicali degli artisti selezionati.
- **Vettorizzazione Acustica**: L'IA esegue l'ingestion dei tag e li proietta su **6 vettori acustici target**:
  1. *Sub-Bass* (20-60Hz)
  2. *Mid-Bass / Punch* (60-250Hz)
  3. *Low-Mids* (250Hz-1kHz)
  4. *High-Mids / Voci* (1kHz-4kHz)
  5. *Presence* (4kHz-8kHz)
  6. *Brilliance / Air* (8kHz-20kHz)
- **Media Ponderata Multi-Artista**: Scegliendo fino a 5 artisti, il motore calcola un centroide acustico in tempo reale per trovare l'impronta timbrica perfetta (es. il punch di *Daft Punk* unito al palcoscenico acustico dei *Pink Floyd*).

---

## 5. Guida al Flusso Utente in 3 Macro-Step

L'interfaccia utente è pensata per una navigazione premium e priva di attriti:

- **STEP 1: Hardware & Profilo Acustico**: Definisci la tua catena (Cuffie, DAC, Amp), la curva di riferimento target (es. Harman 2018) e la tua impronta primaria (artisti e generi), utilizzando Combobox intelligenti e autocompletanti.
- **STEP 2: Tuning d'Ascolto Articolato & Test A/B**: Naviga le 6 bande chirurgiche. Ascolta le differenze in tempo reale tramite il **Player Audio A/B integrato** supportato da Web Audio API (`BiquadFilterNode`). Puoi usare synth reattivi, tracce di test (Sub/Mids/Treble) o fare un upload locale (Drag & Drop) di un tuo file `.mp3`, `.wav` o `.flac`.
- **STEP 3: Studio EQ Finale, Live Sync & Export**: Un colpo d'occhio totale con grafici `Recharts` a doppia curva. Esplora la tabella filtri suddivisa per provenienza (`AUTOEQ`, `ARTISTA`, `MANUALE`). 
  - ⚡ Attiva il **Live Sync Windows APO** (debounce di 200ms) per sentire l'audio di sistema aggiornarsi in contemporanea.
  - Esporta nei formati *Equalizer APO*, *Wavelet* (Android) o salva l'intero *JSON Passport*.

---

## 6. Matrice Matematica & Guardrails Psicoacustici

Il modulo `coreCalculator.js` applica regole matematiche inflessibili per preservare il segnale:

- **Calcolo Preamp Anti-Clipping Assoluto**: 
  Il DSP esegue uno sweep logaritmico su 100 punti (20Hz - 20kHz). Trovato il picco cumulativo, imposta il pre-amplificatore generale per evitare clipping digitale:
  ```math
  dB_{preamp} = -\max(0, PeakGain) - 0.2\text{ dB}
  ```
- **Algoritmo Smoothing / Anti-Prossimità**:
  Se l'utente (o l'IA) tenta di applicare filtri di picco (`Peaking`) sovrapposti con distanza inferiore a 0.5 ottave, il motore interviene espandendo la campana (riducendo il $Q$) per livellare l'anomalia di fase, impedendo suoni metallici o distorsioni armoniche.

---

## 7. Sicurezza, Privacy & Audit Rete

Il software è stato validato tramite severi controlli architetturali per proteggere la tua rete locale e la tua postazione PC.

> [!IMPORTANT]
> **Audit di Sicurezza: PASSATO CON SUCCESSO** 🟢

- **Zero Credenziali Esposte**: Nessuna API key hardcoded o "leaked". I token sono rigidamente gestiti via file `.env` escluso rigorosamente dal tracciamento (`.gitignore`).
- **Isolamento Rete Strict**: Il backend Node.js (`server.js`) è vincolato esclusivamente al loopback (`127.0.0.1`), impedendo l'accesso all'interfaccia o all'API da altri dispositivi sulla LAN/Wi-Fi.
- **Path Traversal Guard**: Scrittura e sincronizzazione del file `PersonalEQ.txt` sanificata, blindata su percorsi hardcoded in C:\Program Files\ per impedire iniezioni o overwrite del file system non autorizzati.

---

## 8. Prerequisiti & Setup Rapido (Local Installation)

L'intero sistema è pensato per funzionare in **locale**, garantendo latenza minima e rispetto assoluto della privacy musicale.

### Prerequisiti:
- **Node.js**: versione v18 o superiore.
- **LM Studio** (o *Ollama*): Per eseguire l'IA localmente. Si consiglia `qwen2.5-7b-instruct` o `gemma-2`.
- (Per Windows) **Equalizer APO**: Per utilizzare la funzione Live Sync di sistema.

### Istruzioni passo-passo:
1. **Clona il repository**:
   ```bash
   git clone https://github.com/ThatsSteve/EQBackup.git
   cd EQBackup
   ```
2. **Installa le dipendenze**:
   ```bash
   npm install
   ```
3. **(Opzionale) Sincronizza i database hardware**:
   ```bash
   npm run sync-autoeq
   npm run sync-dacamp
   ```
4. **Avvia LM Studio**: 
   Fai partire il server locale dal pannello di LM Studio (di default sulla porta `1234`).
5. **Avvia l'ambiente di sviluppo (Frontend + Backend)**:
   ```bash
   npm run dev
   ```
L'interfaccia web sarà disponibile all'indirizzo `http://localhost:5173`.

---

## 9. Comandi Utili CLI (`package.json`)

Di seguito i comandi eseguibili da terminale nella root del progetto:

| Comando | Descrizione |
| :--- | :--- |
| `npm run dev` | Avvia contemporaneamente il backend Express e il frontend Vite. |
| `npm run build` | Esegue la build ottimizzata e minimizzata per la produzione del Frontend. |
| `npm run sync-autoeq` | Scarica e sincronizza l'intero archivio di filtri cuffie (HeSuVi/AutoEq) da GitHub. |
| `npm run sync-dacamp` | Aggiorna e valida l'integrità del DB DAC/Amplificatori. |
| `npm run ingest-artists` | Avvia l'ingestion massiva dei metadati musicali per i nuovi artisti (via API online). |
| `npm run test-artist-incidence` | Esegue i test unitari differenziali per valutare l'impatto semantico di 2 artisti. |

---

## 10. License, Credits & Contributing

Questo software è distribuito sotto licenza **MIT License**. Sei libero di usarlo, modificarlo e distribuirlo a scopo personale e commerciale.

Un ringraziamento speciale all'instancabile community Open Source, e in particolare a:
- **Jaakko Pasanen** (e al team di *AutoEq*) per la fenomenale indicizzazione delle misure in frequenza.
- Al team di **MusicBrainz** per l'archivio musicale pubblico.
- Ai creatori dei LLM Open-Weight, senza i quali l'audio parametrico sarebbe rimasto freddo e accademico.

Se vuoi contribuire: fai un fork, apri una Issue per discutere il bug/feature, e sottometti una Pull Request. Ogni contributo è sempre ben accetto! 🎸

<div align="center">
  <p><i>Cuffie in testa e buon ascolto!</i></p>
</div>
