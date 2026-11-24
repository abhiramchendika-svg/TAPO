import { describe, expect, it } from '@jest/globals';
import {
  categorise,
  cleanMerchant,
  CsvImportError,
  EXAMPLE_CSV,
  importStatement,
  maskLongNumbers,
  parseAmount,
  parseCsv,
  parseStatementDate,
} from '../csvImport';

describe('parseCsv', () => {
  it('handles quotes, embedded commas and CRLF', () => {
    expect(parseCsv('a,b\r\n"x, y","say ""hi"""\r\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"'],
    ]);
  });

  it('detects semicolon delimiters', () => {
    expect(parseCsv('Date;Amount\n01/11/2026;10')).toEqual([
      ['Date', 'Amount'],
      ['01/11/2026', '10'],
    ]);
  });
});

describe('value parsing', () => {
  it('parses Indian amounts', () => {
    expect(parseAmount('₹1,23,456.70')).toBe(123456.7);
    expect(parseAmount('Rs. 450')).toBe(450);
    expect(parseAmount('(250.00)')).toBe(-250);
    expect(parseAmount('1,200 Cr')).toBe(-1200);
    expect(Number.isNaN(parseAmount('abc'))).toBe(true);
  });

  it('parses day-first and ISO dates and rejects impossible ones', () => {
    expect(parseStatementDate('05/11/2026')?.getMonth()).toBe(10);
    expect(parseStatementDate('05-Nov-26')?.getDate()).toBe(5);
    expect(parseStatementDate('2026-11-05')?.getFullYear()).toBe(2026);
    expect(parseStatementDate('31/02/2026')).toBeNull();
  });
});

describe('privacy', () => {
  it('masks card, account and UPI reference numbers to the last four digits', () => {
    expect(maskLongNumbers('POS 4111 1111 1111 1234 DMART')).toBe('POS ••1234 DMART');
    expect(maskLongNumbers('UPI/412345678901/SWIGGY')).toBe('UPI/••8901/SWIGGY');
    expect(maskLongNumbers('Order 12345')).toBe('Order 12345');
    expect(maskLongNumbers('POS 4111XXXXXXXX1234 DMART')).toBe('POS ••1234 DMART');
    expect(maskLongNumbers('CARD XXXX XXXX XXXX 9876 PAYMENT')).toBe('CARD ••9876 PAYMENT');
    expect(maskLongNumbers('TAXI fare')).toBe('TAXI fare');
  });

  it('extracts a readable merchant from UPI narrations', () => {
    expect(cleanMerchant('UPI/DR/412345678901/SWIGGY/YESB/payment')).toBe('SWIGGY');
  });

  it('never keeps a long number from any column', () => {
    const csv = 'Date,Description,Amount,Card Number\n01/11/2026,Shop 4111111111111111,100,4111111111111111';
    const { rows } = importStatement(csv);
    expect(JSON.stringify(rows)).not.toMatch(/\d{9,}/);
  });
});

describe('categorise', () => {
  it('maps common Indian merchants to categories', () => {
    expect(categorise('ZOMATO ORDER')).toBe('dining');
    expect(categorise('BLINKIT')).toBe('groceries');
    expect(categorise('HPCL FUEL')).toBe('fuel');
    expect(categorise('IRCTC')).toBe('travel');
    expect(categorise('FLIPKART')).toBe('online');
    expect(categorise('AIRTEL POSTPAID')).toBe('utilities');
    expect(categorise('BOOKMYSHOW')).toBe('entertainment');
    expect(categorise('RANDOM SHOP')).toBe('other');
    expect(categorise('train tickets')).toBe('travel');
    expect(categorise('cab to airport')).toBe('travel');
    expect(categorise('Friday dinner')).toBe('dining');
    expect(categorise('busy store')).toBe('other');
  });
});

describe('importStatement', () => {
  it('imports the example statement, skipping the salary credit', () => {
    const r = importStatement(EXAMPLE_CSV);
    expect(r.rows).toHaveLength(8);
    expect(r.skipped.credits).toBe(1);
    expect(r.rows[0]).toMatchObject({ merchant: 'SWIGGY', amountRupees: 486, category: 'dining' });
  });

  it('finds the header below account info lines', () => {
    const csv = 'Account statement\nName,Demo\n\nTxn Date,Narration,Withdrawal Amt.,Deposit Amt.\n01/11/2026,ZEPTO,250,';
    expect(importStatement(csv).rows).toHaveLength(1);
  });

  it('treats negatives as spends when the file uses that convention', () => {
    const csv = 'Date,Description,Amount\n01/11/2026,Amazon,-500\n02/11/2026,Refund,200\n03/11/2026,Swiggy,-300';
    const r = importStatement(csv);
    expect(r.rows.map((x) => x.amountRupees)).toEqual([500, 300]);
    expect(r.skipped.credits).toBe(1);
  });

  it('honours a Dr/Cr type column', () => {
    const csv = 'Date,Description,Amount,Dr/Cr\n01/11/2026,Shop,100,Dr\n02/11/2026,Refund,50,Cr';
    const r = importStatement(csv);
    expect(r.rows).toHaveLength(1);
    expect(r.skipped.credits).toBe(1);
  });

  it('skips duplicates of transactions already in the wallet', () => {
    const first = importStatement(EXAMPLE_CSV);
    const again = importStatement(EXAMPLE_CSV, first.rows);
    expect(again.rows).toHaveLength(0);
    expect(again.skipped.duplicates).toBe(8);
  });

  it('explains when the columns are missing', () => {
    expect(() => importStatement('foo,bar\n1,2')).toThrow(CsvImportError);
  });
});
