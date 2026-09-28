// Растягивание правой панели результатов мышью (перетаскивание #resize-handle).
// Ширина сохраняется в localStorage — чтобы не сбрасывалась при перезагрузке.

const STORAGE_KEY = "locust-geoportal:resultsPanelWidth";
const MIN_WIDTH = 220;
const MAX_WIDTH = 640;

function readStoredWidth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? parseInt(raw, 10) : null;
  } catch {
    return null;
  }
}

function writeStoredWidth(width) {
  try {
    localStorage.setItem(STORAGE_KEY, String(width));
  } catch {
    // localStorage недоступен (приватный режим и т.п.) — просто не сохраняем
  }
}

export function initResize(map) {
  const handle = document.getElementById("resize-handle");
  const root = document.documentElement;

  const stored = readStoredWidth();
  if (stored) root.style.setProperty("--results-width", `${stored}px`);

  let dragging = false;

  handle.addEventListener("mousedown", (e) => {
    dragging = true;
    handle.classList.add("dragging");
    e.preventDefault();
  });

  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, window.innerWidth - e.clientX));
    root.style.setProperty("--results-width", `${width}px`);
    map.resize();
  });

  window.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove("dragging");
    const width = parseInt(getComputedStyle(root).getPropertyValue("--results-width"), 10);
    if (width) writeStoredWidth(width);
    map.resize();
  });
}
