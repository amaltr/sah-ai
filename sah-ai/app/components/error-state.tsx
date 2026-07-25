/**
 * ErrorState — degraded-mode UI when the API is unreachable.
 *
 * SAFETY INVARIANT (SAFETY.md §6):
 * - Even when Gemini is offline, the user can still reach hotlines.
 * - This component renders the generic crisis response + hotline links.
 * - It is not a dead end — it directs users to real help.
 *
 * @module components/error-state
 */

import { GENERIC_CRISIS_RESPONSE } from "@/lib/content/crisis-static";
import { CrisisCard } from "./crisis-card";

interface ErrorStateProps {
  message?: string;
}

export function ErrorState({
  message = "We can't connect right now, but help is always available.",
}: ErrorStateProps) {
  return (
    <div className="error-state">
      <p className="error-state__message">{message}</p>
      <CrisisCard content={GENERIC_CRISIS_RESPONSE} />
    </div>
  );
}
