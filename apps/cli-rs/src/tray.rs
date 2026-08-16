use std::collections::HashMap;
use std::time::Duration;

use tao::event::{Event, StartCause};
use tao::event_loop::{ControlFlow, EventLoopBuilder};
use tray_icon::menu::{
    CheckMenuItem, Menu, MenuEvent, MenuId, MenuItem, PredefinedMenuItem, Submenu,
};
use tray_icon::{Icon, TrayIcon, TrayIconBuilder};

use crate::daemon::DaemonEvent;
use crate::native_messaging::installer::{self, Browser};
use crate::protocol::ExtensionInstance;
use crate::runtime_environment::RuntimeEnvironment;
use crate::{control, daemon, ipc};

pub fn run_daemon() -> Result<(), Box<dyn std::error::Error>> {
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
                if let Some(tray) = &tray {
                    if let Some(instance_id) = tray.open_instance_id(&event.id) {
                        open_app(cleanup_endpoint.clone(), instance_id);
                    } else if event.id == tray.quit_id {
                        exit_daemon(&cleanup_endpoint, control_flow);
                    } else {
                        tray.handle_browser_registration(&event.id);
                    }
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
    app_name: &'static str,
    open_instances: HashMap<MenuId, String>,
    browser_registrations: HashMap<MenuId, BrowserRegistration>,
    quit_id: MenuId,
}

struct BrowserRegistration {
    browser: Browser,
    item: CheckMenuItem,
}

impl TrayState {
    fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let app_name = RuntimeEnvironment::current()?.display_name();
        let (menu, quit_id, open_instances, browser_registrations) =
            create_tray_menu(&[], app_name)?;
        let icon = TrayIconBuilder::new()
            .with_menu(Box::new(menu))
            .with_menu_on_left_click(true)
            .with_tooltip(app_name)
            .with_icon(create_icon()?)
            .with_icon_as_template(true)
            .build()?;
        Ok(Self {
            icon,
            app_name,
            open_instances,
            browser_registrations,
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
        let (menu, quit_id, open_instances, browser_registrations) =
            create_tray_menu(&instances, self.app_name)?;
        self.icon.set_menu(Some(Box::new(menu)));
        self.open_instances = open_instances;
        self.browser_registrations = browser_registrations;
        self.quit_id = quit_id;
        Ok(())
    }

    fn open_instance_id(&self, menu_id: &MenuId) -> Option<String> {
        self.open_instances.get(menu_id).cloned()
    }

    fn handle_browser_registration(&self, menu_id: &MenuId) {
        let Some(registration) = self.browser_registrations.get(menu_id) else {
            return;
        };
        let checked = registration.item.is_checked();
        let result = if checked {
            installer::install(registration.browser)
        } else {
            installer::uninstall(registration.browser)
        };
        registration
            .item
            .set_checked(installer::is_registered(registration.browser));
        if let Err(error) = result {
            eprintln!(
                "Could not {} Native Messaging for {}: {error}",
                if checked { "install" } else { "uninstall" },
                registration.browser.display_name()
            );
        }
    }
}

type TrayMenu = (
    Menu,
    MenuId,
    HashMap<MenuId, String>,
    HashMap<MenuId, BrowserRegistration>,
);

fn create_tray_menu(
    instances: &[ExtensionInstance],
    app_name: &str,
) -> Result<TrayMenu, tray_icon::menu::Error> {
    let menu = Menu::new();
    let mut open_instances = HashMap::new();
    match instances {
        [] => menu.append(&MenuItem::new(format!("Open {app_name}"), false, None))?,
        [instance] => {
            let open = MenuItem::new(format!("Open {app_name}"), true, None);
            open_instances.insert(open.id().clone(), instance.id.clone());
            menu.append(&open)?;
        }
        instances => {
            let open = Submenu::new(format!("Open {app_name}"), true);
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
    let mut browser_registrations = HashMap::new();
    let installed_browsers = installer::installed_browsers().collect::<Vec<_>>();
    if !installed_browsers.is_empty() {
        menu.append(&PredefinedMenuItem::separator())?;
        let browser_menu = Submenu::new("Browser Integration", true);
        for browser in installed_browsers {
            let item = CheckMenuItem::new(
                browser.display_name(),
                true,
                installer::is_registered(browser),
                None,
            );
            browser_registrations.insert(
                item.id().clone(),
                BrowserRegistration {
                    browser,
                    item: item.clone(),
                },
            );
            browser_menu.append(&item)?;
        }
        menu.append(&browser_menu)?;
    }
    menu.append(&PredefinedMenuItem::separator())?;
    let quit = MenuItem::new(format!("Quit {app_name}"), true, None);
    let quit_id = quit.id().clone();
    menu.append(&quit)?;
    Ok((menu, quit_id, open_instances, browser_registrations))
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
    use super::instance_menu_label;
    use crate::protocol::ExtensionInstance;

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
