import { Button } from '../../components/ui/Button';
import { TransactionList } from '../../components/TransactionList';
import { useTransactionHistory } from '../../hooks/useTransactions';
import type { TransactionWithItems } from '@shared/types';

export function VerlaufTransactions(): React.JSX.Element {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useTransactionHistory();
  const allTxns: TransactionWithItems[] = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div>
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
  );
}
