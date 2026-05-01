import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * メール認証リンクのコールバック処理
 *
 * Supabase が送信した確認メールのリンクをクリックすると：
 *   https://ihub.tokyo/auth/callback?code=xxx
 * のようにアクセスされる。code を session に交換してユーザーをログイン状態にする。
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // 認証成功 → 元の遷移先 or ホームへ
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // エラー時はエラーページへ
  return NextResponse.redirect(`${origin}/auth/auth-error`);
}
