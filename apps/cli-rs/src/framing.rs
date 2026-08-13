use std::io::{self, Read, Write};

use serde::{Serialize, de::DeserializeOwned};
use tokio::io::{AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt};

pub const MAX_NATIVE_MESSAGE_BYTES: usize = 1024 * 1024;
pub const MAX_IPC_MESSAGE_BYTES: usize = 64 * 1024 * 1024;

pub fn read_json<R: Read, T: DeserializeOwned>(
    reader: &mut R,
    limit: usize,
) -> io::Result<Option<T>> {
    let mut length = [0_u8; 4];
    match reader.read_exact(&mut length) {
        Ok(()) => {}
        Err(error) if error.kind() == io::ErrorKind::UnexpectedEof => return Ok(None),
        Err(error) => return Err(error),
    }
    let length = u32::from_ne_bytes(length) as usize;
    if length > limit {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "message exceeds size limit",
        ));
    }
    let mut payload = vec![0; length];
    reader.read_exact(&mut payload)?;
    serde_json::from_slice(&payload)
        .map(Some)
        .map_err(io::Error::other)
}

pub fn write_json<W: Write, T: Serialize>(
    writer: &mut W,
    value: &T,
    limit: usize,
) -> io::Result<()> {
    let payload = serde_json::to_vec(value).map_err(io::Error::other)?;
    if payload.len() > limit {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "message exceeds size limit",
        ));
    }
    let length = u32::try_from(payload.len())
        .map_err(|_| io::Error::new(io::ErrorKind::InvalidData, "message is too large"))?;
    writer.write_all(&length.to_ne_bytes())?;
    writer.write_all(&payload)?;
    writer.flush()
}

pub async fn read_json_async<R: AsyncRead + Unpin, T: DeserializeOwned>(
    reader: &mut R,
    limit: usize,
) -> io::Result<Option<T>> {
    let mut length = [0_u8; 4];
    match reader.read_exact(&mut length).await {
        Ok(_) => {}
        Err(error) if error.kind() == io::ErrorKind::UnexpectedEof => return Ok(None),
        Err(error) => return Err(error),
    }
    let length = u32::from_ne_bytes(length) as usize;
    if length > limit {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "message exceeds size limit",
        ));
    }
    let mut payload = vec![0; length];
    reader.read_exact(&mut payload).await?;
    serde_json::from_slice(&payload)
        .map(Some)
        .map_err(io::Error::other)
}

pub async fn write_json_async<W: AsyncWrite + Unpin, T: Serialize>(
    writer: &mut W,
    value: &T,
    limit: usize,
) -> io::Result<()> {
    let payload = serde_json::to_vec(value).map_err(io::Error::other)?;
    if payload.len() > limit {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "message exceeds size limit",
        ));
    }
    let length = u32::try_from(payload.len())
        .map_err(|_| io::Error::new(io::ErrorKind::InvalidData, "message is too large"))?;
    writer.write_all(&length.to_ne_bytes()).await?;
    writer.write_all(&payload).await?;
    writer.flush().await
}

#[cfg(test)]
mod tests {
    use std::io::Cursor;

    use serde::{Deserialize, Serialize};

    use super::{MAX_NATIVE_MESSAGE_BYTES, read_json, write_json};

    #[derive(Debug, Deserialize, PartialEq, Serialize)]
    struct Message {
        text: String,
    }

    #[test]
    fn round_trips_unicode_using_byte_length() {
        let expected = Message {
            text: "NewsNext 新闻".into(),
        };
        let mut bytes = Vec::new();
        write_json(&mut bytes, &expected, MAX_NATIVE_MESSAGE_BYTES).unwrap();

        let mut reader = Cursor::new(bytes);
        assert_eq!(
            read_json(&mut reader, MAX_NATIVE_MESSAGE_BYTES).unwrap(),
            Some(expected)
        );
    }

    #[test]
    fn rejects_oversized_messages_before_allocating_payload() {
        let mut bytes = Cursor::new(((MAX_NATIVE_MESSAGE_BYTES + 1) as u32).to_ne_bytes());
        let error = read_json::<_, Message>(&mut bytes, MAX_NATIVE_MESSAGE_BYTES).unwrap_err();
        assert_eq!(error.kind(), std::io::ErrorKind::InvalidData);
    }
}
