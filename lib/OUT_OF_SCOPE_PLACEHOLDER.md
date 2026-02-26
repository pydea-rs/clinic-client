# Out-of-Scope Placeholder Strategy

## Purpose
To clearly indicate in the client UI when a feature/module is not available in the current backend implementation, preventing confusion and guiding testers.

## Strategy
- For each route or feature corresponding to an unimplemented backend module (calls, notifications, payment, nurse, etc.), display a prominent placeholder screen.
- Placeholder should include:
  - Module/feature name
  - Message: "Not available in current backend"
  - Brief explanation (optional): "This feature is not yet implemented on the server. Please refer to the backend TASKS.md for progress."
  - Visual: Icon or illustration indicating unavailability
- Ensure navigation and role-based access still function, but block interaction with unavailable modules.
- Use a shared component (e.g., `<UnavailableFeature />`) for consistency.

## Implementation Notes
- List all out-of-scope modules in a config or constants file for easy updates.
- Placeholder should be accessible and visually distinct from error states.
- Optionally, link to backend TASKS.md or PRD for more info.

---

This strategy ensures clarity for testers and developers, and prevents wasted effort on unsupported features.
