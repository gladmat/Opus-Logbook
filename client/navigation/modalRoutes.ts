/**
 * Modal-presented routes of the root native stack — the single source of
 * truth the navigator options, the imperative-navigation guard and the
 * dev-only regression alarm all read.
 *
 * Why this exists (2026-09-12): React Navigation's native stack treats
 * every route that FOLLOWS a modal route as a modal too, and
 * react-native-screens presents each of those as its own sheet — the root
 * of its own UINavigationController, which never draws a back button.
 * Pushing a "card" route explicitly does not help: natively it is pushed
 * onto the navigation controller UNDERNEATH the open sheet. So the rule
 * is: a card route is never pushed while a modal route sits below it.
 * Modals are terminal — they exit via goBack / replace only.
 */

export const MODAL_ROUTE_PRESENTATION = {
  AddTimelineEvent: "modal",
  MediaManagement: "fullScreenModal",
  AddOperativeMedia: "fullScreenModal",
  SmartImport: "fullScreenModal",
  OpusCamera: "fullScreenModal",
  GuidedCapture: "fullScreenModal",
  CaseMediaOrganiser: "modal",
} as const;

export type ModalRouteName = keyof typeof MODAL_ROUTE_PRESENTATION;

export const MODAL_ROUTE_NAMES = Object.keys(
  MODAL_ROUTE_PRESENTATION,
) as readonly ModalRouteName[];

const MODAL_ROUTE_SET: ReadonlySet<string> = new Set(MODAL_ROUTE_NAMES);

export function isModalRoute(name: string): name is ModalRouteName {
  return MODAL_ROUTE_SET.has(name);
}

export interface RouteLike {
  name: string;
}

/**
 * The first non-modal route that sits ABOVE a modal route in the stack,
 * with the modal it is stacked on — i.e. a screen that will render as a
 * sheet without a back button. `null` when the stack is healthy.
 */
export function findCardStackedOnModal(
  routes: readonly RouteLike[],
): { card: string; modal: string } | null {
  let openModal: string | null = null;
  for (const route of routes) {
    if (isModalRoute(route.name)) {
      openModal = route.name;
    } else if (openModal !== null) {
      return { card: route.name, modal: openModal };
    }
  }
  return null;
}

/** Number of consecutive modal routes at the TOP of the stack. */
export function countModalsOnTop(routes: readonly RouteLike[]): number {
  let count = 0;
  for (let i = routes.length - 1; i >= 0; i -= 1) {
    if (!isModalRoute(routes[i]!.name)) break;
    count += 1;
  }
  return count;
}
