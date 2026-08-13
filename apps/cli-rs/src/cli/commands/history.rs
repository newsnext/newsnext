use chrono::{DateTime, NaiveDate};
use clap::{Args, Subcommand};

use crate::control::{execute, success_data};
use crate::protocol::ExtensionCommand;

use super::common::{ConnectionArgs, print_json, request_id};

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
pub(in crate::cli) struct HistoryDatasetsArgs {
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
pub(in crate::cli) struct HistoryObservationsArgs {
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
pub(in crate::cli) struct HistoryGetArgs {
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
pub(in crate::cli) struct HistoryCompareArgs {
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

pub fn run(address: &str, command: HistoryCommand) -> Result<(), Box<dyn std::error::Error>> {
    let (connection, compact, request) = match command {
        HistoryCommand::Datasets(args) => (
            args.connection,
            args.compact,
            ExtensionCommand::SourceHistoryDatasets {
                id: request_id(),
                cursor: args.cursor,
                limit: args.limit,
                provider_id: args.provider_id,
                source_id: args.source_id,
            },
        ),
        HistoryCommand::Observations(args) => (
            args.connection,
            args.compact,
            ExtensionCommand::SourceHistoryObservations {
                id: request_id(),
                instance_id: args.instance_id,
                cursor: args.cursor,
                from: args.from,
                limit: args.limit,
                to: args.to,
            },
        ),
        HistoryCommand::Get(args) => (
            args.connection,
            args.compact,
            ExtensionCommand::SourceHistoryGet {
                id: request_id(),
                instance_id: args.instance_id,
                observed_at: args.observed_at,
            },
        ),
        HistoryCommand::Compare(args) => (
            args.connection,
            args.compact,
            ExtensionCommand::SourceHistoryCompare {
                id: request_id(),
                instance_id: args.instance_id,
                before: args.before,
                after: args.after,
            },
        ),
    };
    let timeout = connection.timeout()?;
    let execution = execute(address, connection.browser, request, timeout)?;
    print_json(&success_data(execution.result)?, compact)
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
    use super::{parse_history_time, parse_limit};

    #[test]
    fn validates_limits() {
        assert_eq!(parse_limit("250").unwrap(), 250);
        assert!(parse_limit("251").is_err());
    }

    #[test]
    fn parses_rfc3339_time() {
        assert_eq!(parse_history_time("1970-01-01T00:00:01Z").unwrap(), 1_000);
        assert_eq!(parse_history_time("1970-01-02").unwrap(), 86_400_000);
    }
}
