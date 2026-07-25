# Lessons Learned

> Updated after every correction. Review at session start.
> Pattern: What went wrong → Why → Rule to prevent recurrence.

---

## Session 1 — 2026-07-25 (Foundation)

### L-001: Archive docs were never actually iterated
- **What**: v1 and v2 of the architecture doc were byte-identical copies.
- **Why**: Copy was made with intent to iterate, but iteration never happened.
- **Rule**: Never create a "v2" file by copying — always diff after editing to verify actual changes exist. If no changes, delete the duplicate.

### L-002: Don't treat content tasks as implementation details
- **What**: The crisis-static content (the most important safety artifact) was specified in code structure but never actually authored.
- **Why**: Planning focused on code architecture and deferred content to "implementation."
- **Rule**: Content that is the product's safety backbone must be drafted in the planning phase, not the coding phase. If the code's job is to *serve* content, the content must exist before the code.

### L-003: Unwritten rules are unenforceable rules
- **What**: The safety filter was specified as "rule-based checks for dosage/shaming patterns" but no actual patterns were defined.
- **Why**: Assumed patterns would be obvious during implementation.
- **Rule**: If a function's behavior depends on a list of patterns/rules, define the patterns in the spec. A filter with no filter rules is a no-op.

### L-004: MCP is an agent-time protocol, not a runtime web-app protocol
- **What**: Considered integrating a local SAMHSA MCP server or rebuilding it with FastMCP for a Vercel-deployed web app.
- **Why**: MCP is designed for AI-agent-to-tool communication (stdio/SSE). A web app serves HTTP requests from human users — entirely different execution model.
- **Rule**: Before wrapping something in MCP, ask: "who is the MCP client?" If the answer is "my web app's API route handler," you don't need MCP — you need a plain HTTP client or TypeScript module. MCP adds protocol overhead without value when there's no AI agent in the loop.

### L-005: Stack decisions must be evaluated against the *specific* evaluation criteria, not abstract best practices
- **What**: Questioned whether the backend should be Python (existing code reuse) vs TypeScript (current plan).
- **Why**: "Reuse existing code" is a general best practice. But in this hackathon, Code Quality is the **highest** evaluation weight. TypeScript `strict: true` provides a stronger code quality signal than Python type hints. The reuse advantage (saving 30 min rewriting 50 lines) is real but smaller than the code quality advantage across 4 hours of output.
- **Rule**: When choosing between options for a competition/hackathon, weight the decision matrix by the *actual evaluation criteria*, not by general engineering wisdom. An option that's "better engineering" but scores worse on the rubric is the wrong choice for the context.

### L-006: Don't put Node.js projects in OneDrive-synced directories
- **What**: `npm install` took 15+ minutes instead of ~30 seconds.
- **Why**: The project is inside `OneDrive/Documents/`. npm writes tens of thousands of small files to `node_modules/`. OneDrive syncs every file write in real-time, creating massive I/O overhead.
- **Rule**: Keep Node.js projects outside OneDrive-synced folders. If you must use OneDrive, pause syncing during `npm install`, or add `node_modules` to OneDrive's excluded folders. This is a known npm issue (npm/cli#4134).
