// Состояние в URL (hash) — чтобы текущий вид (вид/показатель/территория/зоны/
// drill-down) переживал перезагрузку страницы и им можно было поделиться ссылкой.
// Карта позиционируется отдельно — interactions.js воспроизводит тот же fitBounds/
// flyTo, что и обычный клик, а не хранит координаты камеры в URL.

function serialize(state) {
  const params = new URLSearchParams();
  if (state.territory !== "regions") params.set("territory", state.territory);
  if (state.species !== "all") params.set("species", state.species);
  if (state.indicator !== "species_count") params.set("indicator", state.indicator);
  if (state.showZonesLayer) params.set("zonesLayer", "1");
  if (state.showSettlements) params.set("settlements", "1");
  if (state.selectedZones.length) params.set("zones", state.selectedZones.join("|"));
  if (state.selection.path.length) {
    params.set("sel", state.selection.path.map((p) => `${p.level}:${p.id}`).join(","));
  }
  return params.toString();
}

export function updateUrl(state) {
  const qs = serialize(state);
  const newHash = qs ? `#${qs}` : "";
  if (window.location.hash !== newHash) {
    history.replaceState(null, "", newHash || window.location.pathname + window.location.search);
  }
}

/** Разобрать URL при загрузке. Возвращает null, если ссылка «пустая» (просто
 * корень). selPath — путь без подписей (label достраивается в interactions.js по
 * данным при восстановлении, см. restoreFromUrl). */
export function parseFromUrl() {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const selRaw = params.get("sel");
  return {
    territory: params.get("territory") || "regions",
    species: params.get("species") || "all",
    indicator: params.get("indicator") || "species_count",
    showZonesLayer: params.get("zonesLayer") === "1",
    showSettlements: params.get("settlements") === "1",
    selectedZones: params.get("zones") ? params.get("zones").split("|") : [],
    selPath: selRaw
      ? selRaw.split(",").map((s) => {
          const i = s.indexOf(":");
          return { level: s.slice(0, i), id: s.slice(i + 1) };
        })
      : [],
  };
}
