import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { formatAddressShort } from '@leen/lib';
import type { Tables } from '@leen/api-client';
import { supabase } from './supabase';
import { useSession } from './session';

type Address = Tables<'addresses'>;

interface AddressValue {
  addresses: Address[];
  /** The address orders go to. The default row — there is exactly one. */
  selected: Address | null;
  /** "Al Olaya, Riyadh", or null when nothing is saved yet. */
  selectedLabel: string | null;
  loading: boolean;
  select: (addressId: number) => Promise<void>;
  refresh: () => Promise<void>;
}

const AddressContext = createContext<AddressValue>({
  addresses: [],
  selected: null,
  selectedLabel: null,
  loading: true,
  select: async () => {},
  refresh: async () => {},
});

/**
 * The customer's saved addresses, and which one is current.
 *
 * "Selected" is the `is_default` row rather than a separate notion: the database
 * already enforces exactly one default per customer with a partial unique index,
 * and having a second, app-only idea of "current" would be a second thing to
 * keep in step for no benefit.
 *
 * Lifted into a provider because the home header and checkout both need it, and
 * both were otherwise going to read it independently on every mount.
 */
export function AddressProvider({ children }: { children: ReactNode }) {
  const { userId, ready } = useSession();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setAddresses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await supabase
        .from('addresses')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      setAddresses(data ?? []);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (ready) void refresh();
  }, [ready, refresh]);

  const select = useCallback(
    async (addressId: number) => {
      if (!userId) return;
      // Optimistic: the header should change the instant it is tapped.
      setAddresses((current) => current.map((a) => ({ ...a, is_default: a.id === addressId })));
      // Clear the old default first — the partial unique index allows only one,
      // so setting the new one before clearing the old collides with it.
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('is_default', true);
      await supabase.from('addresses').update({ is_default: true }).eq('id', addressId);
      await refresh();
    },
    [userId, refresh],
  );

  const value = useMemo<AddressValue>(() => {
    const selected = addresses.find((a) => a.is_default) ?? addresses[0] ?? null;
    return {
      addresses,
      selected,
      selectedLabel: selected ? formatAddressShort(selected) : null,
      loading,
      select,
      refresh,
    };
  }, [addresses, loading, select, refresh]);

  return <AddressContext.Provider value={value}>{children}</AddressContext.Provider>;
}

export function useAddresses(): AddressValue {
  return useContext(AddressContext);
}
