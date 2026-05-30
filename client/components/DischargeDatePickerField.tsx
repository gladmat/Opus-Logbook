import React from "react";
import { DatePickerField } from "@/components/FormField";
import { notFutureMax } from "@/lib/dateBounds";

interface DischargeDatePickerFieldProps {
  /** Canonical YYYY-MM-DD date-only value. */
  value: string;
  onChange: (value: string) => void;
  label?: string;
  testID?: string;
}

/**
 * Discharge date picker shared by the dashboard and Needs-Attention discharge
 * modals. Wraps the standard inline `DatePickerField` so both surfaces use the
 * same calendar UX as the rest of the app (instead of a raw native spinner) and
 * share a single "not in the future" bound.
 */
export function DischargeDatePickerField({
  value,
  onChange,
  label = "Discharge Date",
  testID,
}: DischargeDatePickerFieldProps) {
  return (
    <DatePickerField
      label={label}
      value={value}
      onChange={onChange}
      maximumDate={notFutureMax()}
      testID={testID}
    />
  );
}
