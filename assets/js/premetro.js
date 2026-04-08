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

let localDB = { teams: [], matches: [] }

async function initApp() {

    try 
    {
        const docRef = doc(dbFire, "pre_liga_metropolitana", "data_v1")
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) 
        {
            localDB = docSnap.data()
            console.log("Datos actualizados desde la base de datos.")
        } 

    } 

    catch (error) 
    { 
        console.error("Error conectando a la base de datos:", error)
    }

}

initApp()

window.loadData = () => {

    const zoneCode = document.getElementById('zoneSelect').value
    if (!zoneCode) return
    
    const searchKey = zoneCode
    const zoneTeams = localDB.teams.filter(t => t.zone === searchKey)
    const zoneMatches = localDB.matches.filter(m => m.zone === searchKey)
    
    const teamFilter = document.getElementById('teamFilterSelect')

    if (teamFilter) 
    {

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

    const zoneCode = document.getElementById('zoneSelect').value
    const selectedTeam = document.getElementById('teamFilterSelect').value
    if (!zoneCode) return
    const searchKey = zoneCode
    
    let filteredMatches = localDB.matches.filter(m => m.zone === searchKey)

    if (selectedTeam) 
    {
        filteredMatches = filteredMatches.filter(m => m.home === selectedTeam || m.away === selectedTeam)
    }

    renderMatches(filteredMatches, localDB.teams)

}

function renderMatches(matches, allTeams) {

    const container = document.getElementById('matches-container')
    container.innerHTML = ''
    
    if (matches.length === 0) 
    { 
        container.innerHTML = '<p style="text-align:center; color:#888; padding:30px;">No hay partidos cargados para esta selección.</p>'
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
            const hWin = !isNaN(hPts) && !isNaN(aPts) && hPts > aPts ? 'winner' : ''
            const aWin = !isNaN(hPts) && !isNaN(aPts) && aPts > hPts ? 'winner' : ''

            const hCode = homeTeam && homeTeam.code ? homeTeam.code : m.home.substring(0,3).toUpperCase()
            const aCode = awayTeam && awayTeam.code ? awayTeam.code : m.away.substring(0,3).toUpperCase()
            
            const stadiumName = m.stadium && m.stadium.trim() !== '' ? m.stadium : 'Estadio a definir'

            matchesHtml += `
            <div class="match-card-premium">
                <div class="match-teams-box">
                    <div class="team-premium-row">
                        <div class="team-brand-box">
                            <img src="${hLogo}" class="team-logo">
                            <span class="team-name">${hCode}</span>
                        </div>
                        <div class="team-score-huge ${hWin}">${m.homePts}</div>
                    </div>
                    <div class="team-premium-row">
                        <div class="team-brand-box">
                            <img src="${aLogo}" class="team-logo">
                            <span class="team-name">${aCode}</span>
                        </div>
                        <div class="team-score-huge ${aWin}">${m.awayPts}</div>
                    </div>
                </div>
                
                <div class="match-meta-info">
                    <div class="match-meta-top">
                        <span><i class="ri-calendar-event-line"></i> ${dateInfo.dayName} - ${dateInfo.dateShort}</span>
                        <span><i class="ri-time-line"></i> ${m.time} Hs</span>
                    </div>
                    <div class="match-meta-bottom">
                        <span><i class="ri-map-pin-line"></i> ${stadiumName}</span>
                    </div>
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

function calculateStandings(teams, matches) 
{

    let standings = teams.map(t => ({
        name: t.name, code: t.code, logo: t.logo,
        pj: 0, pg: 0, pp: 0, pf: 0, pc: 0, pts: 0, pct: 0
    }))

    matches.forEach(m => {

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

                if (hPts > aPts) 
                { 
                    standings[hIdx].pg++; standings[hIdx].pts += 2
                    standings[aIdx].pp++; standings[aIdx].pts += 1
                } 
                
                else if (aPts > hPts) 
                { 
                    standings[aIdx].pg++; standings[aIdx].pts += 2
                    standings[hIdx].pp++; standings[hIdx].pts += 1
                } 
                
                else 
                { 
                    standings[hIdx].pts += 1; standings[aIdx].pts += 1
                }

            }

        }

    })

    standings.forEach(t => { t.pct = t.pj > 0 ? (t.pg / t.pj) : 0; })

    standings.sort((a, b) => {

        if (b.pts !== a.pts) return b.pts - a.pts
        
        let currentTiedGroup = standings.filter(t => t.pts === a.pts)

        while (currentTiedGroup.length > 1) {
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

            // 2. Desempate H2H
            if (statA.pts !== statB.pts) return statB.pts - statA.pts;
            
            const nextTiedGroup = currentTiedGroup.filter(t => groupStats[t.name].pts === statA.pts);
            
            if (nextTiedGroup.length === currentTiedGroup.length) {
                if (statA.diff !== statB.diff) return statB.diff - statA.diff;
                
                const diffTiedGroup = currentTiedGroup.filter(t => groupStats[t.name].diff === statA.diff);
                if (diffTiedGroup.length === currentTiedGroup.length) {
                    const aRatioH2H = statA.pc === 0 ? statA.pf : statA.pf / statA.pc;
                    const bRatioH2H = statB.pc === 0 ? statB.pf : statB.pf / statB.pc;
                    if (Math.abs(aRatioH2H - bRatioH2H) > 0.0001) return bRatioH2H - aRatioH2H;

                    const ratioTiedGroup = currentTiedGroup.filter(t => {
                        const tRatio = groupStats[t.name].pc === 0 ? groupStats[t.name].pf : groupStats[t.name].pf / groupStats[t.name].pc;
                        return Math.abs(tRatio - aRatioH2H) < 0.0001;
                    });

                    if (ratioTiedGroup.length === currentTiedGroup.length) {
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

        // 3. Diferencia de Gol General
        const diffA = a.pf - a.pc;
        const diffB = b.pf - b.pc;
        if (diffA !== diffB) return diffB - diffA;

        // 4. Goles a Favor Generales
        return b.pf - a.pf;
    });

    return standings;
}

// ---------------------------------------------------------
// FUNCION QUE BUSCA A LOS 2 MEJORES 4° DE TODAS LAS ZONAS
// ---------------------------------------------------------
function getGlobalBestFourths() {
    const zones = ["Norte", "Sur 1", "Sur 2", "Oeste", "Centro 1", "Centro 2 / Oeste 2"];
    let allFourths = [];
    
    zones.forEach(z => {
        const zTeams = localDB.teams.filter(t => t.zone === z);
        const zMatches = localDB.matches.filter(m => m.zone === z);
        if (zTeams.length > 0) {
            const zStandings = calculateStandings(zTeams, zMatches);
            if (zStandings[3]) { // Índice 3 = 4to Puesto
                allFourths.push(zStandings[3]);
            }
        }
    });

    // Ordenar a los mejores 4tos (Por % de victoria por si tienen distinto PJ, luego Puntos, luego Dif Gol)
    allFourths.sort((a, b) => {
        const aPtPct = a.pj > 0 ? (a.pts / (a.pj * 2)) : 0;
        const bPtPct = b.pj > 0 ? (b.pts / (b.pj * 2)) : 0;
        
        if (Math.abs(bPtPct - aPtPct) > 0.0001) return bPtPct - aPtPct;
        if (b.pts !== a.pts) return b.pts - a.pts;
        const diffA = a.pf - a.pc;
        const diffB = b.pf - b.pc;
        if (diffA !== diffB) return diffB - diffA;
        return b.pf - a.pf;
    });

    return allFourths.slice(0, 2).map(t => t.name);
}

// ---------------------------------------------------------
// DIBUJA LA TABLA Y LE ASIGNA LOS COLORES SOLICITADOS
// ---------------------------------------------------------
function renderStandings(teams, matches) {
    const tbody = document.getElementById('standings-body')
    tbody.innerHTML = ''
    
    if (teams.length === 0) { 
        tbody.innerHTML = '<tr><td colspan=\"8\" style="text-align:center; color:#888; padding:30px;">No hay equipos registrados.</td></tr>'
        return
    }

    const standings = calculateStandings(teams, matches);
    const globalBestFourths = getGlobalBestFourths();

    standings.forEach((t, i) => {
        const dg = t.pf - t.pc
        let dgClass = 'dg-neu'
        let dgText = dg

        if(dg > 0) { dgClass = 'dg-pos'; dgText = '+' + dg }
        if(dg < 0) { dgClass = 'dg-neg' }
        
        const codeName = t.code ? t.code : t.name.substring(0,3).toUpperCase()

        // Lógica de Colores Clasificatorios In-Line
        let posColorBg = '#f1f5f9';
        let posColorText = 'var(--black)';
        let posBorder = '#cbd5e1';

        if (i < 3) {
            // Del 1° al 3° (Azul)
            posColorBg = '#0e3efc'; posColorText = '#fff'; posBorder = '#0e3efc';
        } else if (i === 3) {
            // El 4° -> Chequea si es uno de los dos mejores de todas las zonas
            if (globalBestFourths.includes(t.name)) {
                posColorBg = '#0e3efc'; posColorText = '#fff'; posBorder = '#0e3efc'; // Entra en Azul
            } else {
                posColorBg = '#d4af37'; posColorText = '#fff'; posBorder = '#d4af37'; // Dorado
            }
        } else if (i >= 4 && i <= 8) {
            // Del 5° al 9° (Dorado)
            posColorBg = '#d4af37'; posColorText = '#fff'; posBorder = '#d4af37';
        } else {
            // Del 10° en adelante (Plateado)
            posColorBg = '#a8b3bd'; posColorText = '#fff'; posBorder = '#a8b3bd';
        }

        const row = `
            <tr>
                <td><div class=\"cell-pos-box\" style=\"background:${posColorBg}; color:${posColorText}; border-color:${posBorder};\">${i + 1}</div></td>
                <td class=\"t-left\">
                    <div class=\"team-cell\">
                        <img src=\"${t.logo}\" class=\"t-logo\">
                        <span class=\"t-name-full\">${t.name}</span>
                        <span class=\"t-name-code\">${codeName}</span>
                    </div>
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
