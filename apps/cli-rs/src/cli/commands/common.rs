use std::time::Duration;

use clap::Args;
use serde_json::Value;
use uuid::Uuid;

const DEFAULT_TIMEOUT_SECONDS: f64 = 60.0;

#[derive(Clone, Args)]
pub struct ConnectionArgs {
    /// Select a connected browser.
    #[arg(long)]
    pub browser: Option<String>,
    /// Connection and execution timeout in seconds.
    #[arg(long, default_value_t = DEFAULT_TIMEOUT_SECONDS)]
    timeout: f64,
}

impl ConnectionArgs {
    pub fn timeout(&self) -> Result<Duration, Box<dyn std::error::Error>> {
        if !self.timeout.is_finite() || self.timeout <= 0.0 || self.timeout > 600.0 {
            return Err("--timeout must be a number between 0 and 600 seconds".into());
        }
        Ok(Duration::from_millis(
            (self.timeout * 1_000.0).round() as u64
        ))
    }
}

pub fn request_id() -> String {
    Uuid::new_v4().to_string()
}

pub fn print_json(value: &Value, compact: bool) -> Result<(), Box<dyn std::error::Error>> {
    println!(
        "{}",
        if compact {
            serde_json::to_string(value)?
        } else {
            serde_json::to_string_pretty(value)?
        }
    );
    Ok(())
}
