import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { variantPriceMinor } from '@leen/lib';
import type { BagWeight, GrindOption } from '@leen/types';
import { supabase } from './supabase';
import { useSession } from './session';

const GUEST_CART_KEY = 'leen.cart.guest.v1';

/** Joined product detail, enough to render a cart row without another read. */
export interface CartProduct {
  id: number;
  nameEn: string;
  nameAr: string | null;
  basePriceMinor: number;
  imageUrl: string | null;
  merchantId: number;
  merchantNameEn: string;
  merchantNameAr: string | null;
  etaMinMinutes: number;
  etaMaxMinutes: number;
}

/** A cart line: the choice, plus enough product to render it. */
export interface CartLine {
  productId: number;
  qty: number;
  grind: GrindOption;
  weightG: BagWeight;
  /** Absent only for the instant between an optimistic add and its hydration. */
  product?: CartProduct;
}

interface CartValue {
  lines: CartLine[];
  count: number;
  /** Goods subtotal in halalas. Delivery, VAT and promo are priced server-side. */
  subtotalMinor: number;
  loading: boolean;
  /**
   * How many bags of this product are in the cart, summed across every grind
   * and bag size. A card asks "how much of this do I have", not "how much of
   * this exact configuration" — the same bean at 250 g whole-bean and 500 g
   * ground is two lines but one product to the customer.
   */
  qtyOf: (productId: number) => number;
  add: (productId: number, grind: GrindOption, weightG: BagWeight, qty?: number) => Promise<void>;
  setQty: (productId: number, grind: GrindOption, weightG: BagWeight, qty: number) => Promise<void>;
  remove: (productId: number, grind: GrindOption, weightG: BagWeight) => Promise<void>;
  clear: () => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartValue | null>(null);

/** Same key the database's unique index uses: product + grind + bag size. */
const lineKey = (productId: number, grind: string, weightG: number) =>
  `${productId}:${grind}:${weightG}`;

const MAX_QTY = 99;

type StoredGuestLine = Pick<CartLine, 'productId' | 'qty' | 'grind' | 'weightG'>;

const strip = (lines: CartLine[]): StoredGuestLine[] =>
  lines.map(({ productId, qty, grind, weightG }) => ({ productId, qty, grind, weightG }));

async function readGuestCart(): Promise<StoredGuestLine[]> {
  const raw = await AsyncStorage.getItem(GUEST_CART_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredGuestLine[]) : [];
  } catch {
    return [];
  }
}

/**
 * The cart, in two halves.
 *
 * Signed in, it is `public.cart_items` — so the basket survives a reinstall and
 * is the same basket `place_order` reads on the server. Signed out it lives in
 * AsyncStorage, because "Browse as a guest" is a real entry point and a guest
 * has no `user_id` for RLS to key on. On sign-in the guest cart merges into the
 * server cart and is dropped.
 *
 * **Every mutation is optimistic.** Local state moves first and the write goes
 * out behind it, because the alternative — await the write, then re-read the
 * cart, then re-read the products to hydrate it — is three round trips before
 * a "+" tap does anything visible, which felt broken on a phone. A failed write
 * resyncs from the server, so the optimism is never load-bearing.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const { userId, ready } = useSession();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Product detail keyed by id, so re-adding something already in the basket
   * needs no fetch at all. A ref rather than state: it feeds renders through
   * `lines`, and writing it must not itself cause one.
   */
  const productCache = useRef(new Map<number, CartProduct>());

  const cacheProducts = useCallback(async (ids: number[]) => {
    const missing = ids.filter((id) => !productCache.current.has(id));
    if (missing.length === 0) return;

    // One template literal, not a concatenation: supabase-js reads the row type
    // off the literal type of this string. See lib/queries.ts for the full note.
    const { data } = await supabase
      .from('products')
      .select(
        `
          id, name_en, name_ar, base_price_minor, image_url, merchant_id,
          merchants ( id, name_en, name_ar, eta_min_minutes, eta_max_minutes )
        `,
      )
      .in('id', missing);

    for (const p of data ?? []) {
      productCache.current.set(p.id, {
        id: p.id,
        nameEn: p.name_en,
        nameAr: p.name_ar,
        basePriceMinor: p.base_price_minor,
        imageUrl: p.image_url,
        merchantId: p.merchant_id,
        merchantNameEn: p.merchants?.name_en ?? '',
        merchantNameAr: p.merchants?.name_ar ?? null,
        etaMinMinutes: p.merchants?.eta_min_minutes ?? 35,
        etaMaxMinutes: p.merchants?.eta_max_minutes ?? 60,
      });
    }
  }, []);

  /** Attach cached product detail to a set of bare lines. */
  const dress = useCallback(
    (bare: StoredGuestLine[]): CartLine[] =>
      bare.map((l) => {
        const product = productCache.current.get(l.productId);
        return product ? { ...l, product } : l;
      }),
    [],
  );

  const hydrate = useCallback(
    async (bare: StoredGuestLine[]): Promise<CartLine[]> => {
      await cacheProducts(bare.map((l) => l.productId));
      return dress(bare);
    },
    [cacheProducts, dress],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (!userId) {
        setLines(await hydrate(await readGuestCart()));
        return;
      }
      const { data, error } = await supabase
        .from('cart_items')
        .select('product_id, qty, grind, weight_g')
        .order('created_at', { ascending: true });

      if (error) {
        setLines([]);
        return;
      }
      setLines(
        await hydrate(
          (data ?? []).map((r) => ({
            productId: r.product_id,
            qty: r.qty,
            grind: r.grind as GrindOption,
            weightG: r.weight_g as BagWeight,
          })),
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [userId, hydrate]);

  // On sign-in, fold the guest basket into the server one, then clear it so the
  // merge cannot happen twice.
  useEffect(() => {
    if (!ready) return;

    let cancelled = false;
    void (async () => {
      if (userId) {
        const guest = await readGuestCart();
        for (const line of guest) {
          // Read-then-write rather than an upsert: the qty has to be summed,
          // not replaced, and a guest cart is a handful of lines at most.
          const { data: existing } = await supabase
            .from('cart_items')
            .select('id, qty')
            .eq('product_id', line.productId)
            .eq('grind', line.grind)
            .eq('weight_g', line.weightG)
            .maybeSingle();

          if (existing) {
            await supabase
              .from('cart_items')
              .update({ qty: Math.min(MAX_QTY, existing.qty + line.qty) })
              .eq('id', existing.id);
          } else {
            await supabase.from('cart_items').insert({
              user_id: userId,
              product_id: line.productId,
              qty: line.qty,
              grind: line.grind,
              weight_g: line.weightG,
            });
          }
        }
        if (guest.length > 0) await AsyncStorage.removeItem(GUEST_CART_KEY);
      }
      if (!cancelled) await refresh();
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, userId, refresh]);

  /**
   * Apply a change to local state now, persist behind it, and resync only if
   * the write fails. `next` receives the current lines and returns the new set.
   *
   * `persist` is handed the signed-in id rather than closing over it, because
   * it only ever runs on the signed-in branch — passing it makes that an
   * invariant the type system checks instead of one each caller has to assert.
   */
  const optimistic = useCallback(
    async (
      next: (current: CartLine[]) => CartLine[],
      persist: (uid: string) => Promise<unknown>,
    ) => {
      let applied: CartLine[] = [];
      setLines((current) => {
        applied = next(current);
        return applied;
      });

      // A guest's basket lives only in storage, so that write *is* the persist.
      if (!userId) {
        await AsyncStorage.setItem(GUEST_CART_KEY, JSON.stringify(strip(applied)));
        return;
      }

      try {
        await persist(userId);
      } catch {
        await refresh();
      }
    },
    [userId, refresh],
  );

  const add: CartValue['add'] = useCallback(
    async (productId, grind, weightG, qty = 1) => {
      const key = lineKey(productId, grind, weightG);

      // Warm the cache first when this product is new to the basket, so the
      // optimistic line renders with its name and price rather than blank.
      if (!productCache.current.has(productId)) await cacheProducts([productId]);

      await optimistic(
        (current) => {
          const found = current.find((l) => lineKey(l.productId, l.grind, l.weightG) === key);
          const bare = found
            ? current.map((l) =>
                lineKey(l.productId, l.grind, l.weightG) === key
                  ? { ...l, qty: Math.min(MAX_QTY, l.qty + qty) }
                  : l,
              )
            : [...current, { productId, qty, grind, weightG }];
          return dress(strip(bare));
        },
        async (uid) => {
          const { data: existing } = await supabase
            .from('cart_items')
            .select('id, qty')
            .eq('product_id', productId)
            .eq('grind', grind)
            .eq('weight_g', weightG)
            .maybeSingle();

          if (existing) {
            const { error } = await supabase
              .from('cart_items')
              .update({ qty: Math.min(MAX_QTY, existing.qty + qty) })
              .eq('id', existing.id);
            if (error) throw error;
          } else {
            const { error } = await supabase.from('cart_items').insert({
              user_id: uid,
              product_id: productId,
              qty,
              grind,
              weight_g: weightG,
            });
            if (error) throw error;
          }
        },
      );
    },
    [optimistic, cacheProducts, dress],
  );

  const setQty: CartValue['setQty'] = useCallback(
    async (productId, grind, weightG, qty) => {
      const key = lineKey(productId, grind, weightG);
      const clamped = Math.min(MAX_QTY, qty);

      await optimistic(
        (current) =>
          clamped <= 0
            ? current.filter((l) => lineKey(l.productId, l.grind, l.weightG) !== key)
            : current.map((l) =>
                lineKey(l.productId, l.grind, l.weightG) === key ? { ...l, qty: clamped } : l,
              ),
        async () => {
          if (clamped <= 0) {
            const { error } = await supabase
              .from('cart_items')
              .delete()
              .eq('product_id', productId)
              .eq('grind', grind)
              .eq('weight_g', weightG);
            if (error) throw error;
            return;
          }
          const { error } = await supabase
            .from('cart_items')
            .update({ qty: clamped })
            .eq('product_id', productId)
            .eq('grind', grind)
            .eq('weight_g', weightG);
          if (error) throw error;
        },
      );
    },
    [optimistic],
  );

  const remove: CartValue['remove'] = useCallback(
    (productId, grind, weightG) => setQty(productId, grind, weightG, 0),
    [setQty],
  );

  const clear: CartValue['clear'] = useCallback(async () => {
    await optimistic(
      () => [],
      async (uid) => {
        const { error } = await supabase.from('cart_items').delete().eq('user_id', uid);
        if (error) throw error;
      },
    );
  }, [optimistic]);

  const value = useMemo<CartValue>(() => {
    const count = lines.reduce((n, l) => n + l.qty, 0);

    // Built once per cart change rather than scanned per card: the home grid
    // and the roastery page both call this for every tile they render.
    const byProduct = new Map<number, number>();
    for (const line of lines) {
      byProduct.set(line.productId, (byProduct.get(line.productId) ?? 0) + line.qty);
    }
    const qtyOf = (productId: number) => byProduct.get(productId) ?? 0;

    // Display figure only. The authoritative subtotal — and every other line of
    // the bill — comes back from `preview_cart_total` / `place_order`.
    const subtotalMinor = lines.reduce(
      (sum, l) =>
        sum + (l.product ? variantPriceMinor(l.product.basePriceMinor, l.weightG) * l.qty : 0),
      0,
    );

    return { lines, count, subtotalMinor, loading, qtyOf, add, setQty, remove, clear, refresh };
  }, [lines, loading, add, setQty, remove, clear, refresh]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
