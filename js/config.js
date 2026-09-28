// Общие константы проекта: подложка, пути к данным, id слоёв.

export const BASEMAP_STYLE_URL = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

export const MAP_INITIAL_VIEW = {
  center: [67.5, 48.5], // географический центр Казахстана
  zoom: 4.2,
  minZoom: 3.3, // не давать «выйти» на весь мир
  maxZoom: 18,
};

// bbox Казахстана (data/boundaries/kazakhstan.geojson) + отступ ~4° — чтобы не
// улетать далеко за границу при панорамировании, но оставить запас у краёв
export const MAP_MAX_BOUNDS = [
  [42.0, 36.5], // юго-запад
  [92.0, 59.5], // северо-восток
];

export const DATA_URLS = {
  kazakhstan: "data/kazakhstan.geojson",
  regions: "data/regions.geojson",
  districts: "data/districts.geojson",
  agrozones: "data/agrozones.geojson",
  settlements: "data/settlements.geojson",
  points: "data/points.geojson",
  species: "data/species.json",
  distribution: "data/distribution.json",
  statsZones: "data/stats_zones.json",
  statsRegions: "data/stats_regions.json",
  statsDistricts: "data/stats_districts.json",
  statsLocalities: "data/stats_localities.json",
  unitsZones: "data/units_zones.json",
  unitsRegions: "data/units_regions.json",
  unitsDistricts: "data/units_districts.json",
  unitsLocalities: "data/units_localities.json",
};

// id источников/слоёв MapLibre
export const SOURCE_IDS = {
  kazakhstan: "src-kazakhstan",
  regions: "src-regions",
  districts: "src-districts",
  agrozones: "src-agrozones",
  settlements: "src-settlements",
  points: "src-points",
};

export const LAYER_IDS = {
  kazakhstanLine: "layer-kazakhstan-line",
  regionsFill: "layer-regions-fill",
  regionsLine: "layer-regions-line",
  districtsFill: "layer-districts-fill",
  districtsLine: "layer-districts-line",
  agrozonesFill: "layer-agrozones-fill",
  agrozonesLine: "layer-agrozones-line",
  settlementsCircle: "layer-settlements-circle",
  settlementsLabel: "layer-settlements-label",
  pointsCircle: "layer-points-circle",
};

// 2 состояния переключателя «Территория» — какой полигональный слой активен на карте.
// Населённые пункты и агроклиматические зоны — независимые режимы (чекбоксы, см. ниже),
// точки наблюдений показываются всегда и переключателем не скрываются.
// labelKey — ключ в i18n.js, подпись по языку берётся оттуда (см. filters.js/legend.js).
export const TERRITORIES = [
  { id: "regions", labelKey: "territory_regions" },
  { id: "districts", labelKey: "territory_districts" },
];

// какие layer_id включать/выключать для каждого состояния Территории
export const TERRITORY_LAYERS = {
  regions: [LAYER_IDS.regionsFill, LAYER_IDS.regionsLine],
  districts: [LAYER_IDS.districtsFill, LAYER_IDS.districtsLine],
};

export const ALL_TERRITORY_LAYERS = Object.values(TERRITORY_LAYERS).flat();

export const SETTLEMENT_LAYERS = [LAYER_IDS.settlementsCircle, LAYER_IDS.settlementsLabel];
export const ZONE_LAYERS = [LAYER_IDS.agrozonesFill, LAYER_IDS.agrozonesLine];

// ранг населённого пункта -> радиус маркера / размер подписи (просто контуры/маркеры,
// без стилизации по показателям — см. prompts/04_map_base.md)
export const SETTLEMENT_RANK_STYLE = {
  "Столица": { radius: 9, textSize: 14 },
  "ГРЗ": { radius: 7, textSize: 13 },
  "ОЦ": { radius: 6, textSize: 12 },
  "ГОЗ": { radius: 4.5, textSize: 11 },
  "РЦ": { radius: 3.5, textSize: 10 },
};
export const SETTLEMENT_RANK_DEFAULT = { radius: 3, textSize: 9 };

// Цвета агроклиматических зон — точные HEX, снятые пипеткой с эталонной легенды
// заказчика (11 категорий). Ключ — значение поля descr в agrozones.geojson.
export const ZONE_COLORS = {
  "Очень увлажнённая / Умеренно тёплая": "#BDD2FF",
  "Увлажнённая / Умеренно тёплая": "#BEE8FF",
  "Увлажнённая / Жаркая": "#BEFFE7",
  "Полуаридная / Умеренно тёплая": "#FFFFBE",
  "Полуаридная / Тёплая": "#FFFF00",
  "Полуаридная / Жаркая": "#CCCD65",
  "Аридная / Тёплая": "#FFD380",
  "Аридная / Жаркая": "#FEBEBE",
  "Горная В": "#DF72FF",
  "Горная Ю": "#FF73DE",
  "Горная ЮВ": "#C500FF",
};
export const ZONE_COLOR_DEFAULT = "#cccccc";
// порядок для легенды — как в эталонном изображении
export const ZONE_ORDER = Object.keys(ZONE_COLORS);

// показатели («Показатель» в панели фильтров)
export const INDICATORS = [
  { id: "distribution", labelKey: "indicator_distribution" },
  { id: "frequency", labelKey: "indicator_frequency" },
  { id: "dominance", labelKey: "indicator_dominance" },
  { id: "relative_abundance", labelKey: "indicator_relative_abundance" },
  { id: "mass_class", labelKey: "indicator_mass_class" },
  { id: "species_count", labelKey: "indicator_species_count" },
];
