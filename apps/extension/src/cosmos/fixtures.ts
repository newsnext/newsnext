export const COSMOS_FIXTURES = [
  {
    path: "src/cosmos/Basics/Foundation.fixture.tsx",
    rendererFixture: {
      type: "multi" as const,
      fixtureNames: ["Colors", "Typography", "Buttons", "Badges", "Surfaces and identity", "Navigation and data"] as string[],
    },
    load: () => import("@/cosmos/foundation.fixture"),
  },
  {
    path: "src/cosmos/Basics/Forms.fixture.tsx",
    rendererFixture: {
      type: "multi" as const,
      fixtureNames: ["Text inputs", "Selection controls", "Feedback", "Empty state", "LiveCard editing form"] as string[],
    },
    load: () => import("@/cosmos/forms-feedback.fixture"),
  },
  {
    path: "src/cosmos/Basics/Overlays.fixture.tsx",
    rendererFixture: {
      type: "multi" as const,
      fixtureNames: ["Popover", "Dropdown menu", "Tooltip"] as string[],
    },
    load: () => import("@/cosmos/floating-overlays.fixture"),
  },
  {
    path: "src/cosmos/Basics/Modals.fixture.tsx",
    rendererFixture: {
      type: "multi" as const,
      fixtureNames: [
        "Foundation: Shared parts",
        "Dialog: Default",
        "Alert: Default",
        "Alert: Compact",
      ] as string[],
    },
    load: () => import("@/cosmos/modals.fixture"),
  },
  {
    path: "src/cosmos/Patterns/Components.fixture.tsx",
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
    path: "src/cosmos/Patterns/Dialogs.fixture.tsx",
    rendererFixture: {
      type: "multi" as const,
      fixtureNames: [
        "Dialog: Board create",
        "Dialog: Board edit",
        "Dialog: Settings",
        "Dialog: Search",
      ] as string[],
    },
    load: () => import("@/cosmos/modals.fixture"),
  },
  {
    path: "src/cosmos/LiveCards.fixture.tsx",
    rendererFixture: {
      type: "multi" as const,
      fixtureNames: [
        "Overview: All colors",
        "Front: Ranking",
        "Front: Timeline",
        "Front: Loading",
        "Front: Permission",
        "Front: Error",
        "Editable LiveCard",
      ] as string[],
    },
    load: () => import("@/cosmos/live-cards.fixture"),
  },
] as const
