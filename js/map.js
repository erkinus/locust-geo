// Инициализация карты MapLibre GL поверх подложки Carto Positron.

import { BASEMAP_STYLE_URL, MAP_INITIAL_VIEW, MAP_MAX_BOUNDS } from "./config.js";

export function createMap(containerId) {
  const map = new maplibregl.Map({
    container: containerId,
    style: BASEMAP_STYLE_URL,
    center: MAP_INITIAL_VIEW.center,
    zoom: MAP_INITIAL_VIEW.zoom,
    minZoom: MAP_INITIAL_VIEW.minZoom,
    maxZoom: MAP_INITIAL_VIEW.maxZoom,
    maxBounds: MAP_MAX_BOUNDS, // не даём панорамировать/зумиться далеко за пределы РК
    attributionControl: true,
  });

  map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "top-right");
  map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

  return map;
}

export function onMapReady(map) {
  return new Promise((resolve) => {
    if (map.isStyleLoaded()) {
      resolve();
    } else {
      map.once("load", () => resolve());
    }
  });
}
