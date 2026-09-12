import {
  createNavigationContainerRef,
  StackActions,
} from "@react-navigation/native";
import type { RootStackParamList } from "./RootStackNavigator";
import { countModalsOnTop } from "./modalRoutes";

/**
 * Module-level navigation ref so non-component code (push-notification
 * handlers in App.tsx, the TOFU mismatch alert in the case-save pipeline)
 * can navigate. Attached to the NavigationContainer in App.tsx.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

type CardRouteName = Exclude<
  keyof RootStackParamList,
  keyof typeof import("./modalRoutes").MODAL_ROUTE_PRESENTATION
>;

/**
 * Navigate to a card route from outside the component tree, dismissing any
 * modal sheets that are currently on top of the root stack first. A card
 * route pushed while a modal sits below it renders as a sheet with no back
 * button (see modalRoutes.ts) — push-notification taps and alerts can land
 * at any moment, including while a modal is open.
 *
 * Returns false when the container is not ready (caller decides whether to
 * retry).
 */
export function navigateAboveModals<Name extends CardRouteName>(
  ...args: undefined extends RootStackParamList[Name]
    ? [name: Name, params?: RootStackParamList[Name]]
    : [name: Name, params: RootStackParamList[Name]]
): boolean {
  if (!navigationRef.isReady()) return false;
  const [name, params] = args;
  const state = navigationRef.getRootState();
  const modalsOnTop = state ? countModalsOnTop(state.routes) : 0;
  if (modalsOnTop > 0) {
    navigationRef.dispatch(StackActions.pop(modalsOnTop));
  }
  // The generic overloads of `navigate` don't accept a widened tuple; the
  // argument shape is already enforced by this function's signature.
  (
    navigationRef.navigate as unknown as (
      routeName: string,
      routeParams?: unknown,
    ) => void
  )(name, params);
  return true;
}
