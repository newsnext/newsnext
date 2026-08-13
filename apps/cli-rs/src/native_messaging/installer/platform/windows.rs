use std::env;
use std::path::{Path, PathBuf};

use winreg::RegKey;
use winreg::enums::{HKEY_CURRENT_USER, KEY_READ};

use super::super::Browser;
use crate::protocol::NATIVE_HOST_NAME;

pub(super) fn is_supported(browser: Browser) -> bool {
    matches!(
        browser,
        Browser::Chrome | Browser::Chromium | Browser::Edge | Browser::Firefox
    )
}

pub(super) fn is_installed(browser: Browser) -> bool {
    let relative_paths: &[&str] = match browser {
        Browser::Chrome => &["Google\\Chrome\\Application\\chrome.exe"],
        Browser::Chromium => &["Chromium\\Application\\chrome.exe"],
        Browser::Edge => &["Microsoft\\Edge\\Application\\msedge.exe"],
        Browser::Firefox => &["Mozilla Firefox\\firefox.exe"],
        Browser::EgoLite | Browser::Dia | Browser::Arc => &[],
    };
    ["LOCALAPPDATA", "PROGRAMFILES", "PROGRAMFILES(X86)"]
        .iter()
        .filter_map(env::var_os)
        .any(|root| {
            relative_paths
                .iter()
                .map(|relative| PathBuf::from(&root).join(relative))
                .any(|candidate| candidate.exists())
        })
}

pub(super) fn manifest_path(browser: Browser) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let data = env::var_os("LOCALAPPDATA").ok_or("LOCALAPPDATA is not set")?;
    Ok(PathBuf::from(data)
        .join("NewsNext")
        .join("NativeMessagingHosts")
        .join(browser.identifier())
        .join(format!("{NATIVE_HOST_NAME}.json")))
}

pub(super) fn register(
    browser: Browser,
    manifest_path: &Path,
) -> Result<(), Box<dyn std::error::Error>> {
    let path = registry_path(browser, NATIVE_HOST_NAME)?;
    let (key, _) = RegKey::predef(HKEY_CURRENT_USER).create_subkey(path)?;
    key.set_value("", &manifest_path.to_string_lossy().as_ref())?;
    Ok(())
}

pub(super) fn is_registered(browser: Browser, manifest_path: &Path) -> bool {
    let Ok(path) = registry_path(browser, NATIVE_HOST_NAME) else {
        return false;
    };
    let root = RegKey::predef(HKEY_CURRENT_USER);
    let Ok(key) = root.open_subkey_with_flags(path, KEY_READ) else {
        return false;
    };
    let expected = manifest_path.to_string_lossy();
    key.get_value::<String, _>("")
        .is_ok_and(|registered| registered == expected.as_ref())
}

pub(super) fn unregister(browser: Browser, name: &str) -> Result<(), Box<dyn std::error::Error>> {
    let path = registry_path(browser, name)?;
    match RegKey::predef(HKEY_CURRENT_USER).delete_subkey_all(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error.into()),
    }
}

fn registry_path(browser: Browser, name: &str) -> Result<String, Box<dyn std::error::Error>> {
    let vendor = match browser {
        Browser::Chrome => "Google\\Chrome",
        Browser::Chromium => "Chromium",
        Browser::Edge => "Microsoft\\Edge",
        Browser::Firefox => "Mozilla",
        Browser::EgoLite | Browser::Dia | Browser::Arc => {
            return Err(format!(
                "{} Native Messaging registration is not supported on Windows",
                browser.display_name()
            )
            .into());
        }
    };
    Ok(format!(r"Software\{vendor}\NativeMessagingHosts\{name}"))
}
