// Легенда карты — обновляется при каждом render(state) (prompts/05, п.5).
// Категориальные показатели (распространение, массовость, зоны) — список категорий;
// последовательные (встречаемость/доминирование/отн.численность/кол-во видов) —
// шкала классов; «нет наблюдений» — всегда отдельной строкой.

import { TERRITORIES, ZONE_ORDER, ZONE_COLORS, INDICATORS } from "./config.js";
import {
  NO_DATA_COLOR, NO_DATA_LABEL, SEQUENTIAL_RAMP,
  MASS_CLASS_ORDER, MASS_CLASS_COLORS, DISTRIBUTION_COLORS, DISTRIBUTION_LABELS,
  equalIntervalBreaks, formatBreakLabel,
} from "./scales.js";
import { t, tZone, tMassClass, tDistribution, pickSpeciesName } from "./i18n.js";

function swatchRow(color, label, { round = false } = {}) {
  const shape = round ? "border-radius:50%" : "";
  return `<div class="legend-row"><span class="legend-swatch" style="background:${color};${shape}"></span>${label}</div>`;
}

function sequentialLegend(title, breaks, { percent = false }) {
  const rows = [`<div class="legend-title">${title}</div>`];
  for (let i = 0; i < SEQUENTIAL_RAMP.length; i++) {
    rows.push(swatchRow(SEQUENTIAL_RAMP[i], formatBreakLabel(breaks, i, { percent })));
  }
  rows.push(swatchRow(NO_DATA_COLOR, t("no_observations")));
  return rows;
}

function categoricalIndicatorLegend(state) {
  if (state.indicator === "distribution") {
    return [
      `<div class="legend-title">${t("indicator_distribution")}: ${state.speciesLabel ?? ""}</div>`,
      swatchRow(DISTRIBUTION_COLORS.found, tDistribution(DISTRIBUTION_LABELS.found)),
      swatchRow(DISTRIBUTION_COLORS.notFound, tDistribution(DISTRIBUTION_LABELS.notFound)),
      swatchRow(NO_DATA_COLOR, t("no_observations")),
    ];
  }
  if (state.indicator === "mass_class") {
    const rows = [`<div class="legend-title">${t("indicator_mass_class")}: ${state.speciesLabel ?? ""}</div>`];
    for (const cls of MASS_CLASS_ORDER) rows.push(swatchRow(MASS_CLASS_COLORS[cls], tMassClass(cls)));
    rows.push(swatchRow(DISTRIBUTION_COLORS.notFound, tDistribution(DISTRIBUTION_LABELS.notFound)));
    rows.push(swatchRow(NO_DATA_COLOR, t("no_observations")));
    return rows;
  }
  return null;
}

export function initLegend() {
  const el = document.getElementById("legend");
  el.innerHTML = "";

  function render(state, ctx) {
    const territory = TERRITORIES.find((ter) => ter.id === state.territory);
    const rows = [];
    rows.push(`<div class="legend-title">${territory ? t(territory.labelKey) : ""}</div>`);

    const speciesLabel = state.species === "all" ? t("species_all") : pickSpeciesName(ctx.speciesById.get(state.species), state.species);

    const indicator = INDICATORS.find((i) => i.id === state.indicator);
    if (state.species === "all" || state.indicator === "species_count") {
      const breaks = equalIntervalBreaks(ctx.maxNSpecies);
      const title = state.species === "all" ? `${t("filter_indicator_title")}: ${t("indicator_species_count")}` : `${t("indicator_species_count")}: ${speciesLabel}`;
      rows.push(...sequentialLegend(title, breaks, { percent: false }));
    } else if (["frequency", "dominance", "relative_abundance"].includes(state.indicator)) {
      rows.push(...sequentialLegend(`${t(indicator.labelKey)}: ${speciesLabel}`, equalIntervalBreaks(100), { percent: true }));
    } else {
      const cat = categoricalIndicatorLegend({ ...state, speciesLabel });
      if (cat) rows.push(...cat);
    }

    rows.push(swatchRow("#2f6f3e", t("points_legend"), { round: true }));
    if (state.showSettlements) rows.push(swatchRow("#b23a48", t("settlements_legend"), { round: true }));

    if (state.showZonesLayer) {
      rows.push(`<div class="legend-title">${t("zones_legend_title")}</div>`);
      for (const zone of ZONE_ORDER) rows.push(swatchRow(ZONE_COLORS[zone], tZone(zone)));
    }

    if (state.selectedZones.length) {
      rows.push(`<div class="legend-title">${t("zone_filter_title")} (${state.selectedZones.length})</div>`);
    }

    el.innerHTML = rows.join("");
  }

  return { render };
}
