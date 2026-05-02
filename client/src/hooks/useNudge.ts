import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface NudgePreset {
  key: string;
  text: string;
}

export function useNudgePresets() {
  return useQuery<NudgePreset[]>({
    queryKey: ['nudge', 'presets'],
    queryFn: () => api.get<NudgePreset[]>('/api/nudges/presets'),
    staleTime: Infinity,
  });
}

export function useSendNudge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      recipientId,
      preset,
      message,
    }: {
      recipientId: string;
      preset?: string;
      message?: string;
    }) => api.post(`/api/nudges/${recipientId}`, { preset, message }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}
