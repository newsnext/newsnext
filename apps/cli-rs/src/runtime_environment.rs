use std::path::Path;

use crate::protocol::{DEVELOPMENT_NATIVE_HOST_NAME, PRODUCTION_NATIVE_HOST_NAME};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum RuntimeEnvironment {
    Development,
    Production,
}

impl RuntimeEnvironment {
    pub fn current() -> Result<Self, std::io::Error> {
        Ok(Self::from_executable(
            &std::env::current_exe()?.canonicalize()?,
        ))
    }

    pub fn from_executable(executable: &Path) -> Self {
        if cfg!(target_os = "macos")
            && executable
                .ancestors()
                .any(|path| path.extension().is_some_and(|extension| extension == "app"))
        {
            Self::Production
        } else {
            Self::Development
        }
    }

    pub fn display_name(self) -> &'static str {
        match self {
            Self::Development => "NewsNext Dev",
            Self::Production => "NewsNext",
        }
    }

    pub fn native_host_name(self) -> &'static str {
        match self {
            Self::Development => DEVELOPMENT_NATIVE_HOST_NAME,
            Self::Production => PRODUCTION_NATIVE_HOST_NAME,
        }
    }

    pub fn ipc_name_prefix(self) -> &'static str {
        match self {
            Self::Development => "com.newsnext.daemon.dev",
            Self::Production => "com.newsnext.daemon",
        }
    }
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::RuntimeEnvironment;

    #[test]
    fn classifies_app_bundle_executables_as_production() {
        assert_eq!(
            RuntimeEnvironment::from_executable(Path::new(
                "/Applications/NewsNext.app/Contents/MacOS/newsnext",
            )),
            RuntimeEnvironment::Production,
        );
        assert_eq!(
            RuntimeEnvironment::from_executable(Path::new("/workspace/target/debug/newsnext")),
            RuntimeEnvironment::Development,
        );
    }
}
