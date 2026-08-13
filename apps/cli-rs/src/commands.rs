use std::fs;
use std::io::{self, Read};
use std::path::PathBuf;
use std::sync::mpsc;
use std::time::{Duration, Instant};

use chrono::{DateTime, NaiveDate};
use clap::{Args, Subcommand};
use http::{HeaderName, HeaderValue, Method};
use notify::{RecursiveMode, Watcher};
use serde_json::{Map, Value};
use url::Url;
use uuid::Uuid;

use crate::control::execute;
use crate::protocol::{CommandResult, ExtensionCommand};

const DEFAULT_TIMEOUT_SECONDS: f64 = 60.0;

#[derive(Clone, Args)]
pub struct ConnectionArgs {
    /// Select a connected browser.
    #[arg(long)]
    browser: Option<String>,
    /// Connection and execution timeout in seconds.
    #[arg(long, default_value_t = DEFAULT_TIMEOUT_SECONDS)]
    timeout: f64,
}

impl ConnectionArgs {
    fn timeout(&self) -> Result<Duration, Box<dyn std::error::Error>> {
        if !self.timeout.is_finite() || self.timeout <= 0.0 || self.timeout > 600.0 {
            return Err("--timeout must be a number between 0 and 600 seconds".into());
        }
        Ok(Duration::from_millis(
            (self.timeout * 1_000.0).round() as u64
        ))
    }
}

#[derive(Args)]
pub struct JsonListArgs {
    #[command(flatten)]
    connection: ConnectionArgs,
    /// Print result JSON on one line.
    #[arg(long)]
    compact: bool,
}

#[derive(Args)]
pub struct FetchArgs {
    /// HTTP(S) URL to fetch in the connected extension.
    url: String,
    #[command(flatten)]
    connection: ConnectionArgs,
    /// HTTP method (defaults to GET, or POST with --body).
    #[arg(short = 'X', long)]
    method: Option<String>,
    /// Add a request header; may be repeated.
    #[arg(short = 'H', long = "header")]
    headers: Vec<String>,
    /// Set the request body.
    #[arg(short = 'd', long)]
    body: Option<String>,
    /// Include response status and headers.
    #[arg(short = 'i', long)]
    include: bool,
}

#[derive(Subcommand)]
pub enum SourceCommand {
    /// List sources registered in a connected extension.
    List(ConnectionArgs),
    /// Run a registered or local JSON source in a connected extension.
    Run(SourceRunArgs),
}

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

#[derive(Subcommand)]
pub enum HistoryCommand {
    /// List locally stored history datasets.
    Datasets(HistoryDatasetsArgs),
    /// List observation metadata for a saved card instance.
    Observations(HistoryObservationsArgs),
    /// Read an exact observation for a saved card instance.
    Get(HistoryGetArgs),
    /// Compare two observations for a saved card instance.
    Compare(HistoryCompareArgs),
}

#[derive(Args)]
pub struct HistoryDatasetsArgs {
    #[command(flatten)]
    connection: ConnectionArgs,
    #[arg(long)]
    compact: bool,
    #[arg(long)]
    cursor: Option<String>,
    #[arg(long, value_parser = parse_limit)]
    limit: Option<u64>,
    #[arg(long)]
    provider_id: Option<String>,
    #[arg(long)]
    source_id: Option<String>,
}

#[derive(Args)]
pub struct HistoryObservationsArgs {
    /// Saved card instance ID.
    instance_id: String,
    #[command(flatten)]
    connection: ConnectionArgs,
    #[arg(long)]
    compact: bool,
    #[arg(long, value_parser = parse_history_time)]
    cursor: Option<u64>,
    #[arg(long, value_parser = parse_history_time)]
    from: Option<u64>,
    #[arg(long, value_parser = parse_limit)]
    limit: Option<u64>,
    #[arg(long, value_parser = parse_history_time)]
    to: Option<u64>,
}

#[derive(Args)]
pub struct HistoryGetArgs {
    /// Saved card instance ID.
    instance_id: String,
    /// Observation time as Unix milliseconds or an ISO 8601 date.
    #[arg(value_parser = parse_history_time)]
    observed_at: u64,
    #[command(flatten)]
    connection: ConnectionArgs,
    #[arg(long)]
    compact: bool,
}

#[derive(Args)]
pub struct HistoryCompareArgs {
    /// Saved card instance ID.
    instance_id: String,
    /// Earlier observation time as Unix milliseconds or an ISO 8601 date.
    #[arg(value_parser = parse_history_time)]
    before: u64,
    /// Later observation time as Unix milliseconds or an ISO 8601 date.
    #[arg(value_parser = parse_history_time)]
    after: u64,
    #[command(flatten)]
    connection: ConnectionArgs,
    #[arg(long)]
    compact: bool,
}

pub fn run_fetch(address: &str, args: FetchArgs) -> Result<(), Box<dyn std::error::Error>> {
    let url = normalize_fetch_url(&args.url)?;
    let method = args
        .method
        .unwrap_or_else(|| if args.body.is_some() { "POST" } else { "GET" }.into())
        .to_uppercase();
    let method = Method::from_bytes(method.as_bytes())?;
    if matches!(method, Method::CONNECT | Method::TRACE)
        || method.as_str().eq_ignore_ascii_case("TRACK")
    {
        return Err(format!("Invalid or unsupported HTTP method: {method}").into());
    }
    if args.body.is_some() && matches!(method, Method::GET | Method::HEAD) {
        return Err(format!("{method} requests cannot have a body").into());
    }
    let headers = args
        .headers
        .iter()
        .map(|header| parse_header(header))
        .collect::<Result<Vec<_>, _>>()?;
    let timeout = args.connection.timeout()?;
    let execution = execute(
        address,
        args.connection.browser,
        ExtensionCommand::Fetch {
            id: request_id(),
            url,
            method: method.to_string(),
            headers,
            timeout_ms: timeout.as_millis() as u64,
            body: args.body,
        },
        timeout,
    )?;
    let data = success_data(execution.result)?;
    let response = parse_fetch_response(data)?;
    if args.include {
        println!(
            "{}{}",
            response.status,
            if response.status_text.is_empty() {
                String::new()
            } else {
                format!(" {}", response.status_text)
            }
        );
        for (name, value) in &response.headers {
            println!("{name}: {value}");
        }
        println!();
    }
    print!("{}", response.body);
    eprintln!(
        "✓ {}{} via {}",
        response.status,
        if response.status_text.is_empty() {
            String::new()
        } else {
            format!(" {}", response.status_text)
        },
        execution.instance.browser
    );
    Ok(())
}

pub fn run_json_list(
    address: &str,
    args: JsonListArgs,
    command: ExtensionCommand,
) -> Result<(), Box<dyn std::error::Error>> {
    let timeout = args.connection.timeout()?;
    let execution = execute(address, args.connection.browser, command, timeout)?;
    print_json(&success_data(execution.result)?, args.compact)
}

pub fn run_source(address: &str, command: SourceCommand) -> Result<(), Box<dyn std::error::Error>> {
    match command {
        SourceCommand::List(connection) => run_source_list(address, connection),
        SourceCommand::Run(args) => run_source_run(address, args),
    }
}

fn run_source_list(
    address: &str,
    connection: ConnectionArgs,
) -> Result<(), Box<dyn std::error::Error>> {
    let timeout = connection.timeout()?;
    let execution = execute(
        address,
        connection.browser,
        ExtensionCommand::SourceList { id: request_id() },
        timeout,
    )?;
    let data = success_data(execution.result)?;
    let sources = data
        .as_array()
        .filter(|values| values.iter().all(Value::is_string))
        .ok_or("The extension returned an invalid source list")?;
    for source in sources {
        println!("{}", source.as_str().expect("source list was validated"));
    }
    eprintln!(
        "✓ {} {} via {}",
        sources.len(),
        if sources.len() == 1 {
            "source"
        } else {
            "sources"
        },
        execution.instance.browser
    );
    Ok(())
}

fn run_source_run(address: &str, args: SourceRunArgs) -> Result<(), Box<dyn std::error::Error>> {
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

pub fn run_history(
    address: &str,
    command: HistoryCommand,
) -> Result<(), Box<dyn std::error::Error>> {
    let (connection, compact, request) = match command {
        HistoryCommand::Datasets(args) => {
            let request = ExtensionCommand::SourceHistoryDatasets {
                id: request_id(),
                cursor: args.cursor,
                limit: args.limit,
                provider_id: args.provider_id,
                source_id: args.source_id,
            };
            (args.connection, args.compact, request)
        }
        HistoryCommand::Observations(args) => {
            let request = ExtensionCommand::SourceHistoryObservations {
                id: request_id(),
                instance_id: args.instance_id,
                cursor: args.cursor,
                from: args.from,
                limit: args.limit,
                to: args.to,
            };
            (args.connection, args.compact, request)
        }
        HistoryCommand::Get(args) => {
            let request = ExtensionCommand::SourceHistoryGet {
                id: request_id(),
                instance_id: args.instance_id,
                observed_at: args.observed_at,
            };
            (args.connection, args.compact, request)
        }
        HistoryCommand::Compare(args) => {
            let request = ExtensionCommand::SourceHistoryCompare {
                id: request_id(),
                instance_id: args.instance_id,
                before: args.before,
                after: args.after,
            };
            (args.connection, args.compact, request)
        }
    };
    let timeout = connection.timeout()?;
    let execution = execute(address, connection.browser, request, timeout)?;
    print_json(&success_data(execution.result)?, compact)
}

fn request_id() -> String {
    Uuid::new_v4().to_string()
}

fn success_data(result: CommandResult) -> Result<Value, Box<dyn std::error::Error>> {
    match result {
        CommandResult::Success { data, .. } => Ok(data.unwrap_or(Value::Null)),
        CommandResult::Failure { error, .. } => {
            Err(format!("{}: {}", error.name, error.message).into())
        }
    }
}

fn print_json(value: &Value, compact: bool) -> Result<(), Box<dyn std::error::Error>> {
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

fn parse_header(value: &str) -> Result<(String, String), Box<dyn std::error::Error>> {
    let (name, value_text) = value
        .split_once(':')
        .ok_or_else(|| format!("Invalid header \"{value}\". Expected NAME: VALUE."))?;
    let name = name.trim();
    let value_text = value_text.trim();
    if name.eq_ignore_ascii_case("cookie") {
        return Err("The Cookie header is browser-managed and cannot be overridden".into());
    }
    HeaderName::from_bytes(name.as_bytes())?;
    HeaderValue::from_str(value_text)?;
    Ok((name.into(), value_text.into()))
}

fn normalize_fetch_url(value: &str) -> Result<String, Box<dyn std::error::Error>> {
    let url = Url::parse(value)?;
    if !matches!(url.scheme(), "http" | "https")
        || !url.username().is_empty()
        || url.password().is_some()
    {
        return Err("Fetch URL must be an HTTP(S) URL without embedded credentials".into());
    }
    Ok(url.into())
}

struct FetchResponse {
    status: u64,
    status_text: String,
    headers: Vec<(String, String)>,
    body: String,
}

fn parse_fetch_response(value: Value) -> Result<FetchResponse, Box<dyn std::error::Error>> {
    let object = value
        .as_object()
        .ok_or("The extension returned an invalid fetch response")?;
    let status = object
        .get("status")
        .and_then(Value::as_u64)
        .ok_or("The extension returned an invalid fetch response")?;
    let status_text = object
        .get("statusText")
        .and_then(Value::as_str)
        .ok_or("The extension returned an invalid fetch response")?
        .into();
    let headers = object
        .get("headers")
        .and_then(Value::as_array)
        .ok_or("The extension returned an invalid fetch response")?
        .iter()
        .map(|pair| {
            let pair = pair
                .as_array()
                .filter(|pair| pair.len() == 2)
                .ok_or("The extension returned an invalid fetch response")?;
            Ok((
                pair[0]
                    .as_str()
                    .ok_or("The extension returned an invalid fetch response")?
                    .into(),
                pair[1]
                    .as_str()
                    .ok_or("The extension returned an invalid fetch response")?
                    .into(),
            ))
        })
        .collect::<Result<Vec<_>, Box<dyn std::error::Error>>>()?;
    let body = object
        .get("body")
        .and_then(Value::as_str)
        .ok_or("The extension returned an invalid fetch response")?
        .into();
    Ok(FetchResponse {
        status,
        status_text,
        headers,
        body,
    })
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

fn parse_limit(value: &str) -> Result<u64, String> {
    let limit = value
        .parse::<u64>()
        .map_err(|_| "--limit must be an integer between 1 and 250")?;
    if !(1..=250).contains(&limit) {
        return Err("--limit must be an integer between 1 and 250".into());
    }
    Ok(limit)
}

fn parse_history_time(value: &str) -> Result<u64, String> {
    if let Ok(timestamp) = value.parse::<u64>() {
        return Ok(timestamp);
    }
    if let Ok(value) = DateTime::parse_from_rfc3339(value) {
        return Ok(value.timestamp_millis() as u64);
    }
    NaiveDate::parse_from_str(value, "%Y-%m-%d")
        .ok()
        .and_then(|value| value.and_hms_opt(0, 0, 0))
        .map(|value| value.and_utc().timestamp_millis() as u64)
        .ok_or_else(|| "time must be Unix milliseconds or an ISO 8601 date".into())
}

#[cfg(test)]
mod tests {
    use super::{parse_header, parse_history_time, parse_limit, parse_params};

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

    #[test]
    fn rejects_cookie_header() {
        assert!(parse_header("Cookie: secret").is_err());
    }

    #[test]
    fn validates_history_limits() {
        assert_eq!(parse_limit("250").unwrap(), 250);
        assert!(parse_limit("251").is_err());
    }

    #[test]
    fn parses_rfc3339_history_time() {
        assert_eq!(parse_history_time("1970-01-01T00:00:01Z").unwrap(), 1_000);
        assert_eq!(parse_history_time("1970-01-02").unwrap(), 86_400_000);
    }
}
