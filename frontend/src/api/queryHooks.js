import { QueryClient, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const rawApiBase = import.meta.env.VITE_API_URL || '';
const API_BASE = rawApiBase.endsWith('/') ? rawApiBase.slice(0, -1) : rawApiBase;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes fresh cache
      refetchOnWindowFocus: true
    }
  }
});

const getAuthHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {})
});

export function useSchools(token) {
  return useQuery({
    queryKey: ['schools'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/schools`, {
        headers: getAuthHeaders(token)
      });
      if (!res.ok) throw new Error('Failed to fetch schools');
      const data = await res.json();
      return data.data || [];
    },
    enabled: !!token
  });
}

export function useStudents(schoolId, token) {
  return useQuery({
    queryKey: ['students', schoolId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/schools/${schoolId}/students`, {
        headers: getAuthHeaders(token)
      });
      if (!res.ok) throw new Error('Failed to fetch students');
      const data = await res.json();
      return data.data || [];
    },
    enabled: !!schoolId && !!token
  });
}

export function useInvoices(schoolId, token) {
  return useQuery({
    queryKey: ['invoices', schoolId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/schools/${schoolId}/invoices`, {
        headers: getAuthHeaders(token)
      });
      if (!res.ok) throw new Error('Failed to fetch invoices');
      const data = await res.json();
      return data.data || [];
    },
    enabled: !!schoolId && !!token
  });
}

export function useSuspenseItems(schoolId, token) {
  return useQuery({
    queryKey: ['suspense', schoolId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/schools/${schoolId}/suspense`, {
        headers: getAuthHeaders(token)
      });
      if (!res.ok) throw new Error('Failed to fetch suspense items');
      const data = await res.json();
      return data.data || [];
    },
    enabled: !!schoolId && !!token
  });
}

export function useFeeSchedules(schoolId, token) {
  return useQuery({
    queryKey: ['feeSchedules', schoolId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/schools/${schoolId}/fee-schedules`, {
        headers: getAuthHeaders(token)
      });
      if (!res.ok) throw new Error('Failed to fetch fee schedules');
      const data = await res.json();
      return data.data || [];
    },
    enabled: !!schoolId && !!token
  });
}


export function useSimulatePaymentMutation(token) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ accountNumber, amountNaira }) => {
      const res = await fetch(`${API_BASE}/api/webhooks/mock-payment`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          accountNumber,
          amountNaira,
          transactionReference: `TXN_SIM_${Date.now()}`
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Payment reconciliation failed');
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['suspense'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    }
  });
}
