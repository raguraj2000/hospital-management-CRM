mod server_manager;

use server_manager::ServerProcessState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(ServerProcessState::default())
        .invoke_handler(tauri::generate_handler![
            server_manager::ensure_server_running,
            server_manager::stop_local_server,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            // Windows does NOT kill child processes when their parent exits
            // -- without this, closing the app orphans the server, which
            // then squats the port for the next launch/restart attempt.
            // This is what "server stops when the app closes" actually
            // requires, not just spawning without DETACHED_PROCESS.
            if let tauri::RunEvent::ExitRequested { .. } = event {
                let state = app_handle.state::<ServerProcessState>();
                let mut guard = state.0.lock().unwrap();
                if let Some(child) = guard.as_mut() {
                    let _ = child.kill();
                    let _ = child.wait();
                }
                *guard = None;
            }
        });
}
