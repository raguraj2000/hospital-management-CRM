// Prevents an extra console window from appearing behind the app on
// Windows release builds. DO NOT REMOVE.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    clinic_system_lib::run();
}
