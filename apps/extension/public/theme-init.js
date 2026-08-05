(() => {
  const settingsKey = "newsnext-settings"
  const themeColorKey = "newsnext-theme-color"
  const systemTheme = "system"
  let themeMode = systemTheme

  try {
    const settings = JSON.parse(localStorage.getItem(settingsKey) ?? "null")
    const persistedThemeMode = settings?.appearance?.themeMode

    if (
      persistedThemeMode === "light"
      || persistedThemeMode === "dark"
      || persistedThemeMode === systemTheme
    ) {
      themeMode = persistedThemeMode
    }
  } catch {
    // Fall back to the system preference when persisted settings are invalid.
  }

  const isDark = themeMode === "dark"
    || (
      themeMode === systemTheme
      && window.matchMedia("(prefers-color-scheme: dark)").matches
    )

  document.documentElement.classList.toggle("dark", isDark)
  document.documentElement.style.colorScheme = isDark ? "dark" : "light"

  const storedThemeColor = localStorage.getItem(themeColorKey) ?? "red"
  const themeColor = /^[a-z]+$/.test(storedThemeColor) ? storedThemeColor : "red"
  document.documentElement.classList.add(themeColor)
})()
