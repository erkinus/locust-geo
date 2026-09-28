// Единая функция render(state): применяет текущее состояние фильтров к карте —
// хороплет территорий через setFeatureState, стилизация и фильтрация точек,
// мультиселект-фильтр агрозон через setFilter, обновление легенды.
// prompts/05_filters_styling.md, пп.1-5.

import { DATA_URLS, SOURCE_IDS, LAYER_IDS } from "./config.js";
import { loadGeoJson, loadJson } from "./data.js";
import { NO_DATA_COLOR, sequentialColor, equalIntervalBreaks, MASS_CLASS_COLORS, DISTRIBUTION_COLORS } from "./scales.js";
import { scopeOf } from "./selection.js";

export async function createRenderer(map, legend) {
  const [
    regionsGeo, districtsGeo, pointsGeo,
    statsRegions, statsDistricts, statsZones, statsLocalities,
    unitsRegions, unitsDistricts, unitsZones, unitsLocalities,
    distribution, speciesList,
  ] = await Promise.all([
    loadGeoJson(DATA_URLS.regions),
    loadGeoJson(DATA_URLS.districts),
    loadGeoJson(DATA_URLS.points),
    loadJson(DATA_URLS.statsRegions),
    loadJson(DATA_URLS.statsDistricts),
    loadJson(DATA_URLS.statsZones),
    loadJson(DATA_URLS.statsLocalities),
    loadJson(DATA_URLS.unitsRegions),
    loadJson(DATA_URLS.unitsDistricts),
    loadJson(DATA_URLS.unitsZones),
    loadJson(DATA_URLS.unitsLocalities),
    loadJson(DATA_URLS.distribution),
    loadJson(DATA_URLS.species),
  ]);

  const speciesById = new Map(speciesList.map((s) => [s.species_id, s]));

  const TERRITORY_DATA = {
    regions: { geo: regionsGeo, stats: statsRegions, units: unitsRegions, idProp: "ADM1_PCODE", source: SOURCE_IDS.regions },
    districts: { geo: districtsGeo, stats: statsDistricts, units: unitsDistricts, idProp: "ADM2_PCODE", source: SOURCE_IDS.districts },
  };

  // единый пакет данных для панели результатов и попапов (этап 6) — грузим один раз
  const data = {
    regionsGeo, districtsGeo, pointsGeo,
    statsByLevel: { regions: statsRegions, districts: statsDistricts, zones: statsZones, localities: statsLocalities },
    unitsByLevel: { regions: unitsRegions, districts: unitsDistricts, zones: unitsZones, localities: unitsLocalities },
    distribution, speciesList, speciesById,
  };

  // species_id -> Map(point_id -> abundance), для радиуса/фильтра точек
  const distBySpecies = new Map();
  for (const row of distribution) {
    if (!distBySpecies.has(row.species_id)) distBySpecies.set(row.species_id, new Map());
    distBySpecies.get(row.species_id).set(row.point_id, row.abundance);
  }

  function maxNSpecies(territoryId) {
    const units = TERRITORY_DATA[territoryId].units;
    return Math.max(1, ...units.map((u) => u.n_species || 0));
  }

  function unitColor(state, territoryId, unitRow, unitMeta, hasData) {
    if (!hasData) return { color: NO_DATA_COLOR, category: null };

    if (state.species === "all") {
      const breaks = equalIntervalBreaks(maxNSpecies(territoryId));
      return { color: sequentialColor(unitMeta?.n_species ?? 0, breaks), category: null };
    }

    switch (state.indicator) {
      case "distribution":
        return {
          color: unitRow ? DISTRIBUTION_COLORS.found : DISTRIBUTION_COLORS.notFound,
          category: unitRow ? "found" : "notFound",
        };
      case "frequency":
        return { color: sequentialColor(unitRow?.frequency_pct ?? 0, equalIntervalBreaks(100)), category: null };
      case "dominance":
        return { color: sequentialColor(unitRow?.dominance_pct ?? 0, equalIntervalBreaks(100)), category: null };
      case "relative_abundance":
        return { color: sequentialColor(unitRow?.relative_abundance_pct ?? 0, equalIntervalBreaks(100)), category: null };
      case "mass_class":
        return {
          color: unitRow ? MASS_CLASS_COLORS[unitRow.mass_class] : DISTRIBUTION_COLORS.notFound,
          category: unitRow?.mass_class ?? null,
        };
      case "species_count":
      default: {
        const breaks = equalIntervalBreaks(maxNSpecies(territoryId));
        return { color: sequentialColor(unitMeta?.n_species ?? 0, breaks), category: null };
      }
    }
  }

  function applyChoropleth(state) {
    for (const [territoryId, td] of Object.entries(TERRITORY_DATA)) {
      const rowsForSpecies = new Map();
      if (state.species !== "all") {
        for (const row of td.stats) {
          if (row.species_id === state.species) rowsForSpecies.set(row.unit_id, row);
        }
      }
      const unitsById = new Map(td.units.map((u) => [u.unit_id, u]));

      for (const feature of td.geo.features) {
        const unitId = feature.properties[td.idProp];
        const hasData = !!feature.properties.has_data;
        const { color } = unitColor(state, territoryId, rowsForSpecies.get(unitId), unitsById.get(unitId), hasData);
        map.setFeatureState({ source: td.source, id: unitId }, { fillColor: color });
      }
    }
  }

  function maxAbundance(state) {
    if (state.species !== "all") {
      const m = distBySpecies.get(state.species);
      return m && m.size ? Math.max(...m.values()) : 1;
    }
    return Math.max(1, ...pointsGeo.features.map((f) => f.properties.total_abundance || 0));
  }

  function applyPoints(state) {
    const selected = state.species !== "all" ? distBySpecies.get(state.species) : null;
    const maxAb = maxAbundance(state);
    const speciesColor = state.species !== "all" ? MASS_CLASS_COLORS[speciesById.get(state.species)?.mass_class] : null;

    for (const feature of pointsGeo.features) {
      const pid = feature.properties.point_id;
      const abundance = selected ? selected.get(pid) ?? 0 : feature.properties.total_abundance ?? 0;
      const radius = 3 + 9 * Math.min(1, abundance / maxAb);
      map.setFeatureState(
        { source: SOURCE_IDS.points, id: pid },
        { radius, fillColor: speciesColor ?? "#2f6f3e" }
      );
    }

    const scope = scopeOf(state.selection);
    const filters = ["all"];
    if (selected) filters.push(["in", ["get", "point_id"], ["literal", [...selected.keys()]]]);
    // zone_spatial (не zone!) — фактическая зона района под точкой; у ~27% точек
    // собственная заявленная зона (zone) не совпадает с зоной полигона под ней
    // (см. build_data.py) — фильтр по zone визуально «терял» точки за пределами
    // закрашенных районов. Для методики расчётов (stats_zones.json) по-прежнему
    // используется zone — здесь меняется только видимость слоя точек на карте.
    if (state.selectedZones.length) filters.push(["in", ["get", "zone_spatial"], ["literal", state.selectedZones]]);
    if (scope.regionId) filters.push(["==", ["get", "region_id"], scope.regionId]);
    if (scope.districtId) filters.push(["==", ["get", "district_id"], scope.districtId]);
    map.setFilter(LAYER_IDS.pointsCircle, filters.length > 1 ? filters : null);
  }

  function applyDistrictFilter(state) {
    // Мультиселект агрозон фильтрует районы (у района одна зона — descr) и точки
    // (applyPoints выше). Области зону-однородными не являются (пересекают несколько
    // зон), поэтому фильтром зоны не затрагиваются — сознательное упрощение этапа 5.
    // Drill-down «область → её районы» (этап 6, п.2) — тоже фильтр по ADM1_PCODE.
    const scope = scopeOf(state.selection);
    const clauses = [];
    if (state.selectedZones.length) clauses.push(["in", ["get", "descr"], ["literal", state.selectedZones]]);
    if (scope.regionId) clauses.push(["==", ["get", "ADM1_PCODE"], scope.regionId]);
    const filter = clauses.length ? ["all", ...clauses] : null;
    map.setFilter(LAYER_IDS.districtsFill, filter);
    map.setFilter(LAYER_IDS.districtsLine, filter);
  }

  function render(state) {
    applyChoropleth(state);
    applyPoints(state);
    applyDistrictFilter(state);
    legend.render(state, { maxNSpecies: maxNSpecies(state.territory), speciesById });
  }

  return { render, data };
}
