import {
  getDefaultAdmissionUrgencyForHandCaseType,
  isDisposableTraumaPlaceholderProcedure,
  pruneDisposableTraumaPlaceholderProcedures,
} from "@/lib/handTraumaUx";
import type { CaseProcedure } from "@/types/case";

function createProcedure(
  overrides: Partial<CaseProcedure> = {},
): CaseProcedure {
  return {
    id: "proc-1",
    sequenceOrder: 1,
    procedureName: "",
    specialty: "hand_wrist",
    surgeonRole: "PS",
    ...overrides,
  };
}

describe("hand trauma UX helpers", () => {
  it("treats the default empty procedure row as disposable", () => {
    expect(isDisposableTraumaPlaceholderProcedure(createProcedure())).toBe(
      true,
    );
  });

  it("preserves manual procedures when they contain user-entered content", () => {
    expect(
      isDisposableTraumaPlaceholderProcedure(
        createProcedure({ notes: "Temporary spanning wire" }),
      ),
    ).toBe(false);
  });

  it("removes placeholder rows while keeping real mapped/manual procedures", () => {
    const procedures = [
      createProcedure({ id: "blank" }),
      createProcedure({
        id: "mapped",
        procedureName: "Metacarpal fracture ORIF",
        picklistEntryId: "hand_fx_metacarpal_orif",
        snomedCtCode: "309170008",
      }),
      createProcedure({
        id: "manual",
        notes: "Mini-open reduction",
      }),
    ];

    expect(
      pruneDisposableTraumaPlaceholderProcedures(procedures).map(
        (procedure) => procedure.id,
      ),
    ).toEqual(["mapped", "manual"]);
  });

  it("returns the correct admission urgency default for trauma case types", () => {
    expect(getDefaultAdmissionUrgencyForHandCaseType("trauma")).toBe("acute");
    expect(getDefaultAdmissionUrgencyForHandCaseType("elective")).toBe(
      "elective",
    );
  });
});
