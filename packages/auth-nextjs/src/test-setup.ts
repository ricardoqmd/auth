// The /vitest entry point extends Vitest's own `expect` directly,
// without requiring `expect` to be in the global scope.
// The plain `@testing-library/jest-dom` import expects a Jest-style global
// `expect` which Vitest does not expose by default.
import "@testing-library/jest-dom/vitest";
