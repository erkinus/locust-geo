// Единое состояние фильтров портала (prompts/05_filters_styling.md, п.5).
// Любое изменение состояния должно идти через мутацию этого объекта с последующим
// вызовом render(state) — см. main.js.

export function createInitialState() {
  return {
    territory: "regions", // 'regions' | 'districts' — активный полигональный слой
    showZonesLayer: false, // агроклиматические зоны — независимый режим
    showSettlements: false, // населённые пункты — независимый режим
    species: "all", // species_id или 'all'
    indicator: "species_count", // см. config.INDICATORS; при species==='all' используется species_count
    selectedZones: [], // пусто = без фильтра по зоне (мультиселект из панели фильтров)
    // Хлебные крошки / drill-down (этап 6): путь от Казахстана до текущего объекта.
    // Элемент: { level: 'zone'|'region'|'district'|'point', id, label }.
    selection: { path: [] },
  };
}
