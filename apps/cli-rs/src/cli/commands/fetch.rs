use clap::Args;
use http::{HeaderName, HeaderValue, Method};
use serde_json::Value;
use url::Url;

use crate::control::{execute, success_data};
use crate::protocol::ExtensionCommand;

use super::common::{ConnectionArgs, request_id};

#[derive(Args)]
pub struct FetchArgs {
    /// HTTP(S) URL to fetch in the connected extension.
    url: String,
    #[command(flatten)]
    connection: ConnectionArgs,
    /// HTTP method (defaults to GET, or POST with --body).
    #[arg(short = 'X', long)]
    method: Option<String>,
    /// Add a request header; may be repeated.
    #[arg(short = 'H', long = "header")]
    headers: Vec<String>,
    /// Set the request body.
    #[arg(short = 'd', long)]
    body: Option<String>,
    /// Include response status and headers.
    #[arg(short = 'i', long)]
    include: bool,
}

pub fn run(address: &str, args: FetchArgs) -> Result<(), Box<dyn std::error::Error>> {
    let url = normalize_url(&args.url)?;
    let method = args
        .method
        .unwrap_or_else(|| if args.body.is_some() { "POST" } else { "GET" }.into())
        .to_uppercase();
    let method = Method::from_bytes(method.as_bytes())?;
    if matches!(method, Method::CONNECT | Method::TRACE)
        || method.as_str().eq_ignore_ascii_case("TRACK")
    {
        return Err(format!("Invalid or unsupported HTTP method: {method}").into());
    }
    if args.body.is_some() && matches!(method, Method::GET | Method::HEAD) {
        return Err(format!("{method} requests cannot have a body").into());
    }
    let headers = args
        .headers
        .iter()
        .map(|header| parse_header(header))
        .collect::<Result<Vec<_>, _>>()?;
    let timeout = args.connection.timeout()?;
    let execution = execute(
        address,
        args.connection.browser,
        ExtensionCommand::Fetch {
            id: request_id(),
            url,
            method: method.to_string(),
            headers,
            timeout_ms: timeout.as_millis() as u64,
            body: args.body,
        },
        timeout,
    )?;
    let response = parse_response(success_data(execution.result)?)?;
    if args.include {
        println!(
            "{}{}",
            response.status,
            if response.status_text.is_empty() {
                String::new()
            } else {
                format!(" {}", response.status_text)
            }
        );
        for (name, value) in &response.headers {
            println!("{name}: {value}");
        }
        println!();
    }
    print!("{}", response.body);
    eprintln!(
        "✓ {}{} via {}",
        response.status,
        if response.status_text.is_empty() {
            String::new()
        } else {
            format!(" {}", response.status_text)
        },
        execution.instance.browser
    );
    Ok(())
}

fn parse_header(value: &str) -> Result<(String, String), Box<dyn std::error::Error>> {
    let (name, value_text) = value
        .split_once(':')
        .ok_or_else(|| format!("Invalid header \"{value}\". Expected NAME: VALUE."))?;
    let name = name.trim();
    let value_text = value_text.trim();
    if name.eq_ignore_ascii_case("cookie") {
        return Err("The Cookie header is browser-managed and cannot be overridden".into());
    }
    HeaderName::from_bytes(name.as_bytes())?;
    HeaderValue::from_str(value_text)?;
    Ok((name.into(), value_text.into()))
}

fn normalize_url(value: &str) -> Result<String, Box<dyn std::error::Error>> {
    let url = Url::parse(value)?;
    if !matches!(url.scheme(), "http" | "https")
        || !url.username().is_empty()
        || url.password().is_some()
    {
        return Err("Fetch URL must be an HTTP(S) URL without embedded credentials".into());
    }
    Ok(url.into())
}

struct FetchResponse {
    status: u64,
    status_text: String,
    headers: Vec<(String, String)>,
    body: String,
}

fn parse_response(value: Value) -> Result<FetchResponse, Box<dyn std::error::Error>> {
    let object = value
        .as_object()
        .ok_or("The extension returned an invalid fetch response")?;
    let status = object
        .get("status")
        .and_then(Value::as_u64)
        .ok_or("The extension returned an invalid fetch response")?;
    let status_text = object
        .get("statusText")
        .and_then(Value::as_str)
        .ok_or("The extension returned an invalid fetch response")?
        .into();
    let headers = object
        .get("headers")
        .and_then(Value::as_array)
        .ok_or("The extension returned an invalid fetch response")?
        .iter()
        .map(|pair| {
            let pair = pair
                .as_array()
                .filter(|pair| pair.len() == 2)
                .ok_or("The extension returned an invalid fetch response")?;
            Ok((
                pair[0]
                    .as_str()
                    .ok_or("The extension returned an invalid fetch response")?
                    .into(),
                pair[1]
                    .as_str()
                    .ok_or("The extension returned an invalid fetch response")?
                    .into(),
            ))
        })
        .collect::<Result<Vec<_>, Box<dyn std::error::Error>>>()?;
    let body = object
        .get("body")
        .and_then(Value::as_str)
        .ok_or("The extension returned an invalid fetch response")?
        .into();
    Ok(FetchResponse {
        status,
        status_text,
        headers,
        body,
    })
}

#[cfg(test)]
mod tests {
    use super::parse_header;

    #[test]
    fn rejects_cookie_header() {
        assert!(parse_header("Cookie: secret").is_err());
    }
}
