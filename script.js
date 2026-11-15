/* ==========================================================================
   MakeMyTrip · AI Trip Planner — interactive prototype (vanilla JS)
   Recreates the Figma frames 01–06 (+02b loading, 05b applied, 07 edge cases)
   ALL TRAVEL DATA IS SIMULATED. No external APIs are called.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * 0. Utilities
   * ------------------------------------------------------------------ */
  const $ = (s, r = document) => r.querySelector(s);
  const app = $('#app');
  const overlay = $('#overlay-root');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
  const signed = (n) => (n > 0 ? '+' : n < 0 ? '−' : '±') + fmt(Math.abs(n));
  const mins = (m) => { m = Math.abs(Math.round(m)); const h = Math.floor(m / 60), r = m % 60; return h ? `${h}h ${String(r).padStart(2, '0')}m` : `${r} min`; };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function tParse(s) { const m = /(\d+):(\d+)\s*(AM|PM)/i.exec(s); if (!m) return 0; let h = +m[1] % 12; if (/pm/i.test(m[3])) h += 12; return h * 60 + +m[2]; }
  function tFmt(v) { v = ((Math.round(v / 5) * 5) % 1440 + 1440) % 1440; let h = Math.floor(v / 60), m = v % 60; const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${String(m).padStart(2, '0')} ${ap}`; }

  /* Icon sprite from assets/icons.js */
  (function buildSprite() {
    const sp = $('#icon-sprite'); const I = window.MMT_ICONS || {};
    sp.innerHTML = Object.keys(I).map((k) => `<symbol id="i-${k}" viewBox="0 0 24 24" fill="${I[k].fill ? 'currentColor' : 'none'}" stroke="${I[k].fill ? 'none' : 'currentColor'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${I[k].d}</symbol>`).join('');
  })();
  const ic = (n, cls = '', style = '') => `<svg class="i ${cls}" ${style ? `style="${style}"` : ''} aria-hidden="true"><use href="#i-${n}"></use></svg>`;

  /* ------------------------------------------------------------------ *
   * 1. Simulated data (clearly labelled in UI)
   * ------------------------------------------------------------------ */
  const DATES = {
    '20-22': { label: 'Fri 20 – Sun 22 Nov', days: ['Fri 20 Nov', 'Sat 21 Nov', 'Sun 22 Nov'], surcharge: 0, short: '20–22 Nov' },
    '27-29': { label: 'Fri 27 – Sun 29 Nov', days: ['Fri 27 Nov', 'Sat 28 Nov', 'Sun 29 Nov'], surcharge: 400, short: '27–29 Nov', longWeekend: true }
  };

  const RK = {
    out: {
      train: { id: 'train', name: 'Train · Fri 6:05 PM', title: 'Train · New Delhi → Yog Nagari Rishikesh', dep: '6:05 PM', depDay: 0, arr: { '20-22': '11:30 PM', '27-29': '10:50 PM' }, arrDay: 0, price: 1240, dur: { '20-22': 325, '27-29': 285 }, late: true, desc: 'Chair car · direct' },
      sat: { id: 'sat', name: 'Train · Sat 6:45 AM', title: 'Train · New Delhi → Yog Nagari Rishikesh', dep: '6:45 AM', depDay: 1, arr: { '20-22': '11:25 AM', '27-29': '11:25 AM' }, arrDay: 1, price: 1180, dur: { '20-22': 280, '27-29': 280 }, late: false, desc: 'Chair car · no late arrival' },
      volvo: { id: 'volvo', name: 'Volvo · Fri 9:30 PM', title: 'Volvo bus · Kashmere Gate ISBT → Rishikesh', dep: '9:30 PM', depDay: 0, arr: { '20-22': '4:10 AM', '27-29': '4:10 AM' }, arrDay: 1, price: 890, dur: { '20-22': 400, '27-29': 400 }, late: true, veryEarly: true, desc: 'AC sleeper bus · arrives at bus stand' }
    },
    stays: {
      riverside: { id: 'riverside', name: 'Riverside Courtyard Stay', short: 'Riverside Courtyard', area: 'Ram Jhula', ppn: 2700, station: 12, aarti: { mode: 'walk', m: 6, c: 0 }, tapovan: { m: 30, c: 150 }, rating: '4.3★ (212 reviews)', walkPenalty: 0 },
      gangaview: { id: 'gangaview', name: 'Ganga View, Tapovan', short: 'Ganga View, Tapovan', area: 'Tapovan', ppn: 2400, station: 35, aarti: { mode: 'ride', m: 25, c: 80 }, tapovan: { m: 5, c: 0, walk: true }, rating: '4.1★ (167 reviews)', walkPenalty: 0 },
      lakshman: { id: 'lakshman', name: 'Lakshman Riverside Rooms', short: 'Lakshman Riverside', area: 'Laxman Jhula', ppn: 2850, station: 14, aarti: { mode: 'walk', m: 7, c: 0 }, tapovan: { m: 15, c: 60 }, rating: '4.2★ (98 reviews)', walkPenalty: 0 },
      stationroad: { id: 'stationroad', name: 'Station Road Residency', short: 'Station Road Residency', area: 'Near Yog Nagari station', ppn: 2450, station: 6, aarti: { mode: 'ride', m: 15, c: 60 }, tapovan: { m: 35, c: 180 }, rating: '3.9★ (74 reviews) · fewer cafés nearby', walkPenalty: 800 },
      hostel: { id: 'hostel', name: 'Ganga Hostel · private room', short: 'Hostel private room', area: 'Laxman Jhula', ppn: 1500, station: 10, aarti: { mode: 'walk', m: 9, c: 0 }, tapovan: { m: 12, c: 50 }, rating: '4.4★ (311 reviews) · shared bathroom', walkPenalty: 300 },
      sunrise: { id: 'sunrise', name: 'Sunrise Homestay, Laxman Jhula', short: 'Sunrise Homestay', area: 'Laxman Jhula', ppn: 3150, station: 20, aarti: { mode: 'walk', m: 10, c: 0 }, tapovan: { m: 10, c: 40 }, rating: '4.6★ (140 reviews)', soldOut: true, walkPenalty: 0 }
    },
    satEve: {
      music: { id: 'music', name: 'Live music evening · Tapovan café', short: 'Café live-music evening' },
      aarti: { id: 'aarti', name: 'Ganga Aarti · Parmarth Niketan', short: 'Ganga Aarti near your stay' }
    },
    sunMorn: {
      waterfall: { id: 'waterfall', name: 'Neer Garh waterfall walk', short: 'Waterfall walk' },
      riverwalk: { id: 'riverwalk', name: 'Riverside walk & breakfast', short: 'Riverside walk from your stay' },
      ghat: { id: 'ghat', name: 'Sunrise at Ram Jhula ghat', short: 'Sunrise at the ghat' },
      kunjapuri: { id: 'kunjapuri', name: 'Sunrise at Kunjapuri Temple', short: 'Kunjapuri sunrise' }
    }
  };

  /* Udaipur & McLeod Ganj have lighter plans (same engine) */
  const UD = {
    stays: {
      lalghat: { id: 'lalghat', name: 'Lal Ghat Haveli Rooms', short: 'Lal Ghat Haveli', area: 'Lal Ghat, old city', ppn: 4600, station: 15, rating: '4.4★ (188 reviews)' },
      gangaur: { id: 'gangaur', name: 'Gangaur Ghat Guesthouse', short: 'Gangaur Ghat Guesthouse', area: 'Gangaur Ghat', ppn: 3900, station: 18, rating: '4.1★ (121 reviews)' },
      lakeview: { id: 'lakeview', name: 'Fateh Sagar Lakeview', short: 'Fateh Sagar Lakeview', area: 'Fateh Sagar (4 km from old city)', ppn: 3400, station: 22, rating: '4.0★ (90 reviews) · auto needed to old city', farOldCity: true }
    },
    satEve: { dance: { id: 'dance', name: 'Dharohar folk dance · Bagore ki Haveli' }, rooftop: { id: 'rooftop', name: 'Rooftop dinner near your stay' } },
    sunMorn: { walk: { id: 'walk', name: 'Gangaur Ghat & Jagdish Temple walk' }, sajjangarh: { id: 'sajjangarh', name: 'Sajjangarh (Monsoon Palace)' } }
  };
  const MG = {
    stays: {
      templeroad: { id: 'templeroad', name: 'Temple Road Guesthouse', short: 'Temple Road Guesthouse', area: 'Temple Road, near main square', ppn: 1900, station: 10, rating: '4.3★ (156 reviews)' },
      mainsquare: { id: 'mainsquare', name: 'Main Square Residency', short: 'Main Square Residency', area: 'Main square', ppn: 2300, station: 4, rating: '4.2★ (102 reviews)' },
      bhagsu: { id: 'bhagsu', name: 'Bhagsu Hillside Rooms', short: 'Bhagsu Hillside', area: 'Bhagsu (uphill)', ppn: 1600, station: 25, rating: '4.0★ (61 reviews) · uphill lanes', uncertain: true }
    },
    satEve: { bhagsu: { id: 'bhagsu', name: 'Bhagsu waterfall walk' }, cafe: { id: 'cafe', name: 'Temple Road cafés & Tibetan bakery' } },
    sunMorn: { cooking: { id: 'cooking', name: 'Tibetan cooking class' }, dharamkot: { id: 'dharamkot', name: 'Dharamkot village walk' } }
  };

  const DESTS = {
    rishikesh: {
      id: 'rishikesh', name: 'Rishikesh, Uttarakhand', short: 'Rishikesh', sub: 'Riverside town · yoga, cafés, ghats · 2 nights', img: 'assets/img/dest-rishikesh.svg', badge: ['Best match for your brief', 'success', 'star'],
      journey: '5h 25m', journeySub: 'Direct train, Fri 6:05 PM', stays: 14, staysSub: 'Private room + 24×7 desk', arrival: '11:30 PM', arrivalSub: 'Late — transfer planned', arrivalWarn: true, journeyIcon: 'train', arrivalIcon: 'moon',
      rows: [
        ['pin', 'Neighbourhoods', 'Tapovan & Laxman Jhula: walkable lanes, cafés open till ~10 PM. Ram Jhula / Swarg Ashram is quieter after dark, with fewer open shops.', null],
        ['users', 'What solo women travellers mention', '31 of 38 sampled reviews describe walking comfortably between ghats and cafés by day; several suggest staying near main lanes and arranging late arrivals in advance.', ['Solo traveller reviews · simulated sample (n=38)', 'sim']],
        ['auto', 'Getting around', 'Shared e-rickshaws ₹20–50 · 10–20 min walks between areas · app cabs limited, more at the station.', ['Local transport data · estimate', 'src']]
      ],
      themes: [['Walkable by day (31)', 'success', 'users'], ['Helpful hosts (24)', 'success', 'users'], ['Fewer autos after 9 PM (17)', 'warning', 'alert']],
      why: [['Direct train after work — no private transport needed for the journey or for getting around town.', 'Rail schedule · simulated'], ['Most sampled solo women reviewers describe its central areas as easy to explore on foot by day.', 'Solo traveller reviews · simulated sample (n=38)']],
      tradeoff: 'Arrives 11:30 PM, and most Tapovan stays are ~35 min from the station. I’ll address this in the itinerary.',
      cmp: { journey: '5h 25m · Fri 11:30 PM', transfer: '12–35 min (by stay)', walk: 'Yes, by day', evening: 'Thins after 9 PM', reviews: '38 · mostly positive' },
      score: 3
    },
    udaipur: {
      id: 'udaipur', name: 'Udaipur, Rajasthan', short: 'Udaipur', sub: 'Lake city · old-city lanes, rooftop cafés · 1 night', img: 'assets/img/dest-udaipur.svg', badge: ['Daytime arrival', 'neutral', 'sparkle'],
      journey: '12h 10m', journeySub: 'Overnight sleeper', stays: 9, staysSub: 'Old city & Lal Ghat', arrival: '7:40 AM', arrivalSub: 'Sat morning', journeyIcon: 'train', arrivalIcon: 'sun',
      rows: [
        ['pin', 'Neighbourhoods', 'Lal Ghat & Gangaur Ghat: compact and walkable; lanes are narrow and busy with two-wheelers in the evening.', null],
        ['users', 'What solo women travellers mention', 'Daytime arrival is appreciated; old city easy on foot; some mention persistent touts near ghats.', ['Solo traveller reviews · simulated sample (n=26)', 'sim']]
      ],
      note: ['warning', 'Tight on budget', 'Little headroom, and two nights are spent on trains — one night in the city.'],
      why: [['Morning arrival avoids a late-night transfer.', 'Rail schedule · simulated'], ['Old city is compact; most sights within 20 min walk.', 'Map estimate']],
      tradeoff: 'Long overnight journeys both ways and little budget headroom.',
      cmp: { journey: '12h 10m · Sat 7:40 AM', transfer: '~15 min', walk: 'Yes, compact', evening: 'Autos available', reviews: '26 · mixed on touts' },
      score: 2
    },
    mcleodganj: {
      id: 'mcleodganj', name: 'McLeod Ganj, Himachal', short: 'McLeod Ganj', sub: 'Hill town · monasteries, cafés, short trails · 2 nights', img: 'assets/img/dest-mcleodganj.svg', badge: ['Lowest cost', 'neutral', 'sparkle'],
      journey: '10h 30m', journeySub: 'Overnight Volvo bus', stays: 11, staysSub: 'Near main square', arrival: '6:15 AM', arrivalSub: 'Sat morning', journeyIcon: 'auto', arrivalIcon: 'sun',
      rows: [
        ['pin', 'Neighbourhoods', 'Main Square & Temple Road are walkable; Bhagsu & Dharamkot are uphill with some unlit stretches.', null],
        ['auto', 'Getting around', 'Shared taxis to Bhagsu by day. Evening availability: no reliable data.', ['No reliable data in sources checked', 'nodata']]
      ],
      note: ['uncertain', 'Limited information', 'Too few recent reports on evening shared taxis in Bhagsu to say how easy late returns are. I’d plan to be back on the main square by dusk.'],
      why: [['Central area is walkable and calm per reviews.', 'Solo traveller reviews · simulated sample (n=19)'], ['Early-morning arrival at the bus stand, 10 min walk to most stays.', 'Bus schedule · simulated']],
      tradeoff: 'Overnight bus and steep walks; evening transport data is uncertain.',
      cmp: { journey: '10h 30m · Sat 6:15 AM', transfer: '~10 min walk', walk: 'Yes, hilly', evening: 'No reliable data', reviews: '19 · mostly positive' },
      score: 1
    }
  };
  const EXCLUDED = [['Kasol', 'Private cab needed from Bhuntar after 8 PM'], ['Nainital', 'Est. ₹16,900 for these dates'], ['Jaipur', 'Busy — less “peaceful” in reviews'], ['Mussoorie', 'Last shared taxi from Dehradun ~7 PM; arrival after 11 PM'], ['Shimla', 'No train arriving before midnight after a 5 PM start'], ['Agra', 'Day trip — not a fit for a calm 2-night stay']];

  /* ------------------------------------------------------------------ *
   * 2. State (persisted in localStorage so selections survive reloads)
   * ------------------------------------------------------------------ */
  const STORE = 'mmt-ai-planner-v1';
  const defaultState = () => ({
    screen: 'home',
    home: { trip: 'oneway', fare: 'regular', pdp: false, svc: 'flights', draft: '' },
    brief: { dates: null, leave: null, origin: null, budget: null, solo: false, vibe: null, mobility: false, comfort: [], avoidLate: false, notes: [] },
    disc: { stage: 'start', msgs: [] },
    dest: { sort: 'best', compare: ['rishikesh', 'udaipur'], open: { rishikesh: true }, stays: {}, msgs: [], showExcluded: false, chosen: null },
    choices: null, orig: null, history: [], pending: null,
    planMsgs: [], reviewMsgs: [], collapsed: {},
    checks: {}, approved: false, soldOut: {}, netError: false, alt: null, lastChange: null
  });
  let S = load();
  function load() { try { const s = JSON.parse(localStorage.getItem(STORE)); if (s && s.screen) return Object.assign(defaultState(), s); } catch (e) { /* storage unavailable */ } return defaultState(); }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { /* ignore */ } }

  /* ------------------------------------------------------------------ *
   * 3. Plan engine — builds a cohesive itinerary from choices
   * ------------------------------------------------------------------ */
  const it = (o) => Object.assign({ type: 'item', costs: {} }, o);
  const cn = (label, icon, m, costs, warn) => ({ type: 'conn', label, icon, mins: m || 0, costs: costs || {}, warn: !!warn });

  function buildRishikesh(ch) {
    const D = DATES[ch.dates]; const sur = D.surcharge;
    const out = RK.out[ch.outbound]; const st = RK.stays[ch.stay];
    const nights = ch.outbound === 'sat' ? 1 : 2; const ppn = st.ppn + sur;
    const arr = out.arr[ch.dates]; const dur = out.dur[ch.dates];
    const days = []; let di = 0;
    const lateArr = out.late; const soldOut = (S.soldOut || {})[st.id] || st.soldOut;
    const stayWhyBase = (() => {
      const gv = RK.stays.gangaview, rv = RK.stays.riverside;
      if (st.id === 'riverside') return `${st.station} min from the station vs ${gv.station} min for your Tapovan shortlist (${signed((rv.ppn - gv.ppn) * nights)} for ${nights} night${nights > 1 ? 's' : ''}).`;
      if (st.id === 'gangaview') return lateArr ? 'Cheapest matching stay, steps from Tapovan cafés — but a 35 min drive from the station after a late arrival.' : 'Cheapest matching stay, steps from Tapovan cafés; with a daytime arrival the 35 min transfer is easy.';
      if (st.id === 'stationroad') return '6 min from the station — shortest arrival, but fewer cafés and sights within walking distance.';
      if (st.id === 'hostel') return 'Private room in a well-reviewed hostel with a 24×7 desk; shared bathroom keeps the trip within budget.';
      return `${st.station} min from the station; ${st.aarti.mode === 'walk' ? 'walkable to the ghats' : 'short ride to the ghats'}.`;
    })();
    const stayItem = (time, day) => it({ key: 'stay', slot: 'stay', time, day, icon: 'bed', title: `${st.name} · check-in`, meta: `${st.area} · private room · 24×7 front desk${lateArr ? ' · late check-in noted' : ''} · ${st.rating} (simulated)`, why: stayWhyBase, costs: { stay: ppn * nights }, cost: fmt(ppn * nights), action: ['Swap stay', 'stay'], impact: `Stay: ${st.short}`, flagged: !!soldOut, badge: soldOut ? 'Sold out' : null });

    if (ch.outbound !== 'sat') {
      const d1 = { key: 'd1', label: `Day 1 · ${D.days[0]}`, theme: ch.outbound === 'volvo' ? 'Leave after work, overnight bus' : 'Leave after work, arrive late — transfer arranged', items: [] };
      d1.items.push(it({ key: 'out', slot: 'outbound', time: out.dep, day: 'Fri', icon: ch.outbound === 'volvo' ? 'auto' : 'train', title: out.title, meta: ch.outbound === 'volvo' ? `AC sleeper bus · ${mins(dur)} · arrives ${arr} Sat at the bus stand (simulated)` : `Chair car · ${mins(dur)} · arrives ${arr} · 3 seats left (simulated)`, why: ch.outbound === 'volvo' ? '₹350 cheaper than the train, but arrives at 4:10 AM at the bus stand — a harder arrival.' : 'Only direct option after 5 PM that arrives before midnight.', costs: { transport: out.price }, cost: fmt(out.price), action: ['Change', 'outbound'], mins: dur, impact: `Arrive ${arr}` }));
      if (ch.outbound === 'train') {
        d1.items.push(cn('Platform exit → pickup point · 5 min', 'walk', 5));
        const long = st.station > 15;
        d1.items.push(it({ key: 'pickup', slot: 'stay', time: arr, day: 'Fri', icon: 'moon', title: 'Late-night arrival → pre-booked pickup', meta: `${st.station} min to your stay · driver details shared 2 hrs before arrival · waits up to 60 min if delayed`, why: long ? `This is a ${st.station}-min drive around midnight — the long late-night transfer you asked me to avoid. A stay nearer the station would shorten it.` : 'Avoids waiting for shared autos at midnight — you mentioned a long night transfer last time.', costs: { local: 350 }, cost: '₹350', action: ['Change', 'stay'], flagged: true, badge: long ? 'Long night transfer' : 'Needs attention', impact: `Night transfer ${st.station} min` }));
        d1.items.push(cn(`${st.station} min drive`, 'auto', st.station, {}, st.station > 15));
        d1.items.push(stayItem(tFmt(tParse(arr) + st.station + 3), 'Fri'));
      }
      days.push(d1); di = 1;
    }
    // Day 2 (Saturday)
    const d2 = { key: 'd2', label: `Day ${di + 1} · ${D.days[1]}`, theme: 'Ghats, cafés and the Beatles Ashram — mostly on foot', items: [] };
    if (ch.outbound === 'volvo') {
      d2.items.push(it({ key: 'arrv', slot: 'outbound', time: '4:10 AM', day: 'Sat', icon: 'moon', title: 'Pre-dawn arrival → pre-booked pickup', meta: `Bus stand to your stay ${st.station} min · early check-in requested (subject to availability, simulated)`, why: 'Arriving at 4:10 AM leaves you waiting in the dark if no pickup is booked.', costs: { local: 350 }, cost: '₹350', action: ['Change', 'outbound'], flagged: true, badge: 'Pre-dawn arrival', impact: 'Arrive 4:10 AM' }));
      d2.items.push(cn(`${st.station} min drive`, 'auto', st.station));
      d2.items.push(stayItem('4:30 AM', 'Sat'));
      d2.items.push(cn('Rest, then walk 8 min', 'walk', 8));
    }
    if (ch.outbound === 'sat') {
      d2.theme = 'Arrive by late morning, then ghats and cafés';
      d2.items.push(it({ key: 'out', slot: 'outbound', time: out.dep, day: 'Sat', icon: 'train', title: out.title, meta: `Chair car · ${mins(dur)} · arrives ${arr} · daytime arrival (simulated)`, why: 'No late arrival at all — at the cost of Friday night and Saturday morning.', costs: { transport: out.price }, cost: fmt(out.price), action: ['Change', 'outbound'], mins: dur, impact: `Arrive ${arr}` }));
      d2.items.push(cn('Shared auto to your stay · 15 min · ₹100', 'auto', 15, { local: 100 }));
      d2.items.push(stayItem('12:00 PM', 'Sat'));
    } else {
      d2.items.push(it({ key: 'yoga', time: '7:00 AM', day: 'Sat', icon: 'sun', title: 'Sunrise yoga, drop-in class', meta: '60 min · beginner friendly · riverside deck', why: 'Short walk from your stay; open-air, reviewed as welcoming to solo guests.', costs: { activity: 500 }, cost: '₹500', action: ['Replace', 'none'] }));
      d2.items.push(cn('Shared e-rickshaw · 15 min · ₹40', 'auto', 15, { local: 40 }));
    }
    const ashramToday = ch.dates !== '27-29';
    if (ashramToday) {
      d2.items.push(it({ key: 'ashram', time: ch.outbound === 'sat' ? '2:30 PM' : '10:00 AM', day: 'Sat', icon: 'mountain', title: 'Beatles Ashram (Chaurasi Kutia)', meta: '~2 hrs · shaded forest paths · entry ticket', why: 'Daytime visit to a popular, well-reviewed spot; return by e-rickshaw well before dark.', costs: { activity: 150 }, cost: '₹150', action: ['Replace', 'none'] }));
      d2.items.push(cn('Walk 18 min along the river', 'walk', 18));
    }
    d2.items.push(it({ key: 'lunch1', time: ch.outbound === 'sat' ? '1:00 PM' : '1:00 PM', day: 'Sat', icon: 'food', title: 'Lunch & café time · Laxman Jhula', meta: 'Riverside cafés · free afternoon', costs: { food: 600 }, cost: '₹600', action: ['Replace', 'none'] }));
    if (ch.satEve === 'music') {
      const t = st.tapovan; const late = t.m > 10;
      d2.items.push(cn(late ? `Return ~${t.m} min · shared autos thin out after 9 PM` : `${t.walk ? 'Walk' : 'Ride'} ${t.m} min back to your stay`, late ? 'alert' : 'walk', t.m, { local: t.c }, late));
      d2.items.push(it({ key: 'eve', slot: 'satEve', time: '7:30 PM', day: 'Sat', icon: 'users', title: RK.satEve.music.name, meta: `Ends ~9:30 PM · return ${t.m} min to your stay`, why: late ? 'Matches your “cafés, calm” interest — but the late return conflicts with your arrival preferences. Tap to see a closer option.' : 'Your stay is in Tapovan, so you walk back in 5 minutes.', costs: { activity: 700 }, cost: '₹700', action: [late ? 'See alternative' : 'Replace', 'satEve'], flagged: late, badge: late ? 'Needs attention' : null, impact: `Back at stay ~${tFmt(tParse('9:30 PM') + t.m)}`, backAt: tParse('9:30 PM') + t.m }));
    } else {
      const a = st.aarti; const ride = a.mode === 'ride';
      d2.items.push(cn(ride ? `E-rickshaw ${a.m} min from your stay` : `Walk ${a.m} min from your stay`, ride ? 'auto' : 'walk', a.m, { local: a.c }, ride && a.m > 15));
      d2.items.push(it({ key: 'eve', slot: 'satEve', time: '6:00 PM', day: 'Sat', icon: 'sparkle', title: RK.satEve.aarti.name, meta: `Ends ~7:00 PM · ${ride ? `${a.m} min e-rickshaw back after dark` : `${a.m} min walk back`} · busy riverside steps (per reviews, simulated)`, why: ride ? 'Ends early, but from this stay it’s a ride back after dark.' : `Ends early so you’re back at your stay by ~${tFmt(tParse('7:00 PM') + a.m + 10)} — no late ride needed.`, costs: { activity: 0 }, cost: '₹0', action: ['Replace', 'satEve'], flagged: ride && a.m > 15, badge: ride && a.m > 15 ? 'Ride back after dark' : null, impact: `Back at stay ~${tFmt(tParse('7:00 PM') + a.m + 10)}`, backAt: tParse('7:00 PM') + a.m + 10 }));
      d2.items.push(it({ key: 'dinner', time: '7:30 PM', day: 'Sat', icon: 'food', title: 'Dinner near your stay', meta: '3 options within 5 min walk', costs: { food: 500 }, cost: '₹500', action: ['Choose', 'none'] }));
    }
    days.push(d2);
    // Day 3 (Sunday)
    const d3 = { key: 'd3', label: `Day ${di + 2} · ${D.days[2]}`, theme: 'Morning outing, home by night', items: [] };
    const sm = ch.sunMorn;
    if (sm === 'waterfall') { d3.items.push(it({ key: 'sun', slot: 'sunMorn', time: '7:30 AM', day: 'Sun', icon: 'mountain', title: RK.sunMorn.waterfall.name, meta: '~2 hrs · trailhead 4 km from stay · shared jeeps back are infrequent after 1 PM', why: 'Scheduled for the morning so you return while shared jeeps still run.', costs: { activity: 300 }, cost: '₹300', action: ['Replace', 'sunMorn'], impact: 'Sunday: waterfall walk' })); d3.items.push(cn('Shared jeep · 20 min · ₹60', 'auto', 20, { local: 60 })); }
    if (sm === 'riverwalk') { d3.items.push(it({ key: 'sun', slot: 'sunMorn', time: '7:30 AM', day: 'Sun', icon: 'walk', title: RK.sunMorn.riverwalk.name, meta: 'Starts and ends at your stay · no transport needed', why: 'No dependence on shared jeeps; a calm last morning by the river.', costs: { food: 200 }, cost: '₹200', action: ['Replace', 'sunMorn'], impact: 'Sunday: riverside walk' })); d3.items.push(cn('Walk back 10 min', 'walk', 10)); }
    if (sm === 'ghat') { d3.items.push(it({ key: 'sun', slot: 'sunMorn', time: '6:15 AM', day: 'Sun', icon: 'sun', title: RK.sunMorn.ghat.name, meta: `${st.aarti.mode === 'walk' ? st.aarti.m + ' min walk' : st.aarti.m + ' min ride'} from your stay · free`, why: 'A sunrise with no transport problem on the way back.', costs: { local: st.aarti.c }, cost: '₹0', action: ['Replace', 'sunMorn'], impact: 'Sunday: sunrise at the ghat' })); d3.items.push(cn('Walk back', 'walk', st.aarti.m)); }
    if (sm === 'kunjapuri') { d3.items.push(it({ key: 'sun', slot: 'sunMorn', time: '5:00 AM', day: 'Sun', icon: 'sun', title: RK.sunMorn.kunjapuri.name, meta: '1 hr uphill drive · no shared transport back before 9 AM · private cab ₹1,800 return', why: 'Getting back depends on a private cab — the thing you wanted to avoid — and it starts before dawn.', costs: { local: 1800 }, cost: '₹1,800', action: ['See options', 'sunMorn'], flagged: true, badge: 'Inconvenient return', impact: 'Sunday: Kunjapuri by private cab' })); d3.items.push(cn('Private cab back · 60 min', 'alert', 60, {}, true)); }
    if (!ashramToday) { d3.items.push(it({ key: 'ashram', time: '10:30 AM', day: 'Sun', icon: 'mountain', title: 'Beatles Ashram (Chaurasi Kutia)', meta: '~2 hrs · moved to Sunday: closed Sat 28 Nov (simulated)', why: 'Moved because of the Saturday closure on your new dates.', costs: { activity: 150 }, cost: '₹150', action: ['Replace', 'none'], impact: 'Beatles Ashram on Sunday' })); d3.items.push(cn('Walk 15 min', 'walk', 15)); }
    d3.items.push(it({ key: 'lunch2', time: '12:30 PM', day: 'Sun', icon: 'food', title: `Check-out & lunch near ${st.area.replace('Near ', '')}`, meta: 'Bags can stay at the front desk until departure', costs: { food: 500 }, cost: '₹500', action: ['Replace', 'none'] }));
    d3.items.push(cn(`Pre-booked auto to station · ${st.station} min · ₹200`, 'auto', st.station, { local: 200 }));
    d3.items.push(it({ key: 'ret', time: '3:30 PM', day: 'Sun', icon: 'train', title: 'Train · Yog Nagari Rishikesh → New Delhi', meta: 'Arrives 9:20 PM · Delhi Metro runs until ~11 PM from the station', why: 'Daytime departure leaves a buffer if delayed, and you reach Delhi with metro still running.', costs: { transport: 1240 }, cost: '₹1,240', action: ['Change', 'none'], mins: 350 }));
    days.push(d3);
    return { days, fixed: { local: 350, activity: 150, food: 650 * nights }, nights, stay: st, out, arr, ppn };
  }

  function buildUdaipur(ch) {
    const st = UD.stays[ch.stay]; const sur = DATES[ch.dates].surcharge; const ppn = st.ppn + sur; const D = DATES[ch.dates];
    const far = !!st.farOldCity;
    const d1 = { key: 'd1', label: `Day 1 · ${D.days[0]}`, theme: 'Overnight sleeper — arrive Saturday morning', items: [
      it({ key: 'out', slot: 'outbound', time: '7:30 PM', day: 'Fri', icon: 'train', title: 'Train · Delhi Sarai Rohilla → Udaipur City', meta: '2AC sleeper · 12h 10m · arrives 7:40 AM Sat (simulated)', why: 'Overnight train means a daytime arrival — no late transfer.', costs: { transport: 2450 }, cost: '₹2,450', action: ['Change', 'none'], mins: 730 })] };
    const d2 = { key: 'd2', label: `Day 2 · ${D.days[1]}`, theme: 'Old city on foot, lake at sunset', items: [
      cn(`Prepaid auto to your stay · ${st.station} min · ₹150`, 'auto', st.station, { local: 150 }),
      it({ key: 'stay', slot: 'stay', time: '8:15 AM', day: 'Sat', icon: 'bed', title: `${st.name} · early check-in`, meta: `${st.area} · private room · 24×7 front desk · ${st.rating} (simulated)`, why: far ? 'Cheaper, but 4 km from the old city — evenings mean an auto back.' : 'Inside the walkable old city, so most of Saturday is on foot.', costs: { stay: ppn }, cost: fmt(ppn), action: ['Swap stay', 'stay'], impact: `Stay: ${st.short}` }),
      cn(far ? 'Auto to old city · 15 min · ₹120' : 'Walk 10 min', far ? 'auto' : 'walk', far ? 15 : 10, far ? { local: 120 } : {}),
      it({ key: 'palace', time: '10:00 AM', day: 'Sat', icon: 'mountain', title: 'City Palace', meta: '~2.5 hrs · audio guide', costs: { activity: 800 }, cost: '₹800', action: ['Replace', 'none'] }),
      it({ key: 'lunch1', time: '1:00 PM', day: 'Sat', icon: 'food', title: 'Rooftop lunch, Lal Ghat', meta: 'Lake views · free afternoon', costs: { food: 600 }, cost: '₹600', action: ['Replace', 'none'] }),
      it({ key: 'boat', time: '5:00 PM', day: 'Sat', icon: 'sun', title: 'Sunset boat ride · Lake Pichola', meta: '1 hr · shared boat', costs: { activity: 500 }, cost: '₹500', action: ['Replace', 'none'] })
    ] };
    if (ch.satEve === 'dance') { d2.items.push(cn(far ? 'Auto back after 8 PM · 20 min · ₹150' : 'Walk 7 min', far ? 'alert' : 'walk', far ? 20 : 7, far ? { local: 150 } : {}, far)); d2.items.push(it({ key: 'eve', slot: 'satEve', time: '7:00 PM', day: 'Sat', icon: 'users', title: UD.satEve.dance.name, meta: `1 hr show · ${far ? '20 min auto back' : '7 min walk back'}`, why: 'Popular, well-reviewed evening that ends by 8 PM.', costs: { activity: 250 }, cost: '₹250', action: ['Replace', 'satEve'], flagged: far, badge: far ? 'Ride back after dark' : null, impact: far ? 'Return 20 min by auto' : 'Return 7 min walk' })); }
    else { d2.items.push(cn('Walk 3 min', 'walk', 3)); d2.items.push(it({ key: 'eve', slot: 'satEve', time: '7:30 PM', day: 'Sat', icon: 'food', title: UD.satEve.rooftop.name, meta: 'Within 3 min of your stay', costs: { food: 700 }, cost: '₹700', action: ['Replace', 'satEve'], impact: 'Dinner near your stay' })); }
    const d3 = { key: 'd3', label: `Day 3 · ${D.days[2]}`, theme: 'Slow morning, overnight train home', items: [] };
    if (ch.sunMorn === 'walk') d3.items.push(it({ key: 'sun', slot: 'sunMorn', time: '7:30 AM', day: 'Sun', icon: 'walk', title: UD.sunMorn.walk.name, meta: '2 hrs · starts at your stay', why: 'Quiet early-morning lanes; no transport needed.', costs: {}, cost: '₹0', action: ['Replace', 'sunMorn'], impact: 'Sunday: old-city walk' }));
    else { d3.items.push(it({ key: 'sun', slot: 'sunMorn', time: '9:00 AM', day: 'Sun', icon: 'mountain', title: UD.sunMorn.sajjangarh.name, meta: 'Hilltop palace · no shared transport · auto ₹400 return incl. waiting', why: 'Great views, but the return depends on keeping an auto waiting.', costs: { local: 400, activity: 150 }, cost: '₹550', action: ['See options', 'sunMorn'], flagged: true, badge: 'Inconvenient return', impact: 'Sunday: Sajjangarh by auto' })); }
    d3.items.push(it({ key: 'lunch2', time: '12:30 PM', day: 'Sun', icon: 'food', title: 'Check-out & lunch', meta: 'Late check-out until 2 PM (simulated)', costs: { food: 500 }, cost: '₹500', action: ['Replace', 'none'] }));
    d3.items.push(cn('Auto to station · 15 min · ₹150', 'auto', 15, { local: 150 }));
    d3.items.push(it({ key: 'ret', time: '6:15 PM', day: 'Sun', icon: 'train', title: 'Train · Udaipur City → Delhi Sarai Rohilla', meta: 'Arrives 6:25 AM Mon · 2AC sleeper', why: 'Overnight return saves a hotel night — trade-off: you arrive Monday morning.', costs: { transport: 2450 }, cost: '₹2,450', action: ['Change', 'none'], mins: 730 }));
    return { days: [d1, d2, d3], fixed: { local: 600, activity: 300, food: 1300 }, nights: 1, stay: st, out: { late: false }, arr: '7:40 AM', ppn };
  }

  function buildMcleod(ch) {
    const st = MG.stays[ch.stay]; const sur = DATES[ch.dates].surcharge; const ppn = st.ppn + sur; const D = DATES[ch.dates];
    const d1 = { key: 'd1', label: `Day 1 · ${D.days[0]}`, theme: 'Overnight Volvo — arrive at dawn', items: [
      it({ key: 'out', slot: 'outbound', time: '7:45 PM', day: 'Fri', icon: 'auto', title: 'Volvo bus · Majnu ka Tilla → McLeod Ganj', meta: 'AC semi-sleeper · 10h 30m · arrives 6:15 AM Sat (simulated)', why: 'Only direct overnight option; arrives after first light.', costs: { transport: 1300 }, cost: '₹1,300', action: ['Change', 'none'], mins: 630 })] };
    const d2 = { key: 'd2', label: `Day 2 · ${D.days[1]}`, theme: 'Monasteries and cafés around the main square', items: [
      cn(`Walk ${st.station} min to your stay${st.station > 15 ? ' (uphill)' : ''}`, 'walk', st.station),
      it({ key: 'stay', slot: 'stay', time: '6:30 AM', day: 'Sat', icon: 'bed', title: `${st.name} · early check-in`, meta: `${st.area} · private room · 24×7 front desk · ${st.rating} (simulated)`, why: st.uncertain ? 'Cheapest, but uphill — and evening transport here is not well documented.' : 'Close to the main square, so most of the weekend is walkable.', costs: { stay: ppn * 2 }, cost: fmt(ppn * 2), action: ['Swap stay', 'stay'], flagged: !!st.uncertain, badge: st.uncertain ? 'Limited info' : null, impact: `Stay: ${st.short}` }),
      cn('Walk 6 min', 'walk', 6),
      it({ key: 'temple', time: '9:30 AM', day: 'Sat', icon: 'sun', title: 'Tsuglagkhang complex', meta: 'Main temple & museum · 2 hrs', costs: { activity: 100 }, cost: '₹100', action: ['Replace', 'none'] }),
      it({ key: 'lunch1', time: '12:30 PM', day: 'Sat', icon: 'food', title: 'Lunch · Temple Road café', meta: 'Momos & thukpa', costs: { food: 600 }, cost: '₹600', action: ['Replace', 'none'] })
    ] };
    if (ch.satEve === 'bhagsu') { d2.items.push(cn('Shared taxi up · 10 min · ₹50', 'auto', 10, { local: 50 })); d2.items.push(it({ key: 'eve', slot: 'satEve', time: '3:30 PM', day: 'Sat', icon: 'mountain', title: MG.satEve.bhagsu.name, meta: 'Back on the main square by dusk (~5:45 PM) · evening shared-taxi availability: no reliable data', why: 'Scheduled for the afternoon because I can’t confirm evening taxis back.', costs: { local: 150 }, cost: '₹150', action: ['Replace', 'satEve'], flagged: true, badge: 'Limited info', impact: 'Bhagsu walk (uncertain return)' })); }
    else { d2.items.push(cn('Walk 4 min', 'walk', 4)); d2.items.push(it({ key: 'eve', slot: 'satEve', time: '4:00 PM', day: 'Sat', icon: 'food', title: MG.satEve.cafe.name, meta: 'All within the main square', costs: { food: 400 }, cost: '₹400', action: ['Replace', 'satEve'], impact: 'Cafés near your stay' })); }
    const d3 = { key: 'd3', label: `Day 3 · ${D.days[2]}`, theme: 'Slow Sunday, overnight bus home', items: [] };
    if (ch.sunMorn === 'cooking') d3.items.push(it({ key: 'sun', slot: 'sunMorn', time: '10:00 AM', day: 'Sun', icon: 'food', title: MG.sunMorn.cooking.name, meta: '3 hrs · small group · 5 min walk', why: 'Indoor, walkable and highly rated by solo guests (simulated).', costs: { activity: 1200 }, cost: '₹1,200', action: ['Replace', 'sunMorn'], impact: 'Sunday: cooking class' }));
    else d3.items.push(it({ key: 'sun', slot: 'sunMorn', time: '8:00 AM', day: 'Sun', icon: 'walk', title: MG.sunMorn.dharamkot.name, meta: 'Uphill trail · limited recent information on the route after rain', why: 'Lovely views, but I only found 3 recent reports on the trail — check with your host first.', costs: { activity: 0 }, cost: '₹0', action: ['Replace', 'sunMorn'], flagged: true, badge: 'Limited info', impact: 'Sunday: Dharamkot walk' }));
    d3.items.push(it({ key: 'lunch2', time: '1:30 PM', day: 'Sun', icon: 'food', title: 'Lunch & check-out', meta: 'Bags at front desk until the bus', costs: { food: 500 }, cost: '₹500', action: ['Replace', 'none'] }));
    d3.items.push(cn('Walk 10 min to the bus stand', 'walk', 10));
    d3.items.push(it({ key: 'ret', time: '6:30 PM', day: 'Sun', icon: 'auto', title: 'Volvo bus · McLeod Ganj → Majnu ka Tilla', meta: 'Arrives 5:30 AM Mon', costs: { transport: 1300 }, cost: '₹1,300', action: ['Change', 'none'], mins: 660 }));
    return { days: [d1, d2, d3], fixed: { local: 700, activity: 400, food: 2000 }, nights: 2, stay: st, out: { late: false }, arr: '6:15 AM', ppn };
  }

  const BUILDERS = { rishikesh: buildRishikesh, udaipur: buildUdaipur, mcleodganj: buildMcleod };
  const SLOT_OPTS = {
    rishikesh: { stay: ['riverside', 'gangaview', 'lakshman', 'stationroad', 'hostel', 'sunrise'], outbound: ['train', 'sat', 'volvo'], satEve: ['music', 'aarti'], sunMorn: ['waterfall', 'riverwalk', 'ghat', 'kunjapuri'] },
    udaipur: { stay: ['lalghat', 'gangaur', 'lakeview'], satEve: ['dance', 'rooftop'], sunMorn: ['walk', 'sajjangarh'] },
    mcleodganj: { stay: ['templeroad', 'mainsquare', 'bhagsu'], satEve: ['cafe', 'bhagsu'], sunMorn: ['cooking', 'dharamkot'] }
  };
  const SLOT_NAME = { stay: 'stay', outbound: 'outbound journey', satEve: 'Saturday evening', sunMorn: 'Sunday morning', dates: 'dates' };
  function optName(dest, slot, id) {
    const T = dest === 'rishikesh' ? RK : dest === 'udaipur' ? UD : MG;
    if (slot === 'stay') return T.stays[id].name;
    if (slot === 'outbound') return RK.out[id].name;
    if (slot === 'dates') return DATES[id].label;
    return (T[slot][id] || {}).name || id;
  }

  function buildPlan(ch) {
    const p = BUILDERS[ch.dest](ch);
    const b = { transport: 0, stay: 0, local: p.fixed.local, activity: p.fixed.activity, food: p.fixed.food };
    let travel = 0; const flags = [];
    p.days.forEach((d) => { d.cost = 0; d.travel = 0; d.items.forEach((x) => { Object.entries(x.costs).forEach(([k, v]) => { b[k] += v; d.cost += v; }); if (x.type === 'conn') { d.travel += x.mins; } else if (x.mins) d.travel += x.mins; if (x.flagged) flags.push({ day: d.label, title: x.title, key: x.key, badge: x.badge }); }); travel += d.travel; });
    p.budget = b; p.total = Object.values(b).reduce((a, v) => a + v, 0); p.travel = travel; p.flags = flags; p.choices = ch;
    p.lateEvening = p.days.some((d) => d.items.some((x) => x.backAt && x.backAt > tParse('9:00 PM')));
    return p;
  }

  /* Initial plan: the agent reasons over the brief (arrival preference + budget) */
  function initialChoices(dest) {
    const br = S.brief; const dates = br.dates || '20-22';
    if (dest === 'udaipur') return { dest, dates, stay: 'lalghat', satEve: 'dance', sunMorn: 'walk' };
    if (dest === 'mcleodganj') return { dest, dates, stay: 'templeroad', satEve: 'bhagsu', sunMorn: 'cooking' };
    const ch = { dest, dates, outbound: br.leave === 'sat' ? 'sat' : 'train', stay: 'riverside', satEve: 'music', sunMorn: 'waterfall' };
    const avoid = br.avoidLate || br.comfort.includes('Close to arrival station');
    let best = null;
    ['riverside', 'gangaview', 'lakshman', 'stationroad'].forEach((id) => {
      const s = RK.stays[id]; if (s.soldOut || S.soldOut[id]) return;
      const score = s.ppn * 2 + s.station * (avoid ? 30 : 5) + s.walkPenalty;
      if (!best || score < best.score) best = { id, score };
    });
    ch.stay = best.id;
    const budget = br.budget || 15000;
    if (buildPlan(ch).total > budget) { // try a cheaper but still suitable stay
      ch.stay = 'hostel';
    }
    return ch;
  }
  function planFor(dest) { return buildPlan(initialChoices(dest)); }
  const plan = () => buildPlan(S.choices);

  /* Diff two plans → impact summary */
  function diffPlans(a, b) {
    const idx = (p) => { const m = {}; p.days.forEach((d) => d.items.forEach((x) => { if (x.type === 'item') m[x.key] = Object.assign({ dayLabel: d.label.split(' · ')[0] }, x); })); return m; };
    const A = idx(a), B = idx(b); const lines = []; const changedKeys = new Set();
    Object.keys(B).forEach((k) => {
      const x = A[k], y = B[k];
      if (!x) { lines.push({ tone: 'info', icon: 'sparkle', text: `${y.dayLabel} · Added: ${y.title}` }); changedKeys.add(k); return; }
      if (x.title !== y.title || x.meta !== y.meta || x.cost !== y.cost || x.time !== y.time) {
        changedKeys.add(k);
        if (x.title !== y.title && y.slot) lines.push({ tone: 'info', icon: 'swap', text: `${y.dayLabel} · ${x.title} → ${y.title}` });
        else if (x.impact && y.impact && x.impact !== y.impact) { const worse = (y.flagged && !x.flagged) || (y.badge && y.badge !== x.badge); const better = !y.flagged && x.flagged; lines.push({ tone: worse ? 'warning' : better ? 'success' : 'info', icon: worse ? 'alert' : better ? 'checkCircle' : 'refresh', text: (() => { const a = x.impact, c = y.impact; let i = 0; while (i < a.length && a[i] === c[i]) i++; const cut = a.lastIndexOf(' ', i) + 1; const pre = cut > 3 ? a.slice(0, cut) : ''; return `${y.dayLabel} · ${pre}${a.slice(pre.length)} → ${c.slice(pre.length)}`; })() }); }
        else if (x.time !== y.time) lines.push({ tone: 'info', icon: 'clock', text: `${y.dayLabel} · ${y.title} moves ${x.time} → ${y.time}` });
      }
    });
    Object.keys(A).forEach((k) => { if (!B[k]) { lines.push({ tone: 'neutral', icon: 'close', text: `${A[k].dayLabel} · Removed: ${A[k].title}` }); changedKeys.add(k); } });
    const flagsA = a.flags.length, flagsB = b.flags.length;
    const unchanged = b.days.filter((d) => { const da = a.days.find((z) => z.key === d.key); return da && JSON.stringify(da.items) === JSON.stringify(d.items); }).map((d) => d.label.split(' · ')[0]);
    const lastBack = (p) => Math.max(0, ...p.days.flatMap((d) => d.items.map((x) => x.backAt || 0)));
    return { delta: b.total - a.total, travelDelta: b.travel - a.travel, flagsDelta: flagsB - flagsA, lines, changedKeys: [...changedKeys], unchanged, backA: lastBack(a), backB: lastBack(b), removed: Object.keys(A).filter((k) => !B[k]).map((k) => A[k]) };
  }

  /* ------------------------------------------------------------------ *
   * 4. Natural-language understanding (rule-based simulation)
   * ------------------------------------------------------------------ */
  function parseIntent(t) {
    const s = t.toLowerCase(); const o = {};
    const bm = s.match(/(?:₹|rs\.?|inr|budget(?: is| of)?|under|within|upto|up to)\s*([\d,]+(?:\.\d+)?)\s*(k|thousand)?/) || s.match(/\b([\d,]{4,7})\b\s*(?:rupees|rs|inr|budget)/) || s.match(/\b(\d{1,3})\s*(k)\b/);
    if (bm) { let v = parseFloat(bm[1].replace(/,/g, '')); if (bm[2]) v *= 1000; if (v >= 2000 && v <= 500000) o.budget = Math.round(v); }
    if (/\b(alone|solo|by myself|on my own|just me)\b/.test(s)) o.solo = true;
    if (/(this weekend|this fri|20(th)?\s*(–|-|to)?\s*22|coming weekend)/.test(s)) o.dates = '20-22';
    if (/(next weekend|27(th)?|29(th)?|long weekend)/.test(s)) o.dates = '27-29';
    if (/(peace|calm|quiet|relax|slow|unwind|serene)/.test(s)) o.vibe = 'Peaceful, unhurried';
    else if (/(adventure|trek|rafting|hike)/.test(s)) o.vibe = 'Outdoorsy, some activity';
    if (/(without (depending on )?private|no private|public transport|walkable|on foot|no cab|without a car|shared transport|explore comfortably)/.test(s)) o.mobility = true;
    const om = s.match(/from\s+(new delhi|delhi|gurgaon|gurugram|noida|mumbai|bangalore|bengaluru|pune|jaipur|chandigarh)/);
    if (om) o.origin = om[1].replace(/\b\w/g, (c) => c.toUpperCase()).replace('Delhi', 'Delhi').replace(/^Delhi$/, 'New Delhi');
    if (/(after work|after 5|evening|5 ?pm|6 ?pm|friday night|fri night)/.test(s)) o.leave = 'fri-eve';
    else if (/(friday morning|fri morning)/.test(s)) o.leave = 'fri-am';
    else if (/(saturday morning|sat morning|saturday)/.test(s)) o.leave = 'sat';
    if (/(cab|taxi|transfer|station|late|night|midnight|dark|stuck|waited|stressful)/.test(s) && /(last time|previous|past|before|took|stress|hate|avoid|uncomfortable)/.test(s)) o.avoidLate = true;
    if (/private room/.test(s)) o.comfortAdd = (o.comfortAdd || []).concat('Private room');
    if (/(24\s*[x×*]\s*7|24\/7|front desk|reception)/.test(s)) o.comfortAdd = (o.comfortAdd || []).concat('24×7 front desk');
    return o;
  }
  const LEAVE = { 'fri-eve': 'After 5 PM, after work', 'fri-am': 'Friday morning', sat: 'Saturday morning' };
  const isSafetyQ = (s) => /\b(safe|safety|unsafe|dangerous|secure)\b/i.test(s);
  const SAFETY_REPLY = 'I don’t label places as “safe” or “unsafe” — conditions vary and I can’t verify them. What I can show is evidence: what solo women travellers report (simulated sample), how late shared transport runs, how far stays are from the arrival point, and where my information is thin. You decide what feels right.';

  /* ------------------------------------------------------------------ *
   * 5. Shared UI components (mirror Figma components)
   * ------------------------------------------------------------------ */
  const C = {
    tag: (l, tone = 'neutral', icon = 'info') => `<span class="tag t-${tone}">${icon ? ic(icon) : ''}${esc(l)}</span>`,
    src: (l, kind = 'src') => `<span class="src ${kind === 'sim' ? 'sim' : kind === 'nodata' ? 'nodata' : ''}">${ic(kind === 'sim' ? 'sparkle' : kind === 'nodata' ? 'help' : 'database')}${esc(l)}</span>`,
    chip: (l, sel, attrs = '') => `<button class="chip ${sel ? 'sel' : ''}" ${attrs}>${ic('check')}${esc(l)}</button>`,
    btn: (l, v = 'primary', icon, attrs = '') => `<button class="btn btn-${v}" ${attrs}>${v !== 'tertiary' && icon ? ic(icon) : ''}${esc(l)}${v === 'tertiary' ? ic(icon || 'chevronRight') : ''}</button>`,
    notice: (type, title, body, extra = '') => { const icn = { warning: 'alert', info: 'info', success: 'checkCircle', uncertain: 'help', ai: 'sparkle' }[type]; return `<div class="notice n-${type}">${ic(icn)}<div class="grow"><div class="n-title">${title}</div><div class="n-body">${body}</div>${extra}</div></div>`; },
    aiMark: (lg) => `<span class="ai-mark ${lg ? 'lg' : ''}">${ic('sparkle')}</span>`,
    aiMsg: (inner, cls = '') => `<div class="msg-ai">${C.aiMark()}<div class="bubble ${cls}">${inner}</div></div>`,
    userMsg: (t) => `<div class="msg-user">${esc(t)}</div>`,
    input: (ph, ctx, val = '') => `<form class="chat-input" data-chat="${ctx}" autocomplete="off">${ic('sparkle')}<input id="in-${ctx}" name="q" placeholder="${esc(ph)}" value="${esc(val)}" aria-label="Message the trip planner"><button type="button" class="mic" data-a="mic" title="Voice input (not available in prototype)">${ic('mic')}</button><button class="send" type="submit" aria-label="Send">${ic('send')}</button></form>`,
    typing: () => `<div class="msg-ai typing-row">${C.aiMark()}<div class="bubble" style="flex:none"><div class="typing"><span></span><span></span><span></span></div></div></div>`
  };
  function itemHTML(x, opts = {}) {
    if (x.type === 'conn') return `<div class="conn ${x.warn ? 'warn' : ''}"><span class="line"></span>${ic(x.icon)}<span>${esc(x.label)}</span></div>`;
    const changed = opts.changed && !x.flagged; const prev = opts.preview;
    const cls = prev ? 'preview' : x.flagged ? 'flagged' : changed ? 'changed' : '';
    const badge = prev ? '<span class="it-badge prev">Preview</span>' : x.flagged ? `<span class="it-badge warn">${esc(x.badge || 'Needs attention')}</span>` : changed ? '<span class="it-badge ok">Updated</span>' : '';
    const act = x.action && opts.actions !== false ? `<button class="it-action" data-a="itemAction" data-slot="${x.action[1]}" data-key="${x.key}">${ic(x.action[1] === 'stay' ? 'swap' : 'swap')}${esc(x.action[0])}</button>` : '';
    return `<div class="it ${cls}" data-key="${x.key}"><div class="it-time"><div class="tm">${esc(x.time)}</div><div class="dy">${esc(x.day)}</div></div><div class="it-icon">${ic(x.icon)}</div><div class="it-body"><div class="it-title">${esc(x.title)} ${badge}</div><div class="it-meta">${esc(x.meta)}</div>${x.why && opts.why !== false ? `<div class="it-why">${ic('sparkle')}<span>${esc(x.why)}</span></div>` : ''}</div><div class="it-right"><div class="it-cost">${esc(x.cost)}</div>${act}</div></div>`;
  }
  const COLORS = { transport: '#008CFF', stay: '#6A4BD8', local: '#12A06A', activity: '#F5A623', food: '#FF7A7A' };
  const CATN = { transport: 'Transport', stay: 'Stay', local: 'Local travel', activity: 'Activities', food: 'Food' };
  function budgetHTML(p, label, extra = '') {
    const max = S.brief.budget || 15000; const over = p.total > max; const scale = Math.max(max, p.total);
    const segs = Object.keys(CATN).map((k) => `<div class="seg" style="width:${(p.budget[k] / scale * 100).toFixed(2)}%;background:${COLORS[k]}" title="${CATN[k]} ${fmt(p.budget[k])}"></div>`).join('');
    return `<div class="budget" id="budget"><div class="row between"><span class="t13 b ink2">${label}</span><span class="row gap6">${extra}<span class="total" style="color:${over ? '#C0392B' : 'inherit'}">${fmt(p.total)}</span><span class="t13 muted">of ${fmt(max)}</span></span></div><div class="bar ${over ? 'over' : ''}">${segs}</div><div class="legend">${Object.keys(CATN).map((k) => `<span><i class="dot" style="background:${COLORS[k]}"></i>${CATN[k]} ${fmt(p.budget[k])}</span>`).join('')}<span class="${over ? '' : 'green'} b" style="${over ? 'color:#C0392B' : ''}">${ic(over ? 'alert' : 'checkCircle', '', 'width:12px;height:12px;vertical-align:-2px;margin-right:4px')}${over ? fmt(p.total - max) + ' over budget' : fmt(max - p.total) + ' left'}</span></div></div>`;
  }

  /* ------------------------------------------------------------------ *
   * 6. Chrome: app header + planner bar
   * ------------------------------------------------------------------ */
  const STEPS = [['Describe', 'disc'], ['Destinations', 'dest'], ['Itinerary', 'plan'], ['Review', 'review'], ['Ready', 'ready']];
  function chrome(cur) {
    const reachable = (i) => i < cur || (i === 2 && S.choices) || (i === 3 && S.choices) || (i === 4 && S.choices);
    return `<header class="app-header"><div class="left"><span class="logo-text" data-a="go" data-s="home" role="link" tabindex="0">makemytrip</span><nav class="pnav">${['Flights', 'Hotels', 'Holidays', 'Trains', 'Buses'].map((l) => `<button data-a="toast" data-msg="${l} search isn’t part of this prototype">${l}</button>`).join('')}<button class="pill-ai" data-a="go" data-s="disc">${ic('sparkle')}AI Trip Planner</button></nav></div><div class="right"><button data-a="toast" data-msg="My Trips isn’t part of this prototype">My Trips</button><span class="avatar">T</span></div></header>
    <div class="planner-bar"><div class="pb-title"><button class="back" data-a="back" aria-label="Back">${ic('arrowLeft')}</button><h1>AI Trip Planner</h1>${C.tag('Beta', 'ai', 'sparkle')}${C.tag('Prototype · simulated data', 'uncertain', 'database')}</div>
    <div class="stepper">${STEPS.map(([l, s], i) => `${i ? `<span class="step-conn ${i <= cur ? 'on' : ''}"></span>` : ''}<div class="step ${i < cur ? 'done' : i === cur ? 'current' : ''}" ${reachable(i) && i !== cur ? `data-a="go" data-s="${s}" role="button" tabindex="0"` : ''}><span class="dot">${i < cur ? ic('check') : i + 1}</span><span>${l}</span></div>`).join('')}</div></div>`;
  }
  function panelHead() { return `<div class="row gap10">${C.aiMark()}<div class="col grow"><span class="t15 bk">Trip Planner</span><span class="t11 muted">Reasoning shown for every pick</span></div></div><div class="divider"></div>`; }

  /* ------------------------------------------------------------------ *
   * 7. SCREEN 1 — Homepage + AI entry point
   * ------------------------------------------------------------------ */
  function renderHome() {
    const h = S.home;
    const svcs = [['plane', 'Flights', 'flights'], ['hotel', 'Hotels'], ['villa', 'Villas &amp;<br>Homestays'], ['umbrella', 'Holiday<br>Packages'], ['train', 'Trains'], ['bus', 'Buses'], ['auto', 'Cabs'], ['balloon', 'Tours &amp;<br>Attractions'], ['passport', 'Visa'], ['card', 'Forex Card<br>&amp; Currency'], ['shieldCheck', 'Travel<br>Insurance']];
    const fares = [['regular', 'Regular', 'Regular fares'], ['student', 'Student', 'Extra discounts/baggage'], ['armed', 'Armed Forces', 'Up to ₹ 600 off'], ['gst', 'Have a GST number ?', null, true], ['senior', 'Senior Citizen', 'Up to ₹ 600 off'], ['doctor', 'Doctor and Nurses', 'Up to ₹ 600 off']];
    return `<div class="screen home" data-screen="home">
    <section class="hero"><img class="mountains" src="assets/img/hero-mountains.svg" alt="">
      <div class="hdr"><span class="logo" aria-label="makemytrip (logo placeholder)">makemytrip</span>
        <div class="hdr-actions">
          <button class="hdr-item" data-a="toast" data-msg="Not part of this prototype"><span class="hi-tile hi-prop">${ic('briefcase')}</span><span><div class="tt">List Your Property</div><div class="ss">Grow your business</div></span></button>
          <button class="hdr-item filled" data-a="toast" data-msg="Not part of this prototype"><span class="hi-tile hi-biz"><small>my</small><b>Biz</b></span><span><div class="tt">Introducing myBiz</div><div class="ss">Business Travel Solution</div></span></button>
          <button class="hdr-item" data-a="toast" data-msg="Not part of this prototype"><span class="hi-tile hi-trips">${ic('luggage')}</span><span><div class="tt">My Trips</div><div class="ss">Manage your bookings</div></span></button>
          <button class="hdr-item" data-a="toast" data-msg="Not part of this prototype"><span class="hi-tile hi-wish">${ic('heart')}</span><span><div class="tt">Wishlist</div><div class="ss">Save favourites</div></span></button>
          <span class="hdr-acc"><span class="av">T</span>${ic('chevronDown')}</span>
          <span class="hdr-loc"><img src="assets/img/flag-in.svg" width="20" height="14" alt="India">INR&nbsp;&nbsp;|&nbsp;&nbsp;English${ic('chevronDown')}</span>
        </div></div>
      <div class="booking-area">
        <nav class="svc-nav" aria-label="Services">${svcs.map(([i, l, k]) => `<button class="svc ${h.svc === (k || l) ? 'sel' : ''}" data-a="svc" data-k="${k || l}">${ic(i)}<span>${l}</span></button>`).join('')}</nav>
        <div class="widget">
          <div class="trip-row"><div class="radios">${[['oneway', 'One Way'], ['round', 'Round Trip'], ['multi', 'Multi City']].map(([k, l]) => `<button class="radio ${h.trip === k ? 'sel' : ''}" data-a="trip" data-k="${k}"><span class="rd">${ic('check')}</span>${l}</button>`).join('')}</div>
            <div class="trip-right"><button data-a="startAI" data-q="">${C.tag('Plan a trip with AI', 'ai', 'sparkle')}</button><span class="bdi">Book Domestic &amp; International Flights</span><span class="cabconn"><b>Flight + Cab connection :</b> <span>Reach anywhere in India</span><span class="inf">i</span><span class="badge-new">NEW</span></span></div></div>
          <div class="fields">
            <button class="field" style="width:340px" data-a="toast" data-msg="Flight search isn’t part of this prototype"><span class="fl">From</span><span class="fv">New Delhi</span><span class="fs">DEL, Indira Gandhi International Airport India</span></button>
            <button class="field" style="width:344px;padding-left:32px" data-a="toast" data-msg="Flight search isn’t part of this prototype"><span class="fl">To</span><span class="fv">Mumbai</span><span class="fs">BOM, Chhatrapati Shivaji International Airport India</span></button>
            <button class="field" style="width:180px" data-a="toast" data-msg="Flight search isn’t part of this prototype"><span class="fl">Departure ${ic('chevronDown')}</span><span class="fv">16 <small>Nov’26</small></span><span class="fs">Monday</span></button>
            <button class="field" style="width:182px;padding-right:36px" data-a="toast" data-msg="Flight search isn’t part of this prototype"><span class="fl">Return ${ic('chevronDown')}</span><span class="fp">Tap to add a return date for bigger discounts</span></button>
            <button class="field" style="width:277px" data-a="toast" data-msg="Flight search isn’t part of this prototype"><span class="fl">Travellers &amp; Class ${ic('chevronDown')}</span><span class="fv">1 <small>Traveller</small></span><span class="fs">Economy/Premium Economy</span></button>
            <button class="swap-btn" data-a="toast" data-msg="Swapped (cosmetic in this prototype)" aria-label="Swap">${ic('swap')}</button>
          </div>
          <div class="fares"><span class="lbl">Select a<br>special fare</span>${fares.map(([k, t, s, gst]) => `<button class="fare ${h.fare === k ? 'sel' : ''}" data-a="fare" data-k="${k}"><span class="fc"><span class="ftt">${t}${gst ? '<span class="nb">NEW</span>' : ''}</span>${s ? `<span class="fst">${s}</span>` : ''}</span>${gst ? '<span class="strip">Free Date Change</span>' : ''}</button>`).join('')}</div>
          <div class="tools-row"><button class="pdp ${h.pdp ? 'on' : ''}" data-a="pdp"><span class="cb">${ic('check')}</span><b>Add Price Drop Protection</b><span class="ds">Price drops, we'll refund the difference.</span><span class="vd">View Details</span><img class="decor" src="assets/img/price-drop-decor.svg" alt=""><span class="rb">${ic('rupee')}</span></button>
            <div class="tools"><span class="vdiv"></span><button class="btn-out" data-a="toast" data-msg="Not part of this prototype">${ic('clock')}Flight Status</button><button class="btn-out" data-a="toast" data-msg="Not part of this prototype">${ic('zap')}Fast Track Immigration<span class="beta">BETA</span></button></div></div>
          <button class="search-btn" data-a="toast" data-msg="Flight search isn’t part of this prototype — try the AI Trip Planner below">SEARCH</button>
        </div>
      </div>
      <div class="explore">${ic('chevronsDown')}Explore More${ic('chevronsDown')}</div>
      <div class="qlinks-wrap"><div class="qlinks">${[['globe', 'Where2Go', null, 1], ['umbrella', 'Insurance', 'For International Trips'], ['plane', 'Explore International Flights', 'Cheapest Flights to Paris, Bali, Tokyo &amp; more', 1], ['users', 'MICE', 'Offsites, Events &amp; Meetings'], ['gift', 'Gift Cards']].map(([i, t, s, b], n) => `${n ? '<span class="qdiv"></span>' : ''}<button class="ql" data-a="toast" data-msg="Not part of this prototype">${ic(i, b ? 'bl' : '')}<span><b>${t}</b>${s ? `<small>${s}</small>` : ''}</span></button>`).join('')}</div></div>
    </section>
    <section class="home-content">
      <div class="ai-entry" id="ai-entry"><div class="pitch">${C.tag('NEW · AI Trip Planner', 'ai', 'sparkle')}<h2>Not sure where to go? Just describe your trip.</h2><p class="lead">Share your dates, budget and how you like to travel. Get one connected plan — transport, stay and activities — with the reasoning behind every pick.</p>
        <div class="hl"><span>${ic('pin')}Destination ideas for fixed dates</span><span>${ic('moon')}Arrival &amp; last-mile checks</span><span>${ic('message')}Change anything by chatting</span></div></div>
        <div class="prompt">${C.input('e.g. A peaceful solo weekend from Delhi under ₹15,000, no private cabs', 'home', h.draft)}
          <div class="row gap8 wrap"><span class="t12 b muted">Try:</span>${['Solo weekend under ₹15k', 'Fixed dates, open destination', 'Walkable hill town'].map((s) => C.chip(s, false, `data-a="homeChip" data-q="${esc(s)}"`)).join('')}</div>
          <div class="row gap14 wrap">${C.btn('Plan my trip with AI', 'ai', 'sparkle', 'data-a="startAI" id="cta-plan"')}${C.src('Your preferences are used only for this plan')}</div></div></div>
      <div class="airlines"><h2>Experience Flying with our Airline Partners</h2><div class="airline-row"><div class="airline-card navy"><span>Air India<br>Express</span><img src="assets/img/tail-navy.svg" alt=""></div><div class="airline-card sky"><span>Qantas</span><img src="assets/img/tail-sky.svg" alt=""></div></div></div>
      <div class="promo"><div class="logos"><i style="width:60px;background:#E9EDF2"></i><i style="width:1px;background:#D0D0D0"></i><i style="width:44px;background:#F7D9D9"></i></div><div class="art"><span class="kgf">KIDS GO FREE</span><span class="bn">BOOK NOW</span></div></div>
    </section></div>`;
  }

  /* ------------------------------------------------------------------ *
   * 8. SCREEN 2 — Conversational discovery
   * ------------------------------------------------------------------ */
  const EXAMPLE = 'I want to go somewhere peaceful this weekend. My budget is ₹15,000. I’ll be travelling alone. I’d prefer somewhere I can comfortably explore without depending on private transport.';
  const COMFORT = ['Private room', '24×7 front desk', 'Close to arrival station', 'Female-only dorm is fine'];
  function briefRows() {
    const b = S.brief;
    return [
      ['calendar', 'Dates', b.dates ? (() => { const D = DATES[b.dates].days; const when = b.leave === 'sat' ? ' (morning)' : b.leave === 'fri-am' ? ' (morning)' : b.leave ? ' (after 5 PM)' : ''; const first = b.leave === 'sat' ? D[1] : D[0]; return `${first.replace(/^(\w+) (\d+) (\w+)$/, '$1 $2 $3')}${when} – ${D[2]} · ${b.leave === 'sat' ? '1 night' : '2 nights'}`; })() : null, 'dates'],
      ['pin', 'From', b.origin, 'origin'],
      ['wallet', 'Budget', b.budget ? `${fmt(b.budget)} total — travel, stay, local transport, food, activities` : null, 'budget'],
      ['user', 'Travelling', b.solo ? 'Solo' : null, 'solo'],
      ['sparkle', 'Vibe', b.vibe, 'vibe'],
      ['walk', 'Getting around', b.mobility ? 'Walkable or shared/public transport' : null, 'mobility'],
      ['bed', 'Stay', b.comfort.length ? b.comfort.join(' · ') : null, 'comfort'],
      ['moon', 'Plan around', b.avoidLate ? 'Long late-night transfers from the station' : (b.notes[0] || null), 'avoid'],
      ['help', 'Destination', 'Open — I’ll suggest 3 to compare', 'dest']
    ];
  }
  function discMsgHTML(m, i) {
    const last = i === S.disc.msgs.length - 1;
    if (m.who === 'user') return C.userMsg(m.text);
    const b = S.brief;
    switch (m.kind) {
      case 'greet': return C.aiMsg(`<p>Hi Tanya! Tell me about the trip you have in mind — dates, budget, the kind of place, or just a mood. I’ll plan transport, stay and activities together and explain each choice.</p><div class="row gap8 wrap">${['Peaceful solo weekend under ₹15,000', 'Fixed dates, open destination', 'Walkable places, no private cabs', 'Surprise me with a hill town'].map((s) => C.chip(s, false, `data-a="prompt" data-q="${esc(s)}"`)).join('')}</div><div>${C.btn('Use the example request', 'tertiary', 'chevronRight', 'data-a="prompt" data-q="__example"')}</div>`);
      case 'vague': return C.aiMsg(`<p>Happy to help! To suggest places that actually fit, tell me roughly <b>when</b>, your <b>budget</b>, and what kind of place you’d enjoy. For example:</p><div class="row gap8 wrap">${C.chip('This weekend, ₹15,000, somewhere calm', false, 'data-a="prompt" data-q="This weekend, budget ₹15,000, somewhere calm I can explore on foot, travelling solo"')}${C.chip('Next weekend, ₹12k, walkable town', false, 'data-a="prompt" data-q="Next weekend, budget 12k, a walkable town, travelling alone"')}</div>`);
      case 'understand': {
        const tags = [];
        if (b.dates) tags.push([`${b.dates === '20-22' ? 'This weekend' : 'Next weekend'} · ${DATES[b.dates].label}`, 'info', 'calendar']);
        if (b.budget) tags.push([`${fmt(b.budget)} all-in`, 'info', 'wallet']);
        if (b.solo) tags.push(['Solo', 'info', 'user']);
        if (b.vibe) tags.push([b.vibe.split(',')[0], 'info', 'sparkle']);
        if (b.mobility) tags.push(['Explore without private transport', 'info', 'walk']);
        tags.push(['Destination: open', 'uncertain', 'pin']);
        const qs = m.qs || [];
        const q = (key, n, label, opts) => `<div class="q-block"><span class="q">${n}. ${label}</span><div class="row gap8 wrap">${opts.map(([v, l]) => C.chip(l, (key === 'origin' ? b.origin : key === 'leave' ? b.leave : key === 'budget' ? String(b.budget) : b.dates) === v, `data-a="answer" data-q="${key}" data-v="${esc(v)}"`)).join('')}</div></div>`;
        const qHTML = qs.map((k, n) => k === 'origin' ? q('origin', n + 1, 'Where will you start from?', [['New Delhi', 'New Delhi (from your recent search)'], ['other', 'Somewhere else']]) : k === 'leave' ? q('leave', n + 1, 'When can you leave on Friday?', [['fri-eve', 'After 5 PM, after work'], ['fri-am', 'Friday morning'], ['sat', 'Saturday morning']]) : k === 'budget' ? q('budget', n + 1, 'Roughly what total budget?', [['10000', '₹10,000'], ['15000', '₹15,000'], ['20000', '₹20,000']]) : q('dates', n + 1, 'Which weekend?', [['20-22', 'This weekend · 20–22 Nov'], ['27-29', 'Next weekend · 27–29 Nov']])).join('');
        return C.aiMsg(`<p>Here’s how I’m reading that — I treat these as one set of constraints, not separate filters:</p><div class="row gap6 wrap">${tags.map((t) => C.tag(...t)).join('')}</div><div class="interp">${ic('sparkle')}<span>So a place only fits if it’s ${b.vibe && /peace/i.test(b.vibe) ? 'calm, ' : ''}${b.mobility ? 'walkable or served by shared/public transport, ' : ''}and reachable within ${b.budget ? fmt(b.budget) : 'your budget'} including the journey.</span></div>${qs.length ? `<p class="b">${qs.length === 1 ? 'One quick question' : (qs.length === 2 ? 'Two' : qs.length === 3 ? 'Three' : 'A few') + ' quick questions'} so I don’t guess:</p>${qHTML}` : ''}`);
      }
      case 'comfort': return C.aiMsg(`<p>Got it. Optional — any comfort preferences for your stay or arrival? Skip and I’ll use sensible defaults.</p><div class="row gap8 wrap">${COMFORT.map((c) => C.chip(c, b.comfort.includes(c), `data-a="comfort" data-v="${esc(c)}"`)).join('')}${C.chip('Skip', false, 'data-a="comfortDone" data-skip="1"')}</div><p>And has anything made past solo trips harder? I’ll plan around it.</p>${last ? `<div class="row gap8 wrap">${C.chip('A long cab ride from the station at night', false, 'data-a="prompt" data-q="Last time my cab from the station took over an hour at night — that was stressful."')}${C.chip('Nothing in particular', false, 'data-a="comfortDone"')}</div>` : ''}`);
      case 'brief': return C.aiMsg(`<p>${m.lead || 'Here’s your trip brief before I search:'}</p><div class="brief">${briefRows().map(([i, k, v, f]) => `<div class="br ${m.upd && m.upd.includes(f) ? 'upd' : ''}">${ic(i)}<span class="k">${k}</span><span class="grow">${v ? esc(v) : '<span class="muted">Not specified — I’ll use a sensible default</span>'}</span></div>`).join('')}</div>${b.budget && b.budget < 12000 ? C.notice('warning', 'Your budget is tight for these dates', `Most matching 2-night trips from Delhi cost ${fmt(12100)}–${fmt(14650)} (simulated). I’ll still look — and show what would make it work.`) : ''}<div class="row gap12 wrap">${C.btn('Looks right — find destinations', 'ai', 'sparkle', 'data-a="findDest" id="cta-find"')}${C.btn('Edit brief', 'secondary', 'pencil', 'data-a="editBrief"')}</div>`, 'focus');
      case 'safety': return C.aiMsg(`<p>${SAFETY_REPLY}</p>`);
      default: return C.aiMsg(`<p>${m.html || esc(m.text)}</p>`);
    }
  }
  function renderDisc() {
    if (!S.disc.msgs.length) S.disc.msgs.push({ who: 'ai', kind: 'greet' });
    const b = S.brief;
    const cons = [
      [b.dates ? `${DATES[b.dates].short.replace('–', ' – ')}${b.leave ? ' · ' + (b.leave === 'fri-eve' ? 'leave after 5 PM' : LEAVE[b.leave].toLowerCase()) : ''}` : 'Dates — not set yet', !!b.dates, 'dates'],
      [b.origin ? `From ${b.origin}` : 'Starting point — not set', !!b.origin, 'origin'],
      [b.budget ? `${fmt(b.budget)} all-in` : 'Budget — not set', !!b.budget, 'budget'],
      [b.solo || b.vibe ? [b.solo ? 'Solo' : null, b.vibe ? b.vibe.split(',')[0].toLowerCase() : null].filter(Boolean).join(' · ') : 'Travel style — not set', !!(b.solo || b.vibe), 'vibe'],
      [b.mobility ? 'No private-transport dependence' : 'Getting around — not set', b.mobility, 'mobility'],
      [b.comfort.length ? b.comfort.join(', ') : 'Stay preferences — optional', b.comfort.length > 0, 'comfort'],
      [b.avoidLate ? 'Avoid long late-night transfers' : 'Past experiences — optional', b.avoidLate, 'avoid'],
      ['Destination — open, I’ll suggest 3', false, 'dest']
    ];
    return `<div class="screen" data-screen="disc">${chrome(0)}<div class="body">
      <section class="card main" style="gap:20px;padding-bottom:20px"><div class="row gap10">${C.aiMark()}<div class="col grow gap4"><span class="t16 bk">Plan a trip by chatting</span><span class="t12 muted">I ask only what I need, then show my reasoning at every step.</span></div>${C.btn('Start over', 'tertiary', 'refresh', 'data-a="restart"')}</div><div class="divider"></div>
        <div class="msgs" id="disc-msgs">${S.disc.msgs.map(discMsgHTML).join('')}</div>
        ${C.input(S.disc.stage === 'brief' ? 'Change anything — e.g. “budget 12000” or “next weekend”' : 'Describe your trip — dates, budget, how you like to travel…', 'disc')}</section>
      <aside class="card side-400 sticky" style="gap:18px"><div class="row between"><span class="t16 bk">Your trip brief</span>${C.tag('Live', 'success', 'refresh')}</div><span class="t12 muted">Updates as we chat. Tap the pencil to change an item — I’ll only re-plan what it affects.</span>
        <div class="clist">${cons.map(([l, ok, f]) => `<div class="ci ${ok ? 'ok' : 'todo'}" data-field="${f}">${ic(ok ? 'checkCircle' : 'circle')}<span class="grow">${esc(l)}</span>${['dates', 'origin', 'budget'].includes(f) ? `<button class="edit" data-a="editField" data-f="${f}" aria-label="Edit">${ic('pencil')}</button>` : ''}</div>`).join('')}</div>
        <div class="divider"></div><span class="t14 bk">What I’ll consider</span>
        <div class="col gap10">${[['train', 'Train & bus schedules from Delhi', 'Simulated', 'uncertain', 'database'], ['bed', 'Property amenities & guest reviews', 'Simulated', 'uncertain', 'database'], ['users', 'Experiences shared by solo women travellers', 'Sample', 'uncertain', 'database'], ['route', 'Distances & last-mile options by time of day', 'Estimate', 'uncertain', 'database'], ['moon', 'Evening shared-transport availability', 'Often incomplete', 'warning', 'alert']].map(([i, l, t, tone, ti]) => `<div class="inputs-row">${ic(i)}<span class="grow">${l}</span>${C.tag(t, tone, ti)}</div>`).join('')}</div>
        ${C.notice('ai', 'How I talk about safety', 'I won’t label places “safe” or “unsafe”. I’ll show what reviews and data say, where it comes from, and what’s uncertain — you decide.')}</aside></div></div>`;
  }
  /* Discovery dialogue manager */
  let busy = false;
  async function aiSay(listSel, pushFn, delay = 700) {
    busy = true; const list = $(listSel); if (list) { list.insertAdjacentHTML('beforeend', C.typing()); scrollChat(list); }
    await sleep(delay); pushFn(); busy = false; save(); render(); scrollChat($(listSel));
  }
  function scrollChat(list) { if (!list) return; const last = list.lastElementChild; if (last) { const r = last.getBoundingClientRect(); if (r.bottom > window.innerHeight - 90 || r.top < 0) window.scrollTo({ top: window.scrollY + r.top - 140, behavior: 'smooth' }); } }
  function missingQs() { const b = S.brief; const q = []; if (!b.origin) q.push('origin'); if ((b.dates || '').length && !b.leave) q.push('leave'); if (!b.budget) q.push('budget'); if (!b.dates) q.push('dates'); return q; }
  function mergeBrief(p) {
    const b = S.brief; const changed = [];
    ['budget', 'dates', 'origin', 'leave', 'vibe'].forEach((k) => { if (p[k] && p[k] !== b[k]) { b[k] = p[k]; changed.push(k === 'leave' ? 'dates' : k); } });
    if (p.solo && !b.solo) { b.solo = true; changed.push('solo'); }
    if (p.mobility && !b.mobility) { b.mobility = true; changed.push('mobility'); }
    if (p.avoidLate && !b.avoidLate) { b.avoidLate = true; changed.push('avoid'); }
    (p.comfortAdd || []).forEach((c) => { if (!b.comfort.includes(c)) { b.comfort.push(c); changed.push('comfort'); } });
    return changed;
  }
  function discUser(text) {
    if (busy) return; text = text.trim(); if (!text) return;
    S.disc.msgs.push({ who: 'user', text }); const d = S.disc; render();
    if (isSafetyQ(text) && !/budget|weekend/.test(text)) return aiSay('#disc-msgs', () => d.msgs.push({ who: 'ai', kind: 'safety' }));
    const p = parseIntent(text); const changed = mergeBrief(p);
    if (d.stage === 'start') {
      if (!changed.length) return aiSay('#disc-msgs', () => d.msgs.push({ who: 'ai', kind: 'vague' }));
      const qs = missingQs(); d.stage = qs.length ? 'clarify' : 'comfort';
      return aiSay('#disc-msgs', () => { d.msgs.push({ who: 'ai', kind: 'understand', qs }); if (!qs.length) d.msgs.push({ who: 'ai', kind: 'comfort' }); }, 900);
    }
    if (d.stage === 'clarify') {
      if (/somewhere else|other city/i.test(text) && !p.origin) return aiSay('#disc-msgs', () => d.msgs.push({ who: 'ai', html: 'Sure — which city will you start from? (In this prototype, schedules are simulated for New Delhi.)' }));
      if (!missingQs().length) { d.stage = 'comfort'; return aiSay('#disc-msgs', () => d.msgs.push({ who: 'ai', kind: 'comfort' })); }
      return aiSay('#disc-msgs', () => d.msgs.push({ who: 'ai', kind: 'understand', qs: missingQs() }));
    }
    if (d.stage === 'comfort') {
      if (!p.avoidLate && !changed.length && text.length > 3) S.brief.notes = [text.length > 80 ? text.slice(0, 77) + '…' : text];
      d.stage = 'brief';
      const lead = S.brief.avoidLate ? 'Thanks — I’ll avoid long late-night transfers. Here’s your trip brief before I search:' : 'Thanks — noted. Here’s your trip brief before I search:';
      return aiSay('#disc-msgs', () => d.msgs.push({ who: 'ai', kind: 'brief', lead }), 900);
    }
    // brief stage — conversational edits
    if (changed.length) return aiSay('#disc-msgs', () => d.msgs.push({ who: 'ai', kind: 'brief', lead: `Updated your ${changed.map((c) => ({ budget: 'budget', dates: 'dates', origin: 'starting point', vibe: 'vibe', solo: 'travel style', mobility: 'getting-around preference', avoid: 'arrival preference', comfort: 'stay preferences' }[c])).join(' and ')}. Here’s the refreshed brief:`, upd: changed }));
    return aiSay('#disc-msgs', () => d.msgs.push({ who: 'ai', html: 'I didn’t spot a change to your brief there. You can say things like <b>“budget 12000”</b>, <b>“next weekend”</b> or <b>“leave Saturday morning”</b> — or tap <b>Looks right</b> to see destinations.' }));
  }
  function answerQ(q, v) {
    const b = S.brief; const d = S.disc;
    if (q === 'origin') { if (v === 'other') { S.disc.msgs.push({ who: 'user', text: 'Somewhere else' }); return aiSay('#disc-msgs', () => d.msgs.push({ who: 'ai', html: 'Sure — which city will you start from? (In this prototype, schedules are simulated for New Delhi.)' })); } b.origin = v; }
    if (q === 'leave') b.leave = v;
    if (q === 'budget') b.budget = +v;
    if (q === 'dates') b.dates = v;
    save(); render();
    if (d.stage === 'clarify' && !missingQs().length) {
      d.stage = 'comfort';
      const parts = []; if (b.origin) parts.push(`From ${b.origin.replace('New Delhi', 'Delhi')}`); if (b.leave) parts.push(b.leave === 'fri-eve' ? 'after work on Friday' : b.leave === 'fri-am' ? 'Friday morning' : 'Saturday morning');
      d.msgs.push({ who: 'user', text: parts.join(', ') + '.' }); render();
      aiSay('#disc-msgs', () => d.msgs.push({ who: 'ai', kind: 'comfort' }));
    }
  }

  /* ------------------------------------------------------------------ *
   * 9. SCREEN 2b — Loading (agent progress)
   * ------------------------------------------------------------------ */
  let loadTimer = null;
  function renderLoading() {
    const b = S.brief;
    const rows = [`Checked trains & buses leaving ${(b.origin || 'New Delhi').replace('New ', '')} ${b.leave === 'sat' ? 'on Saturday morning' : 'after 5 PM Friday'} · 42 options`, 'Kept stays with a private room and 24×7 front desk · 3 destinations remain', 'Reading experiences shared by solo women travellers…', 'Estimating station-to-stay transfers at your arrival time'];
    return `<div class="screen" data-screen="loading">${chrome(1)}<div class="loading-wrap"><div class="card load-card">${C.aiMark(true)}<div class="t22 bk" style="line-height:28px">Finding destinations that fit your brief…</div><div class="t14 ink2">I’m checking each option against all your constraints together, not one at a time.</div>
      <div class="col gap12" id="prog">${rows.map((r, i) => `<div class="prog-row ${i === 0 ? 'active' : 'todo'}" data-i="${i}">${ic(i === 0 ? 'loader' : 'circle')}<span>${r}</span></div>`).join('')}</div>
      <div class="skel-row">${[0, 1, 2].map(() => '<div class="skel"><span style="height:60px"></span><span style="height:10px;width:100px"></span><span style="height:10px;width:70px"></span></div>').join('')}</div>
      <div class="row between">${C.src('Usually takes a few seconds · simulated', 'sim')}${C.btn('Cancel', 'tertiary', 'close', 'data-a="go" data-s="disc"')}</div></div></div></div>`;
  }
  function runLoading() {
    clearTimeout(loadTimer); let i = 0;
    const step = () => {
      const rows = document.querySelectorAll('#prog .prog-row'); if (!rows.length || S.screen !== 'loading') return;
      if (i < rows.length) { rows[i].className = 'prog-row done'; rows[i].querySelector('use').setAttribute('href', '#i-checkCircle'); }
      i++;
      if (i < rows.length) { rows[i].className = 'prog-row active'; rows[i].querySelector('use').setAttribute('href', '#i-loader'); loadTimer = setTimeout(step, 600); }
      else loadTimer = setTimeout(() => go('dest'), 450);
    };
    loadTimer = setTimeout(step, 700);
  }

  /* ------------------------------------------------------------------ *
   * 10. SCREEN 3 — Destination recommendations
   * ------------------------------------------------------------------ */
  function destCosts() { const r = {}; Object.keys(DESTS).forEach((k) => { r[k] = planFor(k); }); return r; }
  function renderDest() {
    const b = S.brief; const budget = b.budget || 15000; const costs = destCosts(); const ds = S.dest;
    let ids = Object.keys(DESTS);
    if (ds.sort === 'best') ids.sort((x, y) => DESTS[y].score - DESTS[x].score);
    if (ds.sort === 'cost') ids.sort((x, y) => costs[x].total - costs[y].total);
    if (ds.sort === 'journey') ids.sort((x, y) => parseInt(DESTS[x].journey) - parseInt(DESTS[y].journey));
    const allOver = ids.every((k) => costs[k].total > budget);
    const cheapest = ids.reduce((a, k) => (costs[k].total < costs[a].total ? k : a), ids[0]);
    const card = (k) => {
      const d = DESTS[k]; const p = costs[k]; const over = p.total - budget; const best = k === 'rishikesh' && ds.sort === 'best';
      const why = [...d.why, over > 0 ? [`Estimated ${fmt(p.total)} — ${fmt(over)} over your budget. I’ve kept it so you can compare, but flagged it.`, 'MMT fares & stays · simulated'] : [`Leaves ${fmt(-over)} headroom${k === 'rishikesh' ? ', so a closer stay or pre-booked pickup still fits' : ''}.`, 'MMT fares & stays · simulated']];
      const open = !!ds.open[k]; const cmpOn = ds.compare.includes(k);
      const stats = [['wallet', 'Est. trip cost', fmt(p.total), over > 0 ? fmt(over) + ' over budget' : fmt(-over) + ' under budget', over > 0 ? 'bad' : (-over < 1000 ? 'warn' : '')], [d.journeyIcon, 'Journey', d.journey, d.journeySub], ['bed', 'Matching stays', String(d.stays), d.staysSub], [d.arrivalIcon, 'Arrival', d.arrival, d.arrivalSub, d.arrivalWarn ? 'warn' : '']];
      const stayList = ds.stays[k] ? `<div class="stays-list"><span class="t12 bk">Stays matching your brief (simulated)</span>${Object.values(k === 'rishikesh' ? RK.stays : k === 'udaipur' ? UD.stays : MG.stays).map((s) => `<div class="sr"><span>${ic('bed', '', 'width:14px;height:14px;color:#6B7280;margin-right:6px')}<b>${esc(s.name)}</b> <span class="muted">· ${esc(s.area)} · ${s.station} min from arrival</span></span><span class="b">${s.soldOut ? '<span class="tag t-uncertain">Sold out</span>' : fmt(s.ppn) + '/night'}</span></div>`).join('')}</div>` : '';
      return `<article class="dest ${best ? 'best' : ''} ${ds.chosen === k ? 'chosen' : ''}" id="dest-${k}"><div class="dest-img" style="background-image:url('${d.img}')">${best ? C.tag(...d.badge) : (k === cheapest && ds.sort !== 'best' ? C.tag('Lowest cost', 'neutral', 'sparkle') : C.tag(d.badge[0], d.badge[1], d.badge[2]))}<div class="cap">${ic('mountain')}<span>Illustrative image</span></div></div>
        <div class="dest-body"><div class="row between start gap12"><div class="dest-title"><h2>${d.name}</h2><span class="t13 muted">${d.sub}</span></div><button class="cmp-toggle ${cmpOn ? 'on' : ''}" data-a="cmp" data-k="${k}"><span class="box">${ic('check')}</span>Compare</button></div>
        <div class="stats">${stats.map(([i, l, v, s, w]) => `<div class="stat ${w || ''}"><span class="lbl">${ic(i)}${l}</span><span class="val">${v}</span><span class="sub">${s}</span></div>`).join('')}</div>
        <div class="col gap12">${d.rows.map(([i, h, t, s]) => `<div class="insight">${ic(i)}<div class="grow"><div class="ih">${h}</div><div class="ib">${t}</div>${s ? `<div style="margin-top:4px">${C.src(s[0], s[1])}</div>` : ''}</div></div>`).join('')}</div>
        ${d.themes ? `<div class="row gap6 wrap">${d.themes.map((t) => C.tag(...t)).join('')}</div>` : ''}
        ${over > 0 ? C.notice('warning', 'Over your budget', `About ${fmt(over)} more than ${fmt(budget)}. ${k === 'rishikesh' ? 'A 1-night version or a hostel private room would fit.' : 'Consider a cheaper stay, or one fewer night.'}`) : (d.note ? C.notice(d.note[0], d.note[1], d.note[2].replace('Little headroom', `Only ${fmt(-over)} headroom`)) : '')}
        <div class="why ${open ? 'open' : ''}"><button class="why-h" data-a="why" data-k="${k}" aria-expanded="${open}">${ic('sparkle')}Why this destination?${ic('chevronDown', 'chev')}</button><div class="why-body">${why.map(([r, s]) => `<div class="why-r"><span class="bul"></span><div><div>${r}</div><div class="s">${s}</div></div></div>`).join('')}<div class="why-to">${ic('alert')}<span>${d.tradeoff}</span></div></div></div>
        ${stayList}
        <div class="row gap12">${C.btn('Select ' + d.short, best ? 'primary' : 'secondary', 'arrowRight', `data-a="selectDest" data-k="${k}" id="sel-${k}"`)}${C.btn(ds.stays[k] ? 'Hide stays' : 'See stays & routes', 'tertiary', ds.stays[k] ? 'chevronUp' : 'chevronRight', `data-a="stays" data-k="${k}"`)}</div></div></article>`;
    };
    const cmpIds = ds.compare.filter((k) => DESTS[k]);
    const rows = [['Est. total', (k) => fmt(costs[k].total)], ['Journey · arrival', (k) => DESTS[k].cmp.journey], ['Arrival → stay', (k) => DESTS[k].cmp.transfer], ['Walkable core', (k) => DESTS[k].cmp.walk], ['Evening transport', (k) => DESTS[k].cmp.evening], ['Solo reviews (sample)', (k) => DESTS[k].cmp.reviews], ['Within budget', (k) => (costs[k].total <= budget ? `Yes · ${fmt(budget - costs[k].total)} left` : `No · ${fmt(costs[k].total - budget)} over`)]];
    const table = cmpIds.length >= 2 ? `<table class="ctable"><thead><tr><th></th>${cmpIds.map((k) => `<th>${DESTS[k].short}</th>`).join('')}</tr></thead><tbody>${rows.map(([l, f]) => `<tr><td>${l}</td>${cmpIds.map((k, i) => { const v = f(k); return `<td class="${i === 0 && k === 'rishikesh' ? 'pri' : ''}">${v === 'No reliable data' ? C.tag(v, 'uncertain', 'help') : esc(v)}</td>`; }).join('')}</tr>`).join('')}</tbody></table>` : `<div class="notice n-info">${ic('info')}<div class="n-body" style="margin:0">Tick <b>Compare</b> on at least two destinations to see them side by side.</div></div>`;
    const msgs = ds.msgs.map((m) => m.who === 'user' ? C.userMsg(m.text) : C.aiMsg(m.html, m.cls || '')).join('');
    const overPanel = allOver ? `<div class="card" style="gap:12px;border:1px solid #F6C77D;background:#FFFBF3" id="overbudget">${C.aiMsg(`<p>I couldn’t fit a 2-night trip within <b>${fmt(budget)}</b> for ${DATES[b.dates || '20-22'].label}${(b.dates === '27-29') ? ' — it’s a long weekend, so trains and stays cost more' : ''}. The closest is <b>${fmt(costs[cheapest].total)}</b> (${fmt(costs[cheapest].total - budget)} over).</p><p class="b">Ways to make it work:</p>
      ${(() => { const t1 = buildPlan(Object.assign(initialChoices('rishikesh'), { outbound: 'sat', stay: 'riverside' })).total; const t2 = buildPlan(Object.assign(initialChoices('rishikesh'), { stay: 'hostel' })).total; const raiseTo = Math.ceil(costs[cheapest].total / 500) * 500; return [['oneNight', 'Rishikesh · 1 night, leave Sat 6:45 AM', `Same calm itinerary, no late arrival · ${fmt(t1)}`, t1], ['hostel', 'Rishikesh · hostel private room (shared bathroom)', `24×7 desk kept · 10 min from station · ${fmt(t2)}`, t2], ['raise', `Raise budget to ${fmt(raiseTo)}`, `Keeps the full ${DESTS[cheapest].short} plan as is (+${fmt(raiseTo - budget)})`, null]].map(([a, t, m, tot]) => { const fits = tot != null && tot <= budget; return `<button class="opt" data-a="overOpt" data-k="${a}"><div class="grow"><div class="ot">${t}</div><div class="om">${m}</div></div>${tot == null ? C.tag('Raises budget', 'warning', 'alert') : C.tag(fits ? 'Fits' : fmt(tot - budget) + ' over', fits ? 'success' : 'warning', fits ? 'check' : 'alert')}</button>`; }).join(''); })()}${C.src('Fares & stays · simulated', 'sim')}`, 'warn')}</div>` : '';
    return `<div class="screen" data-screen="dest">${chrome(1)}<div class="body">
      <aside class="card side-380 panel-ai" style="padding:18px;gap:14px">${panelHead()}<div class="msgs" id="dest-msgs">
        ${C.aiMsg(`<p>I compared 9 places reachable from ${(b.origin || 'New Delhi').replace('New ', '')} ${b.leave === 'sat' ? 'on Saturday morning' : 'after work on Friday'}. ${allOver ? 'None fit fully within your budget — see options on the right.' : `${ids.filter((k) => costs[k].total <= budget).length} fit your whole brief within ${fmt(budget)}.`}</p><div class="col gap6" style="background:#F7F9FC;border-radius:8px;padding:10px"><span class="t12 bk">How I weighed them</span>${[['Arrival-to-stay convenience', S.brief.avoidLate ? 'High' : 'Medium'], ['Walkable / shared transport', S.brief.mobility ? 'High' : 'Medium'], ['Calm, per reviews', 'Medium'], ['Budget headroom', ds.sort === 'cost' ? 'High' : 'Medium']].map(([k, v]) => `<div class="row between t12"><span class="ink2">${k}</span><span class="b" style="color:${v === 'High' ? '#008CFF' : '#6B7280'}">${v}</span></div>`).join('')}</div><div>${C.btn(ds.sort === 'cost' ? 'Prioritise best match' : 'Prioritise budget', 'tertiary', 'chevronRight', `data-a="sort" data-k="${ds.sort === 'cost' ? 'best' : 'cost'}"`)}</div>`)}
        ${C.aiMsg(`<span class="t13 bk" style="color:#5E5E78">Where I’m unsure</span><p>I couldn’t find reliable data on late-evening shared taxis in Bhagsu (McLeod Ganj). I’ve marked it “No reliable data” instead of guessing.</p><div>${C.src('No recent reports in sources checked', 'nodata')}</div>`, 'unsure')}
        ${C.aiMsg(`<p>Not shown: ${EXCLUDED.slice(0, 3).map(([n, r]) => `${n} (${r.charAt(0).toLowerCase() + r.slice(1)})`).join(', ')}.</p>${ds.showExcluded ? `<div class="col gap6">${EXCLUDED.slice(3).map(([n, r]) => `<div class="t12"><b>${n}</b> — <span class="ink2">${r}</span></div>`).join('')}</div>` : ''}<div>${C.btn(ds.showExcluded ? 'Hide' : 'Show excluded places', 'tertiary', ds.showExcluded ? 'chevronUp' : 'chevronRight', 'data-a="excluded"')}</div>`)}
        ${msgs}</div>${C.input('Ask about any destination…', 'dest')}
        <div class="row gap6 wrap">${['Which has the shortest trip from the station?', 'Is Rishikesh safe?', 'What about Dharamkot at night?'].map((q) => C.chip(q, false, `data-a="ask" data-ctx="dest" data-q="${esc(q)}"`)).join('')}</div></aside>
      <div class="main"><div class="row between gap12 wrap"><div class="col gap4"><span class="t22 bk">3 destinations for ${DATES[b.dates || '20-22'].label}</span><span class="t13 muted">From ${b.origin || 'New Delhi'} · ${b.solo ? 'solo · ' : ''}${fmt(budget)} all-in${b.mobility ? ' · no private-transport dependence' : ''}</span></div><div class="row gap8">${[['best', 'Best match'], ['cost', 'Lowest cost'], ['journey', 'Shortest journey']].map(([k, l]) => C.chip(l, ds.sort === k, `data-a="sort" data-k="${k}"`)).join('')}</div></div>
        ${overPanel}${ids.map(card).join('')}
        <section class="card" style="padding:20px 24px;gap:12px" id="compare"><div class="row gap8">${ic('compare', '', 'color:#008CFF')}<span class="t16 bk grow">Compare side by side</span>${C.src('Simulated data · estimates', 'sim')}</div>${table}</section></div></div></div>`;
  }
  function destAnswer(q) {
    const s = q.toLowerCase(); const costs = destCosts(); const budget = S.brief.budget || 15000;
    if (isSafetyQ(s)) return { html: `${SAFETY_REPLY}<br><br>For Rishikesh specifically: 31 of 38 sampled reviewers describe walking comfortably between ghats and cafés by day; 17 mention fewer autos after 9 PM.`, src: 'Solo traveller reviews · simulated sample' };
    if (/(dharamkot|bhagsu)/.test(s)) return { html: 'I have only 3 recent reports about Dharamkot and Bhagsu after dark — too few to describe them with confidence. <b>What I know:</b> daytime walking routes, 2 stays with a 24×7 desk. <b>What I don’t:</b> evening shared-taxi frequency and lighting on the uphill path. I can plan you back on the main square by dusk, or you could ask a host directly.', cls: 'unsure' };
    if (/(station|shortest|transfer|arriv)/.test(s)) return { html: 'Udaipur — old-city stays are ~15 min from the station, and you arrive at 7:40 AM. For Rishikesh I picked a stay 12 min from the station (+₹600 vs Tapovan) to shorten the 11:30 PM transfer.' };
    if (/(cheap|lowest|cost|price|budget)/.test(s)) { const p = parseIntent(q); if (p.budget) { S.brief.budget = p.budget; return { html: `Updated your budget to <b>${fmt(p.budget)}</b> — costs and “within budget” flags are recalculated on the right.` }; } const k = Object.keys(costs).sort((a, b) => costs[a].total - costs[b].total)[0]; return { html: `${DESTS[k].short} is lowest at ${fmt(costs[k].total)} (${fmt(budget - costs[k].total)} left). Note the trade-off: ${DESTS[k].tradeoff.charAt(0).toLowerCase() + DESTS[k].tradeoff.slice(1)}` }; }
    for (const k of Object.keys(DESTS)) if (s.includes(DESTS[k].short.toLowerCase().split(' ')[0])) { const d = DESTS[k]; return { html: `<b>${d.short}</b>: ${fmt(costs[k].total)} est. · ${d.journey} journey · arrive ${d.arrival}. ${d.why[0][0]} Trade-off: ${d.tradeoff}` }; }
    if (/(weekend|27|next)/.test(s)) { const p = parseIntent(q); if (p.dates) { S.brief.dates = p.dates; return { html: `Switched to <b>${DATES[p.dates].label}</b>. ${DATES[p.dates].longWeekend ? 'It’s a long weekend, so stays cost about ₹400 more per night (simulated) — totals are updated.' : 'Totals are updated.'}` }; } }
    return { html: 'I can compare journeys, arrival times, costs, neighbourhoods or what reviewers mention. Try “Which is cheapest?”, “Why Udaipur?” or “Is evening transport easy in McLeod Ganj?”' };
  }

  /* ------------------------------------------------------------------ *
   * 11. SCREEN 4 — AI-generated itinerary
   * ------------------------------------------------------------------ */
  function changedKeysVsOrig() { if (!S.orig) return []; return diffPlans(buildPlan(S.orig), plan()).changedKeys; }
  function errorBanner() { return S.netError ? C.notice('warning', 'Live prices didn’t load', 'Showing prices from 2 hours ago. Seats and rooms may have changed — your plan is saved.', `<div style="margin-top:8px">${C.btn('Retry now', 'secondary', 'refresh', 'data-a="retry"')}</div>`) : ''; }
  function renderPlan() {
    const p = plan(); const ch = S.choices; const d = DESTS[ch.dest]; const changed = changedKeysVsOrig(); const D = DATES[ch.dates];
    const alts = altPlans();
    const intro = planIntroMsgs(p);
    return `<div class="screen" data-screen="plan">${chrome(2)}<div class="body">
      <aside class="card side-380 panel-ai" style="padding:18px;gap:14px">${panelHead()}<div class="msgs" id="plan-msgs">${intro}${S.planMsgs.map((m) => m.who === 'user' ? C.userMsg(m.text) : C.aiMsg(m.html, m.cls || '')).join('')}</div>${C.input('Ask why, or change anything…', 'plan')}
        <div class="row gap6 wrap">${['Why the train and not a bus?', 'I don’t want to travel back late at night', 'Make it cheaper'].map((q) => C.chip(q, false, `data-a="ask" data-ctx="plan" data-q="${esc(q)}"`)).join('')}</div></aside>
      <div class="main">${errorBanner()}
        <section class="card" style="padding:20px 24px"><div class="row between start gap12"><div class="col gap6 grow"><span class="t22 bk">${d.short} · ${p.nights === 1 ? '2 days, 1 night' : '3 days, 2 nights'}</span><div class="row gap6 wrap">${C.tag(D.label, 'info', 'calendar')}${C.tag('Solo', 'info', 'user')}${C.tag(ch.dest === 'mcleodganj' ? 'Bus + walk / shared transport' : 'Train + walk / shared transport', 'info', 'route')}</div></div><div class="row gap10">${C.btn('View alternatives', 'secondary', 'refresh', 'data-a="scrollTo" data-t="alts"')}${C.btn('Review & customise', 'primary', 'arrowRight', 'data-a="go" data-s="review" id="cta-review"')}</div></div>
          ${budgetHTML(p, 'Trip budget (estimated)')}
          <div class="row gap8 wrap">${p.flags.length ? C.tag(`${p.flags.length} item${p.flags.length > 1 ? 's' : ''} need${p.flags.length > 1 ? '' : 's'} attention`, 'warning', 'alert') : C.tag('No logistical issues found', 'success', 'checkCircle')}${!p.days.some((x) => x.items.some((y) => /private cab/.test(y.meta || ''))) ? C.tag('All stops reachable without a private car', 'success', 'checkCircle') : C.tag('One stop needs a private cab', 'warning', 'auto')}${C.tag('Prices simulated', 'uncertain', 'database')}</div></section>
        <div class="daytabs" role="tablist">${p.days.map((x, i) => `<button class="daytab ${i === 0 ? 'active' : ''}" data-a="dayTab" data-t="day-${x.key}">${x.label}</button>`).join('')}</div>
        ${p.days.map((x) => `<section class="card day" id="day-${x.key}"><div class="day-h"><div class="col grow gap4"><h3>${x.label}</h3><span class="t12 muted">${x.theme}</span></div>${C.tag(`Travel ${mins(x.travel)} · ${fmt(x.cost)}`, 'neutral', 'route')}</div><div class="day-list">${x.items.map((y) => itemHTML(y, { changed: changed.includes(y.key) })).join('')}</div></section>`).join('')}
        <section class="card" style="padding:20px 24px;gap:12px" id="alts"><div class="row gap8">${ic('refresh', '', 'color:#008CFF')}<span class="t16 bk">Alternative plans I considered</span></div>
          ${alts.length ? alts.map((a) => `<div class="opt" style="align-items:center"><div class="grow"><div class="ot" style="font-size:14px">${a.title}</div><div class="om" style="font-size:13px">${a.body}</div><div class="row gap6" style="margin-top:6px;font-size:12px;font-weight:700;color:#7A4A00">${ic('alert', '', 'width:13px;height:13px;color:#A35D00')}Trade-off: ${a.trade}</div></div>${C.btn('Preview', 'secondary', null, `data-a="previewAlt" data-slot="${a.slot}" data-v="${a.v}"`)}</div>`).join('') : '<span class="t13 muted">No meaningfully different alternatives for this destination.</span>'}</section>
      </div></div></div>`;
  }
  function altPlans() {
    const ch = S.choices; const p = plan(); const out = [];
    if (ch.dest === 'rishikesh') {
      if (ch.outbound !== 'sat') { const q = buildPlan(Object.assign({}, ch, { outbound: 'sat' })); out.push({ title: 'Leave Saturday 6:45 AM instead', body: `No late arrival; one night less. ${fmt(q.total)} total (${signed(q.total - p.total)}).`, trade: 'Lose Friday night and Saturday morning.', slot: 'outbound', v: 'sat' }); }
      if (ch.stay !== 'gangaview') { const q = buildPlan(Object.assign({}, ch, { stay: 'gangaview' })); out.push({ title: 'Stay in Tapovan (Ganga View)', body: `${fmt(q.total)} total (${signed(q.total - p.total)}); Tapovan cafés on your doorstep.`, trade: ch.outbound === 'train' ? '35 min night transfer, the thing you wanted to avoid.' : 'Further from the station and the ghats.', slot: 'stay', v: 'gangaview' }); }
      else { const q = buildPlan(Object.assign({}, ch, { stay: 'riverside' })); out.push({ title: 'Stay near Ram Jhula (Riverside Courtyard)', body: `${fmt(q.total)} total (${signed(q.total - p.total)}); 12 min from the station.`, trade: 'Further from Tapovan cafés in the evening.', slot: 'stay', v: 'riverside' }); }
    } else {
      const opts = SLOT_OPTS[ch.dest].stay.filter((s) => s !== ch.stay).slice(0, 2);
      opts.forEach((s) => { const q = buildPlan(Object.assign({}, ch, { stay: s })); out.push({ title: `Stay at ${optName(ch.dest, 'stay', s)}`, body: `${fmt(q.total)} total (${signed(q.total - p.total)}).`, trade: (ch.dest === 'udaipur' ? UD : MG).stays[s].farOldCity ? 'Auto needed to reach the old city.' : (ch.dest === 'mcleodganj' && s === 'bhagsu' ? 'Uphill; evening transport data is uncertain.' : 'Small change in walking distances.'), slot: 'stay', v: s }); });
    }
    return out;
  }
  function planIntroMsgs(p) {
    const ch = S.choices; const st = p.stay; const html = [];
    html.push(C.aiMsg(`<p>Here’s your ${DESTS[ch.dest].short} plan. I chose transport, stay and activities together — so the stay depends on your arrival time, and each activity on how you’ll get back.</p>`));
    if (ch.dest === 'rishikesh' && ch.outbound === 'train') {
      const gv = RK.stays.gangaview, rv = RK.stays.riverside;
      if (ch.stay === 'riverside') html.push(C.aiMsg(`<div class="row gap6">${ic('moon', '', 'width:15px;height:15px;color:#C27100')}<span class="t13 bk" style="color:#7A4A00">I changed one thing from the obvious pick</span></div><p>Your train arrives at ${p.arr}. Your shortlisted stay in Tapovan is about ${gv.station} minutes from the station. I’ve picked another property ${rv.station} minutes from the arrival point. It costs ₹600 more but shortens your late-night onward journey${S.brief.avoidLate ? ' — you said a long station transfer was stressful last time' : ''}.</p><div class="mini-table"><div class="r"><span></span><span>From station</span><span>${p.nights} nights</span></div><div class="r pick"><span>Riverside Courtyard (picked)</span><span>${rv.station} min</span><span>${fmt((rv.ppn + DATES[ch.dates].surcharge) * p.nights)}</span></div><div class="r"><span>Ganga View, Tapovan</span><span>${gv.station} min</span><span>${fmt((gv.ppn + DATES[ch.dates].surcharge) * p.nights)}</span></div></div><div class="row gap8">${C.btn('Keep this', 'secondary', null, 'data-a="toast" data-msg="Kept Riverside Courtyard"')}${C.btn('Use Tapovan stay', 'tertiary', 'chevronRight', 'data-a="previewAlt" data-slot="stay" data-v="gangaview"')}</div>`, 'warn'));
      else if (st.station > 15) html.push(C.aiMsg(`<div class="row gap6">${ic('moon', '', 'width:15px;height:15px;color:#C27100')}<span class="t13 bk" style="color:#7A4A00">Heads-up on your arrival</span></div><p>Your train arrives at ${p.arr} and ${st.short} is ${st.station} minutes from the station. I’ve pre-planned a pickup, but a stay nearer the station would shorten the late-night journey.</p><div class="row gap8">${C.btn('Show closer stays', 'tertiary', 'chevronRight', 'data-a="previewAlt" data-slot="stay" data-v="riverside"')}</div>`, 'warn'));
    }
    if (p.flags.length) html.push(C.aiMsg(`<p>I checked the way back from every activity. ${p.flags.length === 1 ? 'One needs' : p.flags.length + ' need'} attention and ${p.flags.length === 1 ? 'is' : 'are'} flagged in amber: ${p.flags.map((f) => f.title.split(' · ')[0].toLowerCase()).join('; ')}.${ch.dest === 'rishikesh' && ch.sunMorn === 'waterfall' ? ' The waterfall’s jeeps back are infrequent after 1 PM — so I put it in the morning.' : ''}</p><div>${C.src('Local transport · simulated estimates', 'sim')}</div>`));
    else html.push(C.aiMsg('<p>I checked the way back from every activity — nothing needs a late or private-car return.</p>', 'ok'));
    return html.join('');
  }

  /* ------------------------------------------------------------------ *
   * 12. Modification engine (shared by Screens 4 & 5)
   * ------------------------------------------------------------------ */
  function setPending(changes, reason) {
    const next = Object.assign({}, S.choices, changes);
    if (JSON.stringify(next) === JSON.stringify(S.choices)) { toast('That’s already in your plan'); return false; }
    S.pending = { changes, reason: reason || null }; save(); return true;
  }
  function pendingExplain() {
    if (!S.pending) return '';
    const a = plan(); const b = buildPlan(Object.assign({}, S.choices, S.pending.changes)); const df = diffPlans(a, b);
    const budget = S.brief.budget || 15000; const slot = Object.keys(S.pending.changes)[0]; const v = S.pending.changes[slot];
    let lead = '';
    if (slot === 'satEve' && v === 'aarti') lead = `I can replace the Saturday evening café session (ends 9:30 PM, ~${RK.stays[S.choices.stay].tapovan.m} min ride back) with the Ganga Aarti at Parmarth Niketan — a ${RK.stays[S.choices.stay].aarti.m}-minute ${RK.stays[S.choices.stay].aarti.mode === 'walk' ? 'walk' : 'ride'} from your stay, ending around 7:00 PM.`;
    else if (slot === 'stay') lead = `Switching to <b>${optName(S.choices.dest, 'stay', v)}</b> ${df.delta < 0 ? 'saves ' + fmt(-df.delta) : df.delta > 0 ? 'costs ' + fmt(df.delta) + ' more' : 'costs the same'}, but it affects ${Math.max(df.lines.length - 1, 0) || 'no'} other part${df.lines.length - 1 === 1 ? '' : 's'} of your trip.`;
    else if (slot === 'dates') lead = `I re-checked your whole plan for <b>${DATES[v].label}</b>. ${df.lines.length} thing${df.lines.length === 1 ? '' : 's'} change; everything else stays.`;
    else if (slot === 'outbound') lead = `Changing to the <b>${RK.out[v].name}</b> ${RK.out[v].late ? (RK.out[v].veryEarly ? 'arrives at 4:10 AM at the bus stand — I’d add a pickup.' : 'keeps the late arrival.') : 'removes the late-night arrival entirely.'}`;
    else lead = `Swapping your ${SLOT_NAME[slot]} to <b>${optName(S.choices.dest, slot, v)}</b>.`;
    const after = b.total > budget ? ` That would put you <b>${fmt(b.total - budget)} over</b> your ${fmt(budget)} budget.` : ` This ${df.delta <= 0 ? 'saves ' + fmt(-df.delta) : 'adds ' + fmt(df.delta)} and keeps your total ${b.total <= budget - 1000 ? 'well ' : ''}within ${fmt(budget)}.`;
    return { lead: lead + after + (df.unchanged.length ? ` ${df.unchanged.join(', ')} ${df.unchanged.length === 1 ? 'is' : 'are'} unchanged.` : ''), df, a, b };
  }
  function applyPending(silent) {
    if (!S.pending) return;
    const before = plan(); S.history.push(clone(S.choices));
    S.choices = Object.assign({}, S.choices, S.pending.changes); const after = plan();
    const df = diffPlans(before, after); S.lastChange = { delta: df.delta, slot: Object.keys(S.pending.changes)[0] };
    S.pending = null;
    if (!silent) S.reviewMsgs.push({ who: 'ai', cls: 'ok', html: `Done — ${df.lines.length ? df.lines.slice(0, 2).map((l) => l.text.replace(/^Day \d · /, '')).join('; ') : 'your plan is updated'}. Your total is now <b>${fmt(after.total)}</b> (${after.total <= (S.brief.budget || 15000) ? fmt((S.brief.budget || 15000) - after.total) + ' left' : fmt(after.total - (S.brief.budget || 15000)) + ' over budget'}). ${df.unchanged.length ? df.unchanged.join(', ') + ' unchanged.' : ''}` });
    save(); render(); flash('#budget');
    toast(`Plan updated · ${df.delta === 0 ? 'no cost change' : signed(df.delta)}`, 'Undo', 'undo');
  }
  function undo() {
    if (!S.history.length) return toast('Nothing to undo');
    S.choices = S.history.pop(); S.pending = null; S.reviewMsgs.push({ who: 'ai', html: 'Undone — your previous plan is back.' }); save(); render(); flash('#budget');
  }

  /* Conversational modifications */
  function modIntent(q) {
    const s = q.toLowerCase(); const ch = S.choices; const dest = ch.dest;
    if (/\bundo\b/.test(s)) return { undo: true };
    if (isSafetyQ(s)) return { reply: SAFETY_REPLY };
    if (/(late|night|dark|travel back|come back late|return late)/.test(s) && !/arriv/.test(s)) {
      if (dest === 'rishikesh') { if (ch.satEve === 'music') return { changes: { satEve: 'aarti' } }; return { reply: `Your Saturday already ends at the aarti, back at your stay by about ${tFmt(plan().days.flatMap((d) => d.items).find((x) => x.key === 'eve').backAt)}. The only late moment left is the ${plan().arr} arrival, which has a pre-booked pickup.` }; }
      if (dest === 'udaipur') return ch.satEve === 'dance' && UD.stays[ch.stay].farOldCity ? { changes: { satEve: 'rooftop' } } : { reply: 'Your evenings in Udaipur already end within a short walk of your stay.' };
      return ch.satEve === 'bhagsu' ? { changes: { satEve: 'cafe' } } : { reply: 'Your evenings already stay around the main square.' };
    }
    if (/(arriv|midnight|11:30|reach late)/.test(s) && dest === 'rishikesh') return ch.outbound === 'train' ? { changes: { outbound: 'sat' } } : { reply: 'You already arrive in daylight.' };
    if (/(saturday morning|morning train|sat morning|leave saturday)/.test(s) && dest === 'rishikesh') return { changes: { outbound: 'sat' } };
    if (/\bbus\b|volvo/.test(s) && dest === 'rishikesh') return /why/.test(s) ? { reply: 'The 9:30 PM Volvo is ₹350 cheaper but reaches Rishikesh at 4:10 AM at the bus stand — a harder arrival. The train is the only direct option after 5 PM that arrives before midnight.' } : { changes: { outbound: 'volvo' } };
    if (/why.*(train|not a bus)/.test(s)) return { reply: 'The 9:30 PM Volvo is ₹350 cheaper but reaches Rishikesh at 4:10 AM at the bus stand — a harder arrival. The train is the only direct option after 5 PM that arrives before midnight.' };
    if (/why.*(stay|hotel|riverside|property)/.test(s)) { const st = plan().stay; return { reply: `${st.name}: ${st.station} min from the arrival point, private room and 24×7 desk. ${dest === 'rishikesh' && st.id === 'riverside' ? 'It costs ₹600 more than the Tapovan option for 2 nights, but cuts the late-night transfer from 35 to 12 minutes.' : ''}` }; }
    if (/(tapovan|ganga view|cheaper stay|cheaper hotel)/.test(s) && dest === 'rishikesh') return { changes: { stay: 'gangaview' } };
    if (/(cheap|save money|reduce cost|lower cost|less expensive|budget friendly)/.test(s)) {
      const opts = SLOT_OPTS[dest].stay.filter((x) => { const T = dest === 'rishikesh' ? RK : dest === 'udaipur' ? UD : MG; return !T.stays[x].soldOut && !(S.soldOut || {})[x]; });
      const cur = plan().total; let best = null; opts.forEach((x) => { const t = buildPlan(Object.assign({}, ch, { stay: x })).total; if (t < cur && (!best || t < best.t)) best = { x, t }; });
      return best ? { changes: { stay: best.x } } : { reply: 'This is already the lowest-cost version that keeps your preferences.' };
    }
    if (/(date|27|29|next weekend|20|22|this weekend)/.test(s)) { const p = parseIntent(q); const v = p.dates || (ch.dates === '20-22' ? '27-29' : '20-22'); return { changes: { dates: v } }; }
    if (/(kunjapuri|temple sunrise|sunrise temple)/.test(s) && dest === 'rishikesh') return { changes: { sunMorn: 'kunjapuri' } };
    if (/(waterfall|jeep|sunday)/.test(s) && dest === 'rishikesh') return { changes: { sunMorn: ch.sunMorn === 'waterfall' ? 'riverwalk' : 'waterfall' } };
    if (/(sunrise|ghat)/.test(s) && dest === 'rishikesh') return { changes: { sunMorn: 'ghat' } };
    if (/(aarti)/.test(s) && dest === 'rishikesh') return { changes: { satEve: 'aarti' } };
    if (/(music|café evening|cafe evening)/.test(s) && dest === 'rishikesh') return { changes: { satEve: 'music' } };
    const bp = parseIntent(q); if (bp.budget) { S.brief.budget = bp.budget; const t = plan().total; return { reply: `Budget set to ${fmt(bp.budget)}. Your plan is ${t <= bp.budget ? fmt(bp.budget - t) + ' under' : fmt(t - bp.budget) + ' over'} it${t > bp.budget ? ' — say “make it cheaper” and I’ll find savings' : ''}.` }; }
    if (/(how much|left|total|cost)/.test(s)) { const t = plan(); return { reply: `Current estimate: ${fmt(t.total)} — ${Object.keys(CATN).map((k) => `${CATN[k]} ${fmt(t.budget[k])}`).join(', ')}.` }; }
    return { reply: 'I can swap your stay, replace an activity, change the train, or move dates. Try “I don’t want to travel back late”, “make it cheaper”, “move to 27–29 Nov” or “add Kunjapuri sunrise”.' };
  }
  function handleMod(ctx, q) {
    const list = ctx === 'plan' ? S.planMsgs : S.reviewMsgs; list.push({ who: 'user', text: q }); render();
    const r = modIntent(q);
    if (r.undo) { undo(); return; }
    if (r.reply) return aiSay(`#${ctx}-msgs`, () => list.push({ who: 'ai', html: r.reply }));
    if (setPending(r.changes, q)) {
      if (ctx === 'plan') { S.reviewMsgs.push({ who: 'user', text: q }); list.push({ who: 'ai', html: 'I’ve prepared that change — opening Review so you can see its impact before applying.' }); save(); setTimeout(() => go('review'), 500); render(); return; }
      aiSay('#review-msgs', () => { /* rendered from pending */ }, 650);
    }
  }

  /* ------------------------------------------------------------------ *
   * 13. SCREEN 5 — Review & modify
   * ------------------------------------------------------------------ */
  function renderReview() {
    const p = plan(); const ch = S.choices; const pend = S.pending ? pendingExplain() : null; const view = pend ? pend.b : p;
    const changed = changedKeysVsOrig(); const budget = S.brief.budget || 15000; const T = ch.dest === 'rishikesh' ? RK : ch.dest === 'udaipur' ? UD : MG;
    const affectedDays = pend ? view.days.filter((d) => d.items.some((x) => pend.df.changedKeys.includes(x.key))).map((d) => d.key) : null;
    const soldStay = (S.soldOut || {})[ch.stay];
    const msgs = S.reviewMsgs.map((m) => m.who === 'user' ? C.userMsg(m.text) : C.aiMsg(m.html, m.cls || '')).join('');
    const pendMsg = pend ? C.aiMsg(`<p>${pend.lead}</p><div class="row gap6 wrap">${C.tag(signed(pend.df.delta), pend.df.delta <= 0 ? 'success' : 'warning', 'wallet')}${pend.df.travelDelta ? C.tag(`${pend.df.travelDelta < 0 ? '−' : '+'}${mins(pend.df.travelDelta)} travel`, pend.df.travelDelta < 0 ? 'success' : 'warning', 'route') : ''}${pend.df.backB && pend.df.backB !== pend.df.backA ? C.tag(`Back by ~${tFmt(pend.df.backB)}`, pend.df.backB < pend.df.backA ? 'success' : 'warning', 'moon') : ''}${pend.df.flagsDelta ? C.tag(`${pend.df.flagsDelta > 0 ? '+' : '−'}${Math.abs(pend.df.flagsDelta)} flag${Math.abs(pend.df.flagsDelta) > 1 ? 's' : ''}`, pend.df.flagsDelta < 0 ? 'success' : 'warning', 'alert') : ''}</div><div class="row gap8">${C.btn('Apply change', 'primary', 'check', 'data-a="apply" id="cta-apply"')}${C.btn('Other options', 'tertiary', 'chevronRight', `data-a="slotModal" data-slot="${Object.keys(S.pending.changes)[0]}"`)}</div>`, pend.b.total > budget || pend.df.flagsDelta > 0 ? 'warn' : 'focus') : '';
    const soldMsg = soldStay ? C.aiMsg(`<p>Your stay <b>${T.stays[ch.stay].name}</b> just sold out for ${DATES[ch.dates].days[0]}. These keep the same essentials — private room, 24×7 desk, close to the station:</p>${['lakshman', 'stationroad'].filter((x) => x !== ch.stay).map((x) => { const q = buildPlan(Object.assign({}, ch, { stay: x })); return `<button class="opt" data-a="pendStay" data-v="${x}"><div class="grow"><div class="ot">${RK.stays[x].name}</div><div class="om">${RK.stays[x].station} min from station · ${RK.stays[x].rating}</div></div>${C.tag(signed(q.total - p.total), q.total <= p.total ? 'success' : 'warning', 'wallet')}</button>`; }).join('')}<span class="t12 it-ital violet">Nothing else in your plan changes.</span>`, 'warn') : '';
    const stayList = ch.dest === 'rishikesh' ? ['riverside', 'gangaview', 'lakshman', 'sunrise'].concat(['stationroad', 'hostel'].filter((x) => x === ch.stay || (S.pending && S.pending.changes.stay === x) || S.soldOut[ch.stay])) : SLOT_OPTS[ch.dest].stay;
    const stayOpts = stayList.map((id) => {
      const s = T.stays[id]; const cur = id === ch.stay; const na = s.soldOut || (S.soldOut || {})[id]; const isPend = S.pending && S.pending.changes.stay === id;
      let imp = ''; let price = fmt((s.ppn + DATES[ch.dates].surcharge) * p.nights);
      if (!cur && !na) { const q = buildPlan(Object.assign({}, ch, { stay: id })); const df = diffPlans(p, q); imp = `<div class="row gap6 wrap" style="margin-top:6px">${C.tag(signed(df.delta), df.delta <= 0 ? 'success' : 'warning', 'wallet')}${df.lines.filter((l) => l.tone === 'warning').slice(0, 2).map((l) => C.tag(l.text.replace(/^Day \d · /, '').replace(/Night transfer/, 'Night transfer'), 'warning', 'moon')).join('')}${df.flagsDelta < 0 && !df.lines.some((l) => l.tone === 'warning') ? C.tag('Fewer flags', 'success', 'check') : ''}</div>`; }
      return `<div class="opt ${cur ? 'cur' : ''} ${na ? 'na' : ''} ${isPend ? 'pending' : ''}"><div class="grow"><div class="row gap6 wrap"><span class="ot">${s.name}</span>${cur ? C.tag(soldStay ? 'Sold out' : 'Current', soldStay ? 'uncertain' : 'info', soldStay ? 'close' : 'check') : ''}${na ? C.tag('Sold out ' + DATES[ch.dates].days[0].split(' ')[0], 'uncertain', 'close') : ''}${isPend ? C.tag('Previewing', 'info', 'sparkle') : ''}</div><div class="om">${s.station} min from ${ch.dest === 'mcleodganj' ? 'bus stand' : 'station'} · ${s.area}${s.aarti ? ` · aarti ${s.aarti.m} min ${s.aarti.mode}` : ''}</div>${imp}</div><div class="col end gap6"><span class="op">${price}</span>${!cur && !na ? C.btn(isPend ? 'Previewing' : 'Preview impact', 'tertiary', 'chevronRight', `data-a="pendStay" data-v="${id}"`) : ''}${na ? C.btn('See similar', 'tertiary', 'chevronRight', 'data-a="similar"') : ''}</div></div>`;
    }).join('');
    const outOpts = ch.dest === 'rishikesh' ? SLOT_OPTS.rishikesh.outbound.map((id) => {
      const o = RK.out[id]; const cur = id === ch.outbound; const isPend = S.pending && S.pending.changes.outbound === id; let imp = '';
      if (!cur) { const q = buildPlan(Object.assign({}, ch, { outbound: id })); const df = diffPlans(p, q); imp = `<div class="row gap6 wrap" style="margin-top:6px">${C.tag(signed(df.delta), df.delta <= 0 ? 'success' : 'warning', 'wallet')}${id === 'sat' ? C.tag('Lose Sat morning', 'warning', 'clock') : ''}${id === 'volvo' ? C.tag('4:10 AM arrival', 'warning', 'moon') : ''}</div>`; }
      return `<div class="opt ${cur ? 'cur' : ''} ${isPend ? 'pending' : ''}"><div class="grow"><div class="row gap6 wrap"><span class="ot">${o.name}</span>${cur ? C.tag('Current', 'info', 'check') : ''}</div><div class="om">Arrives ${o.arr[ch.dates]}${o.arrDay ? ' Sat' : ''} · ${o.desc}</div>${imp}</div><div class="col end gap6"><span class="op">${fmt(o.price)}</span>${!cur ? C.btn('Preview impact', 'tertiary', 'chevronRight', `data-a="pend" data-slot="outbound" data-v="${id}"`) : ''}</div></div>`;
    }).join('') : `<span class="t13 muted">Only one direct overnight option is available for these dates (simulated).</span>`;
    const days = view.days.map((d) => {
      const coll = S.collapsed[d.key] != null ? S.collapsed[d.key] : (affectedDays ? !affectedDays.includes(d.key) : false);
      return `<section class="card day ${coll ? 'collapsed' : ''}" id="rday-${d.key}"><div class="day-h"><div class="col grow gap4"><h3>${d.label}</h3><span class="t12 muted">${coll ? (affectedDays && !affectedDays.includes(d.key) ? 'Unchanged by this edit · ' : '') + `${d.items.filter((x) => x.type === 'item').length} stops · ${fmt(d.cost)}` : d.theme}</span></div>${C.tag(`Travel ${mins(d.travel)} · ${fmt(d.cost)}`, 'neutral', 'route')}<button class="day-toggle" data-a="collapse" data-k="${d.key}" aria-label="Toggle day">${ic(coll ? 'chevronDown' : 'chevronUp')}</button></div><div class="day-list">${d.items.map((x) => itemHTML(x, { preview: pend && pend.df.changedKeys.includes(x.key), changed: !pend && changed.includes(x.key) })).join('')}${pend && pend.df.removed.filter((r) => d.label.startsWith(r.dayLabel)).map((r) => `<div class="removed">${ic('close')}<span class="grow strike">${esc(r.title)} · ${esc(r.time)} · ${esc(r.cost)}</span><span class="b">Will be removed</span></div>`).join('') || ''}</div></section>`;
    }).join('');
    const impact = pend ? `<section class="card" style="padding:18px 24px;gap:12px;border:1.5px solid ${pend.b.total > budget ? '#F6C77D' : '#B9DCFB'}" id="impact"><div class="row gap8">${ic('sparkle', '', 'color:#6A4BD8')}<span class="t16 bk grow">If I apply this change</span>${C.tag('Preview — not applied yet', 'info', 'info')}</div>
      <div class="metrics"><div class="metric ${pend.df.delta > 0 ? 'bad' : ''}"><span class="ml">Total cost</span><span class="mv"><span class="from">${fmt(pend.a.total)}</span>${ic('arrowRight')}<span class="to">${fmt(pend.b.total)}</span></span></div><div class="metric ${pend.df.travelDelta > 0 ? 'bad' : pend.df.travelDelta === 0 ? 'neutral' : ''}"><span class="ml">Travel time</span><span class="mv"><span class="from">${mins(pend.a.travel)}</span>${ic('arrowRight')}<span class="to">${mins(pend.b.travel)}</span></span></div><div class="metric ${pend.df.flagsDelta > 0 ? 'bad' : pend.df.flagsDelta === 0 ? 'neutral' : ''}"><span class="ml">${pend.df.backB && pend.df.backA !== pend.df.backB ? 'Back at stay (Sat)' : 'Items needing attention'}</span><span class="mv"><span class="from">${pend.df.backB && pend.df.backA !== pend.df.backB ? '~' + tFmt(pend.df.backA) : pend.a.flags.length}</span>${ic('arrowRight')}<span class="to">${pend.df.backB && pend.df.backA !== pend.df.backB ? '~' + tFmt(pend.df.backB) : pend.b.flags.length}</span></span></div></div>
      ${pend.b.total > budget ? C.notice('warning', 'This goes over your budget', `${fmt(pend.b.total - budget)} above ${fmt(budget)}. You can still apply it, or ask me to “make it cheaper”.`) : ''}
      <div class="col gap6">${pend.df.lines.map((l) => `<div class="diff">${ic(l.icon, '', `color:${l.tone === 'warning' ? '#C27100' : l.tone === 'success' ? '#12A06A' : l.tone === 'neutral' ? '#8A8F98' : '#008CFF'}`)}<span>${esc(l.text)}</span></div>`).join('')}</div>
      ${pend.df.unchanged.length ? `<div class="row gap6 wrap"><span class="t12 b muted">Stays the same:</span>${pend.df.unchanged.map((u) => C.tag(u, 'neutral', 'check')).join('')}</div>` : ''}
      <div class="row gap10">${C.btn('Apply change', 'primary', 'check', 'data-a="apply"')}${C.btn('Cancel', 'secondary', null, 'data-a="cancelPend"')}</div></section>` : '';
    return `<div class="screen" data-screen="review">${chrome(3)}<div class="body">
      <aside class="card side-380 panel-ai" style="padding:18px;gap:14px">${panelHead()}<div class="msgs" id="review-msgs">${C.aiMsg('<p>Swap a stay, replace an activity, change a train — or just tell me what you’d like different. I’ll only change what’s affected and show the impact first.</p>')}${soldMsg}${msgs}${pendMsg}</div>${C.input('Tell me what to change…', 'review')}
        <div class="row gap6 wrap">${(ch.dest === 'rishikesh' ? ['I don’t want to travel back late at night', 'Move to 27–29 Nov', 'Add Kunjapuri sunrise', 'Make it cheaper'] : ['I don’t want to travel back late at night', 'Make it cheaper', 'Move to 27–29 Nov']).map((q) => C.chip(q, false, `data-a="ask" data-ctx="review" data-q="${esc(q)}"`)).join('')}</div></aside>
      <div class="main">${errorBanner()}
        <section class="card" style="padding:20px 24px;gap:14px"><div class="row between start gap12 wrap"><div class="col gap4"><span class="t22 bk">Review your ${DESTS[ch.dest].short} plan</span><span class="t13 muted">Edit any part — the rest stays as it is. ${DATES[ch.dates].label} · Solo</span></div><div class="row gap8">${S.history.length ? C.btn('Undo', 'secondary', 'undo', 'data-a="undo"') : ''}${C.btn(S.lastChange ? 'Looks good — check readiness' : 'Continue to readiness', 'primary', 'arrowRight', 'data-a="go" data-s="ready" id="cta-ready"')}</div></div>
          ${budgetHTML(p, S.lastChange ? 'Trip budget · updated' : 'Trip budget (estimated)', S.lastChange && S.lastChange.delta ? C.tag(`${S.lastChange.delta < 0 ? '−' + fmt(-S.lastChange.delta) + ' saved' : '+' + fmt(S.lastChange.delta)}`, S.lastChange.delta < 0 ? 'success' : 'warning', 'check') : '')}
          <div class="row gap8 wrap"><span class="t12 b muted">Dates:</span>${Object.keys(DATES).map((k) => C.chip(DATES[k].short + (DATES[k].longWeekend ? ' (long weekend)' : ''), ch.dates === k, `data-a="pend" data-slot="dates" data-v="${k}"`)).join('')}</div></section>
        ${impact}${days}
        <div class="swap-row"><section class="card" style="padding:18px;gap:10px" id="swap-stay"><div class="row gap8">${ic('bed', '', 'color:#008CFF')}<span class="t15 bk">Swap stay</span></div><span class="t12 muted">Impact shown on the rest of your trip before you switch.</span>${stayOpts}${ch.dest === 'rishikesh' ? C.btn('See all 6 matching stays', 'tertiary', 'chevronRight', 'data-a="slotModal" data-slot="stay"') : ''}</section>
        <section class="card" style="padding:18px;gap:10px"><div class="row gap8">${ic('train', '', 'color:#008CFF')}<span class="t15 bk">Change outbound</span></div><span class="t12 muted">Arrival time drives your stay and pickup — I’ll re-check both.</span>${outOpts}</section></div>
      </div></div></div>`;
  }
  function slotModal(slot) {
    const ch = S.choices; const dest = ch.dest; const opts = (SLOT_OPTS[dest][slot] || []); if (!opts.length) return toast('Only one option for this item in the prototype');
    const p = plan(); const T = dest === 'rishikesh' ? RK : dest === 'udaipur' ? UD : MG;
    const rows = opts.map((id) => {
      const cur = ch[slot] === id; const na = slot === 'stay' && (T.stays[id].soldOut || (S.soldOut || {})[id]);
      const q = na ? null : buildPlan(Object.assign({}, ch, { [slot]: id })); const df = q ? diffPlans(p, q) : null;
      const item = q ? q.days.flatMap((d) => d.items).find((x) => x.slot === slot && x.type === 'item') : null;
      return `<div class="opt ${cur ? 'cur' : ''} ${na ? 'na' : ''}"><div class="grow"><div class="row gap6 wrap"><span class="ot">${optName(dest, slot, id)}</span>${cur ? C.tag('Current', 'info', 'check') : ''}${na ? C.tag('Sold out', 'uncertain', 'close') : ''}${item && item.flagged ? C.tag(item.badge || 'Needs attention', 'warning', 'alert') : ''}</div>${item ? `<div class="om">${esc(item.meta)}</div>` : ''}${df && !cur ? `<div class="row gap6 wrap" style="margin-top:6px">${C.tag(signed(df.delta), df.delta <= 0 ? 'success' : 'warning', 'wallet')}${df.travelDelta ? C.tag(`${df.travelDelta < 0 ? '−' : '+'}${mins(df.travelDelta)} travel`, df.travelDelta < 0 ? 'success' : 'warning', 'route') : ''}</div>` : ''}</div>${!cur && !na ? C.btn('Preview', 'secondary', null, `data-a="pend" data-slot="${slot}" data-v="${id}" data-close="1"`) : ''}</div>`;
    }).join('');
    modal(`<div class="modal-h">${ic('swap', '', 'color:#008CFF')}<h3>Replace ${SLOT_NAME[slot]}</h3><button class="icon-btn" data-a="closeModal" aria-label="Close">${ic('close')}</button></div><span class="t13 muted">Each option is checked against your arrival, stay and return before I suggest it. Costs are simulated.</span><div class="col gap8">${rows}</div>`);
  }

  /* ------------------------------------------------------------------ *
   * 14. SCREEN 6 — Readiness & final review
   * ------------------------------------------------------------------ */
  function checklist() {
    const p = plan(); const ch = S.choices; const st = p.stay; const late = p.out && p.out.late; const D = DATES[ch.dates];
    const hosp = { rishikesh: 'AIIMS Rishikesh · ~5 km from your stay', udaipur: 'MB Government Hospital · ~3 km from your stay', mcleodganj: 'Zonal Hospital, Dharamshala · ~9 km from your stay' }[ch.dest];
    const secs = [];
    if (late) secs.push(['moon', `Late-night arrival · ${ch.outbound === 'volvo' ? 'Sat 4:10 AM' : 'Fri ' + p.arr}`, 'Based on your arrival time and what you told me about past trips', [
      ['tickets', 'done', `${ch.outbound === 'volvo' ? 'Bus' : 'Train'} tickets on hold`, `${ch.outbound === 'volvo' ? 'Kashmere Gate ISBT → Rishikesh · Fri 9:30 PM' : `New Delhi → Yog Nagari Rishikesh · ${D.days[0].split(' ')[0]} 6:05 PM`} · confirmed at booking (simulated hold)`],
      ['pickup', 'pending', `Confirm ${ch.outbound === 'volvo' ? 'bus-stand' : 'station'} pickup for ${ch.outbound === 'volvo' ? '4:10 AM' : p.arr}`, '₹350 · driver details shared 2 hrs before arrival · waits up to 60 min if delayed', 'Book pickup'],
      ['share', 'rec', 'Share live trip status with someone you trust', 'They’ll see your journey, pickup and check-in status — nothing else', 'Choose contact']]]);
    else secs.push(['sun', `Arrival · ${ch.dest === 'rishikesh' ? 'Sat ' + p.arr : 'Sat ' + p.arr}`, 'Daytime arrival', [['tickets', 'done', 'Tickets on hold', 'Confirmed at booking (simulated hold)'], ['share', 'rec', 'Share live trip status with someone you trust', 'Journey and check-in status only', 'Choose contact']]]);
    secs.push(['bed', `Your stay · ${st.short}`, 'Private room · 24×7 front desk', [[ 'checkin', 'done', late ? 'Late check-in acknowledged by the property' : 'Check-in time confirmed', late ? `Front desk notes arrival around ${tFmt(tParse(p.arr) + st.station)} (simulated confirmation)` : 'Early check-in requested (simulated confirmation)'], ['desk', 'pending', 'Save the front desk number', 'Shown after booking — I’ll add it to your offline trip card', 'Save']]]);
    const ground = [['walk', 'done', 'Saturday is walkable', 'All Saturday stops within 20 min on foot or by shared transport'], ['map', 'pending', `Download the offline map of ${DESTS[ch.dest].short}`, '42 MB · includes your stay, sights, station and pharmacies', 'Download'], ['cash', 'rec', 'Carry small cash for shared rides', '₹20–50 per ride; reviewers mention UPI isn’t always accepted (simulated sample)', 'Got it']];
    p.flags.filter((f) => /private cab|Inconvenient/.test(f.badge || '')).forEach((f) => ground.push(['cab-' + f.key, 'pending', `Pre-book the return for “${f.title}”`, 'No shared transport back — book a cab in advance or replace the activity', 'Book']));
    p.flags.filter((f) => /Limited info/.test(f.badge || '')).forEach((f) => ground.push(['ask-' + f.key, 'rec', `Ask your host about “${f.title}”`, 'My information is limited here — a quick check with your host helps', 'Draft message']));
    secs.push(['route', 'Getting around', p.days.some((d) => d.items.some((x) => /private cab/.test(x.meta || ''))) ? 'One stop depends on a private cab' : 'Every stop is reachable without a private car', ground]);
    secs.push(['phone', 'Essential contacts & info', 'Saved to your offline trip card', [['sos', 'done', 'Emergency numbers saved', '112 national emergency · 1091 women’s helpline'], ['hosp', 'done', 'Nearest hospital noted', `${hosp} (map estimate — verify locally)`]]]);
    const cont = [];
    if (late) cont.push(['delay', 'rec', `If your ${ch.outbound === 'volvo' ? 'bus' : 'train'} runs past ${ch.outbound === 'volvo' ? '5:00 AM' : '12:30 AM'}`, 'Pickup waits up to 60 min (simulated policy); I’ll notify the front desk automatically', 'Set alert']);
    if (ch.dest === 'rishikesh' && ch.sunMorn === 'waterfall') cont.push(['jeep', 'rec', 'If shared jeeps aren’t running on Sunday', 'Swap the waterfall for a riverside walk from your stay — no transport needed', 'Keep as backup']);
    if (!cont.length) cont.push(['ret', 'rec', 'If your return is delayed', `Metro runs until ~11 PM from the station; I’ll suggest a pre-paid taxi if you arrive later`, 'Got it']);
    secs.push(['help', 'If plans change', 'Contingencies I prepared for this itinerary', cont]);
    secs.forEach((s) => s[3].forEach((x) => { const o = S.checks[x[0]]; if (o) x[1] = o; }));
    return secs;
  }
  function renderReady() {
    const p = plan(); const ch = S.choices; const secs = checklist(); const all = secs.flatMap((s) => s[3]);
    const nDone = all.filter((x) => x[1] === 'done').length, nPend = all.filter((x) => x[1] === 'pending').length, nRec = all.filter((x) => x[1] === 'rec').length;
    const budget = S.brief.budget || 15000; const st = p.stay;
    const bookable = p.budget.transport + p.budget.stay + (p.out && p.out.late ? 350 : 0);
    const outline = p.days.flatMap((d) => d.items.filter((x) => x.type === 'item' && ['out', 'pickup', 'arrv', 'stay', 'ret'].includes(x.key)).map((x) => [x.icon, x.key === 'out' ? 'Outbound' : x.key === 'ret' ? 'Return' : x.key === 'stay' ? st.short : 'Pickup', x.key === 'stay' ? `${p.nights} night${p.nights > 1 ? 's' : ''} · private room` : `${x.time} · ${x.title.split(' · ').slice(-1)[0]}`, x.cost]));
    const acts = p.days.map((d) => [d.label.split(' · ')[0], d.items.filter((x) => x.type === 'item' && !['out', 'pickup', 'arrv', 'stay', 'ret'].includes(x.key) && !/lunch|dinner|Check-out/i.test(x.title)).map((x) => x.title.split(' · ')[0].split(' (')[0]).join(' · ')]).filter((x) => x[1]);
    return `<div class="screen" data-screen="ready">${chrome(4)}<div class="body"><div class="main">${errorBanner()}
      <section class="card" style="padding:22px 24px;gap:14px"><div class="row gap14 start">${C.aiMark(true)}<div class="col gap4 grow"><span class="t22 bk">You’re nearly ready, Tanya</span><span class="t13 ink2">I built this checklist from your actual plan — the ${p.out && p.out.late ? (ch.outbound === 'volvo' ? '4:10 AM' : p.arr) + ' arrival' : 'arrival'}, your stay, and how you’ll get around. Tap any item to mark it done.</span></div></div>
        <div class="col gap8"><div class="row between wrap gap8"><span class="t13 bk">${nDone} of ${all.length} ready</span><span class="row gap6">${C.tag(nDone + ' done', 'success', 'checkCircle')}${C.tag(nPend + ' to do', 'warning', 'alert')}${C.tag(nRec + ' suggested', 'ai', 'sparkle')}</span></div><div class="progress"><div style="width:${(nDone / all.length * 100).toFixed(1)}%"></div></div></div></section>
      ${secs.map(([i, t, s, items]) => `<section class="card tight"><div class="sec-h"><span class="sec-ic">${ic(i)}</span><div class="col grow gap4"><span class="t16 bk">${esc(t)}</span><span class="t12 muted">${esc(s)}</span></div><span class="t12 muted">${items.filter((x) => x[1] === 'done').length}/${items.length}</span></div>${items.map(([id, stt, ti, de, ac]) => `<div class="ck ${stt}" data-a="check" data-id="${id}" data-st="${stt}" role="button" tabindex="0" aria-pressed="${stt === 'done'}"><svg class="i st-icon"><use href="#i-${stt === 'done' ? 'checkCircle' : stt === 'pending' ? 'circle' : 'bulb'}"></use></svg><div class="grow"><div class="ct">${esc(ti)}</div><div class="cd">${esc(de)}</div></div><div class="cr"><span class="badge">${stt === 'done' ? 'Done' : stt === 'pending' ? 'Pending' : 'Suggested'}</span>${ac && stt !== 'done' ? `<button class="ca" data-a="checkAct" data-id="${id}" data-msg="${esc(ac)}">${esc(ac)}</button>` : ''}</div></div>`).join('')}</section>`).join('')}
      ${C.notice('uncertain', 'What I couldn’t verify', ch.dest === 'rishikesh' ? 'Night-time e-rickshaw availability near Yog Nagari station after midnight. That’s why I suggest the pre-booked pickup rather than relying on finding one.' : ch.dest === 'mcleodganj' ? 'Evening shared-taxi frequency between Bhagsu and the main square. I’ve kept your evenings near the square.' : 'Evening auto availability from Fateh Sagar to the old city. Your current plan keeps evenings within walking distance.')}
      </div>
      <aside class="card side-420 sticky" style="padding:22px 24px;border:1px solid #C9DFFB"><div class="row between"><span class="t18 bk">Trip summary</span>${C.btn('Edit plan', 'tertiary', 'chevronRight', 'data-a="go" data-s="review"')}</div>
        <div style="border-radius:12px;padding:16px;color:#fff;background:linear-gradient(180deg,${ch.dest === 'rishikesh' ? '#3E8E7E,#1F5A6E' : ch.dest === 'udaipur' ? '#D79A5B,#8C4A3C' : '#7C93B8,#3B4C6B'})"><div class="t20 bk">${DESTS[ch.dest].name}</div><div class="t13">${DATES[ch.dates].label} · ${p.nights} night${p.nights > 1 ? 's' : ''} · Solo</div></div>
        <div class="brief">${outline.map(([i, t, s, c]) => `<div class="br">${ic(i)}<div class="col grow"><span class="b">${esc(t)}</span><span class="t12 muted">${esc(s)}</span></div><span class="bk">${esc(c)}</span></div>`).join('')}${acts.map(([d, a]) => `<div class="br">${ic('sparkle')}<div class="col grow"><span class="b">${d}</span><span class="t12 muted">${esc(a)}</span></div></div>`).join('')}</div>
        <div class="col gap8" style="background:#F7F9FC;border-radius:10px;padding:12px 14px"><div class="row between t13"><span class="ink2">Bookable now</span><b>${fmt(bookable)}</b></div><div class="row between t13"><span class="ink2">Food & local spends (estimate)</span><b>${fmt(p.total - bookable)}</b></div><div class="row between"><span class="t14 bk">Estimated trip total</span><span class="row gap6"><span class="t20 bk">${fmt(p.total)}</span><span class="t12 muted">/ ${fmt(budget)}</span></span></div><div>${p.total <= budget ? C.tag(fmt(budget - p.total) + ' under budget', 'success', 'wallet') : C.tag(fmt(p.total - budget) + ' over budget', 'danger', 'alert')}</div></div>
        <div class="col gap6"><span class="t13 bk">What I optimised for</span>${[p.out && p.out.late ? `Short transfer after your ${ch.outbound === 'volvo' ? '4:10 AM' : p.arr} arrival` : 'A daytime arrival', p.lateEvening ? 'Evenings — one ends late (see Day 2)' : 'Evenings that end near your stay', p.days.some((d) => d.items.some((x) => /private cab/.test(x.meta || ''))) ? 'Shared transport — except one cab' : 'No reliance on private cabs', `Staying within ${fmt(budget)} with a buffer`].map((l) => `<div class="row gap6 t12">${ic('checkCircle', '', 'width:13px;height:13px;color:#12A06A')}<span>${l}</span></div>`).join('')}</div>
        ${nPend ? C.notice('warning', `${nPend} item${nPend > 1 ? 's' : ''} still to do`, 'You can approve now and finish these before you travel — I’ll remind you on Thursday.') : C.notice('success', 'Everything essential is done', 'Your plan is ready to approve.')}
        ${S.approved ? C.notice('success', 'Plan approved', 'Next step would be booking — payment is out of scope for this prototype.') : ''}
        ${C.btn(S.approved ? 'Approved — view confirmation' : 'Approve plan & continue to booking', 'primary', 'check', 'data-a="approve" id="cta-approve"').replace('class="btn btn-primary"', 'class="btn btn-primary btn-block"')}
        <div class="row gap16" style="justify-content:center">${C.btn('Share plan', 'tertiary', 'share', 'data-a="toast" data-msg="Share link copied (simulated)"')}${C.btn('Save for later', 'tertiary', 'chevronRight', 'data-a="toast" data-msg="Saved to My Trips (simulated)"')}</div>
        ${C.src('Prices are simulated; final prices confirmed at booking', 'sim')}</aside></div></div>`;
  }

  /* ------------------------------------------------------------------ *
   * 15. Overlays: modal, toast, prototype controls
   * ------------------------------------------------------------------ */
  function modal(html) { overlay.innerHTML = `<div class="modal-backdrop" data-a="closeModalBg"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`; const f = overlay.querySelector('button, input'); if (f) f.focus(); }
  function closeModal() { overlay.innerHTML = ''; }
  let toastT = null;
  function toast(msg, actLabel, act) {
    let t = $('#toast'); if (t) t.remove();
    document.body.insertAdjacentHTML('beforeend', `<div class="toast" id="toast" role="status">${ic('checkCircle')}<span>${esc(msg)}</span>${actLabel ? `<button data-a="${act}">${esc(actLabel)}</button>` : ''}</div>`);
    clearTimeout(toastT); toastT = setTimeout(() => { const x = $('#toast'); if (x) x.remove(); }, 3600);
  }
  function flash(sel) { const n = $(sel); if (n) { n.classList.remove('flash'); void n.offsetWidth; n.classList.add('flash'); } }
  let protoOpen = false;
  function protoHTML() {
    return `<button class="proto-fab" data-a="proto">${ic('settings')}Prototype controls</button>${protoOpen ? `<div class="proto-panel"><h4>Jump to screen</h4><div class="grid">${[['home', '01 Homepage'], ['disc', '02 Discovery'], ['loading', '02b Loading'], ['dest', '03 Destinations'], ['plan', '04 Itinerary'], ['review', '05 Review'], ['ready', '06 Readiness']].map(([s, l]) => `<button data-a="jump" data-s="${s}">${l}</button>`).join('')}</div><h4>Edge cases</h4><div class="grid">${[['over', 'No plan within budget'], ['soldout', 'Stay sold out'], ['dates', 'Dates changed'], ['nodata', 'No reliable info'], ['return', 'Inconvenient return'], ['ripple', 'Stay swap ripple']].map(([k, l]) => `<button data-a="edge" data-k="${k}">${l}</button>`).join('')}</div><label><input type="checkbox" data-a="netErr" ${S.netError ? 'checked' : ''}>Simulate live-price error</label><button class="lnk" data-a="reset">Reset prototype (clear saved state)</button><span class="t11 muted">All travel data is simulated. State is saved in this browser.</span></div>` : ''}`;
  }

  /* ------------------------------------------------------------------ *
   * 16. Router + render
   * ------------------------------------------------------------------ */
  const ORDER = ['home', 'disc', 'loading', 'dest', 'plan', 'review', 'ready'];
  function ensurePlan() { if (!S.choices) { if (!S.brief.budget) Object.assign(S.brief, { dates: '20-22', leave: 'fri-eve', origin: 'New Delhi', budget: 15000, solo: true, vibe: 'Peaceful, unhurried', mobility: true, comfort: ['Private room', '24×7 front desk'], avoidLate: true }); S.choices = initialChoices('rishikesh'); S.orig = clone(S.choices); } }
  function go(screen, opts = {}) {
    if (['plan', 'review', 'ready'].includes(screen)) ensurePlan();
    if (screen === 'dest' && !S.brief.budget) S.brief.budget = 15000;
    if (screen === 'dest' && !S.brief.dates) S.brief.dates = '20-22';
    S.screen = screen; save(); closeModal(); render();
    if (!opts.keepScroll) window.scrollTo({ top: 0 });
    if (screen === 'loading') runLoading();
  }
  function render() {
    const focusId = document.activeElement && document.activeElement.id; const caret = focusId && document.activeElement.selectionStart;
    const r = { home: renderHome, disc: renderDisc, loading: renderLoading, dest: renderDest, plan: renderPlan, review: renderReview, ready: renderReady }[S.screen] || renderHome;
    app.innerHTML = r() + protoHTML();
    if (focusId) { const el = document.getElementById(focusId); if (el) { el.focus(); if (caret != null && el.setSelectionRange) try { el.setSelectionRange(caret, caret); } catch (e) { /* ignore */ } } }
  }

  /* ------------------------------------------------------------------ *
   * 17. Events
   * ------------------------------------------------------------------ */
  function startAI(text) {
    S.disc = { stage: 'start', msgs: [] }; S.brief = defaultState().brief; S.choices = null; S.orig = null; S.pending = null; S.history = []; S.planMsgs = []; S.reviewMsgs = []; S.checks = {}; S.approved = false; S.lastChange = null; S.dest = defaultState().dest;
    go('disc'); if (text) setTimeout(() => discUser(text), 250);
  }
  function edge(k) {
    protoOpen = false;
    if (k === 'over') { if (!S.brief.budget) startAIQuiet(); S.brief.budget = 10000; S.brief.dates = S.brief.dates || '20-22'; go('dest'); setTimeout(() => { const n = $('#overbudget'); if (n) n.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100); return; }
    ensurePlan();
    if (S.choices.dest !== 'rishikesh') { S.choices = initialChoices('rishikesh'); S.orig = clone(S.choices); }
    S.pending = null;
    if (k === 'soldout') { S.soldOut = { [S.choices.stay]: true }; go('review'); return; }
    if (k === 'dates') { S.reviewMsgs.push({ who: 'user', text: 'Can we move this to 27–29 Nov instead?' }); setPending({ dates: S.choices.dates === '20-22' ? '27-29' : '20-22' }); go('review'); return; }
    if (k === 'nodata') { S.dest.open.mcleodganj = true; go('dest'); setTimeout(() => { S.dest.msgs.push({ who: 'user', text: 'What about Dharamkot at night?' }); S.dest.msgs.push(Object.assign({ who: 'ai' }, destAnswer('dharamkot at night'))); save(); render(); const n = $('#dest-mcleodganj'); if (n) n.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50); return; }
    if (k === 'return') { S.reviewMsgs.push({ who: 'user', text: 'Add the Kunjapuri sunrise on Sunday' }); setPending({ sunMorn: 'kunjapuri' }); go('review'); return; }
    if (k === 'ripple') { S.reviewMsgs.push({ who: 'user', text: 'Switch me to Ganga View in Tapovan, it’s cheaper.' }); setPending({ stay: 'gangaview' }); go('review'); }
  }
  function startAIQuiet() { Object.assign(S.brief, { dates: '20-22', leave: 'fri-eve', origin: 'New Delhi', budget: 15000, solo: true, vibe: 'Peaceful, unhurried', mobility: true, comfort: ['Private room', '24×7 front desk'], avoidLate: true }); }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-a]'); if (!t) return;
    const a = t.dataset.a; const d = t.dataset;
    if (a === 'closeModalBg' && e.target !== t) return;
    switch (a) {
      case 'go': if (d.s === 'disc' && S.screen === 'home') return startAI(''); return go(d.s);
      case 'back': { const map = { disc: 'home', loading: 'disc', dest: 'disc', plan: 'dest', review: 'plan', ready: 'review' }; return go(map[S.screen] || 'home'); }
      case 'toast': return toast(d.msg || 'Not part of this prototype');
      case 'mic': return toast('Voice input isn’t available in this prototype');
      case 'svc': S.home.svc = d.k; save(); render(); if (d.k !== 'flights') toast('Only the AI Trip Planner flow is interactive in this prototype'); return;
      case 'trip': S.home.trip = d.k; save(); return render();
      case 'fare': S.home.fare = d.k; save(); return render();
      case 'pdp': S.home.pdp = !S.home.pdp; save(); return render();
      case 'homeChip': { const inp = $('#in-home'); const v = d.q === 'Solo weekend under ₹15k' ? EXAMPLE : d.q === 'Fixed dates, open destination' ? 'This weekend, travelling alone, budget ₹15,000 — I’m open on where, somewhere calm I can explore on foot' : 'A walkable hill town this weekend, solo, under ₹15,000'; if (inp) { inp.value = v; S.home.draft = v; inp.focus(); } return; }
      case 'startAI': { const inp = $('#in-home'); const v = inp ? inp.value.trim() : ''; S.home.draft = ''; return startAI(v); }
      case 'prompt': return discUser(d.q === '__example' ? EXAMPLE : d.q === 'Peaceful solo weekend under ₹15,000' ? EXAMPLE : d.q);
      case 'answer': return answerQ(d.q, d.v);
      case 'comfort': { const c = S.brief.comfort; const i = c.indexOf(d.v); if (i >= 0) c.splice(i, 1); else c.push(d.v); if (d.v === 'Close to arrival station' && c.includes(d.v)) S.brief.avoidLate = true; save(); return render(); }
      case 'comfortDone': return discUser(d.skip ? 'Skip' : 'Nothing in particular');
      case 'restart': return startAI('');
      case 'editBrief': { const inp = $('#in-disc'); if (inp) { inp.placeholder = 'e.g. “budget 12000”, “next weekend”, “leave Saturday morning”'; inp.focus(); } return toast('Tell me what to change, or use the pencils in the brief panel'); }
      case 'editField': { const row = t.closest('.ci'); const f = d.f; row.innerHTML = `${ic('pencil', '', 'color:#008CFF')}<input id="edit-${f}" placeholder="${f === 'budget' ? 'e.g. 12000' : f === 'dates' ? 'this weekend / next weekend' : 'e.g. from New Delhi'}" data-field="${f}"><button class="edit" data-a="saveField" data-f="${f}">${ic('check')}</button>`; $(`#edit-${f}`).focus(); return; }
      case 'saveField': return saveField(d.f);
      case 'findDest': S.disc.stage = 'done'; return go('loading');
      case 'sort': S.dest.sort = d.k; save(); return render();
      case 'cmp': { const c = S.dest.compare; const i = c.indexOf(d.k); if (i >= 0) c.splice(i, 1); else c.push(d.k); save(); return render(); }
      case 'why': S.dest.open[d.k] = !S.dest.open[d.k]; save(); return render();
      case 'stays': S.dest.stays[d.k] = !S.dest.stays[d.k]; save(); return render();
      case 'excluded': S.dest.showExcluded = !S.dest.showExcluded; save(); return render();
      case 'overOpt': {
        if (d.k === 'raise') { const c = destCosts(); const min = Math.min(...Object.values(c).map((x) => x.total)); S.brief.budget = Math.ceil(min / 500) * 500; save(); render(); return toast(`Budget raised to ${fmt(S.brief.budget)}`); }
        S.choices = Object.assign(initialChoices('rishikesh'), d.k === 'oneNight' ? { outbound: 'sat', stay: 'riverside' } : { stay: 'hostel' }); S.orig = clone(S.choices); S.dest.chosen = 'rishikesh'; S.history = []; S.pending = null; S.planMsgs = []; return go('plan');
      }
      case 'selectDest': { const k = d.k; S.dest.chosen = k; S.choices = initialChoices(k); S.orig = clone(S.choices); S.history = []; S.pending = null; S.planMsgs = []; S.reviewMsgs = []; S.lastChange = null; S.checks = {}; S.approved = false; return go('plan'); }
      case 'ask': return chatSubmit(d.ctx, d.q);
      case 'scrollTo': { const n = document.getElementById(d.t); if (n) n.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      case 'dayTab': { document.querySelectorAll('.daytab').forEach((x) => x.classList.toggle('active', x === t)); const n = document.getElementById(d.t); if (n) n.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      case 'previewAlt': if (setPending({ [d.slot]: d.v })) { S.reviewMsgs.push({ who: 'user', text: `Show me: ${optName(S.choices.dest, d.slot, d.v)}` }); go('review'); } return;
      case 'itemAction': {
        const slot = d.slot;
        if (slot === 'none') return toast('Alternatives for this stop aren’t modelled in the prototype — try the flagged items, stay or train');
        if (S.screen === 'plan') { S.collapsed = {}; go('review'); setTimeout(() => (slot === 'stay' ? $('#swap-stay').scrollIntoView({ behavior: 'smooth' }) : slotModal(slot)), 80); return; }
        if (slot === 'stay') return $('#swap-stay').scrollIntoView({ behavior: 'smooth', block: 'start' });
        return slotModal(slot);
      }
      case 'slotModal': return slotModal(d.slot);
      case 'pend': { const ok = setPending({ [d.slot]: d.v }); if (d.close) closeModal(); if (ok) { S.collapsed = {}; render(); setTimeout(() => { const n = $('#impact'); if (n) n.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 60); } return; }
      case 'pendStay': { if (setPending({ stay: d.v })) { S.collapsed = {}; render(); setTimeout(() => { const n = $('#impact'); if (n) n.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 60); } return; }
      case 'similar': { const free = ['lakshman', 'stationroad'].filter((x) => x !== S.choices.stay); if (setPending({ stay: free[0] })) render(); return; }
      case 'apply': if (S.soldOut[S.choices.stay] && S.pending && S.pending.changes.stay) S.soldOut = {}; return applyPending();
      case 'cancelPend': S.pending = null; save(); return render();
      case 'undo': return undo();
      case 'collapse': { const sec = t.closest('.day'); S.collapsed[d.k] = !sec.classList.contains('collapsed'); save(); return render(); }
      case 'check': { const nx = d.st === 'done' ? 'pending' : 'done'; S.checks[d.id] = nx; save(); render(); return; }
      case 'checkAct': { e.stopPropagation(); S.checks[d.id] = 'done'; save(); render(); return toast({ 'Book pickup': 'Pickup booked (simulated) · driver details 2 hrs before arrival', Download: 'Offline map downloaded (simulated)', 'Choose contact': 'Trip status shared with your contact (simulated)', Save: 'Saved to your offline trip card' }[d.msg] || `${d.msg} — done`); }
      case 'approve': return approveModal();
      case 'closeModal': case 'closeModalBg': return closeModal();
      case 'retry': { t.disabled = true; t.innerHTML = `${ic('loader', '', 'animation:spin 1s linear infinite')}Retrying…`; setTimeout(() => { S.netError = false; save(); render(); toast('Prices refreshed (simulated) — nothing changed'); }, 1100); return; }
      case 'proto': protoOpen = !protoOpen; return render();
      case 'jump': protoOpen = false; if (['dest'].includes(d.s) && !S.brief.budget) startAIQuiet(); return go(d.s);
      case 'edge': return edge(d.k);
      case 'reset': try { localStorage.removeItem(STORE); } catch (err) { /* ignore */ } S = defaultState(); protoOpen = false; go('home'); return toast('Prototype reset');
      case 'homeHome': return go('home');
      default:
    }
  });
  document.addEventListener('change', (e) => { if (e.target.matches('[data-a="netErr"]')) { S.netError = e.target.checked; save(); render(); } });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Enter' && e.target.matches('input[data-field]')) { e.preventDefault(); saveField(e.target.dataset.field); }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"][data-a], [role="link"][data-a]')) { e.preventDefault(); e.target.click(); }
  });
  document.addEventListener('input', (e) => { if (e.target.id === 'in-home') { S.home.draft = e.target.value; save(); } });
  document.addEventListener('submit', (e) => {
    const f = e.target.closest('form[data-chat]'); if (!f) return; e.preventDefault();
    const v = f.q.value.trim(); if (!v) { f.q.focus(); return; } f.q.value = '';
    chatSubmit(f.dataset.chat, v);
  });
  function chatSubmit(ctx, v) {
    if (ctx === 'home') { S.home.draft = ''; return startAI(v); }
    if (ctx === 'disc') return discUser(v);
    if (ctx === 'dest') { S.dest.msgs.push({ who: 'user', text: v }); render(); const ans = destAnswer(v); return aiSay('#dest-msgs', () => S.dest.msgs.push(Object.assign({ who: 'ai' }, ans))); }
    if (ctx === 'plan' || ctx === 'review') return handleMod(ctx, v);
  }
  function saveField(f) {
    const inp = $(`#edit-${f}`); if (!inp) return; const v = inp.value.trim(); if (!v) return render();
    const p = parseIntent((f === 'budget' ? 'budget ' : f === 'origin' && !/from/i.test(v) ? 'from ' : '') + v);
    if (f === 'budget' && !p.budget) { const n = parseInt(v.replace(/[^\d]/g, ''), 10); if (n) p.budget = n < 1000 ? n * 1000 : n; }
    if (f === 'dates' && !p.dates) p.dates = /next|27/.test(v) ? '27-29' : '20-22';
    if (f === 'origin' && !p.origin) p.origin = v.replace(/^from\s+/i, '');
    const ch = mergeBrief(p); if (ch.length) { S.disc.msgs.push({ who: 'ai', kind: 'brief', lead: `Updated from the brief panel — ${f === 'budget' ? 'budget ' + fmt(S.brief.budget) : f === 'dates' ? DATES[S.brief.dates].label : 'starting from ' + S.brief.origin}. Here’s the refreshed brief:`, upd: ch }); if (S.disc.stage === 'start') S.disc.stage = 'brief'; }
    save(); render();
  }
  function approveModal() {
    const p = plan(); const all = checklist().flatMap((s) => s[3]); const pend = all.filter((x) => x[1] === 'pending').length; S.approved = true; save(); render();
    modal(`<div class="modal-h">${C.aiMark()}<h3>Plan approved</h3><button class="icon-btn" data-a="closeModal" aria-label="Close">${ic('close')}</button></div>
      <p class="t14" style="margin:0">Your <b>${DESTS[S.choices.dest].short}</b> trip for ${DATES[S.choices.dates].label} is approved at an estimated <b>${fmt(p.total)}</b>. In the full product you’d continue to booking — payment is outside this prototype.</p>
      ${pend ? C.notice('warning', `${pend} item${pend > 1 ? 's' : ''} still to do before you travel`, 'I’ll remind you on Thursday. You can finish them from the readiness checklist anytime.') : C.notice('success', 'Your checklist is complete', 'Have a calm weekend!')}
      <div class="row gap10">${C.btn('Back to checklist', 'secondary', null, 'data-a="closeModal"')}${C.btn('Return to homepage', 'primary', 'arrowRight', 'data-a="go" data-s="home"')}</div>`);
  }

  /* Boot */
  if (S.screen === 'loading') S.screen = 'dest';
  if (['plan', 'review', 'ready'].includes(S.screen)) ensurePlan();
  render();
  window.__MMT = { get state() { return S; }, plan: () => (S.choices ? plan() : null), buildPlan, go };
})();
