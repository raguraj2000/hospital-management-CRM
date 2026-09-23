# Developer notes (not for the clinic)

`C:\New folder\clinic-system` is the **source repo**. It never goes to a
clinic computer. The clinic gets the pendrive folder built below, which
installs to `C:\Aadhi Hospital`. That path is fixed: the desktop app's
`DEFAULT_SERVER_ROOT` (`apps/client/src/state/server-lifecycle.ts`) and
`deploy-to-main-computer.ps1` both assume it.

## Build the pendrive

```powershell
cd "C:\New folder\clinic-system"
powershell -ExecutionPolicy Bypass -File .\scripts\package-for-handoff.ps1
```

Output: `handoff\PENDRIVE\`. Copy **everything inside it** to the root of the
pendrive. The script:
- checks that `better-sqlite3`/`argon2` load on this PC's Node.js, then
  builds the server
- copies `apps\server` (without `data\`, `tests\`, or logs), `packages\shared`,
  and `node_modules` (without the `@clinic/*` workspace junctions, which
  setup recreates on-site)
- adds `tools\nssm.exe`, so the client doesn't need winget/internet
- writes `node-version.txt` and downloads the **matching** Node.js MSI and
  the offline WebView2 installer (cached in `handoff\download-cache`)
- copies the latest desktop installer from
  `apps\client\src-tauri\target\release\bundle\nsis`. **Rebuild it first** if
  the client app changed (`cd apps\client` then `npm run tauri build`).
- refuses to finish if any `*.db` file ended up in the package

## The Node.js version rule

`better-sqlite3` is compiled for one Node.js major version (ABI). The
packaged `node_modules` only works with the **same major version** of Node.js
the pendrive was built on, and that is the MSI the package ships.
`setup-main-computer.ps1` enforces this via `node-version.txt`.

If you upgrade Node.js on this PC, run `npm rebuild better-sqlite3` in the
repo **and** in `C:\Aadhi Hospital` (with the service stopped), otherwise
the local `ClinicSystemServer` service fails on its next start with
`NODE_MODULE_VERSION` mismatch.

## Offline test before handing over

To be sure the pendrive works on a machine with no internet, test it on
this PC (or a spare one):
1. Back up `C:\Aadhi Hospital\apps\server\data`, then run `sc.exe stop
   ClinicSystemServer` and `sc.exe delete ClinicSystemServer`, and rename
   `C:\Aadhi Hospital` aside.
2. Copy `handoff\PENDRIVE\Aadhi Hospital` to `C:\`.
3. **Disconnect Wi-Fi/Ethernet.**
4. Run `Install Main Computer.bat`, then `Check System.bat`. All checks must PASS.
5. Restore your original folder and re-run its setup.

## Deploying to the install on THIS PC

`scripts\deploy-to-main-computer.ps1` syncs the repo's `dist\` +
`migrations\` into `C:\Aadhi Hospital` **on the same computer** and restarts
the service. It's for the developer PC only; it refuses to run from
`C:\Aadhi Hospital` or when the service isn't installed. For clinic
updates, build a new pendrive and follow "Installing an update later" in
README.md.
