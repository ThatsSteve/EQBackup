/**
 * chatPersistence.js — Fase 6: persistenza locale della cronologia chat.
 * Modulo puro (nessun window): lo storage viene iniettato (localStorage).
 * Formato rigido: array di { role: 'user'|'ai'|..., content: string, ... }.
 * Corruzione o formato non valido → null (il chiamante usa il default).
 */

export const CHAT_STORAGE_KEY = 'PEQ_CHAT_HISTORY';
export const MAX_CHAT_MESSAGES = 100;

function isValidMessage(m) {
  return (
    m &&
    (m.role === 'user' || m.role === 'ai' || m.role === 'assistant') &&
    typeof m.content === 'string' &&
    m.content.length > 0 &&
    m.content.length <= 100000
  );
}

export function loadChatHistory(storage) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const clean = parsed.filter(isValidMessage);
    if (clean.length === 0) return null;
    return clean.slice(-MAX_CHAT_MESSAGES);
  } catch {
    return null;
  }
}

export function saveChatHistory(storage, history) {
  if (!storage) return;
  try {
    const clean = Array.isArray(history)
      ? history.filter(isValidMessage).slice(-MAX_CHAT_MESSAGES)
      : [];
    storage.setItem(CHAT_STORAGE_KEY, JSON.stringify(clean));
  } catch {
    // quota esaurita o storage non disponibile: la chat resta in memoria.
  }
}

export function clearChatHistory(storage) {
  if (!storage) return;
  try {
    storage.removeItem(CHAT_STORAGE_KEY);
  } catch {
    // ignora
  }
}
