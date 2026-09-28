// Загрузка JSON/GeoJSON из web/data/. Только чтение, кэш в памяти на время сессии.

const cache = new Map();

async function fetchJson(url) {
  if (cache.has(url)) return cache.get(url);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Не удалось загрузить ${url}: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  cache.set(url, json);
  return json;
}

export function loadGeoJson(url) {
  return fetchJson(url);
}

export function loadJson(url) {
  return fetchJson(url);
}

export async function loadAll(urlMap) {
  const entries = Object.entries(urlMap);
  const results = await Promise.all(entries.map(([, url]) => fetchJson(url)));
  const out = {};
  entries.forEach(([key], i) => {
    out[key] = results[i];
  });
  return out;
}
