import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@leen/api-client';

/**
 * `cookies.setAll` receives this shape. It is spelled out because
 * `CookieMethodsServer` is a union of two call signatures, so TypeScript cannot
 * infer the parameter for us.
 */
type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Server-side Supabase client for Server Components and Route Handlers.
 *
 * Server Components cannot set cookies, so the `setAll` write is allowed to
 * fail silently — the middleware refreshes the session on every request, which
 * is where the new cookie actually gets written.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component; the middleware handles the refresh.
          }
        },
      },
    },
  );
}
