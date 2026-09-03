(() => {
  const themeColorKey = "newsnext-theme-color"
  const themeModeKey = "newsnext-theme-mode"
  const systemTheme = "system"
  let themeMode = localStorage.getItem(themeModeKey) ?? systemTheme

  if (themeMode !== "light" && themeMode !== "dark" && themeMode !== systemTheme) {
    themeMode = systemTheme
  }

  const isDark = themeMode === "dark"
    || (
      themeMode === systemTheme
      && window.matchMedia("(prefers-color-scheme: dark)").matches
    )

  document.documentElement.classList.toggle("dark", isDark)
  document.documentElement.style.colorScheme = isDark ? "dark" : "light"

  const requestedThemeColor = document.documentElement.dataset.themeColor
    ?? localStorage.getItem(themeColorKey)
    ?? "red"
  const themeColor = /^[a-z]+$/.test(requestedThemeColor) ? requestedThemeColor : "red"
  document.documentElement.classList.add(themeColor)
})()
