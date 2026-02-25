import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js"
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"

const firebaseConfig = 
{
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

const COLLECTION_NAME = "liga_nacional"
const defaultLogo = "assets/img/favicon.png"

let localDB = { teams: [], matches: [] }

async function initApp() 
{
    console.log("Iniciando carga de Liga Nacional...")

    try 
    {
        const docRef = doc(dbFire, COLLECTION_NAME, "data_v1")
        const docSnap = await getDoc(docRef)
        
        if (docSnap.exists()) 
        {
            localDB = docSnap.data()
            console.log("Datos recibidos:", localDB)

            renderAllData()
        } 
        
        else 
        {
            console.log("Base de datos vacía.")
            document.getElementById('matches-container').innerHTML = '<p style="text-align:center; padding:20px;">No hay datos cargados.</p>'
            document.getElementById('standings-body').innerHTML = '<tr><td colspan="8">Sin datos...</td></tr>'
        }

    } 

    catch (error) 
    {
        console.error("Error conectando a Firebase:", error)
    }

}

initApp()

function renderAllData() 
{
    renderMatches(localDB.matches, localDB.teams)
    renderStandings(localDB.teams, localDB.matches)
}

function renderMatches(matches, allTeams) 
{
    const container = document.getElementById('matches-container')
    container.innerHTML = ''
    
    if (!matches || matches.length === 0) 
    { 
        container.innerHTML = '<p style="text-align:center; padding:20px; color:#999;">No hay partidos encontrados.</p>'
        return
    }

    const grouped = {}

    matches.forEach(m => 
    { 
        if (!grouped[m.round]) grouped[m.round] = []
        grouped[m.round].push(m)
    })
    
    const rounds = Object.keys(grouped).sort()

    let isFirst = true

    rounds.forEach(round => 
    {
        const activeClass = isFirst ? 'active' : ''
        const showClass = isFirst ? 'show' : ''
        isFirst = false

        let matchesHtml = ''

        grouped[round].forEach(m => 
        {
            const homeTeam = allTeams.find(t => t.name === m.home)
            const awayTeam = allTeams.find(t => t.name === m.away)
            
            const hLogo = homeTeam ? homeTeam.logo : defaultLogo
            const aLogo = awayTeam ? awayTeam.logo : defaultLogo
            
            const hCode = homeTeam && homeTeam.code ? homeTeam.code : m.home.substring(0,3).toUpperCase()
            const aCode = awayTeam && awayTeam.code ? awayTeam.code : m.away.substring(0,3).toUpperCase()

            const dateInfo = formatDateInfo(m.date)

            let hClass = 'team-score', aClass = 'team-score'

            if(m.homePts !== '-' && m.awayPts !== '-') 
            {
                const h = parseInt(m.homePts), a = parseInt(m.awayPts)
                if (h > a) hClass += ' score-win'
                if (a > h) aClass += ' score-win'
            }

            matchesHtml += `
            <div class="match-card">
                <div class="match-content">
                    <div class="team-row">
                        <div class="team-info local">
                            <img src="${hLogo}" class="team-logo-match">
                            <span class="team-name-match">${hCode}</span>
                        </div>
                        <span class="${hClass}">${m.homePts}</span>
                    </div>
                    <div class="team-row">
                        <div class="team-info local">
                            <img src="${aLogo}" class="team-logo-match">
                            <span class="team-name-match">${aCode}</span>
                        </div>
                        <span class="${aClass}">${m.awayPts}</span>
                    </div>
                </div>
                <div class="match-footer">
                    <div class="match-day-time">📅 ${dateInfo.dayName} ${dateInfo.dateShort} - ${m.time} Hs</div>
                    <div style="font-weight:600;">📍 ${m.stadium}</div>
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

function renderStandings(teams, matches) 
{
    const tbody = document.getElementById('standings-body')
    tbody.innerHTML = ''
    
    if (!teams || teams.length === 0) 
    { 
        tbody.innerHTML = '<tr><td colspan="8">No hay equipos.</td></tr>'
        return
    }

    let standings = teams.map(t => ({
        name: t.name, code: t.code, logo: t.logo,
        pj: 0, pg: 0, pp: 0, pf: 0, pc: 0, pts: 0
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
                
                if (hPts > aPts) 
                { 
                    standings[hIdx].pg++; standings[hIdx].pts += 2
                    standings[aIdx].pp++; standings[aIdx].pts += 1
                } 
                
                else 
                { 
                    standings[aIdx].pg++; standings[aIdx].pts += 2
                    standings[hIdx].pp++; standings[hIdx].pts += 1
                }

            }

        }

    })

    standings.sort((a, b) => 
    {
        if (a.pts !== b.pts) return b.pts - a.pts
        return (b.pf - b.pc) - (a.pf - a.pc)
    })

    standings.forEach((t, i) => 
    {
        const position = i + 1
        let positionClass = ""

        if (position <= 4) 
        {
            positionClass = "pos-direct"
        } 
        else if (position >= 5 && position <= 12)
        {
            positionClass = "pos-playin"
        } 
        else if (position >= 18 && position <= 19) 
        {
            positionClass = "pos-playout"
        }

        const dg = t.pf - t.pc
        let dgClass = 'dg-neu', dgText = dg

        if(dg > 0) 
        { 
            dgClass = 'dg-pos' 
            dgText = '+' + dg 
        }

        if(dg < 0) 
        { 
            dgClass = 'dg-neg' 
        }
        
        const codeName = t.code ? t.code : t.name.substring(0,3).toUpperCase()

        const row = `
            <tr>
                <td class="${positionClass}" style="font-weight:bold; text-align:center;">${position}</td>
                <td class="t-left">
                    <div class="team-cell">
                        <img src="${t.logo}" class="t-logo">
                        <span class="t-name-full">${t.name}</span>
                        <span class="t-name-code">${codeName}</span>
                    </div>
                </td>
                <td class="col-pj">${t.pj}</td>
                <td class="col-pg">${t.pg}</td>
                <td class="col-pp">${t.pp}</td>
                <td>${t.pf}</td>
                <td>${t.pc}</td>
                <td class="${dgClass}">${dgText}</td>
            </tr>`

        tbody.innerHTML += row

    })

}

function formatDateInfo(dateString) 
{
    if(!dateString) return { dayName: '-', dateShort: '-' }
    const dateObj = new Date(dateString + 'T00:00:00')
    const days = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA']
    const dayNum = String(dateObj.getDate()).padStart(2, '0')
    const monthNum = String(dateObj.getMonth() + 1).padStart(2, '0')
    return { dayName: days[dateObj.getDay()], dateShort: `${dayNum}/${monthNum}` }
}

window.toggleRound = (header) => 
{ 
    header.classList.toggle('active')
    header.nextElementSibling.classList.toggle('show')
}