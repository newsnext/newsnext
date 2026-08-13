use clap::{Args, Subcommand};
use serde_json::Value;

use crate::control::{execute, success_data};
use crate::protocol::ExtensionCommand;

use super::common::{ConnectionArgs, print_json, request_id};

#[derive(Args)]
pub(in crate::cli) struct JsonListArgs {
    #[command(flatten)]
    connection: ConnectionArgs,
    /// Print result JSON on one line.
    #[arg(long)]
    compact: bool,
}

#[derive(Subcommand)]
pub enum ApplicationActionCommand {
    /// List available application Actions and their schemas.
    List(JsonListArgs),
    /// Execute an application Action.
    Execute(ApplicationOperationArgs),
}

#[derive(Subcommand)]
pub enum ApplicationQueryCommand {
    /// List available application Queries and their schemas.
    List(JsonListArgs),
    /// Execute an application Query.
    Execute(ApplicationOperationArgs),
}

#[derive(Args)]
pub(in crate::cli) struct ApplicationOperationArgs {
    /// Stable application operation name.
    name: String,
    /// JSON object passed to the operation.
    #[arg(long, default_value = "{}")]
    input: String,
    #[command(flatten)]
    connection: ConnectionArgs,
    /// Print result JSON on one line.
    #[arg(long)]
    compact: bool,
}

pub fn run_action(
    address: &str,
    command: ApplicationActionCommand,
) -> Result<(), Box<dyn std::error::Error>> {
    match command {
        ApplicationActionCommand::List(args) => run_list(
            address,
            args,
            ExtensionCommand::ApplicationActionList { id: request_id() },
        ),
        ApplicationActionCommand::Execute(args) => {
            run_operation(address, args, |id, name, input| {
                ExtensionCommand::ApplicationActionExecute { id, name, input }
            })
        }
    }
}

pub fn run_query(
    address: &str,
    command: ApplicationQueryCommand,
) -> Result<(), Box<dyn std::error::Error>> {
    match command {
        ApplicationQueryCommand::List(args) => run_list(
            address,
            args,
            ExtensionCommand::ApplicationQueryList { id: request_id() },
        ),
        ApplicationQueryCommand::Execute(args) => {
            run_operation(address, args, |id, name, input| {
                ExtensionCommand::ApplicationQueryExecute { id, name, input }
            })
        }
    }
}

fn run_list(
    address: &str,
    args: JsonListArgs,
    command: ExtensionCommand,
) -> Result<(), Box<dyn std::error::Error>> {
    let timeout = args.connection.timeout()?;
    let execution = execute(address, args.connection.browser, command, timeout)?;
    print_json(&success_data(execution.result)?, args.compact)
}

fn run_operation(
    address: &str,
    args: ApplicationOperationArgs,
    create_command: impl FnOnce(String, String, Value) -> ExtensionCommand,
) -> Result<(), Box<dyn std::error::Error>> {
    let input = serde_json::from_str::<Value>(&args.input)?;
    if !input.is_object() {
        return Err("--input must be a JSON object".into());
    }
    let timeout = args.connection.timeout()?;
    let execution = execute(
        address,
        args.connection.browser,
        create_command(request_id(), args.name, input),
        timeout,
    )?;
    print_json(&success_data(execution.result)?, args.compact)
}
