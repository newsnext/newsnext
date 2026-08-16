use std::path::{Path, PathBuf};

use serde_json::{Value, json};

use super::BrowserFamily;
use crate::runtime_environment::RuntimeEnvironment;

pub(super) fn create(
    family: BrowserFamily,
    environment: RuntimeEnvironment,
    executable: &Path,
) -> Value {
    let host_name = environment.native_host_name();
    let extension_id = family.extension_id(environment);
    if family.is_firefox() {
        json!({
            "name": host_name,
            "description": "NewsNext browser bridge",
            "path": executable,
            "type": "stdio",
            "allowed_extensions": [extension_id],
        })
    } else {
        json!({
            "name": host_name,
            "description": "NewsNext browser bridge",
            "path": executable,
            "type": "stdio",
            "allowed_origins": [format!("chrome-extension://{extension_id}/")],
        })
    }
}

pub(super) fn executable_path(manifest: &[u8]) -> Option<PathBuf> {
    serde_json::from_slice::<Value>(manifest)
        .ok()?
        .get("path")?
        .as_str()
        .map(PathBuf::from)
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::{create, executable_path};
    use crate::native_messaging::installer::BrowserFamily;
    use crate::runtime_environment::RuntimeEnvironment;

    #[test]
    fn creates_chromium_authorization() {
        let manifest = create(
            BrowserFamily::ChromiumBased,
            RuntimeEnvironment::Development,
            Path::new("/bin/newsnext"),
        );
        assert_eq!(manifest["name"], "app.newsnext.host.dev");
        assert_eq!(
            manifest["allowed_origins"][0],
            "chrome-extension://cffgbnjiaakknooiegnjkojemhidheke/"
        );
        assert_eq!(manifest["allowed_origins"].as_array().unwrap().len(), 1);
        assert!(manifest.get("allowed_extensions").is_none());
    }

    #[test]
    fn creates_firefox_authorization() {
        let manifest = create(
            BrowserFamily::FirefoxBased,
            RuntimeEnvironment::Production,
            Path::new("/bin/newsnext"),
        );
        assert_eq!(manifest["name"], "app.newsnext.host");
        assert_eq!(manifest["allowed_extensions"][0], "addon@newsnext.app");
        assert!(manifest.get("allowed_origins").is_none());
    }

    #[test]
    fn reads_manifest_executable_path() {
        assert_eq!(
            executable_path(br#"{"path":"/Applications/NewsNext.app/Contents/MacOS/newsnext"}"#),
            Some("/Applications/NewsNext.app/Contents/MacOS/newsnext".into())
        );
        assert_eq!(executable_path(br#"{"path":42}"#), None);
        assert_eq!(executable_path(b"not json"), None);
    }
}
