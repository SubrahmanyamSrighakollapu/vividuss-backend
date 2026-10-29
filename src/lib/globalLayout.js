const DEFAULT_GLOBAL_LAYOUT = {
  header: { enabled: false, logoText: "", logoUrl: "", backgroundColor: "#ffffff", textColor: "#111827", links: [] },
  footer: { enabled: false, backgroundColor: "#111827", textColor: "#ffffff", copyrightText: "", links: [] },
};
function withLayoutDefaults(value) {
  return {
    ...(value || {}),
    header: { ...DEFAULT_GLOBAL_LAYOUT.header, ...(value?.header || {}) },
    footer: { ...DEFAULT_GLOBAL_LAYOUT.footer, ...(value?.footer || {}) },
  };
}
module.exports = { DEFAULT_GLOBAL_LAYOUT, withLayoutDefaults };
