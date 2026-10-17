// Run before styles so a saved theme is applied before the first paint.
(() => {
  let theme = "system";
  let language = navigator.language.toLowerCase().startsWith("zh")
    ? "zh"
    : "en";
  try {
    const savedTheme = localStorage.getItem("chronos-site-theme");
    const savedLanguage = localStorage.getItem("chronos-site-language");
    if (["system", "dark", "light"].includes(savedTheme)) theme = savedTheme;
    if (["zh", "en"].includes(savedLanguage)) language = savedLanguage;
  } catch {
    /* Preferences remain usable when storage is blocked. */
  }
  document.documentElement.dataset.preference = theme;
  document.documentElement.dataset.theme =
    theme === "system"
      ? matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
})();
