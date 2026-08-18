// Test del vault dei profili IA (Fase 2, punto 6 e 12).
// - round-trip encrypt/decrypt;
// - il file ai-profiles.enc NON contiene la chiave in plaintext;
// - file assente/corrotto → lista vuota senza crash.
const os = require('os');
const path = require('path');
const fs = require('fs');
const { createSecretsVault } = require('../engine/ai/secretsVault');

let tmpDir;
let vault;
let vaultPath;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'peq-ai-vault-'));
  vaultPath = path.join(tmpDir, 'ai-profiles.enc');
  vault = createSecretsVault({ profilesPath: vaultPath });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('Fase 2 — secretsVault (interfaccia safeStorage-ready, fallback dev-only)', () => {
  it('round-trip encrypt/decrypt con una chiave di test fittizia', async () => {
    const key = 'FAKE-PLACEHOLDER-KEY';
    const ciphertext = await vault.encrypt(key);
    expect(ciphertext).not.toContain(key);
    const plaintext = await vault.decrypt(ciphertext);
    expect(plaintext).toBe(key);
  });

  it('saveProfiles/loadProfiles round-trip', async () => {
    const profiles = [
      { id: 'abc', name: 'LM Studio', apiKey: 'FAKE-PLACEHOLDER-KEY', tier: null, active: true }
    ];
    await vault.saveProfiles(profiles);
    const loaded = await vault.loadProfiles();
    expect(loaded).toEqual(profiles);
  });

  it('il file ai-profiles.enc NON contiene la chiave API in plaintext', async () => {
    const key = 'SUPER-SECRET-FAKE-PLACEHOLDER-KEY-123456';
    await vault.saveProfiles([{ id: 'x', name: 'test', apiKey: key }]);
    const raw = fs.readFileSync(vaultPath, 'utf8');
    expect(raw).not.toContain(key);
    expect(raw).not.toContain('SUPER-SECRET');
    expect(raw).not.toContain('apiKey');
  });

  it('loadProfiles su file assente → lista vuota, nessun crash', async () => {
    const result = await vault.loadProfiles();
    expect(result).toEqual([]);
  });

  it('loadProfiles su file corrotto → lista vuota, nessun crash', async () => {
    fs.writeFileSync(vaultPath, 'contenuto-non-cifrato-e-non-valido', 'utf8');
    const result = await vault.loadProfiles();
    expect(result).toEqual([]);
  });

  it('il percorso di default resta fuori dal repo (cartella data/)', () => {
    // Il vault di default NON deve puntare a file versionati.
    const { defaultVault } = require('../engine/ai/secretsVault');
    const p = defaultVault.getPath();
    expect(p).not.toContain('engine');
    expect(p).not.toContain('test');
  });
});