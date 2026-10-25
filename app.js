(() => {
  'use strict';
  const C = window.KASOKO_CATALOG || {destinations: [], hotels: [], services: []};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const read = (key, fallback) => { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } };
  const save = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  const state = {lang: read('kt-lang', 'en') === 'sw' ? 'sw' : 'en', theme: read('kt-theme', 'day') === 'night' ? 'night' : 'day', safari: 'all', tour: 'all', hotel: 'all'};
  const text = key => window.KASOKO_TEXT?.[state.lang]?.[key] || window.KASOKO_TEXT?.en?.[key] || key;
  const local = value => value && !Array.isArray(value) && typeof value === 'object' ? (value[state.lang] || value.en || '') : (value || '');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fold = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
  const isHome = document.body.dataset.page === 'home';
  const pageLimit = isHome ? 3 : 12;
  const limits = {safari: pageLimit, tour: pageLimit, hotel: pageLimit};
  const searches = {safari: '', tour: '', hotel: ''};
  const iconPaths = {
    safari: '<path d="M3 17V9h13l5 5v3M3 13h18M6 9V5h7v4M16 9v4"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
    tour: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2ZM9 3v16m6-14v16"/>',
    hotel: '<path d="M3 20V8h18v12M3 16h18M7 8V4h10v4M7 12h3m4 0h3"/>',
    tickets: '<path d="M3 7h18v4a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4Zm12 0v3m0 3v2m0 2v1"/>',
    flight: '<path d="m2 12 8 2 3 8 2-9 7-9-9 7-9 2Z"/>',
    bus: '<rect x="5" y="3" width="14" height="17" rx="3"/><path d="M5 12h14M8 20v2m8-2v2M8 16h1m6 0h1M8 6h8"/>',
    ferry: '<path d="M4 12h16l-3 7H7ZM8 12V6h8v6m-4-6V2M3 22l3-2 3 2 3-2 3 2 3-2 3 2"/>',
    train: '<rect x="6" y="2" width="12" height="17" rx="3"/><path d="M6 11h12M9 15h1m4 0h1M9 19l-3 3m9-3 3 3"/>',
    transfer: '<path d="m4 11 2-6h12l2 6v8H4Zm0 0h16M7 15h2m6 0h2M6 19v3m12-3v3"/>',
    custom: '<path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="9"/>'
  };
  const icon = key => '<svg class="service-icon" viewBox="0 0 24 24" aria-hidden="true">' + (iconPaths[key] || iconPaths.custom) + '</svg>';
  const regionLabel = value => ({'Arusha / Northern Tanzania':state.lang === 'sw' ? 'Arusha na kaskazini' : 'Arusha & northern parks','Moshi / Kilimanjaro':'Kilimanjaro'}[value] || value);
  const overviewPhoto = key => C.overviewPhotos?.[key] || `assets/photos/${key}.jpg`;
  function protectPhotos() {
    $$('img[src^="assets/photos/"]').forEach(img => {
      if (img.dataset.protected) return; img.dataset.protected = 'true';
      img.addEventListener('error', () => {
        if (img.getAttribute('src').includes('/thumbs/') && !img.dataset.retried) { img.dataset.retried = 'true'; img.src = img.getAttribute('src').replace('/thumbs/','/'); return; }
        if (!img.dataset.webpTried) { img.dataset.webpTried = 'true'; img.src = img.getAttribute('src').replace(/\.jpg$/,'.webp'); return; }
        const note = document.createElement('span'); note.className = 'photo-unavailable'; note.textContent = text('photo.unavailable') + ' · ' + img.alt; img.hidden = true; img.after(note);
      });
    });
  }
  function applyText() {
    document.documentElement.lang = state.lang;
    $$('[data-i18n]').forEach(el => { el.textContent = text(el.dataset.i18n); });
    $$('[data-i18n-placeholder]').forEach(el => { el.placeholder = text(el.dataset.i18nPlaceholder); });
    $$('[data-bilingual]').forEach(el => { el.textContent = el.dataset[state.lang] || el.dataset.en || ''; });
    const navToggle = $('[data-menu-toggle]'); if(navToggle)navToggle.setAttribute('aria-label',state.lang==='sw'?'Fungua menyu':'Open navigation menu');
    const lang = $('[data-lang-toggle]'), theme = $('[data-theme-toggle]');
    if (lang) { lang.textContent = state.lang === 'en' ? 'SW' : 'EN'; lang.setAttribute('aria-label', state.lang === 'en' ? 'Switch to Kiswahili' : 'Switch to English'); }
    if (theme) { theme.textContent = state.theme === 'night' ? '☀' : '☾'; theme.setAttribute('aria-label', state.lang === 'en' ? 'Toggle light or dark theme' : 'Badili mwonekano wa mchana au usiku'); }
  }
  function card(item, kind) {
    const hotel = kind === 'hotel', name = local(item.name), copy = local(item.text) || local(item.description);
    const path = (hotel ? 'hotel-' : 'destination-') + item.id + '.html';
    const service = hotel ? 'hotel' : item.service;
    return `<article class="card"><a class="card-image" href="${path}" aria-label="${esc(name)}"><img loading="lazy" decoding="async" width="900" height="600" src="${esc(item.images[0].replace('assets/photos/','assets/photos/thumbs/'))}" alt="${esc(item.photoAlt || name)}"><span class="card-badge">${esc(hotel ? regionLabel(item.region) : local(item.badge))}</span></a><div class="card-content"><span class="card-meta">${esc(local(item.location))}</span><h3><a href="${path}">${esc(name)}</a></h3><p>${esc(copy)}</p><div class="card-foot"><strong>${esc(local(item.price))}</strong><a class="text-link" href="booking.html?service=${service}&amp;item=${item.id}">${state.lang === 'sw' ? 'Omba →' : 'Request →'}</a></div></div></article>`;
  }
  const regions = [
    ['arusha', 'Arusha', 'Arusha, Tanzania', 'Our base for city days, Mount Meru, coffee, culture and northern safaris.', 'Msingi wetu kwa ziara za jiji, Mlima Meru, kahawa, utamaduni na safari za kaskazini.'],
    ['manyara', 'Manyara', 'Lake Manyara, Tanzania', 'Lake Manyara, Tarangire, Mto wa Mbu and Rift Valley days from Arusha.', 'Lake Manyara, Tarangire, Mto wa Mbu na Bonde la Ufa kutoka Arusha.'],
    ['tanga', 'Tanga', 'Tanga, Tanzania', 'Explore Pangani, Saadani, Maziwe and Amboni, with a Mkomazi extension.', 'Tembelea Pangani, Saadani, Maziwe na Amboni, pamoja na nyongeza ya Mkomazi.']
  ];
  function renderRegions() {
    const el = $('#region-grid'); if (!el) return;
    el.innerHTML = regions.map(r => `<a class="region-card" id="${r[0]}" href="${isHome ? 'locations.html#'+r[0] : 'booking.html?service=custom&amp;region='+encodeURIComponent(r[2])}"><img loading="lazy" decoding="async" width="1200" height="800" src="${esc(overviewPhoto('region-' + r[0]))}" alt="${esc(C.photos?.['region-'+r[0]]?.alt || r[1])}"><div><span>${state.lang === 'sw' ? 'Eneo la huduma' : 'Service region'}</span><h3>${r[1]}</h3><p>${r[state.lang === 'sw' ? 4 : 3]}</p><b>${state.lang === 'sw' ? 'Panga safari →' : 'Plan this region →'}</b></div></a>`).join('');
  }
  function renderServices() {
    const el = $('#service-grid'); if (!el) return;
    el.innerHTML = C.services.map(s => `<a class="service-card" href="booking.html?service=${s.id === 'tickets' ? 'flight' : s.id}"><span aria-hidden="true">${icon(s.id)}</span><div><h3>${esc(local(s.title))}</h3><p>${esc(local(s.text))}</p></div><b aria-hidden="true">→</b></a>`).join('');
  }
  const rank = item => ({'Arusha / Northern Tanzania': 0, Manyara: 1, Tanga: 2, 'Moshi / Kilimanjaro': 3, Zanzibar: 4, 'Dar es Salaam': 5}[item.region] ?? 6);
  function collection(kind) { return (kind === 'hotel' ? C.hotels : C.destinations.filter(item => item.service === kind)).slice().sort((a, b) => rank(a) - rank(b)); }
  function renderCollection(kind) {
    const key = kind === 'safari' ? 'destination' : kind;
    const grid = $('#' + kind + '-grid'), filters = $('[data-' + key + '-filters]'); if (!grid) return;
    const items = collection(kind), options = ['all', ...new Set(items.map(item => item.region))];
    if (filters) {
      filters.innerHTML = options.map(region => '<button type="button" class="filter ' + (state[kind] === region ? 'active' : '') + '" aria-pressed="' + (state[kind] === region) + '" data-region="' + esc(region) + '">' + esc(region === 'all' ? (state.lang === 'sw' ? 'Zote' : 'All') : regionLabel(region)) + '</button>').join('');
      $$('button', filters).forEach(button => button.addEventListener('click', () => {
        state[kind] = button.dataset.region; limits[kind] = pageLimit; renderCollection(kind);
        $$('button', filters).find(b => b.dataset.region === state[kind])?.focus({preventScroll:true});
      }));
    }
    const search = $('[data-search="' + kind + '"]');
    if (search && !search.dataset.bound) {search.dataset.bound = 'true'; search.addEventListener('input', () => {searches[kind] = search.value; limits[kind] = pageLimit; renderCollection(kind);});}
    const query = fold(searches[kind].trim());
    const matches = items.filter(item => (state[kind] === 'all' || item.region === state[kind]) && (!query || fold([local(item.name),local(item.location),local(item.text),item.region].join(' ')).includes(query)));
    let ordered = matches;
    if (isHome && state[kind] === 'all' && !query) {
      const featured = ['Arusha / Northern Tanzania','Manyara','Tanga'].map(region => matches.find(item => item.region === region)).filter(Boolean);
      ordered = [...featured, ...matches.filter(item => !featured.includes(item))];
    }
    const visible = ordered.slice(0,limits[kind]);
    grid.innerHTML = visible.length ? visible.map(item => card(item, kind === 'hotel' ? 'hotel' : 'destination')).join('') : '<p class="collection-empty">' + esc(text('filter.empty')) + '</p>';
    protectPhotos();
    const count = $('[data-' + key + '-count]'); if (count) count.textContent = state.lang === 'sw' ? visible.length + ' kati ya ' + matches.length + ' chaguo' : visible.length + ' of ' + matches.length + ' options';
    const more = $('[data-more="' + kind + '"]');
    if(more) {more.hidden = visible.length >= matches.length; more.textContent = text('filter.more'); more.onclick = () => {const previous=visible.length; limits[kind] += 12; renderCollection(kind); const next=$$('.card h3 a',grid)[previous]; next?.focus({preventScroll:true});};}
  }
  function renderDetail() {
    const id = document.body.dataset.item, kind = document.body.dataset.kind; if (!id || !kind) return;
    const item = (kind === 'hotel' ? C.hotels : C.destinations).find(x => x.id === id); if (!item) return;
    $('[data-detail-name]')?.replaceChildren(document.createTextNode(local(item.name)));
    $('[data-detail-text]')?.replaceChildren(document.createTextNode(local(item.text) || local(item.description)));
    const location = $('.detail-location'); if (location) location.textContent = local(item.location);
    const badge = $('.detail-copy .kicker'); if (badge) badge.textContent = kind === 'hotel' ? (state.lang === 'sw' ? 'Hoteli na loji' : 'Hotel & lodge') : local(item.badge);
    const facts = $('.fact-row'); if (facts) facts.innerHTML = (local(item.facts) || []).map(f => `<span>✓ ${esc(f)}</span>`).join('');
    const sourceLink = $('.detail-actions a[data-source-link]');
    const gallery = $('[data-gallery]'), mainPhoto = $('#detail-image');
    if (gallery && mainPhoto) {
      gallery.setAttribute('aria-label',text('detail.photos'));
      const selected = mainPhoto.dataset.photoIndex || '0';
      gallery.innerHTML = item.images.map((src,index) => `<button type="button" data-photo-index="${index}" aria-controls="detail-image" aria-pressed="${String(index) === selected}" aria-label="${esc((state.lang === 'sw' ? 'Picha ' : 'Photo ') + (index+1) + ': ' + (item.imageAlts?.[index] || local(item.name)))}"><img loading="lazy" width="180" height="120" src="${esc(src.replace('assets/photos/','assets/photos/thumbs/'))}" alt=""></button>`).join('');
      $$('button',gallery).forEach(button => button.addEventListener('click', () => {
        const index = Number(button.dataset.photoIndex);
        mainPhoto.hidden = false; delete mainPhoto.dataset.retried; delete mainPhoto.dataset.webpTried;
        mainPhoto.parentElement.querySelector('.photo-unavailable')?.remove();
        mainPhoto.src = item.images[index]; mainPhoto.alt = item.imageAlts?.[index] || local(item.name); mainPhoto.dataset.photoIndex = String(index);
        $$('button',gallery).forEach(b=>b.setAttribute('aria-pressed',String(b === button)));
        const credit = $('.detail-visual .photo-caption a'); if (credit) credit.href = 'credits.html#' + item.images[index].split('/').pop().replace(/\.[^.]+$/,'');
      }));
    }
 if (sourceLink && kind === 'destination') sourceLink.textContent = state.lang === 'sw' ? 'Fungua chanzo cha eneo' : 'Open destination source';
  }
  function renderAll() {
    applyText(); renderServices(); renderRegions(); ['safari', 'tour', 'hotel'].forEach(renderCollection); renderDetail();
    protectPhotos();
    const ticketGrid = $('#ticket-grid');
    if (ticketGrid) ticketGrid.innerHTML = [['flight','✈️','Flights','Ndege'],['bus','🚌','Buses','Mabasi'],['ferry','⛴️','Ferries','Feri'],['train','🚆','Trains','Treni']].map(x => `<a class="ticket-card" href="booking.html?service=${x[0]}"><span aria-hidden="true">${icon(x[0])}</span><b>${x[state.lang === 'sw' ? 3 : 2]}</b><small>${state.lang === 'sw' ? 'Omba njia na tarehe →' : 'Request route and date →'}</small></a>`).join('');
  }
  const menu = $('[data-menu]'), menuToggle = $('[data-menu-toggle]');
  const closeMenu = () => { menu?.classList.remove('open'); menuToggle?.setAttribute('aria-expanded', 'false'); };
  menuToggle?.addEventListener('click', () => menuToggle.setAttribute('aria-expanded', String(menu.classList.toggle('open'))));
  menu?.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu?.classList.contains('open')) { closeMenu(); menuToggle?.focus(); } });
  document.addEventListener('click', event => { if (!event.target.closest('.nav-wrap')) closeMenu(); });
  const header = $('[data-header]');
  const compactHeader = () => { if(window.scrollY > 56) header?.classList.add('scrolled'); else if(window.scrollY < 14) header?.classList.remove('scrolled'); };
  window.addEventListener('scroll', compactHeader, {passive:true}); compactHeader();
  window.addEventListener('resize', () => {if(window.innerWidth > 1120)closeMenu();});
  $('[data-theme-toggle]')?.addEventListener('click', () => { state.theme = state.theme === 'night' ? 'day' : 'night'; save('kt-theme', state.theme); document.documentElement.dataset.theme = state.theme; applyText(); });
  $('[data-lang-toggle]')?.addEventListener('click', () => { state.lang = state.lang === 'en' ? 'sw' : 'en'; save('kt-lang', state.lang); renderAll(); document.dispatchEvent(new CustomEvent('kasoko:language', {detail: state.lang})); });
  document.documentElement.dataset.theme = state.theme;
  const detailKind = document.body.dataset.kind;
  const item = (detailKind === 'hotel' ? C.hotels : C.destinations).find(x => x.id === document.body.dataset.item);
  const pageKeys = {safaris:'nav.safaris',tours:'nav.tours',hotels:'nav.hotels',locations:'nav.regions',tickets:'nav.tickets'};
  const activeKey = pageKeys[document.body.dataset.page] || (location.pathname.endsWith('credits.html') ? '' : location.pathname.endsWith('booking.html') ? 'nav.book' : detailKind === 'hotel' ? 'nav.hotels' : item?.service === 'safari' ? 'nav.safaris' : item ? 'nav.tours' : ['about','contact','404'].includes(document.body.dataset.page) ? '' : 'nav.home');
  $$('.nav-links a').forEach(a => {const active = a.dataset.i18n === activeKey; a.classList.toggle('active',active); if(active)a.setAttribute('aria-current',detailKind?'location':'page');else a.removeAttribute('aria-current');});
  renderAll();
})();
