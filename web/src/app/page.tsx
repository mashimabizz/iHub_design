import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  // Supabase 接続テスト：auth.getUser()（テーブル無しでも OK）
  const supabase = await createClient();
  const { error: authError } = await supabase.auth.getUser();

  // 接続自体の OK/NG を判定（auth エラーは未ログインだけなら OK 扱い）
  const supabaseConnected =
    !authError ||
    authError.message.includes("session") ||
    authError.message.includes("missing");

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-purple-50 via-white to-pink-50 px-6 py-20">
      <div className="w-full max-w-md text-center">
        <span className="inline-block rounded-full bg-purple-100 px-4 py-1 text-xs font-bold tracking-widest text-purple-700">
          ★ iHub
        </span>

        <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
          Hello iHub
        </h1>

        <p className="mt-4 text-base leading-relaxed text-gray-600">
          推し活グッズを<strong>現地で交換する</strong>マッチングアプリ。
          <br />
          MVP 開発開始。
        </p>

        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-purple-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-purple-600">
              Phase
            </div>
            <div className="mt-1 text-lg font-bold text-gray-900">0a</div>
            <div className="mt-1 text-xs text-gray-500">基盤構築中</div>
          </div>
          <div className="rounded-xl border border-purple-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-purple-600">
              Stack
            </div>
            <div className="mt-1 text-lg font-bold text-gray-900">
              Next.js 16
            </div>
            <div className="mt-1 text-xs text-gray-500">+ Supabase</div>
          </div>
          <div className="rounded-xl border border-purple-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-purple-600">
              Supabase
            </div>
            <div
              className={`mt-1 text-lg font-bold ${
                supabaseConnected ? "text-green-600" : "text-red-600"
              }`}
            >
              {supabaseConnected ? "✓ 接続" : "✗ 失敗"}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {supabaseConnected ? "正常" : "要確認"}
            </div>
          </div>
        </div>

        <div className="mt-12 text-xs text-gray-400">
          設計：iter50 まで完了 ／ 実装着手中
        </div>
      </div>
    </main>
  );
}
