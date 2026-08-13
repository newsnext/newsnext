use std::io::{self, IsTerminal};

use clap::Args;
use dialoguer::{MultiSelect, theme::ColorfulTheme};

use crate::native_messaging::installer::{self, Browser, BrowserFamily};

#[derive(Args)]
pub struct InstallNativeHostArgs {
    /// Browsers to register without showing the interactive selector.
    #[arg(value_enum, value_name = "BROWSER")]
    browsers: Vec<Browser>,
    /// Write a Chromium- or Firefox-based manifest to the current directory.
    #[arg(
        long,
        value_enum,
        value_name = "FAMILY",
        num_args = 0..=1,
        default_missing_value = "chromium-based",
        conflicts_with = "browsers"
    )]
    current_dir: Option<BrowserFamily>,
}

impl InstallNativeHostArgs {
    pub fn run(self) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(family) = self.current_dir {
            let manifest_path = installer::install_in_directory(&std::env::current_dir()?, family)?;
            println!(
                "{} Native Messaging manifest written to {}",
                family.display_name(),
                manifest_path.display()
            );
            return Ok(());
        }
        let browsers = if self.browsers.is_empty() {
            select_browsers()?
        } else {
            deduplicate_browsers(self.browsers)
        };
        validate_selection(&browsers)?;
        for browser in &browsers {
            installer::install(*browser).map_err(|error| {
                format!(
                    "failed to install the Native Messaging host for {}: {error}",
                    browser.display_name()
                )
            })?;
        }
        print_summary(&browsers);
        Ok(())
    }
}

fn deduplicate_browsers(browsers: Vec<Browser>) -> Vec<Browser> {
    browsers
        .into_iter()
        .fold(Vec::new(), |mut unique, browser| {
            if !unique.contains(&browser) {
                unique.push(browser);
            }
            unique
        })
}

fn validate_selection(browsers: &[Browser]) -> Result<(), Box<dyn std::error::Error>> {
    if browsers.is_empty() {
        return Err("no browsers selected".into());
    }
    if let Some(browser) = browsers
        .iter()
        .find(|browser| !installer::is_supported(**browser))
    {
        return Err(format!(
            "{} Native Messaging registration is not supported on this platform",
            browser.display_name()
        )
        .into());
    }
    Ok(())
}

fn select_browsers() -> Result<Vec<Browser>, Box<dyn std::error::Error>> {
    let browsers = installer::installed_browsers().collect::<Vec<_>>();
    if browsers.is_empty() {
        return Err(
            "no supported browsers detected; pass a browser explicitly (for example, `install-native-host chrome`)"
                .into(),
        );
    }
    if !io::stdin().is_terminal() || !io::stderr().is_terminal() {
        return Ok(browsers);
    }
    let labels = browsers
        .iter()
        .map(|browser| browser.display_name())
        .collect::<Vec<_>>();
    let defaults = vec![true; browsers.len()];
    let selected = MultiSelect::with_theme(&ColorfulTheme::default())
        .with_prompt("Select browsers for the Native Messaging host")
        .items(&labels)
        .defaults(&defaults)
        .interact()?;
    Ok(selected.into_iter().map(|index| browsers[index]).collect())
}

fn print_summary(browsers: &[Browser]) {
    println!("Native Messaging host installed successfully:\n");
    for browser in browsers {
        println!("  ✓ {}", browser.display_name());
    }
    println!("\nRestart the selected browsers to connect them to NewsNext.");
}
