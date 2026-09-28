// Точка входа: карта, слои, состояние фильтров, рендер, попапы, панель результатов.

import { createMap, onMapReady } from "./map.js";
import { addAllLayers, setSettlementLabelLanguage } from "./layers.js";
import { initFilters } from "./filters.js";
import { initPanels } from "./panels.js";
import { initInteractions } from "./interactions.js";
import { initLegend } from "./legend.js";
import { createInitialState } from "./state.js";
import { createRenderer } from "./render.js";
import { initResize } from "./resize.js";
import { initLangSwitch } from "./lang-switch.js";
import { getLang } from "./i18n.js";
import { updateUrl, parseFromUrl } from "./urlstate.js";

async function main() {
  const map = createMap("map");
  await onMapReady(map);

  await addAllLayers(map);
  setSettlementLabelLanguage(map, getLang());
  initResize(map);

  const legend = initLegend();
  const state = createInitialState();
  const { render, data } = await createRenderer(map, legend);

  // render(state) всегда идёт в паре с обновлением URL (urlstate.js) — иначе
  // ссылка/закладка не отражала бы текущий вид. Единая обёртка вместо разбросанных
  // по filters.js/interactions.js вызовов updateUrl после каждого действия.
  function renderAndSync(s) {
    render(s);
    updateUrl(s);
  }

  // Попапы инициализируются внутри interactions.js — там же единый обработчик
  // клика с приоритетом слоёв (точка > нас.пункт > район > область > зона),
  // чтобы клик по точке поверх района не открывал два попапа разом.
  // interactions.js вызывает panels.renderPanel при клике на карте, а хлебные
  // крошки в panels.js вызывают interactions.goToRoot/goToCrumb — циклическая
  // зависимость разорвана через объект-плейсхолдер nav, заполняемый после обеих инициализаций.
  const nav = {};
  const panels = initPanels(data, nav);
  const interactions = initInteractions(map, state, data, renderAndSync, panels.renderPanel);
  nav.goToRoot = interactions.goToRoot;
  nav.goToCrumb = interactions.goToCrumb;
  nav.selectSpeciesOnMap = interactions.selectSpeciesOnMap;

  const filters = initFilters(map, { speciesList: data.speciesList, zoneUnits: data.unitsByLevel.zones }, legend, state, renderAndSync);

  // Смена языка (флаги внизу слева, lang-switch.js) — переводим статическую
  // разметку, пересобираем подписи фильтров (названия видов/зон/территорий) и
  // подписи нас.пунктов на карте, затем полный рендер (легенда/попапы читают
  // язык "на лету", отдельного состояния для них не нужно).
  initLangSwitch(() => {
    filters.refreshLabels();
    setSettlementLabelLanguage(map, getLang());
    renderAndSync(state);
    panels.renderPanel(state);
  });

  // Состояние из ссылки (species/indicator/territory/zones/drill-down) — если
  // есть, воспроизводим тем же путём, что и обычный клик по объекту на карте.
  const parsed = parseFromUrl();
  if (parsed) {
    interactions.restoreFromUrl(parsed);
  } else {
    renderAndSync(state);
    panels.renderPanel(state);
  }

  document.getElementById("loading-overlay")?.setAttribute("hidden", "");
}

main().catch((err) => {
  console.error("Ошибка инициализации портала:", err);
  document.getElementById("loading-overlay")?.setAttribute("hidden", "");
  const mapEl = document.getElementById("map");
  if (mapEl) {
    mapEl.innerHTML = `<p style="padding:24px;color:#b23a48">Ошибка загрузки: ${err.message}</p>`;
  }
});
