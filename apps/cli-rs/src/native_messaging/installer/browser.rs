use clap::ValueEnum;

const DEVELOPMENT_CHROMIUM_EXTENSION_ID: &str = "cffgbnjiaakknooiegnjkojemhidheke";
const PRODUCTION_CHROMIUM_EXTENSION_ID: &str = "fabmpgknlkdgcgaidafajbhfnnlabaja";
const DEVELOPMENT_FIREFOX_EXTENSION_ID: &str = "dev@newsnext.app";
const PRODUCTION_FIREFOX_EXTENSION_ID: &str = "addon@newsnext.app";

use crate::runtime_environment::RuntimeEnvironment;

#[derive(Clone, Copy, Debug, Eq, PartialEq, ValueEnum)]
pub enum BrowserFamily {
    #[value(name = "chromium-based")]
    ChromiumBased,
    #[value(name = "firefox-based")]
    FirefoxBased,
}

impl BrowserFamily {
    pub fn display_name(self) -> &'static str {
        match self {
            Self::ChromiumBased => "Chromium-based",
            Self::FirefoxBased => "Firefox-based",
        }
    }

    pub(super) fn is_firefox(self) -> bool {
        self == Self::FirefoxBased
    }

    pub(super) fn extension_id(self, environment: RuntimeEnvironment) -> &'static str {
        match (self, environment) {
            (Self::ChromiumBased, RuntimeEnvironment::Development) => {
                DEVELOPMENT_CHROMIUM_EXTENSION_ID
            }
            (Self::ChromiumBased, RuntimeEnvironment::Production) => {
                PRODUCTION_CHROMIUM_EXTENSION_ID
            }
            (Self::FirefoxBased, RuntimeEnvironment::Development) => {
                DEVELOPMENT_FIREFOX_EXTENSION_ID
            }
            (Self::FirefoxBased, RuntimeEnvironment::Production) => PRODUCTION_FIREFOX_EXTENSION_ID,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, ValueEnum)]
pub enum Browser {
    Chrome,
    Chromium,
    Edge,
    Firefox,
    EgoLite,
    Dia,
    Arc,
}

impl Browser {
    pub fn display_name(self) -> &'static str {
        match self {
            Self::Chrome => "Google Chrome",
            Self::Chromium => "Chromium",
            Self::Edge => "Microsoft Edge",
            Self::Firefox => "Firefox",
            Self::EgoLite => "Ego Lite",
            Self::Dia => "Dia",
            Self::Arc => "Arc",
        }
    }

    pub(super) fn family(self) -> BrowserFamily {
        match self {
            Self::Firefox => BrowserFamily::FirefoxBased,
            Self::Chrome | Self::Chromium | Self::Edge | Self::EgoLite | Self::Dia | Self::Arc => {
                BrowserFamily::ChromiumBased
            }
        }
    }

    #[cfg(windows)]
    pub(super) fn identifier(self) -> &'static str {
        match self {
            Self::Chrome => "chrome",
            Self::Chromium => "chromium",
            Self::Edge => "edge",
            Self::Firefox => "firefox",
            Self::EgoLite => "ego-lite",
            Self::Dia => "dia",
            Self::Arc => "arc",
        }
    }
}
