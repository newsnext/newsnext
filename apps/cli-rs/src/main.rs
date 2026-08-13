mod commands;
mod control;
mod daemon;
mod framing;
mod ipc;
mod native_host;
mod protocol;

use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::process::{Command as ProcessCommand, Stdio};
use std::time::Duration;

use clap::{Parser, Subcommand, ValueEnum};
use serde_json::json;
use tao::event::{Event, StartCause};
use tao::event_loop::{ControlFlow, EventLoopBuilder};
use tray_icon::menu::{Menu, MenuEvent, MenuId, MenuItem, PredefinedMenuItem, Submenu};
use tray_icon::{Icon, TrayIcon, TrayIconBuilder};

use crate::daemon::DaemonEvent;
use crate::protocol::{BridgeToDaemon, DaemonToBridge, ExtensionInstance, NATIVE_HOST_NAME};

const DEVELOPMENT_CHROME_EXTENSION_ID: &str = "cffgbnjiaakknooiegnjkojemhidheke";
const FIREFOX_EXTENSION_ID: &str = "newsnext@ourongxing.com";

#[derive(Parser)]
#[command(
    name = "newsnext",
    version,
    about = "NewsNext command-line tools",
    arg_required_else_help = true
)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Start the NewsNext background service and tray icon.
    Start,
    /// Show daemon and extension connection status.
    Status,
    /// Stop the NewsNext background service.
    Stop,
    /// Restart the NewsNext background service.
    Restart,
    /// Fetch a URL in a connected extension with browser cookies.
    Fetch(commands::FetchArgs),
    /// Run a registered or local JSON source in a connected extension.
    Run(commands::SourceRunArgs),
    /// Discover and execute canonical application Actions.
    Action {
        #[command(subcommand)]
        command: commands::ApplicationActionCommand,
    },
    /// Discover and execute canonical application Queries.
    Query {
        #[command(subcommand)]
        command: commands::ApplicationQueryCommand,
    },
    /// Inspect locally observed instance history.
    History {
        #[command(subcommand)]
        command: commands::HistoryCommand,
    },
    /// Register this executable as a Native Messaging host.
    InstallNativeHost {
        #[arg(value_enum, default_value_t = Browser::Chrome)]
        browser: Browser,
        #[arg(long)]
        extension_id: Option<String>,
    },
    /// Run the browser Native Messaging bridge.
    #[command(hide = true)]
    NativeHost,
    /// Run the foreground daemon process.
    #[command(name = "__daemon", hide = true)]
    Daemon,
}

#[derive(Clone, Copy, ValueEnum)]
enum Browser {
    Chrome,
    Chromium,
    Edge,
    Firefox,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let arguments = std::env::args_os().collect::<Vec<_>>();
    if is_native_host_invocation(&arguments) {
        return tokio::runtime::Runtime::new()?.block_on(native_host::run(&ipc::endpoint_name()));
    }
    let cli = Cli::parse_from(arguments);
    match cli.command {
        Command::Start => start(),
        Command::Status => status(),
        Command::Stop => stop(),
        Command::Restart => restart(),
        Command::Fetch(args) => commands::run_fetch(&ipc::endpoint_name(), args),
        Command::Run(args) => commands::run_source(&ipc::endpoint_name(), args),
        Command::Action { command } => {
            commands::run_application_action(&ipc::endpoint_name(), command)
        }
        Command::Query { command } => {
            commands::run_application_query(&ipc::endpoint_name(), command)
        }
        Command::History { command } => commands::run_history(&ipc::endpoint_name(), command),
        Command::InstallNativeHost {
            browser,
            extension_id,
        } => install_native_host(
            browser,
            extension_id.as_deref().unwrap_or(match browser {
                Browser::Firefox => FIREFOX_EXTENSION_ID,
                Browser::Chrome | Browser::Chromium | Browser::Edge => {
                    DEVELOPMENT_CHROME_EXTENSION_ID
                }
            }),
        ),
        Command::NativeHost => {
            tokio::runtime::Runtime::new()?.block_on(native_host::run(&ipc::endpoint_name()))
        }
        Command::Daemon => run_daemon(),
    }
}

fn is_native_host_invocation(arguments: &[std::ffi::OsString]) -> bool {
    let Some(first) = arguments.get(1) else {
        return false;
    };
    let first = first.to_string_lossy();
    first.starts_with("chrome-extension://")
        || first.starts_with("moz-extension://")
        || (arguments.len() >= 3
            && std::path::Path::new(first.as_ref())
                .file_name()
                .is_some_and(|name| name == "com.newsnext.host.json"))
}

fn install_native_host(
    browser: Browser,
    extension_id: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let executable = std::env::current_exe()?.canonicalize()?;
    let manifest = match browser {
        Browser::Firefox => json!({
            "name": NATIVE_HOST_NAME,
            "description": "NewsNext browser bridge",
            "path": executable,
            "type": "stdio",
            "allowed_extensions": [extension_id],
        }),
        Browser::Chrome | Browser::Chromium | Browser::Edge => json!({
            "name": NATIVE_HOST_NAME,
            "description": "NewsNext browser bridge",
            "path": executable,
            "type": "stdio",
            "allowed_origins": [format!("chrome-extension://{extension_id}/")],
        }),
    };
    let manifest_path = native_manifest_path(browser)?;
    if let Some(parent) = manifest_path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(&manifest_path, serde_json::to_vec_pretty(&manifest)?)?;
    register_windows_manifest(browser, &manifest_path)?;
    println!(
        "Installed Native Messaging host at {}.",
        manifest_path.display()
    );
    Ok(())
}

#[cfg(target_os = "macos")]
fn native_manifest_path(browser: Browser) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let home = std::env::var_os("HOME").ok_or("HOME is not set")?;
    let directory = match browser {
        Browser::Chrome => "Library/Application Support/Google/Chrome/NativeMessagingHosts",
        Browser::Chromium => "Library/Application Support/Chromium/NativeMessagingHosts",
        Browser::Edge => "Library/Application Support/Microsoft Edge/NativeMessagingHosts",
        Browser::Firefox => "Library/Application Support/Mozilla/NativeMessagingHosts",
    };
    Ok(PathBuf::from(home)
        .join(directory)
        .join(format!("{NATIVE_HOST_NAME}.json")))
}

#[cfg(target_os = "linux")]
fn native_manifest_path(browser: Browser) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let home = std::env::var_os("HOME").ok_or("HOME is not set")?;
    let directory = match browser {
        Browser::Chrome => ".config/google-chrome/NativeMessagingHosts",
        Browser::Chromium => ".config/chromium/NativeMessagingHosts",
        Browser::Edge => ".config/microsoft-edge/NativeMessagingHosts",
        Browser::Firefox => ".mozilla/native-messaging-hosts",
    };
    Ok(PathBuf::from(home)
        .join(directory)
        .join(format!("{NATIVE_HOST_NAME}.json")))
}

#[cfg(windows)]
fn native_manifest_path(_browser: Browser) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let data = std::env::var_os("LOCALAPPDATA").ok_or("LOCALAPPDATA is not set")?;
    Ok(PathBuf::from(data)
        .join("NewsNext")
        .join(format!("{NATIVE_HOST_NAME}.json")))
}

#[cfg(windows)]
fn register_windows_manifest(
    browser: Browser,
    manifest_path: &std::path::Path,
) -> Result<(), Box<dyn std::error::Error>> {
    use winreg::RegKey;
    use winreg::enums::HKEY_CURRENT_USER;

    let vendor = match browser {
        Browser::Chrome => "Google\\Chrome",
        Browser::Chromium => "Chromium",
        Browser::Edge => "Microsoft\\Edge",
        Browser::Firefox => "Mozilla",
    };
    let path = format!(r"Software\{vendor}\NativeMessagingHosts\{NATIVE_HOST_NAME}");
    let (key, _) = RegKey::predef(HKEY_CURRENT_USER).create_subkey(path)?;
    key.set_value("", &manifest_path.to_string_lossy().as_ref())?;
    Ok(())
}

#[cfg(not(windows))]
fn register_windows_manifest(
    _browser: Browser,
    _manifest_path: &std::path::Path,
) -> Result<(), Box<dyn std::error::Error>> {
    Ok(())
}

fn start() -> Result<(), Box<dyn std::error::Error>> {
    if control::status(&ipc::endpoint_name()).is_ok() {
        println!("NewsNext is already running.");
        return Ok(());
    }
    let executable = std::env::current_exe()?;
    ProcessCommand::new(executable)
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

fn status() -> Result<(), Box<dyn std::error::Error>> {
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

fn stop() -> Result<(), Box<dyn std::error::Error>> {
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

fn restart() -> Result<(), Box<dyn std::error::Error>> {
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

fn run_daemon() -> Result<(), Box<dyn std::error::Error>> {
    let event_loop = EventLoopBuilder::<DaemonEvent>::with_user_event().build();
    let proxy = event_loop.create_proxy();
    let menu_proxy = proxy.clone();
    MenuEvent::set_event_handler(Some(move |event| {
        let _ = menu_proxy.send_event(DaemonEvent::Menu(event));
    }));
    let endpoint = ipc::endpoint_name();
    let cleanup_endpoint = endpoint.clone();
    std::thread::spawn(move || {
        let runtime = tokio::runtime::Runtime::new().expect("failed to create daemon runtime");
        if let Err(error) = runtime.block_on(daemon::serve(endpoint, proxy.clone())) {
            eprintln!("NewsNext daemon failed: {error}");
            let _ = proxy.send_event(DaemonEvent::StopRequested);
        }
    });

    let mut tray: Option<TrayState> = None;
    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;
        match event {
            Event::NewEvents(StartCause::Init) => match TrayState::new() {
                Ok(next) => tray = Some(next),
                Err(error) => eprintln!("Could not create NewsNext tray icon: {error}"),
            },
            Event::UserEvent(DaemonEvent::StatusChanged(status)) => {
                if let Some(tray) = &mut tray
                    && let Err(error) = tray.set_instances(status.instances)
                {
                    eprintln!("Could not update NewsNext tray menu: {error}");
                }
            }
            Event::UserEvent(DaemonEvent::Menu(event)) => {
                if let Some(instance_id) = tray
                    .as_ref()
                    .and_then(|tray| tray.open_instance_id(&event.id))
                {
                    open_app(cleanup_endpoint.clone(), instance_id);
                } else if tray.as_ref().is_some_and(|tray| event.id == tray.quit_id) {
                    exit_daemon(&cleanup_endpoint, control_flow);
                }
            }
            Event::UserEvent(DaemonEvent::StopRequested) => {
                exit_daemon(&cleanup_endpoint, control_flow);
            }
            _ => {}
        }
    });
}

fn open_app(endpoint: String, instance_id: String) {
    std::thread::spawn(move || {
        if let Err(error) = control::open_app(&endpoint, instance_id, Duration::from_secs(10)) {
            eprintln!("Could not open NewsNext: {error}");
        }
    });
}

fn exit_daemon(endpoint: &str, control_flow: &mut ControlFlow) {
    if let Err(error) = ipc::cleanup_listener_endpoint(endpoint) {
        eprintln!("Could not clean up NewsNext IPC endpoint: {error}");
    }
    *control_flow = ControlFlow::Exit;
}

struct TrayState {
    icon: TrayIcon,
    open_instances: HashMap<MenuId, String>,
    quit_id: MenuId,
}

impl TrayState {
    fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let (menu, quit_id, open_instances) = create_tray_menu(&[])?;
        let icon = TrayIconBuilder::new()
            .with_menu(Box::new(menu))
            .with_menu_on_left_click(true)
            .with_tooltip("NewsNext")
            .with_icon(create_icon()?)
            .with_icon_as_template(true)
            .build()?;
        Ok(Self {
            icon,
            open_instances,
            quit_id,
        })
    }

    fn set_instances(
        &mut self,
        mut instances: Vec<ExtensionInstance>,
    ) -> Result<(), tray_icon::menu::Error> {
        instances.sort_by(|left, right| {
            left.browser
                .cmp(&right.browser)
                .then_with(|| left.id.cmp(&right.id))
        });
        let (menu, quit_id, open_instances) = create_tray_menu(&instances)?;
        self.icon.set_menu(Some(Box::new(menu)));
        self.open_instances = open_instances;
        self.quit_id = quit_id;
        Ok(())
    }

    fn open_instance_id(&self, menu_id: &MenuId) -> Option<String> {
        self.open_instances.get(menu_id).cloned()
    }
}

type TrayMenu = (Menu, MenuId, HashMap<MenuId, String>);

fn create_tray_menu(instances: &[ExtensionInstance]) -> Result<TrayMenu, tray_icon::menu::Error> {
    let menu = Menu::new();
    let mut open_instances = HashMap::new();
    match instances {
        [] => menu.append(&MenuItem::new("Open NewsNext", false, None))?,
        [instance] => {
            let open = MenuItem::new("Open NewsNext", true, None);
            open_instances.insert(open.id().clone(), instance.id.clone());
            menu.append(&open)?;
        }
        instances => {
            let open = Submenu::new("Open NewsNext", true);
            for instance in instances {
                let item = MenuItem::new(instance_menu_label(instance, instances), true, None);
                open_instances.insert(item.id().clone(), instance.id.clone());
                open.append(&item)?;
            }
            menu.append(&open)?;
        }
    }
    menu.append(&PredefinedMenuItem::separator())?;
    let count = instances.len();
    menu.append(&MenuItem::new(
        format!(
            "Running · {count} extension{}",
            if count == 1 { "" } else { "s" }
        ),
        false,
        None,
    ))?;
    menu.append(&PredefinedMenuItem::separator())?;
    let quit = MenuItem::new("Quit NewsNext", true, None);
    let quit_id = quit.id().clone();
    menu.append(&quit)?;
    Ok((menu, quit_id, open_instances))
}

fn instance_menu_label(instance: &ExtensionInstance, instances: &[ExtensionInstance]) -> String {
    let identity = shortest_unique_id_prefix(instance, instances);
    format!("{} · {identity}", instance.browser)
}

fn shortest_unique_id_prefix(
    instance: &ExtensionInstance,
    instances: &[ExtensionInstance],
) -> String {
    let id_length = instance.id.chars().count();
    let mut prefix_length = id_length.min(8);
    while prefix_length < id_length {
        let prefix = instance.id.chars().take(prefix_length).collect::<String>();
        if instances.iter().all(|candidate| {
            candidate.id == instance.id
                || candidate.browser != instance.browser
                || !candidate.id.starts_with(&prefix)
        }) {
            break;
        }
        prefix_length += 1;
    }
    instance.id.chars().take(prefix_length).collect()
}

fn create_icon() -> Result<Icon, tray_icon::BadIcon> {
    const SIZE: u32 = 18;
    let mut rgba = vec![0_u8; (SIZE * SIZE * 4) as usize];
    for y in 2..16 {
        for x in 3..15 {
            if x == 3 || x == 14 || y == 2 || y == 15 || x == y - 1 || x + y == 17 {
                let offset = ((y * SIZE + x) * 4) as usize;
                rgba[offset..offset + 4].copy_from_slice(&[0, 0, 0, 255]);
            }
        }
    }
    Icon::from_rgba(rgba, SIZE, SIZE)
}

#[cfg(test)]
mod tests {
    use std::ffi::OsString;

    use super::{instance_menu_label, is_native_host_invocation};
    use crate::protocol::ExtensionInstance;

    #[test]
    fn detects_chromium_native_host_invocation() {
        let arguments = [
            OsString::from("newsnext"),
            OsString::from("chrome-extension://extension-id/"),
        ];
        assert!(is_native_host_invocation(&arguments));
    }

    #[test]
    fn detects_firefox_native_host_invocation() {
        let arguments = [
            OsString::from("newsnext"),
            OsString::from("/tmp/com.newsnext.host.json"),
            OsString::from("newsnext@example.com"),
        ];
        assert!(is_native_host_invocation(&arguments));
    }

    #[test]
    fn leaves_cli_commands_to_clap() {
        let arguments = [OsString::from("newsnext"), OsString::from("status")];
        assert!(!is_native_host_invocation(&arguments));
    }

    #[test]
    fn disambiguates_instance_menu_labels_with_shared_prefixes() {
        let instances = [
            ExtensionInstance {
                id: "chrome-profile-a".into(),
                browser: "chrome".into(),
                extension_version: "test".into(),
            },
            ExtensionInstance {
                id: "chrome-profile-b".into(),
                browser: "chrome".into(),
                extension_version: "test".into(),
            },
        ];
        assert_eq!(
            instance_menu_label(&instances[0], &instances),
            "chrome · chrome-profile-a"
        );
        assert_eq!(
            instance_menu_label(&instances[1], &instances),
            "chrome · chrome-profile-b"
        );
    }
}
