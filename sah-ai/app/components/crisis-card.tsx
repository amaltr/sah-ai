/**
 * CrisisCard — renders pre-authored crisis content with real tel:/sms: actions.
 *
 * SAFETY INVARIANT (SAFETY.md §2.1):
 * - This component only renders content from crisis-static.ts.
 * - It never renders LLM-generated text.
 * - All actions are real tel:/sms: links, not decorative buttons.
 *
 * @module components/crisis-card
 */

import type { CrisisContent } from "@/lib/types";

interface CrisisCardProps {
  content: CrisisContent;
}

export function CrisisCard({ content }: CrisisCardProps) {
  return (
    <div className="crisis-card" role="alert" aria-labelledby={`crisis-${content.id}`}>
      <h2 id={`crisis-${content.id}`} className="crisis-card__title">
        {content.title}
      </h2>
      <div className="crisis-card__body">{content.body}</div>
      <div className="crisis-card__actions">
        {content.actions.map((action) => (
          <a
            key={action.number}
            href={`${action.type === "sms" ? "sms" : "tel"}:${action.number}`}
            className="crisis-card__action"
            aria-label={`${action.type === "sms" ? "Text" : "Call"} ${action.label}`}
          >
            {action.type === "sms" ? "Text" : "Call"} {action.number}
            <span className="crisis-card__action-label">{action.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
