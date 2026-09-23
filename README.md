AADHI HOSPITAL - CLINIC SYSTEM - SETUP GUIDE
============================================

This is a clinic/pharmacy management system: patient records, prescriptions
that deduct medicine stock automatically, lab reports, and staff accounts.

NO INTERNET IS NEEDED. Everything comes from this pendrive.


QUICK INSTALL - MAIN COMPUTER (ONE CLICK)
-----------------------------------------

1. Plug in the pendrive.
2. Double-click  INSTALL AADHI HOSPITAL.bat  (on the pendrive).
3. Windows asks for permission: click Yes.
4. Wait about 1-3 minutes until the window says  DONE  in green, then
   press Enter.
5. Open "Aadhi Hospital" from the desktop. Login: admin / changeme123
   (then do PART 3 below).

It installs Node.js, copies the server to C:\Aadhi Hospital, sets up the
database, installs the server as a Windows service (always running, starts
with Windows), installs WebView2 if needed, installs the app, and checks
everything. Running it again is safe and never deletes patient data (use
it again for updates). If it says INSTALL STOPPED, read the red message.
Its log is saved at C:\Aadhi Hospital\install-log.txt .

The step-by-step PART 1 below does the same thing by hand; you only need it
if the one-click install fails. Other computers (staff/pharmacy): PART 2.


HOW IT WORKS (read this first)
------------------------------

The system needs exactly ONE "main computer". It stays on and holds all the
data (the database and the background server). Every other computer (front
desk, pharmacy, doctor's room) only runs the desktop app and talks to the
main computer over Wi-Fi/LAN. Nothing is stored on the other computers. If
the main computer is off, nobody can use the app.

        [ Main computer ]   <- server + database live here (must stay on)
                |
          Wi-Fi / LAN (same network)
                |
     +----------+----------+
     |          |          |
 [Front desk] [Pharmacy] [Doctor]   <- only the desktop app

Choose the most reliable, always-on computer as the main computer (a desktop
that doesn't sleep is best). If the clinic has only one computer right now,
that computer is the main computer.


WHAT IS ON THE PENDRIVE
-----------------------

  SETUP GUIDE.txt          this guide
  Aadhi Hospital\          the server. Copy to C:\ on the MAIN computer only.
      Install Main Computer.bat
      Check System.bat
      (apps, node_modules, scripts, tools ... do not change anything here)
  Installers\
      node-v24.21.0-x64.msi                  Node.js    (MAIN computer only)
      Aadhi Hospital_0.1.0_x64-setup.exe     the app    (EVERY computer)
      MicrosoftEdgeWebView2-x64-offline.exe  only if the app will not
                                             install or open (see Part 2)

Use ONLY the Node.js installer from this pendrive. A different Node.js
version, even a newer one, will stop the server from working.


=====================================================================
PART 0 - Clean up an earlier attempt (skip on a brand-new computer)
=====================================================================

Do this only if someone already tried to install on this computer, for
example if C:\New folder\clinic-system or C:\Aadhi Hospital already exists.

1. Click Start, type PowerShell, right-click "Windows PowerShell" and choose
   "Run as administrator". Type these two lines, pressing Enter after each:

       sc.exe stop ClinicSystemServer
       sc.exe delete ClinicSystemServer

   If they say the service does not exist, that's fine.

2. Delete these folders if they exist:
       C:\New folder\clinic-system    (developer source code, not needed)
       C:\Aadhi Hospital              (old copy, may contain test data)

WARNING: Delete C:\Aadhi Hospital only BEFORE the clinic starts using the
system. After that, it holds the real patient data.


=====================================================================
PART 1 - Set up the MAIN computer (one time only)
=====================================================================

STEP 1 - Install Node.js
  a) Open Command Prompt (Start > type cmd > Enter) and type:
         node --version
     - If it says "v24.21.0", Node.js is already correct. Go to Step 2.
     - If it says "not recognized", Node.js is not installed. Continue to b).
     - If it shows any OTHER version, first uninstall it:
       Settings > Apps > Installed apps > Node.js > Uninstall.
  b) On the pendrive, double-click Installers\node-v24.21.0-x64.msi
  c) Click Next through the installer, keeping the default options.
     On the page "Tools for Native Modules", LEAVE THE CHECKBOX UNTICKED.
  d) Click Install, then click Yes when Windows asks for permission.

STEP 2 - Copy the server folder to C:\
  Copy the "Aadhi Hospital" folder from the pendrive and paste it directly
  into C:\ (open "This PC" > "Local Disk (C:)" > Paste). Copying takes a few
  minutes because it has many small files. Wait until it has finished.

  When it's done, this file MUST exist:
      C:\Aadhi Hospital\Install Main Computer.bat

  WRONG: C:\Aadhi Hospital\Aadhi Hospital\...  (folder copied twice)
  WRONG: running anything directly from the pendrive.

STEP 3 - Run the installer
  Double-click  C:\Aadhi Hospital\Install Main Computer.bat
  Windows asks for permission; click Yes. A blue window opens and works for
  1-2 minutes. It:
    - checks the folder and the Node.js version
    - builds the server and creates the database
    - installs the server as a Windows service that starts automatically
      whenever the computer boots and restarts itself if it crashes
    - opens port 3001 in Windows Firewall for the other computers

  It must end with a green line:  SUCCESS -- the server is installed and running.
  It also prints this computer's network address, such as
  http://192.168.1.18:3001 . WRITE IT DOWN, because the other computers need it.
  (If the computer is not on a network yet, you'll get this later, in Part 2.)

  If you see a red "SETUP STOPPED" line, read the message and do what it
  says, then double-click the .bat again. Running it again is always safe.

STEP 4 - Check everything
  Double-click  C:\Aadhi Hospital\Check System.bat
  Every line should say PASS.

STEP 5 - Install the desktop app on this computer (see Part 2)
  On the main computer, don't change the server address. It stays at
  http://localhost:3001 .

STEP 6 - Stop the main computer from sleeping (recommended)
  Settings > System > Power (or "Power & battery") > Screen and sleep >
  "When plugged in, put my device to sleep after" > Never.
  (The screen may still turn off; that's fine.)

You never need to run the setup again on this computer. The server runs
in the background permanently, including after Windows restarts.


=====================================================================
PART 2 - Install the desktop app (EVERY computer)
=====================================================================

1. On the pendrive, double-click
       Installers\Aadhi Hospital_0.1.0_x64-setup.exe
2. If Windows shows a blue "Windows protected your PC" screen, click
   "More info", then "Run anyway". This is normal for a new app.
3. Click through the installer, then open "Aadhi Hospital" from the desktop
   shortcut or the Start menu.

If the app installer shows an error about "WebView2", or the app window does
not open or stays blank (this can happen on Windows 10), double-click
    Installers\MicrosoftEdgeWebView2-x64-offline.exe
wait for it to finish, then install/open the app again. (Windows 11 already
has WebView2.)

ON THE MAIN COMPUTER: nothing else to do.

ON EVERY OTHER COMPUTER (for example, the 3 new ones):
  These computers need ONLY the app. No Node.js, no "Aadhi Hospital" folder,
  no setup script.
  1. Connect the computer to the SAME Wi-Fi/LAN as the main computer.
  2. Open the app. On the sign-in screen, click "Server settings" near the
     bottom.
  3. Enter the main computer's address from Part 1, Step 3, for example:
         http://192.168.1.18:3001
  4. Click "Test connection". When it succeeds, click "Save".
     This is remembered, so you only do it once per computer.

  Finding the main computer's address later: on the MAIN computer, open
  Command Prompt and type  ipconfig . Look for "IPv4 Address" under the
  Wi-Fi or Ethernet adapter (for example 192.168.1.18). The address to enter
  is http://THAT-NUMBER:3001

  IMPORTANT: When the clinic's router/internet is installed, ask the
  technician to give the main computer a FIXED IP address ("DHCP
  reservation"). Otherwise the address can change after a router restart,
  and the other computers will say they can't reach the main computer. If
  that happens, find the new address with ipconfig and update "Server
  settings" on each other computer.


=====================================================================
PART 3 - First login
=====================================================================

Sign in with:
    Username: admin
    Password: changeme123

Then immediately:
1. Go to Preferences (top right) and set a new password. Write it down
   somewhere safe.
2. Go to Settings > Staff & roles and create a named account for each staff
   member (front desk, pharmacist, doctors), each with their own role and
   password. Don't share the admin login for daily use.
3. The system starts with TWO SAMPLE MEDICINES ("Paracetamol 500mg" and
   "Cough Syrup") so you can see how stock works. Correct or remove them
   before entering real stock.


=====================================================================
DAILY USE
=====================================================================

- Nobody needs to start the server. It starts on its own with Windows.
- Keep the MAIN computer switched on during clinic hours. After a restart
  (for example, a Windows update), the server comes back by itself.
- If another computer says it "can't reach the main computer", check:
  Is the main computer on? Is this computer on the same Wi-Fi? Is the
  address in "Server settings" correct?


=====================================================================
BACKUPS (important)
=====================================================================

All data is on the main computer in:
    C:\Aadhi Hospital\apps\server\data

(Lab report images/PDFs are stored inside the database, so every backup
includes them.)

AUTOMATIC (nothing to do):
  - Every 30 minutes, kept for 1 day:   data\backups\
  - One backup PER DAY, kept FOREVER:   data\backups\daily\clinic-YYYY-MM-DD.db
    Nothing deletes these. If the disk ever gets full, delete the oldest
    daily files by hand.
  - Before every update:                C:\Aadhi Hospital\update-backups\
  These are on the SAME computer, so they don't protect against a broken
  hard disk or a virus. That's why the weekly pendrive backup matters:

ONCE A WEEK: plug in a pendrive and double-click
    C:\Aadhi Hospital\Backup to Pendrive.bat
  It copies all data to  <pendrive>\AadhiHospital-Backup\  and checks the
  copy. Keep that pendrive at home, not next to the computer.

RESTORE A BACKUP (e.g. data was deleted by mistake):
  Close the app on every computer, then double-click
    C:\Aadhi Hospital\Restore Backup.bat
  (plug in the backup pendrive first if the backup is on it). Pick a backup
  from the list and type YES. The current data is saved first, so a restore
  can be undone by restoring the "Before update/restore" entry.

FORGOT THE ADMIN PASSWORD:
  On the main computer, double-click
    C:\Aadhi Hospital\Reset Admin Password.bat
  and type YES. Sign in with admin / changeme123 and set a new password.

NEVER delete, rename or move  C:\Aadhi Hospital  on the main computer.


=====================================================================
TROUBLESHOOTING
=====================================================================

Always start with: double-click  C:\Aadhi Hospital\Check System.bat
It prints PASS/FAIL for Node.js, the service, the connection and a login.
(After the admin password has been changed, the login line says "Default
password rejected ... good". That is correct.)

* The app can't connect, and Check System.bat says "Database file exists: FAIL"
  (or the installer / service-stderr.log says "DATABASE MISSING")
    The database file was deleted or moved. The server refuses to start
    with an empty database on purpose, so nobody works on a blank system.
    Double-click  C:\Aadhi Hospital\Restore Backup.bat , pick the newest
    backup (the top of the list), type YES. Then open the app again.

* Setup says the folder must be exactly C:\Aadhi Hospital
    The folder was copied to the wrong place, or it was started from the
    pendrive. Move it so that C:\Aadhi Hospital\Install Main Computer.bat
    exists, and run it from there.

* Setup says "prepared for Node.js v24.21.0 but this computer has ..."
    Uninstall Node.js (Settings > Apps), install the one in the pendrive's
    Installers folder, then run the .bat again.

* Setup says "Node.js is not installed"
    Do Part 1, Step 1. Then CLOSE the setup window and run the .bat again.

* Setup says the copy is incomplete / something is "missing"
    The copy from the pendrive didn't finish. Delete C:\Aadhi Hospital and
    copy the folder again (only before real data exists!).

* Other computers can't connect, but the main computer works
    Both must be on the same network. Check that the firewall rule exists:
    on the main computer, open PowerShell as administrator and type
        Get-NetFirewallRule -DisplayName "Clinic System Server"
    If nothing prints, add it:
        New-NetFirewallRule -DisplayName "Clinic System Server" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow -Profile Any

* The app window is blank or won't open
    Run Installers\MicrosoftEdgeWebView2-x64-offline.exe (see Part 2).

* Restart the server by hand (rarely needed). Use PowerShell as administrator:
      net stop ClinicSystemServer
      net start ClinicSystemServer

* Log file for deeper troubleshooting:
      C:\Aadhi Hospital\apps\server\service-stderr.log

* Need help from the developer? Plug in a pendrive and double-click
      C:\Aadhi Hospital\Collect Support Info.bat
  It copies logs and a system check (NO patient data) to the pendrive.

Never run "npm install" or "npm rebuild" on a clinic computer. They need
internet and are not required. Everything is already on the pendrive.


=====================================================================
INSTALLING AN UPDATE LATER
=====================================================================

The developer brings a new pendrive. On the MAIN computer:
1. Close the app on every computer.
2. Double-click  INSTALL AADHI HOSPITAL.bat  on the new pendrive, click Yes.
3. It shows "UPDATE: old version -> new version", saves a safety copy of
   all data (C:\Aadhi Hospital\update-backups\before-update-...) and of the
   current program, then installs the update.
4. Wait for DONE. If anything goes wrong, it automatically puts the
   previous version and data back, so the clinic can keep working.
5. On the OTHER computers (if any), run the new
   Installers\Aadhi Hospital_..._x64-setup.exe . It installs over the old
   version, so there's no need to uninstall first.

(Developer notes are in DEVELOPER.md in the source code. None of the
developer scripts should ever be run on the clinic computers.)
