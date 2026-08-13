use std::collections::HashMap;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use interprocess::local_socket::tokio::{Stream, prelude::*};
use tokio::sync::{Mutex, mpsc, oneshot};

use crate::framing::{MAX_IPC_MESSAGE_BYTES, read_json_async, write_json_async};
use crate::ipc;
use crate::protocol::{
    BridgeToDaemon, DaemonStatus, DaemonToBridge, ExtensionInstance, PROTOCOL_VERSION,
};

#[derive(Clone, Debug)]
pub enum DaemonEvent {
    StatusChanged(DaemonStatus),
    Menu(tray_icon::menu::MenuEvent),
    StopRequested,
}

#[derive(Clone)]
struct Client {
    connection_id: u64,
    instance: ExtensionInstance,
    sender: mpsc::UnboundedSender<DaemonToBridge>,
}

struct PendingExecution {
    client_connection_id: u64,
    result: oneshot::Sender<Result<crate::protocol::CommandResult, String>>,
}

struct State {
    clients: HashMap<String, Client>,
    next_connection_id: u64,
    pending: HashMap<String, PendingExecution>,
    started_at: u64,
}

enum ClientSelector<'a> {
    Instance(&'a str),
    Browser(Option<&'a str>),
}

impl State {
    fn status(&self) -> DaemonStatus {
        DaemonStatus {
            pid: std::process::id(),
            started_at: self.started_at,
            instances: self
                .clients
                .values()
                .map(|client| client.instance.clone())
                .collect(),
        }
    }

    fn matching_clients(&self, selector: ClientSelector<'_>) -> Vec<Client> {
        self.clients
            .values()
            .filter(|client| match selector {
                ClientSelector::Instance(instance_id) => client.instance.id == instance_id,
                ClientSelector::Browser(browser) => {
                    browser.is_none_or(|browser| client.instance.browser == browser)
                }
            })
            .cloned()
            .collect()
    }
}

pub async fn serve(
    endpoint: String,
    events: tao::event_loop::EventLoopProxy<DaemonEvent>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let listener = ipc::listen(&endpoint)?;
    let state = Arc::new(Mutex::new(State {
        clients: HashMap::new(),
        next_connection_id: 1,
        pending: HashMap::new(),
        started_at: SystemTime::now().duration_since(UNIX_EPOCH)?.as_millis() as u64,
    }));

    loop {
        let stream = listener.accept().await?;
        if let Err(error) = ipc::authenticate_peer(&stream) {
            eprintln!("Rejected NewsNext IPC connection: {error}");
            continue;
        }
        let state = Arc::clone(&state);
        let events = events.clone();
        tokio::spawn(async move {
            if let Err(error) = handle_connection(stream, state, events).await {
                eprintln!("NewsNext IPC connection failed: {error}");
            }
        });
    }
}

async fn handle_connection(
    stream: Stream,
    state: Arc<Mutex<State>>,
    events: tao::event_loop::EventLoopProxy<DaemonEvent>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let (mut reader, mut writer) = stream.split();
    let first = read_json_async::<_, BridgeToDaemon>(&mut reader, MAX_IPC_MESSAGE_BYTES)
        .await?
        .ok_or("IPC client closed before registration")?;

    match first {
        BridgeToDaemon::Register {
            protocol_version,
            instance,
        } => {
            if protocol_version != PROTOCOL_VERSION {
                write_json_async(
                    &mut writer,
                    &DaemonToBridge::Error {
                        request_id: None,
                        message: format!(
                            "Unsupported protocol version {protocol_version}; expected {PROTOCOL_VERSION}"
                        ),
                    },
                    MAX_IPC_MESSAGE_BYTES,
                )
                .await?;
                return Ok(());
            }
            let id = instance.id.clone();
            let (sender, mut receiver) = mpsc::unbounded_channel();
            let connection_id = {
                let mut state = state.lock().await;
                let connection_id = state.next_connection_id;
                state.next_connection_id += 1;
                state.clients.insert(
                    id.clone(),
                    Client {
                        connection_id,
                        instance,
                        sender,
                    },
                );
                let status = state.status();
                let _ = events.send_event(DaemonEvent::StatusChanged(status));
                connection_id
            };
            write_json_async(
                &mut writer,
                &DaemonToBridge::Ready {
                    protocol_version: PROTOCOL_VERSION,
                    daemon_version: env!("CARGO_PKG_VERSION").into(),
                },
                MAX_IPC_MESSAGE_BYTES,
            )
            .await?;

            loop {
                tokio::select! {
                    incoming = read_json_async::<_, BridgeToDaemon>(&mut reader, MAX_IPC_MESSAGE_BYTES) => {
                        match incoming? {
                            Some(BridgeToDaemon::Complete { request_id, result }) => {
                                let pending = state.lock().await.pending.remove(&request_id);
                                if let Some(pending) = pending.filter(|pending| {
                                    pending.client_connection_id == connection_id
                                }) {
                                    let _ = pending.result.send(Ok(result));
                                }
                            }
                            Some(_) => return Err("unexpected message after extension registration".into()),
                            None => break,
                        }
                    }
                    Some(outgoing) = receiver.recv() => {
                        write_json_async(&mut writer, &outgoing, MAX_IPC_MESSAGE_BYTES).await?;
                    }
                }
            }

            let mut state = state.lock().await;
            if state
                .clients
                .get(&id)
                .is_some_and(|client| client.connection_id == connection_id)
            {
                state.clients.remove(&id);
            }
            let disconnected = state
                .pending
                .iter()
                .filter_map(|(request_id, pending)| {
                    (pending.client_connection_id == connection_id).then_some(request_id.clone())
                })
                .collect::<Vec<_>>();
            for request_id in disconnected {
                if let Some(pending) = state.pending.remove(&request_id) {
                    let _ = pending
                        .result
                        .send(Err("The extension disconnected during the request".into()));
                }
            }
            let status = state.status();
            let _ = events.send_event(DaemonEvent::StatusChanged(status));
        }
        BridgeToDaemon::Status => {
            let status = state.lock().await.status();
            write_json_async(
                &mut writer,
                &DaemonToBridge::Status { status },
                MAX_IPC_MESSAGE_BYTES,
            )
            .await?;
        }
        BridgeToDaemon::Execute {
            browser,
            instance_id,
            request,
            timeout_ms,
        } => {
            let request_id = request.id().to_owned();
            let (result_sender, result_receiver) = oneshot::channel();
            let selection = {
                let mut state = state.lock().await;
                let selector = instance_id.as_deref().map_or_else(
                    || ClientSelector::Browser(browser.as_deref()),
                    ClientSelector::Instance,
                );
                let matches = state.matching_clients(selector);
                if matches.len() != 1 {
                    Err(if matches.is_empty() {
                        "No matching NewsNext extension is connected"
                    } else {
                        "Multiple NewsNext extensions matched the request"
                    })
                } else {
                    let client = matches.into_iter().next().expect("one client matched");
                    state.pending.insert(
                        request_id.clone(),
                        PendingExecution {
                            client_connection_id: client.connection_id,
                            result: result_sender,
                        },
                    );
                    Ok(client)
                }
            };
            let client = match selection {
                Ok(client) => client,
                Err(message) => {
                    write_json_async(
                        &mut writer,
                        &DaemonToBridge::Error {
                            request_id: Some(request_id),
                            message: message.into(),
                        },
                        MAX_IPC_MESSAGE_BYTES,
                    )
                    .await?;
                    return Ok(());
                }
            };
            if client
                .sender
                .send(DaemonToBridge::Execute { request })
                .is_err()
            {
                state.lock().await.pending.remove(&request_id);
                return Err("extension connection closed before command delivery".into());
            }
            let result = tokio::time::timeout(
                std::time::Duration::from_millis(timeout_ms),
                result_receiver,
            )
            .await;
            state.lock().await.pending.remove(&request_id);
            match result {
                Ok(Ok(Ok(result))) => {
                    write_json_async(
                        &mut writer,
                        &DaemonToBridge::ExecuteResult {
                            instance: client.instance,
                            result,
                        },
                        MAX_IPC_MESSAGE_BYTES,
                    )
                    .await?;
                }
                Ok(Ok(Err(message))) => {
                    write_json_async(
                        &mut writer,
                        &DaemonToBridge::Error {
                            request_id: Some(request_id),
                            message,
                        },
                        MAX_IPC_MESSAGE_BYTES,
                    )
                    .await?;
                }
                Ok(Err(_)) | Err(_) => {
                    write_json_async(
                        &mut writer,
                        &DaemonToBridge::Error {
                            request_id: Some(request_id),
                            message: "Timed out waiting for the NewsNext extension".into(),
                        },
                        MAX_IPC_MESSAGE_BYTES,
                    )
                    .await?;
                }
            }
        }
        BridgeToDaemon::Stop => {
            write_json_async(
                &mut writer,
                &DaemonToBridge::Stopping,
                MAX_IPC_MESSAGE_BYTES,
            )
            .await?;
            let _ = events.send_event(DaemonEvent::StopRequested);
        }
        BridgeToDaemon::Complete { .. } => return Err("unregistered completion".into()),
    }
    Ok(())
}
