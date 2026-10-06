import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface SendTransferInput {
  toUserId: string;
  amount: number;
  note?: string;
}

export function useSendTransfer(): UseMutationResult<
  { txnId: string; amount: number },
  Error,
  SendTransferInput
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SendTransferInput) =>
      api.post<{ txnId: string; amount: number }>('/api/transfers', input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      void qc.invalidateQueries({ queryKey: ['transactions'] });
      void qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}
