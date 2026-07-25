/**
 * Sah-AI Home Page
 *
 * The primary entry point. Designed around the voice companion button
 * as the single bold, signature UI element (ARD-007).
 *
 * Three flows accessible from here:
 * 1. Voice Companion (primary CTA — big button)
 * 2. Emergency Triage (secondary link)
 * 3. Script Generator (secondary link)
 */

import Link from "next/link";

export default function Home() {
  return (
    <div className="home">
      <section className="home__hero" aria-labelledby="hero-heading">
        <h1 id="hero-heading" className="home__title">
          Sah-AI
        </h1>
        <p className="home__subtitle">
          You don&apos;t need to type. Just talk.
        </p>

        <Link
          href="/companion"
          className="home__cta"
          id="voice-companion-btn"
          aria-label="Start voice companion — talk to Sah-AI for support"
        >
          <span className="home__cta-icon" aria-hidden="true">
            🎙️
          </span>
          <span className="home__cta-text">Talk to Sah-AI</span>
        </Link>
      </section>

      <nav className="home__nav" aria-label="Support options">
        <Link
          href="/triage"
          className="home__nav-card"
          id="triage-link"
        >
          <span className="home__nav-card-icon" aria-hidden="true">🚨</span>
          <span className="home__nav-card-title">Emergency Triage</span>
          <span className="home__nav-card-desc">
            Guided steps for urgent situations
          </span>
        </Link>

        <Link
          href="/scripts"
          className="home__nav-card"
          id="scripts-link"
        >
          <span className="home__nav-card-icon" aria-hidden="true">📝</span>
          <span className="home__nav-card-title">Script Generator</span>
          <span className="home__nav-card-desc">
            What to say when you don&apos;t know what to say
          </span>
        </Link>
      </nav>

      <p className="home__disclaimer">
        Sah-AI is a wellness tool, not a medical device. It does not diagnose,
        treat, or replace professional care. For emergencies, call 911.
      </p>
    </div>
  );
}
