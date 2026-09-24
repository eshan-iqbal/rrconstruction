'use client';

import { useState, useEffect } from 'react';
import { DealerStore, subscribeToStore } from './dealerStore';

export function useDealerStore() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToStore(() => {
      setVersion((v) => v + 1);
    });
    return () => unsubscribe();
  }, []);

  return {
    version,
    store: DealerStore,
    workers: DealerStore.getWorkers(),
    customers: DealerStore.getCustomers(),
    sites: DealerStore.getSites(),
    metrics: DealerStore.getDashboardMetrics(),
    payments: DealerStore.getPayments()
  };
}
