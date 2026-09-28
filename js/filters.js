// Левая панель фильтров (из docs/TZ.md, п.11). Любое изменение мутирует единый
// объект state и вызывает render(state) — prompts/05_filters_styling.md, п.5.
// «Вид визуализации» здесь убран — переключение Таблица/Диаграмма/Карточка
// теперь только вкладками в правой панели (panels.js).

import { TERRITORIES, INDICATORS } from "./config.js";
import { setActiveTerritory, setZonesVisible, setSettlementsVisible } from "./layers.js";
import { t, tZone, pickSpeciesName } from "./i18n.js";

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  for (const child of children) node.appendChild(child);
  return node;
}

function renderRadioGroup(container, name, options, currentValue, onChange) {
  container.innerHTML = "";
  for (const opt of options) {
    const input = el("input", { type: "radio", name, value: opt.id, checked: opt.id === currentValue });
    input.addEventListener("change", () => onChange(opt.id));
    const label = el("label", {}, [input, document.createTextNode(opt.label)]);
    container.appendChild(label);
  }
}

function populateSelect(select, options, currentValue) {
  select.innerHTML = "";
  for (const opt of options) {
    const o = document.createElement("option");
    o.value = opt.id;
    o.textContent = opt.label;
    select.appendChild(o);
  }
  if (currentValue != null) select.value = currentValue;
}

/** «Все виды» ⇒ единственный осмысленный показатель — «Общее количество видов»
 * (prompts/05, п.2): дизейблим остальные пункты списка, а не тихо игнорируем выбор. */
function updateIndicatorAvailability(select, speciesIsAll) {
  for (const option of select.options) {
    option.disabled = speciesIsAll && option.value !== "species_count";
  }
  if (speciesIsAll) select.value = "species_count";
}

/** Вид — текстовое поле с <datalist> (поиск по названию среди 77 видов), не
 * обычный <select>: значение показывает подпись, а сам id хранится в data-id
 * подходящего <option>. speciesLabelFor()/speciesIdForLabel() — мост между ними. */
function speciesLabelFor(speciesId) {
  const opt = document.querySelector(`#species-datalist option[data-id="${speciesId}"]`);
  return opt ? opt.value : speciesId;
}
function speciesIdForLabel(label) {
  const opt = [...document.querySelectorAll("#species-datalist option")].find((o) => o.value === label);
  return opt?.dataset.id ?? null;
}

/** Выбор вида — из поля поиска слева или кликом по строке в таблице (panels.js).
 * Общая точка входа, чтобы оба пути одинаково синхронизировали state и DOM. */
export function selectSpecies(state, speciesId) {
  state.species = speciesId;
  const speciesInput = document.getElementById("select-species");
  if (speciesInput) speciesInput.value = speciesLabelFor(speciesId);
  const indicatorSelect = document.getElementById("select-indicator");
  if (indicatorSelect) updateIndicatorAvailability(indicatorSelect, speciesId === "all");
  if (speciesId === "all") state.indicator = "species_count";
}

export function initFilters(map, { speciesList, zoneUnits }, legend, state, render) {
  const territoryContainer = document.getElementById("territory-options");
  const settlementsToggle = document.getElementById("toggle-settlements-layer");
  const zoneLayerToggle = document.getElementById("toggle-zone-layer");
  const zoneContainer = document.getElementById("zone-options");
  const speciesSelect = document.getElementById("select-species");
  const speciesDatalist = document.getElementById("species-datalist");
  const indicatorSelect = document.getElementById("select-indicator");

  // Территория — переключает активный полигональный слой (области/районы).
  // Точки показываются всегда и этим блоком не управляются.
  function buildTerritory() {
    const options = TERRITORIES.map((o) => ({ id: o.id, label: t(o.labelKey) }));
    renderRadioGroup(territoryContainer, "territory", options, state.territory, (id) => {
      state.territory = id;
      setActiveTerritory(map, id);
      render(state);
    });
  }

  // Фильтр по зоне (мультиселект, из TZ.md п.11) — setFilter на районы+точки (render.js).
  function buildZoneOptions() {
    const options = zoneUnits
      .map((z) => ({ id: z.unit_id, label: `${tZone(z.unit_id)} (N=${z.n_points})` }))
      .sort((a, b) => a.label.localeCompare(b.label, "ru"));
    zoneContainer.innerHTML = "";
    for (const opt of options) {
      const input = el("input", { type: "checkbox", value: opt.id, checked: state.selectedZones.includes(opt.id) });
      input.addEventListener("change", () => {
        state.selectedZones = [...zoneContainer.querySelectorAll("input:checked")].map((i) => i.value);
        render(state);
      });
      zoneContainer.appendChild(el("label", {}, [input, document.createTextNode(opt.label)]));
    }
  }

  // Вид — поиск по названию (datalist), управляет стилизацией территорий и точек (render.js).
  function buildSpeciesOptions() {
    const options = [{ id: "all", label: t("species_all") }].concat(
      speciesList
        .map((s) => ({ id: s.species_id, label: `${pickSpeciesName(s, s.species_id)} (N=${s.point_count})` }))
        .sort((a, b) => a.label.localeCompare(b.label, "ru"))
    );
    speciesDatalist.innerHTML = "";
    for (const opt of options) {
      const o = document.createElement("option");
      o.value = opt.label;
      o.dataset.id = opt.id;
      speciesDatalist.appendChild(o);
    }
    speciesSelect.value = speciesLabelFor(state.species);
  }

  function buildIndicatorOptions() {
    const options = INDICATORS.map((o) => ({ id: o.id, label: t(o.labelKey) }));
    populateSelect(indicatorSelect, options, state.indicator);
    updateIndicatorAvailability(indicatorSelect, state.species === "all");
  }

  buildTerritory();
  buildZoneOptions();
  buildSpeciesOptions();
  buildIndicatorOptions();

  settlementsToggle.checked = state.showSettlements;
  settlementsToggle.addEventListener("change", (e) => {
    state.showSettlements = e.target.checked;
    setSettlementsVisible(map, state.showSettlements);
    render(state);
  });

  zoneLayerToggle.checked = state.showZonesLayer;
  zoneLayerToggle.addEventListener("change", (e) => {
    state.showZonesLayer = e.target.checked;
    setZonesVisible(map, state.showZonesLayer);
    render(state);
  });

  // input (не change) — реагируем сразу, как только напечатанный текст совпал с
  // одним из вариантов datalist (стандартный способ поймать выбор из datalist —
  // отдельного события для этого браузеры не дают).
  speciesSelect.addEventListener("input", (e) => {
    const id = speciesIdForLabel(e.target.value);
    if (id) {
      selectSpecies(state, id);
      render(state);
    }
  });
  // Если ушли с поля, а текст не сложился в валидный вариант — откатываем
  // подпись к текущему выбранному виду, чтобы не оставлять поле в «пустом» виде.
  speciesSelect.addEventListener("blur", (e) => {
    if (!speciesIdForLabel(e.target.value)) e.target.value = speciesLabelFor(state.species);
  });

  indicatorSelect.addEventListener("change", (e) => {
    state.indicator = e.target.value;
    render(state);
  });

  // Вызывается при смене языка (lang-switch.js) — подписи блоков пересобираются
  // заново, выбранные значения (territory/species/indicator/zones) сохраняются.
  function refreshLabels() {
    buildTerritory();
    buildZoneOptions();
    buildSpeciesOptions();
    buildIndicatorOptions();
  }

  return { refreshLabels };
}

/** Синхронизация DOM-контролов при программной навигации (drill-down по клику
 * на карте, хлебные крошки, восстановление из URL — urlstate.js) — состояние
 * меняется в обход обработчиков самих контролов. */
export function syncFilterControls(state) {
  const territoryInput = document.querySelector(`#territory-options input[value="${state.territory}"]`);
  if (territoryInput) territoryInput.checked = true;

  document.querySelectorAll("#zone-options input[type=checkbox]").forEach((input) => {
    input.checked = state.selectedZones.includes(input.value);
  });

  const speciesInput = document.getElementById("select-species");
  if (speciesInput) speciesInput.value = speciesLabelFor(state.species);

  const indicatorSelect = document.getElementById("select-indicator");
  if (indicatorSelect) {
    indicatorSelect.value = state.indicator;
    updateIndicatorAvailability(indicatorSelect, state.species === "all");
  }

  const settlementsToggle = document.getElementById("toggle-settlements-layer");
  if (settlementsToggle) settlementsToggle.checked = state.showSettlements;

  const zoneLayerToggle = document.getElementById("toggle-zone-layer");
  if (zoneLayerToggle) zoneLayerToggle.checked = state.showZonesLayer;
}
