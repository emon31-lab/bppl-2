(() => {
  'use strict';

  /* ═════════ DEFAULT TEAMS (Backup if API fails) ═════════ */
  const DEFAULT_TEAMS = [
    { id: 'beast', name: 'FC BEAST', logo: '', formation: '1-1-1-1', players: [ { name: 'SADOR', role: 'ST', captain: true }, { name: 'AMIN', role: 'CB' }, { name: 'HAMIM', role: 'GK' }, { name: 'SADMAN', role: 'AMF' } ] },
    { id: 'thunder', name: 'FC THUNDER', logo: '', formation: '1-1-1-1', players: [ { name: 'SAYEM', role: 'ST', captain: true }, { name: 'NOYON', role: 'GK' }, { name: 'SIAM M.T.', role: 'AMF' }, { name: 'RAFAN', role: 'CB' } ] },
    { id: 'warrior', name: 'FC WARRIOR', logo: '', formation: '1-1-1-1', players: [ { name: 'MARUF', role: 'ST', captain: true }, { name: 'NUJRUL', role: 'AMF' }, { name: 'ROBIUL', role: 'GK' }, { name: 'IFTI K.T', role: 'CB' } ] },
    { id: 'stricker', name: 'FC STRICKER', logo: '', formation: '1-1-1-1', players: [ { name: 'SIAM', role: 'CB', captain: true }, { name: 'SUMON', role: 'GK' }, { name: 'LABIB', role: 'AMF' }, { name: 'ESHAN', role: 'ST' } ] },
    { id: 'eagle', name: 'FC EAGLE', logo: '', formation: '1-1-1-1', players: [ { name: 'EMON', role: 'ST', captain: true }, { name: 'SIJAN', role: 'AMF' }, { name: 'MIRAZ', role: 'GK' }, { name: 'SAMIR', role: 'CB' } ] },
    { id: 'united', name: 'FC UNITED', logo: '', formation: '1-1-1-1', players: [ { name: 'MEHERAJ', role: 'ST', captain: true }, { name: 'FAHAD', role: 'AMF' }, { name: 'ONI', role: 'CB' }, { name: 'SADMAN B.N', role: 'GK' } ] },
    { id: 'king', name: 'FC KING', logo: '', formation: '1-1-1-1', players: [ { name: 'M.SHAWON 09', role: 'CB', captain: true }, { name: 'RASEL', role: 'ST' }, { name: 'ARAFAT', role: 'AMF' }, { name: 'MONIR', role: 'GK' } ] },
    { id: 'falcon', name: 'FC FALCON', logo: '', formation: '1-1-1-1', players: [ { name: 'RIAZ', role: 'ST', captain: true }, { name: 'B.IFTI', role: 'AMF' }, { name: 'SHIHAB', role: 'GK' }, { name: 'AYMON', role: 'CB' } ] },
    { id: 'lion', name: 'FC LION', logo: '', formation: '1-1-1-1', players: [ { name: 'JAMIL', role: 'GK', captain: true }, { name: 'EMON', role: 'ST' }, { name: 'ABID', role: 'AMF' }, { name: 'ANAM', role: 'CB' } ] },
    { id: 'royal', name: 'FC ROYAL', logo: '', formation: '1-1-1-1', players: [ { name: 'SAKIB', role: 'ST', captain: true }, { name: 'IBRAHIM', role: 'CB' }, { name: 'ISTIAK', role: 'AMF' }, { name: 'SOURAV', role: 'GK' } ] }
  ];

  /* ═════════ STATE ═════════ */
  let state = { groupA: [], groupB: [], matches: [], approved: false };
  let teams = [];
  let activeTab = 'standings';
  let schedFilter = 'ALL';
  let adminFilter = 'ALL';
  let soundOn = true;
  let token = localStorage.getItem('bppl_token') || '';
  let adminUnlocked = false;
  let audioCtx = null;

  const $ = id => document.getElementById(id);
  const teamById = id => teams.find(t => t.id === id);

  /* ═════════ API ═════════ */
  async function api(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (opts.auth) headers['x-admin-token'] = token;
    const res = await fetch(path, {
      method: opts.method || 'GET',
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Request failed');
    }
    return res.json();
  }

  async function loadState() { state = await api('/api/state'); }
  async function loadTeams() {
    try {
      const fetched = await api('/api/teams');
      teams = (fetched && fetched.length > 0) ? fetched : DEFAULT_TEAMS;
    } catch (e) {
      teams = DEFAULT_TEAMS;
    }
  }

  /* ═════════ HELPERS ═════════ */
  function showToast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function playTick() {
    if (!soundOn) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(680, audioCtx.currentTime);
      g.gain.setValueAtTime(0.08, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(); o.stop(audioCtx.currentTime + 0.09);
    } catch(e) {}
  }

  /* ═════════ STANDINGS LOGIC (Updated: Standard Football Rules) ═════════ */
  function computeStandings(groupKey) {
    const ids = groupKey === 'A' ? state.groupA : state.groupB;
    const map = {};
    ids.forEach(id => map[id] = { id, mp:0, w:0, d:0, l:0, gf:0, ga:0, gd:0, pts:0 });

    state.matches
      .filter(m => m.stage === 'GROUP' && m.group === groupKey && m.status === 'FT')
      .forEach(m => {
        const h = map[m.homeId], a = map[m.awayId];
        if (!h || !a) return;
        const hs = +m.homeScore || 0, as = +m.awayScore || 0;
        h.mp++; a.mp++; h.gf += hs; h.ga += as; a.gf += as; a.ga += hs;

        if (hs > as) { h.w++; h.pts += 3; a.l++; }
        else if (as > hs) { a.w++; a.pts += 3; h.l++; }
        else {
          // Standard Rule: Draw means both get 1 point. Goals are still added.
          h.d++; a.d++; h.pts += 1; a.pts += 1;
        }
      });
    return Object.values(map)
      .map(r => ({ ...r, gd: r.gf - r.ga }))
      .sort((x,y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || (teamById(x.id)?.name || '').localeCompare(teamById(y.id)?.name || ''));
  }

  function resolveWinner(m, hId, aId) {
    if (!m || m.status !== 'FT') return null;
    if (m.homeScore > m.awayScore) return hId;
    if (m.awayScore > m.homeScore) return aId;
    return m.winnerId || null; // Only for Knockout Stage
  }

  function getResolved() {
    const stA = computeStandings('A'), stB = computeStandings('B');
    const a1 = stA[0]?.id, a2 = stA[1]?.id, a3 = stA[2]?.id, a4 = stA[3]?.id;
    const b1 = stB[0]?.id, b2 = stB[1]?.id, b3 = stB[2]?.id, b4 = stB[3]?.id;

    const qf1 = state.matches.find(m => m.id === 'QF1');
    const qf2 = state.matches.find(m => m.id === 'QF2');
    const qf3 = state.matches.find(m => m.id === 'QF3');
    const qf4 = state.matches.find(m => m.id === 'QF4');
    const sf1 = state.matches.find(m => m.id === 'SF1');
    const sf2 = state.matches.find(m => m.id === 'SF2');
    const fin = state.matches.find(m => m.id === 'FINAL');

    // Admin Customization Logic: If Admin manually selects a team (homeId/awayId), use it. Else fallback to auto-calculated.
    const qf1H = qf1?.homeId || a1, qf1A = qf1?.awayId || b4;
    const qf2H = qf2?.homeId || a2, qf2A = qf2?.awayId || b3;
    const qf3H = qf3?.homeId || b1, qf3A = qf3?.awayId || a4;
    const qf4H = qf4?.homeId || b2, qf4A = qf4?.awayId || a3;

    const qf1W = resolveWinner(qf1, qf1H, qf1A);
    const qf2W = resolveWinner(qf2, qf2H, qf2A);
    const qf3W = resolveWinner(qf3, qf3H, qf3A);
    const qf4W = resolveWinner(qf4, qf4H, qf4A);

    const sf1H = sf1?.homeId || qf1W, sf1A = sf1?.awayId || qf2W;
    const sf2H = sf2?.homeId || qf3W, sf2A = sf2?.awayId || qf4W;

    const sf1W = resolveWinner(sf1, sf1H, sf1A);
    const sf2W = resolveWinner(sf2, sf2H, sf2A);

    const finH = fin?.homeId || sf1W, finA = fin?.awayId || sf2W;
    const champ = resolveWinner(fin, finH, finA);

    return { qf1, qf2, qf3, qf4, sf1, sf2, fin, qf1H, qf1A, qf2H, qf2A, qf3H, qf3A, qf4H, qf4A, sf1H, sf1A, sf2H, sf2A, finH, finA, champ };
  }

  /* ═════════ ROUND OF 8 POINTS ═════════ */
  function isGroupStageComplete() {
    const gm = state.matches.filter(m => m.stage === 'GROUP');
    return gm.length > 0 && gm.every(m => m.status === 'FT');
  }

  function computeRoundOf8Points() {
    const qfIds = ['QF1', 'QF2', 'QF3', 'QF4'];
    const r = getResolved();
    const qfTeams = [r.qf1H, r.qf1A, r.qf2H, r.qf2A, r.qf3H, r.qf3A, r.qf4H, r.qf4A].filter(Boolean);
    const map = {};
    qfTeams.forEach(id => {
      if (!map[id]) map[id] = { id, mp:0, w:0, d:0, l:0, gf:0, ga:0, gd:0, pts:0 };
    });
    state.matches.filter(m => qfIds.includes(m.id) && m.status === 'FT').forEach(m => {
      const h = map[m.homeId], a = map[m.awayId];
      if (!h || !a) return;
      const hs = +m.homeScore || 0, as = +m.awayScore || 0;
      h.mp++; a.mp++; h.gf += hs; h.ga += as; a.gf += as; a.ga += hs;
      if (hs > as) { h.w++; h.pts += 3; a.l++; }
      else if (as > hs) { a.w++; a.pts += 3; h.l++; }
      else {
        h.d++; a.d++;
        // KO Stage Tie-Breaker logic remains for QFs if needed, but standard 1 pt is fine too.
        if (m.winnerId === m.homeId) { h.w++; a.l++; h.pts += 2; a.pts += 1; }
        else if (m.winnerId === m.awayId) { a.w++; h.l++; a.pts += 2; h.pts += 1; }
        else { h.pts += 1; a.pts += 1; }
      }
    });
    return Object.values(map)
      .map(r => ({ ...r, gd: r.gf - r.ga }))
      .sort((x,y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf);
  }

  function computeTopScorers() {
    const scorers = {};
    state.matches.forEach(m => {
      if (m.status === 'FT' && m.scorers) {
        m.scorers.forEach(s => {
          if (!scorers[s.name]) scorers[s.name] = { name: s.name, teamId: s.teamId, goals: 0 };
          scorers[s.name].goals++;
        });
      }
    });
    return Object.values(scorers).sort((a,b) => b.goals - a.goals).slice(0, 5);
  }

  function fmtTime(t) {
    if (!t) return 'TBD';
    const [h, m] = t.split(':').map(Number);
    const ap = h >= 12 ? 'PM' : 'AM';
    return `${(h % 12) || 12}:${String(m).padStart(2,'0')} ${ap}`;
  }

  const logoHTML = (team) => team && team.logo ? `<img src="${team.logo}" alt="${team.name}" onerror="this.style.display='none'">` : '';

  /* ═════════ RENDER MAIN ═════════ */
  function render() {
    renderStandings();
    renderRoundOf8();
    renderSchedule();
    renderRoadmap();
    renderTeams();
    renderAdmin();
    renderTopScorers();
    $('statusText').textContent = state.approved ? 'Session - 02 • Live' : 'Session - 02 • Draw Pending';
  }

  function renderStandings() {
    $('pending').classList.toggle('hidden', state.approved);
    $('approved').classList.toggle('hidden', !state.approved);
    if (!state.approved) return;

    ['A','B'].forEach(g => {
      const tbody = $('body' + g);
      const rows = computeStandings(g);
      tbody.innerHTML = rows.map((r, i) => {
        const t = teamById(r.id);
        const gdClass = r.gd > 0 ? 'gd-pos' : r.gd < 0 ? 'gd-neg' : '';
        return `<tr class="${i < 4 ? 'qual' : ''}" data-team-id="${r.id}">
          <td class="tl"><div class="club"><span class="pos">${i+1}</span>${logoHTML(t)}<span>${t?.name || r.id}</span></div></td>
          <td>${r.mp}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td>
          <td class="${gdClass}">${r.gd > 0 ? '+' : ''}${r.gd}</td>
          <td class="pts">${r.pts}</td>
        </tr>`;
      }).join('');
    });
  }

  function renderRoundOf8() {
    if (!state.approved || !isGroupStageComplete()) {
      const ex = document.getElementById('roundOf8Section');
      if (ex) ex.classList.add('hidden');
      return;
    }
    let section = document.getElementById('roundOf8Section');
    if (!section) {
      const approved = document.getElementById('approved');
      if (!approved) return;
      section = document.createElement('div');
      section.id = 'roundOf8Section';
      section.className = 'card group-card';
      section.style.cssText = 'border-top:3px solid #3b82f6;border-top-left-radius:4px;border-top-right-radius:4px;';
      const groupBCard = approved.querySelector('.border-amber');
      if (groupBCard && groupBCard.parentNode) {
        groupBCard.parentNode.insertBefore(section, groupBCard.nextSibling);
      } else {
        approved.appendChild(section);
      }
    }
    section.classList.remove('hidden');
    const rows = computeRoundOf8Points();
    section.innerHTML = `
      <div class="group-head">
        <span class="dot" style="background:#3b82f6; box-shadow:0 0 10px #3b82f6;"></span>
        <h3>Round of 8 (Quarter-Finals)</h3>
      </div>
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th class="tl">Club</th><th>MP</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead>
          <tbody id="bodyRoundOf8"></tbody>
        </table>
      </div>`;
    const tbody = section.querySelector('#bodyRoundOf8');
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:12px">No QF matches played yet</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map((r, i) => {
      const t = teamById(r.id);
      const gdClass = r.gd > 0 ? 'gd-pos' : r.gd < 0 ? 'gd-neg' : '';
      return `<tr data-team-id="${r.id}">
        <td class="tl"><div class="club"><span class="pos">${i+1}</span>${logoHTML(t)}<span>${t?.name || r.id}</span></div></td>
        <td>${r.mp}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td>
        <td class="${gdClass}">${r.gd > 0 ? '+' : ''}${r.gd}</td>
        <td class="pts">${r.pts}</td>
      </tr>`;
    }).join('');
  }

  function renderTopScorers() {
    const list = $('topScorersList');
    if (!list) return;
    const scorers = computeTopScorers();
    if (scorers.length === 0) {
      list.innerHTML = `<div class="empty-note">No goals scored yet</div>`;
      return;
    }
    list.innerHTML = scorers.map((s, i) => {
      const team = teamById(s.teamId);
      return `<div class="scorer-row">
        <span class="scorer-rank">#${i+1}</span>
        <span class="scorer-name">${s.name}</span>
        <span class="scorer-team">${team ? team.name : ''}</span>
        <span class="scorer-goals">${s.goals} ⚽</span>
      </div>`;
    }).join('');
  }

  function renderSchedule() {
    const list = $('matchList');
    if (!state.approved) {
      $('schedCount').textContent = '0';
      list.innerHTML = `<div class="card pending"><p>Schedule unlocks after admin approves the draw.</p></div>`;
      return;
    }
    const r = getResolved();
    const filtered = state.matches.filter(m => {
      if (schedFilter === 'ALL') return true;
      if (schedFilter === 'LIVE') return m.status === 'LIVE';
      if (schedFilter === 'FT') return m.status === 'FT';
      if (schedFilter === 'KO') return m.group === 'KO';
      return m.group === schedFilter;
    });
    $('schedCount').textContent = `${filtered.length}`;
    list.innerHTML = filtered.map(m => {
      let hId, aId;
      if (m.stage === 'GROUP') { hId = m.homeId; aId = m.awayId; }
      else {
        const map = { QF1: [r.qf1H, r.qf1A], QF2: [r.qf2H, r.qf2A], QF3: [r.qf3H, r.qf3A], QF4: [r.qf4H, r.qf4A], SF1: [r.sf1H, r.sf1A], SF2: [r.sf2H, r.sf2A], FINAL: [r.finH, r.finA] };
        [hId, aId] = map[m.id] || [null, null];
      }
      const ht = teamById(hId), at = teamById(aId);
      const hName = ht?.name || 'TBD', aName = at?.name || 'TBD';
      const tag = m.group === 'KO' ? `<span class="tag tag-KO">${m.label.split(' ')[0]}</span>` : `<span class="tag tag-${m.group}">Group ${m.group}</span>`;
      const badge = m.status === 'LIVE' ? '<span class="badge badge-live">● LIVE</span>' : m.status === 'FT' ? '<span class="badge badge-ft">FT</span>' : '<span class="badge badge-up">UPCOMING</span>';
      const center = m.status === 'UPCOMING'
        ? `<span class="time-meta">${fmtTime(m.time)}</span><span class="date-meta">${m.date || ''}</span>`
        : `<span class="score ${m.status === 'LIVE' ? 'live' : ''}">${m.homeScore} - ${m.awayScore}</span><span class="date-meta">${fmtTime(m.time)}</span>`;
      
      let penWinner = '';
      if (m.stage === 'KO' && m.status === 'FT' && m.homeScore === m.awayScore && m.winnerId) {
        penWinner = `<div class="pen-winner">PEN: ${teamById(m.winnerId)?.name}</div>`;
      }
      return `<div class="match ${m.status === 'LIVE' ? 'live' : ''}">
        <div class="match-head"><div class="match-tag"><span style="font-size:9px;color:#94a3b8;font-weight:800">#${m.matchNo}</span>${tag}</div>${badge}</div>
        <div class="match-body">
          <div class="team-side" data-team-id="${hId || ''}">${logoHTML(ht)}<span>${hName}</span></div>
          <div class="match-center">${center}${penWinner}</div>
          <div class="team-side right" data-team-id="${aId || ''}"><span>${aName}</span>${logoHTML(at)}</div>
        </div>
      </div>`;
    }).join('') || '<div class="card pending"><p>No matches in this filter.</p></div>';
  }

  function renderRoadmap() {
    const el = $('roadmap');
    if (!state.approved) {
      el.innerHTML = `<div class="card pending"><p>Roadmap unlocks after group approval.</p></div>`;
      return;
    }
    const r = getResolved();
    const koRow = (m, hId, aId, hFallback, aFallback) => {
      const ht = teamById(hId), at = teamById(aId);
      const showScore = m && m.status !== 'UPCOMING';
      return `
        <div class="ko-row"><div class="ko-team" data-team-id="${hId || ''}">${logoHTML(ht)}<span>${ht?.name || hFallback}</span></div><div class="ko-score">${showScore ? m.homeScore : '-'}</div></div>
        <div class="ko-row" style="margin-bottom:10px"><div class="ko-team" data-team-id="${aId || ''}">${logoHTML(at)}<span>${at?.name || aFallback}</span></div><div class="ko-score">${showScore ? m.awayScore : '-'}</div></div>`;
    };
    const champ = r.champ ? teamById(r.champ) : null;
    el.innerHTML = `
      <div class="roadmap-stage"><p class="stage-label">Quarter-Final 1</p>${koRow(r.qf1, r.qf1H, r.qf1A, 'TBD', 'TBD')}</div>
      <div class="roadmap-stage"><p class="stage-label">Quarter-Final 2</p>${koRow(r.qf2, r.qf2H, r.qf2A, 'TBD', 'TBD')}</div>
      <div class="roadmap-stage"><p class="stage-label">Quarter-Final 3</p>${koRow(r.qf3, r.qf3H, r.qf3A, 'TBD', 'TBD')}</div>
      <div class="roadmap-stage"><p class="stage-label">Quarter-Final 4</p>${koRow(r.qf4, r.qf4H, r.qf4A, 'TBD', 'TBD')}</div>
      <div class="roadmap-stage"><p class="stage-label">Semi-Final 1</p>${koRow(r.sf1, r.sf1H, r.sf1A, 'TBD', 'TBD')}</div>
      <div class="roadmap-stage"><p class="stage-label">Semi-Final 2</p>${koRow(r.sf2, r.sf2H, r.sf2A, 'TBD', 'TBD')}</div>
      <div class="roadmap-stage"><p class="stage-label">🏆 Grand Final</p>${koRow(r.fin, r.finH, r.finA, 'TBD', 'TBD')}</div>
      <div class="champion" ${champ ? `data-team-id="${champ.id}"` : ''}>
        <p style="font-size:9px;font-weight:800;color:#f5c542;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">Session-02 Champion</p>
        ${champ ? `<img src="${champ.logo}" alt="" onerror="this.style.display='none'"><h3>${champ.name}</h3><p>${champ.players.map(p => p.name).join(' • ')}</p>` : `<div style="font-size:32px;margin:6px 0">🏆</div><p>To be crowned</p>`}
      </div>`;
  }

  function renderTeams() {
    $('teamList').innerHTML = teams.map(t => {
      const inA = state.groupA.includes(t.id), inB = state.groupB.includes(t.id);
      const pill = inA ? '<span class="group-pill A">Group A</span>' : inB ? '<span class="group-pill B">Group B</span>' : '<span class="group-pill none">Unassigned</span>';
      return `<div class="team-row" data-team-id="${t.id}">
        <img src="${t.logo}" alt="" onerror="this.style.display='none';this.insertAdjacentHTML('afterend','<div style=&quot;width:42px;height:42px;border-radius:11px;background:#0a1425;display:grid;place-items:center;font-size:20px;flex-shrink:0&quot;>⚽</div>')">
        <div class="info"><div class="name-row"><span class="name">${t.name}</span>${pill}</div><div class="players">${t.players.map(p => `<span class="player-tag">${p.name} ${p.captain ? '(C)' : ''}</span>`).join('')}</div></div>
      </div>`;
    }).join('');
  }

  /* ═════════ ADMIN ═════════ */
  function renderAdmin() {
    renderDrawPanel();
    renderUnassigned();
    renderAdminMatches();
  }

  function renderDrawPanel() {
    const panel = $('drawPanel');
    if (state.approved) {
      panel.innerHTML = `<div style="text-align:center;padding:8px"><p style="color:#6ee7b7;font-weight:800;font-size:12px;margin-bottom:6px">✓ Groups Approved</p><p class="muted tiny">Standings &amp; schedule are live. Use Reset below to redo the draw.</p></div>`;
      $('approveBtn').classList.add('hidden');
      return;
    }
    const groupHTML = (g, ids, color) => `
      <div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span style="font-size:10px;font-weight:900;color:${color};text-transform:uppercase;letter-spacing:.6px">Group ${g}</span><span style="font-size:10px;font-weight:800;color:${color}">${ids.length}/5</span></div>
        ${[0,1,2,3,4].map(i => {
          const t = ids[i] ? teamById(ids[i]) : null;
          return t
            ? `<div class="group-slot">${logoHTML(t)}<span>${t.name}</span><button class="rm" data-remove="${t.id}">×</button></div>`
            : `<div class="group-slot empty"><span class="muted" style="font-size:10px">Slot ${i+1}</span></div>`;
        }).join('')}
      </div>`;
    panel.innerHTML = `<div class="draw-group">${groupHTML('A', state.groupA, '#6ee7b7')}${groupHTML('B', state.groupB, '#fcd34d')}</div>`;
    panel.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => unassign(b.dataset.remove)));
    const ready = state.groupA.length === 5 && state.groupB.length === 5;
    $('approveBtn').classList.toggle('hidden', !ready);
  }

  function renderUnassigned() {
    const drawn = new Set([...state.groupA, ...state.groupB]);
    const rem = teams.filter(t => !drawn.has(t.id));
    const panel = $('unassignedPanel');
    if (state.approved) { panel.classList.add('hidden'); return; }
    panel.classList.remove('hidden');
    if (!rem.length) {
      panel.innerHTML = `<p style="text-align:center;color:#6ee7b7;font-size:11px;font-weight:700">✓ All teams assigned</p>`;
      return;
    }
    const aFull = state.groupA.length >= 5, bFull = state.groupB.length >= 5;
    panel.innerHTML = `
      <p style="font-size:10px;font-weight:800;color:#f5c542;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Unassigned (${rem.length})</p>
      ${rem.map(t => `<div class="draw-team">${logoHTML(t)}<span class="dt-name">${t.name}</span><button class="assign-btn a" data-assign="A" data-team="${t.id}" ${aFull ? 'disabled' : ''}>A</button><button class="assign-btn b" data-assign="B" data-team="${t.id}" ${bFull ? 'disabled' : ''}>B</button></div>`).join('')}`;
    panel.querySelectorAll('[data-assign]').forEach(b => b.addEventListener('click', () => assign(b.dataset.team, b.dataset.assign)));
  }

  /* ✅ Admin Matches with Team Customization (Roadmap Customization) */
  function renderAdminMatches() {
    const list = $('adminMatchList');
    if (!state.approved) {
      list.innerHTML = `<div class="card pending"><p>Approve groups first to edit matches.</p></div>`;
      return;
    }
    const r = getResolved();
    const filtered = state.matches.filter(m => adminFilter === 'ALL' ? true : adminFilter === 'KO' ? m.group === 'KO' : m.group === adminFilter);

    list.innerHTML = filtered.map(m => {
      let hId, aId;
      if (m.stage === 'GROUP') { hId = m.homeId; aId = m.awayId; }
      else {
        const map = { QF1: [r.qf1H, r.qf1A], QF2: [r.qf2H, r.qf2A], QF3: [r.qf3H, r.qf3A], QF4: [r.qf4H, r.qf4A], SF1: [r.sf1H, r.sf1A], SF2: [r.sf2H, r.sf2A], FINAL: [r.finH, r.finA] };
        [hId, aId] = map[m.id] || [null, null];
      }
      
      const title = m.group === 'KO' ? m.label : `Match #${m.matchNo} • Group ${m.group}`;
      const isDraw = m.status === 'FT' && m.homeScore === m.awayScore;
      const scorerStr = m.scorers ? m.scorers.map(s => s.name).join(', ') : '';

      const teamOptions = (selectedId) => teams.map(t => 
        `<option value="${t.id}" ${selectedId === t.id ? 'selected' : ''}>${t.name}</option>`
      ).join('');

      return `<div class="amatch">
        <div class="amatch-head">
          <span class="amatch-title">${title}</span>
          <span style="font-size:9px;color:#94a3b8;font-weight:700">#${m.matchNo}</span>
        </div>
        
        <!-- টিম কাস্টমাইজেশন ড্রপডাউন (রোডম্যাপের জন্য) -->
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:8px">
          <select class="aselect" style="padding: 6px; font-size: 11px; width: 45%; margin-bottom: 0;" data-mid="${m.id}" data-f="homeId">
            <option value="">TBD</option>
            ${teamOptions(hId)}
          </select>
          <span style="color:#94a3b8;font-weight:900;font-size:10px">VS</span>
          <select class="aselect" style="padding: 6px; font-size: 11px; width: 45%; margin-bottom: 0;" data-mid="${m.id}" data-f="awayId">
            <option value="">TBD</option>
            ${teamOptions(aId)}
          </select>
        </div>

        <div class="ascore">
          <input type="number" min="0" value="${m.homeScore}" data-mid="${m.id}" data-f="homeScore">
          <span style="color:#94a3b8;font-weight:800">:</span>
          <input type="number" min="0" value="${m.awayScore}" data-mid="${m.id}" data-f="awayScore">
        </div>
        
        ${(isDraw && m.stage === 'KO') ? `
        <select class="aselect" data-mid="${m.id}" data-f="winnerId">
          <option value="">Penalty Winner (Tie-Breaker)</option>
          <option value="${hId}" ${m.winnerId === hId ? 'selected' : ''}>${teamById(hId)?.name || 'Home'} Wins</option>
          <option value="${aId}" ${m.winnerId === aId ? 'selected' : ''}>${teamById(aId)?.name || 'Away'} Wins</option>
        </select>` : ''}
        
        <input type="text" class="scorer-input" placeholder="Scorers (comma separated)" value="${scorerStr}" data-mid="${m.id}" data-f="scorers">
        <select class="aselect" data-mid="${m.id}" data-f="status">
          <option value="UPCOMING" ${m.status === 'UPCOMING' ? 'selected' : ''}>Upcoming</option>
          <option value="LIVE" ${m.status === 'LIVE' ? 'selected' : ''}>● LIVE</option>
          <option value="FT" ${m.status === 'FT' ? 'selected' : ''}>FT (Finished)</option>
        </select>
        <div class="adt-row">
          <input type="date" value="${m.date || ''}" data-mid="${m.id}" data-f="date">
          <input type="time" value="${m.time || ''}" data-mid="${m.id}" data-f="time">
        </div>
      </div>`;
    }).join('');

    list.querySelectorAll('[data-mid][data-f]').forEach(el => {
      el.addEventListener('change', () => {
        let val = el.value;
        if (el.dataset.f === 'scorers') {
          const m = state.matches.find(x => x.id === el.dataset.mid);
          let hId = m.homeId, aId = m.awayId;
          if (m.stage !== 'GROUP') {
            const rr = getResolved();
            const map = { QF1: [rr.qf1H, rr.qf1A], QF2: [rr.qf2H, rr.qf2A], QF3: [rr.qf3H, rr.qf3A], QF4: [rr.qf4H, rr.qf4A], SF1: [rr.sf1H, rr.sf1A], SF2: [rr.sf2H, rr.sf2A], FINAL: [rr.finH, rr.finA] };
            [hId, aId] = map[m.id] || [null, null];
          }
          const names = val.split(',').map(s => s.trim()).filter(Boolean);
          const home = teamById(hId), away = teamById(aId);
          val = names.map(name => {
            let teamId = null;
            if (home && home.players.some(p => p.name === name)) teamId = hId;
            if (away && away.players.some(p => p.name === name)) teamId = aId;
            return { name, teamId };
          });
        }
        updateMatch(el.dataset.mid, el.dataset.f, val);
      });
    });
  }

  /* ═════════ TEAM MODAL ═════════ */
  function playerAvatar(p, cls = '') {
    const initial = (p.name || '?').charAt(0).toUpperCase();
    const captainClass = p.captain ? 'captain-avatar' : '';
    if (p.photo) return `<div class="player-avatar ${cls} ${captainClass}"><img src="${p.photo}" alt="${p.name}" onerror="this.outerHTML='<div class=&quot;player-avatar ${cls} ${captainClass}&quot;>${initial}</div>'"></div>`;
    return `<div class="player-avatar ${cls} ${captainClass}">${initial}</div>`;
  }

  function computeTeamStats(teamId) {
    const groupKey = state.groupA.includes(teamId) ? 'A' : state.groupB.includes(teamId) ? 'B' : null;
    const all = state.matches.filter(m => m.homeId === teamId || m.awayId === teamId);
    const played = all.filter(m => m.status === 'FT').sort((a, b) => (a.matchNo || 0) - (b.matchNo || 0));
    const upcoming = all.filter(m => m.status === 'UPCOMING' || m.status === 'LIVE').sort((a, b) => ((a.date || '') + (a.time || '')).localeCompare((b.date || '') + (b.time || '')));
    let w = 0, d = 0, l = 0, gf = 0, ga = 0, pts = 0;
    const form = [];
    played.forEach(m => {
      const isHome = m.homeId === teamId;
      const my = isHome ? (+m.homeScore || 0) : (+m.awayScore || 0);
      const op = isHome ? (+m.awayScore || 0) : (+m.homeScore || 0);
      gf += my; ga += op;
      if (my > op) { w++; pts += 3; form.push('W'); }
      else if (my < op) { l++; form.push('L'); }
      else { 
        // Updated standard rules
        d++; pts += 1; form.push('D'); 
      }
    });
    return { groupKey, mp: played.length, w, d, l, gf, ga, gd: gf - ga, pts, form: form.slice(-5), lastMatch: played.length ? played[played.length - 1] : null, nextMatch: upcoming.length ? upcoming[0] : null };
  }

  function renderPitch(team) {
    const p = team.players;
    const st = p.find(player => player.role === 'ST');
    const amf = p.find(player => player.role === 'AMF');
    const cb = p.find(player => player.role === 'CB');
    const gk = p.find(player => player.role === 'GK');
    const cell = (player, roleLabel) => !player ? '' : `<div class="pitch-player ${player.captain ? 'captain' : ''}">${playerAvatar(player, player.captain ? 'captain-avatar' : '')}<span class="pitch-player-name">${player.name}</span><span class="pitch-player-role">${roleLabel}</span></div>`;
    return `<div class="pitch-row">${cell(st, 'ST')}</div><div class="pitch-row">${cell(amf, 'AMF')}${cell(cb, 'CB')}</div><div class="pitch-row">${cell(gk, 'GK')}</div>`;
  }

  function miniMatchHTML(match, teamId) {
    if (!match) return `<div class="empty-note">No match data yet</div>`;
    const isHome = match.homeId === teamId, oppId = isHome ? match.awayId : match.homeId;
    const me = teamById(teamId), opp = teamById(oppId);
    const myScore = isHome ? match.homeScore : match.awayScore, oppScore = isHome ? match.awayScore : match.homeScore;
    const isFinished = match.status === 'FT';
    const scoreDisplay = isFinished ? `${myScore} - ${oppScore}` : match.status === 'LIVE' ? `<span style="color:#fda4af">LIVE ${myScore}-${oppScore}</span>` : 'vs';
    const meta = isFinished ? `<span>Match #${match.matchNo || ''}</span><span><strong>FT</strong></span>` : `<span>${match.date || ''}</span><span><strong>${fmtTime(match.time)}</strong></span>`;
    return `<div class="mini-match"><div class="mini-match-row"><div class="mini-team">${me ? `<img src="${me.logo}" alt="" onerror="this.style.display='none'">` : ''}<span>${me?.name || '?'}</span></div><div class="mini-score">${scoreDisplay}</div><div class="mini-team right"><span>${opp?.name || 'TBD'}</span>${opp ? `<img src="${opp.logo}" alt="" onerror="this.style.display='none'">` : ''}</div></div><div class="mini-meta">${meta}</div></div>`;
  }

  function openTeamModal(teamId) {
    const team = teamById(teamId);
    if (!team) return;
    const stats = computeTeamStats(teamId);
    $('tmLogo').innerHTML = `<img src="${team.logo}" alt="" onerror="this.style.display='none';this.parentNode.innerHTML='<div style=width:100%;height:100%;display:grid;place-items:center;font-size:24px>⚽</div>'">`;
    $('tmName').textContent = team.name;
    const gPill = $('tmGroup');
    if (stats.groupKey === 'A') { gPill.textContent = 'Group A'; gPill.className = 'group-pill A'; }
    else if (stats.groupKey === 'B') { gPill.textContent = 'Group B'; gPill.className = 'group-pill B'; }
    else { gPill.textContent = 'Unassigned'; gPill.className = 'group-pill none'; }
    $('tmFormation').textContent = team.formation || '1-1-1-1';
    $('tmPitch').innerHTML = renderPitch(team);
    $('tmSquad').innerHTML = team.players.map(p => `<div class="player-card ${p.captain ? 'captain' : ''}">${playerAvatar(p)}<div class="player-card-info"><div class="player-card-name">${p.name} ${p.captain ? '(C)' : ''}</div><div class="player-card-role">${p.role || ''}</div></div></div>`).join('');
    const gdClass = stats.gd > 0 ? 'pos' : stats.gd < 0 ? 'neg' : '', gdStr = stats.gd > 0 ? `+${stats.gd}` : `${stats.gd}`;
    $('tmStats').innerHTML = `<div class="stat-cell"><div class="stat-value">${stats.mp}</div><div class="stat-label">MP</div></div><div class="stat-cell"><div class="stat-value pos">${stats.w}</div><div class="stat-label">Won</div></div><div class="stat-cell"><div class="stat-value">${stats.d}</div><div class="stat-label">Draw</div></div><div class="stat-cell"><div class="stat-value neg">${stats.l}</div><div class="stat-label">Lost</div></div><div class="stat-cell"><div class="stat-value">${stats.gf}</div><div class="stat-label">GF</div></div><div class="stat-cell"><div class="stat-value">${stats.ga}</div><div class="stat-label">GA</div></div><div class="stat-cell"><div class="stat-value ${gdClass}">${gdStr}</div><div class="stat-label">GD</div></div><div class="stat-cell"><div class="stat-value pts">${stats.pts}</div><div class="stat-label">Pts</div></div>`;
    if (stats.form.length === 0) $('tmForm').innerHTML = `<span class="form-empty">No matches played yet</span>`;
    else $('tmForm').innerHTML = stats.form.map((r, i) => `<span class="form-badge ${r} ${i === stats.form.length - 1 ? 'latest' : ''}">${r === 'W' ? '✓' : r === 'L' ? '✕' : '–'}</span>`).join('');
    $('tmLastMatch').innerHTML = miniMatchHTML(stats.lastMatch, teamId);
    $('tmNextMatch').innerHTML = miniMatchHTML(stats.nextMatch, teamId);
    $('teamModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeTeamModal() {
    $('teamModal').classList.add('hidden');
    document.body.style.overflow = '';
  }

  /* ═════════ PRINT / PDF REPORT ═════════ */
  function generatePrintContent() {
    const date = new Date().toLocaleString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const groupTableHTML = (groupKey) => {
      const rows = computeStandings(groupKey);
      return `<table class="p-table"><thead><tr>
        <th>#</th><th>Team</th><th>MP</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th>
      </tr></thead><tbody>${rows.map((r,i) => {
        const t = teamById(r.id);
        return `<tr class="${i < 4 ? 'qual' : ''}">
          <td>${i+1}</td><td><b>${t?.name || r.id}</b></td>
          <td>${r.mp}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td>
          <td>${r.gf}</td><td>${r.ga}</td><td>${r.gd > 0 ? '+' : ''}${r.gd}</td><td><b>${r.pts}</b></td>
        </tr>`;
      }).join('')}</tbody></table>`;
    };

    const scorers = computeTopScorers();
    const scorersHTML = scorers.length ? `<h2>Top Scorers</h2>
      <table class="p-table"><thead><tr><th>#</th><th>Player</th><th>Team</th><th>Goals</th></tr></thead><tbody>
      ${scorers.map((s,i) => {
        const t = teamById(s.teamId);
        return `<tr><td>${i+1}</td><td><b>${s.name}</b></td><td>${t?.name || ''}</td><td><b>${s.goals}</b></td></tr>`;
      }).join('')}</tbody></table>` : '';

    const r = getResolved();
    const koMatch = (m, hId, aId, hFall, aFall) => {
      const ht = teamById(hId), at = teamById(aId);
      const show = m && m.status !== 'UPCOMING';
      return `<div class="p-ko-match"><span>${ht?.name || hFall}</span><span><b>${show ? m.homeScore : '-'}</b></span></div>
              <div class="p-ko-match"><span>${at?.name || aFall}</span><span><b>${show ? m.awayScore : '-'}</b></span></div>`;
    };

    const koHTML = `<h2>Knockout Stage</h2>
      <div class="p-ko-grid">
        <div class="p-ko-box"><h3>Quarter-Final 1</h3>${koMatch(r.qf1, r.qf1H, r.qf1A, 'TBD', 'TBD')}</div>
        <div class="p-ko-box"><h3>Quarter-Final 2</h3>${koMatch(r.qf2, r.qf2H, r.qf2A, 'TBD', 'TBD')}</div>
        <div class="p-ko-box"><h3>Quarter-Final 3</h3>${koMatch(r.qf3, r.qf3H, r.qf3A, 'TBD', 'TBD')}</div>
        <div class="p-ko-box"><h3>Quarter-Final 4</h3>${koMatch(r.qf4, r.qf4H, r.qf4A, 'TBD', 'TBD')}</div>
        <div class="p-ko-box"><h3>Semi-Final 1</h3>${koMatch(r.sf1, r.sf1H, r.sf1A, 'TBD', 'TBD')}</div>
        <div class="p-ko-box"><h3>Semi-Final 2</h3>${koMatch(r.sf2, r.sf2H, r.sf2A, 'TBD', 'TBD')}</div>
      </div>
      <div class="p-ko-box" style="margin-top:12px"><h3>🏆 Grand Final</h3>${koMatch(r.fin, r.finH, r.finA, 'TBD', 'TBD')}</div>`;

    const champHTML = r.champ ? `<div class="p-champ">
      <div class="trophy">🏆</div>
      <h2>CHAMPION</h2>
      <p style="font-size:20px;font-weight:bold;letter-spacing:2px;margin:0;font-family:sans-serif">${teamById(r.champ)?.name}</p>
      <p style="font-size:10px;color:#666;margin-top:5px;font-family:sans-serif">Session-02 Winner</p>
    </div>` : '';

    return `
      <div class="p-header">
        <img src="logo.jpeg" class="p-logo" onerror="this.style.display='none'">
        <h1>BEPARI PARA PREMIER LEAGUE</h1>
        <p>SESSION - 02 • OFFICIAL TOURNAMENT REPORT</p>
        <p class="p-date">Generated: ${date}</p>
      </div>
      <h2>Group A Standings</h2>
      ${groupTableHTML('A')}
      <h2>Group B Standings</h2>
      ${groupTableHTML('B')}
      ${scorersHTML}
      ${koHTML}
      ${champHTML}
      <div class="p-footer">Bepari Para Premier League • Session-02 • Official Document</div>
    `;
  }

  function printTournament() {
    if (!state.approved) {
      showToast('প্রথমে গ্রুপ অ্যাপ্রুভ করুন');
      return;
    }
    const printArea = $('printArea');
    if (!printArea) {
      showToast('Print area missing in HTML');
      return;
    }
    $('printContent').innerHTML = generatePrintContent();
    setTimeout(() => {
      window.print();
    }, 400);
  }

  /* ═════════ ACTIONS ═════════ */
  async function assign(teamId, group) {
    try {
      state = await api('/api/assign', { method:'POST', auth:true, body:{ teamId, group } });
      playTick();
      render();
    } catch (e) { showToast(e.message); }
  }

  async function unassign(teamId) {
    try {
      state = await api('/api/unassign', { method:'POST', auth:true, body:{ teamId } });
      render();
    } catch (e) { showToast(e.message); }
  }

  async function updateMatch(id, field, value) {
    const body = {};
    if (field === 'homeScore' || field === 'awayScore') body[field] = parseInt(value, 10) || 0;
    else body[field] = value;
    try {
      state = await api('/api/matches/' + id, { method:'PUT', auth:true, body });
      render();
      showToast('Match updated');
    } catch (e) { showToast(e.message); }
  }

  async function approve() {
    if (state.groupA.length !== 5 || state.groupB.length !== 5) {
      return showToast('Need exactly 5 teams per group');
    }
    try {
      state = await api('/api/approve', { method:'POST', auth:true });
      render();
      showToast('Groups approved! Schedule generated');
    } catch (e) { showToast(e.message); }
  }

  async function resetDraw() {
    if (!confirm('Reset entire draw? All groups and matches will be cleared.')) return;
    try {
      state = await api('/api/reset', { method:'POST', auth:true });
      render();
      showToast('Draw reset');
    } catch (e) { showToast(e.message); }
  }

  async function login(password) {
    const res = await api('/api/login', { method:'POST', body:{ password } });
    token = res.token;
    localStorage.setItem('bppl_token', token);
    adminUnlocked = true;
    return res;
  }

  /* ═════════ NAV ═════════ */
  function switchTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    $('tab-' + tab).classList.remove('hidden');
    window.scrollTo({ top:0, behavior:'smooth' });
  }

  function switchAdminTab(tab) {
    document.querySelectorAll('.atab').forEach(b => b.classList.toggle('active', b.dataset.atab === tab));
    document.querySelectorAll('.atab-panel').forEach(p => p.classList.add('hidden'));
    $('atab-' + tab).classList.remove('hidden');
  }

  /* ═════════ SHARE ═════════ */
  async function shareStandings() {
    const fmt = g => {
      const rows = computeStandings(g);
      return `GROUP ${g}:\n` + rows.map((r,i) => {
        const t = teamById(r.id);
        return `${i+1}. ${t?.name || r.id} — Pts ${r.pts} | GD ${r.gd > 0 ? '+' : ''}${r.gd}`;
      }).join('\n');
    };
    const text = `🏆 BEPARI PARA PRIMER LEAGUE — SESSION 02\n\n${fmt('A')}\n\n${fmt('B')}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); showToast('Copied!'); }
    } catch (e) {
      try { await navigator.clipboard.writeText(text); showToast('Copied!'); } catch(_) {}
    }
  }

  /* ═════════ EVENT BINDING ═════════ */
  function bind() {
    document.querySelectorAll('.nav-item').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
    document.querySelectorAll('#filters .filter').forEach(b => b.addEventListener('click', () => {
      schedFilter = b.dataset.f;
      document.querySelectorAll('#filters .filter').forEach(x => x.classList.toggle('active', x === b));
      renderSchedule();
    }));
    document.querySelectorAll('#adminFilters .filter').forEach(b => b.addEventListener('click', () => {
      adminFilter = b.dataset.af;
      document.querySelectorAll('#adminFilters .filter').forEach(x => x.classList.toggle('active', x === b));
      renderAdminMatches();
    }));
    document.querySelectorAll('.atab').forEach(b => b.addEventListener('click', () => switchAdminTab(b.dataset.atab)));

    $('shareBtn').addEventListener('click', shareStandings);
    $('approveBtn').addEventListener('click', approve);
    $('resetBtn').addEventListener('click', resetDraw);
    $('hardResetBtn').addEventListener('click', resetDraw);
    $('adminClose').addEventListener('click', () => {
      $('adminPanel').classList.add('hidden');
      adminUnlocked = false; token = ''; localStorage.removeItem('bppl_token');
    });

    $('soundBtn').addEventListener('click', () => {
      soundOn = !soundOn;
      $('soundBtn').textContent = soundOn ? '🔊' : '🔇';
    });

    /* 5-tap secret admin */
    let taps = 0, tapTimer = null;
    $('logoBtn').addEventListener('click', () => {
      taps++;
      clearTimeout(tapTimer);
      if (taps >= 5) { taps = 0; openAdmin(); }
      else tapTimer = setTimeout(() => taps = 0, 2000);
    });

    /* Login modal */
    $('pwdCancel').addEventListener('click', () => $('loginModal').classList.add('hidden'));
    $('pwdOk').addEventListener('click', async () => {
      const pwd = $('pwdInput').value;
      try {
        await login(pwd);
        $('loginModal').classList.add('hidden');
        $('adminPanel').classList.remove('hidden');
        $('pwdErr').classList.add('hidden');
        $('pwdInput').value = '';
        render();
      } catch (e) {
        $('pwdErr').classList.remove('hidden');
      }
    });
    $('pwdInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('pwdOk').click(); });

    $('exportBtn').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type:'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'bppl-backup.json'; a.click();
      URL.revokeObjectURL(url);
      showToast('Backup downloaded');
    });

    /* Print button */
    const printBtn = $('printBtn');
    if (printBtn) printBtn.addEventListener('click', printTournament);

    /* Global team detail click */
    document.addEventListener('click', e => {
      const el = e.target.closest('[data-team-id]');
      if (!el || !el.dataset.teamId) return;
      if (e.target.closest('.rm, [data-assign], button, input, select')) return;
      openTeamModal(el.dataset.teamId);
    });

    $('teamModalClose').addEventListener('click', closeTeamModal);
    $('teamModal').addEventListener('click', e => {
      if (e.target.id === 'teamModal') closeTeamModal();
    });
  }

  function openAdmin() {
    if (adminUnlocked) {
      $('adminPanel').classList.remove('hidden');
      render();
    } else {
      $('loginModal').classList.remove('hidden');
      $('pwdInput').value = '';
      $('pwdErr').classList.add('hidden');
      setTimeout(() => $('pwdInput').focus(), 80);
    }
  }

  /* ═════════ BOOT ═════════ */
  (async () => {
    bind();
    try {
      await Promise.all([loadTeams(), loadState()]);
      render();
    } catch (e) {
      showToast('Failed to load. Check server.');
      console.error(e);
    }
    setInterval(async () => {
      try {
        const fresh = await api('/api/state');
        if (fresh.updatedAt !== state.updatedAt) {
          state = fresh;
          render();
        }
      } catch (e) {}
    }, 5000);
    if (location.hash === '#admin') setTimeout(openAdmin, 400);
  })();
})();
