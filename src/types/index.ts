export type AttendanceType = 'FULL' | 'HALF' | 'ABSENT';
export type WorkStatus = 'DRAFT' | 'CONFIRMED' | 'VOID';

export type PaymentKind = 
  | 'CUSTOMER_RECEIPT' 
  | 'CUSTOMER_REFUND' 
  | 'WORKER_PAYOUT' 
  | 'WORKER_ADVANCE' 
  | 'WORKER_ADVANCE_REPAYMENT';

export type PaymentMethod = 'CASH' | 'BANK' | 'UPI';

export type EntryType = 
  | 'CHARGE' 
  | 'WAGE' 
  | 'RECEIPT' 
  | 'PAYOUT' 
  | 'REFUND' 
  | 'ADVANCE'
  | 'ADVANCE_REPAYMENT' 
  | 'OPENING' 
  | 'ADJUSTMENT' 
  | 'REVERSAL';

export interface Worker {
  id: string;
  code: string;
  name: string;
  phone: string;
  skill: string;
  defaultWage: number;
  isActive: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string;
  address: string;
  isActive: boolean;
  createdAt: string;
}

export interface Site {
  id: string;
  customerId: string;
  name: string;
  address: string;
  isActive: boolean;
}

export interface WorkRecord {
  id: string;
  workerId: string;
  customerId: string;
  siteId: string;
  workDate: string; // YYYY-MM-DD
  status: WorkStatus;
  attendance: AttendanceType;
  units: number; // 1.00, 0.50, 0.00
  sellingRate: number; // Rate charged to customer dealer
  wageRate: number; // Wage payable to worker
  chargeAmount: number; // sellingRate * units
  wageAmount: number; // wageRate * units
  version: number;
  replacesWorkId?: string;
  notes?: string;
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerAccount {
  id: string;
  kind: 'CUSTOMER' | 'WORKER';
  customerId?: string;
  workerId?: string;
}

export interface PostingBatch {
  id: string;
  kind: 'WORK' | 'PAYMENT' | 'OPENING' | 'ADJUSTMENT' | 'REVERSAL';
  sourceKey: string;
  workId?: string;
  effectiveDate: string;
  reversalOf?: string;
  reason?: string;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  batchId: string;
  accountId: string;
  accountKind: 'CUSTOMER' | 'WORKER';
  partyId: string; // customerId or workerId
  partyName: string;
  entryType: EntryType;
  amount: number; // Signed amount: positive increases balance due, negative decreases
  reversalOf?: string;
  description: string;
  effectiveDate: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  accountId: string;
  partyId: string; // customerId or workerId
  partyName: string;
  batchId: string;
  kind: PaymentKind;
  paymentDate: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  receiptNumber: string;
  note?: string;
  isReversed?: boolean;
  reversedByBatchId?: string;
  createdAt: string;
}

export interface StatementRow {
  id: string;
  batchId: string;
  date: string;
  description: string;
  entryType: EntryType;
  debit: number; // Increase in receivable / payout to worker
  credit: number; // Receipt from customer / wage earned by worker
  amount: number;
  runningBalance: number;
  isReversal: boolean;
}

export interface AccountStatement {
  account: LedgerAccount;
  partyName: string;
  partyCode: string;
  openingBalance: number;
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
  rows: StatementRow[];
}

export interface DashboardMetrics {
  totalReceivableFromDealers: number;
  totalWagesPayableToWorkers: number;
  totalAdvancesWithWorkers: number;
  totalCustomerCredits: number;
  netDealerPosition: number;
  todayDeployment: {
    totalWorkersActive: number;
    fullDays: number;
    halfDays: number;
    totalBilledAmount: number;
    totalWageCost: number;
    estimatedProfit: number;
  };
}
