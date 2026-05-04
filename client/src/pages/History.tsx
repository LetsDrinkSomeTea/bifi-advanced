import React from 'react';
import { useLocation } from 'wouter';
import { Layout } from '../components/layout/Layout';
import { PageHeader } from '../components/PageHeader';
import { TransactionList } from '../components/TransactionList';
import { Button } from '../components/ui/Button';
import { useTransactionHistory } from '../hooks/useTransactions';

import type { TransactionWithItems } from '@shared/types';

export function History(): React.JSX.Element {
  const [, navigate] = useLocation();
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useTransactionHistory();

  const allTxns: TransactionWithItems[] = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <Layout>
      <div className="px-4 py-4 max-w-lg mx-auto">
        <PageHeader
          title="Meine Käufe"
          onBack={() => {
            navigate('/profile');
          }}
        />

        <TransactionList transactions={allTxns} isLoading={isLoading} />

        {hasNextPage ? (
          <Button
            variant="outline"
            onClick={() => {
              void fetchNextPage();
            }}
            disabled={isFetchingNextPage}
            className="w-full mt-4 rounded-xl text-muted-foreground"
          >
            {isFetchingNextPage ? 'Laden…' : 'Mehr anzeigen'}
          </Button>
        ) : null}
      </div>
    </Layout>
  );
}
