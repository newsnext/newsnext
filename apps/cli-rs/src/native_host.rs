use std::io::{self, BufWriter};

use interprocess::local_socket::tokio::prelude::*;
use tokio::sync::mpsc;

use crate::framing::{
    MAX_IPC_MESSAGE_BYTES, MAX_NATIVE_MESSAGE_BYTES, read_json, read_json_async, write_json,
    write_json_async,
};
use crate::ipc;
use crate::protocol::{
    BridgeToDaemon, DaemonToBridge, ExtensionToHost, HostToExtension, PROTOCOL_VERSION,
};

pub async fn run(endpoint: &str) -> Result<(), Box<dyn std::error::Error>> {
    let first = tokio::task::spawn_blocking(|| {
        let mut input = io::stdin().lock();
        read_json::<_, ExtensionToHost>(&mut input, MAX_NATIVE_MESSAGE_BYTES)
    })
    .await??
    .ok_or("native messaging port closed before hello")?;

    let ExtensionToHost::Hello {
        protocol_version,
        instance,
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
