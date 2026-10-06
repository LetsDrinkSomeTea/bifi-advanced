import { useSyncExternalStore } from 'react';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import type { User } from '@shared/types';
import { api } from '../lib/api';

// Replay requested from the profile page; client-only, the server flag stays set.
let replayOpen = false;
const listeners = new Set<() => void>();

function setReplayOpen(open: boolean): void {
  replayOpen = open;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function openOnboarding(): void {
  setReplayOpen(true);
}

export function useOnboardingReplay(): { isReplay: boolean; closeReplay: () => void } {
  const isReplay = useSyncExternalStore(subscribe, () => replayOpen);
  return { isReplay, closeReplay: () => setReplayOpen(false) };
}

export function useCompleteOnboarding(): UseMutationResult<
  { onboardingCompletedAt: string },
  Error,
  void
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ onboardingCompletedAt: string }>('/api/users/me/onboarding'),
    // Close immediately instead of waiting for the round trip.
    onMutate: () => {
      qc.setQueryData<User | null>(['auth', 'me'], (user) =>
        user ? { ...user, onboardingCompletedAt: new Date().toISOString() } : user,
      );
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}
