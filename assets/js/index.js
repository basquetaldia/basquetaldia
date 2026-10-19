import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js"
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"

const firebaseConfig = {
    apiKey: "AIzaSyAZsBvyg9LV72Qv1_bwXKvISJ72rBRD4E8",
    authDomain: "basquet-al-dia.firebaseapp.com",
    projectId: "basquet-al-dia",
    storageBucket: "basquet-al-dia.firebasestorage.app",
    messagingSenderId: "31463533110",
    appId: "1:31463533110:web:edb2442f9403af8064c697"
}

const app = initializeApp(firebaseConfig)
const dbFire = getFirestore(app)
const defaultLogo = "assets/image/favicon.png"

// Configuración global de las ligas soportadas y sus enlaces
const leagueConfig = {
    "liga_nacional": { name: "Liga Nacional", hasStats: false, logo: "assets/image/lnb.svg?v=2", url: "liganacional.html" },
    "liga_argentina": { name: "Liga Argentina", hasStats: false, logo: "assets/image/TNA.svg", url: "ligaargentina.html" },
    "liga_femenina": { name: "Liga Femenina", hasStats: false, logo: "assets/image/LFB.svg", url: "ligafemenina.html" },
    "liga_metropolitana": { name: "Liga Metropolitana", hasStats: true, logo: "assets/image/ligametro.png", url: "premetro.html" }
}

let allDBs = {};
let currentHubDate = new Date(); 

async function initHub() {
    const promises = Object.keys(leagueConfig).map(async (leagueKey) => {
        try {
            const docRef = doc(dbFire, leagueKey, "data_v1");
            const snap = await getDoc(docRef);
            if(snap.exists()) {
                allDBs[leagueKey] = snap.data();
            } else {
                allDBs[leagueKey] = { teams: [], matches: [], phases: [], channels: [] };
            }
        } catch(e) {
            console.error("Error cargando " + leagueKey, e);
            allDBs[leagueKey] = { teams: [], matches: [], phases: [], channels: [] };
        }
    });

    await Promise.all(promises);
    window.setToday(); 
}

// ----------------------------------------------------
// NAVEGACIÓN DE FECHAS
// ----------------------------------------------------
window.setToday = () => {
    currentHubDate = new Date();
    updateHubDateUI();
}

window.changeHubDay = (offset) => {
    currentHubDate.setDate(currentHubDate.getDate() + offset);
    updateHubDateUI();
}

window.syncHubDate = () => {
    const val = document.getElementById('hubDateSelect').value;
    if(val) {
        const [y, m, d] = val.split('-');
        currentHubDate = new Date(y, m-1, d);
        updateHubDateUI();
    }
}

function updateHubDateUI() {
    const yyyy = currentHubDate.getFullYear(); 
    const mm = String(currentHubDate.getMonth() + 1).padStart(2, '0'); 
    const dd = String(currentHubDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    
    document.getElementById('hubDateSelect').value = dateStr;
    
    const realToday = new Date();
    const isToday = (realToday.getFullYear() === currentHubDate.getFullYear() && realToday.getMonth() === currentHubDate.getMonth() && realToday.getDate() === currentHubDate.getDate());
    
    document.getElementById('hub-date-display').innerText = (isToday ? 'HOY ' : '') + `${dd}/${mm}`;
    
    window.loadHubMatches();
}

// ----------------------------------------------------
// LÓGICA DE PARTIDOS
// ----------------------------------------------------
function getTeamRecord(db, teamName, phase) {
    let wins = 0; let losses = 0;
    if(!db || !db.matches) return "0-0";
    db.matches.forEach(m => {
        const matchPhase = m.phase || "Fase Regular";
        if (m.homePts !== '-' && m.awayPts !== '-' && matchPhase === phase) {
            const h = parseInt(m.homePts); const a = parseInt(m.awayPts);
            if (m.home === teamName) { if (h > a) wins++; else if (h < a) losses++; } 
            else if (m.away === teamName) { if (a > h) wins++; else if (a < h) losses++; }
        }
    });
    return `${wins}-${losses}`;
}

window.loadHubMatches = () => {
    const dateVal = document.getElementById('hubDateSelect').value;
    const container = document.getElementById('matches-hub');
    if(!dateVal) return;

    let html = '';
    let hasAnyMatch = false;

    Object.keys(leagueConfig).forEach(leagueKey => {
        const config = leagueConfig[leagueKey];
        const db = allDBs[leagueKey];
        if(!db || !db.matches) return;

        const dayMatches = db.matches.filter(m => m.date === dateVal);
        if(dayMatches.length === 0) return;

        hasAnyMatch = true;

        const grouped = {};
        dayMatches.forEach(m => {
            const phase = m.phase || "Fase Regular";
            let subdivision = "";
            if (m.conference) subdivision = " - Conferencia " + m.conference;
            else if (m.zone) subdivision = " - Zona " + m.zone;
            
            const groupKey = `${phase}${subdivision}`;
            if(!grouped[groupKey]) grouped[groupKey] = [];
            grouped[groupKey].push(m);
        });

        html += `
        <div class="promiedos-league-card">
            <a href="${config.url}" class="promiedos-league-header">
                <img src="${config.logo}" alt="${config.name}" onerror="this.src='assets/image/favicon.png'">
                <h2>${config.name}</h2>
                <i class="ri-arrow-right-s-line" style="margin-left:auto; font-size:1.5rem;"></i>
            </a>
        `;

        Object.keys(grouped).sort().forEach(groupName => {
            html += `<div class="promiedos-group-title">${groupName}</div>`;
            
            grouped[groupName].sort((a,b) => (a.time || "00:00").localeCompare(b.time || "00:00")).forEach(m => {
                const phaseMatched = m.phase || "Fase Regular";
                const tHome = db.teams.find(t => t.name === m.home) || { code: m.home.substring(0,3).toUpperCase(), logo: defaultLogo };
                const tAway = db.teams.find(t => t.name === m.away) || { code: m.away.substring(0,3).toUpperCase(), logo: defaultLogo };
                
                const hCode = tHome.code || m.home.substring(0,3).toUpperCase();
                const aCode = tAway.code || m.away.substring(0,3).toUpperCase();
                
                const hRec = getTeamRecord(db, m.home, phaseMatched);
                const aRec = getTeamRecord(db, m.away, phaseMatched);

                // Auto-asignar Basket.tv si es Liga Metro y no tiene canal
                let finalChannel = m.channel;
                if (leagueKey === 'liga_metropolitana' && (!finalChannel || finalChannel.trim() === '')) {
                    finalChannel = 'Basket.tv';
                }

                let channelHtml = '';
                if(finalChannel && finalChannel.trim() !== '') {
                    const cObj = db.channels ? db.channels.find(c => c.name.toLowerCase() === finalChannel.toLowerCase()) : null;
                    if(cObj) {
                        channelHtml = `<img src="${cObj.logo}" title="${cObj.name}" style="height: 18px; object-fit: contain; margin-top: 5px; border-radius: 4px; background: white; padding: 2px;">`;
                    } else if (finalChannel.toLowerCase() === 'basket.tv') {
                        // REGLA ESPECÍFICA PARA EL LOGO DE BASKET.TV
                        channelHtml = `<img src="assets/image/bpass.png" title="Basket.tv" style="height: 18px; object-fit: contain; margin-top: 5px; border-radius: 4px; background: white; padding: 2px;">`;
                    } else {
                        channelHtml = `<span style="font-size: 0.65rem; color: var(--cool-gray); display:block; margin-top: 4px; font-weight:800; text-transform:uppercase;">${finalChannel}</span>`;
                    }
                }

                const isFinished = m.homePts !== '-' && m.awayPts !== '-';
                let scoreHtml = '';
                if(isFinished) {
                    const hPts = parseInt(m.homePts); const aPts = parseInt(m.awayPts);
                    const hWin = hPts > aPts ? 'color: var(--accent-color);' : '';
                    const aWin = aPts > hPts ? 'color: var(--accent-color);' : '';
                    scoreHtml = `<div class="pm-score-col"><span style="${hWin}">${m.homePts}</span><span style="font-size:0.8rem; color:var(--cool-gray);">-</span><span style="${aWin}">${m.awayPts}</span></div>`;
                } else {
                    scoreHtml = `<div class="pm-score-vs">vs</div>`;
                }

                let actionBtn = '';
                if (isFinished) {
                    if (config.hasStats) {
                        actionBtn = `<button class="pm-btn stats" onclick="openHubModal('${leagueKey}', '${m.id}', 'stats')" title="Ver Estadísticas"><i class="ri-bar-chart-box-line"></i></button>`;
                    }
                } else {
                    actionBtn = `<button class="pm-btn" onclick="openHubModal('${leagueKey}', '${m.id}', 'info')" title="Información del Partido"><i class="ri-information-line"></i></button>`;
                }

                html += `
                <div class="promiedos-match-row">
                    
                    <div class="pm-time-col">
                        <span style="display:flex; align-items:center; justify-content:center; gap:3px;"><i class="ri-time-line"></i> ${m.time || '--:--'}</span>
                        ${channelHtml}
                    </div>

                    <div class="pm-team-home">
                        <div class="pm-team-details dir-home">
                            <span class="pm-team-name" title="${m.home}">${hCode}</span>
                            <span class="pm-team-record">(${hRec})</span>
                        </div>
                        <img src="${tHome.logo}" class="pm-logo" onerror="this.src='assets/image/favicon.png'">
                    </div>

                    ${scoreHtml}

                    <div class="pm-team-away">
                        <img src="${tAway.logo}" class="pm-logo" onerror="this.src='assets/image/favicon.png'">
                        <div class="pm-team-details dir-away">
                            <span class="pm-team-name" title="${m.away}">${aCode}</span>
                            <span class="pm-team-record">(${aRec})</span>
                        </div>
                    </div>

                    <div class="pm-action-col">
                        ${actionBtn}
                    </div>

                </div>`;
            });
        });
        html += `</div>`;
    });

    if(!hasAnyMatch) {
        html = `<div style="background: var(--card-bg); border: 1px dashed var(--border-color); border-radius: 12px; padding: 50px 20px; text-align: center;">
            <i class="ri-calendar-close-line" style="font-size: 3rem; color: var(--cool-gray); display:block; margin-bottom:10px;"></i>
            <h3 style="margin:0; color: var(--text-main);">Sin partidos programados</h3>
            <p style="color: var(--cool-gray); margin-top:5px;">No se encontraron encuentros en ninguna competencia para esta fecha.</p>
        </div>`;
    }

    container.innerHTML = html;
}

// ----------------------------------------------------------------------
// MODALES REDISEÑADOS (SCOREBOARD UNIFICADO + BARRAS)
// ----------------------------------------------------------------------

function formatHubDate(dateStr) {
    if (!dateStr) return '-- / -- / ----';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]} / ${parts[1]} / ${parts[0]}`;
    return dateStr;
}

window.openHubModal = (leagueKey, matchId, mode) => {
    const db = allDBs[leagueKey];
    const config = leagueConfig[leagueKey];
    if(!db || !config) return;

    const m = db.matches.find(x => String(x.id) === String(matchId));
    if(!m) return;

    const modalContent = document.getElementById('hub-modal-content');
    const tHome = db.teams.find(t => t.name === m.home) || { logo: defaultLogo, stadium: '' };
    const tAway = db.teams.find(t => t.name === m.away) || { logo: defaultLogo };
    const phase = m.phase || "Fase Regular";
    const isFinished = m.homePts !== '-' && m.awayPts !== '-';

    const hRec = getTeamRecord(db, m.home, phase);
    const aRec = getTeamRecord(db, m.away, phase);

    // 1. HEADER UNIFICADO (Scoreboard)
    let html = `
        <button onclick="closeHubModal()" class="close-modal-btn" style="border:none; background:transparent; font-size:1.5rem; top:10px; right:10px;"><i class="ri-close-line"></i></button>
        
        <div style="text-align: center; margin-bottom: 20px;">
            <img src="${config.logo}" style="height:35px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));">
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; background: var(--bg-base); padding: 25px 15px; border-radius: 16px; border: 1px solid var(--border-color); margin-bottom: 25px; box-shadow: inset 0 2px 10px rgba(0,0,0,0.02);">
            
            <div style="display:flex; flex-direction:column; align-items:center; flex: 1; width: 33%; text-align:center;">
                <img src="${tHome.logo}" style="width: 70px; height: 70px; object-fit: contain; margin-bottom: 10px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));">
                <h3 style="margin:0; font-size: 0.95rem; color: var(--text-main); line-height:1.2;">${m.home}</h3>
                <span style="font-size:0.75rem; color:var(--cool-gray); font-weight:800; background: var(--card-bg); padding: 2px 8px; border-radius: 4px; border: 1px solid var(--border-color); display:inline-block; margin-top:8px;">${hRec}</span>
            </div>
            
            <div style="display:flex; flex-direction:column; align-items:center; width: 33%; padding: 0 10px; text-align:center;">
                ${isFinished ? 
                    `<div class="modal-main-score">${m.homePts} -${m.awayPts}</div>
                     <div style="font-size: 0.75rem; color: white; background: #10b981; font-weight: 900; text-transform: uppercase; margin-top:10px; padding: 4px 12px; border-radius: 12px; display:inline-block; letter-spacing:1px;">FINAL</div>` 
                    : 
                    `<div style="font-size: 1.5rem; font-weight: 900; color: var(--cool-gray); background: var(--card-bg); padding: 8px 15px; border-radius: 8px; border: 1px solid var(--border-color); display:inline-block;">VS</div>
                     <div style="font-size: 0.75rem; color: var(--cool-gray); font-weight: 900; text-transform: uppercase; margin-top:10px; letter-spacing: 1px;">PREVIA</div>`
                }
            </div>

            <div style="display:flex; flex-direction:column; align-items:center; flex: 1; width: 33%; text-align:center;">
                <img src="${tAway.logo}" style="width: 70px; height: 70px; object-fit: contain; margin-bottom: 10px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));">
                <h3 style="margin:0; font-size: 0.95rem; color: var(--text-main); line-height:1.2;">${m.away}</h3>
                <span style="font-size:0.75rem; color:var(--cool-gray); font-weight:800; background: var(--card-bg); padding: 2px 8px; border-radius: 4px; border: 1px solid var(--border-color); display:inline-block; margin-top:8px;">${aRec}</span>
            </div>

        </div>
    `;

    // 2. MODO INFO (Previa)
    if (mode === 'info') {
        const stadium = m.stadium && m.stadium.trim() !== '' ? m.stadium : (tHome.stadium || 'Estadio a definir');
        const formattedDate = formatHubDate(m.date);

        // Forzar Basket.tv si es metro
        let finalChannel = m.channel;
        if (leagueKey === 'liga_metropolitana' && (!finalChannel || finalChannel.trim() === '')) {
            finalChannel = 'Basket.tv';
        }

        let channelInfoRow = '';
        if (finalChannel && finalChannel.trim() !== '') {
            const channels = db.channels || [];
            const channelObj = channels.find(c => c.name.toLowerCase() === finalChannel.toLowerCase());
            let channelDisplay = '';
            
            if (channelObj) {
                channelDisplay = `<img src="${channelObj.logo}" title="${channelObj.name}" style="height: 25px; object-fit: contain; background: white; padding: 2px; border-radius: 4px; border: 1px solid var(--border-color);">`;
            } else if (finalChannel.toLowerCase() === 'basket.tv') {
                // REGLA ESPECÍFICA PARA EL LOGO DE BASKET.TV EN EL MODAL DE INFO
                channelDisplay = `<img src="assets/image/bpass.png" title="Basket.tv" style="height: 25px; object-fit: contain; background: white; padding: 2px; border-radius: 4px; border: 1px solid var(--border-color);">`;
            } else {
                channelDisplay = `<span style="font-weight:900; color:var(--text-main); font-size: 1.1rem;">${finalChannel}</span>`;
            }
            
            channelInfoRow = `
            <div style="background: var(--bg-base); border: 1px solid var(--border-color); border-radius: 12px; padding: 15px; display:flex; align-items:center; gap:15px;">
                <div style="width:45px; height:45px; background:var(--card-bg); border-radius:10px; display:flex; justify-content:center; align-items:center; color:var(--accent-color); font-size:1.5rem; box-shadow: 0 2px 6px rgba(0,0,0,0.03); border: 1px solid var(--border-color);">
                    <i class="ri-tv-2-line"></i>
                </div>
                <div>
                    <span style="display:block; font-size:0.75rem; color:var(--cool-gray); font-weight:800; text-transform:uppercase;">Transmisión</span>
                    <div style="margin-top: 4px; display:flex; align-items:center;">${channelDisplay}</div>
                </div>
            </div>`;
        }

        html += `
        <h4 style="text-align:left; margin-bottom:15px; font-size:1rem; color:var(--text-main);"><i class="ri-information-line" style="color:var(--accent-color);"></i> Detalles del Encuentro</h4>
        <div style="display:flex; flex-direction:column; gap:12px;">
            
            <div style="background: var(--bg-base); border: 1px solid var(--border-color); border-radius: 12px; padding: 15px; display:flex; align-items:center; gap:15px;">
                <div style="width:45px; height:45px; background:var(--card-bg); border-radius:10px; display:flex; justify-content:center; align-items:center; color:var(--accent-color); font-size:1.5rem; box-shadow: 0 2px 6px rgba(0,0,0,0.03); border: 1px solid var(--border-color);">
                    <i class="ri-calendar-event-line"></i>
                </div>
                <div>
                    <span style="display:block; font-size:0.75rem; color:var(--cool-gray); font-weight:800; text-transform:uppercase;">Fecha y Hora</span>
                    <span style="font-size:1.1rem; font-weight:900; color:var(--text-main);">${formattedDate} <span style="color:var(--cool-gray); font-weight:700; margin:0 5px;">|</span> ${m.time || '--:--'} Hs</span>
                </div>
            </div>

            <div style="background: var(--bg-base); border: 1px solid var(--border-color); border-radius: 12px; padding: 15px; display:flex; align-items:center; gap:15px;">
                <div style="width:45px; height:45px; background:var(--card-bg); border-radius:10px; display:flex; justify-content:center; align-items:center; color:var(--accent-color); font-size:1.5rem; box-shadow: 0 2px 6px rgba(0,0,0,0.03); border: 1px solid var(--border-color);">
                    <i class="ri-map-pin-line"></i>
                </div>
                <div>
                    <span style="display:block; font-size:0.75rem; color:var(--cool-gray); font-weight:800; text-transform:uppercase;">Ubicación / Estadio</span>
                    <span style="font-size:1.1rem; font-weight:900; color:var(--text-main);">${stadium}</span>
                </div>
            </div>

            ${channelInfoRow}

        </div>`;
    } 
    // 3. MODO STATS (Finalizado)
    else if (mode === 'stats' && config.hasStats) {
        const sH = (m.stats && m.stats.home) ? m.stats.home : {}; 
        const sA = (m.stats && m.stats.away) ? m.stats.away : {};
        
        const buildStatBarRow = (label, hVal, aVal, inverse = false) => {
            const hNum = parseFloat(hVal) || 0; const aNum = parseFloat(aVal) || 0;
            let hWin = false, aWin = false;
            
            if (hNum !== aNum) {
                if (inverse) { hWin = hNum < aNum; aWin = aNum < hNum; } 
                else { hWin = hNum > aNum; aWin = aNum > hNum; }
            }
            
            let hPct = 50, aPct = 50;
            const total = hNum + aNum;
            if (total > 0) { hPct = (hNum / total) * 100; aPct = (aNum / total) * 100; } 
            else if (hNum === 0 && aNum === 0) { hPct = 0; aPct = 0; }

            const hColor = hWin ? 'var(--accent-color)' : 'var(--cool-gray)';
            const aColor = aWin ? 'var(--accent-color)' : 'var(--cool-gray)';
            const hText = hWin ? 'var(--accent-color)' : 'var(--text-main)';
            const aText = aWin ? 'var(--accent-color)' : 'var(--text-main)';

            return `
            <div style="margin-bottom: 20px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
                    <span style="font-weight: 900; font-size: 1.1rem; color: ${hText}; width: 40px; text-align: left;">${hVal || '-'}</span>
                    <span style="font-size: 0.8rem; font-weight: 800; color: var(--cool-gray); text-transform: uppercase; letter-spacing: 0.5px;">${label}</span>
                    <span style="font-weight: 900; font-size: 1.1rem; color: ${aText}; width: 40px; text-align: right;">${aVal || '-'}</span>
                </div>
                <div style="display:flex; gap:6px; height: 8px;">
                    <div style="flex:1; background: var(--bg-base); border-radius:4px; overflow:hidden; display:flex; justify-content:flex-end;">
                        <div style="width: ${hPct}%; background: ${hColor}; border-radius:4px;"></div>
                    </div>
                    <div style="flex:1; background: var(--bg-base); border-radius:4px; overflow:hidden;">
                        <div style="width: ${aPct}%; background: ${aColor}; border-radius:4px;"></div>
                    </div>
                </div>
            </div>`;
        };

        const buildSimpleRow = (label, hVal, aVal) => {
            const hNum = parseFloat(hVal) || 0; const aNum = parseFloat(aVal) || 0;
            const hWin = hNum > aNum; const aWin = aNum > hNum;
            return `
            <div style="display: flex; justify-content: space-between; padding: 10px 5px; border-bottom: 1px dashed var(--border-color); font-size: 1rem;">
                <span style="font-weight: 900; color: ${hWin ? 'var(--accent-color)' : 'var(--text-main)'}; width: 40px; text-align:left;">${hVal || '-'}</span>
                <span style="font-weight: 800; font-size:0.8rem; color: var(--cool-gray); text-transform:uppercase;">${label}</span>
                <span style="font-weight: 900; color: ${aWin ? 'var(--accent-color)' : 'var(--text-main)'}; width: 40px; text-align:right;">${aVal || '-'}</span>
            </div>`;
        };

        html += `<h4 style="text-align:center; background:var(--bg-base); padding:8px; border-radius:6px; margin-bottom:15px; font-size:0.85rem; color:var(--primary); text-transform:uppercase; border:1px solid var(--border-color);"><i class="ri-bar-chart-box-line"></i> Estadísticas Globales</h4>`;
        html += buildStatBarRow('Rebotes Totales', sH.reb, sA.reb);
        html += buildStatBarRow('Rebotes Ofensivos', sH.oreb, sA.oreb);
        html += buildStatBarRow('Asistencias', sH.ast, sA.ast);
        html += buildStatBarRow('Robos', sH.stl, sA.stl);
        html += buildStatBarRow('Pérdidas', sH.tov, sA.tov, true);

        html += `<h4 style="text-align:center; background:var(--bg-base); padding:8px; border-radius:6px; margin:25px 0 15px; font-size:0.85rem; color:var(--primary); text-transform:uppercase; border:1px solid var(--border-color);"><i class="ri-timer-line"></i> Puntos por Cuarto</h4>`;
        ['q1','q2','q3','q4'].forEach((k,i) => { html += buildSimpleRow(`${i+1}° Cuarto`, sH[k], sA[k]); });
        let ot=1; while(sH[`ot${ot}`] || sA[`ot${ot}`]) { html += buildSimpleRow(`Suple ${ot}`, sH[`ot${ot}`], sA[`ot${ot}`]); ot++; }
    }

    modalContent.innerHTML = html;
    document.getElementById('hub-modal').classList.remove('hidden');
}

window.closeHubModal = () => {
    document.getElementById('hub-modal').classList.add('hidden');
}

initHub();
