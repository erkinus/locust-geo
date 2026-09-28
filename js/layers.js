// Добавление источников и слоёв на карту. Этап 4: только контуры/маркеры,
// без стилизации по показателям (это этап 5) — фиксированные цвета/толщины.

import {
  DATA_URLS, SOURCE_IDS, LAYER_IDS,
  ALL_TERRITORY_LAYERS, TERRITORY_LAYERS, SETTLEMENT_LAYERS, ZONE_LAYERS,
  SETTLEMENT_RANK_STYLE, SETTLEMENT_RANK_DEFAULT,
  ZONE_COLORS, ZONE_COLOR_DEFAULT,
} from "./config.js";
import { loadGeoJson } from "./data.js";
import { getLang } from "./i18n.js";

function zoneColorExpression() {
  const stops = ["match", ["get", "descr"]];
  for (const [zone, color] of Object.entries(ZONE_COLORS)) {
    stops.push(zone, color);
  }
  stops.push(ZONE_COLOR_DEFAULT);
  return stops;
}

function settlementRadiusExpression() {
  const stops = ["match", ["get", "adm_type"]];
  for (const [rank, style] of Object.entries(SETTLEMENT_RANK_STYLE)) {
    stops.push(rank, style.radius);
  }
  stops.push(SETTLEMENT_RANK_DEFAULT.radius);
  return stops;
}

function settlementTextSizeExpression() {
  const stops = ["match", ["get", "adm_type"]];
  for (const [rank, style] of Object.entries(SETTLEMENT_RANK_STYLE)) {
    stops.push(rank, style.textSize);
  }
  stops.push(SETTLEMENT_RANK_DEFAULT.textSize);
  return stops;
}

async function addSource(map, id, url, { promoteId } = {}) {
  const geojson = await loadGeoJson(url);
  if (!map.getSource(id)) {
    map.addSource(id, { type: "geojson", data: geojson, ...(promoteId ? { promoteId } : {}) });
  }
  return geojson;
}

export async function addAllLayers(map) {
  // -- Казахстан: только внешняя граница, всегда видима, не переключается --
  await addSource(map, SOURCE_IDS.kazakhstan, DATA_URLS.kazakhstan);
  map.addLayer({
    id: LAYER_IDS.kazakhstanLine,
    type: "line",
    source: SOURCE_IDS.kazakhstan,
    paint: { "line-color": "#333333", "line-width": 1.6 },
  });

  // -- Области (promoteId — для setFeatureState по ADM1_PCODE в render.js) --
  await addSource(map, SOURCE_IDS.regions, DATA_URLS.regions, { promoteId: "ADM1_PCODE" });
  map.addLayer({
    id: LAYER_IDS.regionsFill,
    type: "fill",
    source: SOURCE_IDS.regions,
    paint: { "fill-color": ["coalesce", ["feature-state", "fillColor"], "#7a9cc6"], "fill-opacity": 0.75 },
  });
  map.addLayer({
    id: LAYER_IDS.regionsLine,
    type: "line",
    source: SOURCE_IDS.regions,
    paint: { "line-color": "#3a5a8c", "line-width": 1.2 },
  });

  // -- Районы (promoteId — для setFeatureState по ADM2_PCODE в render.js) --
  await addSource(map, SOURCE_IDS.districts, DATA_URLS.districts, { promoteId: "ADM2_PCODE" });
  map.addLayer({
    id: LAYER_IDS.districtsFill,
    type: "fill",
    source: SOURCE_IDS.districts,
    paint: { "fill-color": ["coalesce", ["feature-state", "fillColor"], "#8cb68c"], "fill-opacity": 0.75 },
  });
  map.addLayer({
    id: LAYER_IDS.districtsLine,
    type: "line",
    source: SOURCE_IDS.districts,
    paint: { "line-color": "#4c7a4c", "line-width": 0.8 },
  });

  // -- Агроклиматические зоны: раскраска по категориальной легенде заказчика
  // (отдельный независимый режим, изначально выключен) --
  await addSource(map, SOURCE_IDS.agrozones, DATA_URLS.agrozones);
  map.addLayer({
    id: LAYER_IDS.agrozonesFill,
    type: "fill",
    source: SOURCE_IDS.agrozones,
    paint: { "fill-color": zoneColorExpression(), "fill-opacity": 0.55 },
    layout: { visibility: "none" },
  });
  map.addLayer({
    id: LAYER_IDS.agrozonesLine,
    type: "line",
    source: SOURCE_IDS.agrozones,
    paint: { "line-color": "#5a5a5a", "line-width": 0.8 },
    layout: { visibility: "none" },
  });

  // -- Населённые пункты: маркер + подпись, размер по рангу adm_type.
  // Отдельный независимый режим (чекбокс), изначально выключен --
  await addSource(map, SOURCE_IDS.settlements, DATA_URLS.settlements);
  map.addLayer({
    id: LAYER_IDS.settlementsCircle,
    type: "circle",
    source: SOURCE_IDS.settlements,
    paint: {
      "circle-radius": settlementRadiusExpression(),
      "circle-color": "#b23a48",
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1,
    },
    layout: { visibility: "none" },
  });
  map.addLayer({
    id: LAYER_IDS.settlementsLabel,
    type: "symbol",
    source: SOURCE_IDS.settlements,
    layout: {
      "text-field": ["get", getLang() === "kk" ? "name_kk" : "name_ru"],
      "text-size": settlementTextSizeExpression(),
      "text-offset": [0, 1.1],
      "text-anchor": "top",
      "text-font": ["Noto Sans Regular"],
      visibility: "none",
    },
    paint: {
      "text-color": "#3a1520",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.2,
    },
  });

  // -- Точки наблюдений: показываются ВСЕГДА, переключателем «Территория» не скрываются.
  // promoteId — для setFeatureState (радиус/цвет по выбранному виду, см. render.js) --
  await addSource(map, SOURCE_IDS.points, DATA_URLS.points, { promoteId: "point_id" });
  map.addLayer({
    id: LAYER_IDS.pointsCircle,
    type: "circle",
    source: SOURCE_IDS.points,
    paint: {
      "circle-radius": ["coalesce", ["feature-state", "radius"], 4],
      "circle-color": ["coalesce", ["feature-state", "fillColor"], "#2f6f3e"],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1,
    },
  });

  // по умолчанию видимы только области — остальные состояния переключателя Территории скрыты
  for (const id of ALL_TERRITORY_LAYERS) {
    if (!TERRITORY_LAYERS.regions.includes(id)) {
      map.setLayoutProperty(id, "visibility", "none");
    }
  }
}

export function setActiveTerritory(map, territoryId) {
  for (const [id, layerIds] of Object.entries(TERRITORY_LAYERS)) {
    const visible = id === territoryId;
    for (const layerId of layerIds) {
      map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
    }
  }
}

export function setZonesVisible(map, visible) {
  for (const layerId of ZONE_LAYERS) {
    map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
  }
}

export function setSettlementsVisible(map, visible) {
  for (const layerId of SETTLEMENT_LAYERS) {
    map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
  }
}

// Подписи нас. пунктов на карте — MapLibre-выражение не читает JS-состояние
// само, поэтому при смене языка (lang-switch.js) дёргаем это явно.
export function setSettlementLabelLanguage(map, lang) {
  map.setLayoutProperty(LAYER_IDS.settlementsLabel, "text-field", ["get", lang === "kk" ? "name_kk" : "name_ru"]);
}
