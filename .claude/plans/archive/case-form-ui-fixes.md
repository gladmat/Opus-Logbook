# Case Form UI Fixes — Three Bugs

## Bug 1: "Day of Injury" shows for elective cases

### Root cause

`showInjuryDate` in `useCaseForm.ts:1473-1480` is computed as:
```ts
const showInjuryDate =
  state.admissionUrgency === "acute" ||
  state.diagnosisGroups.some(
    (g) => g.specialty === "hand_wrist" || g.specialty === "orthoplastic" || g.specialty === "peripheral_nerve",
  );
```

This shows the field for **any** hand/orthoplastic/PN case regardless of urgency. An elective Dupuytren's case has `specialty === "hand_wrist"` so the field renders.

The same logic is duplicated in `formStateToDraft()` at line 547.

### Fix

Both locations need the same change — add `admissionUrgency === "trauma"` to the condition and stop using specialty presence as a proxy:

```ts
const showInjuryDate =
  state.admissionUrgency === "acute" ||
  state.admissionUrgency === "trauma";
```

This is cleaner and more correct: injury date is relevant when the case is acute or trauma, period. The specialty-based heuristic was a proxy that breaks for elective cases.

The `OperativeSection.tsx:365` guard (`showInjuryDate && !hasHandTraumaGroup`) stays unchanged — it correctly hides the field when hand trauma captures injury date inside its own assessment.

### Files changed
- `client/hooks/useCaseForm.ts` — lines ~547 and ~1473

---

## Bug 2: Gender pills and Ethnicity dropdown misaligned

### Root cause

In `PatientInfoSection.tsx:246-301`, the Gender field uses an inline label:
```tsx
<ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>Gender</ThemedText>
<View style={[styles.segmentedControl, ...]}>...</View>
```

with `fieldLabel` having `marginBottom: Spacing.xs` (4px).

The Ethnicity field uses `PickerField`, which wraps itself in `styles.container` (`marginBottom: Spacing.lg` = 16px) and renders its label via `styles.labelRow` (`marginBottom: Spacing.sm` = 8px).

The mismatch:
1. Gender label has `marginBottom: 4px`, PickerField label has `marginBottom: 8px` — labels sit at different Y positions
2. Gender field has no container wrapper with bottom margin, while PickerField has `container: { marginBottom: 16px }` — different vertical footprint

### Fix

Wrap the Gender field's label+segmented control in a structure that matches PickerField's spacing. Specifically:
- Change the Gender label `marginBottom` from `Spacing.xs` (4px) to `Spacing.sm` (8px) to match PickerField's `labelRow` spacing
- Wrap the gender sub-container in a View with `marginBottom: Spacing.lg` (16px) to match PickerField's container margin

Simplest approach: replace the inline Gender label style with the same spacing PickerField uses:

```tsx
<View style={styles.halfField}>
  <View style={{ marginBottom: Spacing.lg }}>
    <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary, marginBottom: Spacing.sm }]}>
      Gender
    </ThemedText>
    <View style={[styles.segmentedControl, ...]}>...</View>
  </View>
</View>
```

Or more cleanly: add a `genderContainer` style with `marginBottom: Spacing.lg` and update the `fieldLabel` marginBottom to use `Spacing.sm` instead of `Spacing.xs`.

### Files changed
- `client/components/case-form/PatientInfoSection.tsx` — Gender field wrapper + label spacing

---

## Bug 3: CollapsibleFormSection gets stuck collapsed

### Root cause

In `CollapsibleFormSection.tsx:65-79`, `handleLayout` stores any `h > 0` into `contentHeightRef.current`. During the collapse animation, the `Animated.View` shrinks via `overflow: hidden`, but the inner `<View onLayout={handleLayout}>` fires with progressively smaller heights. This overwrites `contentHeightRef.current` with near-zero values.

When the user taps to re-expand, `toggle()` animates to `contentHeightRef.current`, which is now ~0, so nothing appears.

### Fix

Change the guard in `handleLayout` from `if (h > 0)` to `if (h > 0 && (expandedRef.current || !isMeasured))`:

```tsx
const handleLayout = useCallback(
  (e: { nativeEvent: { layout: { height: number } } }) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && (expandedRef.current || !isMeasured)) {
      contentHeightRef.current = h;
      if (!isMeasured) {
        animatedHeight.value = expandedRef.current ? h : 0;
        setIsMeasured(true);
      } else if (expandedRef.current) {
        animatedHeight.value = h;
      }
    }
  },
  [animatedHeight, isMeasured],
);
```

The `expandedRef.current` check blocks collapse-animation noise. The `!isMeasured` fallthrough allows the initial hidden measurement (when `defaultExpanded={false}`) to work — that measurement fires from the offscreen `hiddenMeasurementContainer` before `isMeasured` is set to true, so it passes through.

### Files changed
- `client/components/case-form/CollapsibleFormSection.tsx` — line 68

---

## Execution order

All three fixes are independent — no dependencies between them. Execute in parallel or any order.
