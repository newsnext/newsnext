use std::process::{Command, Stdio};
use std::time::Duration;

use crate::protocol::{BridgeToDaemon, DaemonToBridge};
use crate::{control, ipc};

pub fn start() -> Result<(), Box<dyn std::error::Error>> {
    if control::status(&ipc::endpoint_name()).is_ok() {
        println!("NewsNext is already running.");
        return Ok(());
    }
    let executable = std::env::current_exe()?;
    Command::new(executable)
        .arg("__daemon")
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()?;

    for _ in 0..50 {
        if let Ok(status) = control::status(&ipc::endpoint_name()) {
            println!("NewsNext started (PID {}).", status.pid);
            return Ok(());
        }
        std::thread::sleep(Duration::from_millis(100));
    }
    Err("NewsNext daemon did not start".into())
}

pub fn status() -> Result<(), Box<dyn std::error::Error>> {
    let status = control::status(&ipc::endpoint_name())?;
    println!("NewsNext is running (PID {}).", status.pid);
    println!("Extensions: {}", status.instances.len());
    for instance in status.instances {
        println!(
            "  {} {} ({})",
            instance.browser,
            instance.extension_version,
            &instance.id[..instance.id.len().min(8)]
        );
    }
    Ok(())
}

pub fn stop() -> Result<(), Box<dyn std::error::Error>> {
    match control::request(
        &ipc::endpoint_name(),
        BridgeToDaemon::Stop,
        Duration::from_millis(250),
    )? {
        DaemonToBridge::Stopping => {
            println!("NewsNext is stopping.");
            Ok(())
        }
        _ => Err("daemon returned an unexpected stop response".into()),
    }
}

pub fn restart() -> Result<(), Box<dyn std::error::Error>> {
    if control::status(&ipc::endpoint_name()).is_ok() {
        stop()?;
        for _ in 0..50 {
            if control::status(&ipc::endpoint_name()).is_err() {
                break;
            }
            std::thread::sleep(Duration::from_millis(100));
        }
    }
    start()
}
