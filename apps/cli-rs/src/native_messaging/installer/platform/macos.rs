use std::env;
use std::path::PathBuf;

use super::super::Browser;

pub(super) fn is_supported(_browser: Browser) -> bool {
    true
}

pub(super) fn is_installed(browser: Browser) -> bool {
    let application = match browser {
        Browser::Chrome => "Google Chrome.app",
        Browser::Chromium => "Chromium.app",
        Browser::Edge => "Microsoft Edge.app",
        Browser::Firefox => "Firefox.app",
        Browser::EgoLite => "ego lite.app",
        Browser::Dia => "Dia.app",
        Browser::Arc => "Arc.app",
    };
    let system = PathBuf::from("/Applications").join(application);
    let user = env::var_os("HOME")
        .map(PathBuf::from)
        .map(|home| home.join("Applications").join(application));
    system.exists() || user.is_some_and(|path| path.exists())
}

pub(super) fn manifest_path(
    browser: Browser,
    host_name: &str,
) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let home = env::var_os("HOME").ok_or("HOME is not set")?;
    let directory = match browser {
        Browser::Chrome => "Library/Application Support/Google/Chrome/NativeMessagingHosts",
        Browser::Chromium => "Library/Application Support/Chromium/NativeMessagingHosts",
        Browser::Edge => "Library/Application Support/Microsoft Edge/NativeMessagingHosts",
        Browser::Firefox => "Library/Application Support/Mozilla/NativeMessagingHosts",
        Browser::EgoLite => "Library/Application Support/Citro Labs/ego lite/NativeMessagingHosts",
        Browser::Dia => "Library/Application Support/Dia/User Data/NativeMessagingHosts",
        Browser::Arc => "Library/Application Support/Arc/User Data/NativeMessagingHosts",
    };
    Ok(PathBuf::from(home)
        .join(directory)
        .join(format!("{host_name}.json")))
}
