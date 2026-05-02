import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AWNewForm } from "./AWNewForm";
import { HeaderBack } from "@/components/auth/HeaderBack";

export const metadata = {
  title: "AW を追加 — iHub",
};

export default async function AWNewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="flex flex-1 flex-col bg-[#fbf9fc]">
      <HeaderBack title="AW を追加" backHref="/aw" />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-8 pt-6">
        <p className="mb-5 text-xs leading-relaxed text-gray-500">
          「この時間ここにいる」予定を登録します。マッチング時の
          場所×時間の交差で、近くで会える相手を見つけます。
        </p>
        <AWNewForm />
      </div>
    </main>
  );
}
