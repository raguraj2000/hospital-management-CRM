// Reading a vendor's invoice file into purchase lines (shared helpers; no server involved).
import { describe, expect, it } from 'vitest';
import { findHeaderRow, guessColumns, matchMedicineName, parseAmount, parseCsv, parseExpiry, parsePack, readImportLines } from '@platform/shared';

describe('vendor invoice import', () => {
  it('reads expiries as vendors write them', () => {
    expect(parseExpiry('06/31')).toBe('2031-06-30'); // month/year: good until the end of that month
    expect(parseExpiry('02/28')).toBe('2028-02-29');
    expect(parseExpiry('2-2027')).toBe('2027-02-28');
    expect(parseExpiry('Jun-31')).toBe('2031-06-30');
    expect(parseExpiry('DEC 2027')).toBe('2027-12-31');
    expect(parseExpiry('15/08/2027')).toBe('2027-08-15');
    expect(parseExpiry('2027-08-15')).toBe('2027-08-15');
    expect(parseExpiry(new Date('2027-08-15T00:00:00Z'))).toBe('2027-08-15');
    for (const bad of ['', '13/27', 'soon', null]) expect(parseExpiry(bad)).toBeNull();
  });

  it('turns the packing column into units per pack', () => {
    for (const [pack, units] of [["10'S", 10], ['15,S', 15], ["100'S", 100], ['10S', 10], ['10 TAB', 10], ['1X10', 10], ['30', 30]] as const) expect(parsePack(pack)).toBe(units);
    for (const piece of ['2ML', '5GM', '90CM*', 'VIAL', '100GM', '', null]) expect(parsePack(piece)).toBe(1);
  });

  it('reads amounts with commas and the rupee sign', () => {
    expect(parseAmount('1,424.00')).toBe(1424);
    expect(parseAmount('₹ 71.20')).toBe(71.2);
    expect(parseAmount(5)).toBe(5);
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('Repl')).toBeNull();
  });

  // The layout of a printed invoice: vendor name on top, then the header, the items, a total.
  const FILE = [
    'CITY MEDICAL AGENCY,,,,,,,,,,',
    'GST INVOICE,,,No: 6262,,,,,,,',
    'HSN Code,Mfr,Batch,Expy,Product Name,Packg,M.R.P,Qty,F/R,Rate,Value,GST%',
    '30049079,ZEN,ZTAT2502,01/28,TELMIZEN-AM TAB,10\'S,89.00,20,,71.20,"1,424.00",5',
    '30049099,RIB,YT-250477C,07/27,"SL MOL, 650",15\'S,34.25,30,2,26.37,791.10,5',
    '30042019,ALK,26180400,03/29,XONE 1GM INJ,VIAL,67.07,15,1,51.10,766.50,5',
    ',,,,,,,,,,"2,981.60",',
  ].join('\r\n');

  it('finds the header under the address lines, guesses the columns and reads the item rows', () => {
    const rows = parseCsv(FILE);
    const header = findHeaderRow(rows);
    expect(header).toBe(2);
    const columns = guessColumns(rows[header]!);
    expect(columns).toEqual({ name: 4, batch: 2, expiry: 3, pack: 5, qty: 7, free: 8, rate: 9, mrp: 6, gst: 11 });
    expect(readImportLines(rows, header, columns)).toEqual([
      { row: 4, name: 'TELMIZEN-AM TAB', batchNo: 'ZTAT2502', expiryDate: '2028-01-31', expiryText: '01/28', packSize: 10, quantity: 20, freeQty: 0, rate: 71.2, mrp: 89, gstPercent: 5 },
      { row: 5, name: 'SL MOL, 650', batchNo: 'YT-250477C', expiryDate: '2027-07-31', expiryText: '07/27', packSize: 15, quantity: 30, freeQty: 2, rate: 26.37, mrp: 34.25, gstPercent: 5 },
      { row: 6, name: 'XONE 1GM INJ', batchNo: '26180400', expiryDate: '2029-03-31', expiryText: '03/29', packSize: 1, quantity: 15, freeQty: 1, rate: 51.1, mrp: 67.07, gstPercent: 5 },
    ]); // the total row has no name: not an item
  });

  it('reads tab-separated files and files without some columns', () => {
    const rows = parseCsv('Item\tBatch No\tExpiry\tQuantity\tPurchase Rate\nDolo 650\tD1\t12/2027\t5\t20');
    const columns = guessColumns(rows[0]!);
    expect(columns).toMatchObject({ name: 0, batch: 1, expiry: 2, qty: 3, rate: 4, pack: null, free: null, mrp: null, gst: null });
    expect(readImportLines(rows, 0, columns)[0]).toMatchObject({ name: 'Dolo 650', expiryDate: '2027-12-31', packSize: 1, quantity: 5, freeQty: 0, rate: 20, mrp: null, gstPercent: 0 });
    expect(findHeaderRow([['just', 'some', 'text']])).toBe(-1);
  });

  it('matches a line to a medicine only on the same name', () => {
    const meds = [
      { id: 1, name: 'Paracetamol', strength: '650 mg' },
      { id: 2, name: 'Telmizen-AM Tab', strength: null },
    ];
    expect(matchMedicineName('TELMIZEN-AM TAB', meds)?.id).toBe(2);
    expect(matchMedicineName('paracetamol 650mg', meds)?.id).toBe(1);
    expect(matchMedicineName('SL MOL 650', meds)).toBeNull();
  });
});
