'use strict';

/**
 * registry.js — registro dei profili IA (Adapter Registry).
 *
 * Modello profilo:
 *   { id, name, type, baseUrl, model, apiKey (cifrata via secretsVault,
 *     MAI esposta all'esterno), tier, active, createdAt, updatedAt }
 *   - id: crypto.randomUUID()
 *   - type: 'openai-compatible' | 'anthropic' | 'google-gemini'
 *
 * API: createProfile, getProfile, listProfiles, updateProfile, deleteProfile,
 *      setActiveProfile, getActiveProfile, getActiveAdapter, getAdapter.
 *
 * Persistenza su `ai-profiles.enc` tramite secretsVault (caricamento all'avvio,
 * salvataggio a ogni mutazione). Fallimenti di persistenza MAI fatali:
 *   - file assente al primo avvio → lista vuota;
 *   - file corrotto/non decifrabile → warning generico + lista vuota.
 *
 * Sicurezza: le chiavi API vivono SOLO dentro questo modulo; l'esterno vede
 * `hasApiKey` booleano. `getActiveAdapter()` crea l'adapter con i dati interni
 * senza mai far uscire la chiave.
 */

const crypto = require('crypto');
const { createSecretsVault, defaultVault } = require('./secretsVault');
const { OpenAICompatibleProvider } = require('./adapters/openAICompatible');
const { AnthropicProvider } = require('./adapters/anthropic');
const { GoogleGeminiProvider } = require('./adapters/googleGemini');

const SUPPORTED_TYPES = ['openai-compatible', 'anthropic', 'google-gemini'];

function genericMessage() {
  return 'errore interno del registry';
}

// Copia "pubblica" del profilo: MAI apiKey, solo hasApiKey.
function stripSecret(profile) {
  if (!profile) return profile;
  const { apiKey, ...rest } = profile;
  return { ...rest, hasApiKey: Boolean(apiKey) };
}

function createRegistry({ vault } = {}) {
  const store = vault || defaultVault;
  let profiles = [];
  let loaded = false;

  async function ensureLoaded() {
    if (loaded) return;
    loaded = true;
    try {
      const data = await store.loadProfiles();
      profiles = Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn(`[registry] Impossibile caricare i profili IA (${genericMessage()}).`);
      profiles = [];
    }
  }

  async function persist() {
    await store.saveProfiles(profiles);
  }

  async function createProfile({ name, type, baseUrl, apiKey, model }) {
    await ensureLoaded();
    if (!SUPPORTED_TYPES.includes(type)) {
      throw new Error('Tipo provider non supportato.');
    }
    const now = new Date().toISOString();
    const profile = {
      id: crypto.randomUUID(),
      name: String(name || '').trim(),
      type,
      baseUrl: baseUrl ? String(baseUrl).trim() : '',
      model: model ? String(model).trim() : '',
      apiKey: apiKey ? String(apiKey) : '',
      tier: null,
      active: false,
      createdAt: now,
      updatedAt: now
    };
    profiles.push(profile);
    await persist();
    return stripSecret(profile);
  }

  async function getProfile(id) {
    await ensureLoaded();
    const found = profiles.find((p) => p.id === id);
    return found ? stripSecret(found) : null;
  }

  async function listProfiles() {
    await ensureLoaded();
    return profiles.map(stripSecret);
  }

  async function updateProfile(id, patch = {}) {
    await ensureLoaded();
    const found = profiles.find((p) => p.id === id);
    if (!found) return null;
    const allowed = ['name', 'type', 'baseUrl', 'model', 'apiKey', 'tier'];
    for (const key of allowed) {
      if (key in patch && patch[key] !== undefined) {
        if (key === 'type' && !SUPPORTED_TYPES.includes(patch[key])) {
          throw new Error('Tipo provider non supportato.');
        }
        found[key] = patch[key];
      }
    }
    found.updatedAt = new Date().toISOString();
    await persist();
    return stripSecret(found);
  }

  async function deleteProfile(id) {
    await ensureLoaded();
    const before = profiles.length;
    profiles = profiles.filter((p) => p.id !== id);
    if (profiles.length === before) return false;
    await persist();
    return true;
  }

  async function setActiveProfile(id) {
    await ensureLoaded();
    const target = profiles.find((p) => p.id === id);
    if (!target) return null;
    for (const p of profiles) {
      p.active = p.id === id;
    }
    target.active = true;
    await persist();
    return stripSecret(target);
  }

  async function getActiveProfile() {
    await ensureLoaded();
    const found = profiles.find((p) => p.active);
    return found ? stripSecret(found) : null;
  }

  function createAdapter(profile) {
    if (!profile) return null;
    switch (profile.type) {
      case 'openai-compatible':
        return new OpenAICompatibleProvider(profile);
      case 'anthropic':
        return new AnthropicProvider(profile);
      case 'google-gemini':
        return new GoogleGeminiProvider(profile);
      default:
        return null;
    }
  }

  // Adapter per il profilo attivo, creato con i dati interni (chiave inclusa).
  async function getActiveAdapter() {
    await ensureLoaded();
    const found = profiles.find((p) => p.active);
    return found ? createAdapter(found) : null;
  }

  async function getAdapter(id) {
    await ensureLoaded();
    const found = profiles.find((p) => p.id === id);
    return found ? createAdapter(found) : null;
  }

  return {
    createProfile,
    getProfile,
    listProfiles,
    updateProfile,
    deleteProfile,
    setActiveProfile,
    getActiveProfile,
    getActiveAdapter,
    getAdapter,
    SUPPORTED_TYPES
  };
}

// Istanza singleton usata da server.js e dal motore deterministico.
const defaultRegistry = createRegistry();

module.exports = { createRegistry, defaultRegistry, SUPPORTED_TYPES };