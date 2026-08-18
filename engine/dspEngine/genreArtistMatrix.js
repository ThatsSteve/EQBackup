/**
 * Modulo isolato per la mappatura proprietaria tra generi, artisti e parametri acustici.
 */
const fs = require('fs');
const path = require('path');

const matrixPath = path.join(__dirname, 'genreArtistMatrix.json');

function getAcousticMatrix() {
  try {
    const data = fs.readFileSync(matrixPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[genreArtistMatrix] Errore lettura JSON:', error);
    return { genres: {}, artists: {}, default: [0,0,0,0,0,0] };
  }
}

function getProfileForGenre(genreList, acousticMatrix) {
  const combinedGenre = (genreList || []).join(' ').toLowerCase();

  if (/electronic|synth|edm|dance|house|techno|dubstep|electro|trance/i.test(combinedGenre)) return acousticMatrix.genres.electronic;
  if (/hip[\s-]?hop|rap|trap|r&b|urban|soul/i.test(combinedGenre)) return acousticMatrix.genres.hiphop;
  if (/rock|metal|punk|grunge|alternative|indie rock|hard/i.test(combinedGenre)) return acousticMatrix.genres.rock;
  if (/acoustic|folk|country|singer|songwriter/i.test(combinedGenre)) return acousticMatrix.genres.acoustic;
  if (/jazz|blues|classical|orchestral|soundtrack|score|opera|ambient/i.test(combinedGenre)) return acousticMatrix.genres.jazz;
  if (/pop|chart|mainstream|vocal/i.test(combinedGenre)) return acousticMatrix.genres.pop;
  if (/gaming|spatial|soundstage|immersive|fps/i.test(combinedGenre)) return acousticMatrix.genres.gaming;

  return acousticMatrix.default;
}

/**
 * Ponderazione Multi-Artista (Max 5).
 * Calcola la media dei profili artistici/generici.
 * Restituisce un oggetto desiderata con le 6 chiavi semantiche.
 */
function calculateWeightedArtistProfile(artists) {
  const defaultDesiderata = {
    sub_bass_intent: 0, mid_bass_intent: 0, low_mids_intent: 0,
    high_mids_intent: 0, presence_intent: 0, brilliance_intent: 0
  };

  if (!artists || artists.length === 0) return defaultDesiderata;

  const acousticMatrix = getAcousticMatrix();
  const maxArtists = artists.slice(0, 5); // Limita a 5 artisti
  let sum = [0, 0, 0, 0, 0, 0];

  maxArtists.forEach(artist => {
    const artistName = (artist.name || '').toLowerCase().trim();
    let profile = acousticMatrix.default;

    if (artistName && acousticMatrix.artists[artistName]) {
      profile = acousticMatrix.artists[artistName];
    } else {
      profile = getProfileForGenre(artist.genres, acousticMatrix);
    }

    for (let i = 0; i < 6; i++) {
      sum[i] += profile[i];
    }
  });

  const count = maxArtists.length;
  const result = {
    sub_bass_intent: Number((sum[0] / count).toFixed(2)),
    mid_bass_intent: Number((sum[1] / count).toFixed(2)),
    low_mids_intent: Number((sum[2] / count).toFixed(2)),
    high_mids_intent: Number((sum[3] / count).toFixed(2)),
    presence_intent: Number((sum[4] / count).toFixed(2)),
    brilliance_intent: Number((sum[5] / count).toFixed(2))
  };

  // Nota sicurezza (Fase 1): i precedenti console.log diagnostici con i nomi
  // degli artisti in chiaro ([ARTIST ENGINE DIAGNOSTIC]) sono stati RIMOSSI:
  // giravano a ogni step del wizard senza servire al debug, esponendo dati utente.

  return result;
}

module.exports = {
  calculateWeightedArtistProfile,
  getProfileForGenre
};
