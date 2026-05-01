import Link from "next/link";
import { ResendButton } from "./ResendButton";

export const metadata = {
  title: "メール認証 — iHub",
};

type Props = {
  searchParams: Promise<{ email?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: Props) {
  const params = await searchParams;
  const email = params.email ?? "";

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-purple-50 via-white to-pink-50 px-6 py-12">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="inline-block">
          <span className="inline-block rounded-full bg-purple-100 px-4 py-1 text-xs font-bold tracking-widest text-purple-700">
            ★ iHub
          </span>
        </Link>

        <div className="mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-8 w-8 text-purple-700"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
            />
          </svg>
        </div>

        <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-gray-900">
          確認メールを送信しました
        </h1>

        <p className="mt-4 text-base leading-relaxed text-gray-600">
          {email && (
            <>
              <strong className="text-gray-900">{email}</strong> 宛に
              <br />
            </>
          )}
          認証リンク付きのメールを送りました。
          <br />
          メール内のリンクをクリックして登録を完了してください。
        </p>

        <div className="mt-8 rounded-2xl border border-purple-100 bg-white p-6 text-left shadow-sm">
          <h2 className="text-sm font-bold text-gray-900">
            メールが届かない場合
          </h2>
          <ul className="mt-3 space-y-1 text-sm text-gray-600">
            <li>・迷惑メールフォルダを確認</li>
            <li>・メールアドレスの入力間違いがないか確認</li>
            <li>・数分待ってから再送を試す</li>
          </ul>

          {email && (
            <div className="mt-4">
              <ResendButton email={email} />
            </div>
          )}
        </div>

        <p className="mt-6 text-sm text-gray-600">
          既に認証完了している方は{" "}
          <Link
            href="/login"
            className="font-bold text-purple-700 hover:text-purple-900"
          >
            ログイン
          </Link>
        </p>
      </div>
    </main>
  );
}
