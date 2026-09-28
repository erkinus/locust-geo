// Клики по объектам карты → drill-down (хлебные крошки, приближение, переход
// «область → её районы»). prompts/06_popups_panels.md, пп.2,4.

import { LAYER_IDS, MAP_INITIAL_VIEW } from "./config.js";
import {
  goToRoot, goToCrumb, selectZone, selectRegion, selectDistrict, selectPoint, featureBounds,
} from "./selection.js";
import { syncFilterControls, selectSpecies } from "./filters.js";
import { POPUP_LAYER_PRIORITY, showPopup, initPopupCursor } from "./popups.js";
import { pickPlaceName } from "./i18n.js";
import { setActiveTerritory, setZonesVisible, setSettlementsVisible } from "./layers.js";

function unionBounds(boundsList) {
  let [minX, minY] = [Infinity, Infinity];
  let [maxX, maxY] = [-Infinity, -Infinity];
  for (const [[x0, y0], [x1, y1]] of boundsList) {
    minX = Math.min(minX, x0); minY = Math.min(minY, y0);
    maxX = Math.max(maxX, x1); maxY = Math.max(maxY, y1);
  }
  return [[minX, minY], [maxX, maxY]];
}

// Общий вызов fitBounds для drill-down: щедрый отступ (граница объекта не
// должна упираться в край экрана/попап) + maxZoom (не приближать сильнее
// разумного даже для совсем маленького района).
function fitToBounds(map, bounds, { padding, maxZoom }) {
  map.fitBounds(bounds, { padding, maxZoom, duration: 500 });
}

export function initInteractions(map, state, data, render, renderPanel) {
  function refresh() {
    render(state);
    syncFilterControls(state);
    renderPanel(state);
  }

  function findFeature(geo, idProp, id) {
    return geo.features.find((f) => f.properties[idProp] === id);
  }

  function goToRootAndRefresh() {
    goToRoot(state.selection);
    state.territory = "regions";
    state.selectedZones = [];
    map.flyTo({ center: MAP_INITIAL_VIEW.center, zoom: MAP_INITIAL_VIEW.zoom });
    refresh();
  }

  function positionForTop(top) {
    if (!top) return;
    if (top.level === "region") {
      state.territory = "districts";
      const f = findFeature(data.regionsGeo, "ADM1_PCODE", top.id);
      if (f) fitToBounds(map, featureBounds(f), { padding: 80, maxZoom: 8.5 });
    } else if (top.level === "district") {
      const f = findFeature(data.districtsGeo, "ADM2_PCODE", top.id);
      if (f) fitToBounds(map, featureBounds(f), { padding: 100, maxZoom: 10.5 });
    } else if (top.level === "point") {
      const f = findFeature(data.pointsGeo, "point_id", top.id);
      if (f) map.flyTo({ center: [f.properties.lon, f.properties.lat], zoom: Math.max(map.getZoom(), 9) });
    } else if (top.level === "zone") {
      state.selectedZones = [top.id];
    }
  }

  function goToCrumbAndRefresh(index) {
    goToCrumb(state.selection, index);
    const top = state.selection.path[state.selection.path.length - 1];
    if (!top) return goToRootAndRefresh();
    positionForTop(top);
    refresh();
  }

  function onSelectRegion(feature) {
    const id = feature.properties.ADM1_PCODE;
    selectRegion(state.selection, id, pickPlaceName(feature.properties, feature.properties.ADM1_RU));
    state.territory = "districts";
    fitToBounds(map, featureBounds(feature), { padding: 80, maxZoom: 8.5 });
    refresh();
  }

  function onSelectDistrict(feature) {
    const p = feature.properties;
    const regionFeature = findFeature(data.regionsGeo, "ADM1_PCODE", p.ADM1_PCODE);
    selectDistrict(
      state.selection, p.ADM2_PCODE, pickPlaceName(p, p.ADM2_EN),
      p.ADM1_PCODE, regionFeature && pickPlaceName(regionFeature.properties, regionFeature.properties.ADM1_RU)
    );
    fitToBounds(map, featureBounds(feature), { padding: 100, maxZoom: 10.5 });
    refresh();
  }

  function onSelectPoint(feature) {
    const p = feature.properties;
    const regionFeature = p.region_id ? findFeature(data.regionsGeo, "ADM1_PCODE", p.region_id) : null;
    const districtFeature = p.district_id ? findFeature(data.districtsGeo, "ADM2_PCODE", p.district_id) : null;
    selectPoint(
      state.selection, p,
      regionFeature && pickPlaceName(regionFeature.properties, regionFeature.properties.ADM1_RU),
      districtFeature && pickPlaceName(districtFeature.properties, districtFeature.properties.ADM2_EN)
    );
    map.flyTo({ center: [p.lon, p.lat], zoom: Math.max(map.getZoom(), 9) });
    refresh();
  }

  // Клик по виду в таблице результатов (panels.js) → выбрать его в фильтре
  // «Вид» и показать данные на карте (хороплет + точки), не трогая drill-down.
  function selectSpeciesOnMap(speciesId) {
    selectSpecies(state, speciesId);
    render(state);
  }

  function onSelectZone(feature) {
    const zoneId = feature.properties.descr;
    selectZone(state.selection, zoneId);
    state.selectedZones = [zoneId];
    const matching = data.districtsGeo.features.filter((f) => f.properties.descr === zoneId);
    if (matching.length) fitToBounds(map, unionBounds(matching.map(featureBounds)), { padding: 60, maxZoom: 7 });
    refresh();
  }

  function labelForPathEntry(entry) {
    if (entry.level === "region") {
      const f = findFeature(data.regionsGeo, "ADM1_PCODE", entry.id);
      return f ? pickPlaceName(f.properties, f.properties.ADM1_RU) : entry.id;
    }
    if (entry.level === "district") {
      const f = findFeature(data.districtsGeo, "ADM2_PCODE", entry.id);
      return f ? pickPlaceName(f.properties, f.properties.ADM2_EN) : entry.id;
    }
    return entry.id;
  }

  // Восстановление из URL (urlstate.js) при загрузке страницы — та же логика
  // позиционирования карты, что и у обычного клика/хлебной крошки, только путь
  // приходит из ссылки, а не строится кликами.
  function restoreFromUrl(parsed) {
    state.territory = parsed.territory;
    state.species = parsed.species;
    state.indicator = parsed.indicator;
    state.showZonesLayer = parsed.showZonesLayer;
    state.showSettlements = parsed.showSettlements;
    state.selectedZones = parsed.selectedZones;
    state.selection.path = parsed.selPath.map((entry) => ({ ...entry, label: labelForPathEntry(entry) }));

    setActiveTerritory(map, state.territory);
    setZonesVisible(map, state.showZonesLayer);
    setSettlementsVisible(map, state.showSettlements);
    positionForTop(state.selection.path[state.selection.path.length - 1]);
    refresh();
  }

  const SELECTORS = {
    [LAYER_IDS.pointsCircle]: onSelectPoint,
    [LAYER_IDS.districtsFill]: onSelectDistrict,
    [LAYER_IDS.regionsFill]: onSelectRegion,
    [LAYER_IDS.agrozonesFill]: onSelectZone,
    // населённые пункты — только попап, без drill-down (нет связи с районом, см. этап 1)
    [LAYER_IDS.settlementsCircle]: null,
  };

  // Точка стоит поверх района поверх области — при клике MapLibre независимо
  // шлёт click КАЖДОМУ слою с фичей под курсором. Один обработчик на карту +
  // queryRenderedFeatures с приоритетом (POPUP_LAYER_PRIORITY) вместо отдельных
  // map.on('click', layerId, …) — иначе всплывало сразу два попапа одним кликом.
  map.on("click", (e) => {
    const hits = map.queryRenderedFeatures(e.point, { layers: POPUP_LAYER_PRIORITY });
    if (!hits.length) return;
    const winningLayerId = POPUP_LAYER_PRIORITY.find((id) => hits.some((f) => f.layer.id === id));
    const feature = hits.find((f) => f.layer.id === winningLayerId);
    if (!feature) return;

    showPopup(map, e.lngLat, winningLayerId, feature.properties, data);
    const selector = SELECTORS[winningLayerId];
    if (selector) selector(feature);
  });

  initPopupCursor(map);

  return { goToRoot: goToRootAndRefresh, goToCrumb: goToCrumbAndRefresh, selectSpeciesOnMap, restoreFromUrl };
}
