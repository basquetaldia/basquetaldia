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

let localDB = { teams: [], matches: [], phases: [], channels: [], conferences: [] }
let calMonth = new Date().getMonth();
let calYear = new Date().getFullYear();

async function initApp() {
    try {
        const docRef = doc(dbFire, "liga_femenina", "data_v1")
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
            localDB = docSnap.data()
            if(!localDB.channels) localDB.channels = [];
            if(!localDB.conferences) localDB.conferences = [];
            populatePhases()
        } 
    } catch (error) { console.error("Error conectando a la base de datos:", error) }
}
initApp()

function populatePhases() {
    const phaseSelect = document.getElementById('phaseSelect');
    if(!phaseSelect) return;
    let options = '';
    const phases = localDB.phases && localDB.phases.length > 0 ? localDB.phases : [{name: "Fase Regular"}];
    phases.forEach(p => { options += `<option value="${p.name}">${p.name}</option>`; });
    phaseSelect.innerHTML = options;
    window.updatePublicConferenceSelect();
}

window.toggleMainView = (view) => {
    const btnZone = document.getElementById('btn-view-zone')
    const btnDaily = document.getElementById('btn-view-daily')
    const btnCalendar = document.getElementById('btn-view-calendar')
    
    const dailyFilters = document.getElementById('daily-filters')
    const zoneFilters = document.getElementById('zone-filters')
    
    const zoneContent = document.getElementById('view-zone-content')
    const dailyContent = document.getElementById('view-daily-content')
    const calendarContent = document.getElementById('view-calendar-content')

    btnZone.classList.remove('active'); btnDaily.classList.remove('active'); btnCalendar.classList.remove('active');
    dailyFilters.classList.add('hidden'); zoneFilters.classList.add('hidden');
    zoneContent.classList.add('hidden'); dailyContent.classList.add('hidden'); calendarContent.classList.add('hidden');

    if (view === 'zone') {
        btnZone.classList.add('active'); zoneFilters.classList.remove('hidden'); zoneContent.classList.remove('hidden');
    } else if (view === 'daily') {
        btnDaily.classList.add('active'); dailyFilters.classList.remove('hidden'); dailyContent.classList.remove('hidden');
        if(!document.getElementById('dailyDateSelect').value) window.setToday()
        else window.loadDailyMatches()
    } else if (view === 'calendar') {
        btnCalendar.classList.add('active'); 
        zoneFilters.classList.remove('hidden');
        calendarContent.classList.remove('hidden');
        window.renderCalendar();
    }
}

window.setToday = () => {
    const today = new Date(); const yyyy = today.getFullYear(); const mm = String(today.getMonth() + 1).padStart(2, '0'); const dd = String(today.getDate()).padStart(2, '0')
    document.getElementById('dailyDateSelect').value = `${yyyy}-${mm}-${dd}`
    window.loadDailyMatches()
}

window.updatePublicConferenceSelect = () => {
    const phaseName = document.getElementById('phaseSelect').value;
    const confSelect = document.getElementById('conferenceSelect');
    const teamFilter = document.getElementById('teamFilterSelect');
    if(!confSelect) return;

    const phaseObj = localDB.phases.find(p => p.name === phaseName);
    let uniqueConfs = phaseObj && phaseObj.conferences ? phaseObj.conferences : [];
    
    let options = '<option value="">Seleccionar Conferencia...</option>';
    options += '<option value="all">Todas las Conferencias</option>';
    
    uniqueConfs.sort().forEach(c => {
        if(c) options += `<option value="${c}">${c}</option>`;
    });

    confSelect.innerHTML = options;
    confSelect.disabled = false;

    if(teamFilter) {
        teamFilter.innerHTML = '<option value="">Todos los equipos</option>';
        teamFilter.disabled = false;
    }

    window.loadData();
};

window.loadData = () => {
    const phase = document.getElementById('phaseSelect') ? document.getElementById('phaseSelect').value : "Fase Regular";
    const confCode = document.getElementById('conferenceSelect') ? document.getElementById('conferenceSelect').value : "";
    const teamFilter = document.getElementById('teamFilterSelect');
    const selectedTeam = teamFilter ? teamFilter.value : "";
    
    if (!confCode) {
        document.getElementById('matches-container').innerHTML = '<p style="text-align:center; color:#888; padding:30px;">Selecciona una conferencia para ver los partidos.</p>';
        document.getElementById('standings-body').innerHTML = '<tr><td colspan="10" style="text-align:center; color:#888; padding:30px;">Esperando selección...</td></tr>';
        return;
    }

    let baseTeams = localDB.teams.filter(t => (!t.phase || t.phase === phase));
    let filteredMatches = localDB.matches.filter(m => (!m.phase || m.phase === phase));

    if (confCode === "all") {
        if (teamFilter) {
            teamFilter.innerHTML = '<option value="">Todos los equipos</option>';
            teamFilter.disabled = true;
        }
        document.getElementById('matches-container').innerHTML = '<p style="text-align:center; color:#888; padding:30px;">Para ver los partidos, selecciona una conferencia específica.</p>';
        renderStandings(baseTeams, filteredMatches); 
    } else {
        baseTeams = baseTeams.filter(t => t.conference === confCode);
        filteredMatches = filteredMatches.filter(m => m.conference === confCode);

        if (teamFilter) {
            teamFilter.innerHTML = '<option value="">Todos los equipos</option>';
            baseTeams.sort((a,b) => a.name.localeCompare(b.name)).forEach(t => {
                const opt = document.createElement('option'); opt.value = t.name; opt.textContent = t.name; teamFilter.appendChild(opt);
            });
            if (baseTeams.some(t => t.name === selectedTeam)) { teamFilter.value = selectedTeam; }
            teamFilter.disabled = false;
        }
        
        let teamFilteredMatches = filteredMatches;
        const currentTeam = teamFilter ? teamFilter.value : "";
        if (currentTeam) { teamFilteredMatches = filteredMatches.filter(m => m.home === currentTeam || m.away === currentTeam); }

        renderMatches(teamFilteredMatches, localDB.teams);
        renderStandings(baseTeams, filteredMatches); 
    }

    window.renderCalendar(); 
}

window.filterMatchesByTeam = () => { window.loadData(); }

function getTeamRecord(teamName, phase) {
    let wins = 0; let losses = 0;
    localDB.matches.forEach(m => {
        const matchPhase = m.phase || "Fase Regular";
        if (m.homePts !== '-' && m.awayPts !== '-' && matchPhase === phase) {
            const h = parseInt(m.homePts); const a = parseInt(m.awayPts);
            if (m.home === teamName) { if (h > a) wins++; else if (h < a) losses++; } 
            else if (m.away === teamName) { if (a > h) wins++; else if (a < h) losses++; }
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
        const groupKey = `${phaseName} - ${m.conference || 'Torneo'}`;
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
            const timeA = a.time || "00:00"; const timeB = b.time || "00:00"; return timeB.localeCompare(timeA);
        }).forEach(m => {
            const phaseMatched = m.phase || "Fase Regular";
            const homeTeam = localDB.teams.find(t => t.name === m.home) || { logo: defaultLogo };
            const awayTeam = localDB.teams.find(t => t.name === m.away) || { logo: defaultLogo };
            
            const hLogo = homeTeam.logo; const aLogo = awayTeam.logo;
            const hCode = homeTeam.code || m.home.substring(0,3).toUpperCase(); 
            const aCode = awayTeam.code || m.away.substring(0,3).toUpperCase();
            
            const hRecord = getTeamRecord(m.home, phaseMatched); const aRecord = getTeamRecord(m.away, phaseMatched);
            const channelObj = localDB.channels.find(c => c.name === m.channel);
            const channelHtml = channelObj ? `<img src="${channelObj.logo}" title="${channelObj.name}" style="height: 28px; object-fit: contain; margin-left: 10px; background: white; border-radius: 4px; padding: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">` : '';

            const hPts = parseInt(m.homePts); const aPts = parseInt(m.awayPts);
            const hWin = !isNaN(hPts) && !isNaN(aPts) && hPts > aPts ? 'winner' : '';
            const aWin = !isNaN(hPts) && !isNaN(aPts) && aPts > hPts ? 'winner' : '';
            const stadiumName = m.stadium && m.stadium.trim() !== '' ? m.stadium : 'Estadio a definir';
            const timeStr = m.time ? m.time : '--:--';
            const statusStr = (m.homePts !== '-' && m.awayPts !== '-') ? 'Finalizado' : 'Pendiente';

            html += `
            <div class="daily-match-card">
                <div class="dmc-info"><span class="dmc-time" style="display:flex; align-items:center;">${timeStr} ${channelHtml}</span><span class="dmc-status">${statusStr}</span></div>
                <div class="dmc-teams">
                    <div class="dmc-team-row"><div class="dmc-team-left"><img src="${hLogo}" class="dmc-logo"><div class="dmc-name-box"><span class="dmc-name">${hCode}</span><span class="dmc-record">(${hRecord})</span></div></div><span class="dmc-score ${hWin}">${m.homePts !== '-' ? m.homePts : '-'}</span></div>
                    <div class="dmc-team-row"><div class="dmc-team-left"><img src="${aLogo}" class="dmc-logo"><div class="dmc-name-box"><span class="dmc-name">${aCode}</span><span class="dmc-record">(${aRecord})</span></div></div><span class="dmc-score ${aWin}">${m.awayPts !== '-' ? m.awayPts : '-'}</span></div>
                    <div style="font-size:0.75rem; color:var(--cool-gray); margin-top:6px; display:flex; align-items:center; gap:5px;"><i class="ri-map-pin-line"></i> ${stadiumName}</div>
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
    if (matches.length === 0) { container.innerHTML = '<p style="text-align:center; color:#888; padding:30px;">No hay partidos cargados para esta selección.</p>'; return; }

    const groupedByRound = {}
    matches.forEach(m => {
        if (!groupedByRound[m.round]) groupedByRound[m.round] = {};
        if (!groupedByRound[m.round][m.date]) groupedByRound[m.round][m.date] = [];
        groupedByRound[m.round][m.date].push(m);
    });
    
    const rounds = Object.keys(groupedByRound).sort((a, b) => {
        const numA = a.match(/\d+/) ? parseInt(a.match(/\d+/)[0]) : 0;
        const numB = b.match(/\d+/) ? parseInt(b.match(/\d+/)[0]) : 0;
        if (numA !== numB) return numA - numB;
        return a.localeCompare(b);
    });
    
    let isFirst = true

    rounds.forEach(round => {
        const activeClass = isFirst ? 'active' : ''; const showClass = isFirst ? 'show' : ''; isFirst = false;
        let matchesHtml = ''; let totalMatchesInRound = 0;
        const dates = Object.keys(groupedByRound[round]).sort((a, b) => new Date(b) - new Date(a));

        dates.forEach(dateStr => {
            const dayMatches = groupedByRound[round][dateStr];
            const dateInfo = formatDateInfo(dateStr);
            const dayString = `${dateInfo.dayName} ${dateInfo.dateShort}`;
            const count = dayMatches.length; totalMatchesInRound += count;

            matchesHtml += `
            <details class="day-accordion" open>
                <summary><i class="ri-calendar-event-fill" style="margin-right:8px;"></i> ${dayString} <span style="font-size:0.75rem; color:#888; margin-left:auto;">(${count} partido${count > 1 ? 's' : ''})</span></summary>
                <div class="day-accordion-content">`;

            dayMatches.sort((a, b) => (b.time || "00:00").localeCompare(a.time || "00:00")).forEach(m => {
                const phaseMatched = m.phase || "Fase Regular";
                const homeTeam = allTeams.find(t => t.name === m.home) || { logo: defaultLogo };
                const awayTeam = allTeams.find(t => t.name === m.away) || { logo: defaultLogo };
                
                const hLogo = homeTeam.logo; const aLogo = awayTeam.logo;
                const hCode = homeTeam.code || m.home.substring(0,3).toUpperCase(); 
                const aCode = awayTeam.code || m.away.substring(0,3).toUpperCase();
                const hRecord = getTeamRecord(m.home, phaseMatched); const aRecord = getTeamRecord(m.away, phaseMatched);

                const channelObj = localDB.channels.find(c => c.name === m.channel);
                const channelHtml = channelObj ? `<img src="${channelObj.logo}" title="${channelObj.name}" style="height: 28px; object-fit: contain; margin-left: 10px; background: white; border-radius: 4px; padding: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">` : '';

                const hPts = parseInt(m.homePts); const aPts = parseInt(m.awayPts);
                const hWin = !isNaN(hPts) && !isNaN(aPts) && hPts > aPts ? 'winner' : '';
                const aWin = !isNaN(hPts) && !isNaN(aPts) && aPts > hPts ? 'winner' : '';
                const stadiumName = m.stadium && m.stadium.trim() !== '' ? m.stadium : 'Estadio a definir';
                const timeStr = m.time ? m.time : '--:--';
                const statusStr = (m.homePts !== '-' && m.awayPts !== '-') ? 'Finalizado' : 'Pendiente';

                matchesHtml += `
                <div class="daily-match-card">
                    <div class="dmc-info"><span class="dmc-time" style="display:flex; align-items:center;">${timeStr} ${channelHtml}</span><span class="dmc-status">${statusStr}</span></div>
                    <div class="dmc-teams">
                        <div class="dmc-team-row"><div class="dmc-team-left"><img src="${hLogo}" class="dmc-logo"><div class="dmc-name-box"><span class="dmc-name">${hCode}</span><span class="dmc-record">(${hRecord})</span></div></div><span class="dmc-score ${hWin}">${m.homePts !== '-' ? m.homePts : '-'}</span></div>
                        <div class="dmc-team-row"><div class="dmc-team-left"><img src="${aLogo}" class="dmc-logo"><div class="dmc-name-box"><span class="dmc-name">${aCode}</span><span class="dmc-record">(${aRecord})</span></div></div><span class="dmc-score ${aWin}">${m.awayPts !== '-' ? m.awayPts : '-'}</span></div>
                        <div style="font-size:0.75rem; color:var(--cool-gray); margin-top:6px; display:flex; align-items:center; gap:5px;"><i class="ri-map-pin-line"></i> ${stadiumName}</div>
                    </div>
                </div>`
            });
            matchesHtml += `</div></details>`;
        });
        container.innerHTML += `<div class="round-wrapper"><div class="round-header ${activeClass}" onclick="toggleRound(this)"><span>${round} <span style="font-size:0.8rem; color:var(--cool-gray); margin-left:8px; font-weight:700;">(${totalMatchesInRound} partido${totalMatchesInRound > 1 ? 's' : ''})</span></span><i class='bx bx-chevron-down arrow-icon'></i></div><div class="round-content ${showClass}">${matchesHtml}</div></div>`
    })
}

window.changeMonth = (dir) => {
    calMonth += dir;
    if (calMonth > 11) { calMonth = 0; calYear++; } else if (calMonth < 0) { calMonth = 11; calYear--; }
    window.renderCalendar();
}

window.renderCalendar = () => {
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const dayNamesMobile = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']; 
    document.getElementById('calendar-month-year').innerText = `${monthNames[calMonth]} ${calYear}`;
    
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = `
        <div class="calendar-day-header">Lun</div><div class="calendar-day-header">Mar</div><div class="calendar-day-header">Mié</div>
        <div class="calendar-day-header">Jue</div><div class="calendar-day-header">Vie</div><div class="calendar-day-header">Sáb</div>
        <div class="calendar-day-header">Dom</div>
    `;

    let firstDay = new Date(calYear, calMonth, 1).getDay() - 1;
    if (firstDay < 0) firstDay = 6;
    
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) { grid.innerHTML += `<div class="calendar-day empty"></div>`; }

    const phase = document.getElementById('phaseSelect') ? document.getElementById('phaseSelect').value : "Fase Regular";
    const confCode = document.getElementById('conferenceSelect') ? document.getElementById('conferenceSelect').value : "";
    const currentTeam = document.getElementById('teamFilterSelect') ? document.getElementById('teamFilterSelect').value : "";
    
    const matchesByDate = {};
    
    localDB.matches.forEach(m => {
        const matchPhase = m.phase || "Fase Regular";
        if(m.date && matchPhase === phase) {
            if (confCode && confCode !== "all" && m.conference !== confCode) return;
            if (currentTeam && confCode !== "all" && m.home !== currentTeam && m.away !== currentTeam) return;

            const [y, mo, d] = m.date.split('-');
            if(parseInt(y) === calYear && parseInt(mo) - 1 === calMonth) {
                const dayNum = parseInt(d);
                if(!matchesByDate[dayNum]) matchesByDate[dayNum] = [];
                matchesByDate[dayNum].push(m);
            }
        }
    });

    for (let i = 1; i <= daysInMonth; i++) {
        const currentDate = new Date(calYear, calMonth, i);
        const currentDayStr = dayNamesMobile[currentDate.getDay()];
        
        let dayHtml = `<div class="calendar-day"><div class="calendar-date"><span class="mobile-day-name">${currentDayStr}</span>${i}</div><div class="calendar-events-container">`;
        if (matchesByDate[i]) {
            matchesByDate[i].sort((a,b) => (a.time || "00:00").localeCompare(b.time || "00:00")).forEach(m => {
                const tHome = localDB.teams.find(t => t.name === m.home) || { code: m.home.substring(0,3).toUpperCase(), logo: defaultLogo };
                const tAway = localDB.teams.find(t => t.name === m.away) || { code: m.away.substring(0,3).toUpperCase(), logo: defaultLogo };
                const channelObj = localDB.channels.find(c => c.name === m.channel);
                const channelHtml = channelObj ? `<img src="${channelObj.logo}" title="${channelObj.name}" class="cal-channel-logo">` : '';

                let matchResultHtml = '';
                let hWeight = '500'; let aWeight = '500';
                let hColor = 'var(--text-main)'; let aColor = 'var(--text-main)';
                
                if (m.homePts !== '-' && m.awayPts !== '-') {
                    const hPts = parseInt(m.homePts); const aPts = parseInt(m.awayPts);
                    hWeight = hPts > aPts ? '900' : '500'; aWeight = aPts > hPts ? '900' : '500';
                    hColor = hPts > aPts ? 'var(--accent-color)' : 'var(--text-main)';
                    aColor = aPts > hPts ? 'var(--accent-color)' : 'var(--text-main)';
                    matchResultHtml = `<div class="cal-ev-res-box"><span class="cal-ev-res-pts" style="font-weight:${hWeight}; color:${hColor};">${hPts}</span><span class="cal-ev-res-sep">-</span><span class="cal-ev-res-pts" style="font-weight:${aWeight}; color:${aColor};">${aPts}</span></div>`;
                } else {
                    matchResultHtml = `<span class="cal-ev-vs">vs</span>`;
                }

                dayHtml += `
                <div class="calendar-event" title="${m.home} vs ${m.away}">
                    <div class="cal-ev-top">
                        <span class="cal-ev-time"><i class="ri-time-line"></i> ${m.time} Hs</span>
                        ${channelHtml}
                    </div>
                    <div class="cal-ev-match">
                        <div class="cal-ev-team home">
                            <span class="cal-ev-code" style="font-weight:${hWeight}; color:${hColor};">${tHome.code}</span>
                            <img src="${tHome.logo}" class="cal-team-logo">
                        </div>
                        ${matchResultHtml}
                        <div class="cal-ev-team away">
                            <img src="${tAway.logo}" class="cal-team-logo">
                            <span class="cal-ev-code" style="font-weight:${aWeight}; color:${aColor};">${tAway.code}</span>
                        </div>
                    </div>
                </div>`;
            });
        }
        dayHtml += `</div></div>`; grid.innerHTML += dayHtml;
    }
}

function calculateStandings(teams, matches) {
    let standings = teams.map(t => ({
        name: t.name, code: t.code, logo: t.logo,
        pj: 0, pg: 0, pp: 0, pf: 0, pc: 0, pts: 0, pct: 0, form: [] 
    }))

    const sortedMatches = [...matches].sort((a, b) => new Date(a.date) - new Date(b.date));

    sortedMatches.forEach(m => {
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
                    standings[hIdx].pg++; standings[hIdx].pts += 2; standings[hIdx].form.push('G');
                    standings[aIdx].pp++; standings[aIdx].pts += 1; standings[aIdx].form.push('P');
                } else if (aPts > hPts) { 
                    standings[aIdx].pg++; standings[aIdx].pts += 2; standings[aIdx].form.push('G');
                    standings[hIdx].pp++; standings[hIdx].pts += 1; standings[hIdx].form.push('P');
                } else { 
                    standings[hIdx].pts += 1; standings[aIdx].pts += 1
                }
            }
        }
    })

    standings.forEach(t => { t.pct = t.pj > 0 ? (t.pg / t.pj) : 0; })
    standings.sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        const diffA = a.pf - a.pc; const diffB = b.pf - b.pc;
        if (diffA !== diffB) return diffB - diffA;
        if (b.pf !== a.pf) return b.pf - a.pf;
        return 0;
    });
    return standings;
}

function renderStandings(teams, matches) {
    const tbody = document.getElementById('standings-body')
    tbody.innerHTML = ''
    if (teams.length === 0) { tbody.innerHTML = '<tr><td colspan=\"10\" style="text-align:center; color:#888; padding:30px;">No hay equipos registrados.</td></tr>'; return; }

    const standings = calculateStandings(teams, matches);

    standings.forEach((t, i) => {
        const dg = t.pf - t.pc
        let dgClass = 'dg-neu'; let dgText = dg;
        if(dg > 0) { dgClass = 'dg-pos'; dgText = '+' + dg }
        if(dg < 0) { dgClass = 'dg-neg' }
        
        const codeName = t.code ? t.code : t.name.substring(0,3).toUpperCase();
        let pctDisplay = "0.00"; if (t.pj > 0) { pctDisplay = (t.pg / t.pj).toFixed(2); }

        let posColorBg = '#f1f5f9'; let posColorText = 'var(--black)'; let posBorder = '#cbd5e1';
        
        if (i < 4) { posColorBg = '#28a745'; posColorText = '#fff'; posBorder = '#28a745'; } 
        else if (i >= 4 && i < 12) { posColorBg = '#8fd19e'; posColorText = '#fff'; posBorder = '#8fd19e'; }
        else if (i === 16) { posColorBg = '#dc3545'; posColorText = '#fff'; posBorder = '#dc3545'; }

        const last5 = t.form.slice(-5);
        let rachaHtml = '<div class="racha-box">';
        if (last5.length === 0) { rachaHtml += '<span style="color:#888; font-size:0.8rem;">-</span>'; } 
        else { last5.forEach(res => { const badgeClass = res === 'G' ? 'r-win' : 'r-loss'; rachaHtml += `<span class="r-badge ${badgeClass}">${res}</span>`; }); }
        rachaHtml += '</div>';

        const teamLink = `equipo.html?liga=liga_femenina&equipo=${encodeURIComponent(t.name)}`;

        const row = `
            <tr>
                <td><div class=\"cell-pos-box\" style=\"background:${posColorBg}; color:${posColorText}; border-color:${posBorder};\">${i + 1}</div></td>
                <td style=\"text-align:center;\">
                    <a href="${teamLink}" target="_blank" class=\"team-link\" style="display:inline-block; text-decoration:none; color:inherit;">
                        <img src=\"${t.logo}\" class=\"t-logo\" title=\"${t.name}\" style="margin: 0 auto; display: block;">
                        <span class=\"t-name-full\">${t.name}</span>
                        <span class=\"t-name-code\">${codeName}</span>
                    </a>
                </td>
                <td class=\"col-pj\">${t.pj}</td><td class=\"col-pg\">${t.pg}</td><td class=\"col-pp\">${t.pp}</td><td class=\"col-pct\">${pctDisplay}</td>
                <td class=\"col-pf\">${t.pf}</td><td class=\"col-pc\">${t.pc}</td><td class=\"col-dg ${dgClass}\">${dgText}</td><td class=\"col-racha\">${rachaHtml}</td>
            </tr>`
        tbody.innerHTML += row
    })
}

function formatDateInfo(dateString) {
    if(!dateString) return { dayName: '-', dateShort: '-' }
    const dateObj = new Date(dateString + 'T00:00:00')
    const days = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']
    const dayNum = String(dateObj.getDate()).padStart(2, '0')
    const monthNum = String(dateObj.getMonth() + 1).padStart(2, '0')
    return { dayName: days[dateObj.getDay()], dateShort: `${dayNum}/${monthNum}` }
}

window.toggleRound = (header) => { header.classList.toggle('active'); header.nextElementSibling.classList.toggle('show') }