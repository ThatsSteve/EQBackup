'use strict';

/**
 * promptSanitizer.js — sanitizzazione prompt-injection.
 *
 * PUNTO DI APPLICAZIONE (verificabile dai test): ogni input testuale
 * PROVENIENTE DA FONTI WEB/ESTERNE deve passare da qui PRIMA di entrare nei
 * `messages` del prompt. Fonti coperte:
 *   - `extractedFacts` del grafo (inclusi dati da ingestion esterna,
 *     engine/graphEngine.js fetchArtistFromExternalAPI);
 *   - nomi artisti da API esterne (dati web-derived);
 *   - contenuti di file caricati (uploadedFiles);
 *   - qualunque testo RAG hardware.
 *
 * La `userMessage` dell'utente NON è web-derived: va passata come dato, non
 * sanitizzata qui (esce comunque delimitata nel ruolo `user`).
 *
 * Tecnica scelta (documentata): "neutralizza + delimita".
 *   1. strip del contenuto non testuale: tag XML/HTML, chiusure CDATA `]]>`,
 *      fenced code block markdown;
 *   2. escaping/rimozione dei caratteri di controllo (C0/C1);
 *   3. neutralizzazione delle istruzioni malevole note (EN/IT): "ignore
 *      previous instructions", "ignora le istruzioni precedenti", cambio di
 *      persona "you are now", "sei ora", "override/sovrascrivi", riferimenti
 *      al system prompt;
 *   4. la stringa risultante viene poi incapsulata dal chiamante tra marker
 *      `[DATO ESTERNO NON ESECUTIBILE] ... [/DATO]` (vedi aiOrchestrator.js).
 */

// 1. Contenuto non testuale
const XML_CLOSE_TAG = /\]\]>/g;
const HTML_XML_TAGS = /<\/?[a-zA-Z][^>]*>/g;
const MARKDOWN_FENCES = /```[\s\S]*?```/g;

// 2. Caratteri di controllo (C0 senza \n\t, C1, DEL)
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u0080-\u009F]/g;

// 3. Istruzioni malevole note — EN
const EN_IGNORE = /\bignore\s+(all\s+)?(the\s+)?(previous|preceding|above|prior|system|earlier)?\s*(instructions?|prompts?|rules?|directions?|context)\b/gi;
const EN_DISREGARD = /\bdisregard\s+(all\s+)?(the\s+)?(previous|prior|above|system)?\s*(instructions?|rules?|prompts?|directions?|context)\b/gi;
const EN_YOU_ARE_NOW = /\byou\s+are\s+now\b|\bfrom\s+now\s+on\b|\byou\s+must\s+ignore\b/gi;
const EN_OVERRIDE = /\b(override|jailbreak)\b/gi;
// Istruzioni malevole note — IT
const IT_IGNORA = /\bignora\s+(tutte\s+)?(le\s+)?(istruzioni|regole|indicazioni|direttive|prompt|contesto)\s*(precedenti|precedente|precedentemente|di\s+sistema|sopra)?\b/gi;
const IT_SEI_ORA = /\b(sei|ora\s+sei|diventa)\s+(un|una|il|la)\b/gi;
const IT_SOVRASCRIVI = /\b(sovrascrivi|ignora\s+il\s+system|disattiva\s+le\s+regole)\b/gi;
// Riferimenti al system prompt / tag pericolosi
const SYSTEM_PROMPT_REF = /\b(system\s*prompt|sistema\s+prompt|prompt\s+di\s+sistema|developer\s*message)\b/gi;

const NEUTRAL_MARKER = '[istruzione esterna neutralizzata]';

/**
 * Sanitizza una singola stringa web-derived. Helper puro e deterministico.
 */
function sanitizeTextForPrompt(input) {
  if (typeof input !== 'string') return '';
  let text = input;
  text = text.replace(XML_CLOSE_TAG, ' ');
  text = text.replace(HTML_XML_TAGS, ' ');
  text = text.replace(MARKDOWN_FENCES, ' ');
  text = text.replace(CONTROL_CHARS, ' ');
  text = text.replace(EN_IGNORE, NEUTRAL_MARKER);
  text = text.replace(EN_DISREGARD, NEUTRAL_MARKER);
  text = text.replace(EN_YOU_ARE_NOW, NEUTRAL_MARKER);
  text = text.replace(EN_OVERRIDE, NEUTRAL_MARKER);
  text = text.replace(IT_IGNORA, NEUTRAL_MARKER);
  text = text.replace(IT_SEI_ORA, NEUTRAL_MARKER);
  text = text.replace(IT_SOVRASCRIVI, NEUTRAL_MARKER);
  text = text.replace(SYSTEM_PROMPT_REF, NEUTRAL_MARKER);
  // compattazione spazi (preserva un minimo di leggibilità)
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

/**
 * Sanitizza array di stringhe o una singola stringa. Ritorna sempre un array
 * di stringhe non vuote nel caso array, o la stringa nel caso scalare.
 */
function sanitizePromptData(inputs) {
  if (Array.isArray(inputs)) {
    return inputs.map(sanitizeTextForPrompt).filter((s) => s.length > 0);
  }
  return sanitizeTextForPrompt(inputs);
}

/**
 * Incapsula una stringa già sanitizzata tra marker di "dato non eseguibile".
 * Usata dal chiamante per la composizione del prompt.
 */
function wrapAsExternalData(text) {
  return `[DATO ESTERNO NON ESECUTIBILE] ${text} [/DATO]`;
}

module.exports = {
  sanitizeTextForPrompt,
  sanitizePromptData,
  wrapAsExternalData,
  NEUTRAL_MARKER
};