export const COSMOS_FIXTURES = [
  {
    path: "src/cosmos/foundation.fixture.tsx",
    rendererFixture: { type: "single" as const },
    load: () => import("@/cosmos/foundation.fixture"),
  },
  {
    path: "src/cosmos/modals.fixture.tsx",
    rendererFixture: {
      type: "multi" as const,
      fixtureNames: ["Dialog", "Alert dialog", "Bottom drawer", "Right sheet"] as string[],
    },
    load: () => import("@/cosmos/modals.fixture"),
  },
  {
    path: "src/cosmos/floating-overlays.fixture.tsx",
    rendererFixture: {
      type: "multi" as const,
      fixtureNames: ["Popover", "Dropdown menu", "Select", "Tooltip"] as string[],
    },
    load: () => import("@/cosmos/floating-overlays.fixture"),
  },
  {
    path: "src/cosmos/forms-feedback.fixture.tsx",
    rendererFixture: {
      type: "multi" as const,
      fixtureNames: ["Form controls", "Feedback states", "Empty state"] as string[],
    },
    load: () => import("@/cosmos/forms-feedback.fixture"),
  },
] as const
