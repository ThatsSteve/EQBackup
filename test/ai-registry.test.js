// Test di registry.js (Fase 2, punto 7 e 12).
// - CRUD completo dei profili;
// - listProfiles/getProfile MAI con apiKey (solo hasApiKey);
// - un solo profilo attivo alla volta;
// - persistenza su vault (stessa istanza → ricaricamento corretto);
// - profilo non trovato → null.
const os = require('os');
const path = require('path');
const fs = require('fs');
const { createSecretsVault } = require('../engine/ai/secretsVault');
const { createRegistry } = require('../engine/ai/registry');

let tmpDir;
let vault;
let registry;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'peq-ai-registry-'));
  vault = createSecretsVault({ profilesPath: path.join(tmpDir, 'ai-profiles.enc') });
  registry = createRegistry({ vault });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('Fase 2 — registry (CRUD profili + profilo attivo + persistenza cifrata)', () => {
  it('createProfile valida tipo e non espone mai apiKey', async () => {
    const created = await registry.createProfile({
      name: 'LM Studio',
      type: 'openai-compatible',
      baseUrl: 'http://localhost:1234/v1',
      apiKey: 'FAKE-PLACEHOLDER-KEY',
      model: 'llama-3.2'
    });
    expect(created.id).toBeDefined();
    expect(created.apiKey).toBeUndefined();
    expect(created.hasApiKey).toBe(true);
    expect(created.type).toBe('openai-compatible');

    await expect(registry.createProfile({ name: 'X', type: 'non-supportato' }))
      .rejects.toThrow('Tipo provider non supportato');
  });

  it('getProfile non espone mai apiKey', async () => {
    const created = await registry.createProfile({
      name: 'Claude', type: 'anthropic', baseUrl: 'https://api.anthropic.com', apiKey: 'FAKE-PLACEHOLDER-KEY'
    });
    const profile = await registry.getProfile(created.id);
    expect(profile.apiKey).toBeUndefined();
    expect(profile.hasApiKey).toBe(true);
    expect(await registry.getProfile('inesistente')).toBeNull();
  });

  it('updateProfile modifica i campi ammessi', async () => {
    const created = await registry.createProfile({ name: 'A', type: 'openai-compatible', baseUrl: 'http://a/v1' });
    const updated = await registry.updateProfile(created.id, { tier: 2, model: 'qwen' });
    expect(updated.tier).toBe(2);
    expect(updated.model).toBe('qwen');
    expect(await registry.updateProfile('inesistente', { tier: 1 })).toBeNull();
  });

  it('deleteProfile rimuove e ritorna esito', async () => {
    const created = await registry.createProfile({ name: 'A', type: 'openai-compatible', baseUrl: 'http://a/v1' });
    expect(await registry.deleteProfile(created.id)).toBe(true);
    expect(await registry.deleteProfile(created.id)).toBe(false);
    expect(await registry.listProfiles()).toHaveLength(0);
  });

  it('un solo profilo attivo alla volta (attivare uno disattiva gli altri)', async () => {
    const a = await registry.createProfile({ name: 'A', type: 'openai-compatible', baseUrl: 'http://a/v1' });
    const b = await registry.createProfile({ name: 'B', type: 'openai-compatible', baseUrl: 'http://b/v1' });
    await registry.setActiveProfile(a.id);
    await registry.setActiveProfile(b.id);
    const list = await registry.listProfiles();
    const active = list.filter((p) => p.active);
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe(b.id);
    expect((await registry.getActiveProfile()).id).toBe(b.id);
  });

  it('persistenza: i profili vengono salvati cifrati e ricaricati', async () => {
    const created = await registry.createProfile({
      name: 'P', type: 'anthropic', baseUrl: 'https://api.anthropic.com', apiKey: 'FAKE-PLACEHOLDER-KEY'
    });
    await registry.setActiveProfile(created.id);

    // Nuovo registry che condivide lo STESSO vault (stessa chiave in memoria).
    const reloaded = createRegistry({ vault });
    const list = await reloaded.listProfiles();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('P');
    expect(list[0].active).toBe(true);
    expect(list[0].hasApiKey).toBe(true);
    expect(list[0].apiKey).toBeUndefined();
  });

  it('getActiveAdapter restituisce l\'adapter del profilo attivo', async () => {
    const a = await registry.createProfile({ name: 'A', type: 'openai-compatible', baseUrl: 'http://a/v1', model: 'm' });
    const b = await registry.createProfile({ name: 'B', type: 'openai-compatible', baseUrl: 'http://b/v1', model: 'm' });
    await registry.setActiveProfile(b.id);
    const adapter = await registry.getActiveAdapter();
    expect(adapter).toBeTruthy();
    expect(adapter.baseUrl).toBe('http://b/v1');
    expect(await registry.getActiveAdapter()).toBeTruthy();

    await registry.setActiveProfile(a.id);
    const adapter2 = await registry.getActiveAdapter();
    expect(adapter2.baseUrl).toBe('http://a/v1');
  });
});