(() => {
  'use strict';

  const HISTORY_KEY = 'ftrans-postcode-history-v2';
  const THEME_KEY = 'ftrans-postcode-theme';
  const MAX_HISTORY = 4;

  const memoryStorage = new Map();
  const safeStorage = {
    getItem(key) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return memoryStorage.has(key) ? memoryStorage.get(key) : null;
      }
    },
    setItem(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        memoryStorage.set(key, String(value));
      }
    },
    removeItem(key) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        memoryStorage.delete(key);
      }
    }
  };

  const COUNTRIES = {
    HU: {
      code: 'HU',
      name: 'Magyarország',
      flag: '🇭🇺',
      postcodeLength: 4,
      prefixLength: 1,
      placeholder: 'Például: 8600',
      hint: '4 számjegy. A gyorskörzetet az első számjegy jelzi.',
      mapTitle: 'Irányítószám-körzetek',
      mapPath: 'assets/maps/hu-postcode.png',
      mapAlt: 'Magyarország postai körzeti térképe',
      examples: ['8600', '1138', '9021'],
      zones: {
        '1': 'Budapest',
        '2': 'Budapest környéke',
        '3': 'Észak-Magyarország',
        '4': 'Észak-Tiszántúl',
        '5': 'Közép-Alföld',
        '6': 'Dél-Alföld',
        '7': 'Dél-Dunántúl',
        '8': 'Balaton és Közép-Dunántúl',
        '9': 'Nyugat-Magyarország'
      },
      focus: {
        '1': [50, 46, 2.35],
        '2': [48, 45, 2.05],
        '3': [58, 29, 2.0],
        '4': [80, 34, 2.0],
        '5': [62, 49, 2.0],
        '6': [67, 73, 2.0],
        '7': [39, 74, 2.0],
        '8': [29, 56, 2.0],
        '9': [12, 54, 2.0]
      }
    },
    DE: {
      code: 'DE',
      name: 'Németország',
      flag: '🇩🇪',
      postcodeLength: 5,
      prefixLength: 2,
      placeholder: 'Például: 80331',
      hint: '5 számjegy. A kétjegyű PLZ-körzet a kezdő nullát is megőrzi.',
      mapTitle: 'Kétjegyű PLZ-körzetek',
      mapPath: 'assets/maps/de-postcode.png',
      mapAlt: 'Németország kétjegyű postai körzeti térképe',
      examples: ['01067', '10115', '80331'],
      focus: {
        '0': [74, 51, 1.75],
        '1': [73, 20, 1.75],
        '2': [44, 18, 1.75],
        '3': [47, 40, 1.75],
        '4': [20, 42, 1.75],
        '5': [20, 62, 1.75],
        '6': [41, 65, 1.75],
        '7': [34, 82, 1.75],
        '8': [67, 86, 1.75],
        '9': [66, 66, 1.75]
      }
    },
    IT: {
      code: 'IT',
      name: 'Olaszország',
      flag: '🇮🇹',
      postcodeLength: 5,
      prefixLength: 2,
      placeholder: 'Például: 20100',
      hint: '5 számjegy. A kétjegyű CAP-körzet a kezdő nullát is megőrzi.',
      mapTitle: 'Kétjegyű CAP-körzetek',
      mapPath: 'assets/maps/it-postcode.png',
      mapAlt: 'Olaszország kétjegyű CAP-körzeti térképe',
      examples: ['00100', '20100', '80100'],
      focus: {
        sardinia: [18, 69, 2.2],
        central: [51, 51, 2.0],
        northWest: [23, 21, 2.0],
        north: [43, 21, 2.0],
        northEast: [61, 19, 2.0],
        tuscany: [45, 38, 2.0],
        adriatic: [59, 45, 2.0],
        puglia: [81, 63, 2.0],
        south: [66, 69, 2.0],
        sicily: [58, 86, 2.0]
      }
    }
  };

  const elements = {
    html: document.documentElement,
    themeMeta: document.querySelector('meta[name="theme-color"]'),
    countryTabs: [...document.querySelectorAll('.country-tab')],
    searchForm: document.getElementById('searchForm'),
    input: document.getElementById('postcodeInput'),
    inputShell: document.getElementById('inputShell'),
    clearInput: document.getElementById('clearInput'),
    searchButton: document.getElementById('searchButton'),
    buttonLabel: document.querySelector('#searchButton .button-label'),
    inputHint: document.getElementById('inputHint'),
    errorMessage: document.getElementById('errorMessage'),
    historyRow: document.getElementById('historyRow'),
    historyChips: document.getElementById('historyChips'),
    clearHistory: document.getElementById('clearHistory'),
    mapCountryLabel: document.getElementById('mapCountryLabel'),
    mapTitle: document.getElementById('mapTitle'),
    mapStage: document.getElementById('mapStage'),
    referenceTab: document.getElementById('referenceTab'),
    locationTab: document.getElementById('locationTab'),
    viewTabs: [...document.querySelectorAll('.view-tab')],
    referenceView: document.getElementById('referenceView'),
    locationView: document.getElementById('locationView'),
    mapLoading: document.getElementById('mapLoading'),
    mapError: document.getElementById('mapError'),
    retryMap: document.getElementById('retryMap'),
    mapScroll: document.getElementById('mapScroll'),
    mapImage: document.getElementById('postcodeMap'),
    selectedZone: document.getElementById('selectedZone'),
    selectedPrefix: document.getElementById('selectedPrefix'),
    zoomIn: document.getElementById('zoomIn'),
    zoomOut: document.getElementById('zoomOut'),
    resetMap: document.getElementById('resetMap'),
    locationEmpty: document.getElementById('locationEmpty'),
    locationFrameWrap: document.getElementById('locationFrameWrap'),
    locationLoading: document.getElementById('locationLoading'),
    osmFrame: document.getElementById('osmFrame'),
    googleMapsLink: document.getElementById('googleMapsLink'),
    zonePicker: document.getElementById('zonePicker'),
    zonePickerToggle: document.getElementById('zonePickerToggle'),
    zonePickerPanel: document.getElementById('zonePickerPanel'),
    resultCard: document.getElementById('resultCard'),
    resultInitial: document.getElementById('resultInitial'),
    resultLoading: document.getElementById('resultLoading'),
    resultContent: document.getElementById('resultContent'),
    exampleRow: document.getElementById('exampleRow'),
    resultStatus: document.getElementById('resultStatus'),
    resultStatusText: document.getElementById('resultStatusText'),
    resultPostcode: document.getElementById('resultPostcode'),
    resultPlace: document.getElementById('resultPlace'),
    resultZone: document.getElementById('resultZone'),
    resultRegion: document.getElementById('resultRegion'),
    resultMessage: document.getElementById('resultMessage'),
    showOnMap: document.getElementById('showOnMap'),
    copyResult: document.getElementById('copyResult'),
    retrySearch: document.getElementById('retrySearch'),
    detailCountry: document.getElementById('detailCountry'),
    detailPrefix: document.getElementById('detailPrefix'),
    detailCoords: document.getElementById('detailCoords'),
    detailVerification: document.getElementById('detailVerification'),
    themeToggle: document.getElementById('themeToggle'),
    themeIcon: document.querySelector('.theme-icon'),
    themeLabel: document.querySelector('.theme-label'),
    infoButton: document.getElementById('infoButton'),
    infoDialog: document.getElementById('infoDialog'),
    toast: document.getElementById('toast')
  };

  const state = {
    country: 'HU',
    prefix: null,
    currentResult: null,
    activeView: 'reference',
    mapZoom: 1,
    mapLoadToken: 0,
    mapBusy: false,
    mapLoadedCountry: 'HU',
    searchToken: 0,
    requestController: null,
    searching: false,
    locationSrc: null,
    locationLoadedSrc: null,
    toastTimer: null,
    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragScrollLeft: 0,
    dragScrollTop: 0
  };

  function currentCountry() {
    return COUNTRIES[state.country];
  }

  function prefersReducedMotion() {
    return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  }

  function setTheme(theme) {
    const nextTheme = theme === 'light' ? 'light' : 'dark';
    elements.html.dataset.theme = nextTheme;
    safeStorage.setItem(THEME_KEY, nextTheme);

    const dark = nextTheme === 'dark';
    elements.themeIcon.textContent = dark ? '☾' : '☀';
    elements.themeLabel.textContent = dark ? 'Sötét' : 'Világos';
    elements.themeToggle.setAttribute('aria-label', dark ? 'Világos téma bekapcsolása' : 'Sötét téma bekapcsolása');
    elements.themeMeta?.setAttribute('content', dark ? '#07100b' : '#f1f5f1');
  }

  function initTheme() {
    const saved = safeStorage.getItem(THEME_KEY);
    setTheme(saved || 'dark');
  }

  function showToast(message) {
    window.clearTimeout(state.toastTimer);
    elements.toast.textContent = message;
    elements.toast.hidden = false;
    state.toastTimer = window.setTimeout(() => {
      elements.toast.hidden = true;
    }, 2200);
  }

  function setError(message = '') {
    elements.errorMessage.textContent = message;
    elements.inputShell.classList.toggle('is-invalid', Boolean(message));
  }

  function sanitizeInput(value) {
    return String(value).replace(/\D/g, '');
  }

  function isInputComplete() {
    const cfg = currentCountry();
    return /^\d+$/.test(elements.input.value) && elements.input.value.length === cfg.postcodeLength;
  }

  function updateInputControls() {
    elements.clearInput.hidden = elements.input.value.length === 0;
    elements.searchButton.disabled = state.searching || state.mapBusy || !isInputComplete();
  }

  function validatePostcode(value) {
    const cfg = currentCountry();
    if (!value) return `Adj meg egy ${cfg.postcodeLength} számjegyű irányítószámot.`;
    if (!/^\d+$/.test(value)) return 'Csak számokat adj meg.';
    if (value.length !== cfg.postcodeLength) {
      if (state.country === 'HU') return 'A magyar irányítószám pontosan 4 számjegyű.';
      if (state.country === 'DE') return 'A német irányítószám pontosan 5 számjegyű.';
      return 'Az olasz CAP-kód pontosan 5 számjegyű.';
    }
    return null;
  }

  function getPrefix(postcode, countryCode = state.country) {
    return postcode.slice(0, COUNTRIES[countryCode].prefixLength);
  }

  function getZoneShort(prefix, countryCode = state.country) {
    return countryCode === 'HU' ? `${prefix}-as körzet` : `${prefix}-es körzet`;
  }

  function getZoneRegion(prefix, countryCode = state.country) {
    if (countryCode !== 'HU') return null;
    return COUNTRIES.HU.zones[prefix] || null;
  }

  function setResultMode(mode) {
    elements.resultInitial.hidden = mode !== 'initial';
    elements.resultLoading.hidden = mode !== 'loading';
    elements.resultContent.hidden = mode !== 'content';
    elements.resultCard.setAttribute('aria-busy', String(mode === 'loading'));
  }

  function clearLocation() {
    state.locationSrc = null;
    state.locationLoadedSrc = null;
    elements.osmFrame.removeAttribute('src');
    elements.locationFrameWrap.hidden = true;
    elements.locationLoading.hidden = false;
    elements.locationEmpty.hidden = false;
    elements.locationTab.disabled = true;
    elements.googleMapsLink.hidden = true;
    switchMapView('reference');
  }

  function resetResult() {
    state.currentResult = null;
    elements.retrySearch.hidden = true;
    setResultMode('initial');
    renderExamples();
    clearLocation();
  }

  async function preloadImage(src) {
    const image = new Image();
    image.decoding = 'async';

    const loaded = new Promise((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(`Nem tölthető be: ${src}`));
    });

    image.src = src;
    await loaded;

    if (typeof image.decode === 'function') {
      try {
        await image.decode();
      } catch {
        // Az onload már igazolta, hogy a kép használható.
      }
    }

    return image;
  }

  async function loadCountryMap(countryCode) {
    const cfg = COUNTRIES[countryCode];
    const token = ++state.mapLoadToken;
    state.mapBusy = true;
    elements.mapLoading.hidden = false;
    elements.mapError.hidden = true;
    updateInputControls();

    try {
      await preloadImage(cfg.mapPath);
      if (token !== state.mapLoadToken || state.country !== countryCode) return false;

      elements.mapImage.src = cfg.mapPath;
      elements.mapImage.alt = cfg.mapAlt;

      if (typeof elements.mapImage.decode === 'function') {
        try {
          await elements.mapImage.decode();
        } catch {
          // A kép előtöltése már sikeres volt, a megjelenítés folytatható.
        }
      }

      if (token !== state.mapLoadToken || state.country !== countryCode) return false;
      state.mapLoadedCountry = countryCode;
      elements.mapLoading.hidden = true;
      resetMapView({ clearPrefix: false });
      return true;
    } catch {
      if (token !== state.mapLoadToken || state.country !== countryCode) return false;
      elements.mapLoading.hidden = true;
      elements.mapError.hidden = false;
      return false;
    } finally {
      if (token === state.mapLoadToken) {
        state.mapBusy = false;
        updateInputControls();
      }
    }
  }

  async function setCountry(code, options = {}) {
    if (!COUNTRIES[code]) return;

    if (state.requestController) {
      state.requestController.abort();
      state.requestController = null;
    }
    state.searchToken += 1;
    state.searching = false;
    state.country = code;
    state.prefix = null;

    const cfg = currentCountry();
    elements.countryTabs.forEach((tab) => {
      const active = tab.dataset.country === code;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });

    elements.input.value = '';
    elements.input.maxLength = cfg.postcodeLength;
    elements.input.placeholder = cfg.placeholder;
    elements.inputHint.textContent = cfg.hint;
    elements.mapCountryLabel.textContent = `${cfg.flag} ${cfg.name}`;
    elements.mapTitle.textContent = cfg.mapTitle;
    elements.buttonLabel.textContent = 'Keresés';
    setError('');
    resetResult();
    resetMapView({ clearPrefix: true });
    renderZonePicker();
    renderHistory();
    updateInputControls();

    await loadCountryMap(code);

    if (!options.silent) {
      elements.input.focus({ preventScroll: true });
    }
  }

  function getHistory() {
    try {
      const parsed = JSON.parse(safeStorage.getItem(HISTORY_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveHistory(result) {
    if (!result.verified) return;

    const next = getHistory().filter((item) => !(item.country === result.country && item.postcode === result.postcode));
    next.unshift({
      country: result.country,
      postcode: result.postcode,
      prefix: result.prefix,
      place: result.place,
      region: result.region,
      timestamp: Date.now()
    });

    safeStorage.setItem(HISTORY_KEY, JSON.stringify(next.slice(0, MAX_HISTORY)));
    renderHistory();
  }

  function renderHistory() {
    const history = getHistory().filter((item) => COUNTRIES[item.country]).slice(0, MAX_HISTORY);
    elements.historyChips.replaceChildren();
    elements.historyRow.hidden = history.length === 0;

    history.forEach((item) => {
      const cfg = COUNTRIES[item.country];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'history-chip';
      button.setAttribute('aria-label', `${cfg.name}, ${item.postcode}, ${item.place || 'korábbi keresés'}`);

      const flag = document.createElement('span');
      flag.textContent = cfg.flag;
      flag.setAttribute('aria-hidden', 'true');

      const postcode = document.createElement('strong');
      postcode.textContent = item.postcode;

      const place = document.createElement('span');
      place.textContent = item.place || cfg.name;

      button.append(flag, postcode, place);
      button.addEventListener('click', async () => {
        if (state.country !== item.country) await setCountry(item.country, { silent: true });
        elements.input.value = item.postcode;
        updateInputControls();
        await handleSearch(item.postcode);
      });

      elements.historyChips.appendChild(button);
    });
  }

  function renderExamples() {
    const cfg = currentCountry();
    elements.exampleRow.replaceChildren();

    cfg.examples.forEach((postcode) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'example-chip';
      button.textContent = postcode;
      button.addEventListener('click', async () => {
        elements.input.value = postcode;
        updateInputControls();
        await handleSearch(postcode);
      });
      elements.exampleRow.appendChild(button);
    });
  }

  function renderZonePicker() {
    const isHungary = state.country === 'HU';
    elements.zonePicker.hidden = !isHungary;
    elements.zonePickerPanel.replaceChildren();
    elements.zonePickerPanel.hidden = true;
    elements.zonePickerToggle.setAttribute('aria-expanded', 'false');

    if (!isHungary) return;

    Object.entries(COUNTRIES.HU.zones).forEach(([prefix, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `zone-chip${state.prefix === prefix ? ' is-active' : ''}`;
      button.textContent = `${prefix} · ${label}`;
      button.addEventListener('click', () => {
        state.prefix = prefix;
        focusMap(prefix);
        renderZonePickerActive();
      });
      elements.zonePickerPanel.appendChild(button);
    });
  }

  function renderZonePickerActive() {
    [...elements.zonePickerPanel.querySelectorAll('.zone-chip')].forEach((button) => {
      button.classList.toggle('is-active', button.textContent.startsWith(`${state.prefix} ·`));
    });
  }

  function getFocusPreset(prefix) {
    const cfg = currentCountry();

    if (state.country === 'HU' || state.country === 'DE') {
      return cfg.focus[prefix[0]] || [50, 50, 1.7];
    }

    const n = Number(prefix);
    if (n <= 6) return cfg.focus.central;
    if (n <= 9) return cfg.focus.sardinia;
    if (n <= 19) return cfg.focus.northWest;
    if (n <= 29) return cfg.focus.north;
    if (n <= 39) return cfg.focus.northEast;
    if (n <= 49) return cfg.focus.north;
    if (n <= 59) return cfg.focus.tuscany;
    if (n <= 69) return cfg.focus.adriatic;
    if (n <= 79) return cfg.focus.puglia;
    if (n <= 89) return cfg.focus.south;
    return cfg.focus.sicily;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function setMapZoom(nextZoom, options = {}) {
    const viewport = elements.mapScroll;
    const oldWidth = Math.max(elements.mapImage.scrollWidth, viewport.clientWidth);
    const oldHeight = Math.max(elements.mapImage.scrollHeight, viewport.clientHeight);
    const centerX = options.centerX ?? ((viewport.scrollLeft + viewport.clientWidth / 2) / oldWidth);
    const centerY = options.centerY ?? ((viewport.scrollTop + viewport.clientHeight / 2) / oldHeight);

    state.mapZoom = clamp(nextZoom, 1, 3.5);
    elements.mapImage.style.width = `${state.mapZoom * 100}%`;
    elements.mapImage.style.height = `${state.mapZoom * 100}%`;

    requestAnimationFrame(() => {
      const newWidth = Math.max(elements.mapImage.scrollWidth, viewport.clientWidth);
      const newHeight = Math.max(elements.mapImage.scrollHeight, viewport.clientHeight);
      viewport.scrollLeft = clamp(centerX * newWidth - viewport.clientWidth / 2, 0, Math.max(0, newWidth - viewport.clientWidth));
      viewport.scrollTop = clamp(centerY * newHeight - viewport.clientHeight / 2, 0, Math.max(0, newHeight - viewport.clientHeight));
    });
  }

  function resetMapView(options = {}) {
    if (options.clearPrefix !== false) {
      state.prefix = null;
      elements.selectedZone.hidden = true;
    }

    setMapZoom(1, { centerX: 0.5, centerY: 0.5 });
    elements.mapScroll.scrollLeft = 0;
    elements.mapScroll.scrollTop = 0;
    renderZonePickerActive();
  }

  function focusMap(prefix) {
    if (!prefix) return;
    const [x, y, zoom] = getFocusPreset(prefix);
    state.prefix = prefix;
    elements.selectedPrefix.textContent = prefix;
    elements.selectedZone.hidden = false;
    setMapZoom(zoom, { centerX: x / 100, centerY: y / 100 });
    renderZonePickerActive();
  }

  async function lookupPostcode(countryCode, postcode, signal) {
    const response = await fetch(`https://api.zippopotam.us/${countryCode}/${encodeURIComponent(postcode)}`, {
      signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });

    if (response.status === 404) {
      return { verified: false, notFound: true };
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const places = Array.isArray(data.places) ? data.places : [];
    const first = places[0];

    if (!first) return { verified: false, notFound: true };

    const latitude = Number(first.latitude);
    const longitude = Number(first.longitude);

    return {
      verified: true,
      notFound: false,
      place: first['place name'] || null,
      region: first.state || first['state abbreviation'] || null,
      latitude: Number.isFinite(latitude) ? latitude : null,
      longitude: Number.isFinite(longitude) ? longitude : null,
      count: places.length
    };
  }

  function setSearchBusy(busy) {
    state.searching = busy;
    elements.buttonLabel.textContent = busy ? 'Ellenőrzés…' : 'Keresés';
    updateInputControls();
  }

  async function handleSearch(postcodeOverride) {
    setError('');
    const postcode = String(postcodeOverride ?? elements.input.value).trim();
    const validationError = validatePostcode(postcode);

    if (validationError) {
      setError(validationError);
      elements.input.focus();
      updateInputControls();
      return;
    }

    const countryCode = state.country;
    const prefix = getPrefix(postcode, countryCode);
    const requestToken = ++state.searchToken;
    const previousResult = state.currentResult;

    if (state.requestController) state.requestController.abort();
    const controller = new AbortController();
    state.requestController = controller;
    const timeoutId = window.setTimeout(() => controller.abort(), 9000);

    state.prefix = prefix;
    focusMap(prefix);
    switchMapView('reference');
    setResultMode('loading');
    setSearchBusy(true);

    let lookup;
    try {
      lookup = await lookupPostcode(countryCode, postcode, controller.signal);
    } catch (error) {
      if (requestToken !== state.searchToken || countryCode !== state.country) return;
      lookup = { verified: false, networkError: true, aborted: error?.name === 'AbortError' };
    } finally {
      window.clearTimeout(timeoutId);
      if (state.requestController === controller) state.requestController = null;
      if (requestToken === state.searchToken) setSearchBusy(false);
    }

    if (requestToken !== state.searchToken || countryCode !== state.country) return;

    if (lookup.networkError && previousResult?.verified) {
      state.prefix = previousResult.prefix;
      focusMap(previousResult.prefix);
      showResult(previousResult, {
        retainedMessage: `A(z) ${postcode} online ellenőrzése nem sikerült. Az előző ellenőrzött találat maradt látható.`
      });
      elements.retrySearch.hidden = false;
      setError('Hálózati hiba. Az előző találatot megtartottuk.');
      return;
    }

    const result = {
      country: countryCode,
      postcode,
      prefix,
      place: lookup.place || null,
      region: lookup.region || null,
      latitude: Number.isFinite(lookup.latitude) ? lookup.latitude : null,
      longitude: Number.isFinite(lookup.longitude) ? lookup.longitude : null,
      verified: Boolean(lookup.verified),
      notFound: Boolean(lookup.notFound),
      networkError: Boolean(lookup.networkError),
      placeCount: lookup.count || 0,
      timestamp: Date.now()
    };

    showResult(result);
    saveHistory(result);
  }

  function buildLocationData(result) {
    const cfg = COUNTRIES[result.country];
    const mapsQuery = (result.latitude !== null && result.longitude !== null)
      ? `${result.latitude},${result.longitude}`
      : `${result.postcode}, ${cfg.name}`;

    elements.googleMapsLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;
    elements.googleMapsLink.hidden = false;

    if (result.latitude === null || result.longitude === null) {
      state.locationSrc = null;
      elements.locationTab.disabled = true;
      elements.showOnMap.disabled = true;
      elements.locationFrameWrap.hidden = true;
      elements.locationEmpty.hidden = false;
      return;
    }

    const lat = result.latitude;
    const lon = result.longitude;
    const latDelta = result.country === 'HU' ? 0.085 : 0.105;
    const lonDelta = result.country === 'HU' ? 0.13 : 0.16;
    const bbox = [lon - lonDelta, lat - latDelta, lon + lonDelta, lat + latDelta].join('%2C');

    state.locationSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`;
    state.locationLoadedSrc = null;
    elements.locationTab.disabled = false;
    elements.showOnMap.disabled = false;
    elements.locationEmpty.hidden = true;
    elements.locationFrameWrap.hidden = false;
    elements.locationLoading.hidden = false;
  }

  function showResult(result, options = {}) {
    state.currentResult = result;
    const cfg = COUNTRIES[result.country];
    const zoneRegion = getZoneRegion(result.prefix, result.country);

    setResultMode('content');
    elements.resultStatus.classList.toggle('is-warning', !result.verified || Boolean(options.retainedMessage));
    elements.retrySearch.hidden = !(result.networkError || options.retainedMessage);

    if (options.retainedMessage) {
      elements.resultStatusText.textContent = 'Előző ellenőrzött találat';
    } else if (result.verified) {
      elements.resultStatusText.textContent = result.placeCount > 1 ? 'Ellenőrzött találat · több bejegyzés' : 'Ellenőrzött találat';
    } else if (result.notFound) {
      elements.resultStatusText.textContent = 'A gyorskörzet meghatározható';
    } else {
      elements.resultStatusText.textContent = 'Online ellenőrzés nem elérhető';
    }

    elements.resultPostcode.textContent = result.postcode;
    elements.resultPlace.textContent = result.place || (result.notFound ? 'Nincs települési találat' : 'Nincs online adat');
    elements.resultZone.textContent = getZoneShort(result.prefix, result.country);
    elements.resultRegion.textContent = result.region || zoneRegion || '—';

    if (options.retainedMessage) {
      elements.resultMessage.textContent = options.retainedMessage;
    } else if (result.verified && result.placeCount > 1) {
      elements.resultMessage.textContent = `Az adatbázis ${result.placeCount} települési bejegyzést talált; az első találat látható.`;
    } else if (result.verified) {
      elements.resultMessage.textContent = 'A teljes irányítószám települési adatait online ellenőriztük.';
    } else if (result.notFound) {
      elements.resultMessage.textContent = 'A teljes irányítószám nem található az online adatbázisban. Ellenőrizd a számjegyeket.';
    } else {
      elements.resultMessage.textContent = 'A körzet az előtagból meghatározható, de a települési ellenőrzés most nem sikerült.';
    }

    elements.detailCountry.textContent = `${cfg.flag} ${cfg.name}`;
    elements.detailPrefix.textContent = result.prefix;
    elements.detailCoords.textContent = result.latitude !== null && result.longitude !== null
      ? `${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`
      : '—';
    elements.detailVerification.textContent = result.verified
      ? 'Zippopotam.us – sikeres'
      : result.notFound
        ? 'Zippopotam.us – nincs találat'
        : 'Zippopotam.us – hálózati hiba';

    buildLocationData(result);
  }

  function loadExactLocation() {
    if (!state.locationSrc) return;

    elements.locationEmpty.hidden = true;
    elements.locationFrameWrap.hidden = false;

    if (state.locationLoadedSrc === state.locationSrc) {
      elements.locationLoading.hidden = true;
      return;
    }

    elements.locationLoading.hidden = false;
    elements.osmFrame.src = state.locationSrc;
  }

  function switchMapView(view) {
    if (view === 'location' && elements.locationTab.disabled) return;

    const nextView = view === 'location' ? 'location' : 'reference';
    state.activeView = nextView;

    elements.viewTabs.forEach((tab) => {
      const active = tab.dataset.view === nextView;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });

    elements.referenceView.hidden = nextView !== 'reference';
    elements.locationView.hidden = nextView !== 'location';

    if (nextView === 'location') loadExactLocation();
  }

  async function copyResult() {
    const result = state.currentResult;
    if (!result) return;

    const cfg = COUNTRIES[result.country];
    const text = [
      `${result.postcode} – ${result.place || 'nincs települési adat'}`,
      `${getZoneShort(result.prefix, result.country)}${getZoneRegion(result.prefix, result.country) ? ` · ${getZoneRegion(result.prefix, result.country)}` : ''}`,
      `Régió / tartomány: ${result.region || '—'}`,
      `Ország: ${cfg.name}`,
      'F-TRANS Irányítószám-kereső'
    ].join('\n');

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const helper = document.createElement('textarea');
        helper.value = text;
        helper.style.position = 'fixed';
        helper.style.opacity = '0';
        document.body.appendChild(helper);
        helper.select();
        document.execCommand('copy');
        helper.remove();
      }
      showToast('Az eredményt a vágólapra másoltuk.');
    } catch {
      setError('A másolás nem sikerült. Próbáld meg újra.');
    }
  }

  function initMapDragging() {
    const viewport = elements.mapScroll;

    viewport.addEventListener('pointerdown', (event) => {
      if (state.mapZoom <= 1 || event.button !== 0) return;
      state.dragging = true;
      state.dragStartX = event.clientX;
      state.dragStartY = event.clientY;
      state.dragScrollLeft = viewport.scrollLeft;
      state.dragScrollTop = viewport.scrollTop;
      viewport.classList.add('is-dragging');
      viewport.setPointerCapture(event.pointerId);
    });

    viewport.addEventListener('pointermove', (event) => {
      if (!state.dragging) return;
      viewport.scrollLeft = state.dragScrollLeft - (event.clientX - state.dragStartX);
      viewport.scrollTop = state.dragScrollTop - (event.clientY - state.dragStartY);
    });

    const stopDragging = (event) => {
      if (!state.dragging) return;
      state.dragging = false;
      viewport.classList.remove('is-dragging');
      if (viewport.hasPointerCapture?.(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    };

    viewport.addEventListener('pointerup', stopDragging);
    viewport.addEventListener('pointercancel', stopDragging);

    viewport.addEventListener('wheel', (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setMapZoom(state.mapZoom + (event.deltaY < 0 ? 0.25 : -0.25));
    }, { passive: false });

    viewport.addEventListener('keydown', (event) => {
      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        setMapZoom(state.mapZoom + 0.25);
      } else if (event.key === '-') {
        event.preventDefault();
        setMapZoom(state.mapZoom - 0.25);
      } else if (event.key === '0' || event.key === 'Home') {
        event.preventDefault();
        resetMapView({ clearPrefix: true });
      }
    });
  }

  function bindEvents() {
    elements.countryTabs.forEach((tab) => {
      tab.addEventListener('click', () => void setCountry(tab.dataset.country));
      tab.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        const currentIndex = elements.countryTabs.indexOf(tab);
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        const nextIndex = (currentIndex + direction + elements.countryTabs.length) % elements.countryTabs.length;
        elements.countryTabs[nextIndex].focus();
        void setCountry(elements.countryTabs[nextIndex].dataset.country);
      });
    });

    elements.input.addEventListener('input', () => {
      const clean = sanitizeInput(elements.input.value).slice(0, currentCountry().postcodeLength);
      const changed = clean !== elements.input.value;
      elements.input.value = clean;
      setError(changed ? 'Csak számokat adj meg.' : '');
      updateInputControls();
    });

    elements.input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        elements.input.value = '';
        setError('');
        updateInputControls();
      }
    });

    elements.clearInput.addEventListener('click', () => {
      elements.input.value = '';
      setError('');
      updateInputControls();
      elements.input.focus();
    });

    elements.searchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      void handleSearch();
    });

    elements.clearHistory.addEventListener('click', () => {
      safeStorage.removeItem(HISTORY_KEY);
      renderHistory();
      showToast('A keresési előzményeket töröltük.');
    });

    elements.referenceTab.addEventListener('click', () => switchMapView('reference'));
    elements.locationTab.addEventListener('click', () => switchMapView('location'));

    elements.showOnMap.addEventListener('click', () => {
      switchMapView('location');
      if (window.matchMedia('(max-width: 820px)').matches) {
        elements.mapStage.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
      }
    });

    elements.googleMapsLink.addEventListener('click', (event) => {
      if (!elements.googleMapsLink.href || elements.googleMapsLink.href.endsWith('#')) {
        event.preventDefault();
      }
    });

    elements.copyResult.addEventListener('click', () => void copyResult());
    elements.retrySearch.addEventListener('click', () => void handleSearch(elements.input.value));

    elements.zoomIn.addEventListener('click', () => setMapZoom(state.mapZoom + 0.25));
    elements.zoomOut.addEventListener('click', () => setMapZoom(state.mapZoom - 0.25));
    elements.resetMap.addEventListener('click', () => resetMapView({ clearPrefix: true }));
    elements.retryMap.addEventListener('click', () => void loadCountryMap(state.country));

    elements.zonePickerToggle.addEventListener('click', () => {
      const open = elements.zonePickerToggle.getAttribute('aria-expanded') === 'true';
      elements.zonePickerToggle.setAttribute('aria-expanded', String(!open));
      elements.zonePickerPanel.hidden = open;
    });

    elements.osmFrame.addEventListener('load', () => {
      state.locationLoadedSrc = state.locationSrc;
      elements.locationLoading.hidden = true;
    });

    elements.themeToggle.addEventListener('click', () => {
      setTheme(elements.html.dataset.theme === 'dark' ? 'light' : 'dark');
    });

    elements.infoButton.addEventListener('click', () => {
      if (typeof elements.infoDialog.showModal === 'function') {
        elements.infoDialog.showModal();
      } else {
        elements.infoDialog.setAttribute('open', '');
      }
    });

    elements.infoDialog.addEventListener('click', (event) => {
      if (event.target === elements.infoDialog) elements.infoDialog.close();
    });

    window.addEventListener('resize', () => {
      if (state.mapZoom === 1) resetMapView({ clearPrefix: false });
    });
  }

  async function init() {
    initTheme();
    bindEvents();
    initMapDragging();
    renderHistory();
    renderExamples();
    renderZonePicker();
    updateInputControls();
    await loadCountryMap('HU');
  }

  void init();
})();
