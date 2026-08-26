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

  const storedThemeColor = localStorage.getItem(themeColorKey) ?? "red"
  const themeColor = /^[a-z]+$/.test(storedThemeColor) ? storedThemeColor : "red"
  document.documentElement.classList.add(themeColor)
})()
