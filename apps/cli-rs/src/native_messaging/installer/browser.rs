use clap::ValueEnum;

const DEVELOPMENT_CHROME_EXTENSION_ID: &str = "cffgbnjiaakknooiegnjkojemhidheke";
const PRODUCTION_CHROMIUM_EXTENSION_ID: Option<&str> = Some("fabmpgknlkdgcgaidafajbhfnnlabaja");
const FIREFOX_EXTENSION_ID: &str = "addon@newsnext.app";

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

    pub(super) fn extension_ids(self) -> impl Iterator<Item = &'static str> {
        let ids = match self {
            Self::ChromiumBased => [
                Some(DEVELOPMENT_CHROME_EXTENSION_ID),
                PRODUCTION_CHROMIUM_EXTENSION_ID,
            ],
            Self::FirefoxBased => [Some(FIREFOX_EXTENSION_ID), None],
        };
        ids.into_iter().flatten()
    }

    pub(super) fn is_firefox(self) -> bool {
        self == Self::FirefoxBased
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
