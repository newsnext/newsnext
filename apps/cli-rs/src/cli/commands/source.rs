use std::fs;
use std::io::{self, Read};
use std::path::PathBuf;
use std::sync::mpsc;
use std::time::{Duration, Instant};

use clap::Args;
use notify::{RecursiveMode, Watcher};
use serde_json::{Map, Value};

use crate::control::execute;
use crate::protocol::{CommandResult, ExtensionCommand};

use super::common::{ConnectionArgs, print_json, request_id};

#[derive(Args)]
pub struct SourceRunArgs {
    /// Registered source ID, provider JSON file, or - for standard input.
    input: String,
    /// Source ID when the provider defines multiple sources.
    source_id: Option<String>,
    #[command(flatten)]
    connection: ConnectionArgs,
    /// Set a source parameter; may be repeated.
    #[arg(long = "param")]
    params_entries: Vec<String>,
    /// Set source parameters from a JSON object.
    #[arg(long)]
    params: Option<String>,
    /// Override the provider ID inferred from the filename.
    #[arg(long)]
    provider_id: Option<String>,
    /// Reuse and update the provider's stored secrets.
    #[arg(long)]
    use_provider_secrets: bool,
    /// Rerun when the provider file changes.
    #[arg(short = 'w', long)]
    watch: bool,
    /// Print result JSON on one line.
    #[arg(long)]
    compact: bool,
    /// Print extension-side error stacks.
    #[arg(short = 'v', long)]
    verbose: bool,
}

pub fn run(address: &str, args: SourceRunArgs) -> Result<(), Box<dyn std::error::Error>> {
    if args.watch && args.input == "-" {
        return Err("--watch cannot be used when reading a provider from standard input".into());
    }
    let params = parse_params(args.params.as_deref(), &args.params_entries)?;
    if args.watch {
        return run_watch(address, &args, params);
    }
    execute_source_once(address, &args, params)
}

fn execute_source_once(
    address: &str,
    args: &SourceRunArgs,
    params: Map<String, Value>,
) -> Result<(), Box<dyn std::error::Error>> {
    let target = load_source_target(args)?;
    let (request, label) = match target {
        SourceTarget::Registered { source_id } => {
            if args.use_provider_secrets {
                return Err("--use-provider-secrets is only available for provider files".into());
            }
            let label = source_id.clone();
            (
                ExtensionCommand::SourceRun {
                    id: request_id(),
                    source_id,
                    provider_id: None,
                    provider: None,
                    params: Some(Value::Object(params)),
                    use_provider_secrets: None,
                },
                label,
            )
        }
        SourceTarget::Provider {
            provider_id,
            source_id,
            provider,
            ..
        } => {
            let label = format!("{provider_id}:{source_id}");
            (
                ExtensionCommand::SourceRun {
                    id: request_id(),
                    source_id,
                    provider_id: Some(provider_id),
                    provider: Some(provider),
                    params: Some(Value::Object(params)),
                    use_provider_secrets: Some(args.use_provider_secrets),
                },
                label,
            )
        }
    };
    let timeout = args.connection.timeout()?;
    let started = Instant::now();
    let execution = execute(address, args.connection.browser.clone(), request, timeout)?;
    let result = match execution.result {
        CommandResult::Success { data, .. } => data.unwrap_or(Value::Null),
        CommandResult::Failure { error, .. } => {
            if error.code.as_deref() == Some("SOURCE_LOGIN_REQUIRED")
                && let Some(login_url) = error.login_url
            {
                return Err(format!(
                    "Source requires authentication.\nLog in at {login_url}, then rerun the command."
                )
                .into());
            }
            return Err(if args.verbose {
                error
                    .stack
                    .unwrap_or_else(|| format!("{}: {}", error.name, error.message))
            } else {
                format!("{}: {}", error.name, error.message)
            }
            .into());
        }
    };
    print_json(&result, args.compact || args.watch)?;
    let count = result
        .as_array()
        .map(|items| {
            format!(
                "{} {}",
                items.len(),
                if items.len() == 1 { "item" } else { "items" }
            )
        })
        .unwrap_or_else(|| "completed".into());
    eprintln!(
        "✓ {label} — {count} in {} ms via {}",
        started.elapsed().as_millis(),
        execution.instance.browser
    );
    Ok(())
}

fn run_watch(
    address: &str,
    args: &SourceRunArgs,
    params: Map<String, Value>,
) -> Result<(), Box<dyn std::error::Error>> {
    let SourceTarget::Provider { path, .. } = load_source_target(args)? else {
        return Err("Watch mode requires a provider file".into());
    };
    let path = path.ok_or("Watch mode requires a provider file")?;
    let (sender, receiver) = mpsc::channel();
    let mut watcher = notify::recommended_watcher(move |event| {
        let _ = sender.send(event);
    })?;
    watcher.watch(&path, RecursiveMode::NonRecursive)?;
    let (stop_sender, stop_receiver) = mpsc::channel();
    ctrlc::set_handler(move || {
        let _ = stop_sender.send(());
    })?;
    eprintln!("Watching {}…", path.display());
    if let Err(error) = execute_source_once(address, args, params.clone()) {
        eprintln!("{error}");
    }
    loop {
        if stop_receiver.try_recv().is_ok() {
            return Ok(());
        }
        match receiver.recv_timeout(Duration::from_millis(100)) {
            Ok(Ok(_)) => {
                std::thread::sleep(Duration::from_millis(150));
                while receiver.try_recv().is_ok() {}
                if let Err(error) = execute_source_once(address, args, params.clone()) {
                    eprintln!("{error}");
                }
            }
            Ok(Err(error)) => eprintln!("Provider watcher error: {error}"),
            Err(mpsc::RecvTimeoutError::Timeout) => {}
            Err(mpsc::RecvTimeoutError::Disconnected) => {
                return Err("Provider watcher disconnected".into());
            }
        }
    }
}

fn parse_params(
    json: Option<&str>,
    entries: &[String],
) -> Result<Map<String, Value>, Box<dyn std::error::Error>> {
    let mut params = match json {
        Some(json) => serde_json::from_str::<Value>(json)?
            .as_object()
            .cloned()
            .ok_or("--params must be a JSON object")?,
        None => Map::new(),
    };
    for entry in entries {
        let (key, raw_value) = entry
            .split_once('=')
            .ok_or_else(|| format!("Invalid --param \"{entry}\". Expected key=value."))?;
        let key = key.trim();
        if key.is_empty() {
            return Err("--param requires a non-empty key".into());
        }
        let value =
            serde_json::from_str(raw_value).unwrap_or_else(|_| Value::String(raw_value.into()));
        params.insert(key.into(), value);
    }
    Ok(params)
}

enum SourceTarget {
    Registered {
        source_id: String,
    },
    Provider {
        path: Option<PathBuf>,
        provider_id: String,
        source_id: String,
        provider: Value,
    },
}

fn load_source_target(args: &SourceRunArgs) -> Result<SourceTarget, Box<dyn std::error::Error>> {
    let provider_mode = args.source_id.is_some()
        || args.provider_id.is_some()
        || args.watch
        || looks_like_provider_input(&args.input);
    if !provider_mode {
        let parts = args.input.split(':').collect::<Vec<_>>();
        if parts.len() != 2
            || parts
                .iter()
                .any(|part| part.is_empty() || part.chars().any(char::is_whitespace))
        {
            return Err(format!(
                "Registered source ID must use the provider:source format: {}",
                args.input
            )
            .into());
        }
        return Ok(SourceTarget::Registered {
            source_id: args.input.clone(),
        });
    }

    let (path, text) = if args.input == "-" {
        let mut text = String::new();
        io::stdin().read_to_string(&mut text)?;
        (None, text)
    } else {
        let path = fs::canonicalize(&args.input)
            .map_err(|_| format!("Provider file not found: {}", args.input))?;
        let text = fs::read_to_string(&path)?;
        (Some(path), text)
    };
    let provider: Value = serde_json::from_str(&text).map_err(|error| {
        format!(
            "Could not parse provider JSON from {}: {error}",
            path.as_ref().map_or_else(
                || "standard input".into(),
                |path| path.display().to_string()
            )
        )
    })?;
    let sources = provider
        .get("sources")
        .and_then(Value::as_object)
        .ok_or("Provider does not define any sources")?;
    if sources.is_empty() {
        return Err("Provider does not define any sources".into());
    }
    let source_ids = sources.keys().cloned().collect::<Vec<_>>();
    let source_id = match &args.source_id {
        Some(source_id) if sources.contains_key(source_id) => source_id.clone(),
        Some(source_id) => {
            return Err(format!(
                "Source \"{source_id}\" not found. Available sources: {}",
                source_ids.join(", ")
            )
            .into());
        }
        None if source_ids.len() == 1 => source_ids[0].clone(),
        None => {
            return Err(format!(
                "Source ID required. Available sources: {}",
                source_ids.join(", ")
            )
            .into());
        }
    };
    let provider_id = args.provider_id.clone().unwrap_or_else(|| {
        path.as_ref()
            .and_then(|path| path.file_stem())
            .and_then(|stem| stem.to_str())
            .unwrap_or("stdin")
            .into()
    });
    if provider_id.is_empty()
        || provider_id.contains(':')
        || provider_id.chars().any(char::is_whitespace)
    {
        return Err("Provider ID must be a non-empty ID without colons or whitespace".into());
    }
    Ok(SourceTarget::Provider {
        path,
        provider_id,
        source_id,
        provider,
    })
}

fn looks_like_provider_input(input: &str) -> bool {
    input == "-"
        || input.ends_with(".json")
        || input.contains('/')
        || input.contains('\\')
        || input.starts_with('.')
}

#[cfg(test)]
mod tests {
    use super::parse_params;

    #[test]
    fn parses_json_param_values_and_plain_strings() {
        let params = parse_params(
            Some(r#"{"existing":1,"override":false}"#),
            &["override=true".into(), "label=top".into()],
        )
        .unwrap();
        assert_eq!(params["existing"], 1);
        assert_eq!(params["override"], true);
        assert_eq!(params["label"], "top");
    }
}
