'use strict';

/**
 * secretsVault.js — cifratura/decifratura dei profili IA.
 *
 * ⚠️  IMPLEMENTAZIONE DEV-ONLY — NON SICURA PER PRODUZIONE ⚠️
 * Fase 2 gira in Node puro (senza Electron). Questo modulo usa `node:crypto`
 * (AES-256-GCM) con una chiave generata casualmente e tenuta SOLO in memoria:
 * - la chiave NON viene mai scritta su disco né loggata;
 * - il file `ai-profiles.enc` non contiene mai chiavi API in plaintext;
 * - la decifratura NON sopravvive al riavvio del processo (chiave effimera):
 *   è un limite intenzionale del fallback dev-only, documentato.
 *
 * INTERFACCIA PRONTA PER Electron safeStorage:
 * Electron sostituirà SOLO l'implementazione interna di `encrypt`/`decrypt`
 * (con `safeStorage.encryptString`/`decryptString`) senza toccare i call site
 * né la firma di `saveProfiles`/`loadProfiles`. I metodi sono async come da
 * contratto del layer.
 *
 * Percorso del file: configurabile via PEQ_AI_PROFILES_PATH (default
 * ./data/ai-profiles.enc, fuori da qualsiasi file versionato; `data/` è in
 * .gitignore). Il file NON è decifrabile da altri processi con chiavi diverse.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DEFAULT_PATH = path.join(__dirname, '..', '..', 'data', 'ai-profiles.enc');
const GCM_IV_LENGTH = 12;
const GCM_TAG_LENGTH = 16;

// Warn una tantum all'avvio (nessun dato personale nel messaggio).
let warnedOnce = false;
function warnDevOnlyOnce() {
  if (warnedOnce) return;
  warnedOnce = true;
  console.warn(
    '[secretsVault] ATTENZIONE: crittografia DEV-ONLY (AES-256-GCM, chiave in memoria). ' +
      'NON sicura per produzione: verrà sostituita da Electron safeStorage.'
  );
}

function sanitizeErrorMessage(err) {
  // Mai loggare err.message/stack di crittografia: potrebbero contenere dettagli interni.
  return 'errore interno del vault';
}

/**
 * Factory del vault. Per i test si passa un `profilesPath` su dir temporanea.
 */
function createSecretsVault({ profilesPath } = {}) {
  const filePath = profilesPath || process.env.PEQ_AI_PROFILES_PATH || DEFAULT_PATH;

  // Warn una tantum: il fallback dev-only (chiave effimera in memoria) deve
  // essere sempre segnalato all'avvio, in qualunque istanza venga creata.
  warnDevOnlyOnce();

  // Chiave effimera: generata al boot del processo, SOLO in memoria.
  const key = crypto.randomBytes(32);

  async function encrypt(plaintext) {
    const iv = crypto.randomBytes(GCM_IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  async function decrypt(ciphertext) {
    const buf = Buffer.from(String(ciphertext), 'base64');
    if (buf.length < GCM_IV_LENGTH + GCM_TAG_LENGTH) {
      throw new Error('ciphertext non valido');
    }
    const iv = buf.subarray(0, GCM_IV_LENGTH);
    const tag = buf.subarray(GCM_IV_LENGTH, GCM_IV_LENGTH + GCM_TAG_LENGTH);
    const data = buf.subarray(GCM_IV_LENGTH + GCM_TAG_LENGTH);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }

  async function saveProfiles(profiles) {
    const ciphertext = await encrypt(JSON.stringify(profiles));
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, ciphertext, 'utf8');
  }

  async function loadProfiles() {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const ciphertext = fs.readFileSync(filePath, 'utf8');
    try {
      const plaintext = await decrypt(ciphertext);
      const parsed = JSON.parse(plaintext);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      // File corrotto o chiave diversa (es. riavvio): warning generico, partenza
      // con lista vuota. MAI crash all'avvio, MAI dati sensibili nel log.
      console.warn(`[secretsVault] File profili illeggibile o non decifrabile; avvio con lista vuota (${sanitizeErrorMessage(err)}).`);
      return [];
    }
  }

  return {
    encrypt,
    decrypt,
    saveProfiles,
    loadProfiles,
    getPath: () => filePath
  };
}

// Istanza di default usata da registry/server in produzione/dev.
const defaultVault = createSecretsVault();

module.exports = { createSecretsVault, defaultVault, warnDevOnlyOnce };