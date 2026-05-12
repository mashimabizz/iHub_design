export type ProposalStatus =
  | "draft"
  | "sent"
  | "negotiating"
  | "agreement_one_side"
  | "agreed"
  | "completed"
  | "rejected"
  | "expired"
  | "cancelled";

export type ProposalDirection = "sent" | "received";
export type PendingBucket = "action" | "waiting";

export function isPendingProposalStatus(status: ProposalStatus): boolean {
  return (
    status === "sent" ||
    status === "negotiating" ||
    status === "agreement_one_side"
  );
}

export function getPendingBucket(input: {
  status: ProposalStatus;
  direction: ProposalDirection;
  myAgreed: boolean;
  partnerAgreed: boolean;
  latestMessageFrom?: "me" | "partner" | null;
}): PendingBucket {
  if (input.status === "sent") {
    return input.direction === "received" ? "action" : "waiting";
  }
  if (input.status === "agreement_one_side") {
    return input.partnerAgreed && !input.myAgreed ? "action" : "waiting";
  }
  if (input.status === "negotiating") {
    if (input.latestMessageFrom) {
      return input.latestMessageFrom === "partner" ? "action" : "waiting";
    }
    return input.direction === "received" ? "action" : "waiting";
  }
  return "waiting";
}

export function getPendingDetailRoute(input: {
  id: string;
  status: ProposalStatus;
  direction: ProposalDirection;
}): string {
  return input.status === "sent" && input.direction === "received"
    ? `/proposals/${input.id}`
    : `/transactions/${input.id}`;
}
