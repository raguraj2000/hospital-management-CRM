import { type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { Card, CardHeader, PageHeader } from '@platform/ui';

/** One job: who does it, where, and the steps in order. */
interface Guide {
  id: string;
  title: string;
  who: string;
  /** Page under /:branch that the job starts on. */
  page?: { path: string; label: string };
  steps: ReactNode[];
  notes?: ReactNode[];
}

const K = ({ children }: { children: ReactNode }) => <kbd className="rounded border border-border bg-subtle px-1 font-mono text-[11px]">{children}</kbd>;
const B = ({ children }: { children: ReactNode }) => <span className="font-semibold text-ink">{children}</span>;

const PATIENT_DAY: ReactNode[] = [
  <><B>Front desk</B> registers the patient (once) and starts an OP visit. The patient gets a token.</>,
  <><B>Doctor</B> calls the patient in, writes the medicines, orders lab tests if needed.</>,
  <><B>Lab</B> (only if tests were ordered) enters the results and prints the report.</>,
  <><B>Doctor</B> presses “Create prescription &amp; send to pharmacy” when the consultation is over.</>,
  <><B>Pharmacy / billing counter</B> takes one payment for consultation, lab and medicines, and hands over the medicines.</>,
  <><B>Nurse</B> (only if the doctor marked a medicine “Given here in the hospital”) gives each dose and ticks it.</>,
  <><B>Owner</B> checks the day’s money in Billing → Daily report.</>,
];

const GUIDES: Guide[] = [
  {
    id: 'front-desk',
    title: 'Front desk: register a patient and start a visit',
    who: 'Front desk',
    page: { path: 'visits', label: 'OP visits' },
    steps: [
      <>New patient: press <K>Alt</K>+<K>N</K> (or Patients → Add patient). Only the name is required. Pick the date of birth and the age fills itself; if the date is unknown, type the age.</>,
      <>Patient who came before: press <K>Ctrl</K>+<K>K</K> on any page (or “New” at the bottom of the side menu): the New OP visit window opens; search by name, phone or UHID. The tabs on top of that window switch to “Lab test only”, “Bill only” or “Direct sale”.</>,
      <>Press “New OP visit”. Choose the doctor, type the complaint and vitals if you take them. No fee is asked here.</>,
      <>The patient now waits in the list with a token number.</>,
    ],
    notes: [<>A visit made by mistake: open it in the OP visits list and press “Cancel visit”. A visit that already has a bill or a pharmacy sale cannot be cancelled.</>],
  },
  {
    id: 'doctor',
    title: 'Doctor: see the patient',
    who: 'Doctor',
    page: { path: 'visits', label: 'OP visits' },
    steps: [
      <>On OP visits press “Call next” (<K>Alt</K>+<K>C</K>), or open any waiting patient.</>,
      <>Add medicines one at a time (<K>Alt</K>+<K>M</K>): medicine, dose, days, instruction. A medicine with no stock cannot be added.</>,
      <>Or add a bookmark (<K>Alt</K>+<K>B</K>): a ready-made treatment such as “Dengue”. Untick what this patient does not need, change a dose for this patient if needed, confirm.</>,
      <>Lab tests: “Send to lab” (<K>Alt</K>+<K>L</K>) and tick the tests. The patient goes to the lab queue and comes back to you.</>,
      <>Consultation fee: the standard fee is used. Change it on the visit page for this patient if needed.</>,
      <>Finish: “Create prescription &amp; send to pharmacy” (<K>Alt</K>+<K>S</K>). Only now does the patient appear at the counter.</>,
    ],
    notes: [
      <>“Given here in the hospital” on a medicine (an injection, a drip) puts every dose on the <B>Today’s treatments</B> page for the nurse.</>,
      <>Long-term conditions (sugar, BP…) entered on the patient show in red at every visit.</>,
    ],
  },
  {
    id: 'bookmarks',
    title: 'Bookmarks: ready-made treatments',
    who: 'Doctor, owner',
    page: { path: 'bookmarks', label: 'Bookmarks' },
    steps: [
      <>Open Bookmarks → “New bookmark”. Give it a name (Dengue, Fever, Dressing…).</>,
      <>Add medicines with dose, days and instruction, and add instructions to carry out (for example “Check platelet count daily”).</>,
      <>Use it: on a patient’s OP visit press <K>Alt</K>+<K>B</K>, search the name, confirm.</>,
      <>Changes made while adding it to a patient are for that patient only. To change it for everyone, press “Edit” on the Bookmarks page.</>,
    ],
    notes: [<>The instructions of a bookmark show on the visit page under “Instructions to carry out”, where the doctor or nurse presses “Confirm done”.</>],
  },
  {
    id: 'nurse',
    title: 'Nurse: give the doses and tick them',
    who: 'Nurse (the doctor can do it too)',
    page: { path: 'treatments', label: 'Today’s treatments' },
    steps: [
      <>Open <B>Today’s treatments</B> in the side menu. It lists every dose for today: time, patient, medicine.</>,
      <>Give the dose, press “Given”, add a note if needed (for example “Left arm”), press “Yes, given”.</>,
      <>Gave everything on the list? Press “Mark all as given”, read the list, confirm.</>,
      <>Pressed by mistake? “Undo” puts the dose back to “To give”.</>,
    ],
    notes: [
      <>Doses not ticked on their day show at the top in red as “Missed on earlier days”.</>,
      <>“Not collected from the pharmacy yet” means the patient has not paid for that medicine at the counter.</>,
    ],
  },
  {
    id: 'lab',
    title: 'Lab: results and report',
    who: 'Lab technician',
    page: { path: 'lab', label: 'Lab' },
    steps: [
      <>Lab → Queue shows every test the doctors ordered.</>,
      <>A patient who needs a test without seeing the doctor: press “Direct lab test” (on the Lab page or the OP visits page), find or register the patient, tick the tests. No consultation fee is charged; the counter collects the lab charges in Billing.</>,
      <>Open the patient, type the values, press “Save &amp; complete” (<K>Alt</K>+<K>S</K>). Low and high values are marked from the test’s range.</>,
      <>Print the report from the Completed tab or from the patient page.</>,
    ],
    notes: [
      <>Tests and prices: Lab → “Tests &amp; prices”. A group test (CBC) has several result lines, each with its own method and range. Only the owner and branch admin can change a test fully.</>,
      <>The report is held back while the bill is unpaid, unless the owner or branch admin releases it with a reason.</>,
      <>“Required” on a result line (Tests &amp; prices): a value must be typed before the test can be completed, and the line always prints. A line without the tick may stay empty, and an empty line is left out of the printed report. While typing results the lab can untick “Required” on a line that was not done for this patient.</>,
      <>Several tests for one patient: at the top of the print page, tick the tests that should start on a new page. The ticks are remembered for those tests on that computer.</>,
      <>Packages (several tests at one price): Lab → Tests &amp; prices → “New package”. They are ticked like a test when ordering. The queue shows “Paid” or “Not paid” on every test; Lab → Lab reports shows the tests done and what they brought in.</>,
      <>While typing results, each line shows the patient’s earlier results of the same test (“Earlier: …”). A lab-only visit can carry “Referred by” (an outside doctor); it prints on the report with the sample numbers.</>,
      <>A completed test is locked. To change it, someone with “Correct completed lab results” (the owner and branch admin; tick it on another role in Settings → Roles) presses “Correct results” and writes why. The printed report then says when it was corrected.</>,
      <>Pressed “Sample collected” by mistake? Press “Undo sample” on that row. “Back to doctor” sends the patient to the doctor’s waiting list; the test stays in the queue until it is completed or cancelled.</>,
    ],
  },
  {
    id: 'counter',
    title: 'Pharmacy and billing counter: collect the money',
    who: 'Pharmacist, front desk',
    page: { path: 'billing', label: 'Billing' },
    steps: [
      <>Billing → “To collect” shows the patients the doctor has sent. Open one.</>,
      <>Check the lines: consultation, lab tests, medicines. Untick a medicine the patient does not want. Add any other charge with “Add charge”: pick a ready-made one or type it. It is saved at once.</>,
      <>Discount: type it in the “Discount” box. Round off: HMS rounds the total up to the next ₹5 by itself (158 → 160); type another amount in the “Round off” box if needed (₹10 at most), “Auto” puts it back.</>,
      <>Type the amount received, choose cash, UPI or card, press Enter. The receipt prints.</>,
      <>Paid less than the total? The rest shows in “Pending payments” and on the dashboard as “Payments due”. Press “Receive” there when the patient pays.</>,
    ],
    notes: [
      <>A patient with no prescription who only buys medicines: Pharmacy → Direct sale. <K>Alt</K>+<K>R</K> adds what that patient bought last time.</>,
      <>Old bills and receipts: Billing → “Payment reports” → Today → “Completed payments”, pick the date, press Print.</>,
      <>A patient at “Pharmacy &amp; billing” is completed by collecting the payment, not by hand. A visit that has a bill cannot be cancelled.</>,
      <>A patient who wants to pay old dues later: open the patient, press “Collect dues”. The oldest bill is paid first.</>,
      <>Collect, Send to pharmacy, Register, New OP visit, Order lab tests and Save &amp; complete wait 5 seconds with an “Undo” button. Pressed by mistake? Press Undo and nothing is saved.</>,
      <>A bill without seeing the doctor (only a dressing or an injection): press “Create bill” on the Billing page or on the patient’s page. No consultation fee is charged; add the charges with “Add charge” and collect.</>,
      <>“To collect” lists earlier days first, so a patient added just after midnight comes after last night’s patients.</>,
    ],
  },
  {
    id: 'day-end',
    title: 'End of the day: check the collection',
    who: 'Owner, branch admin, and any role given “Reports”',
    page: { path: 'billing?tab=report', label: 'Payment reports' },
    steps: [
      <>Billing → “Payment reports”. Choose Today, 7 days, 30 days or 1 year. Today also has the day’s report; pick another date there for an earlier day.</>,
      <>Compare “Cash” with the money in the drawer, and “UPI” and “Card” with the phone and the machine.</>,
      <>The list underneath has every receipt of the day: time, patient, amount, mode.</>,
      <>Press Print to keep a paper copy.</>,
    ],
    notes: [
      <>“Still due” is money patients have not paid yet. It is not part of the day’s collection.</>,
      <>“Round off added” is the extra money from rounding bills up. “Discount given” is the total taken off; the “Discounts given” list underneath shows each patient, bill and amount.</>,
      <>Who sees the reports: Settings → Roles → tick “Reports” for a role. Without it the “Payment reports” and “Pharmacy reports” tabs are hidden. A doctor without it still sees their own patients on the dashboard.</>,
    ],
  },
  {
    id: 'stock',
    title: 'Medicine stock and vendors',
    who: 'Pharmacist, owner',
    page: { path: 'inventory', label: 'Inventory' },
    steps: [
      <>New medicine: Inventory → Medicines → add it with its selling price and reorder level.</>,
      <>Stock from a vendor bill: Vendors → new purchase bill. Choose the vendor, type each medicine with batch number, expiry, quantity and cost. Saving adds the stock and records what is owed to the vendor.</>,
      <>Paying the vendor: open the purchase bill → record the payment.</>,
      <>What to reorder and what is expiring: the dashboard, and Inventory → Reports.</>,
    ],
    notes: [<>The pharmacy always sells the batch that expires first.</>],
  },
  {
    id: 'setup',
    title: 'Settings: staff, fees, branch logo',
    who: 'Owner, branch admin',
    page: { path: 'settings', label: 'Settings' },
    steps: [
      <>Staff: Settings → Staff → add each person with a mobile number, a password and a role. The role decides which pages they see.</>,
      <>Someone forgot a password: Settings → Staff → “Reset password” on their row.</>,
      <>What each role may do: Settings → Roles. For example “Reports” decides who sees the money reports. Settings → Activity log shows who did what in the last 30 days, with the patient’s name and phone.</>,
      <>Branch logo (side menu, bills, lab reports): Settings → Branch settings. Hospital name, address, doctors, signatures, footer and background logo of the printed header: Lab → Report header.</>,
      <>A different consultation fee at night: Settings → Branch settings → Consultation fee → “Add a time slot” (for example 22:00 to 06:00 = ₹200). A new OP visit takes the fee of the time it is made.</>,
      <>Consultation fee, the default doctor and the ready-made charges (dressing, IV…): Settings → Branch settings. The doctor can change the fee for one visit.</>,
    ],
  },
  {
    id: 'upkeep',
    title: 'Backup, update, start fresh',
    who: 'Owner',
    steps: [
      <><B>Backup, every day:</B> on the main computer double-click Backup.bat in C:\HMS and keep the copy on a pendrive. Settings → Backup does the same from inside HMS.</>,
      <><B>Update:</B> plug in the new pendrive and run “1 - MAIN COMPUTER (install or update)”. Patients, bills and stock are kept; a backup is made first.</>,
      <><B>Start fresh:</B> “Start Fresh (delete test data)” in C:\HMS removes all patients and bills and keeps staff, prices, medicines and bookmarks. It runs only when someone opens it and types START FRESH.</>,
      <><B>HMS does not open on another computer:</B> the main computer must be switched on and on the same network.</>,
    ],
  },
];

/** The workflows of HMS in one place, for the owner and branch admin to look things up. */
export function Help() {
  const { branch } = useParams();
  return (
    <div className="max-w-4xl">
      <PageHeader title="How HMS works" description="Who does what, and where. Press ? on any page for the keyboard shortcuts." />

      <Card className="mb-4">
        <CardHeader title="A patient’s day, start to finish" description="Each step is done by one person on one page." />
        <ol className="list-decimal space-y-1.5 py-4 pr-4 pl-9 text-sm text-muted">
          {PATIENT_DAY.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </Card>

      <Card className="mb-4 p-4">
        <div className="mb-2 text-sm font-semibold">Jump to</div>
        <div className="flex flex-wrap gap-2">
          {GUIDES.map((g) => (
            <a key={g.id} href={`#${g.id}`} className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-subtle">
              {g.title.split(':')[0]}
            </a>
          ))}
        </div>
      </Card>

      {GUIDES.map((g) => (
        <Card key={g.id} id={g.id} className="mb-4 scroll-mt-4">
          <CardHeader
            title={g.title}
            description={`Done by: ${g.who}`}
            action={
              g.page && (
                <Link to={`/${branch}/${g.page.path}`} className="shrink-0 text-xs font-medium text-brand hover:underline">
                  Open {g.page.label} →
                </Link>
              )
            }
          />
          <ol className="list-decimal space-y-1.5 py-4 pr-4 pl-9 text-sm text-muted">
            {g.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          {g.notes && (
            <ul className="list-disc space-y-1 border-t border-border py-3 pr-4 pl-9 text-xs text-muted">
              {g.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}
