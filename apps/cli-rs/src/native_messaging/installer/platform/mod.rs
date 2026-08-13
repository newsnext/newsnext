#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "macos")]
mod macos;
#[cfg(windows)]
mod windows;

#[cfg(target_os = "linux")]
use linux as implementation;
#[cfg(target_os = "macos")]
use macos as implementation;
#[cfg(windows)]
use windows as implementation;

use std::path::{Path, PathBuf};

use super::Browser;

pub(super) fn is_supported(browser: Browser) -> bool {
    implementation::is_supported(browser)
}

pub(super) fn is_installed(browser: Browser) -> bool {
    implementation::is_installed(browser)
}

pub(super) fn manifest_path(browser: Browser) -> Result<PathBuf, Box<dyn std::error::Error>> {
    implementation::manifest_path(browser)
}

pub(super) fn register(
    browser: Browser,
    manifest_path: &Path,
) -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(windows)]
    return implementation::register(browser, manifest_path);
    #[cfg(not(windows))]
    {
        let _ = (browser, manifest_path);
        Ok(())
    }
}

pub(super) fn is_registered(browser: Browser, manifest_path: &Path) -> bool {
    #[cfg(windows)]
    return implementation::is_registered(browser, manifest_path);
    #[cfg(not(windows))]
    {
        let _ = (browser, manifest_path);
        true
    }
}

pub(super) fn unregister(browser: Browser, name: &str) -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(windows)]
    return implementation::unregister(browser, name);
    #[cfg(not(windows))]
    {
        let _ = (browser, name);
        Ok(())
    }
}
