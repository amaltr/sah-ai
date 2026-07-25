/**
 * Persistent hotline footer — appears on every screen.
 *
 * SAFETY INVARIANT (SAFETY.md §6):
 * - This component has ZERO dependency on the Gemini API.
 * - It renders real `tel:` and `sms:` links, not decorative buttons.
 * - It functions even when JavaScript fails to load (server-rendered).
 * - It is the last-resort safety net: if everything else breaks,
 *   the user can still reach 988 / 911 / SAMHSA from this footer.
 *
 * @module components/hotline-footer
 */

import { ALL_HOTLINES } from "@/lib/content/crisis-static";

export function HotlineFooter() {
  return (
    <footer
      id="hotline-footer"
      role="contentinfo"
      aria-label="Crisis helpline numbers"
      className="hotline-footer"
    >
      <p className="hotline-footer__title">
        Help is always available:
      </p>
      <ul className="hotline-footer__list">
        {ALL_HOTLINES.map((hotline) => (
          <li key={hotline.number} className="hotline-footer__item">
            <a
              href={`${hotline.type === "sms" ? "sms" : "tel"}:${hotline.number}`}
              className="hotline-footer__link"
              aria-label={`${hotline.label} — ${hotline.type === "sms" ? "text" : "call"} ${hotline.number}`}
            >
              <span className="hotline-footer__label">{hotline.label}</span>
              <span className="hotline-footer__number">{hotline.number}</span>
            </a>
          </li>
        ))}
      </ul>
    </footer>
  );
}
