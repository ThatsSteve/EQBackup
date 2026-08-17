const { queryAudioGraph } = require('./graphEngine');

async function generateAIFilters(aiPayload, userMessage = "", skipLMStudio = false) {
  // 1. Estrai fatti dal Grafo (Context Minimization: max 12 filtri, max 8 fatti testuali)
  const { graphFilters, extractedFacts } = await queryAudioGraph(aiPayload, userMessage);
  const safeGraphFilters = graphFilters.slice(0, 12);
  const safeExtractedFacts = extractedFacts.slice(0, 8);

  // Ottimizzazione Critica: se siamo negli step intermedi di configurazione (1-9) e non c'è una domanda esplicita in chat,
  // restituiamo istantaneamente i filtri del Grafo Locale senza inviare prompt a LM Studio!
  if (skipLMStudio && !userMessage.trim()) {
    return {
      message: "Calcolo filtri istantaneo basato sul Grafo di Conoscenza (Anteprima in tempo reale).",
      desiderata: {},
      graphFilters: safeGraphFilters
    };
  }

  const systemPrompt = `Sei "Personal EQ Concierge", un Master Audio Engineer e Ingegnere Acustico esperto in psicoacustica, DSP e calibrazione di sistemi Hi-Fi.

IL TUO OBIETTIVO E REGOLE DI RISPOSTA:
1. MESSAGGI GENERICI: Se l'utente ti saluta, fa chiacchiere o domande non relative a modifiche audio, rispondi nel campo "message" e lascia vuoto il campo "desiderata".
2. MESSAGGI AUDIO: Se l'utente chiede modifiche sonore (es. "più bassi", "suono più caldo"), valuta i dati in ingresso, definisci i desiderata acustici e spiegalo nel message.
3. DIVIETO ASSOLUTO DI CALCOLO FISICO: NON devi MAI restituire valori di Frequenza (Hz), Guadagno in dB o Fattore Q (q) nel JSON. Il tuo unico scopo è determinare l'intenzione semantica dell'utente.

### 1. COMPRENSIONE DEL PAYLOAD IN INGRESSO (DATI UTENTE)
- hardware: Cuffie, DAC, AMP.
- musicalIdentity: Target Curve (Harman/Flat) e artisti/generi.
- frequencyPreferences: Preferenze su bassi, medi, alti.
- spatial: Ampiezza del soundstage e impatto dinamico.

FATTI TECNICI ESTRATTI DAL NOSTRO GRAFO ACUSTICO:
${safeExtractedFacts.map(f => `- ${f}`).join('\n')}

### 2. REGOLE DI TUNING ACUSTICO (Output richiesto: Desiderata Semantici)
Il JSON "desiderata" DEVE contenere ESCLUSIVAMENTE le seguenti 6 chiavi. 
I valori devono essere compresi tra -5.0 e +5.0 (Float). Metti 0.0 se non vuoi apportare modifiche in quella specifica banda.
- "sub_bass_intent": Da 20Hz a 60Hz. Aumenta per "Rumble" (Hip-Hop, EDM).
- "mid_bass_intent": Da 60Hz a 250Hz. "Punch" e calore. Riduci per togliere "mud".
- "low_mids_intent": Da 250Hz a 1kHz. Corpo di chitarre, voci maschili (low mids).
- "high_mids_intent": Da 1kHz a 4kHz. Presenza, chiarezza, voci femminili.
- "presence_intent": Da 4kHz a 8kHz. Valore negativo per togliere sibilanti, positivo per attacco aggressivo.
- "brilliance_intent": Da 8kHz a 20kHz. Aumenta per "Aria" e spazialità (Soundstage).

### 3. ISTRUZIONI DI OUTPUT STRICTLY JSON
Devi rispondere ESCLUSIVAMENTE in formato JSON RAW. Nessun blocco markdown (\`\`\`json).
Il JSON deve contenere DUE CHIAVI:
1. "message": (String) Risposta testuale all'utente.
2. "desiderata": (Object) Oggetto con ESATTAMENTE le 6 chiavi sopra indicate e valori numerici tra -5.0 e +5.0.

ESEMPIO DI OUTPUT PER SALUTI/NESSUNA MODIFICA:
{
  "message": "Ciao! Sono il tuo Personal EQ Concierge. Come posso migliorare il tuo ascolto oggi?",
  "desiderata": {
    "sub_bass_intent": 0.0,
    "mid_bass_intent": 0.0,
    "low_mids_intent": 0.0,
    "high_mids_intent": 0.0,
    "presence_intent": 0.0,
    "brilliance_intent": 0.0
  }
}

ESEMPIO DI OUTPUT PER MODIFICHE:
{
  "message": "Ho calibrato le tue cuffie per avere bassi profondi per l'EDM, riducendo leggermente la presenza per evitare affaticamento acustico.",
  "desiderata": {
    "sub_bass_intent": 3.0,
    "mid_bass_intent": 0.5,
    "low_mids_intent": 0.0,
    "high_mids_intent": 0.0,
    "presence_intent": -1.5,
    "brilliance_intent": 1.0
  }
}`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage || "Ottimizza il mio profilo audio in base alla mia configurazione corrente." }
  ];

  try {
    // Timeout aumentato a 45 secondi per dare tempo a LM Studio su GPU/CPU locali
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); 

    const response = await fetch('http://localhost:1234/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        messages: messages,
        temperature: 0.3,
        max_tokens: 512
      })
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      let rawContent = data.choices[0].message.content.trim();

      // ESTREMA ROBUSTEZZA PARSING JSON (Estrae solo ciò che sta tra { e })
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        rawContent = jsonMatch[0];
      }

      const parsed = JSON.parse(rawContent);

      let cleanMessage = parsed.message || "Profilo ricalibrato con successo.";
      if (typeof cleanMessage === 'object') {
          cleanMessage = cleanMessage.message || JSON.stringify(cleanMessage);
      } else if (typeof cleanMessage === 'string' && cleanMessage.trim().startsWith('{')) {
          try {
              const innerParsed = JSON.parse(cleanMessage);
              if (innerParsed.message) cleanMessage = innerParsed.message;
          } catch(e) {}
      }

      return {
        message: cleanMessage,
        desiderata: parsed.desiderata || {},
        graphFilters: safeGraphFilters,
        foundArtists: graphResult.foundArtists || []
      };
    }
  } catch (err) {
    console.warn("LM Studio offline o parse error. Utilizzo Fallback Grafo locale.", err.message);
  }

  // Fallback se LM Studio è spento o va in errore
  return {
    message: "[Modalità Locale] Il Motore Semantico (LM Studio) non è raggiungibile. Ho applicato le regole deterministiche base dal Grafo Acustico.",
    desiderata: {},
    graphFilters: safeGraphFilters,
    foundArtists: graphResult.foundArtists || []
  };
}

module.exports = { generateAIFilters };
