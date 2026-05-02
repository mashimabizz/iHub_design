import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IHubLogo } from "@/components/auth/IHubLogo";
import { PrimaryLinkButton } from "@/components/auth/PrimaryButton";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { HomeView } from "@/components/home/HomeView";
import { BottomNav } from "@/components/home/BottomNav";

type Props = {
  searchParams: Promise<{
    code?: string;
    error?: string;
    error_code?: string;
    error_description?: string;
    openLocalMode?: string;
  }>;
};

export default async function Home({ searchParams }: Props) {
  const params = await searchParams;

  // フォールバック：認証コードが root に飛んできた場合は /auth/callback へ転送
  if (params.code) {
    redirect(`/auth/callback?code=${params.code}`);
  }

  // フォールバック：認証エラーが root に飛んできた場合
  if (params.error) {
    const errorParams = new URLSearchParams({
      error: params.error,
      ...(params.error_code && { error_code: params.error_code }),
      ...(params.error_description && {
        error_description: params.error_description,
      }),
    });
    redirect(`/auth/auth-error?${errorParams.toString()}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 未ログイン → Welcome 画面（モックアップ AOWelcome 準拠）
  if (!user) {
    return <WelcomeView />;
  }

  // ログイン中 → ホーム画面
  const [
    { data: profile },
    { data: localMode },
    { data: aws },
    { data: carryingItems },
  ] = await Promise.all([
    supabase
      .from("users")
      .select("handle, display_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("user_local_mode_settings")
      .select(
        "enabled, aw_id, radius_m, selected_carrying_ids, selected_wish_ids, last_lat, last_lng",
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("activity_windows")
      .select(
        "id, venue, event_name, eventless, start_at, end_at, radius_m",
      )
      .eq("user_id", user.id)
      .eq("status", "enabled")
      .order("start_at", { ascending: true }),
    supabase
      .from("goods_inventory")
      .select(
        "id, title, group:groups_master(name), character:characters_master(name), goods_type:goods_types_master(name)",
      )
      .eq("user_id", user.id)
      .eq("kind", "for_trade")
      .eq("status", "active")
      .order("created_at", { ascending: false }),
  ]);

  const pickName = (
    v: { name: string } | { name: string }[] | null,
  ): string | null => {
    if (!v) return null;
    return Array.isArray(v) ? v[0]?.name ?? null : v.name;
  };

  return (
    <>
      <HomeView
        profile={profile}
        localMode={
          localMode
            ? {
                enabled: localMode.enabled,
                awId: localMode.aw_id,
                radiusM: localMode.radius_m,
                selectedCarryingIds: localMode.selected_carrying_ids ?? [],
                selectedWishIds: localMode.selected_wish_ids ?? [],
                lastLat: localMode.last_lat,
                lastLng: localMode.last_lng,
              }
            : null
        }
        aws={(aws ?? []).map((a) => ({
          id: a.id,
          venue: a.venue,
          eventName: a.event_name,
          eventless: a.eventless,
          startAt: a.start_at,
          endAt: a.end_at,
          radiusM: (a as { radius_m?: number }).radius_m ?? 500,
        }))}
        carryingItems={(carryingItems ?? []).map((r) => ({
          id: r.id,
          title: r.title,
          groupName: pickName(r.group),
          characterName: pickName(r.character),
          goodsTypeName: pickName(r.goods_type),
          photoUrl: null,
        }))}
        autoOpenLocalSheet={params.openLocalMode === "1"}
      />
      <BottomNav />
    </>
  );
}

// ──────────────────────────────────────────────
// Welcome 画面（未ログイン時）
// ──────────────────────────────────────────────
function WelcomeView() {
  return (
    <main className="flex flex-1 flex-col bg-[linear-gradient(180deg,#a695d822_0%,#a8d4e614_45%,#ffffff_100%)] px-7 pb-8 pt-20">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        {/* 中央：ロゴ + タイトル + キャッチコピー */}
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <IHubLogo size={88} />
          <h1 className="mt-6 text-[34px] font-extrabold tracking-wide text-gray-900">
            iHub
          </h1>
          <p className="mt-2.5 max-w-[280px] text-[13px] leading-relaxed text-gray-500">
            グッズ交換を、
            <br />
            現地で、もっと簡単に。
          </p>
        </div>

        {/* 下部：CTA */}
        <div>
          <PrimaryLinkButton href="/signup">
            メールアドレスで新規登録
          </PrimaryLinkButton>
          <div className="mt-2.5">
            <GoogleAuthButton label="Googleで新規登録" />
          </div>
          <div className="mt-5 text-center text-[13px] text-gray-500">
            すでにアカウントをお持ちの方は{" "}
            <Link
              href="/login"
              className="font-bold text-purple-600 hover:text-purple-700"
            >
              ログイン
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

