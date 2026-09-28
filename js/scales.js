// Цветовые шкалы для хороплета. Последовательная — для процентов (встречаемость,
// доминирование, относительная численность) и счётных показателей (кол-во видов).
// Категориальная — для массовости и распространения. «Нет наблюдений» — отдельный
// фиксированный стиль (не 0, а именно «нет данных»), как требует CLAUDE.md.

export const NO_DATA_COLOR = "#d9d9d9";
export const NO_DATA_LABEL = "Нет наблюдений";

// последовательная шкала (ColorBrewer YlOrBr, 5 классов)
export const SEQUENTIAL_RAMP = ["#fff7bc", "#fee391", "#fec44f", "#d95f0e", "#993404"];

export const MASS_CLASS_ORDER = ["редкий", "умеренно массовый", "массовый", "очень массовый"];
export const MASS_CLASS_COLORS = {
  "редкий": SEQUENTIAL_RAMP[0],
  "умеренно массовый": SEQUENTIAL_RAMP[2],
  "массовый": SEQUENTIAL_RAMP[3],
  "очень массовый": SEQUENTIAL_RAMP[4],
};

export const DISTRIBUTION_COLORS = {
  found: "#2f6f3e",
  notFound: "#e8e8e8",
};
export const DISTRIBUTION_LABELS = { found: "Обнаружен", notFound: "Не обнаружен" };

/** Равноинтервальные границы 5 классов на [0, max]. */
export function equalIntervalBreaks(max, n = 5) {
  const breaks = [];
  for (let i = 0; i <= n; i++) breaks.push((max * i) / n);
  return breaks;
}

/** value -> индекс класса (0..breaks.length-2) по границам equalIntervalBreaks. */
function classify(value, breaks) {
  for (let i = breaks.length - 2; i >= 0; i--) {
    if (value >= breaks[i]) return i;
  }
  return 0;
}

export function sequentialColor(value, breaks) {
  if (value == null || Number.isNaN(value)) return NO_DATA_COLOR;
  const idx = classify(value, breaks);
  return SEQUENTIAL_RAMP[Math.min(idx, SEQUENTIAL_RAMP.length - 1)];
}

export function formatBreakLabel(breaks, i, { percent = false } = {}) {
  const lo = Math.round(breaks[i]);
  const hi = Math.round(breaks[i + 1]);
  const suffix = percent ? "%" : "";
  return `${lo}${suffix}–${hi}${suffix}`;
}
