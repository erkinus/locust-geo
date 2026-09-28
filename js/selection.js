// Хлебные крошки и drill-down (prompts/06_popups_panels.md, пп.2,4).
// selection.path — путь от Казахстана до текущего объекта; scope, выведенный из
// него, используется render.js, чтобы отфильтровать районы/точки при переходе
// «область → её районы» и т.п.

export function goToRoot(selection) {
  selection.path = [];
}

export function goToCrumb(selection, index) {
  selection.path = selection.path.slice(0, index + 1);
}

export function selectZone(selection, zoneId) {
  selection.path = [{ level: "zone", id: zoneId, label: zoneId }];
}

export function selectRegion(selection, id, label) {
  selection.path = [{ level: "region", id, label }];
}

export function selectDistrict(selection, id, label, regionId, regionLabel) {
  const path = [];
  if (regionId) path.push({ level: "region", id: regionId, label: regionLabel ?? regionId });
  path.push({ level: "district", id, label });
  selection.path = path;
}

export function selectPoint(selection, point, regionLabel, districtLabel) {
  const path = [];
  if (point.region_id) path.push({ level: "region", id: point.region_id, label: regionLabel ?? point.region_id });
  if (point.district_id) path.push({ level: "district", id: point.district_id, label: districtLabel ?? point.district_id });
  path.push({ level: "point", id: point.point_id, label: point.point_id });
  selection.path = path;
}

/** Текущий уровень выбора для отрисовки панели результатов. */
export function currentLevel(selection) {
  if (!selection.path.length) return { level: "country", id: null };
  return selection.path[selection.path.length - 1];
}

/** Область/район, в границах которых нужно ограничить районы/точки на карте
 * (drill-down «область → её районы»). Зона в scope НЕ входит — фильтр по зоне
 * уже покрыт отдельным мультиселектом state.selectedZones. */
export function scopeOf(selection) {
  const region = selection.path.find((p) => p.level === "region");
  const district = selection.path.find((p) => p.level === "district");
  return { regionId: region?.id ?? null, districtId: district?.id ?? null };
}

/** Bounding box [[minX,minY],[maxX,maxY]] geometry-фичи (Polygon/MultiPolygon/Point). */
export function featureBounds(feature) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const walk = (coords) => {
    if (typeof coords[0] === "number") {
      const [x, y] = coords;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    } else {
      coords.forEach(walk);
    }
  };
  walk(feature.geometry.coordinates);
  return [[minX, minY], [maxX, maxY]];
}
