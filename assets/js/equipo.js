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

const urlParams = new URLSearchParams(window.location.search)
const league = urlParams.get('liga')
const teamName = urlParams.get('equipo')

// Configuración de Ligas (AQUÍ SE AGREGÓ LA LIGA FEMENINA)
const leagueConfig = {
    "liga_nacional": { name: "Liga Nacional", hasStats: false },
    "liga_argentina": { name: "Liga Argentina", hasStats: false },
    "liga_femenina": { name: "Liga Femenina", hasStats: false },
    "liga_federal": { name: "Liga Federal", hasStats: false },
    "liga_metropolitana": { name: "Liga Metropolitana", hasStats: true },
    "pre_liga_metropolitana": { name: "Liga Metropolitana", hasStats: true },
    "liga_proximo": { name: "Liga Proximo", hasStats: false }
}

let localDB = null;

async function loadTeamData() {

    if(!league || !teamName) {
        document.getElementById('t-name').innerText = "Equipo no encontrado"
        return
    }

    const conf = leagueConfig[league] || { name: "Liga Desconocida", hasStats: false }
    document.getElementById('t-league').innerText = conf.name

    // ADAPTACIÓN DE UI SEGÚN CONFIGURACIÓN DE LA LIGA
    if (!conf.hasStats) {
        const cardCuartos = document.getElementById('card-cuartos'); if (cardCuartos) cardCuartos.style.display = 'none';
        const cardGenerales = document.getElementById('card-generales'); if (cardGenerales) cardGenerales.style.display = 'none';
        const itemOtGames = document.getElementById('item-ot-games'); if (itemOtGames) itemOtGames.style.display = 'none';
        const itemOtRec = document.getElementById('item-ot-rec'); if (itemOtRec) itemOtRec.style.display = 'none';
        
        const grid = document.querySelector('.adv-stats-grid');
        if (grid) {
            grid.style.gridTemplateColumns = '1fr';
            grid.style.maxWidth = '450px';
            grid.style.margin = '0 auto';
        }
        const itemProm = document.getElementById('item-promedios');
        if(itemProm) { itemProm.style.borderBottom = 'none'; }
    }

    try {
        const docRef = doc(dbFire, league, "data_v1")
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
            localDB = docSnap.data()
            const teamInfo = localDB.teams.find(t => t.name === teamName)

            if(teamInfo) {
                document.getElementById('t-name').innerText = teamInfo.name
                document.getElementById('t-logo').src = teamInfo.logo
                const stadiumElement = document.getElementById('t-stadium')
                if(stadiumElement) {
                    stadiumElement.innerHTML = `<i class="ri-map-pin-line"></i> ${teamInfo.stadium && teamInfo.stadium.trim() !== '' ? teamInfo.stadium : 'Estadio a definir'}`
                }
            } else {
                document.getElementById('t-name').innerText = teamName
            }

            const teamMatches = localDB.matches.filter(m => m.home === teamName || m.away === teamName)
            calculateStats(teamMatches, teamName, localDB, conf.hasStats)
        }
    } catch (error) { 
        console.error("Error:", error) 
    }
}

function calculateStats(matches, team, db, hasLeagueStats) {

    let pj = 0, pg = 0, pp = 0, pf = 0, pc = 0
    let otGames = 0, otWins = 0, otLosses = 0
    let statsPj = 0

    let q1 = 0, q2 = 0, q3 = 0, q4 = 0, ot = 0
    let reb = 0, oreb = 0, ast = 0, stl = 0, tov = 0

    let opp_q1 = 0, opp_q2 = 0, opp_q3 = 0, opp_q4 = 0, opp_ot = 0
    let opp_reb = 0, opp_oreb = 0, opp_ast = 0, opp_stl = 0, opp_tov = 0

    matches.forEach(m => {

        if(m.homePts === "-" || m.awayPts === "-") return
        
        const isHome = m.home === team
        const ptsFav = isHome ? parseInt(m.homePts) : parseInt(m.awayPts)
        const ptsCon = isHome ? parseInt(m.awayPts) : parseInt(m.homePts)
        
        if(!isNaN(ptsFav) && !isNaN(ptsCon)) {
            pj++
            pf += ptsFav
            pc += ptsCon
            if(ptsFav > ptsCon) pg++
            else pp++
        }

        if(m.stats && hasLeagueStats) {
            const teamStats = isHome ? m.stats.home : m.stats.away
            const oppStats = isHome ? m.stats.away : m.stats.home

            let playedOT = false
            if (m.stats.home && m.stats.home.ot1 !== undefined && m.stats.home.ot1 !== '') playedOT = true
            if (m.stats.away && m.stats.away.ot1 !== undefined && m.stats.away.ot1 !== '') playedOT = true

            if (playedOT) {
                otGames++
                if (ptsFav > ptsCon) otWins++
                else otLosses++
            }

            if(teamStats && Object.keys(teamStats).length > 0) {
                statsPj++
                q1 += parseInt(teamStats.q1) || 0; q2 += parseInt(teamStats.q2) || 0
                q3 += parseInt(teamStats.q3) || 0; q4 += parseInt(teamStats.q4) || 0
                Object.keys(teamStats).forEach(key => { if(key.startsWith('ot')) ot += parseInt(teamStats[key]) || 0 })

                reb += parseInt(teamStats.reb) || 0; oreb += parseInt(teamStats.oreb) || 0
                ast += parseInt(teamStats.ast) || 0; stl += parseInt(teamStats.stl) || 0; tov += parseInt(teamStats.tov) || 0

                if(oppStats) {
                    opp_q1 += parseInt(oppStats.q1) || 0; opp_q2 += parseInt(oppStats.q2) || 0
                    opp_q3 += parseInt(oppStats.q3) || 0; opp_q4 += parseInt(oppStats.q4) || 0
                    Object.keys(oppStats).forEach(key => { if(key.startsWith('ot')) opp_ot += parseInt(oppStats[key]) || 0 })

                    opp_reb += parseInt(oppStats.reb) || 0; opp_oreb += parseInt(oppStats.oreb) || 0
                    opp_ast += parseInt(oppStats.ast) || 0; opp_stl += parseInt(oppStats.stl) || 0; opp_tov += parseInt(oppStats.tov) || 0
                }
            }
        }
    })

    document.getElementById('s-pj').innerText = pj
    document.getElementById('s-pg').innerText = pg
    document.getElementById('s-pp').innerText = pp
    const winPct = pj > 0 ? Math.round((pg / pj) * 100) : 0
    document.getElementById('s-pct').innerText = `${winPct}%`

    const ppp = pj > 0 ? (pf / pj).toFixed(1) : "0.0"
    const pcp = pj > 0 ? (pc / pj).toFixed(1) : "0.0"
    document.getElementById('s-ppp').innerText = ppp
    document.getElementById('s-pcp').innerText = pcp

    if (hasLeagueStats) {
        document.getElementById('s-ot-games').innerText = otGames
        document.getElementById('s-ot-rec').innerText = `${otWins}-${otLosses}`

        const calcAvg = (total, games) => games > 0 ? (total / games).toFixed(1) : "0.0"

        document.getElementById('s-q1').innerText = calcAvg(q1, statsPj); document.getElementById('s-q2').innerText = calcAvg(q2, statsPj)
        document.getElementById('s-q3').innerText = calcAvg(q3, statsPj); document.getElementById('s-q4').innerText = calcAvg(q4, statsPj)
        document.getElementById('s-ot').innerText = calcAvg(ot, statsPj)

        document.getElementById('s-opp-q1').innerText = calcAvg(opp_q1, statsPj); document.getElementById('s-opp-q2').innerText = calcAvg(opp_q2, statsPj)
        document.getElementById('s-opp-q3').innerText = calcAvg(opp_q3, statsPj); document.getElementById('s-opp-q4').innerText = calcAvg(opp_q4, statsPj)
        document.getElementById('s-opp-ot').innerText = calcAvg(opp_ot, statsPj)

        document.getElementById('s-reb').innerText = calcAvg(reb, statsPj); document.getElementById('s-oreb').innerText = calcAvg(oreb, statsPj)
        document.getElementById('s-ast').innerText = calcAvg(ast, statsPj); document.getElementById('s-stl').innerText = calcAvg(stl, statsPj)
        document.getElementById('s-tov').innerText = calcAvg(tov, statsPj)

        document.getElementById('s-opp-reb').innerText = calcAvg(opp_reb, statsPj); document.getElementById('s-opp-oreb').innerText = calcAvg(opp_oreb, statsPj)
        document.getElementById('s-opp-ast').innerText = calcAvg(opp_ast, statsPj); document.getElementById('s-opp-stl').innerText = calcAvg(opp_stl, statsPj)
        document.getElementById('s-opp-tov').innerText = calcAvg(opp_tov, statsPj)
    }

    let matchesHtml = ''

    matches.sort((a,b) => {
        const dateA = new Date((a.date || '1970-01-01') + 'T' + (a.time || '00:00'))
        const dateB = new Date((b.date || '1970-01-01') + 'T' + (b.time || '00:00'))
        return dateB - dateA
    }).forEach(m => {

        let dateShort = m.date
        if(m.date && m.date.includes('-')) {
            const parts = m.date.split('-')
            if(parts.length === 3) dateShort = `${parts[2]}/${parts[1]}/${parts[0]}`
        }
        
        const isHome = m.home === team
        const ptsFav = isHome ? m.homePts : m.awayPts
        const ptsCon = isHome ? m.awayPts : m.homePts
        const oppName = isHome ? m.away : m.home
        
        const oppObj = db.teams.find(t => t.name === oppName)
        const oppLogo = oppObj ? oppObj.logo : 'assets/image/favicon.png'
        const homeOrAwayText = isHome ? 'vs' : '@'
        
        let resultClass = ''
        let resultText = '-'

        if(ptsFav !== '-' && ptsCon !== '-') {
            const numFav = parseInt(ptsFav)
            const numCon = parseInt(ptsCon)

            if(numFav > numCon) { resultClass = 'text-green'; resultText = 'V'; }
            else if(numFav < numCon) { resultClass = 'text-red'; resultText = 'D'; }
        }

        const timeStr = m.time ? m.time + ' Hs' : '--:-- Hs';
        let channelHtml = '';
        if (m.channel && m.channel.trim() !== '') {
            const channels = db.channels || [];
            const channelObj = channels.find(c => c.name === m.channel);
            if (channelObj) {
                channelHtml = `<img src="${channelObj.logo}" title="${channelObj.name}" style="height: 18px; object-fit: contain; margin-top: 4px; border-radius: 4px; background: white; padding: 2px; border: 1px solid var(--border-color);">`;
            } else {
                channelHtml = `<span style="font-size: 0.7rem; color: var(--cool-gray); display: flex; align-items: center; gap: 3px; margin-top: 3px; font-weight: 700;"><i class="ri-tv-2-line"></i> ${m.channel}</span>`;
            }
        }

        const hasMatchStats = m.stats && Object.keys(m.stats.home || {}).length > 0;
        let statsBtn = '';
        if (hasLeagueStats && hasMatchStats) {
            statsBtn = `<button style="background: var(--accent-color); color: white; border: none; border-radius: 6px; padding: 6px 10px; font-size: 0.85rem; cursor: pointer; transition: 0.2s;" onclick="openPublicStatsModal('${m.id}')" title="Ver Estadísticas"><i class="ri-bar-chart-box-line"></i></button>`;
        }

        matchesHtml += `
        <div class="match-item" style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px; background: var(--card-bg); padding: 15px; border: 1px solid var(--border-color); border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.02);">
            <div style="display: flex; align-items: center; gap: 15px; flex: 1;">
                
                <div style="display: flex; flex-direction: column; align-items: flex-start; min-width: 75px; border-right: 1px dashed var(--border-color); padding-right: 15px;">
                    <div class="match-date" style="font-weight: 900; font-size: 0.95rem; color: var(--text-main); margin-bottom: 2px;">${dateShort}</div>
                    <div style="font-size: 0.75rem; color: var(--cool-gray); display: flex; align-items: center; gap: 4px; font-weight: 700;">
                        <i class="ri-time-line"></i> ${timeStr}
                    </div>
                    ${channelHtml}
                </div>

                <div class="match-opp" style="display: flex; align-items: center;">
                    <span style="color:var(--cool-gray); font-size:0.85rem; font-weight:800; margin-right:8px; width: 20px; display:inline-block; text-align:center;">${homeOrAwayText}</span>
                    <img src="${oppLogo}" class="opp-logo" style="width: 28px; height: 28px; object-fit: contain; margin-right: 10px;">
                    <span class="opp-name" style="font-weight: 800; font-size: 0.95rem; color: var(--text-main);">${oppName}</span>
                </div>
            </div>

            <div class="match-score" style="display: flex; align-items: center; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 8px; background: var(--bg-base); padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <span class="score-fav ${resultClass}" style="font-weight: 900; font-size: 1.1rem;">${ptsFav}</span>
                    <span style="color: var(--cool-gray); font-size: 0.8rem; font-weight: 700;">-</span>
                    <span class="score-con" style="font-weight: 700; font-size: 1.1rem;">${ptsCon}</span>
                    <span class="res-badge ${resultClass}" style="margin-left: 8px;">${resultText}</span>
                </div>
                ${statsBtn}
            </div>
        </div>
        `
    })

    const matchesListContainer = document.getElementById('team-matches-list')
    if (matchesListContainer) {
        matchesListContainer.innerHTML = matchesHtml || '<p style="text-align:center; color:var(--text-muted); padding: 20px;">Este equipo aún no ha registrado partidos.</p>'
    }
}

window.openPublicStatsModal = (matchId) => {
    const m = localDB.matches.find(x => String(x.id) === String(matchId))
    if(!m) return
    
    const homeTeam = localDB.teams.find(t => t.name === m.home) || { logo: 'assets/image/favicon.png' };
    const awayTeam = localDB.teams.find(t => t.name === m.away) || { logo: 'assets/image/favicon.png' };
    
    const hLogo = homeTeam.logo; const aLogo = awayTeam.logo;

    document.getElementById('ps-match-title').innerText = `${m.home} vs ${m.away}`
    document.getElementById('ps-match-score').innerText = `${m.homePts} - ${m.awayPts}`
    
    document.getElementById('ps-home-name').innerHTML = `<img src="${hLogo}" class="modal-team-logo" style="width: 50px; height: 50px; margin-bottom: 10px; display: inline-block; object-fit: contain;"><br>${m.home}`
    document.getElementById('ps-away-name').innerHTML = `<img src="${aLogo}" class="modal-team-logo" style="width: 50px; height: 50px; margin-bottom: 10px; display: inline-block; object-fit: contain;"><br>${m.away}`
    
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

        const lblStyle = labelColor ? `color:${labelColor};` : ''
        const hRow = `<div class="modal-stat-row" style="display: flex; justify-content: space-between; padding: 10px 5px; border-bottom: 1px dashed var(--border-color); font-size: 1rem;"><span class="modal-stat-label" style="font-weight: 700; color: var(--cool-gray); ${lblStyle}">${label}</span><span class="modal-stat-value" style="font-weight: 900; color: var(--text-main); font-size: 1.1rem; ${hWin ? 'color: var(--accent-color);' : ''}">${hVal || '-'}</span></div>`
        const aRow = `<div class="modal-stat-row" style="display: flex; justify-content: space-between; padding: 10px 5px; border-bottom: 1px dashed var(--border-color); font-size: 1rem;"><span class="modal-stat-label" style="font-weight: 700; color: var(--cool-gray); ${lblStyle}">${label}</span><span class="modal-stat-value" style="font-weight: 900; color: var(--text-main); font-size: 1.1rem; ${aWin ? 'color: var(--accent-color);' : ''}">${aVal || '-'}</span></div>`
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

loadTeamData()
