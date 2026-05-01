"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * 認証 Server Actions
 *
 * Phase 0b-2 で実装。
 * Auth は Supabase Auth に委譲、public.users は handle_new_user() トリガーで自動作成。
 */

// バリデーションエラー型
type AuthResult = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

// ----------------------------------------------------------------------
// signup: メアド + パスワード + ハンドル + 表示名 でユーザー登録
// ----------------------------------------------------------------------
export async function signup(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const handle = String(formData.get("handle") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const acceptedTerms = formData.get("accepted_terms") === "on";

  // バリデーション
  const fieldErrors: Record<string, string> = {};

  if (!email || !email.includes("@")) {
    fieldErrors.email = "有効なメールアドレスを入力してください";
  }
  if (!password || password.length < 8) {
    fieldErrors.password = "パスワードは 8 文字以上で入力してください";
  }
  if (!handle || !/^[a-z0-9_]{3,20}$/.test(handle)) {
    fieldErrors.handle = "ハンドル名は 3〜20 文字、英小文字・数字・_ のみ";
  }
  if (!displayName || displayName.length > 50) {
    fieldErrors.display_name = "表示名は 1〜50 文字で入力してください";
  }
  if (!acceptedTerms) {
    fieldErrors.accepted_terms = "利用規約とプライバシーポリシーへの同意が必要です";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const supabase = await createClient();

  // ハンドル重複チェック（事前）
  const { data: existing } = await supabase
    .from("users")
    .select("handle")
    .eq("handle", handle)
    .maybeSingle();

  if (existing) {
    return { fieldErrors: { handle: "このハンドル名は既に使われています" } };
  }

  // Supabase Auth で signup
  // metadata に handle と display_name を入れて、handle_new_user() トリガーが拾う
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getBaseUrl()}/auth/callback`,
      data: {
        handle,
        display_name: displayName,
      },
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return { fieldErrors: { email: "このメールアドレスは既に登録されています" } };
    }
    return { error: error.message };
  }

  // verify-email 画面へ遷移（メール送信完了表示）
  redirect(`/auth/verify-email?email=${encodeURIComponent(email)}`);
}

// ----------------------------------------------------------------------
// login: メアド + パスワードでログイン
// ----------------------------------------------------------------------
export async function login(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "メールアドレスとパスワードを入力してください" };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message.includes("Invalid login credentials")) {
      return { error: "メールアドレスまたはパスワードが正しくありません" };
    }
    if (error.message.includes("Email not confirmed")) {
      return { error: "メール認証が完了していません。受信メールを確認してください" };
    }
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

// ----------------------------------------------------------------------
// logout: ログアウト
// ----------------------------------------------------------------------
export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

// ----------------------------------------------------------------------
// resendVerification: 認証メール再送（60秒制限はSupabase側）
// ----------------------------------------------------------------------
export async function resendVerification(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "メールアドレスが必要です" };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${getBaseUrl()}/auth/callback`,
    },
  });

  if (error) {
    if (error.message.includes("rate limit")) {
      return { error: "再送間隔が短すぎます。しばらく待ってから再度試してください" };
    }
    return { error: error.message };
  }

  return {};
}

// ----------------------------------------------------------------------
// ベース URL（リダイレクト先）
// ----------------------------------------------------------------------
function getBaseUrl(): string {
  // Vercel 本番: https://ihub.tokyo（カスタムドメイン）
  // Vercel Preview: https://xxxxx.vercel.app
  // ローカル: http://localhost:3000
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}
