mod commands;
mod service;

use clap::{Parser, Subcommand};

use crate::{ipc, native_messaging, tray};

#[derive(Parser)]
#[command(
    name = "newsnext",
    version,
    about = "NewsNext command-line tools",
    arg_required_else_help = true
)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Start the NewsNext background service and tray icon.
    Start,
    /// Show daemon and extension connection status.
    Status,
    /// Stop the NewsNext background service.
    Stop,
    /// Restart the NewsNext background service.
    Restart,
    /// Fetch a URL in a connected extension with browser cookies.
    Fetch(commands::FetchArgs),
    /// Run a registered or local JSON source in a connected extension.
    Run(commands::SourceRunArgs),
    /// Discover and execute canonical application Actions.
    Action {
        #[command(subcommand)]
        command: commands::ApplicationActionCommand,
    },
    /// Discover and execute canonical application Queries.
    Query {
        #[command(subcommand)]
        command: commands::ApplicationQueryCommand,
    },
    /// Inspect locally observed instance history.
    History {
        #[command(subcommand)]
        command: commands::HistoryCommand,
    },
    /// Register this executable as a Native Messaging host.
    InstallNativeHost(commands::InstallNativeHostArgs),
    /// Run the browser Native Messaging bridge.
    #[command(hide = true)]
    NativeHost,
    /// Run the foreground daemon process.
    #[command(name = "__daemon", hide = true)]
    Daemon,
}

pub fn run() -> Result<(), Box<dyn std::error::Error>> {
    let arguments = std::env::args_os().collect::<Vec<_>>();
    if native_messaging::is_invocation(&arguments) {
        return tokio::runtime::Runtime::new()?
            .block_on(native_messaging::run(&ipc::endpoint_name()));
    }
    let cli = Cli::parse_from(arguments);
    match cli.command {
        Command::Start => service::start(),
        Command::Status => service::status(),
        Command::Stop => service::stop(),
        Command::Restart => service::restart(),
        Command::Fetch(args) => commands::run_fetch(&ipc::endpoint_name(), args),
        Command::Run(args) => commands::run_source(&ipc::endpoint_name(), args),
        Command::Action { command } => {
            commands::run_application_action(&ipc::endpoint_name(), command)
        }
        Command::Query { command } => {
            commands::run_application_query(&ipc::endpoint_name(), command)
        }
        Command::History { command } => commands::run_history(&ipc::endpoint_name(), command),
        Command::InstallNativeHost(args) => args.run(),
        Command::NativeHost => {
            tokio::runtime::Runtime::new()?.block_on(native_messaging::run(&ipc::endpoint_name()))
        }
        Command::Daemon => tray::run_daemon(),
    }
}
