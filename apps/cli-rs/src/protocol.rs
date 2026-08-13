use serde::{Deserialize, Serialize};
use serde_json::Value;
use ts_rs::TS;

pub const NATIVE_HOST_NAME: &str = "com.newsnext.host";
pub const PROTOCOL_VERSION: u32 = 1;

#[derive(Clone, Debug, Deserialize, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(
    export,
    export_to = "../../../packages/extension-connection/src/generated/"
)]
pub struct ExtensionInstance {
    pub id: String,
    pub browser: String,
    pub extension_version: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(
    export,
    export_to = "../../../packages/extension-connection/src/generated/"
)]
pub struct SerializedError {
    pub name: String,
    pub message: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub stack: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub code: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub login_url: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize, TS)]
#[serde(tag = "type")]
#[ts(
    export,
    export_to = "../../../packages/extension-connection/src/generated/"
)]
pub enum ExtensionCommand {
    #[serde(rename = "board.list")]
    BoardList { id: String },
    #[serde(rename = "instance.list")]
    InstanceList { id: String },
    #[serde(rename = "source.list")]
    SourceList { id: String },
    #[serde(rename = "fetch", rename_all = "camelCase")]
    Fetch {
        id: String,
        url: String,
        method: String,
        headers: Vec<(String, String)>,
        #[ts(type = "number")]
        timeout_ms: u64,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        #[ts(optional)]
        body: Option<String>,
    },
    #[serde(rename = "source.run", rename_all = "camelCase")]
    SourceRun {
        id: String,
        source_id: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        #[ts(optional)]
        provider_id: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        #[ts(optional, type = "unknown")]
        provider: Option<Value>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        #[ts(optional, type = "Record<string, unknown>")]
        params: Option<Value>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        #[ts(optional)]
        use_provider_secrets: Option<bool>,
    },
    #[serde(rename = "source-history.datasets", rename_all = "camelCase")]
    SourceHistoryDatasets {
        id: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        #[ts(optional)]
        cursor: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        #[ts(optional, type = "number")]
        limit: Option<u64>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        #[ts(optional)]
        provider_id: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        #[ts(optional)]
        source_id: Option<String>,
    },
    #[serde(rename = "source-history.observations", rename_all = "camelCase")]
    SourceHistoryObservations {
        id: String,
        instance_id: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        #[ts(optional, type = "number")]
        cursor: Option<u64>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        #[ts(optional, type = "number")]
        from: Option<u64>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        #[ts(optional, type = "number")]
        limit: Option<u64>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        #[ts(optional, type = "number")]
        to: Option<u64>,
    },
    #[serde(rename = "source-history.get", rename_all = "camelCase")]
    SourceHistoryGet {
        id: String,
        instance_id: String,
        #[ts(type = "number")]
        observed_at: u64,
    },
    #[serde(rename = "source-history.compare", rename_all = "camelCase")]
    SourceHistoryCompare {
        id: String,
        instance_id: String,
        #[ts(type = "number")]
        before: u64,
        #[ts(type = "number")]
        after: u64,
    },
}

impl ExtensionCommand {
    pub fn id(&self) -> &str {
        match self {
            Self::BoardList { id }
            | Self::InstanceList { id }
            | Self::SourceList { id }
            | Self::Fetch { id, .. }
            | Self::SourceRun { id, .. }
            | Self::SourceHistoryDatasets { id, .. }
            | Self::SourceHistoryObservations { id, .. }
            | Self::SourceHistoryGet { id, .. }
            | Self::SourceHistoryCompare { id, .. } => id,
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, TS)]
#[serde(
    tag = "type",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
#[ts(
    export,
    export_to = "../../../packages/extension-connection/src/generated/"
)]
pub enum ExtensionToHost {
    Hello {
        protocol_version: u32,
        instance: ExtensionInstance,
    },
    Complete {
        request_id: String,
        result: CommandResult,
    },
}

#[derive(Clone, Debug, Deserialize, Serialize, TS)]
#[serde(
    tag = "type",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
#[ts(
    export,
    export_to = "../../../packages/extension-connection/src/generated/"
)]
pub enum HostToExtension {
    Ready {
        protocol_version: u32,
        daemon_version: String,
    },
    Execute {
        request: ExtensionCommand,
    },
    Error {
        request_id: Option<String>,
        message: String,
    },
}

#[derive(Clone, Debug, Serialize, TS)]
#[serde(untagged)]
#[ts(
    export,
    export_to = "../../../packages/extension-connection/src/generated/"
)]
pub enum CommandResult {
    Success {
        #[ts(type = "true")]
        ok: bool,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        #[ts(optional, type = "unknown")]
        data: Option<Value>,
    },
    Failure {
        #[ts(type = "false")]
        ok: bool,
        error: SerializedError,
    },
}

impl<'de> Deserialize<'de> for CommandResult {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let value = Value::deserialize(deserializer)?;
        match value.get("ok").and_then(Value::as_bool) {
            Some(true) => Ok(Self::Success {
                ok: true,
                data: value.get("data").cloned(),
            }),
            Some(false) => {
                let error = value
                    .get("error")
                    .cloned()
                    .ok_or_else(|| serde::de::Error::missing_field("error"))?;
                Ok(Self::Failure {
                    ok: false,
                    error: serde_json::from_value(error).map_err(serde::de::Error::custom)?,
                })
            }
            None => Err(serde::de::Error::custom(
                "command result must contain a boolean ok field",
            )),
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(
    tag = "type",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum BridgeToDaemon {
    Register {
        protocol_version: u32,
        instance: ExtensionInstance,
    },
    Complete {
        request_id: String,
        result: CommandResult,
    },
    Execute {
        browser: Option<String>,
        request: ExtensionCommand,
        timeout_ms: u64,
    },
    Status,
    Stop,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(
    tag = "type",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum DaemonToBridge {
    Ready {
        protocol_version: u32,
        daemon_version: String,
    },
    Execute {
        request: ExtensionCommand,
    },
    Status {
        status: DaemonStatus,
    },
    ExecuteResult {
        instance: ExtensionInstance,
        result: CommandResult,
    },
    Stopping,
    Error {
        request_id: Option<String>,
        message: String,
    },
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DaemonStatus {
    pub pid: u32,
    pub started_at: u64,
    pub instances: Vec<ExtensionInstance>,
}

#[cfg(test)]
mod tests {
    use super::CommandResult;

    #[test]
    fn deserializes_failed_command_as_failure_variant() {
        let value = serde_json::json!({
            "ok": false,
            "error": { "name": "Error", "message": "failed" },
        });
        let result: CommandResult = serde_json::from_value(value).unwrap();
        assert!(matches!(result, CommandResult::Failure { .. }));
    }

    #[test]
    fn rejects_failed_command_without_error() {
        let result = serde_json::from_value::<CommandResult>(serde_json::json!({ "ok": false }));
        assert!(result.is_err());
    }
}
