import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js"
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"

const firebaseConfig = 
{
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

const leagueNames = {
    "liga_nacional": "Liga Nacional",
    "liga_argentina": "Liga Argentina",
    "liga_federal": "Liga Federal",
    "liga_proximo": "Liga Proximo"
}

async function loadTeamData() 
{
    if(!league || !teamName) 
    {
        document.getElementById('t-name').innerText = "Equipo no encontrado"
        return
    }

    document.getElementById('t-league').innerText = leagueNames[league] || "Liga Desconocida"

    try 
    {
        const docRef = doc(dbFire, league, "data_v1")
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) 
        {
            const db = docSnap.data()
            
            const teamInfo = db.teams.find(t => t.name === teamName)

            if(teamInfo)
            {
                document.getElementById('t-name').innerText = teamInfo.name
                document.getElementById('t-logo').src = teamInfo.logo
            } 
            else 
            {
                document.getElementById('t-name').innerText = teamName
            }

            const teamMatches = db.matches.filter(m => m.home === teamName || m.away === teamName)
            calculateStats(teamMatches, teamName)

        }

    } 
    catch (error) 
    {
        console.error("Error:", error)
    }

}

function calculateStats(matches, team) 
{

    let pj = 0, pg = 0, pp = 0, pf = 0, pc = 0
    let otGames = 0, otWins = 0, otLosses = 0
    let statsPj = 0
    let q1 = 0, q2 = 0, q3 = 0, q4 = 0, ot = 0
    let reb = 0, oreb = 0, ast = 0, stl = 0, tov = 0

    matches.forEach(m => 
    {

        if(m.homePts === "-" || m.awayPts === "-") return
        
        const isHome = m.home === team
        const ptsFav = isHome ? parseInt(m.homePts) : parseInt(m.awayPts)
        const ptsCon = isHome ? parseInt(m.awayPts) : parseInt(m.homePts)
        
        if(!isNaN(ptsFav) && !isNaN(ptsCon))
        {
            pj++
            pf += ptsFav
            pc += ptsCon
            if(ptsFav > ptsCon) pg++
            else pp++
        }

        if(m.stats) 
        {

            const teamStats = isHome ? m.stats.home : m.stats.away

            let playedOT = false
            if (m.stats.home && m.stats.home.ot1 !== undefined && m.stats.home.ot1 !== '') playedOT = true
            if (m.stats.away && m.stats.away.ot1 !== undefined && m.stats.away.ot1 !== '') playedOT = true

            if (playedOT) 
            {
                otGames++
                if (ptsFav > ptsCon) otWins++
                else otLosses++
            }

            if(teamStats) 
            {
                statsPj++
                q1 += parseInt(teamStats.q1) || 0
                q2 += parseInt(teamStats.q2) || 0
                q3 += parseInt(teamStats.q3) || 0
                q4 += parseInt(teamStats.q4) || 0
                
                Object.keys(teamStats).forEach(key => 
                {
                    if(key.startsWith('ot')) ot += parseInt(teamStats[key]) || 0
                })

                reb += parseInt(teamStats.reb) || 0
                oreb += parseInt(teamStats.oreb) || 0
                ast += parseInt(teamStats.ast) || 0
                stl += parseInt(teamStats.stl) || 0
                tov += parseInt(teamStats.tov) || 0
            }

        }

    })

    document.getElementById('s-pj').innerText = pj
    document.getElementById('s-pg').innerText = pg
    document.getElementById('s-pp').innerText = pp

    document.getElementById('s-ot-games').innerText = otGames
    document.getElementById('s-ot-rec').innerText = `${otWins}-${otLosses}`

    const ppp = pj > 0 ? (pf / pj).toFixed(1) : "0.0";
    const pcp = pj > 0 ? (pc / pj).toFixed(1) : "0.0";
    document.getElementById('s-ppp').innerText = ppp
    document.getElementById('s-pcp').innerText = pcp

    const calcAvg = (total, games) => games > 0 ? (total / games).toFixed(1) : "0.0"

    document.getElementById('s-q1').innerText = calcAvg(q1, statsPj)
    document.getElementById('s-q2').innerText = calcAvg(q2, statsPj)
    document.getElementById('s-q3').innerText = calcAvg(q3, statsPj)
    document.getElementById('s-q4').innerText = calcAvg(q4, statsPj)
    document.getElementById('s-ot').innerText = calcAvg(ot, statsPj)

    document.getElementById('s-reb').innerText = calcAvg(reb, statsPj)
    document.getElementById('s-oreb').innerText = calcAvg(oreb, statsPj)
    document.getElementById('s-ast').innerText = calcAvg(ast, statsPj)
    document.getElementById('s-stl').innerText = calcAvg(stl, statsPj)
    document.getElementById('s-tov').innerText = calcAvg(tov, statsPj)
    
}

loadTeamData()
