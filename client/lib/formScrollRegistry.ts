/**
 * Pure in-memory registry backing FormScrollContext's field-level deep-link
 * pipeline. Kept in a separate file from the React context so the registry
 * semantics are testable under Vitest's node environment without dragging in
 * React Native imports.
 *
 * The Provider creates one registry instance per mount and exposes its
 * methods via React context. Field components write to the registry on
 * layout/mount and remove on unmount; the deep-link orchestration code
 * (handleEditFromSummary) reads from the registry to scroll/focus/expand.
 */

export interface FieldLayoutEntry {
  /**
   * Live measurement helper. Called by `scrollToField` to obtain a fresh Y
   * relative to scroll-content origin. We measure live (rather than caching
   * a stale Y) so the deep-link survives sibling collapses that shifted the
   * field after registration — same pattern as `scrollToSection`.
   */
  measure: (cb: (scrollContentY: number) => void) => void;
  /** Optional ID of the nearest CollapsibleFormSection ancestor. */
  parentCollapsibleId?: string;
}

export type FocusFn = () => void;
export type ExpandFn = () => void;

export interface FormScrollRegistry {
  setFieldLayout(fieldId: string, entry: FieldLayoutEntry): void;
  getFieldLayout(fieldId: string): FieldLayoutEntry | undefined;
  removeField(fieldId: string): void;

  setFieldFocusable(fieldId: string, focus: FocusFn): void;
  getFieldFocusable(fieldId: string): FocusFn | undefined;
  removeFieldFocusable(fieldId: string): void;

  setCollapsible(collapsibleId: string, expand: ExpandFn): void;
  getCollapsible(collapsibleId: string): ExpandFn | undefined;
  removeCollapsible(collapsibleId: string): void;

  /** Test-only: drop everything. */
  clear(): void;
}

export function createFormScrollRegistry(): FormScrollRegistry {
  const layouts = new Map<string, FieldLayoutEntry>();
  const focusables = new Map<string, FocusFn>();
  const collapsibles = new Map<string, ExpandFn>();

  return {
    setFieldLayout(fieldId, entry) {
      layouts.set(fieldId, entry);
    },
    getFieldLayout(fieldId) {
      return layouts.get(fieldId);
    },
    removeField(fieldId) {
      layouts.delete(fieldId);
    },
    setFieldFocusable(fieldId, focus) {
      focusables.set(fieldId, focus);
    },
    getFieldFocusable(fieldId) {
      return focusables.get(fieldId);
    },
    removeFieldFocusable(fieldId) {
      focusables.delete(fieldId);
    },
    setCollapsible(collapsibleId, expand) {
      collapsibles.set(collapsibleId, expand);
    },
    getCollapsible(collapsibleId) {
      return collapsibles.get(collapsibleId);
    },
    removeCollapsible(collapsibleId) {
      collapsibles.delete(collapsibleId);
    },
    clear() {
      layouts.clear();
      focusables.clear();
      collapsibles.clear();
    },
  };
}
