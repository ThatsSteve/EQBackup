/**
 * genreDefaults.js — Fase 4: mapping generi → preferenze timbriche di default.
 *
 * Estratto da App.jsx:1307-1338 (pre-Fase 4) senza modifiche di contenuto.
 * Usato da WizardShell.handleNextStep (validazione step 2, comportamento
 * identico: applica i defaults dinamici prima di NEXT_STEP).
 */

export function mapGenresToDefaults(genres) {
    let prefs = {
        sub_bass_gain: 0, mid_bass_gain: 0,
        low_mids_gain: 0, high_mids_gain: 0,
        presence_gain: 0, brilliance_gain: 0
    };
    const combined = genres.join(' ').toLowerCase();

    if (combined.includes('hip-hop') || combined.includes('edm')) {
        prefs.sub_bass_gain = 4.5; prefs.mid_bass_gain = 3.5;
        prefs.low_mids_gain = -1.5; prefs.high_mids_gain = -2.0;
        prefs.presence_gain = 1.5; prefs.brilliance_gain = 1.5;
    } else if (combined.includes('rock') || combined.includes('metal')) {
        prefs.sub_bass_gain = 2.5; prefs.mid_bass_gain = 2.0;
        prefs.low_mids_gain = 1.5; prefs.high_mids_gain = 3.0;
    } else if (combined.includes('jazz') || combined.includes('classica')) {
        prefs.low_mids_gain = 2.0; prefs.high_mids_gain = 1.0;
        prefs.presence_gain = 2.5; prefs.brilliance_gain = 3.5;
    } else if (combined.includes('pop') || combined.includes('r&b')) {
        prefs.sub_bass_gain = 2.5; prefs.mid_bass_gain = 2.0;
        prefs.low_mids_gain = 1.5; prefs.high_mids_gain = 3.0;
        prefs.presence_gain = 1.5; prefs.brilliance_gain = 1.5;
    } else if (combined.includes('acustico')) {
        prefs.sub_bass_gain = -2.0; prefs.mid_bass_gain = -1.5;
        prefs.low_mids_gain = 2.0; prefs.high_mids_gain = 1.0;
    } else if (combined.includes('gaming')) {
        prefs.sub_bass_gain = 2.5; prefs.mid_bass_gain = 2.0;
        prefs.low_mids_gain = -1.5; prefs.high_mids_gain = -2.0;
        prefs.presence_gain = 2.5; prefs.brilliance_gain = 3.5;
    }
    return prefs;
}