import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { variantPriceMinor } from '@leen/lib';
import type { BagWeight, GrindOption } from '@leen/types';
import { supabase } from './supabase';
import { useSession } from './session';

const GUEST_CART_KEY = 'leen.cart.guest.v1';

/** A cart line as the UI needs it: the choice plus enough product to render it. */
export interface CartLine {
  productId: number;
  qty: number;
  grind: GrindOption;
  weightG: BagWeight;
  /** Joined product/merchant detail. Absent until the product row loads. */
  product?: {
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
  };
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

type StoredGuestLine = Pick<CartLine, 'productId' | 'qty' | 'grind' | 'weightG'>;

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

async function writeGuestCart(lines: StoredGuestLine[]): Promise<void> {
  await AsyncStorage.setItem(GUEST_CART_KEY, JSON.stringify(lines));
}

/**
 * The cart, in two halves.
 *
 * Signed in, it is `public.cart_items` — so the basket survives a reinstall and
 * is the same basket `place_order` reads on the server. Signed out it lives in
 * AsyncStorage, because "Browse as a guest" is a real entry point in the design
 * and a guest has no `user_id` for RLS to key on.
 *
 * On sign-in the guest cart is merged into the server cart and then dropped:
 * whatever the customer put in the basket before creating an account is still
 * there afterwards.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const { userId, ready } = useSession();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);

  /** Attach product + merchant detail to a set of bare lines. */
  const hydrate = useCallback(async (bare: StoredGuestLine[]): Promise<CartLine[]> => {
    if (bare.length === 0) return [];
    const ids = [...new Set(bare.map((l) => l.productId))];

    // One template literal, not a concatenation: supabase-js reads the row type
    // off the literal type of this string. See lib/queries.ts for the full note.
    const { data, error } = await supabase
      .from('products')
      .select(
        `
          id, name_en, name_ar, base_price_minor, image_url, merchant_id,
          merchants ( id, name_en, name_ar, eta_min_minutes, eta_max_minutes )
        `,
      )
      .in('id', ids);

    if (error || !data) return bare;

    const byId = new Map(data.map((p) => [p.id, p]));
    return bare.map((l) => {
      const p = byId.get(l.productId);
      if (!p) return l;
      const m = p.merchants;
      return {
        ...l,
        product: {
          id: p.id,
          nameEn: p.name_en,
          nameAr: p.name_ar,
          basePriceMinor: p.base_price_minor,
          imageUrl: p.image_url,
          merchantId: p.merchant_id,
          merchantNameEn: m?.name_en ?? '',
          merchantNameAr: m?.name_ar ?? null,
          etaMinMinutes: m?.eta_min_minutes ?? 35,
          etaMaxMinutes: m?.eta_max_minutes ?? 60,
        },
      };
    });
  }, []);

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
        if (guest.length > 0) {
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
                .update({ qty: Math.min(99, existing.qty + line.qty) })
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
          await AsyncStorage.removeItem(GUEST_CART_KEY);
        }
      }
      if (!cancelled) await refresh();
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, userId, refresh]);

  const add: CartValue['add'] = useCallback(
    async (productId, grind, weightG, qty = 1) => {
      if (!userId) {
        const guest = await readGuestCart();
        const key = lineKey(productId, grind, weightG);
        const found = guest.find((l) => lineKey(l.productId, l.grind, l.weightG) === key);
        const next = found
          ? guest.map((l) =>
              lineKey(l.productId, l.grind, l.weightG) === key
                ? { ...l, qty: Math.min(99, l.qty + qty) }
                : l,
            )
          : [...guest, { productId, qty, grind, weightG }];
        await writeGuestCart(next);
        setLines(await hydrate(next));
        return;
      }

      const { data: existing } = await supabase
        .from('cart_items')
        .select('id, qty')
        .eq('product_id', productId)
        .eq('grind', grind)
        .eq('weight_g', weightG)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('cart_items')
          .update({ qty: Math.min(99, existing.qty + qty) })
          .eq('id', existing.id);
      } else {
        await supabase.from('cart_items').insert({
          user_id: userId,
          product_id: productId,
          qty,
          grind,
          weight_g: weightG,
        });
      }
      await refresh();
    },
    [userId, hydrate, refresh],
  );

  const setQty: CartValue['setQty'] = useCallback(
    async (productId, grind, weightG, qty) => {
      if (qty <= 0) {
        await removeLine(productId, grind, weightG);
        return;
      }
      if (!userId) {
        const guest = await readGuestCart();
        const key = lineKey(productId, grind, weightG);
        const next = guest.map((l) =>
          lineKey(l.productId, l.grind, l.weightG) === key ? { ...l, qty } : l,
        );
        await writeGuestCart(next);
        setLines(await hydrate(next));
        return;
      }
      await supabase
        .from('cart_items')
        .update({ qty })
        .eq('product_id', productId)
        .eq('grind', grind)
        .eq('weight_g', weightG);
      await refresh();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, hydrate, refresh],
  );

  async function removeLine(productId: number, grind: GrindOption, weightG: BagWeight) {
    if (!userId) {
      const guest = await readGuestCart();
      const key = lineKey(productId, grind, weightG);
      const next = guest.filter((l) => lineKey(l.productId, l.grind, l.weightG) !== key);
      await writeGuestCart(next);
      setLines(await hydrate(next));
      return;
    }
    await supabase
      .from('cart_items')
      .delete()
      .eq('product_id', productId)
      .eq('grind', grind)
      .eq('weight_g', weightG);
    await refresh();
  }

  const remove: CartValue['remove'] = useCallback(
    (productId, grind, weightG) => removeLine(productId, grind, weightG),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, hydrate, refresh],
  );

  const clear: CartValue['clear'] = useCallback(async () => {
    if (!userId) {
      await AsyncStorage.removeItem(GUEST_CART_KEY);
      setLines([]);
      return;
    }
    await supabase.from('cart_items').delete().eq('user_id', userId);
    setLines([]);
  }, [userId]);

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
