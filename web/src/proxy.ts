import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js 16 Proxy（旧 Middleware）。
 * リクエストごとにセッションを更新し、Supabase Auth トークンを refresh。
 *
 * Next.js 16 で `middleware` が `proxy` にリネーム。機能は同じ。
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 以下を除く全リクエストにマッチ：
     * - _next/static（静的ファイル）
     * - _next/image（画像最適化）
     * - favicon.ico、画像、フォント等の静的アセット
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|otf|eot)$).*)",
  ],
};
