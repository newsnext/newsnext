use std::path::Path;

use serde_json::{Value, json};

use super::BrowserFamily;
use crate::protocol::NATIVE_HOST_NAME;

pub(super) fn create(family: BrowserFamily, executable: &Path) -> Value {
    if family.is_firefox() {
        let allowed_extensions = family.extension_ids().collect::<Vec<_>>();
        json!({
            "name": NATIVE_HOST_NAME,
            "description": "NewsNext browser bridge",
            "path": executable,
            "type": "stdio",
            "allowed_extensions": allowed_extensions,
        })
    } else {
        let allowed_origins = family
            .extension_ids()
            .map(|extension_id| format!("chrome-extension://{extension_id}/"))
            .collect::<Vec<_>>();
        json!({
            "name": NATIVE_HOST_NAME,
            "description": "NewsNext browser bridge",
            "path": executable,
            "type": "stdio",
            "allowed_origins": allowed_origins,
        })
    }
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::create;
    use crate::native_messaging::installer::BrowserFamily;

    #[test]
    fn creates_chromium_authorization() {
        let manifest = create(BrowserFamily::ChromiumBased, Path::new("/bin/newsnext"));
        assert_eq!(
            manifest["allowed_origins"][0],
            "chrome-extension://cffgbnjiaakknooiegnjkojemhidheke/"
        );
        assert_eq!(
            manifest["allowed_origins"][1],
            "chrome-extension://fabmpgknlkdgcgaidafajbhfnnlabaja/"
        );
        assert_eq!(manifest["allowed_origins"].as_array().unwrap().len(), 2);
        assert!(manifest.get("allowed_extensions").is_none());
    }

    #[test]
    fn creates_firefox_authorization() {
        let manifest = create(BrowserFamily::FirefoxBased, Path::new("/bin/newsnext"));
        assert_eq!(manifest["allowed_extensions"][0], "addon@newsnext.app");
        assert!(manifest.get("allowed_origins").is_none());
    }
}
