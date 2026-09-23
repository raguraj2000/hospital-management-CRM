import { openDatabase } from '../src/db/connection.js';
import { createDispenseService } from '../src/services/dispense-service.js';

// Standalone worker process: opens its own connection to the shared db file
// and performs one dispense call after receiving a 'go' message from the
// parent, so multiple worker processes race to dispense simultaneously.
// This proves the BEGIN IMMEDIATE lock actually serializes writers across
// OS processes -- a same-process test would serialize on the Node event
// loop regardless of locking and prove nothing (see plan §7).

const [, , dbPath, medicineIdStr, patientIdStr, visitEventIdStr, staffUserIdStr, quantityStr] = process.argv;
const medicineId = Number(medicineIdStr);
const patientId = Number(patientIdStr);
const visitEventId = Number(visitEventIdStr);
const staffUserId = Number(staffUserIdStr);
const quantity = Number(quantityStr);

const db = openDatabase({ filePath: dbPath });
const { dispense } = createDispenseService(db);

process.send?.({ type: 'ready' });

process.on('message', (msg: any) => {
  if (msg?.type !== 'go') return;
  try {
    const allocations = dispense({
      patientId,
      medicineId,
      quantity,
      visitEventId,
      staffUserId,
      staffRole: 'pharmacist',
    });
    const taken = allocations.reduce((sum, a) => sum + a.quantityTaken, 0);
    process.send?.({ type: 'result', success: true, taken });
  } catch (err: any) {
    process.send?.({ type: 'result', success: false, error: err.message });
  } finally {
    db.close();
    process.exit(0);
  }
});
