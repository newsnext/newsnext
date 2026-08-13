use std::time::Duration;

use serde_json::Value;

use crate::framing::{MAX_IPC_MESSAGE_BYTES, read_json_async, write_json_async};
use crate::ipc;
use crate::protocol::{
    BridgeToDaemon, CommandResult, DaemonStatus, DaemonToBridge, ExtensionCommand,
    ExtensionInstance,
};

pub struct Execution {
    pub instance: ExtensionInstance,
    pub result: CommandResult,
}

pub fn request(
    endpoint: &str,
    request: BridgeToDaemon,
    timeout: Duration,
) -> Result<DaemonToBridge, Box<dyn std::error::Error>> {
    tokio::runtime::Runtime::new()?.block_on(async {
        tokio::time::timeout(timeout, async {
            let mut stream = ipc::connect(endpoint).await?;
            write_json_async(&mut stream, &request, MAX_IPC_MESSAGE_BYTES).await?;
            read_json_async(&mut stream, MAX_IPC_MESSAGE_BYTES)
                .await?
                .ok_or_else(|| "daemon closed without a response".into())
        })
        .await
        .map_err(|_| "timed out waiting for the NewsNext daemon")?
    })
}

pub fn status(endpoint: &str) -> Result<DaemonStatus, Box<dyn std::error::Error>> {
    match request(endpoint, BridgeToDaemon::Status, Duration::from_millis(250))? {
        DaemonToBridge::Status { status } => Ok(status),
        _ => Err("daemon returned an unexpected status response".into()),
    }
}

pub fn execute(
    endpoint: &str,
    browser: Option<String>,
    command: ExtensionCommand,
    timeout: Duration,
) -> Result<Execution, Box<dyn std::error::Error>> {
    execute_selected(endpoint, browser, None, command, timeout)
}

fn execute_selected(
    endpoint: &str,
    browser: Option<String>,
    instance_id: Option<String>,
    command: ExtensionCommand,
    timeout: Duration,
) -> Result<Execution, Box<dyn std::error::Error>> {
    let response = request(
        endpoint,
        BridgeToDaemon::Execute {
            browser,
            instance_id,
            request: command,
            timeout_ms: timeout.as_millis() as u64,
        },
        timeout + Duration::from_secs(1),
    )?;
    match response {
        DaemonToBridge::ExecuteResult { instance, result } => Ok(Execution { instance, result }),
        DaemonToBridge::Error { message, .. } => Err(message.into()),
        _ => Err("daemon returned an unexpected execution response".into()),
    }
}

pub fn open_app(
    endpoint: &str,
    instance_id: String,
    timeout: Duration,
) -> Result<(), Box<dyn std::error::Error>> {
    let execution = execute_selected(
        endpoint,
        None,
        Some(instance_id),
        ExtensionCommand::AppOpen {
            id: uuid::Uuid::new_v4().to_string(),
        },
        timeout,
    )?;
    success_data(execution.result).map(|_| ())
}

pub fn success_data(result: CommandResult) -> Result<Value, Box<dyn std::error::Error>> {
    match result {
        CommandResult::Success { data, .. } => Ok(data.unwrap_or(Value::Null)),
        CommandResult::Failure { error, .. } => {
            Err(format!("{}: {}", error.name, error.message).into())
        }
    }
}
