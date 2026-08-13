use std::io::{self, BufWriter};

use interprocess::local_socket::tokio::prelude::*;
use sysinfo::{ProcessRefreshKind, ProcessesToUpdate, System, UpdateKind};
use tokio::sync::mpsc;

use crate::framing::{
    MAX_IPC_MESSAGE_BYTES, MAX_NATIVE_MESSAGE_BYTES, read_json, read_json_async, write_json,
    write_json_async,
};
use crate::ipc;
use crate::protocol::{
    BridgeToDaemon, DaemonToBridge, ExtensionToHost, HostToExtension, PROTOCOL_VERSION,
};

pub fn is_invocation(arguments: &[std::ffi::OsString]) -> bool {
    let Some(first) = arguments.get(1) else {
        return false;
    };
    let first = first.to_string_lossy();
    first.starts_with("chrome-extension://")
        || first.starts_with("moz-extension://")
        || (arguments.len() >= 3
            && std::path::Path::new(first.as_ref())
                .file_name()
                .is_some_and(|name| name == "app.newsnext.host.json"))
}

pub async fn run(endpoint: &str) -> Result<(), Box<dyn std::error::Error>> {
    let first = tokio::task::spawn_blocking(|| {
        let mut input = io::stdin().lock();
        read_json::<_, ExtensionToHost>(&mut input, MAX_NATIVE_MESSAGE_BYTES)
    })
    .await??
    .ok_or("native messaging port closed before hello")?;

    let ExtensionToHost::Hello {
        protocol_version,
        mut instance,
    } = first
    else {
        return Err("first native message must be hello".into());
    };
    if protocol_version != PROTOCOL_VERSION {
        write_native(&HostToExtension::Error {
            request_id: None,
            message: format!(
                "Unsupported protocol version {protocol_version}; expected {PROTOCOL_VERSION}"
            ),
        })?;
        return Ok(());
    }

    if let Some(executable_name) = launching_executable_name() {
        instance.browser = executable_name;
    }

    let stream = ipc::connect(endpoint).await?;
    let (mut daemon_reader, mut daemon_writer) = stream.split();
    write_json_async(
        &mut daemon_writer,
        &BridgeToDaemon::Register {
            protocol_version,
            instance,
        },
        MAX_IPC_MESSAGE_BYTES,
    )
    .await?;

    let (input_sender, mut input_receiver) = mpsc::unbounded_channel();
    std::thread::spawn(move || {
        let mut input = io::stdin().lock();
        loop {
            let message = read_json::<_, ExtensionToHost>(&mut input, MAX_NATIVE_MESSAGE_BYTES);
            let finished = message.as_ref().is_ok_and(Option::is_none) || message.is_err();
            if input_sender.send(message).is_err() || finished {
                break;
            }
        }
    });

    let extension_to_daemon = async {
        while let Some(message) = input_receiver.recv().await {
            let Some(message) = message? else {
                return Ok::<(), io::Error>(());
            };
            let ExtensionToHost::Complete { request_id, result } = message else {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidData,
                    "hello may only be sent once",
                ));
            };
            write_json_async(
                &mut daemon_writer,
                &BridgeToDaemon::Complete { request_id, result },
                MAX_IPC_MESSAGE_BYTES,
            )
            .await?;
        }
        Ok(())
    };

    let daemon_to_extension = async {
        while let Some(message) =
            read_json_async::<_, DaemonToBridge>(&mut daemon_reader, MAX_IPC_MESSAGE_BYTES).await?
        {
            let native_message = match message {
                DaemonToBridge::Ready {
                    protocol_version,
                    daemon_version,
                } => HostToExtension::Ready {
                    protocol_version,
                    daemon_version,
                },
                DaemonToBridge::Execute { request } => HostToExtension::Execute { request },
                DaemonToBridge::Error {
                    request_id,
                    message,
                } => HostToExtension::Error {
                    request_id,
                    message,
                },
                DaemonToBridge::Status { .. }
                | DaemonToBridge::ExecuteResult { .. }
                | DaemonToBridge::Stopping => continue,
            };
            write_native(&native_message)?;
        }
        Ok::<(), io::Error>(())
    };

    tokio::select! {
        result = extension_to_daemon => result?,
        result = daemon_to_extension => result?,
    }
    Ok(())
}

fn write_native(message: &HostToExtension) -> io::Result<()> {
    let mut output = BufWriter::new(io::stdout().lock());
    write_json(&mut output, message, MAX_NATIVE_MESSAGE_BYTES)
}

fn launching_executable_name() -> Option<String> {
    let current_pid = sysinfo::get_current_pid().ok()?;
    let mut system = System::new();
    system.refresh_processes_specifics(
        ProcessesToUpdate::Some(&[current_pid]),
        false,
        ProcessRefreshKind::nothing(),
    );
    let parent_pid = system.process(current_pid)?.parent()?;
    system.refresh_processes_specifics(
        ProcessesToUpdate::Some(&[parent_pid]),
        false,
        ProcessRefreshKind::nothing().with_exe(UpdateKind::Always),
    );
    let executable_name = system.process(parent_pid)?.exe()?.file_name()?.to_str()?;
    #[cfg(windows)]
    let executable_name = executable_name
        .strip_suffix(".exe")
        .unwrap_or(executable_name);
    Some(executable_name.to_owned())
}

#[cfg(test)]
mod tests {
    use std::ffi::OsString;

    use super::is_invocation;

    #[test]
    fn detects_chromium_invocation() {
        let arguments = [
            OsString::from("newsnext"),
            OsString::from("chrome-extension://extension-id/"),
        ];
        assert!(is_invocation(&arguments));
    }

    #[test]
    fn detects_firefox_invocation() {
        let arguments = [
            OsString::from("newsnext"),
            OsString::from("/tmp/app.newsnext.host.json"),
            OsString::from("newsnext@example.com"),
        ];
        assert!(is_invocation(&arguments));
    }

    #[test]
    fn rejects_cli_command_invocation() {
        let arguments = [OsString::from("newsnext"), OsString::from("status")];
        assert!(!is_invocation(&arguments));
    }
}
