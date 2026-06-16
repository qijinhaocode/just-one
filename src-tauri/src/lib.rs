use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, Runtime,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

/// Toggle window: show+focus if hidden, hide if visible.
fn toggle_window<R: Runtime>(app: &tauri::AppHandle<R>) {
    if let Some(win) = app.get_webview_window("main") {
        let is_visible = win.is_visible().unwrap_or(false);
        if is_visible {
            let _ = win.hide();
        } else {
            let _ = win.show();
            let _ = win.set_focus();
            let _ = win.center();
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // ── Plugins ────────────────────────────────────────────────────────
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        // ── Setup ──────────────────────────────────────────────────────────
        .setup(|app| {
            let handle = app.handle().clone();

            // ── Global shortcut: Alt+Shift+O (Option+Shift+O on macOS) ─────
            let shortcut = Shortcut::new(
                Some(Modifiers::ALT | Modifiers::SHIFT),
                Code::KeyO,
            );
            let shortcut_handle = handle.clone();
            app.global_shortcut()
                .on_shortcut(shortcut, move |_app, _sc, _event| {
                    toggle_window(&shortcut_handle);
                })?;

            // ── System tray ───────────────────────────────────────────────
            let show_item = MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?;
            let about_item = MenuItem::with_id(app, "about", "关于 JustOne AI", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &about_item, &quit_item])?;

            // Use a bundled icon (falls back gracefully if icon file is absent during dev)
            let icon_bytes = include_bytes!("../icons/32x32.png");
            let tray_icon = Image::from_bytes(icon_bytes)?;

            TrayIconBuilder::new()
                .menu(&menu)
                .icon(tray_icon)
                .tooltip("JustOne AI — 今日聚焦")
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_window(tray.app_handle());
                    }
                })
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                    "about" => {
                        // Open a simple about dialog via shell — or you could
                        // spawn a dedicated about window.
                        let _ = tauri_plugin_shell::open(
                            &app.shell(),
                            "https://github.com/qijinhaocode/just-one",
                            None,
                        );
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        // ── Intercept close button: hide instead of quit ───────────────────
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
