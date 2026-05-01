import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OshiForm, type OshiOption, type GenreOption } from "./OshiForm";
import { HeaderBack } from "@/components/auth/HeaderBack";
import { ProgressDots } from "@/components/auth/ProgressDots";

export const metadata = {
  title: "プロフィール設定 — iHub",
};

/**
 * オンボーディング 2/4: 推し選択（モックアップ AOOnboardGroup 準拠）
 *
 * - groups_master + genres_master をジャンル横断で取得
 * - ジャンルチップでフィルタ + 名前/aliases 検索
 * - 複数選択可、選択順に user_oshi に priority を振る（kind=box でメンバー未選択状態）
 */
export default async function OshiPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ジャンル一覧
  const { data: genres } = await supabase
    .from("genres_master")
    .select("id, name, kind, display_order")
    .order("display_order", { ascending: true });

  // グループ + ジャンル情報
  const { data: groups } = await supabase
    .from("groups_master")
    .select(
      "id, name, aliases, kind, display_order, genre:genres_master(id, name, kind)",
    )
    .order("display_order", { ascending: true });

  // 既存の user_oshi（再訪時の初期選択）
  const { data: existingOshi } = await supabase
    .from("user_oshi")
    .select("group_id, priority")
    .eq("user_id", user.id)
    .order("priority", { ascending: true });

  const initialSelected: string[] =
    existingOshi
      ?.filter((o): o is { group_id: string; priority: number } => !!o.group_id)
      .map((o) => o.group_id) ?? [];

  // OshiOption に変換
  const oshiOptions: OshiOption[] = (groups ?? [])
    .filter((g): g is typeof g & { genre: NonNullable<typeof g.genre> } =>
      Array.isArray(g.genre) ? g.genre.length > 0 : !!g.genre,
    )
    .map((g) => {
      const genre = Array.isArray(g.genre) ? g.genre[0] : g.genre;
      return {
        id: g.id,
        name: g.name,
        aliases: g.aliases ?? [],
        kind: g.kind as "group" | "work" | "solo",
        display_order: g.display_order,
        genre_id: genre.id,
        genre_name: genre.name,
        genre_kind: genre.kind as "idol" | "anime" | "game" | "other",
      };
    });

  const genreOptions: GenreOption[] = (genres ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    kind: g.kind as "idol" | "anime" | "game" | "other",
  }));

  return (
    <main className="flex flex-1 flex-col bg-[#fbf9fc]">
      <HeaderBack
        title="プロフィール設定"
        sub="あなたの推し（複数選択可）"
        progress="2/4"
        backHref="/onboarding/gender"
      />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-8 pt-6">
        <ProgressDots current={1} total={4} />
        <h2 className="mt-4 text-[22px] font-extrabold leading-tight text-gray-900">
          推しは？
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          グループ・作品・配信者など、ジャンル横断で選べます
        </p>
        <OshiForm
          oshiOptions={oshiOptions}
          genreOptions={genreOptions}
          initialSelected={initialSelected}
        />
      </div>
    </main>
  );
}
