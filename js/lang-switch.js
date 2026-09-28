// Переключатель языка интерфейса (RU/KK) — флагами, в левой панели фильтров.

import { getLang, setLang, applyStaticTranslations } from "./i18n.js";

const LANGS = [
  { id: "ru", flag: "🇷🇺", title: "Русский" },
  { id: "kk", flag: "🇰🇿", title: "Қазақша" },
];

export function initLangSwitch(onChange) {
  const el = document.getElementById("lang-switch");

  function render() {
    const active = getLang();
    el.innerHTML = LANGS.map(
      (l) => `<button class="lang-btn${l.id === active ? " active" : ""}" data-lang="${l.id}" title="${l.title}" type="button">${l.flag}</button>`
    ).join("");
    el.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.lang === getLang()) return;
        setLang(btn.dataset.lang);
        render();
        applyStaticTranslations();
        onChange?.();
      });
    });
  }

  render();
  applyStaticTranslations();
}
