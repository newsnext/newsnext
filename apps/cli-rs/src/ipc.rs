use std::io;

#[cfg(windows)]
use std::ffi::OsStr;

use interprocess::local_socket::ListenerOptions;
use interprocess::local_socket::tokio::{Listener, Stream, prelude::*};
#[cfg(unix)]
use interprocess::local_socket::traits::StreamCommon;
use interprocess::local_socket::{GenericNamespaced, Name, ToNsName};

const DEFAULT_IPC_NAME_PREFIX: &str = "com.newsnext.daemon";
const IPC_NAME_ENV: &str = "NEWSNEXT_IPC_NAME";

pub fn endpoint_name() -> String {
    std::env::var(IPC_NAME_ENV).unwrap_or_else(|_| default_endpoint_name())
}

fn local_socket_name(endpoint: &str) -> io::Result<Name<'_>> {
    validate_endpoint_name(endpoint)?;
    endpoint.to_ns_name::<GenericNamespaced>()
}

pub fn listen(endpoint: &str) -> io::Result<Listener> {
    let name = local_socket_name(endpoint)?;
    cleanup_filesystem_socket(endpoint)?;
    ListenerOptions::new().name(name).create_tokio()
}

pub async fn connect(endpoint: &str) -> io::Result<Stream> {
    let stream = Stream::connect(local_socket_name(endpoint)?).await?;
    authenticate_peer(&stream)?;
    Ok(stream)
}

pub fn cleanup_listener_endpoint(endpoint: &str) -> io::Result<()> {
    validate_endpoint_name(endpoint)?;
    cleanup_filesystem_socket(endpoint)
}

#[cfg(unix)]
pub fn authenticate_peer(stream: &Stream) -> io::Result<()> {
    let peer_user = stream.peer_creds()?.euid().ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::PermissionDenied,
            "local IPC transport did not provide peer user credentials",
        )
    })?;
    if peer_user != effective_user_id() {
        return Err(io::Error::new(
            io::ErrorKind::PermissionDenied,
            "local IPC peer belongs to a different user",
        ));
    }
    Ok(())
}

#[cfg(windows)]
pub fn authenticate_peer(_stream: &Stream) -> io::Result<()> {
    Ok(())
}

fn validate_endpoint_name(endpoint: &str) -> io::Result<()> {
    if endpoint.is_empty()
        || endpoint.len() > 80
        || endpoint
            .chars()
            .any(|character| matches!(character, '/' | '\\' | '\0'))
    {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "local IPC name must be 1-80 characters without path separators",
        ));
    }
    Ok(())
}

#[cfg(all(unix, not(any(target_os = "linux", target_os = "android"))))]
fn cleanup_filesystem_socket(endpoint: &str) -> io::Result<()> {
    use std::os::unix::fs::FileTypeExt;

    let path = std::path::Path::new("/tmp").join(endpoint);
    match std::fs::symlink_metadata(&path) {
        Ok(metadata) if metadata.file_type().is_socket() => std::fs::remove_file(path),
        Ok(_) => Err(io::Error::new(
            io::ErrorKind::AddrInUse,
            "local IPC path exists and is not a socket",
        )),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error),
    }
}

#[cfg(any(windows, target_os = "linux", target_os = "android"))]
fn cleanup_filesystem_socket(_endpoint: &str) -> io::Result<()> {
    Ok(())
}

#[cfg(unix)]
fn default_endpoint_name() -> String {
    format!("{DEFAULT_IPC_NAME_PREFIX}.{}", effective_user_id())
}

#[cfg(windows)]
fn default_endpoint_name() -> String {
    let user_scope = std::env::var_os("LOCALAPPDATA").unwrap_or_default();
    format!(
        "{DEFAULT_IPC_NAME_PREFIX}.{:016x}",
        stable_os_string_hash(&user_scope)
    )
}

#[cfg(unix)]
fn effective_user_id() -> libc::uid_t {
    // SAFETY: geteuid has no preconditions and only reads process credentials.
    unsafe { libc::geteuid() }
}

#[cfg(windows)]
fn stable_os_string_hash(value: &OsStr) -> u64 {
    value
        .to_string_lossy()
        .bytes()
        .fold(0xcbf2_9ce4_8422_2325, |hash, byte| {
            (hash ^ u64::from(byte)).wrapping_mul(0x0000_0100_0000_01b3)
        })
}
