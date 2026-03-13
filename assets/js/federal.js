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

const structure = { 
    "NEA": ["Unica"], 
    "NOA": ["Unica"], 
    "Sudeste": ["A", "B"], 
    "Sur": ["Unica"], 
    "Centro": ["A", "B"], 
    "Litoral": ["A", "B"], 
    "Metropolitana": ["A", "B", "C"] 
}

let localDB = { teams: [], matches: [] }

async function initApp() {
    try {
        const docRef = doc(dbFire, "liga_federal", "data_v1");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            localDB = docSnap.data();
            console.log("Datos actualizados desde la base de datos.");
        } 
    } catch (error) { console.error("Error conectando a la base de datos:", error); }
}
initApp();

window.updateZoneOptions = () => {
    const confSelect = document.getElementById('conferenceSelect')
    const zoneSelect = document.getElementById('zoneSelect')
    const teamFilter = document.getElementById('teamFilterSelect')
    const selectedConf = confSelect.value
    
    zoneSelect.innerHTML = '<option value="">Seleccionar Zona...</option>'
    zoneSelect.disabled = true
    
    if(teamFilter) {
        teamFilter.innerHTML = '<option value="">Todos los equipos</option>';
        teamFilter.disabled = true;
    }
    
    if (selectedConf && structure[selectedConf]) {
        zoneSelect.disabled = false
        structure[selectedConf].forEach(z => {
            const option = document.createElement('option')
            option.value = z
            option.textContent = z === "Unica" ? "Zona Única" : "Zona " + z
            zoneSelect.appendChild(option)
        })
    }

    document.getElementById('matches-container').innerHTML = '<p style="text-align:center; color:#888;">Selecciona una zona.</p>'
    document.getElementById('standings-body').innerHTML = '<tr><td colspan="9" style="color:#888;">Esperando selección...</td></tr>'
}

window.loadData = () => {
    const conf = document.getElementById('conferenceSelect').value
    const zoneCode = document.getElementById('zoneSelect').value
    if (!conf || !zoneCode) return
    
    const searchKey = `${conf} ${zoneCode}`
    const zoneTeams = localDB.teams.filter(t => t.zone === searchKey)
    const zoneMatches = localDB.matches.filter(m => m.zone === searchKey)
    
    const teamFilter = document.getElementById('teamFilterSelect')
    if (teamFilter) {
        teamFilter.innerHTML = '<option value="">Todos los equipos</option>'
        teamFilter.disabled = false
        zoneTeams.sort((a,b) => a.name.localeCompare(b.name)).forEach(t => {
            const opt = document.createElement('option')
            opt.value = t.name
            opt.textContent = t.name
            teamFilter.appendChild(opt)
        })
    }
    
    renderMatches(zoneMatches, localDB.teams)
    renderStandings(zoneTeams, zoneMatches)
}

window.filterMatchesByTeam = () => {
    const conf = document.getElementById('conferenceSelect').value
    const zoneCode = document.getElementById('zoneSelect').value
    const selectedTeam = document.getElementById('teamFilterSelect').value
    if (!conf || !zoneCode) return
    const searchKey = `${conf} ${zoneCode}`
    
    let filteredMatches = localDB.matches.filter(m => m.zone === searchKey)
    if (selectedTeam) {
        filteredMatches = filteredMatches.filter(m => m.home === selectedTeam || m.away === selectedTeam)
    }
    renderMatches(filteredMatches, localDB.teams)
}

function renderMatches(matches, allTeams) {
    const container = document.getElementById('matches-container')
    container.innerHTML = ''
    
    if (matches.length === 0) { 
        container.innerHTML = '<p style="text-align:center; padding:20px; color:#999;">No hay partidos cargados para esta selección.</p>'
        return
    }

    const grouped = {}
    matches.forEach(m => { 
        if (!grouped[m.round]) grouped[m.round] = []
        grouped[m.round].push(m)
    })
    
    const rounds = Object.keys(grouped).sort()
    let isFirst = true

    rounds.forEach(round => {
        const activeClass = isFirst ? 'active' : ''
        const showClass = isFirst ? 'show' : ''
        isFirst = false

        let matchesHtml = ''
        grouped[round].forEach(m => {
            const homeTeam = allTeams.find(t => t.name === m.home)
            const awayTeam = allTeams.find(t => t.name === m.away)
            const hLogo = homeTeam ? homeTeam.logo : defaultLogo
            const aLogo = awayTeam ? awayTeam.logo : defaultLogo
            const dateInfo = formatDateInfo(m.date)

            const hPts = parseInt(m.homePts) || 0
            const aPts = parseInt(m.awayPts) || 0
            let hClass = 'team-score'
            let aClass = 'team-score'

            if(m.homePts !== '-' && m.awayPts !== '-') {
                if (hPts > aPts) hClass += ' score-win'
                if (aPts > hPts) aClass += ' score-win'
            }

            const hCode = homeTeam && homeTeam.code ? homeTeam.code : m.home.substring(0,3).toUpperCase()
            const aCode = awayTeam && awayTeam.code ? awayTeam.code : m.away.substring(0,3).toUpperCase()

            let statsBtnHtml = '';
            if (m.homePts !== '-' && m.awayPts !== '-') {
                statsBtnHtml = `<button class="btn-view-stats" onclick="openPublicStatsModal('${m.id}')" title="Ver Estadísticas"><i class="ri-bar-chart-box-line"></i> STATS</button>`;
            }

            matchesHtml += `
            <div class="match-card">
                <div class="match-content">
                    <div class="team-row">
                        <div class="team-info local team-link" onclick="openComparisonModal('${m.id}')">
                            <img src="${hLogo}" class="team-logo-match">
                            <span class="team-name-match">${hCode}</span>
                        </div>
                        <span class="${hClass}">${m.homePts}</span>
                    </div>
                    <div class="team-row">
                        <div class="team-info local team-link" onclick="openComparisonModal('${m.id}')">
                            <img src="${aLogo}" class="team-logo-match">
                            <span class="team-name-match">${aCode}</span>
                        </div>
                        <span class="${aClass}">${m.awayPts}</span>
                    </div>
                </div>
                
                <div class="match-footer">
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div class="match-day-time" style="display: flex; align-items: center; gap: 5px; font-size: 0.85rem;"><i class="ri-calendar-event-line"></i> ${dateInfo.dayName} ${dateInfo.dateShort} - ${m.time} Hs</div>
                        <div style="color: var(--cool-gray); display: flex; align-items: center; gap: 5px; font-size: 0.85rem;"><i class="ri-map-pin-line" style="color: #d63384; font-size: 0.95rem;"></i> <span style="font-weight:600;">${m.stadium}</span></div>
                    </div>
                    ${statsBtnHtml}
                </div>
            </div>`
        })

        container.innerHTML += `
            <div class="round-wrapper">
                <div class="round-header ${activeClass}" onclick="toggleRound(this)">
                    <span>${round}</span>
                    <i class='bx bx-chevron-down arrow-icon'></i>
                </div>
                <div class="round-content ${showClass}">${matchesHtml}</div>
            </div>`
    })
}

window.toggleCompStats = (view) => {
    if(view === 'afavor') {
        document.getElementById('btn-afavor').classList.add('active');
        document.getElementById('btn-encontra').classList.remove('active');
        document.getElementById('comp-home-stats-afavor').style.display = 'block';
        document.getElementById('comp-away-stats-afavor').style.display = 'block';
        document.getElementById('comp-home-stats-encontra').style.display = 'none';
        document.getElementById('comp-away-stats-encontra').style.display = 'none';
    } else {
        document.getElementById('btn-encontra').classList.add('active');
        document.getElementById('btn-afavor').classList.remove('active');
        document.getElementById('comp-home-stats-encontra').style.display = 'block';
        document.getElementById('comp-away-stats-encontra').style.display = 'block';
        document.getElementById('comp-home-stats-afavor').style.display = 'none';
        document.getElementById('comp-away-stats-afavor').style.display = 'none';
    }
};

function getTeamSeasonStats(teamName) {
    let gamesPlayed = 0, statsGames = 0, wins = 0, losses = 0;
    let totals = { pts: 0, opp_pts: 0, reb: 0, oreb: 0, ast: 0, stl: 0, tov: 0, q1: 0, q2: 0, q3: 0, q4: 0, opp_q1: 0, opp_q2: 0, opp_q3: 0, opp_q4: 0 };

    localDB.matches.forEach(m => {
        if (m.homePts === '-' || m.awayPts === '-') return; 

        let isHome = m.home === teamName;
        let isAway = m.away === teamName;

        if (isHome || isAway) {
            gamesPlayed++;
            let myPts = parseInt(isHome ? m.homePts : m.awayPts) || 0;
            let oppPts = parseInt(isHome ? m.awayPts : m.homePts) || 0;
            
            totals.pts += myPts; totals.opp_pts += oppPts;
            if (myPts > oppPts) wins++; else if (myPts < oppPts) losses++;

            let teamStats = null, oppStats = null;
            if (m.stats) {
                teamStats = isHome ? m.stats.home : m.stats.away;
                oppStats = isHome ? m.stats.away : m.stats.home;
            }

            if (teamStats && Object.keys(teamStats).length > 0) {
                statsGames++;
                totals.reb += parseInt(teamStats.reb) || 0; totals.oreb += parseInt(teamStats.oreb) || 0;
                totals.ast += parseInt(teamStats.ast) || 0; totals.stl += parseInt(teamStats.stl) || 0; totals.tov += parseInt(teamStats.tov) || 0;
                totals.q1 += parseInt(teamStats.q1) || 0; totals.q2 += parseInt(teamStats.q2) || 0; totals.q3 += parseInt(teamStats.q3) || 0; totals.q4 += parseInt(teamStats.q4) || 0;
            }
            if (oppStats && Object.keys(oppStats).length > 0) {
                totals.opp_q1 += parseInt(oppStats.q1) || 0; totals.opp_q2 += parseInt(oppStats.q2) || 0;
                totals.opp_q3 += parseInt(oppStats.q3) || 0; totals.opp_q4 += parseInt(oppStats.q4) || 0;
            }
        }
    });

    return {
        record: `${wins}-${losses}`,
        pts: gamesPlayed > 0 ? (totals.pts / gamesPlayed).toFixed(1) : '-', opp_pts: gamesPlayed > 0 ? (totals.opp_pts / gamesPlayed).toFixed(1) : '-',
        q1: statsGames > 0 ? (totals.q1 / statsGames).toFixed(1) : '-', q2: statsGames > 0 ? (totals.q2 / statsGames).toFixed(1) : '-', q3: statsGames > 0 ? (totals.q3 / statsGames).toFixed(1) : '-', q4: statsGames > 0 ? (totals.q4 / statsGames).toFixed(1) : '-',
        opp_q1: statsGames > 0 ? (totals.opp_q1 / statsGames).toFixed(1) : '-', opp_q2: statsGames > 0 ? (totals.opp_q2 / statsGames).toFixed(1) : '-', opp_q3: statsGames > 0 ? (totals.opp_q3 / statsGames).toFixed(1) : '-', opp_q4: statsGames > 0 ? (totals.opp_q4 / statsGames).toFixed(1) : '-',
        reb: statsGames > 0 ? (totals.reb / statsGames).toFixed(1) : '-', oreb: statsGames > 0 ? (totals.oreb / statsGames).toFixed(1) : '-', ast: statsGames > 0 ? (totals.ast / statsGames).toFixed(1) : '-', stl: statsGames > 0 ? (totals.stl / statsGames).toFixed(1) : '-', tov: statsGames > 0 ? (totals.tov / statsGames).toFixed(1) : '-'
    };
}

window.openComparisonModal = (matchId) => {
    const m = localDB.matches.find(x => String(x.id) === String(matchId));
    if(!m) return;
    window.toggleCompStats('afavor');
    const homeTeam = localDB.teams.find(t => t.name === m.home);
    const awayTeam = localDB.teams.find(t => t.name === m.away);
    const hLogo = homeTeam ? homeTeam.logo : defaultLogo;
    const aLogo = awayTeam ? awayTeam.logo : defaultLogo;

    const hStats = getTeamSeasonStats(m.home);
    const aStats = getTeamSeasonStats(m.away);

    document.getElementById('comp-home-name').innerHTML = `<img src="${hLogo}" class="modal-team-logo"><br>${m.home}<br><span style="font-size: 0.85rem; color: var(--cool-gray); font-weight: 700; text-transform: none;">Récord: ${hStats.record}</span>`;
    document.getElementById('comp-away-name').innerHTML = `<img src="${aLogo}" class="modal-team-logo"><br>${m.away}<br><span style="font-size: 0.85rem; color: var(--cool-gray); font-weight: 700; text-transform: none;">Récord: ${aStats.record}</span>`;

    const buildCompRow = (label, hVal, aVal, inverse = false) => {
        const hNum = parseFloat(hVal); const aNum = parseFloat(aVal);
        let hWin = false; let aWin = false;
        if (!isNaN(hNum) && !isNaN(aNum) && hNum !== aNum) {
            if (inverse) { hWin = hNum < aNum; aWin = aNum < hNum; } else { hWin = hNum > aNum; aWin = aNum > hNum; }
        }
        const hRow = `<div class="modal-stat-row"><span class="modal-stat-label">${label}</span><span class="modal-stat-value ${hWin ? 'winner-stat' : ''}">${hVal}</span></div>`;
        const aRow = `<div class="modal-stat-row"><span class="modal-stat-label">${label}</span><span class="modal-stat-value ${aWin ? 'winner-stat' : ''}">${aVal}</span></div>`;
        return { hRow, aRow };
    };

    let hAFavor = '<h4 class="stat-section-title"><i class="ri-timer-line"></i> A Favor x Cuarto</h4>';
    let aAFavor = '<h4 class="stat-section-title"><i class="ri-timer-line"></i> A Favor x Cuarto</h4>';
    const qKeys = ['q1', 'q2', 'q3', 'q4']; const qLabels = ['1° Cuarto', '2° Cuarto', '3° Cuarto', '4° Cuarto'];
    qKeys.forEach((k, i) => { const res = buildCompRow(qLabels[i], hStats[k], aStats[k]); hAFavor += res.hRow; aAFavor += res.aRow; });

    hAFavor += '<h4 class="stat-section-title" style="margin-top:20px;"><i class="ri-bar-chart-box-line"></i> Generales (Positivas)</h4>';
    aAFavor += '<h4 class="stat-section-title" style="margin-top:20px;"><i class="ri-bar-chart-box-line"></i> Generales (Positivas)</h4>';
    const posKeys = ['pts', 'reb', 'oreb', 'ast', 'stl']; const posLabels = ['Puntos a Favor', 'Rebotes Totales', 'Rebotes Ofensivos', 'Asistencias', 'Robos'];
    posKeys.forEach((k, i) => { const res = buildCompRow(posLabels[i], hStats[k], aStats[k]); hAFavor += res.hRow; aAFavor += res.aRow; });

    let hEnContra = '<h4 class="stat-section-title"><i class="ri-shield-line"></i> En Contra x Cuarto</h4>';
    let aEnContra = '<h4 class="stat-section-title"><i class="ri-shield-line"></i> En Contra x Cuarto</h4>';
    const oppQKeys = ['opp_q1', 'opp_q2', 'opp_q3', 'opp_q4'];
    oppQKeys.forEach((k, i) => { const res = buildCompRow(qLabels[i], hStats[k], aStats[k], true); hEnContra += res.hRow; aEnContra += res.aRow; });

    hEnContra += '<h4 class="stat-section-title" style="margin-top:20px;"><i class="ri-error-warning-line"></i> Generales (Negativas)</h4>';
    aEnContra += '<h4 class="stat-section-title" style="margin-top:20px;"><i class="ri-error-warning-line"></i> Generales (Negativas)</h4>';
    const negKeys = ['opp_pts', 'tov']; const negLabels = ['Puntos en Contra', 'Pérdidas'];
    negKeys.forEach((k, i) => { const res = buildCompRow(negLabels[i], hStats[k], aStats[k], true); hEnContra += res.hRow; aEnContra += res.aRow; });

    document.getElementById('comp-home-stats-afavor').innerHTML = hAFavor; document.getElementById('comp-away-stats-afavor').innerHTML = aAFavor;
    document.getElementById('comp-home-stats-encontra').innerHTML = hEnContra; document.getElementById('comp-away-stats-encontra').innerHTML = aEnContra;
    document.getElementById('comparison-modal').classList.remove('hidden');
};

window.closeComparisonModal = () => { document.getElementById('comparison-modal').classList.add('hidden'); };

window.openPublicStatsModal = (matchId) => {
    const m = localDB.matches.find(x => String(x.id) === String(matchId));
    if(!m) return;
    
    const homeTeam = localDB.teams.find(t => t.name === m.home);
    const awayTeam = localDB.teams.find(t => t.name === m.away);
    const hLogo = homeTeam ? homeTeam.logo : defaultLogo;
    const aLogo = awayTeam ? awayTeam.logo : defaultLogo;

    document.getElementById('ps-match-title').innerText = `${m.home} vs ${m.away}`;
    document.getElementById('ps-match-score').innerText = `${m.homePts} - ${m.awayPts}`;
    
    document.getElementById('ps-home-name').innerHTML = `<img src="${hLogo}" class="modal-team-logo"><br>${m.home}`;
    document.getElementById('ps-away-name').innerHTML = `<img src="${aLogo}" class="modal-team-logo"><br>${m.away}`;
    
    document.getElementById('ps-stats-grid').classList.remove('hidden');
    
    const sHome = (m.stats && m.stats.home) ? m.stats.home : {};
    const sAway = (m.stats && m.stats.away) ? m.stats.away : {};
    
    let hQuarters = '', aQuarters = '';
    const qKeys = ['q1', 'q2', 'q3', 'q4']; const qLabels = ['1° Cuarto', '2° Cuarto', '3° Cuarto', '4° Cuarto'];
    const buildStatRow = (label, hVal, aVal, inverse = false, labelColor = '') => {
        const hNum = parseInt(hVal); const aNum = parseInt(aVal);
        let hWin = false; let aWin = false;
        if (!isNaN(hNum) && !isNaN(aNum) && hNum !== aNum) {
            if (inverse) { hWin = hNum < aNum; aWin = aNum < hNum; } else { hWin = hNum > aNum; aWin = aNum > hNum; }
        }
        const lblStyle = labelColor ? `style="color:${labelColor};"` : '';
        const hRow = `<div class="modal-stat-row"><span class="modal-stat-label" ${lblStyle}>${label}</span><span class="modal-stat-value ${hWin ? 'winner-stat' : ''}">${hVal || '-'}</span></div>`;
        const aRow = `<div class="modal-stat-row"><span class="modal-stat-label" ${lblStyle}>${label}</span><span class="modal-stat-value ${aWin ? 'winner-stat' : ''}">${aVal || '-'}</span></div>`;
        return { hRow, aRow };
    };

    qKeys.forEach((k, i) => { const res = buildStatRow(qLabels[i], sHome[k], sAway[k]); hQuarters += res.hRow; aQuarters += res.aRow; });
    let otIndex = 1;
    while(sHome[`ot${otIndex}`] !== undefined || sAway[`ot${otIndex}`] !== undefined) {
        const res = buildStatRow(`Suple ${otIndex}`, sHome[`ot${otIndex}`], sAway[`ot${otIndex}`], false, '#f39c12');
        hQuarters += res.hRow; aQuarters += res.aRow; otIndex++;
    }
    
    document.getElementById('ps-home-quarters').innerHTML = hQuarters; document.getElementById('ps-away-quarters').innerHTML = aQuarters;
    
    const advKeys = ['reb', 'oreb', 'ast', 'stl', 'tov']; const advLabels = ['Rebotes Totales', 'Rebotes Ofensivos', 'Asistencias', 'Robos', 'Pérdidas'];
    let hAdv = '', aAdv = '';
    advKeys.forEach((k, i) => {
        const isInverse = (k === 'tov'); const res = buildStatRow(advLabels[i], sHome[k], sAway[k], isInverse);
        hAdv += res.hRow; aAdv += res.aRow;
    });
    
    document.getElementById('ps-home-advanced').innerHTML = hAdv; document.getElementById('ps-away-advanced').innerHTML = aAdv;
    document.getElementById('public-stats-modal').classList.remove('hidden');
};

window.closePublicStatsModal = () => { document.getElementById('public-stats-modal').classList.add('hidden'); };

function renderStandings(teams, matches) 
{
    const tbody = document.getElementById('standings-body')
    tbody.innerHTML = ''
    
    if (teams.length === 0) 
    { 
        tbody.innerHTML = '<tr><td colspan=\"9\">No hay equipos registrados.</td></tr>'
        return
    }

    let standings = teams.map(t => ({
        name: t.name, code: t.code, logo: t.logo,
        pj: 0, pg: 0, pp: 0, pf: 0, pc: 0, pts: 0, pct: 0
    }))

    matches.forEach(m => 
    {
        if (m.homePts === "-" || m.awayPts === "-") return
        const hPts = parseInt(m.homePts), aPts = parseInt(m.awayPts)

        if (!isNaN(hPts) && !isNaN(aPts)) 
        {
            const hIdx = standings.findIndex(s => s.name === m.home)
            const aIdx = standings.findIndex(s => s.name === m.away)

            if (hIdx !== -1 && aIdx !== -1) 
            {
                standings[hIdx].pj++; standings[aIdx].pj++
                standings[hIdx].pf += hPts; standings[hIdx].pc += aPts
                standings[aIdx].pf += aPts; standings[aIdx].pc += hPts

                // Se suman los puntos FIBA (2 victoria, 1 derrota)
                if (hPts > aPts) { standings[hIdx].pg++; standings[hIdx].pts += 2; standings[aIdx].pp++; standings[aIdx].pts += 1; } 
                else { standings[aIdx].pg++; standings[aIdx].pts += 2; standings[hIdx].pp++; standings[hIdx].pts += 1; }
            }
        }
    })

    standings.forEach(t => { t.pct = t.pj > 0 ? (t.pg / t.pj) : 0; });

    standings.sort((a, b) => 
    {
        // 1. ORDEN PRINCIPAL: Porcentaje de Victorias (%V)
        if (Math.abs(b.pct - a.pct) > 0.0001) return b.pct - a.pct;
        
        // 2. PRIMER DESEMPATE: Puntos FIBA
        if (b.pts !== a.pts) return b.pts - a.pts;
        
        // 3. SEGUNDO DESEMPATE: Algoritmo FIBA de Mini-Tabla Recursiva
        let currentTiedGroup = standings.filter(t => Math.abs(t.pct - a.pct) < 0.0001 && t.pts === a.pts);

        while (currentTiedGroup.length > 1) 
        {
            const teamNames = currentTiedGroup.map(t => t.name);
            const tiedMatches = matches.filter(m => 
                teamNames.includes(m.home) && teamNames.includes(m.away) && 
                m.homePts !== "-" && m.awayPts !== "-"
            );

            let groupStats = {};
            currentTiedGroup.forEach(t => groupStats[t.name] = { pts: 0, diff: 0, pf: 0, pc: 0 });

            tiedMatches.forEach(m => {
                const h = parseInt(m.homePts), v = parseInt(m.awayPts);
                groupStats[m.home].pts += (h > v ? 2 : 1);
                groupStats[m.home].diff += (h - v);
                groupStats[m.home].pf += h;
                groupStats[m.home].pc += v;
                
                groupStats[m.away].pts += (v > h ? 2 : 1);
                groupStats[m.away].diff += (v - h);
                groupStats[m.away].pf += v;
                groupStats[m.away].pc += h;
            });

            const statA = groupStats[a.name];
            const statB = groupStats[b.name];

            // a) Puntos en H2H
            if (statA.pts !== statB.pts) return statB.pts - statA.pts;
            
            const nextTiedGroup = currentTiedGroup.filter(t => groupStats[t.name].pts === statA.pts);
            
            if (nextTiedGroup.length === currentTiedGroup.length) {
                // b) Diferencia de gol H2H
                if (statA.diff !== statB.diff) return statB.diff - statA.diff;
                
                const diffTiedGroup = currentTiedGroup.filter(t => groupStats[t.name].diff === statA.diff);
                if (diffTiedGroup.length === currentTiedGroup.length) {
                    
                    // c) Ratio GF/GC H2H (El arreglo de Litoral A)
                    const aRatioH2H = statA.pc === 0 ? statA.pf : statA.pf / statA.pc;
                    const bRatioH2H = statB.pc === 0 ? statB.pf : statB.pf / statB.pc;
                    if (Math.abs(aRatioH2H - bRatioH2H) > 0.0001) return bRatioH2H - aRatioH2H;

                    const ratioTiedGroup = currentTiedGroup.filter(t => {
                        const tRatio = groupStats[t.name].pc === 0 ? groupStats[t.name].pf : groupStats[t.name].pf / groupStats[t.name].pc;
                        return Math.abs(tRatio - aRatioH2H) < 0.0001;
                    });

                    if (ratioTiedGroup.length === currentTiedGroup.length) {
                        // d) Puntos a Favor H2H
                        if (statA.pf !== statB.pf) return statB.pf - statA.pf;
                        break; 
                    } else {
                        currentTiedGroup = ratioTiedGroup;
                        continue;
                    }

                } else {
                    currentTiedGroup = diffTiedGroup;
                    continue;
                }
            } else {
                currentTiedGroup = nextTiedGroup;
            }
        }

        // 4. TERCER DESEMPATE: Diferencia de gol general
        const diffA = a.pf - a.pc;
        const diffB = b.pf - b.pc;
        if (diffA !== diffB) return diffB - diffA;

        // 5. CUARTO DESEMPATE: Cociente de Goles General (GF / GC)
        const ratioA = a.pc === 0 ? a.pf : a.pf / a.pc;
        const ratioB = b.pc === 0 ? b.pf : b.pf / b.pc;
        if (Math.abs(ratioA - ratioB) > 0.0001) return ratioB - ratioA;

        // 6. QUINTO DESEMPATE: Puntos a Favor Generales
        return b.pf - a.pf;
    });

    standings.forEach((t, i) => 
    {
        const dg = t.pf - t.pc
        let dgClass = 'dg-neu'
        let dgText = dg

        if(dg > 0) { dgClass = 'dg-pos'; dgText = '+' + dg }
        if(dg < 0) { dgClass = 'dg-neg' }
        
        const codeName = t.code ? t.code : t.name.substring(0,3).toUpperCase()
        const teamLink = `equipo.html?liga=liga_federal&equipo=${encodeURIComponent(t.name)}`
        const pctDisplay = t.pj > 0 ? (t.pct * 100).toFixed(1) + '%' : '0.0%';

        const row = `
            <tr>
                <td><div class=\"cell-pos-box\">${i + 1}</div></td>
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
                <td style=\"font-weight: 800; color: var(--accent-color);\">${pctDisplay}</td>
                <td>${t.pf}</td>
                <td>${t.pc}</td>
                <td class=\"${dgClass}\">${dgText}</td>
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
