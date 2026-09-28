// Двуязычный интерфейс (RU/KK). Переключатель — flags, снизу слева (index.html
// #lang-switch). Названия областей/районов/видов/нас.пунктов берутся из уже
// готовых полей данных (name_kk / name_kz — см. этапы 1 и 3), сами не переводим.
//
// ВАЖНО: переводы 11 названий агроклиматических зон и 4 классов массовости —
// составные (Аридті/Жартылай аридті/Ылғалды + температурный эпитет), официальной
// утверждённой казахской терминологии для этой конкретной шкалы найти не удалось
// (это внутренняя классификация проекта, не общепринятый ГОСТ/стандарт). Если
// портал будет проверять специалист-казахоязычный агроном — эти конкретные
// термины стоит показать ему в первую очередь. Общая интерфейсная лексика ниже —
// стандартная, без такой оговорки.

const STORAGE_KEY = "locust-geoportal:lang";

let currentLang = "ru";
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "ru" || saved === "kk") currentLang = saved;
} catch {
  // localStorage недоступен — остаёмся на ru по умолчанию
}

const listeners = new Set();

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  if (lang !== "ru" && lang !== "kk") return;
  currentLang = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // не критично, просто не переживёт перезагрузку
  }
  listeners.forEach((fn) => fn(lang));
}

export function onLangChange(fn) {
  listeners.add(fn);
}

const UI = {
  ru: {
    app_title: "Саранчовые Казахстана",
    filter_species_title: "Вид",
    species_all: "Все виды",
    filter_indicator_title: "Показатель",
    filter_territory_title: "Территория",
    territory_note: "Точки наблюдений показываются на карте всегда, независимо от выбора.",
    show_settlements: "Показать населённые пункты",
    filter_zone_title: "Агроклиматическая зона",
    show_zones_layer: "Показать слой зон на карте",
    tab_table: "Таблица",
    tab_chart: "Диаграмма",
    tab_card: "Карточка",
    breadcrumb_root: "Казахстан",
    level_zone: "Зона",
    level_region: "Область",
    level_district: "Район",
    level_point: "Точка",
    territory_regions: "Области",
    territory_districts: "Районы",
    indicator_distribution: "Распространение",
    indicator_frequency: "Встречаемость",
    indicator_dominance: "Доминирование",
    indicator_relative_abundance: "Относительная численность",
    indicator_mass_class: "Массовость",
    indicator_species_count: "Общее количество видов",
    col_species: "Вид",
    col_points: "N точек",
    col_abundance: "Численность",
    col_frequency: "Встреч. %",
    col_dominance: "Доминир. %",
    col_class: "Класс",
    export_csv: "Экспорт CSV",
    search_placeholder: "Поиск по виду…",
    n_points: "Точек наблюдений",
    n_species: "Видов",
    total_abundance: "Общая численность",
    dominant_species: "Доминирующий вид",
    regions_with_data: "Областей с данными",
    districts_with_data: "Районов с данными",
    species_registered: "Видов зарегистрировано",
    coordinates: "Координаты",
    locality: "Населённый пункт",
    habitat: "Местообитание",
    estimated_flag: "Оценочная запись",
    district_declared_label: "Указанный в источнике район",
    zone_under_point: "Зона района под точкой",
    mismatch_suffix: "(отличается)",
    rank_col: "Рейтинг",
    ifz_col: "ИФЗ",
    mean_abundance_col: "Ср. числ.",
    max_abundance_col: "Макс. числ.",
    top5_species: "ТОП-5 видов по доминированию",
    all_species_at_point: "Все виды на точке",
    no_observations: "Нет наблюдений",
    zones_legend_title: "Агроклиматические зоны",
    settlements_legend: "Населённые пункты",
    points_legend: "Точки наблюдений",
    zone_filter_title: "Фильтр по зонам",
    rank_label: "Ранг",
    population_label: "Население",
    yes: "да",
  },
  kk: {
    app_title: "Қазақстан шегірткелері",
    filter_species_title: "Түр",
    species_all: "Барлық түрлер",
    filter_indicator_title: "Көрсеткіш",
    filter_territory_title: "Аумақ",
    territory_note: "Бақылау нүктелері картада әрқашан көрсетіледі, таңдауға қарамастан.",
    show_settlements: "Елді мекендерді көрсету",
    filter_zone_title: "Агроклиматтық аймақ",
    show_zones_layer: "Аймақтар қабатын картада көрсету",
    tab_table: "Кесте",
    tab_chart: "Диаграмма",
    tab_card: "Көрсеткіштер",
    breadcrumb_root: "Қазақстан",
    level_zone: "Аймақ",
    level_region: "Облыс",
    level_district: "Аудан",
    level_point: "Нүкте",
    territory_regions: "Облыстар",
    territory_districts: "Аудандар",
    indicator_distribution: "Таралуы",
    indicator_frequency: "Кездесу жиілігі",
    indicator_dominance: "Басымдық",
    indicator_relative_abundance: "Салыстырмалы саны",
    indicator_mass_class: "Жаппайлылық",
    indicator_species_count: "Түрлердің жалпы саны",
    col_species: "Түр",
    col_points: "N нүкте",
    col_abundance: "Саны",
    col_frequency: "Кездесу, %",
    col_dominance: "Басымдық, %",
    col_class: "Жаппайлылық",
    export_csv: "CSV экспорттау",
    search_placeholder: "Түр бойынша іздеу…",
    n_points: "Бақылау нүктелері",
    n_species: "Түр саны",
    total_abundance: "Жалпы саны",
    dominant_species: "Басым түр",
    regions_with_data: "Деректері бар облыстар",
    districts_with_data: "Деректері бар аудандар",
    species_registered: "Тіркелген түр саны",
    coordinates: "Координаталар",
    locality: "Елді мекен",
    habitat: "Мекендеу ортасы",
    estimated_flag: "Бағалау жазбасы",
    district_declared_label: "Дереккөзде көрсетілген аудан",
    zone_under_point: "Нүкте астындағы аудан аймағы",
    mismatch_suffix: "(өзгеше)",
    rank_col: "Рейтинг",
    ifz_col: "ИФЗ",
    mean_abundance_col: "Орт. саны",
    max_abundance_col: "Макс. саны",
    top5_species: "Басымдық бойынша ТОП-5 түр",
    all_species_at_point: "Нүктедегі барлық түрлер",
    no_observations: "Бақылау жоқ",
    zones_legend_title: "Агроклиматтық аймақтар",
    settlements_legend: "Елді мекендер",
    points_legend: "Бақылау нүктелері",
    zone_filter_title: "Аймақтар бойынша сүзгі",
    rank_label: "Дәреже",
    population_label: "Халық саны",
    yes: "иә",
  },
};

export function t(key) {
  return UI[currentLang]?.[key] ?? UI.ru[key] ?? key;
}

// Составные, непроверенные носителем переводы — см. комментарий вверху файла.
const ZONE_KK = {
  "Очень увлажнённая / Умеренно тёплая": "Өте ылғалды / Қоңыржай жылы",
  "Увлажнённая / Умеренно тёплая": "Ылғалды / Қоңыржай жылы",
  "Увлажнённая / Жаркая": "Ылғалды / Ыстық",
  "Полуаридная / Умеренно тёплая": "Жартылай аридті / Қоңыржай жылы",
  "Полуаридная / Тёплая": "Жартылай аридті / Жылы",
  "Полуаридная / Жаркая": "Жартылай аридті / Ыстық",
  "Аридная / Тёплая": "Аридті / Жылы",
  "Аридная / Жаркая": "Аридті / Ыстық",
  "Горная В": "Таулы (Шығыс)",
  "Горная Ю": "Таулы (Оңтүстік)",
  "Горная ЮВ": "Таулы (Оңтүстік-шығыс)",
};

const MASS_CLASS_KK = {
  "редкий": "сирек",
  "умеренно массовый": "орташа жаппай",
  "массовый": "жаппай",
  "очень массовый": "өте жаппай",
};

const DISTRIBUTION_KK = { "Обнаружен": "Табылды", "Не обнаружен": "Табылмады" };

/** zoneRu/massRu/distrRu — канонические русские строки, как они хранятся в
 * данных (это ключи сопоставления с цветами/фильтрами — не меняются); функция
 * только подменяет ОТОБРАЖАЕМЫЙ текст. */
export function tZone(zoneRu) {
  return currentLang === "kk" ? ZONE_KK[zoneRu] ?? zoneRu : zoneRu;
}
export function tMassClass(massRu) {
  return currentLang === "kk" ? MASS_CLASS_KK[massRu] ?? massRu : massRu;
}
export function tDistribution(labelRu) {
  return currentLang === "kk" ? DISTRIBUTION_KK[labelRu] ?? labelRu : labelRu;
}

/** Название области/района/нас.пункта — поле name_kk уже готово в данных
 * (этап 1), сами ничего не переводим. */
export function pickPlaceName(props, fallback) {
  if (!props) return fallback;
  const name = currentLang === "kk" ? props.name_kk : props.name_ru;
  return name ?? props.name_ru ?? props.name_kk ?? fallback;
}

/** Название вида — поле name_kz уже готово в species_dict.csv (этап 2). */
export function pickSpeciesName(species, fallback) {
  if (!species) return fallback;
  const name = currentLang === "kk" ? species.name_kz : species.name_ru;
  return name ?? species.name_ru ?? species.name_kz ?? species.latin ?? fallback;
}

/** Применить переводы ко всем статическим [data-i18n] элементам разметки. */
export function applyStaticTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
}
