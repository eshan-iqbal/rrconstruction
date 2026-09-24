'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Dealer {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  address: string | null;
  default_rate: number;
  is_active: number;
  created_at: string;
}

export interface Site {
  id: string;
  dealer_id: string;
  name: string;
  address: string | null;
  is_active: number;
  created_at: string;
}

export interface Worker {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  skill: string;
  default_wage: number;
  is_active: number;
  created_at: string;
}

export interface WorkAllocation {
  id: string;
  work_date: string;
  worker_id: string;
  dealer_id: string;
  site_id: string | null;
  attendance: 'FULL' | 'HALF' | 'ABSENT';
  units: number;
  selling_rate: number;
  wage_rate: number;
  charge_amount: number;
  wage_amount: number;
  notes: string | null;
  status: 'DRAFT' | 'CONFIRMED' | 'VOID';
  created_at: string;
  worker_name?: string;
  worker_code?: string;
  worker_skill?: string;
  dealer_name?: string;
  dealer_code?: string;
  site_name?: string;
}

export interface Payment {
  id: string;
  receipt_number: string;
  payment_date: string;
  party_type: 'DEALER' | 'WORKER';
  party_id: string;
  kind: 'DEALER_RECEIPT' | 'DEALER_REFUND' | 'WORKER_PAYOUT' | 'WORKER_ADVANCE' | 'WORKER_ADVANCE_RETURN';
  amount: number;
  method: 'CASH' | 'UPI' | 'BANK';
  reference: string | null;
  note: string | null;
  is_reversed: number;
  party_name?: string;
  party_code?: string;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  entry_date: string;
  party_type: 'DEALER' | 'WORKER';
  party_id: string;
  source_type: 'WORK' | 'PAYMENT' | 'ADVANCE' | 'REVERSAL';
  source_id: string;
  entry_type: 'CHARGE' | 'WAGE' | 'RECEIPT' | 'PAYOUT' | 'ADVANCE' | 'REVERSAL';
  description: string;
  debit: number;
  credit: number;
  party_name?: string;
  party_code?: string;
  created_at: string;
}

export interface Metrics {
  totalReceivable: number;
  totalWagePayable: number;
  totalAdvances: number;
  dealerCount: number;
  workerCount: number;
  allocationsCount: number;
}

export interface MultiWorkerItem {
  worker_id: string;
  attendance: 'FULL' | 'HALF';
  selling_rate: number;
  wage_rate: number;
  notes?: string;
}

export function useSqlStore() {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [allocations, setAllocations] = useState<WorkAllocation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalReceivable: 0,
    totalWagePayable: 0,
    totalAdvances: 0,
    dealerCount: 0,
    workerCount: 0,
    allocationsCount: 0
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/data', { cache: 'no-store' });
      const json = await res.json();
      if (json.success) {
        setDealers(json.dealers || []);
        setSites(json.sites || []);
        setWorkers(json.workers || []);
        setAllocations(json.allocations || []);
        setPayments(json.payments || []);
        setLedgerEntries(json.ledgerEntries || []);
        setMetrics(json.metrics || {
          totalReceivable: 0,
          totalWagePayable: 0,
          totalAdvances: 0,
          dealerCount: 0,
          workerCount: 0,
          allocationsCount: 0
        });
      }
    } catch (err) {
      console.error('Failed to fetch from Layerbase API:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addDealer = async (data: { name: string; phone?: string; address?: string; default_rate?: number }) => {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ADD_DEALER', data })
    });
    const json = await res.json();
    if (json.success) await refresh();
    return json;
  };

  const addSite = async (data: { dealer_id: string; name: string; address?: string }) => {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ADD_SITE', data })
    });
    const json = await res.json();
    if (json.success) await refresh();
    return json;
  };

  const addWorker = async (data: { name: string; phone?: string; skill?: string; default_wage?: number }) => {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ADD_WORKER', data })
    });
    const json = await res.json();
    if (json.success) await refresh();
    return json;
  };

  const sendWorker = async (data: {
    work_date?: string;
    worker_id: string;
    dealer_id: string;
    site_id?: string;
    attendance: 'FULL' | 'HALF' | 'ABSENT';
    selling_rate: number;
    wage_rate: number;
    notes?: string;
  }) => {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'SEND_WORKER', data })
    });
    const json = await res.json();
    if (json.success) await refresh();
    return json;
  };

  const sendMultiWorkers = async (data: {
    work_date: string;
    dealer_id: string;
    site_id?: string;
    notes?: string;
    workers: MultiWorkerItem[];
  }) => {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'SEND_MULTI_WORKERS', data })
    });
    const json = await res.json();
    if (json.success) await refresh();
    return json;
  };

  const recordPayment = async (data: {
    party_type: 'DEALER' | 'WORKER';
    party_id: string;
    kind: 'DEALER_RECEIPT' | 'DEALER_REFUND' | 'WORKER_PAYOUT' | 'WORKER_ADVANCE';
    payment_date?: string;
    amount: number;
    method?: 'CASH' | 'UPI' | 'BANK';
    reference?: string;
    note?: string;
  }) => {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'RECORD_PAYMENT', data })
    });
    const json = await res.json();
    if (json.success) await refresh();
    return json;
  };

  const editDealer = async (data: { id: string; name: string; phone?: string; address?: string; default_rate?: number; is_active?: number }) => {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'EDIT_DEALER', data })
    });
    const json = await res.json();
    if (json.success) await refresh();
    return json;
  };

  const deleteDealer = async (id: string) => {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'DELETE_DEALER', data: { id } })
    });
    const json = await res.json();
    if (json.success) await refresh();
    return json;
  };

  const editWorker = async (data: { id: string; name: string; phone?: string; skill: string; default_wage?: number; is_active?: number }) => {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'EDIT_WORKER', data })
    });
    const json = await res.json();
    if (json.success) await refresh();
    return json;
  };

  const deleteWorker = async (id: string) => {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'DELETE_WORKER', data: { id } })
    });
    const json = await res.json();
    if (json.success) await refresh();
    return json;
  };

  const editAllocation = async (data: {
    id: string;
    work_date: string;
    attendance: 'FULL' | 'HALF' | 'ABSENT';
    selling_rate: number;
    wage_rate: number;
    notes?: string;
    site_id?: string;
  }) => {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'EDIT_ALLOCATION', data })
    });
    const json = await res.json();
    if (json.success) await refresh();
    return json;
  };

  const deleteAllocation = async (id: string) => {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'DELETE_ALLOCATION', data: { id } })
    });
    const json = await res.json();
    if (json.success) await refresh();
    return json;
  };

  const editPayment = async (data: {
    id: string;
    payment_date: string;
    amount: number;
    method?: 'CASH' | 'UPI' | 'BANK';
    reference?: string;
    note?: string;
  }) => {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'EDIT_PAYMENT', data })
    });
    const json = await res.json();
    if (json.success) await refresh();
    return json;
  };

  const deletePayment = async (id: string) => {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'DELETE_PAYMENT', data: { id } })
    });
    const json = await res.json();
    if (json.success) await refresh();
    return json;
  };

  const clearData = async () => {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'CLEAR_DATA' })
    });
    const json = await res.json();
    if (json.success) await refresh();
    return json;
  };

  const seedCleanSamples = async () => {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'SEED_CLEAN_SAMPLES' })
    });
    const json = await res.json();
    if (json.success) await refresh();
    return json;
  };

  return {
    dealers,
    sites,
    workers,
    allocations,
    payments,
    ledgerEntries,
    metrics,
    loading,
    refresh,
    addDealer,
    editDealer,
    deleteDealer,
    addSite,
    addWorker,
    editWorker,
    deleteWorker,
    sendWorker,
    sendMultiWorkers,
    editAllocation,
    deleteAllocation,
    recordPayment,
    editPayment,
    deletePayment,
    clearData,
    seedCleanSamples
  };
}
