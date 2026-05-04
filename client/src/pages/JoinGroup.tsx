import { useEffect, useRef, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { Layout } from '../components/layout/Layout';
import { useJoinGroup } from '../hooks/useGroups';
import { useAuth } from '../hooks/useAuth';
import { type ApiError } from '../lib/api';
import { Button } from '../components/ui/Button';

export function JoinGroup(): React.JSX.Element {
  const { code } = useParams<{ code: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { mutateAsync: join } = useJoinGroup();
  const attempted = useRef(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user === null || !code || attempted.current) return;
    attempted.current = true;

    async function doJoin(): Promise<void> {
      try {
        const group = await join(code.toUpperCase());
        navigate(`/groups/${group.id}`, { replace: true });
      } catch (err: unknown) {
        const error = err as ApiError;
        const isAlreadyMember = error.code === 'ALREADY_MEMBER' || error.status === 409;

        if (isAlreadyMember) {
          navigate('/social', { replace: true });
        } else {
          setErrorMsg(error.message);
        }
      }
    }

    void doJoin();
  }, [user, code, join, navigate]);

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4">
        {errorMsg ? (
          <div className="text-center space-y-4">
            <p className="text-destructive font-medium">{errorMsg}</p>
            <Button
              onClick={() => {
                navigate('/social', { replace: true });
              }}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              Zurück zur Übersicht
            </Button>
          </div>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Gruppe wird beigetreten…</p>
          </>
        )}
      </div>
    </Layout>
  );
}
