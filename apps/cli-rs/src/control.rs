use std::time::Duration;

use crate::framing::{MAX_IPC_MESSAGE_BYTES, read_json_async, write_json_async};
use crate::protocol::{
    BridgeToDaemon, CommandResult, DaemonStatus, DaemonToBridge, ExtensionCommand,
    ExtensionInstance,
};

pub struct Execution {
    pub instance: ExtensionInstance,
    pub result: CommandResult,
}

pub fn request(
    address: &str,
    request: BridgeToDaemon,
    timeout: Duration,
) -> Result<DaemonToBridge, Box<dyn std::error::Error>> {
    tokio::runtime::Runtime::new()?.block_on(async {
        tokio::time::timeout(timeout, async {
            let mut stream = tokio::net::TcpStream::connect(address).await?;
            write_json_async(&mut stream, &request, MAX_IPC_MESSAGE_BYTES).await?;
            read_json_async(&mut stream, MAX_IPC_MESSAGE_BYTES)
                .await?
                .ok_or_else(|| "daemon closed without a response".into())
        })
        .await
        .map_err(|_| "timed out waiting for the NewsNext daemon")?
    })
}

pub fn status(address: &str) -> Result<DaemonStatus, Box<dyn std::error::Error>> {
    match request(address, BridgeToDaemon::Status, Duration::from_millis(250))? {
        DaemonToBridge::Status { status } => Ok(status),
        _ => Err("daemon returned an unexpected status response".into()),
    }
}

pub fn execute(
    address: &str,
    browser: Option<String>,
    command: ExtensionCommand,
    timeout: Duration,
) -> Result<Execution, Box<dyn std::error::Error>> {
    let response = request(
        address,
        BridgeToDaemon::Execute {
            browser,
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
