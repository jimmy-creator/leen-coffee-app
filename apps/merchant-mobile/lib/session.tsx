import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface SessionValue {
  session: Session | null;
  userId: string | null;
  /** False until the persisted session has been read back from storage. */
  ready: boolean;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue>({
  session: null,
  userId: null,
  ready: false,
  signOut: async () => {},
});

/**
 * Tracks the Supabase auth session.
 *
 * `ready` matters more than it looks: on a cold start the session is read
 * asynchronously out of AsyncStorage, so for the first frame or two the user
 * looks signed out. Routing on that would bounce a signed-in customer back to
 * onboarding on every launch.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      session,
      userId: session?.user.id ?? null,
      ready,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, ready],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  return useContext(SessionContext);
}
