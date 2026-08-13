use std::env;
use std::path::PathBuf;

use super::super::Browser;
use crate::protocol::NATIVE_HOST_NAME;

pub(super) fn is_supported(browser: Browser) -> bool {
    matches!(
        browser,
        Browser::Chrome | Browser::Chromium | Browser::Edge | Browser::Firefox
    )
}

pub(super) fn is_installed(browser: Browser) -> bool {
    let executable_names: &[&str] = match browser {
        Browser::Chrome => &["google-chrome", "google-chrome-stable"],
        Browser::Chromium => &["chromium", "chromium-browser"],
        Browser::Edge => &["microsoft-edge", "microsoft-edge-stable"],
        Browser::Firefox => &["firefox"],
        Browser::EgoLite | Browser::Dia | Browser::Arc => &[],
    };
    let Some(path) = env::var_os("PATH") else {
        return false;
    };
    executable_names.iter().any(|name| {
        env::split_paths(&path)
            .map(|directory| directory.join(name))
            .any(|candidate| candidate.exists())
    })
}

pub(super) fn manifest_path(browser: Browser) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let home = env::var_os("HOME").ok_or("HOME is not set")?;
    let directory = match browser {
        Browser::Chrome => ".config/google-chrome/NativeMessagingHosts",
        Browser::Chromium => ".config/chromium/NativeMessagingHosts",
        Browser::Edge => ".config/microsoft-edge/NativeMessagingHosts",
        Browser::Firefox => ".mozilla/native-messaging-hosts",
        Browser::EgoLite | Browser::Dia | Browser::Arc => {
            return Err(format!(
                "{} Native Messaging registration is not supported on Linux",
                browser.display_name()
            )
            .into());
        }
    };
    Ok(PathBuf::from(home)
        .join(directory)
        .join(format!("{NATIVE_HOST_NAME}.json")))
}
