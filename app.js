(async () => {
  const maplibregl = await import('https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.mjs');

  // カスタマイズする値はここにまとめています。設定方法は README.md を参照してください。
  const SETTINGS = {
    map: {
      styles: {
        dark: 'https://tiles.openfreemap.org/styles/dark',
        positron: 'https://tiles.openfreemap.org/styles/positron'
      },
      initialStyle: 'dark',
      initialPinMode: 'multiple', // 'single' | 'multiple'
      height: 400,
      zoom: 16,
      minZoom: 15,
      maxZoom: 17,
      pitch: 60,
      bearing: -45,
      padding: { top: 100, bottom: 0, left: 0, right: 0 },
      rotationEnabled: true,
      pinLayerOrder: 'reverse', // 同じ画面上の高さに並ぶピンの優先順: 'normal' | 'reverse'
      showScale: true,
      show3D: true,
      buildingSourceUrl: 'https://tiles.openfreemap.org/planet',
      buildingColor: '#69d8ed',
      defaultBuildingHeight: 10,
      buildingOpacity: 0.88,
      buildingStartZoom: 15,
      buildingFullZoom: 16,
      animationDuration: 650
    },
    mainPin: {
      id: 'A',
      name: '大通公園 3丁目',
      address: '〒060-0042 北海道札幌市中央区大通西3丁目',
      lng: 141.35290009102954,
      lat: 43.060641983971394,
      iconUrl: './images/pin-a.png',
      height: 128,
      color: '#69ecff',
      baseZoom: 16,
      zoomMultiplier: 2,
      minScale: 1,
      maxScale: 3
    },
    optionalPins: [
      {
        id: 'B',
        enabled: true,
        name: '大通公園 4丁目',
        address: '〒060-0042 北海道札幌市中央区大通西4丁目',
        lng: 141.35140878286953,
        lat: 43.06044601303053,
        iconUrl: './images/pin-b.png',
        height: 128,
        color: '#9dfc7a',
        baseZoom: 16,
        zoomMultiplier: 2,
        minScale: 1,
        maxScale: 3
      },
      {
        id: 'C',
        enabled: true,
        name: '大通公園 5丁目',
        address: '〒060-0042 北海道札幌市中央区大通西5丁目',
        lng: 141.3498404924848,
        lat: 43.06021561718595,
        iconUrl: './images/pin-c.png',
        height: 128,
        color: '#ffcc66',
        baseZoom: 16,
        zoomMultiplier: 2,
        minScale: 1,
        maxScale: 3
      }
    ]
  };

  const config = SETTINGS.map;
  const mainPin = SETTINGS.mainPin;
  const points = [
    mainPin,
    ...SETTINGS.optionalPins.filter((point) =>
      point.enabled !== false && Number.isFinite(point.lng) && Number.isFinite(point.lat)
    )
  ];
  const rotationAngles = [0, 90, 180, 270].map((angle) => config.bearing + angle);

  const shell = document.getElementById('holo-map-shell');
  const status = document.getElementById('map-status');
  const card = document.getElementById('holo-place-card');
  const cardClose = document.getElementById('holo-card-close');
  const placeName = document.getElementById('place-name');
  const placeAddress = document.getElementById('place-address');
  const placeLink = document.getElementById('place-map-link');
  const hudZoom = document.getElementById('hud-zoom');
  const hudPitch = document.getElementById('hud-pitch');
  const hudBearing = document.getElementById('hud-bearing');
  const mobileCardMedia = window.matchMedia('(max-width: 1024px)');

  shell.style.setProperty('--map-height', config.height + 'px');

  let currentStyle = config.initialStyle;
  let requestedStyle = null;
  let pinMode = config.initialPinMode;
  let rotationIndex = 0;
  let selectedPointId = mainPin.id;
  const markerEntries = [];

  const map = new maplibregl.Map({
    container: 'holo-map',
    style: config.styles[currentStyle],
    center: [mainPin.lng, mainPin.lat],
    zoom: config.zoom,
    minZoom: config.minZoom,
    maxZoom: config.maxZoom,
    pitch: config.pitch,
    bearing: config.bearing,
    canvasContextAttributes: { antialias: true }
  });

  map.setPadding(config.padding);
  map.scrollZoom.enable({ around: 'center' });
  map.dragRotate.disable();
  map.touchZoomRotate.disableRotation();
  map.keyboard.disableRotation();
  map.touchPitch?.disable();

  function publishState() {
    document.dispatchEvent(new CustomEvent('holo-map:state', {
      detail: {
        style: requestedStyle ?? currentStyle,
        pinMode,
        changingStyle: requestedStyle !== null
      }
    }));
  }

  function showLocation(point, revealCard = true) {
    selectedPointId = point.id;
    placeName.textContent = point.name;
    placeAddress.textContent = point.address;
    placeLink.href = 'https://www.google.com/maps/search/?api=1&query=' +
      encodeURIComponent(point.lat + ',' + point.lng);
    if (revealCard) card.classList.add('is-open');

    card.classList.remove('is-highlighted');
    void card.offsetWidth;
    card.classList.add('is-highlighted');
  }

  function updateHud() {
    hudZoom.textContent = 'ZOOM ' + map.getZoom().toFixed(1);
    hudPitch.textContent = 'PITCH ' + Math.round(map.getPitch()) + '°';
    hudBearing.textContent = 'BEARING ' + Math.round(map.getBearing()) + '°';
  }

  function updateMarkerOrder() {
    const visibleEntries = markerEntries.filter((entry) => entry.visible);
    const ordered = config.rotationEnabled
      ? visibleEntries.map((entry) => ({
        ...entry,
        y: map.project([entry.point.lng, entry.point.lat]).y
      })).sort((a, b) => a.y - b.y || (
        config.pinLayerOrder === 'reverse' ? b.index - a.index : a.index - b.index
      ))
      : visibleEntries.sort((a, b) => (
        config.pinLayerOrder === 'reverse' ? b.index - a.index : a.index - b.index
      ));

    ordered.forEach((entry, index) => {
      entry.element.style.zIndex = String(index + 1);
    });
  }

  function install3DBuildings() {
    if (!config.show3D || map.getLayer('holo-buildings-3d')) return;

    const firstLabel = map.getStyle().layers.find(
      (layer) => layer.type === 'symbol' && layer.layout?.['text-field']
    );
    if (!map.getSource('holo-buildings-source')) {
      map.addSource('holo-buildings-source', {
        type: 'vector',
        url: config.buildingSourceUrl
      });
    }

    // setStyle() で独自レイヤーは消えるため、style.load のたびに再登録する。
    map.addLayer({
      id: 'holo-buildings-3d',
      type: 'fill-extrusion',
      source: 'holo-buildings-source',
      'source-layer': 'building',
      minzoom: config.buildingStartZoom,
      filter: ['!=', ['get', 'hide_3d'], true],
      paint: {
        'fill-extrusion-color': config.buildingColor,
        'fill-extrusion-height': [
          'interpolate', ['linear'], ['zoom'],
          config.buildingStartZoom, 0,
          config.buildingFullZoom, ['coalesce', ['get', 'render_height'], config.defaultBuildingHeight]
        ],
        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
        'fill-extrusion-opacity': config.buildingOpacity
      }
    }, firstLabel?.id);
  }

  function fallbackPinUrl(color) {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 112">
        <path d="M48 4C24 4 6 22 6 46c0 31 42 62 42 62s42-31 42-62C90 22 72 4 48 4Z"
          fill="${color}" stroke="#e7ffff" stroke-width="4" />
        <circle cx="48" cy="43" r="22" fill="#082334" />
      </svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function makeMarker(point) {
    const element = document.createElement('div');
    element.className = 'holo-marker';
    element.setAttribute('role', 'button');
    element.setAttribute('tabindex', '0');
    element.setAttribute('aria-label', point.name + 'の情報を表示');

    const image = document.createElement('img');
    image.alt = point.name;
    image.src = point.iconUrl?.trim() || fallbackPinUrl(point.color || '#69ecff');
    image.onerror = () => {
      image.onerror = null;
      image.src = fallbackPinUrl(point.color || '#69ecff');
    };
    element.appendChild(image);

    element.addEventListener('click', (event) => {
      event.stopPropagation();
      showLocation(point);
    });
    element.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      event.stopPropagation();
      showLocation(point);
    });

    const updateSize = () => {
      const scale = Math.max(
        point.minScale ?? 1,
        Math.min(
          point.maxScale ?? 3,
          Math.pow(point.zoomMultiplier ?? 2, map.getZoom() - (point.baseZoom ?? 16))
        )
      );
      const height = point.height * scale;
      const aspectRatio = image.naturalWidth && image.naturalHeight
        ? image.naturalWidth / image.naturalHeight
        : 1;

      // 横幅を固定すると、透明PNGの当たり判定が隣接するマーカーへ広がりやすい。
      element.style.width = height * aspectRatio + 'px';
      element.style.height = height + 'px';
    };

    image.addEventListener('load', updateSize);
    map.on('zoom', updateSize);
    updateSize();
    return element;
  }

  function setPinMode(mode) {
    if (mode !== 'single' && mode !== 'multiple') return;
    pinMode = mode;
    markerEntries.forEach((entry) => {
      entry.visible = mode === 'multiple' || entry.point.id === mainPin.id;
      entry.element.style.display = entry.visible ? '' : 'none';
    });
    if (mode === 'single' && selectedPointId !== mainPin.id) {
      showLocation(mainPin, false);
    }
    updateMarkerOrder();
    publishState();
  }

  function setMapStyle(key) {
    if (!Object.hasOwn(config.styles, key) || requestedStyle !== null || key === currentStyle) return;
    requestedStyle = key;
    publishState();
    map.setStyle(config.styles[key]);
  }

  function resetView() {
    rotationIndex = 0;
    map.stop();
    map.easeTo({
      center: [mainPin.lng, mainPin.lat],
      zoom: config.zoom,
      pitch: config.pitch,
      bearing: config.bearing,
      padding: config.padding,
      duration: config.animationDuration
    });
    showLocation(mainPin, false);
    card.classList.toggle('is-open', !mobileCardMedia.matches);
    updateMarkerOrder();
  }

  function customControl(className, label, title, action) {
    return {
      onAdd() {
        const container = document.createElement('div');
        container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.title = title;
        button.setAttribute('aria-label', title);
        button.textContent = label;
        button.addEventListener('click', () => action(button));
        container.appendChild(button);
        this.container = container;
        return container;
      },
      onRemove() {
        this.container.remove();
      }
    };
  }

  function rotateView(button) {
    if (button.disabled) return;
    rotationIndex = (rotationIndex + 1) % rotationAngles.length;
    const targetBearing = rotationAngles[rotationIndex];
    const difference = ((targetBearing - map.getBearing() + 540) % 360) - 180;
    if (Math.abs(difference) < 0.001) {
      updateMarkerOrder();
      return;
    }
    button.disabled = true;
    map.once('moveend', () => {
      updateMarkerOrder();
      button.disabled = false;
    });
    map.easeTo({ bearing: targetBearing, duration: config.animationDuration });
  }

  // 初期表示とイベントの登録
  showLocation(mainPin, false);
  card.classList.toggle('is-open', !mobileCardMedia.matches);
  card.addEventListener('animationend', () => card.classList.remove('is-highlighted'));
  cardClose.addEventListener('click', () => card.classList.remove('is-open'));
  mobileCardMedia.addEventListener('change', (event) => {
    card.classList.toggle('is-open', !event.matches);
  });

  map.addControl(new maplibregl.NavigationControl({
    showZoom: true,
    showCompass: false
  }), 'top-right');
  if (config.rotationEnabled) {
    map.addControl(customControl(
      'holo-rotate-button', '↻', '地図を右に90度回転', rotateView
    ), 'top-right');
  }
  map.addControl(customControl(
    'holo-reset-button', 'RESET', '地図を初期表示に戻す', resetView
  ), 'top-right');
  if (config.showScale) {
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 150, unit: 'metric' }), 'bottom-left');
  }

  points.forEach((point, index) => {
    const element = makeMarker(point);
    new maplibregl.Marker({ element, anchor: 'bottom' })
      .setLngLat([point.lng, point.lat])
      .addTo(map);
    markerEntries.push({ element, point, index, visible: true });
  });
  setPinMode(pinMode);

  map.on('move', () => {
    updateHud();
    if (config.rotationEnabled) updateMarkerOrder();
  });
  map.on('style.load', () => {
    install3DBuildings();
    if (requestedStyle !== null) {
      currentStyle = requestedStyle;
      requestedStyle = null;
      publishState();
    }
  });
  map.on('load', () => {
    status.hidden = true;
    document.dispatchEvent(new CustomEvent('holo-map:ready'));
    publishState();
  });

  document.addEventListener('holo-map:request-style', (event) => {
    setMapStyle(event.detail?.style);
  });
  document.addEventListener('holo-map:request-pins', (event) => {
    setPinMode(event.detail?.mode);
  });
  updateHud();
})().catch((error) => {
  console.error('3D地図の読み込みに失敗しました。', error);
  const status = document.getElementById('map-status');
  if (status) status.textContent = '地図を読み込めませんでした。通信環境を確認してください。';
});
