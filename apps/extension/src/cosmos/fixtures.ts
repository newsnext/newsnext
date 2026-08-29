export const COSMOS_FIXTURES = [
  {
    path: "src/cosmos/Basics/Foundation.fixture.tsx",
    rendererFixture: {
      type: "multi" as const,
      fixtureNames: ["Colors", "Typography"] as string[],
    },
    load: () => import("@/cosmos/basics/foundation.fixture"),
  },
  {
    path: "src/cosmos/Basics/Actions.fixture.tsx",
    rendererFixture: {
      type: "multi" as const,
      fixtureNames: ["Buttons", "Badges"] as string[],
    },
    load: () => import("@/cosmos/basics/actions.fixture"),
  },
  {
    path: "src/cosmos/Basics/Forms.fixture.tsx",
    rendererFixture: {
      type: "multi" as const,
      fixtureNames: ["Text inputs", "Selection controls"] as string[],
    },
    load: () => import("@/cosmos/basics/forms.fixture"),
  },
  {
    path: "src/cosmos/Basics/Feedback.fixture.tsx",
    rendererFixture: {
      type: "multi" as const,
      fixtureNames: ["Messages and loading", "Empty state"] as string[],
    },
    load: () => import("@/cosmos/basics/feedback.fixture"),
  },
  {
    path: "src/cosmos/Basics/Surfaces.fixture.tsx",
    rendererFixture: {
      type: "multi" as const,
      fixtureNames: ["Card and avatars"] as string[],
    },
    load: () => import("@/cosmos/basics/surfaces.fixture"),
  },
  {
    path: "src/cosmos/Basics/Navigation.fixture.tsx",
    rendererFixture: {
      type: "multi" as const,
      fixtureNames: ["Pill, command, and scroll"] as string[],
    },
    load: () => import("@/cosmos/basics/navigation.fixture"),
  },
  {
    path: "src/cosmos/Basics/Overlays.fixture.tsx",
    rendererFixture: {
      type: "multi" as const,
      fixtureNames: ["Popover", "Dropdown menu", "Tooltip"] as string[],
    },
    load: () => import("@/cosmos/basics/overlays.fixture"),
  },
  {
    path: "src/cosmos/Basics/Shapes.fixture.tsx",
    rendererFixture: {
      type: "multi" as const,
      fixtureNames: ["Corner shapes"] as string[],
    },
    load: () => import("@/cosmos/basics/shapes.fixture"),
  },
  {
    path: "src/cosmos/Patterns/Appearance.fixture.tsx",
    rendererFixture: {
      type: "multi" as const,
      fixtureNames: ["Theme selector"] as string[],
    },
    load: () => import("@/cosmos/patterns/theme.fixture"),
  },
  {
    path: "src/cosmos/Patterns/Dynamic Island.fixture.tsx",
    rendererFixture: {
      type: "multi" as const,
      fixtureNames: ["Default"] as string[],
    },
    load: () => import("@/cosmos/patterns/dynamic-island.fixture"),
  },
  {
    path: "src/cosmos/Patterns/Notifications.fixture.tsx",
    rendererFixture: {
      type: "multi" as const,
      fixtureNames: ["Import failure"] as string[],
    },
    load: () => import("@/cosmos/patterns/notifications.fixture"),
  },
  {
    path: "src/cosmos/Patterns/Dialogs.fixture.tsx",
    rendererFixture: {
      type: "multi" as const,
      fixtureNames: ["Board create", "Board edit", "Settings", "Search"] as string[],
    },
    load: () => import("@/cosmos/patterns/dialogs.fixture"),
  },
  {
    path: "src/cosmos/LiveCards.fixture.tsx",
    rendererFixture: {
      type: "multi" as const,
      fixtureNames: ["Overview", "List", "Ranking", "Timeline", "Loading", "Permission", "Error", "Editable"] as string[],
    },
    load: () => import("@/cosmos/live-cards/index.fixture"),
  },
] as const
