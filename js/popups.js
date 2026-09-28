// Попапы по клику — содержимое по уровням из docs/TZ.md «Уровни» 2–5
// (prompts/06_popups_panels.md, п.1): N точек, число видов, TOP-5 видов
// (численность/встречаемость/доминирование/класс); для точки — полный список видов.

import { LAYER_IDS } from "./config.js";
import { t, tZone, tMassClass, pickPlaceName, pickSpeciesName } from "./i18n.js";

function row(label, value) {
  return `<div class="popup-row"><span>${label}</span><span>${value}</span></div>`;
}

function topSpeciesTable(statsRows, unitId, data, { limit = 5 } = {}) {
  const rows = statsRows
    .filter((r) => r.unit_id === unitId)
    .sort((a, b) => b.dominance_pct - a.dominance_pct)
    .slice(0, limit);
  if (!rows.length) return `<p class='popup-empty'>${t("no_observations")}</p>`;
  // Рейтинг не показываем отдельной колонкой — ТОП-5 и так отсортирован по
  // доминированию, место в списке (1..5) уже и есть рейтинг, дублировать некуда
  // (таблица и так упирается в ширину попапа с добавлением ИФЗ).
  const body = rows
    .map((r) => {
      const sp = data.speciesById.get(r.species_id);
      return `<tr>
        <td>${pickSpeciesName(sp, r.name_ru ?? r.latin)}</td>
        <td>${r.abundance_total}</td>
        <td>${r.frequency_pct.toFixed(1)}%</td>
        <td>${r.dominance_pct.toFixed(1)}%</td>
        <td>${tMassClass(r.mass_class)}</td>
        <td>${sp?.ifz?.toFixed(1) ?? "—"}</td>
      </tr>`;
    })
    .join("");
  return `
    <div class="popup-table-scroll"><table class="popup-table">
      <thead><tr><th>${t("col_species")}</th><th>N</th><th>${t("col_frequency")}</th><th>${t("col_dominance")}</th><th>${t("col_class")}</th><th>${t("ifz_col")}</th></tr></thead>
      <tbody>${body}</tbody>
    </table></div>`;
}

function unitPopup(title, unitId, level, data) {
  const units = data.unitsByLevel[level];
  const meta = units.find((u) => u.unit_id === unitId);
  const dominant = meta?.dominant_species_id ? data.speciesById.get(meta.dominant_species_id) : null;
  return `
    <p class="popup-title">${title}</p>
    ${row(t("n_points"), meta?.n_points ?? 0)}
    ${row(t("n_species"), meta?.n_species ?? 0)}
    ${row(t("total_abundance"), meta?.total_abundance ?? 0)}
    ${row(t("dominant_species"), pickSpeciesName(dominant, "—"))}
    <p class="popup-subtitle">${t("top5_species")}</p>
    ${topSpeciesTable(data.statsByLevel[level], unitId, data)}
  `;
}

function districtNameByPcode(data, pcode) {
  const f = data.districtsGeo.features.find((f) => f.properties.ADM2_PCODE === pcode);
  return f ? pickPlaceName(f.properties, f.properties.ADM2_EN) : pcode;
}

function regionNameByPcode(data, pcode) {
  const f = data.regionsGeo.features.find((f) => f.properties.ADM1_PCODE === pcode);
  return f ? pickPlaceName(f.properties, f.properties.ADM1_RU) : pcode;
}

function pointPopup(properties, data) {
  const rows = data.distribution
    .filter((d) => d.point_id === properties.point_id)
    .sort((a, b) => b.abundance - a.abundance);
  const body = rows
    .map((d) => {
      const sp = data.speciesById.get(d.species_id);
      return `<tr><td>${pickSpeciesName(sp, d.species_id)}</td><td>${d.abundance}</td></tr>`;
    })
    .join("");
  return `
    <p class="popup-title">${t("level_point")} ${properties.point_id}</p>
    ${row(t("coordinates"), `${properties.lat.toFixed(5)}, ${properties.lon.toFixed(5)}`)}
    ${row(t("level_region"), regionNameByPcode(data, properties.region_id))}
    ${row(t("level_district"), districtNameByPcode(data, properties.district_id))}
    ${row(t("locality"), properties.locality ?? "—")}
    ${row(t("filter_zone_title"), tZone(properties.zone) ?? "—")}
    ${row(t("habitat"), properties.habitat ?? "—")}
    ${row(t("n_species"), properties.species_count ?? "—")}
    ${row(t("total_abundance"), properties.total_abundance ?? "—")}
    ${row(t("dominant_species"), pickSpeciesName(data.speciesById.get(properties.dominant_species_id), "—"))}
    ${properties.is_estimated ? row(t("estimated_flag"), t("yes")) : ""}
    ${properties.district_mismatch ? row(t("district_declared_label"), `${districtNameByPcode(data, properties.district_id_declared)} ${t("mismatch_suffix")}`) : ""}
    ${properties.zone_mismatch ? row(t("zone_under_point"), `${tZone(properties.zone_spatial)} ${t("mismatch_suffix")}`) : ""}
    <p class="popup-subtitle">${t("all_species_at_point")}</p>
    <table class="popup-table"><thead><tr><th>${t("col_species")}</th><th>${t("col_abundance")}</th></tr></thead><tbody>${body}</tbody></table>
  `;
}

function settlementPopup(p) {
  return `
    <p class="popup-title">${pickPlaceName(p, p.name ?? t("settlements_legend"))}</p>
    ${row(t("rank_label"), p.adm_type ?? "—")}
    ${row(t("population_label"), p.population ?? "—")}
  `;
}

// Слои кликабельны «слоями друг над другом» (точка стоит поверх района поверх
// области), а MapLibre шлёт click независимо КАЖДОМУ слою с фичей под курсором —
// поэтому попапы строит не сам этот модуль (иначе на одном клике всплывало бы
// сразу два попапа), а единый обработчик в interactions.js, который сначала
// определяет один «победивший» слой по приоритету. Здесь — только чистые
// билдеры HTML + порядок приоритета.
export const POPUP_BUILDERS = {
  [LAYER_IDS.pointsCircle]: (p, data) => pointPopup(p, data),
  [LAYER_IDS.settlementsCircle]: (p) => settlementPopup(p),
  [LAYER_IDS.districtsFill]: (p, data) => unitPopup(pickPlaceName(p, p.ADM2_EN), p.ADM2_PCODE, "districts", data),
  [LAYER_IDS.regionsFill]: (p, data) => unitPopup(pickPlaceName(p, p.ADM1_RU), p.ADM1_PCODE, "regions", data),
  [LAYER_IDS.agrozonesFill]: (p, data) => unitPopup(tZone(p.descr), p.descr, "zones", data),
};

// порядок приоритета для queryRenderedFeatures в interactions.js: точка важнее
// населённого пункта важнее района важнее области важнее зоны
export const POPUP_LAYER_PRIORITY = [
  LAYER_IDS.pointsCircle,
  LAYER_IDS.settlementsCircle,
  LAYER_IDS.districtsFill,
  LAYER_IDS.regionsFill,
  LAYER_IDS.agrozonesFill,
];

export function showPopup(map, lngLat, layerId, properties, data) {
  const build = POPUP_BUILDERS[layerId];
  if (!build) return;
  new maplibregl.Popup({ closeButton: true, maxWidth: "360px" })
    .setLngLat(lngLat)
    .setHTML(build(properties, data))
    .addTo(map);
}

export function initPopupCursor(map) {
  for (const layerId of POPUP_LAYER_PRIORITY) {
    map.on("mouseenter", layerId, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", layerId, () => {
      map.getCanvas().style.cursor = "";
    });
  }
}
