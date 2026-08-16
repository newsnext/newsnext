mod browser;
mod manifest;
mod platform;

use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};

use clap::ValueEnum;

use crate::runtime_environment::RuntimeEnvironment;
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
    let Ok(environment) = RuntimeEnvironment::current() else {
        return false;
    };
    let Ok(manifest_path) = platform::manifest_path(browser, environment.native_host_name()) else {
        return false;
    };
    registration_exists(browser, &manifest_path)
        && manifest_targets_current_executable(&manifest_path)
}

pub fn repair_existing_registrations() -> Vec<(Browser, String)> {
    let Ok(environment) = RuntimeEnvironment::current() else {
        return Vec::new();
    };
    Browser::value_variants()
        .iter()
        .copied()
        .filter_map(|browser| {
            let manifest_path =
                platform::manifest_path(browser, environment.native_host_name()).ok()?;
            if !registration_exists(browser, &manifest_path)
                || manifest_targets_current_executable(&manifest_path)
            {
                return None;
            }
            install(browser)
                .err()
                .map(|error| (browser, error.to_string()))
        })
        .collect()
}

pub fn install(browser: Browser) -> Result<(), Box<dyn std::error::Error>> {
    if !is_supported(browser) {
        return Err(format!(
            "{} Native Messaging registration is not supported on this platform",
            browser.display_name()
        )
        .into());
    }
    let environment = RuntimeEnvironment::current()?;
    let manifest_path = platform::manifest_path(browser, environment.native_host_name())?;
    write_manifest(&manifest_path, browser.family(), environment)?;
    platform::register(browser, &manifest_path, environment.native_host_name())
}

pub fn install_in_directory(
    directory: &Path,
    family: BrowserFamily,
) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let environment = RuntimeEnvironment::current()?;
    let manifest_path = directory.join(format!("{}.json", environment.native_host_name()));
    write_manifest(&manifest_path, family, environment)?;
    Ok(manifest_path)
}

pub fn uninstall(browser: Browser) -> Result<(), Box<dyn std::error::Error>> {
    let environment = RuntimeEnvironment::current()?;
    let manifest_path = platform::manifest_path(browser, environment.native_host_name())?;
    platform::unregister(browser, environment.native_host_name())?;
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
    environment: RuntimeEnvironment,
) -> Result<(), Box<dyn std::error::Error>> {
    let executable = std::env::current_exe()?.canonicalize()?;
    if let Some(parent) = manifest_path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(
        manifest_path,
        serde_json::to_vec_pretty(&manifest::create(family, environment, &executable))?,
    )?;
    Ok(())
}

fn registration_exists(browser: Browser, manifest_path: &Path) -> bool {
    manifest_path.is_file() && platform::is_registered(browser, manifest_path)
}

fn manifest_targets_current_executable(manifest_path: &Path) -> bool {
    let Ok(manifest) = fs::read(manifest_path) else {
        return false;
    };
    let Some(registered_executable) = manifest::executable_path(&manifest) else {
        return false;
    };
    let Ok(current_executable) = std::env::current_exe().and_then(|path| path.canonicalize())
    else {
        return false;
    };
    registered_executable
        .canonicalize()
        .is_ok_and(|path| path == current_executable)
}
