/**
 * iter92: 通知作成共通 helper
 *
 * 各 server action で重要イベント発生時に呼ぶ。失敗してもメイン処理を
 * 止めないよう、エラーは握りつぶしてログのみ。
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationKind =
  | "proposal_received"
  | "proposal_accepted"
  | "proposal_rejected"
  | "proposal_revised"
  | "evidence_added"
  | "trade_completed"
  | "evaluation_received"
  | "dispute_received"
  | "dispute_responded"
  | "dispute_closed"
  | "cancel_requested"
  | "expires_soon";

export type NotifyInput = {
  userId: string;
  kind: NotificationKind;
  title: string;
  body?: string | null;
  linkPath?: string | null;
  proposalId?: string | null;
  disputeId?: string | null;
};

export async function createNotification(
  supabase: SupabaseClient,
  input: NotifyInput,
): Promise<void> {
  try {
    await supabase.from("notifications").insert({
      user_id: input.userId,
      kind: input.kind,
      title: input.title,
      body: input.body ?? null,
      link_path: input.linkPath ?? null,
      proposal_id: input.proposalId ?? null,
      dispute_id: input.disputeId ?? null,
    });
  } catch (e) {
    // 通知作成失敗はメイン処理を止めない（ログのみ）
    console.error("[notify] failed", e);
  }
}
