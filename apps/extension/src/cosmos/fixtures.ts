export const COSMOS_FIXTURES = [
  {
    path: "src/cosmos/Basics.fixture.tsx",
    rendererFixture: { type: "single" as const },
    load: () => import("@/cosmos/foundation.fixture"),
  },
  {
    path: "src/cosmos/Components.fixture.tsx",
    rendererFixture: {
      type: "multi" as const,
      fixtureNames: [
        "Brand and actions",
        "Selectors",
        "Theme selector",
        "Flip animation",
        "Content safety",
        "Virtual list",
        "Dynamic island",
        "Corner shapes",
      ] as string[],
    },
    load: () => import("@/cosmos/newsnext-components.fixture"),
  },
  {
    path: "src/cosmos/Cards.fixture.tsx",
    rendererFixture: {
      type: "multi" as const,
      fixtureNames: [
        "Overview: All colors",
        "Front: Ranking",
        "Front: Timeline",
        "Front: Loading",
        "Front: Permission",
        "Front: Error",
        "Back: Editable",
        "Drag: Overlay",
      ] as string[],
    },
    load: () => import("@/cosmos/cards.fixture"),
  },
  {
    path: "src/cosmos/Modals.fixture.tsx",
    rendererFixture: {
      type: "multi" as const,
      fixtureNames: [
        "Foundation: Shared parts",
        "Dialog: Default",
        "Dialog: Board create",
        "Dialog: Board edit",
        "Dialog: Settings",
        "Dialog: Search",
        "Alert: Default",
        "Alert: Compact",
      ] as string[],
    },
    load: () => import("@/cosmos/modals.fixture"),
  },
  {
    path: "src/cosmos/Overlays.fixture.tsx",
    rendererFixture: {
      type: "multi" as const,
      fixtureNames: ["Popover", "Dropdown menu", "Select", "Tooltip"] as string[],
    },
    load: () => import("@/cosmos/floating-overlays.fixture"),
  },
  {
    path: "src/cosmos/Forms.fixture.tsx",
    rendererFixture: {
      type: "multi" as const,
      fixtureNames: ["Form controls", "Radio groups", "Feedback states", "Empty state"] as string[],
    },
    load: () => import("@/cosmos/forms-feedback.fixture"),
  },
] as const
