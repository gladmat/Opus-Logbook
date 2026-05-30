import { describe, it, expect } from "vitest";
import {
  timeToMinutes,
  validateDateFieldInline,
  procedureBeforeDobMessage,
  getDateHardBlockErrors,
  getDateWarnings,
  type CaseDateFields,
} from "@/lib/caseFormDateChecks";
import { toIsoDateValue } from "@/lib/dateValues";

function fields(overrides: Partial<CaseDateFields> = {}): CaseDateFields {
  return {
    patientDateOfBirth: "",
    procedureDate: "2026-05-01",
    admissionDate: "",
    dischargeDate: "",
    injuryDate: "",
    surgeryStartTime: "",
    surgeryEndTime: "",
    ...overrides,
  };
}

function futureDob(): string {
  return toIsoDateValue(new Date(new Date().getFullYear() + 1, 0, 1));
}

describe("timeToMinutes", () => {
  it("parses valid HH:MM", () => {
    expect(timeToMinutes("08:30")).toBe(510);
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("23:59")).toBe(1439);
  });

  it("rejects out-of-range and malformed values", () => {
    expect(timeToMinutes("25:00")).toBeNull();
    expect(timeToMinutes("08:60")).toBeNull();
    expect(timeToMinutes("")).toBeNull();
    expect(timeToMinutes("8")).toBeNull(); // partial entry (no colon)
    expect(timeToMinutes("ab:cd")).toBeNull();
  });
});

describe("getDateHardBlockErrors", () => {
  const codes = (f: CaseDateFields) =>
    getDateHardBlockErrors(f).map((e) => e.message);

  it("clean fields produce no errors", () => {
    expect(getDateHardBlockErrors(fields())).toEqual([]);
  });

  it("blocks a future date of birth", () => {
    expect(codes(fields({ patientDateOfBirth: futureDob() }))).toContain(
      "Date of birth cannot be in the future",
    );
  });

  it("blocks procedure before DOB", () => {
    expect(
      codes(
        fields({
          patientDateOfBirth: "2026-05-02",
          procedureDate: "2026-05-01",
        }),
      ),
    ).toContain("Procedure date cannot be before the patient's date of birth");
  });

  it("blocks discharge before admission", () => {
    expect(
      codes(
        fields({ admissionDate: "2026-05-02", dischargeDate: "2026-05-01" }),
      ),
    ).toContain("Discharge date cannot be before admission date");
  });

  it("blocks injury after procedure", () => {
    expect(
      codes(fields({ procedureDate: "2026-05-01", injuryDate: "2026-05-02" })),
    ).toContain("Injury date cannot be after the procedure date");
  });

  it("blocks zero-length surgery", () => {
    expect(
      codes(fields({ surgeryStartTime: "08:30", surgeryEndTime: "08:30" })),
    ).toContain("Surgery end time must be after start time");
  });

  it("does not block an overnight case", () => {
    expect(
      codes(fields({ surgeryStartTime: "23:30", surgeryEndTime: "01:15" })),
    ).not.toContain("Surgery end time must be after start time");
  });

  it("accepts a same-day procedure (timezone-safe)", () => {
    expect(
      getDateHardBlockErrors(
        fields({ procedureDate: toIsoDateValue(new Date()) }),
      ),
    ).toEqual([]);
  });
});

describe("getDateWarnings", () => {
  const codes = (f: CaseDateFields) => getDateWarnings(f).map((e) => e.message);

  it("clean fields produce no warnings", () => {
    expect(getDateWarnings(fields())).toEqual([]);
  });

  it("warns on implausibly high age", () => {
    expect(
      codes(
        fields({
          patientDateOfBirth: "1850-01-01",
          procedureDate: "2026-05-01",
        }),
      ).some((m) => m.startsWith("Patient age")),
    ).toBe(true);
  });

  it("warns when admission is after procedure", () => {
    expect(
      codes(
        fields({ admissionDate: "2026-05-05", procedureDate: "2026-05-01" }),
      ),
    ).toContain("Admission date is after the procedure date — please confirm");
  });

  it("warns when discharge set without admission", () => {
    expect(codes(fields({ dischargeDate: "2026-05-03" }))).toContain(
      "Discharge date set without an admission date",
    );
  });

  it("warns on length of stay over one year", () => {
    expect(
      codes(
        fields({ admissionDate: "2024-01-01", dischargeDate: "2026-05-01" }),
      ),
    ).toContain("Length of stay exceeds one year — please confirm dates");
  });

  it("warns (not blocks) an overnight case", () => {
    const f = fields({ surgeryStartTime: "23:30", surgeryEndTime: "01:15" });
    expect(codes(f)).toContain(
      "Surgery end time is before start time — confirm this crossed midnight",
    );
    expect(getDateHardBlockErrors(f)).toEqual([]);
  });
});

describe("validateDateFieldInline + procedureBeforeDobMessage", () => {
  it("flags a future DOB", () => {
    expect(
      validateDateFieldInline(
        "patientDateOfBirth",
        fields({ patientDateOfBirth: futureDob() }),
      ),
    ).toBe("Date of birth cannot be in the future");
  });

  it("clears once a valid past DOB is entered", () => {
    expect(
      validateDateFieldInline(
        "patientDateOfBirth",
        fields({ patientDateOfBirth: "1990-01-01" }),
      ),
    ).toBeNull();
  });

  it("flags discharge before admission inline", () => {
    expect(
      validateDateFieldInline(
        "dischargeDate",
        fields({ admissionDate: "2026-05-02", dischargeDate: "2026-05-01" }),
      ),
    ).toBe("Discharge date cannot be before admission date");
  });

  it("flags zero-length surgery inline", () => {
    expect(
      validateDateFieldInline(
        "surgeryEndTime",
        fields({ surgeryStartTime: "08:30", surgeryEndTime: "08:30" }),
      ),
    ).toBe("Surgery end time must be after start time");
  });

  it("procedureBeforeDobMessage flags and clears correctly", () => {
    expect(
      procedureBeforeDobMessage(
        fields({
          patientDateOfBirth: "2026-05-02",
          procedureDate: "2026-05-01",
        }),
      ),
    ).toBe("Procedure date cannot be before the patient's date of birth");
    expect(
      procedureBeforeDobMessage(
        fields({
          patientDateOfBirth: "1990-01-01",
          procedureDate: "2026-05-01",
        }),
      ),
    ).toBeNull();
  });
});
