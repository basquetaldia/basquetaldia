import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js"
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"

const firebaseConfig = {
    apiKey: "AIzaSyAZsBvyg9LV72Qv1_bwXKvISJ72rBRD4E8",
    authDomain: "basquet-al-dia.firebaseapp.com",
    projectId: "basquet-al-dia",
    storageBucket: "basquet-al-dia.firebasestorage.app",
    messagingSenderId: "31463533110",
    appId: "1:31463533110:web:edb2442f9403af8064c697",
    measurementId: "G-FLCRWB0RRP"
}

const app = initializeApp(firebaseConfig)
const dbFire = getFirestore(app)
const defaultLogo = "assets/image/favicon.png"

let localDB = { teams: [], matches: [], phases: [] }

async function initApp() {
    try {
        const docRef = doc(dbFire, "liga_metropolitana", "data_v1")
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
            localDB = docSnap.data()
            populatePhases()
        } 
    } catch (error) { 
        console.error("Error conectando a la base de datos:", error) 
    }
}
initApp()

function populatePhases() {
    const phaseSelect = document.getElementById('phaseSelect');
    if(!phaseSelect) return;
    let options = '';
    
    if(localDB.phases && localDB.phases.length > 0) {
        localDB.phases.forEach(p => {
            const phaseName = typeof p === 'string' ? p : p.name;
            options += `<option value="${phaseName}">${phaseName}</option>`;
        });
    } else {
        options = `<option value="Fase Regular">Fase Regular</option>`;
    }
    
    phaseSelect.innerHTML = options;
    window.updatePublicZoneSelect();
}

window.toggleMainView = (view) => {
    const btnZone = document.getElementById('btn-view-zone')
    const btnDaily = document.getElementById('btn-view-daily')
    const zoneFilters = document.getElementById('zone-filters')
    const dailyFilters = document.getElementById('daily-filters')
    const zoneContent = document.getElementById('view-zone-content')
    const dailyContent = document.getElementById('view-daily-content')

    if (view === 'zone') {
        btnZone.classList.add('active'); btnDaily.classList.remove('active')
        zoneFilters.classList.remove('hidden'); dailyFilters.classList.add('hidden')
        zoneContent.classList.remove('hidden'); dailyContent.classList.add('hidden')
    } else {
        btnDaily.classList.add('active'); btnZone.classList.remove('active')
        dailyFilters.classList.remove('hidden'); zoneFilters.classList.add('hidden')
        dailyContent.classList.remove('hidden'); zoneContent.classList.add('hidden')
        if(!document.getElementById('dailyDateSelect').value) window.setToday()
        else window.loadDailyMatches()
    }
}

window.setToday = () => {
    const today = new Date(); const yyyy = today.getFullYear(); const mm = String(today.getMonth() + 1).padStart(2, '0'); const dd = String(today.getDate()).padStart(2, '0')
    document.getElementById('dailyDateSelect').value = `${yyyy}-${mm}-${dd}`
    window.loadDailyMatches()
}

window.updatePublicZoneSelect = () => {
    const phase = document.getElementById('phaseSelect').value;
    const zoneSelect = document.getElementById('zoneSelect');
    const teamFilter = document.getElementById('teamFilterSelect');
    if(!zoneSelect) return;

    const uniqueZones = [...new Set(localDB.teams.filter(t => t.phase === phase || (!t.phase && phase === "Fase Regular")).map(t => t.zone))];
    
    let options = '<option value="">Seleccionar Zona...</option>';
    uniqueZones.sort().forEach(z => {
        options += `<option value="${z}">${z}</option>`;
    });

    zoneSelect.innerHTML = options;
    zoneSelect.disabled = uniqueZones.length === 0;

    if(teamFilter) {
        teamFilter.innerHTML = '<option value="">Todos los equipos</option>';
        teamFilter.disabled = true;
    }

    document.getElementById('matches-container').innerHTML = '<p style="text-align:center; color:#888; padding:30px;">Selecciona una zona para ver los partidos.</p>';
    document.getElementById('standings-body').innerHTML = '<tr><td colspan="8" style="text-align:center; color:#888; padding:30px;">Esperando selección...</td></tr>';
};

window.loadData = () => {
    const phase = document.getElementById('phaseSelect').value
    const zoneCode = document.getElementById('zoneSelect').value
    if (!zoneCode) return
    
    const zoneTeams = localDB.teams.filter(t => t.zone === zoneCode && (!t.phase || t.phase === phase))
    const zoneMatches = localDB.matches.filter(m => m.zone === zoneCode && (!m.phase || m.phase === phase))
    const teamFilter = document.getElementById('teamFilterSelect')

    if (teamFilter) {
        teamFilter.innerHTML = '<option value="">Todos los equipos</option>'
        teamFilter.disabled = false
        zoneTeams.sort((a,b) => a.name.localeCompare(b.name)).forEach(t => {
            const opt = document.createElement('option'); opt.value = t.name; opt.textContent = t.name; teamFilter.appendChild(opt)
        })
    }
    
    renderMatches(zoneMatches, localDB.teams)
    renderStandings(zoneTeams, zoneMatches)
}

window.filterMatchesByTeam = () => {
    const phase = document.getElementById('phaseSelect').value
    const zoneCode = document.getElementById('zoneSelect').value
    const selectedTeam = document.getElementById('teamFilterSelect').value
    if (!zoneCode) return
    
    let filteredMatches = localDB.matches.filter(m => m.zone === zoneCode && (!m.phase || m.phase === phase))
    if (selectedTeam) {
        filteredMatches = filteredMatches.filter(m => m.home === selectedTeam || m.away === selectedTeam)
    }
    renderMatches(filteredMatches, localDB.teams)
}

function getTeamRecord(teamName, phase) {
    let wins = 0; let losses = 0;
    localDB.matches.forEach(m => {
        const matchPhase = m.phase || "Fase Regular";
        if (m.homePts !== '-' && m.awayPts !== '-' && matchPhase === phase) {
            const h = parseInt(m.homePts); const a = parseInt(m.awayPts);
            if (m.home === teamName) {
                if (h > a) wins++; else if (h < a) losses++;
            } else if (m.away === teamName) {
                if (a > h) wins++; else if (a < h) losses++;
            }
        }
    });
    return `${wins}-${losses}`;
}

window.loadDailyMatches = () => {
    const dateVal = document.getElementById('dailyDateSelect').value
    const container = document.getElementById('daily-matches-container')
    if(!dateVal) return

    const matches = localDB.matches.filter(m => m.date === dateVal)
    if(matches.length === 0) {
        container.innerHTML = '<div class="stat-card"><p style="text-align:center; color:#888; font-weight:600; padding:30px;">No hay partidos programados para esta fecha.</p></div>'
        return
    }

    const grouped = {}
    matches.forEach(m => { 
        const phaseName = m.phase || "Fase Regular";
        const groupKey = `${phaseName} - Zona ${m.zone}`;
        if(!grouped[groupKey]) grouped[groupKey] = []; 
        grouped[groupKey].push(m);
    })

    let html = ''
    Object.keys(grouped).sort().forEach(group => {
        html += `
        <details class="daily-accordion" open>
            <summary>📍 ${group}</summary>
            <div class="daily-accordion-content">`
        
        grouped[group].sort((a, b) => {
            const timeA = a.time || "00:00";
            const timeB = b.time || "00:00";
            return timeB.localeCompare(timeA);
        }).forEach(m => {
            const phaseMatched = m.phase || "Fase Regular";
            const homeTeam = localDB.teams.find(t => t.name === m.home && (t.phase === phaseMatched || !t.phase)) || localDB.teams.find(t => t.name === m.home) || { logo: defaultLogo };
            const awayTeam = localDB.teams.find(t => t.name === m.away && (t.phase === phaseMatched || !t.phase)) || localDB.teams.find(t => t.name === m.away) || { logo: defaultLogo };
            
            const hLogo = homeTeam.logo; const aLogo = awayTeam.logo;
            const hCode = homeTeam.code || m.home.substring(0,3).toUpperCase(); 
            const aCode = awayTeam.code || m.away.substring(0,3).toUpperCase();
            
            const hRecord = getTeamRecord(m.home, phaseMatched);
            const aRecord = getTeamRecord(m.away, phaseMatched);

            let actionButtons = ''; 
            if (m.homePts !== '-' && m.awayPts !== '-') {
                actionButtons = `<button class="dmc-btn" onclick="openPublicStatsModal('${m.id}')"><i class="ri-bar-chart-box-line"></i> Estadísticas</button>`
            } else {
                actionButtons = `<button class="dmc-btn" onclick="openComparisonModal('${m.id}')"><i class="ri-scales-3-line"></i> Comparativa Previa</button>`
            }

            const hPts = parseInt(m.homePts); const aPts = parseInt(m.awayPts);
            const hWin = !isNaN(hPts) && !isNaN(aPts) && hPts > aPts ? 'winner' : '';
            const aWin = !isNaN(hPts) && !isNaN(aPts) && aPts > hPts ? 'winner' : '';
            
            const stadiumName = m.stadium && m.stadium.trim() !== '' ? m.stadium : 'Estadio a definir';
            const timeStr = m.time ? m.time : '--:--';
            const statusStr = (m.homePts !== '-' && m.awayPts !== '-') ? 'Finalizado' : 'Pendiente';

            html += `
            <div class="daily-match-card">
                <div class="dmc-info">
                    <span class="dmc-time">${timeStr}</span>
                    <span class="dmc-status">${statusStr}</span>
                </div>
                <div class="dmc-teams">
                    <div class="dmc-team-row">
                        <div class="dmc-team-left">
                            <img src="${hLogo}" class="dmc-logo">
                            <div class="dmc-name-box">
                                <span class="dmc-name">${hCode}</span>
                                <span class="dmc-record">(${hRecord})</span>
                            </div>
                        </div>
                        <span class="dmc-score ${hWin}">${m.homePts !== '-' ? m.homePts : '-'}</span>
                    </div>
                    <div class="dmc-team-row">
                        <div class="dmc-team-left">
                            <img src="${aLogo}" class="dmc-logo">
                            <div class="dmc-name-box">
                                <span class="dmc-name">${aCode}</span>
                                <span class="dmc-record">(${aRecord})</span>
                            </div>
                        </div>
                        <span class="dmc-score ${aWin}">${m.awayPts !== '-' ? m.awayPts : '-'}</span>
                    </div>
                    <div style="font-size:0.75rem; color:var(--cool-gray); margin-top:6px; display:flex; align-items:center; gap:5px;"><i class="ri-map-pin-line"></i> ${stadiumName}</div>
                </div>
                <div class="dmc-actions">
                    ${actionButtons}
                </div>
            </div>`
        })
        html += `</div></details>`
    })
    container.innerHTML = html
}

function renderMatches(matches, allTeams) {
    const container = document.getElementById('matches-container')
    container.innerHTML = ''
    
    if (matches.length === 0) { 
        container.innerHTML = '<p style="text-align:center; color:#888; padding:30px;">No hay partidos cargados para esta selección.</p>'
        return
    }

    const grouped = {}
    matches.forEach(m => { 
        if (!grouped[m.round]) grouped[m.round] = []
        grouped[m.round].push(m)
    })
    
    const rounds = Object.keys(grouped).sort((a, b) => {
        const numA = a.match(/\d+/) ? parseInt(a.match(/\d+/)[0]) : 0;
        const numB = b.match(/\d+/) ? parseInt(b.match(/\d+/)[0]) : 0;
        if (numA !== numB) return numA - numB;
        return a.localeCompare(b);
    });
    
    let isFirst = true

    rounds.forEach(round => {
        const activeClass = isFirst ? 'active' : ''
        const showClass = isFirst ? 'show' : ''
        isFirst = false
        let matchesHtml = ''

        grouped[round].sort((a, b) => {
            const dateTimeA = new Date((a.date || '1970-01-01') + 'T' + (a.time || '00:00'))
            const dateTimeB = new Date((b.date || '1970-01-01') + 'T' + (b.time || '00:00'))
            return dateTimeB - dateTimeA
        }).forEach(m => {
            const phaseMatched = m.phase || "Fase Regular";
            const homeTeam = allTeams.find(t => t.name === m.home && (t.phase === phaseMatched || !t.phase)) || allTeams.find(t => t.name === m.home) || { logo: defaultLogo };
            const awayTeam = allTeams.find(t => t.name === m.away && (t.phase === phaseMatched || !t.phase)) || allTeams.find(t => t.name === m.away) || { logo: defaultLogo };
            
            const hLogo = homeTeam.logo; const aLogo = awayTeam.logo;
            const hCode = homeTeam.code || m.home.substring(0,3).toUpperCase(); 
            const aCode = awayTeam.code || m.away.substring(0,3).toUpperCase();
            
            const hRecord = getTeamRecord(m.home, phaseMatched);
            const aRecord = getTeamRecord(m.away, phaseMatched);

            let actionButtons = ''; 
            let rowClick = '';
            
            if (m.homePts !== '-' && m.awayPts !== '-') {
                actionButtons = `<button class="dmc-btn" onclick="openPublicStatsModal('${m.id}')"><i class="ri-bar-chart-box-line"></i> Estadísticas</button>`
                rowClick = `onclick="openPublicStatsModal('${m.id}')"`
            } else {
                actionButtons = `<button class="dmc-btn" onclick="openComparisonModal('${m.id}')"><i class="ri-scales-3-line"></i> Comparativa Previa</button>`
                rowClick = `onclick="openComparisonModal('${m.id}')"`
            }

            const hPts = parseInt(m.homePts); const aPts = parseInt(m.awayPts);
            const hWin = !isNaN(hPts) && !isNaN(aPts) && hPts > aPts ? 'winner' : '';
            const aWin = !isNaN(hPts) && !isNaN(aPts) && aPts > hPts ? 'winner' : '';
            
            const stadiumName = m.stadium && m.stadium.trim() !== '' ? m.stadium : 'Estadio a definir';
            const timeStr = m.time ? m.time : '--:--';
            const statusStr = (m.homePts !== '-' && m.awayPts !== '-') ? 'Finalizado' : 'Pendiente';
            const dateInfo = formatDateInfo(m.date);

            matchesHtml += `
            <div class="daily-match-card" style="cursor: pointer;" ${rowClick}>
                <div class="dmc-info">
                    <span style="font-size:0.75rem; color:var(--cool-gray); font-weight:800; margin-bottom:4px;"><i class="ri-calendar-line"></i> ${dateInfo.dateShort}</span>
                    <span class="dmc-time">${timeStr}</span>
                    <span class="dmc-status">${statusStr}</span>
                </div>
                <div class="dmc-teams">
                    <div class="dmc-team-row">
                        <div class="dmc-team-left">
                            <img src="${hLogo}" class="dmc-logo">
                            <div class="dmc-name-box">
                                <span class="dmc-name">${hCode}</span>
                                <span class="dmc-record">(${hRecord})</span>
                            </div>
                        </div>
                        <span class="dmc-score ${hWin}">${m.homePts !== '-' ? m.homePts : '-'}</span>
                    </div>
                    <div class="dmc-team-row">
                        <div class="dmc-team-left">
                            <img src="${aLogo}" class="dmc-logo">
                            <div class="dmc-name-box">
                                <span class="dmc-name">${aCode}</span>
                                <span class="dmc-record">(${aRecord})</span>
                            </div>
                        </div>
                        <span class="dmc-score ${aWin}">${m.awayPts !== '-' ? m.awayPts : '-'}</span>
                    </div>
                    <div style="font-size:0.75rem; color:var(--cool-gray); margin-top:6px; display:flex; align-items:center; gap:5px;"><i class="ri-map-pin-line"></i> ${stadiumName}</div>
                </div>
                <div class="dmc-actions" onclick="event.stopPropagation();">
                    ${actionButtons}
                </div>
            </div>`
        })

        container.innerHTML += `
            <div class="round-wrapper">
                <div class="round-header ${activeClass}" onclick="toggleRound(this)"><span>${round}</span><i class='bx bx-chevron-down arrow-icon'></i></div>
                <div class="round-content ${showClass}">${matchesHtml}</div>
            </div>`
    })
}

window.toggleCompStats = (view) => {
    if(view === 'afavor') {
        document.getElementById('btn-afavor').classList.add('active'); document.getElementById('btn-encontra').classList.remove('active')
        document.getElementById('comp-home-stats-afavor').style.display = 'block'; document.getElementById('comp-away-stats-afavor').style.display = 'block'
        document.getElementById('comp-home-stats-encontra').style.display = 'none'; document.getElementById('comp-away-stats-encontra').style.display = 'none'
    } else {
        document.getElementById('btn-encontra').classList.add('active'); document.getElementById('btn-afavor').classList.remove('active')
        document.getElementById('comp-home-stats-encontra').style.display = 'block'; document.getElementById('comp-away-stats-encontra').style.display = 'block'
        document.getElementById('comp-home-stats-afavor').style.display = 'none'; document.getElementById('comp-away-stats-afavor').style.display = 'none'
    }
}

function getTeamSeasonStats(teamName) {
    let gamesPlayed = 0, statsGames = 0, wins = 0, losses = 0
    let totals = { 
        pts: 0, opp_pts: 0, reb: 0, oreb: 0, ast: 0, stl: 0, tov: 0, 
        q1: 0, q2: 0, q3: 0, q4: 0, 
        opp_q1: 0, opp_q2: 0, opp_q3: 0, opp_q4: 0,
        opp_reb: 0, opp_oreb: 0, opp_ast: 0, opp_stl: 0, opp_tov: 0 
    };

    localDB.matches.forEach(m => {
        if (m.homePts === '-' || m.awayPts === '-') return
        const matchPhase = m.phase || "Fase Regular";

        if (matchPhase !== "Fase Regular") return; 

        let isHome = m.home === teamName
        let isAway = m.away === teamName

        if (isHome || isAway) {
            gamesPlayed++
            let myPts = parseInt(isHome ? m.homePts : m.awayPts) || 0
            let oppPts = parseInt(isHome ? m.awayPts : m.homePts) || 0
            
            totals.pts += myPts; totals.opp_pts += oppPts
            if (myPts > oppPts) wins++; else if (myPts < oppPts) losses++

            let teamStats = null, oppStats = null
            if (m.stats) {
                teamStats = isHome ? m.stats.home : m.stats.away
                oppStats = isHome ? m.stats.away : m.stats.home
            }

            if (teamStats && Object.keys(teamStats).length > 0) {
                statsGames++
                totals.reb += parseInt(teamStats.reb) || 0; totals.oreb += parseInt(teamStats.oreb) || 0
                totals.ast += parseInt(teamStats.ast) || 0; totals.stl += parseInt(teamStats.stl) || 0; totals.tov += parseInt(teamStats.tov) || 0
                totals.q1 += parseInt(teamStats.q1) || 0; totals.q2 += parseInt(teamStats.q2) || 0; totals.q3 += parseInt(teamStats.q3) || 0; totals.q4 += parseInt(teamStats.q4) || 0
            }

            if (oppStats && Object.keys(oppStats).length > 0) {
                totals.opp_q1 += parseInt(oppStats.q1) || 0; totals.opp_q2 += parseInt(oppStats.q2) || 0
                totals.opp_q3 += parseInt(oppStats.q3) || 0; totals.opp_q4 += parseInt(oppStats.q4) || 0
                totals.opp_reb += parseInt(oppStats.reb) || 0; totals.opp_oreb += parseInt(oppStats.oreb) || 0;
                totals.opp_ast += parseInt(oppStats.ast) || 0; totals.opp_stl += parseInt(oppStats.stl) || 0;
                totals.opp_tov += parseInt(oppStats.tov) || 0;
            }
        }
    })

    return {
        record: `${wins}-${losses}`,
        pts: gamesPlayed > 0 ? (totals.pts / gamesPlayed).toFixed(1) : '-', opp_pts: gamesPlayed > 0 ? (totals.opp_pts / gamesPlayed).toFixed(1) : '-',
        q1: statsGames > 0 ? (totals.q1 / statsGames).toFixed(1) : '-', q2: statsGames > 0 ? (totals.q2 / statsGames).toFixed(1) : '-', q3: statsGames > 0 ? (totals.q3 / statsGames).toFixed(1) : '-', q4: statsGames > 0 ? (totals.q4 / statsGames).toFixed(1) : '-',
        opp_q1: statsGames > 0 ? (totals.opp_q1 / statsGames).toFixed(1) : '-', opp_q2: statsGames > 0 ? (totals.opp_q2 / statsGames).toFixed(1) : '-', opp_q3: statsGames > 0 ? (totals.opp_q3 / statsGames).toFixed(1) : '-', opp_q4: statsGames > 0 ? (totals.opp_q4 / statsGames).toFixed(1) : '-',
        reb: statsGames > 0 ? (totals.reb / statsGames).toFixed(1) : '-', oreb: statsGames > 0 ? (totals.oreb / statsGames).toFixed(1) : '-', ast: statsGames > 0 ? (totals.ast / statsGames).toFixed(1) : '-', stl: statsGames > 0 ? (totals.stl / statsGames).toFixed(1) : '-', tov: statsGames > 0 ? (totals.tov / statsGames).toFixed(1) : '-',
        opp_reb: statsGames > 0 ? (totals.opp_reb / statsGames).toFixed(1) : '-', opp_oreb: statsGames > 0 ? (totals.opp_oreb / statsGames).toFixed(1) : '-', opp_ast: statsGames > 0 ? (totals.opp_ast / statsGames).toFixed(1) : '-', opp_stl: statsGames > 0 ? (totals.opp_stl / statsGames).toFixed(1) : '-', opp_tov: statsGames > 0 ? (totals.opp_tov / statsGames).toFixed(1) : '-'
    }
}

window.openComparisonModal = (matchId) => {
    const m = localDB.matches.find(x => String(x.id) === String(matchId))
    if(!m) return
    window.toggleCompStats('afavor')
    
    const phaseMatched = m.phase || "Fase Regular";
    const homeTeam = localDB.teams.find(t => t.name === m.home && (t.phase === phaseMatched || !t.phase)) || localDB.teams.find(t => t.name === m.home) || { logo: defaultLogo };
    const awayTeam = localDB.teams.find(t => t.name === m.away && (t.phase === phaseMatched || !t.phase)) || localDB.teams.find(t => t.name === m.away) || { logo: defaultLogo };
    
    const hLogo = homeTeam.logo; const aLogo = awayTeam.logo;

    const hStats = getTeamSeasonStats(m.home)
    const aStats = getTeamSeasonStats(m.away)

    document.getElementById('comp-home-name').innerHTML = `<img src="${hLogo}" class="modal-team-logo"><br>${m.home}<br><span style="font-size: 0.85rem; color: var(--cool-gray); font-weight: 700; text-transform: none;">Récord Fase Reg.: ${hStats.record}</span>`
    document.getElementById('comp-away-name').innerHTML = `<img src="${aLogo}" class="modal-team-logo"><br>${m.away}<br><span style="font-size: 0.85rem; color: var(--cool-gray); font-weight: 700; text-transform: none;">Récord Fase Reg.: ${aStats.record}</span>`

    const buildCompRow = (label, hVal, aVal, inverse = false) => {
        const hNum = parseFloat(hVal); const aNum = parseFloat(aVal)
        let hWin = false; let aWin = false

        if (!isNaN(hNum) && !isNaN(aNum) && hNum !== aNum) {
            if (inverse) { hWin = hNum < aNum; aWin = aNum < hNum } 
            else { hWin = hNum > aNum; aWin = aNum > hNum }
        }

        const hRow = `<div class="modal-stat-row"><span class="modal-stat-label">${label}</span><span class="modal-stat-value ${hWin ? 'winner-stat' : ''}">${hVal}</span></div>`
        const aRow = `<div class="modal-stat-row"><span class="modal-stat-label">${label}</span><span class="modal-stat-value ${aWin ? 'winner-stat' : ''}">${aVal}</span></div>`
        return { hRow, aRow }
    }

    let hAFavor = '<h4 class="stat-section-title"><i class="ri-timer-line"></i> A Favor x Cuarto</h4>'
    let aAFavor = '<h4 class="stat-section-title"><i class="ri-timer-line"></i> A Favor x Cuarto</h4>'
    const qKeys = ['q1', 'q2', 'q3', 'q4']; const qLabels = ['1° Cuarto', '2° Cuarto', '3° Cuarto', '4° Cuarto']
    qKeys.forEach((k, i) => { const res = buildCompRow(qLabels[i], hStats[k], aStats[k]); hAFavor += res.hRow; aAFavor += res.aRow; })

    hAFavor += '<h4 class="stat-section-title" style="margin-top:20px;"><i class="ri-bar-chart-box-line"></i> Generales (Positivas)</h4>'
    aAFavor += '<h4 class="stat-section-title" style="margin-top:20px;"><i class="ri-bar-chart-box-line"></i> Generales (Positivas)</h4>'
    
    const posKeys = ['pts', 'reb', 'oreb', 'ast', 'stl', 'opp_tov']; 
    const posLabels = ['Puntos a Favor', 'Rebotes Totales', 'Rebotes Ofensivos', 'Asistencias', 'Robos', 'Pérdidas Forzadas']
    posKeys.forEach((k, i) => { const res = buildCompRow(posLabels[i], hStats[k], aStats[k]); hAFavor += res.hRow; aAFavor += res.aRow; })

    let hEnContra = '<h4 class="stat-section-title"><i class="ri-shield-line"></i> En Contra x Cuarto</h4>'
    let aEnContra = '<h4 class="stat-section-title"><i class="ri-shield-line"></i> En Contra x Cuarto</h4>'
    const oppQKeys = ['opp_q1', 'opp_q2', 'opp_q3', 'opp_q4'];
    oppQKeys.forEach((k, i) => { const res = buildCompRow(qLabels[i], hStats[k], aStats[k], true); hEnContra += res.hRow; aEnContra += res.aRow; })

    hEnContra += '<h4 class="stat-section-title" style="margin-top:20px;"><i class="ri-error-warning-line"></i> Generales (Negativas)</h4>'
    aEnContra += '<h4 class="stat-section-title" style="margin-top:20px;"><i class="ri-error-warning-line"></i> Generales (Negativas)</h4>'
    
    const negKeys = ['opp_pts', 'opp_reb', 'opp_oreb', 'opp_ast', 'opp_stl', 'tov']; 
    const negLabels = ['Puntos Permitidos', 'Rebotes Permitidos', 'Reb. Of. Permitidos', 'Asistencias Permitidas', 'Robos Permitidos', 'Pérdidas Propias']
    negKeys.forEach((k, i) => { const res = buildCompRow(negLabels[i], hStats[k], aStats[k], true); hEnContra += res.hRow; aEnContra += res.aRow; })

    document.getElementById('comp-home-stats-afavor').innerHTML = hAFavor; document.getElementById('comp-away-stats-afavor').innerHTML = aAFavor
    document.getElementById('comp-home-stats-encontra').innerHTML = hEnContra; document.getElementById('comp-away-stats-encontra').innerHTML = aEnContra

    const h2hMatches = localDB.matches.filter(match => 
        ((match.home === m.home && match.away === m.away) || (match.home === m.away && match.away === m.home)) &&
        match.homePts !== '-' && match.awayPts !== '-'
    ).sort((a, b) => new Date(b.date) - new Date(a.date));

    let h2hHtml = '';
    if (h2hMatches.length > 0) {
        h2hHtml += `<h4 class="stat-section-title" style="margin-top:30px;"><i class="ri-history-line"></i> Historial de Enfrentamientos Previos</h4>`;
        h2hHtml += `<div style="display:flex; flex-direction:column; gap:10px;">`;
        h2hMatches.forEach(match => {
            const dateInfo = formatDateInfo(match.date);
            const hasStats = match.stats && Object.keys(match.stats.home || {}).length > 0;
            let btnHtml = '';
            
            if(hasStats) {
                btnHtml = `<button class="dmc-btn" style="padding: 6px 12px; font-size: 0.8rem; width: auto;" onclick="closeComparisonModal(); openPublicStatsModal('${match.id}')"><i class="ri-bar-chart-box-line"></i> Ver Stats</button>`;
            }
            
            h2hHtml += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-base); padding:12px 15px; border-radius:8px; border:1px solid var(--border-color); flex-wrap:wrap; gap:10px;">
                <div style="display:flex; flex-direction:column; gap:3px;">
                    <span style="font-size:0.75rem; color:var(--cool-gray); font-weight:700;"><i class="ri-calendar-event-line"></i> ${dateInfo.dateShort} - ${match.phase || 'Torneo'}</span>
                    <span style="font-size:0.95rem; font-weight:800; color:var(--text-main);">${match.home} <span style="color:var(--accent-color);">${match.homePts} - ${match.awayPts}</span> ${match.away}</span>
                </div>
                ${btnHtml}
            </div>`;
        });
        h2hHtml += `</div>`;
    } else {
        h2hHtml += `<h4 class="stat-section-title" style="margin-top:30px;"><i class="ri-history-line"></i> Historial de Enfrentamientos Previos</h4>`;
        h2hHtml += `<p style="text-align:center; font-size:0.85rem; color:var(--cool-gray); padding: 10px;">No hay enfrentamientos previos registrados con resultado final.</p>`;
    }
    
    document.getElementById('h2h-container').innerHTML = h2hHtml;
    document.getElementById('comparison-modal').classList.remove('hidden')
};

window.closeComparisonModal = () => { document.getElementById('comparison-modal').classList.add('hidden')}

window.openPublicStatsModal = (matchId) => {
    const m = localDB.matches.find(x => String(x.id) === String(matchId))
    if(!m) return
    
    const teamLink = `equipo.html?liga=liga_metropolitana&equipo=${encodeURIComponent(m.home)}`;
    
    const homeTeam = localDB.teams.find(t => t.name === m.home) || { logo: defaultLogo };
    const awayTeam = localDB.teams.find(t => t.name === m.away) || { logo: defaultLogo };
    
    const hLogo = homeTeam.logo; const aLogo = awayTeam.logo;

    document.getElementById('ps-match-title').innerText = `${m.home} vs ${m.away}`
    document.getElementById('ps-match-score').innerText = `${m.homePts} - ${m.awayPts}`
    
    document.getElementById('ps-home-name').innerHTML = `<img src="${hLogo}" class="modal-team-logo"><br>${m.home}`
    document.getElementById('ps-away-name').innerHTML = `<img src="${aLogo}" class="modal-team-logo"><br>${m.away}`
    
    document.getElementById('ps-stats-grid').classList.remove('hidden')
    
    const sHome = (m.stats && m.stats.home) ? m.stats.home : {}
    const sAway = (m.stats && m.stats.away) ? m.stats.away : {}
    
    let hQuarters = '', aQuarters = ''
    const qKeys = ['q1', 'q2', 'q3', 'q4']; const qLabels = ['1° Cuarto', '2° Cuarto', '3° Cuarto', '4° Cuarto']

    const buildStatRow = (label, hVal, aVal, inverse = false, labelColor = '') => {
        const hNum = parseInt(hVal); const aNum = parseInt(aVal)
        let hWin = false; let aWin = false

        if (!isNaN(hNum) && !isNaN(aNum) && hNum !== aNum) {
            if (inverse) { hWin = hNum < aNum; aWin = aNum < hNum } 
            else { hWin = hNum > aNum; aWin = aNum > hNum }
        }

        const lblStyle = labelColor ? `style="color:${labelColor};"` : ''
        const hRow = `<div class="modal-stat-row"><span class="modal-stat-label" ${lblStyle}>${label}</span><span class="modal-stat-value ${hWin ? 'winner-stat' : ''}">${hVal || '-'}</span></div>`
        const aRow = `<div class="modal-stat-row"><span class="modal-stat-label" ${lblStyle}>${label}</span><span class="modal-stat-value ${aWin ? 'winner-stat' : ''}">${aVal || '-'}</span></div>`
        return { hRow, aRow }
    }

    qKeys.forEach((k, i) => { const res = buildStatRow(qLabels[i], sHome[k], sAway[k]); hQuarters += res.hRow; aQuarters += res.aRow; })
    let otIndex = 1

    while(sHome[`ot${otIndex}`] !== undefined || sAway[`ot${otIndex}`] !== undefined) {
        const res = buildStatRow(`Suple ${otIndex}`, sHome[`ot${otIndex}`], sAway[`ot${otIndex}`], false, '#f39c12')
        hQuarters += res.hRow; aQuarters += res.aRow; otIndex++
    }
    
    document.getElementById('ps-home-quarters').innerHTML = hQuarters
    document.getElementById('ps-away-quarters').innerHTML = aQuarters
    
    const advKeys = ['reb', 'oreb', 'ast', 'stl', 'tov']; const advLabels = ['Rebotes Totales', 'Rebotes Ofensivos', 'Asistencias', 'Robos', 'Pérdidas Propias']
    let hAdv = '', aAdv = ''

    advKeys.forEach((k, i) => {
        const isInverse = (k === 'tov'); const res = buildStatRow(advLabels[i], sHome[k], sAway[k], isInverse)
        hAdv += res.hRow; aAdv += res.aRow
    })
    
    document.getElementById('ps-home-advanced').innerHTML = hAdv; document.getElementById('ps-away-advanced').innerHTML = aAdv
    document.getElementById('public-stats-modal').classList.remove('hidden')
}

window.closePublicStatsModal = () => { document.getElementById('public-stats-modal').classList.add('hidden')}

function calculateStandings(teams, matches) {

    let standings = teams.map(t => ({
        name: t.name, code: t.code, logo: t.logo,
        pj: 0, pg: 0, pp: 0, pf: 0, pc: 0, pts: 0, pct: 0
    }))

    matches.forEach(m => {
        if (m.homePts === "-" || m.awayPts === "-") return
        const hPts = parseInt(m.homePts), aPts = parseInt(m.awayPts)

        if (!isNaN(hPts) && !isNaN(aPts)) {
            const hIdx = standings.findIndex(s => s.name === m.home)
            const aIdx = standings.findIndex(s => s.name === m.away)

            if (hIdx !== -1 && aIdx !== -1) {
                standings[hIdx].pj++; standings[aIdx].pj++
                standings[hIdx].pf += hPts; standings[hIdx].pc += aPts
                standings[aIdx].pf += aPts; standings[aIdx].pc += hPts

                if (hPts > aPts) { 
                    standings[hIdx].pg++; standings[hIdx].pts += 2
                    standings[aIdx].pp++; standings[aIdx].pts += 1
                } else if (aPts > hPts) { 
                    standings[aIdx].pg++; standings[aIdx].pts += 2
                    standings[hIdx].pp++; standings[hIdx].pts += 1
                } else { 
                    standings[hIdx].pts += 1; standings[aIdx].pts += 1
                }
            }
        }
    })

    standings.forEach(t => { t.pct = t.pj > 0 ? (t.pg / t.pj) : 0; })

    standings.sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        const diffA = a.pf - a.pc;
        const diffB = b.pf - b.pc;
        if (diffA !== diffB) return diffB - diffA;
        if (b.pf !== a.pf) return b.pf - a.pf;
        return 0;
    });

    return standings;
}

function renderStandings(teams, matches) {
    const tbody = document.getElementById('standings-body')
    tbody.innerHTML = ''
    
    if (teams.length === 0) { 
        tbody.innerHTML = '<tr><td colspan=\"8\" style="text-align:center; color:#888; padding:30px;">No hay equipos registrados.</td></tr>'
        return
    }

    const standings = calculateStandings(teams, matches);

    standings.forEach((t, i) => {
        const dg = t.pf - t.pc
        let dgClass = 'dg-neu'
        let dgText = dg

        if(dg > 0) { dgClass = 'dg-pos'; dgText = '+' + dg }
        if(dg < 0) { dgClass = 'dg-neg' }
        
        const codeName = t.code ? t.code : t.name.substring(0,3).toUpperCase()

        let posColorBg = '#f1f5f9';
        let posColorText = 'var(--black)';
        let posBorder = '#cbd5e1';

        if (i < 4) {
            posColorBg = '#28a745'; posColorText = '#fff'; posBorder = '#28a745';
        } else if (i >= 4 && i < 12) {
            posColorBg = '#8fd19e'; posColorText = '#fff'; posBorder = '#8fd19e';
        }

        const teamLink = `equipo.html?liga=liga_metropolitana&equipo=${encodeURIComponent(t.name)}`;

        const row = `
            <tr>
                <td><div class=\"cell-pos-box\" style=\"background:${posColorBg}; color:${posColorText}; border-color:${posBorder};\">${i + 1}</div></td>
                <td class=\"t-left\">
                    <a href="${teamLink}" target="_blank" class=\"team-cell team-link\">
                        <img src=\"${t.logo}\" class=\"t-logo\">
                        <span class=\"t-name-full\">${t.name}</span>
                        <span class=\"t-name-code\">${codeName}</span>
                    </a>
                </td>
                <td class=\"col-pj\">${t.pj}</td>
                <td class=\"col-pg\">${t.pg}</td>
                <td class=\"col-pp\">${t.pp}</td>
                <td class=\"col-pf\">${t.pf}</td>
                <td class=\"col-pc\">${t.pc}</td>
                <td class=\"col-dg ${dgClass}\">${dgText}</td>
            </tr>`

        tbody.innerHTML += row
    })
}

function formatDateInfo(dateString) {
    if(!dateString) return { dayName: '-', dateShort: '-' }
    const dateObj = new Date(dateString + 'T00:00:00')
    const days = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA']
    const dayNum = String(dateObj.getDate()).padStart(2, '0')
    const monthNum = String(dateObj.getMonth() + 1).padStart(2, '0')
    return { dayName: days[dateObj.getDay()], dateShort: `${dayNum}/${monthNum}` }
}

window.toggleRound = (header) => { 
    header.classList.toggle('active')
    header.nextElementSibling.classList.toggle('show')
}
