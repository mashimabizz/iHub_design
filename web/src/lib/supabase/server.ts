import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * サーバー（Server Component / Route Handler / Server Action）用の Supabase クライアント。
 *
 * Cookie 経由でセッションを管理。getAll / setAll を実装することで
 * トークンの自動リフレッシュをサポート。
 *
 * 使い方：
 *   import { createClient } from "@/lib/supabase/server";
 *   const supabase = await createClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 *
 * 重要：リクエストごとに新しいクライアントを作成すること（インスタンス共有禁止）。
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component から呼ばれた場合は cookie 書込ができない（middleware で処理）。
            // 中で auth 操作する場合は middleware が refresh を担当する。
          }
        },
      },
    },
  );
}

/**
 * Service Role Key を使った特権クライアント。
 * RLS をバイパスするので、サーバー側のみで限定的に使用すること。
 *
 * 使用シーン：
 *   - 管理用 cron 処理
 *   - dispute 仲裁時のデータ操作
 *   - 通報処理
 *
 * 通常の業務処理では createClient() を使うこと（RLS で保護）。
 */
export function createServiceRoleClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // service role は cookie 不使用
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
