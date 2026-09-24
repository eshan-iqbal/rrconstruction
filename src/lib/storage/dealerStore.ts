import {
  Worker,
  Customer,
  Site,
  WorkRecord,
  LedgerAccount,
  PostingBatch,
  LedgerEntry,
  Payment,
  DashboardMetrics,
  AccountStatement,
  StatementRow,
  PaymentKind,
  PaymentMethod,
  AttendanceType
} from '@/types';

const STORAGE_KEY = 'labour_dealer_ledger_db_v1';

export interface DealerDatabase {
  workers: Worker[];
  customers: Customer[];
  sites: Site[];
  workRecords: WorkRecord[];
  accounts: LedgerAccount[];
  batches: PostingBatch[];
  entries: LedgerEntry[];
  payments: Payment[];
  organization: {
    name: string;
    dealerName: string;
    phone: string;
    currency: string;
    cutoverDate: string;
  };
}

// Generate realistic mock date helpers
const getTodayStr = () => new Date().toISOString().split('T')[0];
const getPastDateStr = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

export const INITIAL_SEED_DATA: DealerDatabase = {
  organization: {
    name: 'Shree Ganesh Labour Supply & Contractor Services',
    dealerName: 'Eshan Iqbal (Labour Master)',
    phone: '+91 98765 43210',
    currency: 'INR',
    cutoverDate: '2026-09-01'
  },
  workers: [
    { id: 'w-1', code: 'WRK-001', name: 'Raju Sharma', phone: '+91 98111 22334', skill: 'Head Mason (Rajmistri)', defaultWage: 750, isActive: true, createdAt: '2026-09-01' },
    { id: 'w-2', code: 'WRK-002', name: 'Suresh Kumar', phone: '+91 98222 33445', skill: 'Assistant Mason', defaultWage: 650, isActive: true, createdAt: '2026-09-01' },
    { id: 'w-3', code: 'WRK-003', name: 'Bablu Yadav', phone: '+91 98333 44556', skill: 'General Helper (Beldar)', defaultWage: 550, isActive: true, createdAt: '2026-09-01' },
    { id: 'w-4', code: 'WRK-004', name: 'Ramesh Chauhan', phone: '+91 98444 55667', skill: 'General Helper (Beldar)', defaultWage: 550, isActive: true, createdAt: '2026-09-01' },
    { id: 'w-5', code: 'WRK-005', name: 'Dilip Verma', phone: '+91 98555 66778', skill: 'Barbender / Saria Worker', defaultWage: 700, isActive: true, createdAt: '2026-09-01' },
    { id: 'w-6', code: 'WRK-006', name: 'Manoj Paswan', phone: '+91 98666 77889', skill: 'Tiles & Marble Mason', defaultWage: 800, isActive: true, createdAt: '2026-09-05' },
    { id: 'w-7', code: 'WRK-007', name: 'Sunil Sahni', phone: '+91 98777 88990', skill: 'General Helper (Beldar)', defaultWage: 550, isActive: true, createdAt: '2026-09-05' },
    { id: 'w-8', code: 'WRK-008', name: 'Vikram Thakur', phone: '+91 98888 99001', skill: 'Shuttering Carpenter', defaultWage: 750, isActive: true, createdAt: '2026-09-10' }
  ],
  customers: [
    { id: 'c-1', code: 'CUST-001', name: 'Apex Builders & Infra Ltd', phone: '+91 99000 11122', address: 'Plot 42, Knowledge Park, Greater Noida', isActive: true, createdAt: '2026-09-01' },
    { id: 'c-2', code: 'CUST-002', name: 'Metro Line Contractor (Shreeji Infra)', phone: '+91 99111 22233', address: 'Metro Pillar 140-160 Site Office, Gurugram', isActive: true, createdAt: '2026-09-01' },
    { id: 'c-3', code: 'CUST-003', name: 'GreenCity Luxury Villas', phone: '+91 99222 33344', address: 'Sector 150, Expressway, Noida', isActive: true, createdAt: '2026-09-05' },
    { id: 'c-4', code: 'CUST-004', name: 'Royal Commercial Mall & Plazas', phone: '+91 99333 44455', address: 'Golf Course Extension Road', isActive: true, createdAt: '2026-09-10' }
  ],
  sites: [
    { id: 's-1', customerId: 'c-1', name: 'Tower A & B Finishing', address: 'Knowledge Park Gate 2', isActive: true },
    { id: 's-2', customerId: 'c-1', name: 'Basement Parking Slab', address: 'Knowledge Park Basement Block', isActive: true },
    { id: 's-3', customerId: 'c-2', name: 'Pillar Girder Casting Site', address: 'Metro Pier 148', isActive: true },
    { id: 's-4', customerId: 'c-3', name: 'Villa #12 to #20 Brickwork', address: 'GreenCity Phase 1', isActive: true },
    { id: 's-5', customerId: 'c-4', name: 'Food Court Flooring & Tilework', address: 'Royal Mall 3rd Floor', isActive: true }
  ],
  accounts: [
    { id: 'acc-c-1', kind: 'CUSTOMER', customerId: 'c-1' },
    { id: 'acc-c-2', kind: 'CUSTOMER', customerId: 'c-2' },
    { id: 'acc-c-3', kind: 'CUSTOMER', customerId: 'c-3' },
    { id: 'acc-c-4', kind: 'CUSTOMER', customerId: 'c-4' },
    { id: 'acc-w-1', kind: 'WORKER', workerId: 'w-1' },
    { id: 'acc-w-2', kind: 'WORKER', workerId: 'w-2' },
    { id: 'acc-w-3', kind: 'WORKER', workerId: 'w-3' },
    { id: 'acc-w-4', kind: 'WORKER', workerId: 'w-4' },
    { id: 'acc-w-5', kind: 'WORKER', workerId: 'w-5' },
    { id: 'acc-w-6', kind: 'WORKER', workerId: 'w-6' },
    { id: 'acc-w-7', kind: 'WORKER', workerId: 'w-7' },
    { id: 'acc-w-8', kind: 'WORKER', workerId: 'w-8' }
  ],
  batches: [
    {
      id: 'batch-init-1',
      kind: 'WORK',
      sourceKey: 'work:init-1',
      workId: 'rec-init-1',
      effectiveDate: getPastDateStr(2),
      createdAt: getPastDateStr(2) + 'T18:00:00Z'
    },
    {
      id: 'batch-init-2',
      kind: 'WORK',
      sourceKey: 'work:init-2',
      workId: 'rec-init-2',
      effectiveDate: getPastDateStr(2),
      createdAt: getPastDateStr(2) + 'T18:00:00Z'
    },
    {
      id: 'batch-pay-1',
      kind: 'PAYMENT',
      sourceKey: 'payment:pay-1',
      effectiveDate: getPastDateStr(1),
      createdAt: getPastDateStr(1) + 'T11:00:00Z'
    },
    {
      id: 'batch-pay-2',
      kind: 'PAYMENT',
      sourceKey: 'payment:pay-2',
      effectiveDate: getPastDateStr(1),
      createdAt: getPastDateStr(1) + 'T19:30:00Z'
    }
  ],
  entries: [
    // Work 1 entries (Apex Builders + Raju Sharma)
    {
      id: 'ent-1',
      batchId: 'batch-init-1',
      accountId: 'acc-c-1',
      accountKind: 'CUSTOMER',
      partyId: 'c-1',
      partyName: 'Apex Builders & Infra Ltd',
      entryType: 'CHARGE',
      amount: 1050, // Selling rate 1050 * 1.0
      description: 'Labour Supply: Raju Sharma (Full Day at Tower A & B Finishing)',
      effectiveDate: getPastDateStr(2),
      createdAt: getPastDateStr(2) + 'T18:00:00Z'
    },
    {
      id: 'ent-2',
      batchId: 'batch-init-1',
      accountId: 'acc-w-1',
      accountKind: 'WORKER',
      partyId: 'w-1',
      partyName: 'Raju Sharma',
      entryType: 'WAGE',
      amount: 750, // Wage rate 750 * 1.0
      description: 'Wage Earned: Full Day at Apex Builders (Tower A & B Finishing)',
      effectiveDate: getPastDateStr(2),
      createdAt: getPastDateStr(2) + 'T18:00:00Z'
    },
    // Work 2 entries (Metro Line Contractor + Bablu Yadav)
    {
      id: 'ent-3',
      batchId: 'batch-init-2',
      accountId: 'acc-c-2',
      accountKind: 'CUSTOMER',
      partyId: 'c-2',
      partyName: 'Metro Line Contractor (Shreeji Infra)',
      entryType: 'CHARGE',
      amount: 800, // Selling rate 800 * 1.0
      description: 'Labour Supply: Bablu Yadav (Full Day at Pillar Girder Casting Site)',
      effectiveDate: getPastDateStr(2),
      createdAt: getPastDateStr(2) + 'T18:00:00Z'
    },
    {
      id: 'ent-4',
      batchId: 'batch-init-2',
      accountId: 'acc-w-3',
      accountKind: 'WORKER',
      partyId: 'w-3',
      partyName: 'Bablu Yadav',
      entryType: 'WAGE',
      amount: 550, // Wage rate 550 * 1.0
      description: 'Wage Earned: Full Day at Metro Line (Pillar Girder Casting)',
      effectiveDate: getPastDateStr(2),
      createdAt: getPastDateStr(2) + 'T18:00:00Z'
    },
    // Customer receipt payment (Apex paid 1000)
    {
      id: 'ent-5',
      batchId: 'batch-pay-1',
      accountId: 'acc-c-1',
      accountKind: 'CUSTOMER',
      partyId: 'c-1',
      partyName: 'Apex Builders & Infra Ltd',
      entryType: 'RECEIPT',
      amount: -1000, // Reduces customer receivable
      description: 'Customer Payment Received via UPI (Ref: UPI-9842103)',
      effectiveDate: getPastDateStr(1),
      createdAt: getPastDateStr(1) + 'T11:00:00Z'
    },
    // Worker cash advance to Bablu Yadav (Advance 1000)
    {
      id: 'ent-6',
      batchId: 'batch-pay-2',
      accountId: 'acc-w-3',
      accountKind: 'WORKER',
      partyId: 'w-3',
      partyName: 'Bablu Yadav',
      entryType: 'ADVANCE',
      amount: -1000, // Payout/advance reduces wage payable balance (makes it negative advance)
      description: 'Worker Cash Advance (Festival/Urgent Requirement)',
      effectiveDate: getPastDateStr(1),
      createdAt: getPastDateStr(1) + 'T19:30:00Z'
    }
  ],
  payments: [
    {
      id: 'pay-1',
      accountId: 'acc-c-1',
      partyId: 'c-1',
      partyName: 'Apex Builders & Infra Ltd',
      batchId: 'batch-pay-1',
      kind: 'CUSTOMER_RECEIPT',
      paymentDate: getPastDateStr(1),
      amount: 1000,
      method: 'UPI',
      reference: 'UPI-9842103',
      receiptNumber: 'REC-20260922-001',
      note: 'Part payment received for Tower A work',
      createdAt: getPastDateStr(1) + 'T11:00:00Z'
    },
    {
      id: 'pay-2',
      accountId: 'acc-w-3',
      partyId: 'w-3',
      partyName: 'Bablu Yadav',
      batchId: 'batch-pay-2',
      kind: 'WORKER_ADVANCE',
      paymentDate: getPastDateStr(1),
      amount: 1000,
      method: 'CASH',
      reference: 'CASH-VOUCHER-12',
      receiptNumber: 'PAY-20260922-002',
      note: 'Advance for festival home visit',
      createdAt: getPastDateStr(1) + 'T19:30:00Z'
    }
  ],
  workRecords: [
    {
      id: 'rec-init-1',
      workerId: 'w-1',
      customerId: 'c-1',
      siteId: 's-1',
      workDate: getPastDateStr(2),
      status: 'CONFIRMED',
      attendance: 'FULL',
      units: 1.0,
      sellingRate: 1050,
      wageRate: 750,
      chargeAmount: 1050,
      wageAmount: 750,
      version: 1,
      notes: 'Plaster finishing completed on 4th floor',
      confirmedAt: getPastDateStr(2) + 'T18:00:00Z',
      createdAt: getPastDateStr(2) + 'T08:00:00Z',
      updatedAt: getPastDateStr(2) + 'T18:00:00Z'
    },
    {
      id: 'rec-init-2',
      workerId: 'w-3',
      customerId: 'c-2',
      siteId: 's-3',
      workDate: getPastDateStr(2),
      status: 'CONFIRMED',
      attendance: 'FULL',
      units: 1.0,
      sellingRate: 800,
      wageRate: 550,
      chargeAmount: 800,
      wageAmount: 550,
      version: 1,
      notes: 'Heavy concrete shifting helper duty',
      confirmedAt: getPastDateStr(2) + 'T18:00:00Z',
      createdAt: getPastDateStr(2) + 'T08:00:00Z',
      updatedAt: getPastDateStr(2) + 'T18:00:00Z'
    },
    // Today's sample drafts ready for the dealer to review and confirm!
    {
      id: 'rec-today-1',
      workerId: 'w-1',
      customerId: 'c-1',
      siteId: 's-1',
      workDate: getTodayStr(),
      status: 'DRAFT',
      attendance: 'FULL',
      units: 1.0,
      sellingRate: 1050,
      wageRate: 750,
      chargeAmount: 1050,
      wageAmount: 750,
      version: 1,
      notes: 'Masonry work on Block B',
      createdAt: getTodayStr() + 'T08:00:00Z',
      updatedAt: getTodayStr() + 'T08:00:00Z'
    },
    {
      id: 'rec-today-2',
      workerId: 'w-2',
      customerId: 'c-1',
      siteId: 's-1',
      workDate: getTodayStr(),
      status: 'DRAFT',
      attendance: 'FULL',
      units: 1.0,
      sellingRate: 900,
      wageRate: 650,
      chargeAmount: 900,
      wageAmount: 650,
      version: 1,
      notes: 'Assisting Raju Sharma',
      createdAt: getTodayStr() + 'T08:00:00Z',
      updatedAt: getTodayStr() + 'T08:00:00Z'
    },
    {
      id: 'rec-today-3',
      workerId: 'w-3',
      customerId: 'c-2',
      siteId: 's-3',
      workDate: getTodayStr(),
      status: 'DRAFT',
      attendance: 'HALF',
      units: 0.5,
      sellingRate: 800,
      wageRate: 550,
      chargeAmount: 400,
      wageAmount: 275,
      version: 1,
      notes: 'Half day morning shift',
      createdAt: getTodayStr() + 'T08:00:00Z',
      updatedAt: getTodayStr() + 'T08:00:00Z'
    },
    {
      id: 'rec-today-4',
      workerId: 'w-5',
      customerId: 'c-3',
      siteId: 's-4',
      workDate: getTodayStr(),
      status: 'DRAFT',
      attendance: 'FULL',
      units: 1.0,
      sellingRate: 950,
      wageRate: 700,
      chargeAmount: 950,
      wageAmount: 700,
      version: 1,
      notes: 'Saria binding in Villa 15',
      createdAt: getTodayStr() + 'T08:00:00Z',
      updatedAt: getTodayStr() + 'T08:00:00Z'
    }
  ]
};

// Event listener mechanism for UI reactivity
type Listener = () => void;
const listeners: Set<Listener> = new Set();

export const subscribeToStore = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const notifyListeners = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('Error in store listener', e);
    }
  });
};

export class DealerStore {
  private static getDB(): DealerDatabase {
    if (typeof window === 'undefined') {
      return INITIAL_SEED_DATA;
    }
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SEED_DATA));
        return INITIAL_SEED_DATA;
      }
      return JSON.parse(data);
    } catch (e) {
      console.warn('Failed to parse localStorage, resetting to initial seed data', e);
      return INITIAL_SEED_DATA;
    }
  }

  private static saveDB(db: DealerDatabase): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      notifyListeners();
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }

  public static resetToSeed(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SEED_DATA));
    notifyListeners();
  }

  public static exportData(): string {
    const db = this.getDB();
    return JSON.stringify(db, null, 2);
  }

  public static importData(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && Array.isArray(parsed.workers) && Array.isArray(parsed.customers)) {
        this.saveDB(parsed);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Import error', e);
      return false;
    }
  }

  // --- WORKERS ---
  public static getWorkers(): Worker[] {
    return this.getDB().workers;
  }

  public static getWorkerById(id: string): Worker | undefined {
    return this.getDB().workers.find((w) => w.id === id);
  }

  public static createWorker(worker: Omit<Worker, 'id' | 'code' | 'createdAt'>): Worker {
    const db = this.getDB();
    const count = db.workers.length + 1;
    const newWorker: Worker = {
      ...worker,
      id: `w-${Date.now()}`,
      code: `WRK-${String(count).padStart(3, '0')}`,
      createdAt: new Date().toISOString()
    };
    db.workers.push(newWorker);
    // ensure ledger account exists
    db.accounts.push({
      id: `acc-w-${newWorker.id}`,
      kind: 'WORKER',
      workerId: newWorker.id
    });
    this.saveDB(db);
    return newWorker;
  }

  public static updateWorker(id: string, updates: Partial<Worker>): Worker | null {
    const db = this.getDB();
    const index = db.workers.findIndex((w) => w.id === id);
    if (index === -1) return null;
    db.workers[index] = { ...db.workers[index], ...updates };
    this.saveDB(db);
    return db.workers[index];
  }

  // --- CUSTOMERS & SITES ---
  public static getCustomers(): Customer[] {
    return this.getDB().customers;
  }

  public static getCustomerById(id: string): Customer | undefined {
    return this.getDB().customers.find((c) => c.id === id);
  }

  public static createCustomer(customer: Omit<Customer, 'id' | 'code' | 'createdAt'>): Customer {
    const db = this.getDB();
    const count = db.customers.length + 1;
    const newCust: Customer = {
      ...customer,
      id: `c-${Date.now()}`,
      code: `CUST-${String(count).padStart(3, '0')}`,
      createdAt: new Date().toISOString()
    };
    db.customers.push(newCust);
    // ensure ledger account exists
    db.accounts.push({
      id: `acc-c-${newCust.id}`,
      kind: 'CUSTOMER',
      customerId: newCust.id
    });
    this.saveDB(db);
    return newCust;
  }

  public static updateCustomer(id: string, updates: Partial<Customer>): Customer | null {
    const db = this.getDB();
    const index = db.customers.findIndex((c) => c.id === id);
    if (index === -1) return null;
    db.customers[index] = { ...db.customers[index], ...updates };
    this.saveDB(db);
    return db.customers[index];
  }

  public static getSites(): Site[] {
    return this.getDB().sites;
  }

  public static getSitesByCustomerId(customerId: string): Site[] {
    return this.getDB().sites.filter((s) => s.customerId === customerId && s.isActive);
  }

  public static createSite(site: Omit<Site, 'id'>): Site {
    const db = this.getDB();
    const newSite: Site = {
      ...site,
      id: `s-${Date.now()}`
    };
    db.sites.push(newSite);
    this.saveDB(db);
    return newSite;
  }

  // --- WORK RECORDS & ATTENDANCE ---
  public static getWorkRecords(date?: string): WorkRecord[] {
    const db = this.getDB();
    if (!date) return db.workRecords;
    return db.workRecords.filter((r) => r.workDate === date);
  }

  public static saveWorkDraft(draft: {
    id?: string;
    workerId: string;
    customerId: string;
    siteId: string;
    workDate: string;
    attendance: AttendanceType;
    sellingRate: number;
    wageRate: number;
    notes?: string;
  }): WorkRecord {
    const db = this.getDB();
    const units = draft.attendance === 'FULL' ? 1.0 : draft.attendance === 'HALF' ? 0.5 : 0.0;
    const chargeAmount = Math.round(draft.sellingRate * units * 100) / 100;
    const wageAmount = Math.round(draft.wageRate * units * 100) / 100;

    // Check if record exists for this worker on this date
    const existingIndex = db.workRecords.findIndex(
      (r) => (draft.id ? r.id === draft.id : r.workerId === draft.workerId && r.workDate === draft.workDate && r.status !== 'VOID')
    );

    let savedRecord: WorkRecord;

    if (existingIndex >= 0) {
      const existing = db.workRecords[existingIndex];
      if (existing.status === 'CONFIRMED') {
        throw new Error('Cannot edit a CONFIRMED work record directly. Use the Correction/Reversal workflow.');
      }
      savedRecord = {
        ...existing,
        ...draft,
        units,
        chargeAmount,
        wageAmount,
        version: existing.version + 1,
        updatedAt: new Date().toISOString()
      };
      db.workRecords[existingIndex] = savedRecord;
    } else {
      savedRecord = {
        id: draft.id || `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        workerId: draft.workerId,
        customerId: draft.customerId,
        siteId: draft.siteId,
        workDate: draft.workDate,
        status: 'DRAFT',
        attendance: draft.attendance,
        units,
        sellingRate: draft.sellingRate,
        wageRate: draft.wageRate,
        chargeAmount,
        wageAmount,
        version: 1,
        notes: draft.notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.workRecords.push(savedRecord);
    }

    this.saveDB(db);
    return savedRecord;
  }

  public static deleteDraft(id: string): boolean {
    const db = this.getDB();
    const record = db.workRecords.find((r) => r.id === id);
    if (!record) return false;
    if (record.status === 'CONFIRMED') {
      throw new Error('Cannot delete a CONFIRMED work record. It is immutable in the ledger.');
    }
    db.workRecords = db.workRecords.filter((r) => r.id !== id);
    this.saveDB(db);
    return true;
  }

  // --- BATCH CONFIRM & POST TO IMMUTABLE SUBLEDGER ---
  public static confirmWorkRecords(recordIds: string[]): { confirmedCount: number; chargeTotal: number; wageTotal: number } {
    const db = this.getDB();
    let confirmedCount = 0;
    let chargeTotal = 0;
    let wageTotal = 0;

    const now = new Date().toISOString();

    for (const id of recordIds) {
      const rec = db.workRecords.find((r) => r.id === id);
      if (!rec || rec.status !== 'DRAFT') continue;

      const worker = db.workers.find((w) => w.id === rec.workerId);
      const customer = db.customers.find((c) => c.id === rec.customerId);
      const site = db.sites.find((s) => s.id === rec.siteId);

      if (!worker || !customer) continue;

      // Update work record status
      rec.status = 'CONFIRMED';
      rec.confirmedAt = now;
      rec.updatedAt = now;
      confirmedCount++;

      // If Absent, no financial ledger entries are needed
      if (rec.attendance === 'ABSENT' || rec.units === 0) {
        continue;
      }

      chargeTotal += rec.chargeAmount;
      wageTotal += rec.wageAmount;

      // Create Posting Batch
      const batchId = `batch-work-${rec.id}`;
      const batch: PostingBatch = {
        id: batchId,
        kind: 'WORK',
        sourceKey: `work:${rec.id}`,
        workId: rec.id,
        effectiveDate: rec.workDate,
        createdAt: now
      };
      db.batches.push(batch);

      // 1. Post Customer CHARGE (Receivable increased)
      let custAcc = db.accounts.find((a) => a.kind === 'CUSTOMER' && a.customerId === customer.id);
      if (!custAcc) {
        custAcc = { id: `acc-c-${customer.id}`, kind: 'CUSTOMER', customerId: customer.id };
        db.accounts.push(custAcc);
      }

      const custEntry: LedgerEntry = {
        id: `ent-c-${rec.id}`,
        batchId,
        accountId: custAcc.id,
        accountKind: 'CUSTOMER',
        partyId: customer.id,
        partyName: customer.name,
        entryType: 'CHARGE',
        amount: rec.chargeAmount, // Positive = increases receivable
        description: `Labour Supply: ${worker.name} (${rec.attendance} Day @ ${site?.name || 'Site'})`,
        effectiveDate: rec.workDate,
        createdAt: now
      };
      db.entries.push(custEntry);

      // 2. Post Worker WAGE (Wages Payable increased)
      let wrkAcc = db.accounts.find((a) => a.kind === 'WORKER' && a.workerId === worker.id);
      if (!wrkAcc) {
        wrkAcc = { id: `acc-w-${worker.id}`, kind: 'WORKER', workerId: worker.id };
        db.accounts.push(wrkAcc);
      }

      const wrkEntry: LedgerEntry = {
        id: `ent-w-${rec.id}`,
        batchId,
        accountId: wrkAcc.id,
        accountKind: 'WORKER',
        partyId: worker.id,
        partyName: worker.name,
        entryType: 'WAGE',
        amount: rec.wageAmount, // Positive = increases wage payable to worker
        description: `Wage Earned: ${rec.attendance} Day at ${customer.name} (${site?.name || 'Site'})`,
        effectiveDate: rec.workDate,
        createdAt: now
      };
      db.entries.push(wrkEntry);
    }

    this.saveDB(db);
    return { confirmedCount, chargeTotal, wageTotal };
  }

  // --- CORRECTION / REVERSAL FOR WORK RECORD ---
  public static correctWorkRecord(
    originalWorkId: string,
    reason: string,
    replacementDraft?: {
      attendance: AttendanceType;
      sellingRate: number;
      wageRate: number;
      notes?: string;
    }
  ): { reversalBatchId: string; replacementWorkId?: string } {
    const db = this.getDB();
    const original = db.workRecords.find((r) => r.id === originalWorkId);
    if (!original) throw new Error('Work record not found');
    if (original.status !== 'CONFIRMED') throw new Error('Only confirmed records can be reversed');

    const originalBatch = db.batches.find((b) => b.workId === originalWorkId && b.kind === 'WORK');
    const now = new Date().toISOString();

    // Mark original as VOID
    original.status = 'VOID';
    original.updatedAt = now;

    // Create REVERSAL Batch if original had financial entries
    const reversalBatchId = `batch-rev-${Date.now()}`;
    if (originalBatch) {
      const revBatch: PostingBatch = {
        id: reversalBatchId,
        kind: 'REVERSAL',
        sourceKey: `reversal:${originalBatch.id}`,
        workId: originalWorkId,
        effectiveDate: getTodayStr(),
        reversalOf: originalBatch.id,
        reason,
        createdAt: now
      };
      db.batches.push(revBatch);

      // Find original entries and post exact opposites
      const originalEntries = db.entries.filter((e) => e.batchId === originalBatch.id);
      for (const origEntry of originalEntries) {
        const revEntry: LedgerEntry = {
          id: `ent-rev-${origEntry.id}`,
          batchId: reversalBatchId,
          accountId: origEntry.accountId,
          accountKind: origEntry.accountKind,
          partyId: origEntry.partyId,
          partyName: origEntry.partyName,
          entryType: 'REVERSAL',
          amount: -origEntry.amount, // Negate original amount
          reversalOf: origEntry.id,
          description: `REVERSAL: ${origEntry.description} (Reason: ${reason})`,
          effectiveDate: getTodayStr(),
          createdAt: now
        };
        db.entries.push(revEntry);
      }
    }

    let replacementWorkId: string | undefined;

    // If replacement provided, create and confirm new work record
    if (replacementDraft) {
      const units = replacementDraft.attendance === 'FULL' ? 1.0 : replacementDraft.attendance === 'HALF' ? 0.5 : 0.0;
      const chargeAmount = Math.round(replacementDraft.sellingRate * units * 100) / 100;
      const wageAmount = Math.round(replacementDraft.wageRate * units * 100) / 100;

      const replacementRecord: WorkRecord = {
        id: `rec-${Date.now()}-corr`,
        workerId: original.workerId,
        customerId: original.customerId,
        siteId: original.siteId,
        workDate: original.workDate, // Keep original historical work date
        status: 'DRAFT',
        attendance: replacementDraft.attendance,
        units,
        sellingRate: replacementDraft.sellingRate,
        wageRate: replacementDraft.wageRate,
        chargeAmount,
        wageAmount,
        version: original.version + 1,
        replacesWorkId: original.id,
        notes: `Correction for ${original.id}: ${replacementDraft.notes || reason}`,
        createdAt: now,
        updatedAt: now
      };
      db.workRecords.push(replacementRecord);
      this.saveDB(db);

      // Auto-confirm the corrected replacement record
      this.confirmWorkRecords([replacementRecord.id]);
      replacementWorkId = replacementRecord.id;
    } else {
      this.saveDB(db);
    }

    return { reversalBatchId, replacementWorkId };
  }

  // --- PAYMENTS & CASH ADVANCES ---
  public static recordPayment(data: {
    partyId: string;
    accountKind: 'CUSTOMER' | 'WORKER';
    kind: PaymentKind;
    paymentDate: string;
    amount: number;
    method: PaymentMethod;
    reference?: string;
    note?: string;
  }): Payment {
    const db = this.getDB();
    const now = new Date().toISOString();
    const paymentId = `pay-${Date.now()}`;
    const batchId = `batch-${paymentId}`;
    const receiptNumber = `RCP-${Date.now().toString().slice(-6)}`;

    let partyName = '';
    let accountId = '';

    if (data.accountKind === 'CUSTOMER') {
      const customer = db.customers.find((c) => c.id === data.partyId);
      if (!customer) throw new Error('Customer not found');
      partyName = customer.name;
      let acc = db.accounts.find((a) => a.kind === 'CUSTOMER' && a.customerId === customer.id);
      if (!acc) {
        acc = { id: `acc-c-${customer.id}`, kind: 'CUSTOMER', customerId: customer.id };
        db.accounts.push(acc);
      }
      accountId = acc.id;
    } else {
      const worker = db.workers.find((w) => w.id === data.partyId);
      if (!worker) throw new Error('Worker not found');
      partyName = worker.name;
      let acc = db.accounts.find((a) => a.kind === 'WORKER' && a.workerId === worker.id);
      if (!acc) {
        acc = { id: `acc-w-${worker.id}`, kind: 'WORKER', workerId: worker.id };
        db.accounts.push(acc);
      }
      accountId = acc.id;
    }

    // 1. Create Batch
    const batch: PostingBatch = {
      id: batchId,
      kind: 'PAYMENT',
      sourceKey: `payment:${paymentId}`,
      effectiveDate: data.paymentDate,
      createdAt: now
    };
    db.batches.push(batch);

    // 2. Determine signed entry amount based on posting map
    let entryAmount = 0;
    let entryType = data.kind as unknown as LedgerEntry['entryType'];
    let description = '';

    if (data.kind === 'CUSTOMER_RECEIPT') {
      entryAmount = -Math.abs(data.amount); // Reduces customer receivable
      entryType = 'RECEIPT';
      description = `Customer Payment Received via ${data.method} (Ref: ${data.reference || 'N/A'})`;
    } else if (data.kind === 'CUSTOMER_REFUND') {
      entryAmount = Math.abs(data.amount); // Increases customer balance
      entryType = 'REFUND';
      description = `Customer Refund Issued via ${data.method} (Ref: ${data.reference || 'N/A'})`;
    } else if (data.kind === 'WORKER_PAYOUT') {
      entryAmount = -Math.abs(data.amount); // Reduces wage payable
      entryType = 'PAYOUT';
      description = `Worker Wage Payout via ${data.method} (Ref: ${data.reference || 'N/A'})`;
    } else if (data.kind === 'WORKER_ADVANCE') {
      entryAmount = -Math.abs(data.amount); // Cash given to worker; reduces payable balance (creates advance balance)
      entryType = 'ADVANCE';
      description = `Cash Advance Given to Worker via ${data.method} (Ref: ${data.reference || 'N/A'})`;
    } else if (data.kind === 'WORKER_ADVANCE_REPAYMENT') {
      entryAmount = Math.abs(data.amount); // Worker returns cash; offsets negative advance
      entryType = 'ADVANCE_REPAYMENT';
      description = `Worker Advance Repaid by Worker via ${data.method} (Ref: ${data.reference || 'N/A'})`;
    }

    const entry: LedgerEntry = {
      id: `ent-${paymentId}`,
      batchId,
      accountId,
      accountKind: data.accountKind,
      partyId: data.partyId,
      partyName,
      entryType,
      amount: entryAmount,
      description: `${description} - ${data.note || ''}`,
      effectiveDate: data.paymentDate,
      createdAt: now
    };
    db.entries.push(entry);

    const payment: Payment = {
      id: paymentId,
      accountId,
      partyId: data.partyId,
      partyName,
      batchId,
      kind: data.kind,
      paymentDate: data.paymentDate,
      amount: data.amount,
      method: data.method,
      reference: data.reference,
      receiptNumber,
      note: data.note,
      createdAt: now
    };
    db.payments.push(payment);

    this.saveDB(db);
    return payment;
  }

  // --- REVERSE PAYMENT ---
  public static reversePayment(paymentId: string, reason: string): boolean {
    const db = this.getDB();
    const payment = db.payments.find((p) => p.id === paymentId);
    if (!payment || payment.isReversed) return false;

    const originalBatch = db.batches.find((b) => b.id === payment.batchId);
    if (!originalBatch) return false;

    const now = new Date().toISOString();
    const reversalBatchId = `batch-rev-pay-${Date.now()}`;

    // Mark payment as reversed
    payment.isReversed = true;
    payment.reversedByBatchId = reversalBatchId;

    // Create Reversal Batch
    const revBatch: PostingBatch = {
      id: reversalBatchId,
      kind: 'REVERSAL',
      sourceKey: `reversal:${originalBatch.id}`,
      effectiveDate: getTodayStr(),
      reversalOf: originalBatch.id,
      reason,
      createdAt: now
    };
    db.batches.push(revBatch);

    // Negate original entries
    const origEntries = db.entries.filter((e) => e.batchId === originalBatch.id);
    for (const oe of origEntries) {
      const revEntry: LedgerEntry = {
        id: `ent-rev-${oe.id}`,
        batchId: reversalBatchId,
        accountId: oe.accountId,
        accountKind: oe.accountKind,
        partyId: oe.partyId,
        partyName: oe.partyName,
        entryType: 'REVERSAL',
        amount: -oe.amount,
        reversalOf: oe.id,
        description: `REVERSAL: ${oe.description} (Reason: ${reason})`,
        effectiveDate: getTodayStr(),
        createdAt: now
      };
      db.entries.push(revEntry);
    }

    this.saveDB(db);
    return true;
  }

  public static getPayments(): Payment[] {
    return [...this.getDB().payments].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
  }

  // --- BALANCES & STATEMENTS ---
  public static getCustomerBalance(customerId: string): { balance: number; receivable: number; credit: number } {
    const db = this.getDB();
    const entries = db.entries.filter((e) => e.accountKind === 'CUSTOMER' && e.partyId === customerId);
    const balance = entries.reduce((sum, e) => sum + e.amount, 0);
    return {
      balance,
      receivable: balance > 0 ? balance : 0,
      credit: balance < 0 ? Math.abs(balance) : 0
    };
  }

  public static getWorkerBalance(workerId: string): { balance: number; payable: number; advance: number } {
    const db = this.getDB();
    const entries = db.entries.filter((e) => e.accountKind === 'WORKER' && e.partyId === workerId);
    // Positive balance = Dealer owes Worker wages. Negative balance = Worker owes Dealer advance.
    const balance = entries.reduce((sum, e) => sum + e.amount, 0);
    return {
      balance,
      payable: balance > 0 ? balance : 0,
      advance: balance < 0 ? Math.abs(balance) : 0
    };
  }

  public static getAccountStatement(
    partyId: string,
    kind: 'CUSTOMER' | 'WORKER',
    fromDate?: string,
    toDate?: string
  ): AccountStatement {
    const db = this.getDB();
    const account = db.accounts.find((a) => a.kind === kind && (kind === 'CUSTOMER' ? a.customerId === partyId : a.workerId === partyId)) || {
      id: `acc-${partyId}`,
      kind,
      customerId: kind === 'CUSTOMER' ? partyId : undefined,
      workerId: kind === 'WORKER' ? partyId : undefined
    };

    let partyName = '';
    let partyCode = '';
    if (kind === 'CUSTOMER') {
      const cust = db.customers.find((c) => c.id === partyId);
      partyName = cust?.name || 'Customer';
      partyCode = cust?.code || '';
    } else {
      const wrk = db.workers.find((w) => w.id === partyId);
      partyName = wrk?.name || 'Worker';
      partyCode = wrk?.code || '';
    }

    const allPartyEntries = db.entries
      .filter((e) => e.accountKind === kind && e.partyId === partyId)
      .sort((a, b) => {
        const d = a.effectiveDate.localeCompare(b.effectiveDate);
        if (d !== 0) return d;
        return a.createdAt.localeCompare(b.createdAt);
      });

    const startDate = fromDate || '2000-01-01';
    const endDate = toDate || '2099-12-31';

    // Calculate opening balance before startDate
    const openingEntries = allPartyEntries.filter((e) => e.effectiveDate < startDate);
    const openingBalance = openingEntries.reduce((sum, e) => sum + e.amount, 0);

    // Scoped entries
    const scopedEntries = allPartyEntries.filter((e) => e.effectiveDate >= startDate && e.effectiveDate <= endDate);

    let currentBalance = openingBalance;
    let totalDebit = 0;
    let totalCredit = 0;

    const rows: StatementRow[] = scopedEntries.map((e) => {
      currentBalance += e.amount;
      const isPositive = e.amount > 0;
      const debit = isPositive ? e.amount : 0;
      const credit = !isPositive ? Math.abs(e.amount) : 0;

      totalDebit += debit;
      totalCredit += credit;

      return {
        id: e.id,
        batchId: e.batchId,
        date: e.effectiveDate,
        description: e.description,
        entryType: e.entryType,
        debit,
        credit,
        amount: e.amount,
        runningBalance: currentBalance,
        isReversal: e.entryType === 'REVERSAL'
      };
    });

    return {
      account,
      partyName,
      partyCode,
      openingBalance,
      closingBalance: currentBalance,
      totalDebit,
      totalCredit,
      rows
    };
  }

  // --- DASHBOARD METRICS ---
  public static getDashboardMetrics(): DashboardMetrics {
    const db = this.getDB();
    const today = getTodayStr();

    let totalReceivableFromDealers = 0;
    let totalCustomerCredits = 0;
    let totalWagesPayableToWorkers = 0;
    let totalAdvancesWithWorkers = 0;

    for (const cust of db.customers) {
      const { receivable, credit } = this.getCustomerBalance(cust.id);
      totalReceivableFromDealers += receivable;
      totalCustomerCredits += credit;
    }

    for (const wrk of db.workers) {
      const { payable, advance } = this.getWorkerBalance(wrk.id);
      totalWagesPayableToWorkers += payable;
      totalAdvancesWithWorkers += advance;
    }

    // Today's work records
    const todayRecords = db.workRecords.filter((r) => r.workDate === today && r.status !== 'VOID');
    const activeWorkers = new Set(todayRecords.filter((r) => r.attendance !== 'ABSENT').map((r) => r.workerId)).size;
    const fullDays = todayRecords.filter((r) => r.attendance === 'FULL').length;
    const halfDays = todayRecords.filter((r) => r.attendance === 'HALF').length;
    const totalBilledAmount = todayRecords.reduce((sum, r) => sum + r.chargeAmount, 0);
    const totalWageCost = todayRecords.reduce((sum, r) => sum + r.wageAmount, 0);
    const estimatedProfit = totalBilledAmount - totalWageCost;

    const netDealerPosition = totalReceivableFromDealers - totalWagesPayableToWorkers + totalAdvancesWithWorkers;

    return {
      totalReceivableFromDealers,
      totalWagesPayableToWorkers,
      totalAdvancesWithWorkers,
      totalCustomerCredits,
      netDealerPosition,
      todayDeployment: {
        totalWorkersActive: activeWorkers,
        fullDays,
        halfDays,
        totalBilledAmount,
        totalWageCost,
        estimatedProfit
      }
    };
  }
}
