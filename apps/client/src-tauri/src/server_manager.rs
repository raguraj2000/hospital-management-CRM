// Fully automatic server lifecycle: the app ensures its own backend is
// installed, built, migrated, seeded, and running on every launch, with no
// manual steps and no OS-Administrator requirement (spawning a background
// Node process never needed elevation -- that earlier gate only added a
// confusing step nobody remembered). The clinic app's own Admin role (once
// logged in) is what gates server-management UI going forward, not Windows
// elevation.
use std::io::Read;
use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

// Avoids a console window flashing up behind the app when spawning node.exe/npm.
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

pub struct ServerProcessState(pub Mutex<Option<Child>>);

impl Default for ServerProcessState {
    fn default() -> Self {
        ServerProcessState(Mutex::new(None))
    }
}

fn npm_program() -> &'static str {
    // On Windows npm is a .cmd shim, not a real PE executable -- Command
    // must be given the exact name including the extension to find it.
    if cfg!(windows) {
        "npm.cmd"
    } else {
        "npm"
    }
}

const SERVER_PORT: u16 = 3001;

// The main computer runs its backend as this Windows service (registered by
// scripts/setup-main-computer.ps1, via NSSM), not as a child process of this
// app -- it needs to be running at boot before anyone opens the app, and to
// self-heal if node.exe crashes mid-shift, neither of which a process this
// app spawns and kills on exit can do. Whenever this service is present,
// every function below defers to it (via `sc`) instead of touching a raw
// node process directly. Discovering that mismatch -- and that `sc stop`
// (a clean SCM stop) does NOT trigger NSSM's crash-restart the way
// `taskkill`-ing the raw process does -- is what fixed the EADDRINUSE loop
// this file used to produce: killing the process bypassed the service
// manager, so NSSM immediately treated it as a crash and relaunched it,
// racing whatever this app tried to spawn next.
const MAIN_SERVICE_NAME: &str = "ClinicSystemServer";

fn sc_command(args: &[&str]) -> std::io::Result<std::process::Output> {
    let mut cmd = Command::new("sc");
    cmd.args(args);
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd.output()
}

/// Returns the service's SCM state word (e.g. "RUNNING", "STOPPED",
/// "START_PENDING"), or None if the service isn't registered on this machine
/// at all (e.g. a satellite computer, or before setup-main-computer.ps1 has
/// ever been run here).
fn windows_service_status(name: &str) -> Option<String> {
    let output = sc_command(&["query", name]).ok()?;
    if !output.status.success() {
        return None;
    }
    let text = String::from_utf8_lossy(&output.stdout);
    for line in text.lines() {
        let trimmed = line.trim_start();
        if let Some(rest) = trimmed.strip_prefix("STATE") {
            let after_colon = rest.split(':').nth(1)?;
            return after_colon.split_whitespace().last().map(|s| s.to_string());
        }
    }
    None
}

fn start_windows_service(name: &str) -> Result<(), String> {
    let output = sc_command(&["start", name])
        .map_err(|e| format!("Could not run 'sc start {name}': {e}"))?;
    if output.status.success() {
        return Ok(());
    }
    let stderr = String::from_utf8_lossy(&output.stderr);
    let stdout = String::from_utf8_lossy(&output.stdout);
    let detail = if !stderr.trim().is_empty() { stderr } else { stdout };
    Err(format!(
        "Could not start the '{name}' service: {}. If this says access is denied, an administrator needs to run the one-time service-permissions fix (see scripts/setup-main-computer.ps1).",
        detail.trim()
    ))
}

fn stop_windows_service(name: &str) -> Result<(), String> {
    let output = sc_command(&["stop", name])
        .map_err(|e| format!("Could not run 'sc stop {name}': {e}"))?;
    // A non-zero exit here is tolerated (e.g. "service not started", error
    // 1062) -- the goal is just "make sure it's stopped", and it may already
    // be. Access-denied is the one case worth surfacing distinctly, since
    // callers otherwise proceed to `sc start` next and get a confusing
    // "start" failure for what's actually a permissions problem.
    let stderr = String::from_utf8_lossy(&output.stderr).to_lowercase();
    let stdout = String::from_utf8_lossy(&output.stdout).to_lowercase();
    if stderr.contains("access is denied") || stdout.contains("access is denied") {
        return Err(format!(
            "Could not stop the '{name}' service: access denied. An administrator needs to run the one-time service-permissions fix (see scripts/setup-main-computer.ps1)."
        ));
    }
    Ok(())
}

/// Blocks briefly for the service to actually reach STOPPED before the
/// caller starts it again -- `sc start` issued while still mid-stop (state
/// STOP_PENDING) can fail or race the port being released.
fn wait_for_service_stopped(name: &str) {
    for _ in 0..20 {
        match windows_service_status(name).as_deref() {
            Some("STOPPED") | None => return,
            _ => std::thread::sleep(Duration::from_millis(300)),
        }
    }
}

/// Best-effort: find whatever process is listening on the server's port and
/// terminate it. Needed because (a) an app session from before the exit
/// hook existed can have left an orphaned node.exe still holding the port,
/// and (b) "Restart" needs the old process fully gone before a new one can
/// bind the same port. Never errors -- if nothing's there, or the lookup
/// fails, this is simply a no-op.
fn kill_stale_process_on_port(port: u16) {
    let mut netstat = Command::new("netstat");
    netstat.args(["-ano"]);
    #[cfg(windows)]
    netstat.creation_flags(CREATE_NO_WINDOW);
    let Ok(output) = netstat.output() else { return };
    let text = String::from_utf8_lossy(&output.stdout);
    let needle = format!(":{port}");

    for line in text.lines() {
        if !line.contains(&needle) || !line.contains("LISTENING") {
            continue;
        }
        let Some(pid) = line.split_whitespace().last() else { continue };
        if pid.parse::<u32>().is_err() {
            continue;
        }
        let mut kill = Command::new("taskkill");
        kill.args(["/F", "/PID", pid]);
        #[cfg(windows)]
        kill.creation_flags(CREATE_NO_WINDOW);
        let _ = kill.output();
    }
    // Give Windows a moment to actually release the socket after the kill.
    std::thread::sleep(Duration::from_millis(400));
}

fn run_step(root: &str, args: &[&str], step_name: &str) -> Result<(), String> {
    let mut command = Command::new(npm_program());
    command.args(args).current_dir(root);
    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);

    let output = command
        .output()
        .map_err(|e| format!("Could not run '{step_name}' (is Node.js/npm installed and on PATH?): {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        let detail = if !stderr.trim().is_empty() { stderr } else { stdout };
        return Err(format!("'{step_name}' failed:\n{}", detail.trim()));
    }
    Ok(())
}

/// Runs the full startup sequence against `root` (the server package root --
/// contains package.json, apps/server, packages/shared):
///   1. `npm install` at the root, only if node_modules is missing.
///   2. `npm run build:server` at the root, always (fast -- keeps a
///      copied-in server update from ever going stale from a forgotten
///      manual build step).
///   3. `npm run migrate` then `npm run seed` -- both already idempotent.
///   4. Spawn `node dist/index.js` from apps/server as a background child of
///      this app (dies when the app does, per the confirmed lifecycle).
/// Does NOT itself poll /health -- the caller (JS) already has a working
/// heartbeat/health-check loop and better UI for "still starting" vs
/// "gave up", so this only needs to confirm the process didn't immediately
/// crash on launch.
#[tauri::command]
pub fn ensure_server_running(root: String, state: tauri::State<ServerProcessState>) -> Result<(), String> {
    match windows_service_status(MAIN_SERVICE_NAME).as_deref() {
        Some("RUNNING") => return Ok(()),
        Some(_other) => return start_windows_service(MAIN_SERVICE_NAME),
        None => {
            // A real clinic install (it ships tools\nssm.exe) runs the server
            // ONLY as the Windows service. If the service is missing, it's
            // being updated/reinstalled right now -- never start a second
            // server of our own: it would hold the database open and block
            // the service (and an update or restore could then damage the file).
            if Path::new(&root).join("tools").join("nssm.exe").is_file() {
                return Err(
                    "The Aadhi Hospital server service is not running (it may be being updated). \
                     Wait a minute and try again. If it continues, run C:\\Aadhi Hospital\\Check System.bat."
                        .to_string(),
                );
            }
            // Otherwise (developer machine): fall through to the spawn path below.
        }
    }

    {
        let mut guard = state.0.lock().unwrap();
        if let Some(child) = guard.as_mut() {
            if matches!(child.try_wait(), Ok(None)) {
                return Ok(()); // already running under our management
            }
            *guard = None;
        }
    }

    let root_path = Path::new(&root);
    if !root_path.join("package.json").is_file() || !root_path.join("apps").join("server").is_dir() {
        return Err(format!(
            "'{root}' doesn't look like the server package (expected package.json and apps\\server there)."
        ));
    }

    if !root_path.join("node_modules").is_dir() {
        run_step(&root, &["install"], "npm install")?;
    }
    run_step(&root, &["run", "build:server"], "npm run build:server")?;
    run_step(&root, &["run", "migrate"], "npm run migrate")?;
    run_step(&root, &["run", "seed"], "npm run seed")?;

    kill_stale_process_on_port(SERVER_PORT);

    let server_dir = root_path.join("apps").join("server");
    let mut command = Command::new("node");
    command
        .arg("dist/index.js")
        .current_dir(&server_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);

    let mut child = command
        .spawn()
        .map_err(|e| format!("Failed to start the server (node dist/index.js in {}): {e}", server_dir.display()))?;

    // Give it a moment to crash on startup (e.g. port already in use, a
    // corrupted build) before declaring success, so a bad start surfaces a
    // real error instead of a silent "started" that never actually answers.
    std::thread::sleep(Duration::from_millis(800));
    if let Ok(Some(exit_status)) = child.try_wait() {
        let mut stderr = String::new();
        if let Some(mut s) = child.stderr.take() {
            let _ = s.read_to_string(&mut stderr);
        }
        return Err(format!(
            "Server exited immediately ({exit_status}): {}",
            if stderr.trim().is_empty() { "(no error output)" } else { stderr.trim() }
        ));
    }

    let mut guard = state.0.lock().unwrap();
    *guard = Some(child);
    Ok(())
}

#[tauri::command]
pub fn stop_local_server(state: tauri::State<ServerProcessState>) -> Result<(), String> {
    if windows_service_status(MAIN_SERVICE_NAME).is_some() {
        stop_windows_service(MAIN_SERVICE_NAME)?;
        wait_for_service_stopped(MAIN_SERVICE_NAME);
        return Ok(());
    }

    let mut guard = state.0.lock().unwrap();
    match guard.as_mut() {
        Some(child) => {
            child.kill().map_err(|e| format!("Failed to stop server: {e}"))?;
            // Wait for the exit, not just the kill signal, so the port is
            // actually free before anything tries to bind it again right
            // after this returns (e.g. Settings' Restart button).
            let _ = child.wait();
            *guard = None;
            Ok(())
        }
        None => {
            // Not one we're tracking -- still worth clearing anything
            // stale off the port so a subsequent start isn't blocked by it.
            kill_stale_process_on_port(SERVER_PORT);
            Ok(())
        }
    }
}
