// Правая панель результатов: хлебные крошки + вкладки «Таблица»/«Диаграмма»/«Карточка»
// (prompts/06_popups_panels.md, пп.3,4). Обновляется вызовом renderPanel(state).

import { currentLevel } from "./selection.js";
import { toCsv, downloadCsv } from "./csv.js";
import { t, tZone, tMassClass, pickSpeciesName } from "./i18n.js";

const LEVEL_LABEL_KEY = { country: "breadcrumb_root", zone: "level_zone", region: "level_region", district: "level_district", point: "level_point" };
const INDICATOR_FIELD = { frequency: "frequency_pct", dominance: "dominance_pct", relative_abundance: "relative_abundance_pct" };

let chartInstance = null;
let activeTab = "table";

function speciesLabel(sp, fallback) {
  return pickSpeciesName(sp, fallback);
}

// Отображаемое имя и ИФЗ добавляем ОДНИМ полем на все три ветки ниже — имя иначе
// читается как "сырое" r.name_ru (всегда по-русски в данных), казахский режим для
// стран/зон/областей/районов не подхватывается (для точки было отдельно — нашли
// на ревью, унифицировали). ИФЗ — глобальный показатель вида (species.json), своей
// формулы для района/области/зоны методика не даёт (см. build_data.py), поэтому
// он одинаков на всех уровнях, включая отдельную точку.
function withDisplayName(rows, data) {
  return rows.map((r) => {
    const sp = data.speciesById.get(r.species_id);
    return { ...r, display_name: speciesLabel(sp, r.name_ru ?? r.latin ?? r.species_id), ifz: sp?.ifz ?? null };
  });
}

function resolveDataset(state, data) {
  const level = currentLevel(state.selection);

  if (level.level === "country") {
    const totalAbundance = data.speciesList.reduce((s, r) => s + r.abundance_total, 0);
    return {
      kind: "species",
      title: `${t("breadcrumb_root")} — ${t("species_all")}`,
      rows: withDisplayName(data.speciesList, data),
      card: [
        { labelKey: "n_points", value: data.pointsGeo.features.length },
        { labelKey: "species_registered", value: data.speciesList.length },
        { labelKey: "total_abundance", value: totalAbundance },
        { labelKey: "regions_with_data", value: data.regionsGeo.features.filter((f) => f.properties.has_data).length },
        { labelKey: "districts_with_data", value: data.districtsGeo.features.filter((f) => f.properties.has_data).length },
      ],
    };
  }

  if (level.level === "point") {
    const feature = data.pointsGeo.features.find((f) => f.properties.point_id === level.id);
    const p = feature?.properties ?? {};
    const rows = withDisplayName(
      data.distribution.filter((d) => d.point_id === level.id),
      data
    ).sort((a, b) => b.abundance - a.abundance);
    return {
      kind: "point",
      title: `${t("level_point")} ${level.id}`,
      rows,
      card: [
        { labelKey: "coordinates", value: `${p.lat?.toFixed(5)}, ${p.lon?.toFixed(5)}` },
        { labelKey: "locality", value: p.locality ?? "—" },
        { labelKey: "filter_zone_title", value: tZone(p.zone) ?? "—" },
        { labelKey: "habitat", value: p.habitat ?? "—" },
        { labelKey: "n_species", value: p.species_count ?? "—" },
        { labelKey: "total_abundance", value: p.total_abundance ?? "—" },
        { labelKey: "dominant_species", value: speciesLabel(data.speciesById.get(p.dominant_species_id), "—") },
      ],
    };
  }

  const statsKey = level.level + "s"; // zone->zones, region->regions, district->districts
  const rows = withDisplayName(
    data.statsByLevel[statsKey].filter((r) => r.unit_id === level.id),
    data
  );
  const unitMeta = data.unitsByLevel[statsKey].find((u) => u.unit_id === level.id);
  const dominant = unitMeta?.dominant_species_id ? data.speciesById.get(unitMeta.dominant_species_id) : null;
  const titleRaw = level.label ?? level.id;
  return {
    kind: "unit",
    title: level.level === "zone" ? tZone(titleRaw) : titleRaw,
    rows,
    card: [
      { labelKey: "n_points", value: unitMeta?.n_points ?? 0 },
      { labelKey: "n_species", value: unitMeta?.n_species ?? 0 },
      { labelKey: "total_abundance", value: unitMeta?.total_abundance ?? 0 },
      { labelKey: "dominant_species", value: speciesLabel(dominant, "—") },
    ],
  };
}

function sortField(state, kind) {
  if (kind === "point") return "abundance";
  return INDICATOR_FIELD[state.indicator] ?? "dominance_pct";
}

function renderBreadcrumbs(state, nav) {
  const el = document.getElementById("breadcrumbs");
  const crumbs = [{ label: t("breadcrumb_root"), onClick: nav.goToRoot }];
  state.selection.path.forEach((p, i) => {
    crumbs.push({ label: `${t(LEVEL_LABEL_KEY[p.level])}: ${p.level === "zone" ? tZone(p.label ?? p.id) : p.label ?? p.id}`, onClick: () => nav.goToCrumb(i) });
  });
  el.innerHTML = crumbs
    .map((c, i) => `<button class="crumb" data-i="${i}">${c.label}</button>`)
    .join('<span class="crumb-sep">→</span>');
  el.querySelectorAll(".crumb").forEach((btn, i) => btn.addEventListener("click", () => crumbs[i].onClick()));
}

// value() всегда возвращает «сырое» значение (число там, где число) — сортировка
// по клику на заголовок раньше сравнивала строки вида "12.3" (после .toFixed),
// из-за чего 9 оказывалось «больше» 80. format() — только для отображения/CSV.
function numberFormat(n) {
  return typeof n === "number" ? n.toFixed(1) : n;
}

function tableColumns(isPoint) {
  return isPoint
    ? [
        { key: "display_name", label: t("col_species"), value: (r) => r.display_name },
        { key: "abundance", label: t("col_abundance"), value: (r) => r.abundance },
        { key: "ifz", label: t("ifz_col"), value: (r) => r.ifz, format: numberFormat },
      ]
    : [
        { key: "display_name", label: t("col_species"), value: (r) => r.display_name },
        { key: "point_count", label: t("col_points"), value: (r) => r.point_count },
        { key: "abundance_total", label: t("col_abundance"), value: (r) => r.abundance_total },
        { key: "abundance_mean", label: t("mean_abundance_col"), value: (r) => r.abundance_mean, format: numberFormat },
        { key: "abundance_max", label: t("max_abundance_col"), value: (r) => r.abundance_max },
        { key: "frequency_pct", label: t("col_frequency"), value: (r) => r.frequency_pct, format: numberFormat },
        { key: "dominance_pct", label: t("col_dominance"), value: (r) => r.dominance_pct, format: numberFormat },
        { key: "mass_class", label: t("col_class"), value: (r) => r.mass_class, format: tMassClass },
        { key: "rank", label: t("rank_col"), value: (r) => r.rank },
        { key: "ifz", label: t("ifz_col"), value: (r) => r.ifz, format: numberFormat },
      ];
}

function renderTable(dataset, state, nav) {
  const el = document.getElementById("tab-table");
  const field = sortField(state, dataset.kind);
  const rows = [...dataset.rows].sort((a, b) => (b[field] ?? 0) - (a[field] ?? 0));
  const columns = tableColumns(dataset.kind === "point");

  const cellText = (c, r) => {
    const v = c.value(r);
    return c.format ? c.format(v) : v;
  };
  const rowHtml = (r) =>
    `<tr class="clickable-row" data-species-id="${r.species_id ?? ""}">${columns.map((c) => `<td>${cellText(c, r)}</td>`).join("")}</tr>`;

  const header = columns.map((c) => `<th data-key="${c.key}">${c.label}</th>`).join("");

  el.innerHTML = `
    <div class="table-toolbar">
      <span id="table-count">${dataset.title} (${rows.length})</span>
      <input type="text" id="table-search" class="table-search" placeholder="${t("search_placeholder")}" />
      <button id="export-csv" type="button">${t("export_csv")}</button>
    </div>
    <div class="table-scroll"><table class="results-table"><thead><tr>${header}</tr></thead><tbody></tbody></table></div>
  `;

  let sortKey = field;
  let sortDesc = true;
  let searchTerm = "";

  function currentRows() {
    const filtered = searchTerm
      ? rows.filter((r) => (r.display_name ?? "").toLowerCase().includes(searchTerm))
      : rows;
    // sortField() может вернуть "relative_abundance_pct" (показатель "Относительная
    // численность"), а такой колонки в таблице нет — она числом равна dominance_pct
    // (см. build_data.py), отдельную колонку не дублируем. Без этого запасного пути
    // col оказался бы undefined и сортировка упала бы с ошибкой при самой первой отрисовке.
    const col = columns.find((c) => c.key === sortKey);
    const value = col ? col.value : (r) => r[sortKey];
    return [...filtered].sort((a, b) => {
      const av = value(a), bv = value(b);
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), "ru");
      return sortDesc ? -cmp : cmp;
    });
  }

  function repaint() {
    const shown = currentRows();
    el.querySelector("tbody").innerHTML = shown.map(rowHtml).join("");
    el.querySelector("#table-count").textContent = `${dataset.title} (${shown.length}/${rows.length})`;
  }

  repaint();

  el.querySelectorAll("th").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.key;
      sortDesc = key === sortKey ? !sortDesc : true;
      sortKey = key;
      repaint();
    });
  });

  el.querySelector("#table-search").addEventListener("input", (e) => {
    searchTerm = e.target.value.trim().toLowerCase();
    repaint();
  });

  // Клик по строке (виду) в таблице → показать этот вид на карте (хороплет + точки).
  el.querySelector("tbody").addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-species-id]");
    const speciesId = tr?.dataset.speciesId;
    if (speciesId) nav.selectSpeciesOnMap(speciesId);
  });

  document.getElementById("export-csv").addEventListener("click", () => {
    const csv = toCsv(currentRows(), columns.map((c) => ({ label: c.label, value: (r) => cellText(c, r) })));
    downloadCsv(`${dataset.title.replace(/[^\wа-яА-Я]+/g, "_")}.csv`, csv);
  });
}

function renderChart(dataset, state) {
  const canvas = document.getElementById("species-chart");
  const field = sortField(state, dataset.kind);
  const top = [...dataset.rows].sort((a, b) => (b[field] ?? 0) - (a[field] ?? 0)).slice(0, 10);
  const labels = top.map((r) => r.display_name);
  const values = top.map((r) => r[field] ?? 0);

  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: dataset.title, data: values, backgroundColor: "#3a5a8c" }],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true } },
    },
  });
}

function renderCard(dataset) {
  const el = document.getElementById("tab-card");
  el.innerHTML = dataset.card
    .map(({ labelKey, value }) => `<div class="card-tile"><div class="card-value">${value}</div><div class="card-label">${t(labelKey)}</div></div>`)
    .join("");
}

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tab));
  document.querySelectorAll(".tab-content").forEach((el) => {
    el.hidden = el.id !== `tab-${tab}`;
  });
}

export function initPanels(data, nav) {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  function renderPanel(state) {
    renderBreadcrumbs(state, nav);
    const dataset = resolveDataset(state, data);
    renderTable(dataset, state, nav);
    renderChart(dataset, state);
    renderCard(dataset);
    switchTab(activeTab);
  }

  return { renderPanel, switchTab };
}
