mod browser;
mod manifest;
mod platform;

use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};

use clap::ValueEnum;

use crate::protocol::NATIVE_HOST_NAME;
pub use browser::{Browser, BrowserFamily};

pub fn is_supported(browser: Browser) -> bool {
    platform::is_supported(browser)
}

pub fn installed_browsers() -> impl Iterator<Item = Browser> {
    Browser::value_variants()
        .iter()
        .copied()
        .filter(|browser| is_supported(*browser) && platform::is_installed(*browser))
}

pub fn is_registered(browser: Browser) -> bool {
    let Ok(manifest_path) = platform::manifest_path(browser) else {
        return false;
    };
    manifest_path.is_file() && platform::is_registered(browser, &manifest_path)
}

pub fn install(browser: Browser) -> Result<(), Box<dyn std::error::Error>> {
    if !is_supported(browser) {
        return Err(format!(
            "{} Native Messaging registration is not supported on this platform",
            browser.display_name()
        )
        .into());
    }
    let manifest_path = platform::manifest_path(browser)?;
    write_manifest(&manifest_path, browser.family())?;
    platform::register(browser, &manifest_path)
}

pub fn install_in_directory(
    directory: &Path,
    family: BrowserFamily,
) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let manifest_path = directory.join(format!("{NATIVE_HOST_NAME}.json"));
    write_manifest(&manifest_path, family)?;
    Ok(manifest_path)
}

pub fn uninstall(browser: Browser) -> Result<(), Box<dyn std::error::Error>> {
    let manifest_path = platform::manifest_path(browser)?;
    platform::unregister(browser, NATIVE_HOST_NAME)?;
    remove_manifest(&manifest_path)
}

fn remove_manifest(path: &Path) -> Result<(), Box<dyn std::error::Error>> {
    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error.into()),
    }
}

fn write_manifest(
    manifest_path: &Path,
    family: BrowserFamily,
) -> Result<(), Box<dyn std::error::Error>> {
    let executable = std::env::current_exe()?.canonicalize()?;
    if let Some(parent) = manifest_path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(
        manifest_path,
        serde_json::to_vec_pretty(&manifest::create(family, &executable))?,
    )?;
    Ok(())
}
