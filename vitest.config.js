// Config Vitest per la root del progetto (CommonJS).
// Include SOLO i test in test/** per non pescare i test del frontend (ESM) durante
// il run root: la pipeline frontend gira separatamente con `npm --prefix frontend test`.
// `globals: true` permette di usare describe/it/expect senza import ESM (Vitest 4
// non è più importabile via require() da un modulo CommonJS).
module.exports = {
  test: {
    include: ['test/**/*.test.js'],
    globals: true,
  },
};