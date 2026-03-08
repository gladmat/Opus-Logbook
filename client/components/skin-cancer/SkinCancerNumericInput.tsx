import React, { forwardRef, useEffect, useState } from "react";
import { TextInput, type TextInputProps } from "react-native";

interface SkinCancerNumericInputProps
  extends Omit<TextInputProps, "value" | "onChangeText"> {
  value?: number;
  onValueChange: (value: number | undefined) => void;
  integer?: boolean;
}

function sanitizeNumericDraft(input: string, integer: boolean): string {
  let draft = "";
  let hasDecimalSeparator = false;

  for (const char of input.replace(/\s+/g, "")) {
    if (char >= "0" && char <= "9") {
      draft += char;
      continue;
    }

    if (!integer && (char === "." || char === ",") && !hasDecimalSeparator) {
      draft += ".";
      hasDecimalSeparator = true;
    }
  }

  return draft;
}

function parseNumericDraft(
  draft: string,
  integer: boolean,
): number | undefined {
  if (!draft || draft === ".") {
    return undefined;
  }

  const parsed = integer
    ? Number.parseInt(draft, 10)
    : Number.parseFloat(draft);

  return Number.isNaN(parsed) ? undefined : parsed;
}

function formatNumericValue(
  value: number | undefined,
  integer: boolean,
): string {
  if (value === undefined) {
    return "";
  }

  return integer ? String(Math.trunc(value)) : String(value);
}

export const SkinCancerNumericInput = forwardRef<
  TextInput,
  SkinCancerNumericInputProps
>(function SkinCancerNumericInput(
  {
    value,
    onValueChange,
    integer = false,
    onBlur,
    onFocus,
    ...textInputProps
  },
  ref,
) {
  const [draft, setDraft] = useState(() => formatNumericValue(value, integer));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDraft(formatNumericValue(value, integer));
    }
  }, [integer, isFocused, value]);

  return (
    <TextInput
      ref={ref}
      {...textInputProps}
      value={draft}
      onChangeText={(nextText) => {
        const nextDraft = sanitizeNumericDraft(nextText, integer);
        setDraft(nextDraft);
        onValueChange(parseNumericDraft(nextDraft, integer));
      }}
      onFocus={(event) => {
        setIsFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setIsFocused(false);
        const parsed = parseNumericDraft(draft, integer);
        setDraft(formatNumericValue(parsed, integer));
        onValueChange(parsed);
        onBlur?.(event);
      }}
    />
  );
});
