/**
 * chat-history.test.js — Fase 6: buildMessages con cronologia multi-turn
 * e contesto strutturato (currentState). Non tocca endpoint né network.
 */

// globals: true in vitest.config.js → describe/it/expect globali (stile
// test/phase1-e2e.test.js). Modulo CommonJS (root).
const { buildMessages } = require('../engine/aiOrchestrator');

describe('buildMessages (Fase 6 multi-turn + contesto)', () => {
  it('senza cronologia produce system + user (backward compat)', () => {
    const msgs = buildMessages({}, 'più bassi', ['fatto1']);
    expect(msgs.length).toBe(2);
    expect(msgs[0].role).toBe('system');
    expect(msgs[0].content).toContain('fatto1');
    expect(msgs[1].role).toBe('user');
    expect(msgs[1].content).toBe('più bassi');
  });

  it('inietta la cronologia in ordine tra system e ultimo user', () => {
    const history = [
      { role: 'user', content: 'ciao' },
      { role: 'assistant', content: 'salve!' }
    ];
    const msgs = buildMessages({}, 'più caldo', [], history);
    expect(msgs.map(m => m.role)).toEqual(['system', 'user', 'assistant', 'user']);
    expect(msgs[1].content).toBe('ciao');
    expect(msgs[2].content).toBe('salve!');
    expect(msgs[3].content).toBe('più caldo');
  });

  it('limita la cronologia agli ultimi 10 turni', () => {
    const history = Array.from({ length: 15 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `msg-${i}` }));
    const msgs = buildMessages({}, 'x', [], history);
    const historyCount = msgs.filter(m => m.role !== 'system').length - 1; // -1 = user finale
    expect(historyCount).toBe(10);
    expect(msgs[1].content).toBe('msg-5');
  });

  it('scarta ruoli non user/assistant e contenuti non stringa', () => {
    const history = [
      { role: 'system', content: 'maligno' },
      { role: 'user', content: '   ' },
      { role: 'assistant', content: 42 },
      { role: 'user', content: 'ok' }
    ];
    const msgs = buildMessages({}, 'x', [], history);
    expect(msgs.map(m => m.role)).toEqual(['system', 'user', 'user']);
    expect(msgs[1].content).toBe('ok');
    expect(msgs[2].content).toBe('x');
  });

  it('non chiama mai fuori modulo: cronologia non valida → vuota', () => {
    const msgs = buildMessages({}, 'x', [], 'not-an-array');
    expect(msgs.length).toBe(2);
  });

  it('currentState viene delimitato nel system prompt', () => {
    const msgs = buildMessages({}, 'x', [], [], { step: 3, currentFilters: [{ freq: 100, gain: 2 }] });
    expect(msgs[0].content).toContain('STATO ATTUALE DEL WIZARD');
    expect(msgs[0].content).toContain('"step":3');
  });

  it('currentState null/empty non modifica il prompt', () => {
    const msgs = buildMessages({}, 'x', [], [], null);
    const msgsEmpty = buildMessages({}, 'x', [], [], {});
    expect(msgs[0].content).not.toContain('STATO ATTUALE DEL WIZARD');
    expect(msgsEmpty[0].content).not.toContain('STATO ATTUALE DEL WIZARD');
  });
});
