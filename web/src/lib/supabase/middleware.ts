import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * セッション維持用 middleware ヘルパー。
 *
 * Next.js middleware から呼び出して、リクエストごとにセッションを refresh。
 * これがないと、トークン切れ後にユーザーが急にログアウト状態になる。
 *
 * 公式パターン：https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // セッション維持のための一回 fetch（getUser で確実に refresh）
  // 重要：getUser を必ず呼ぶこと。getSession だと cookie 検証されない。
  await supabase.auth.getUser();

  return supabaseResponse;
}
