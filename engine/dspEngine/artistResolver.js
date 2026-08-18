const fs = require('fs');
const path = require('path');
const https = require('https');
const { getProfileForGenre } = require('./genreArtistMatrix'); // Importa la logica per tradurre generi in intenti

const MATRIX_PATH = path.join(__dirname, 'genreArtistMatrix.json');
const USER_AGENT = 'PersonalEQ/3.1 ( https://github.com/ThatsSteve/EQBackup )';
const REQUEST_TIMEOUT_MS = 8000;

// Esegue il fetch da MusicBrainz
function fetchArtistTagsFromMusicBrainz(artistName) {
    return new Promise((resolve, reject) => {
        const query = encodeURIComponent(artistName);
        const url = `https://musicbrainz.org/ws/2/artist/?query=${query}&fmt=json`;
        
        const options = {
            headers: {
                'User-Agent': USER_AGENT
            }
        };

        https.get(url, options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.artists && parsed.artists.length > 0) {
                            // Prendi il primo risultato
                            const artist = parsed.artists[0];
                            const tags = (artist.tags || []).map(t => t.name.toLowerCase());
                            resolve({ name: artist.name, tags });
                        } else {
                            resolve({ name: artistName, tags: [] }); // Non trovato, restituisco array vuoto
                        }
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    reject(new Error(`MusicBrainz Error: ${res.statusCode}`));
                }
            });
        }).on('error', reject)
          .setTimeout(REQUEST_TIMEOUT_MS, function () {
              this.destroy(new Error('MusicBrainz timeout'));
          });
    });
}

/**
 * Risolve un artista online, calcola il vettore semantico in base ai tag, e lo salva in locale
 */
async function resolveArtistOnline(artistName) {
    console.log(`[ArtistResolver] Cerco online: '${artistName}'...`);
    
    try {
        const { name: resolvedName, tags } = await fetchArtistTagsFromMusicBrainz(artistName);
        
        if (!tags || tags.length === 0) {
            console.log(`[ArtistResolver] Nessun tag trovato per '${artistName}'. Uso profilo neutro.`);
            return null; // Il backend ignorerà o userà default
        }

        console.log(`[ArtistResolver] Trovato '${resolvedName}' con i tag: ${tags.slice(0,5).join(', ')}`);

        // Calcoliamo i vettori in base ai tags. 
        // Possiamo usare `getProfileForGenre(tags)` visto che l'abbiamo isolato in genreArtistMatrix.js
        let matrixData = { genres: {}, artists: {}, default: [0,0,0,0,0,0] };
        if (fs.existsSync(MATRIX_PATH)) {
            matrixData = JSON.parse(fs.readFileSync(MATRIX_PATH, 'utf8'));
        }

        const intentVector = getProfileForGenre(tags, matrixData);
        
        // Upsert
        const dbKey = resolvedName.toLowerCase();
        if (!matrixData.artists) matrixData.artists = {};
        
        matrixData.artists[dbKey] = intentVector;
        fs.writeFileSync(MATRIX_PATH, JSON.stringify(matrixData, null, 2), 'utf8');

        console.log(`[ArtistResolver] Artista salvato nel DB locale: ${dbKey} -> [${intentVector}]`);
        
        return {
            name: resolvedName,
            genres: tags,
            origin: `ARTISTA: ${resolvedName} (Risolto Online)` // Per il DSP
        };

    } catch (err) {
        console.error(`[ArtistResolver] Errore risoluzione online: ${err.message}`);
        return null;
    }
}

module.exports = {
    resolveArtistOnline
};
