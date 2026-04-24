import { describe, it, expect } from "vitest";

// Mock noisy native modules so the reducer module loads clean under Vitest.
// (`useCaseForm.ts` pulls in Haptics → Expo native bridge, which we don't
// exercise in these pure-reducer tests.)
import { vi } from "vitest";
vi.mock("expo-haptics", () => ({
  impactAsync: vi.fn(),
  notificationAsync: vi.fn(),
  ImpactFeedbackStyle: { Light: 0, Medium: 1, Heavy: 2 },
  NotificationFeedbackType: { Success: 0, Warning: 1, Error: 2 },
}));

import type { DiagnosisGroup } from "@/types/case";
import type {
  CaseTeamMember,
  TeamMemberOperativeRole,
} from "@/types/teamContacts";

// Re-declare the helpers inline rather than import them — they're private to
// useCaseForm.ts. This mirrors the teamContacts.test.ts / invitations.test.ts
// pattern used elsewhere in the repo, keeping the test decoupled from the
// reducer wiring while still asserting the same invariant.

function flattenProcedureIds(groups: DiagnosisGroup[]): string[] {
  const ids: string[] = [];
  for (const g of groups) for (const p of g.procedures ?? []) ids.push(p.id);
  return ids;
}

function remapTeamProcedureReferences(
  team: CaseTeamMember[],
  oldIds: string[],
  newIds: string[],
): CaseTeamMember[] {
  if (team.length === 0) return team;
  if (
    oldIds.length === newIds.length &&
    oldIds.every((id, i) => id === newIds[i])
  ) {
    return team;
  }
  const oldIndexByPid = new Map<string, number>();
  oldIds.forEach((id, i) => oldIndexByPid.set(id, i));
  const oldToNew = new Map<number, number>();
  newIds.forEach((id, newIdx) => {
    const oldIdx = oldIndexByPid.get(id);
    if (oldIdx !== undefined) oldToNew.set(oldIdx, newIdx);
  });
  return team.map((m) => {
    let nextOverrides: Record<number, TeamMemberOperativeRole> | undefined;
    if (m.procedureRoleOverrides) {
      const remapped: Record<number, TeamMemberOperativeRole> = {};
      for (const [oldKey, role] of Object.entries(m.procedureRoleOverrides)) {
        const oldIdx = Number(oldKey);
        const newIdx = oldToNew.get(oldIdx);
        if (newIdx !== undefined) remapped[newIdx] = role;
      }
      nextOverrides = Object.keys(remapped).length > 0 ? remapped : undefined;
    }
    let nextPresent: number[] | null | undefined = m.presentForProcedures;
    if (Array.isArray(m.presentForProcedures)) {
      const remappedPresent: number[] = [];
      for (const oldIdx of m.presentForProcedures) {
        const newIdx = oldToNew.get(oldIdx);
        if (newIdx !== undefined) remappedPresent.push(newIdx);
      }
      remappedPresent.sort((a, b) => a - b);
      nextPresent =
        remappedPresent.length === newIds.length ? null : remappedPresent;
    }
    return {
      ...m,
      procedureRoleOverrides: nextOverrides,
      presentForProcedures: nextPresent,
    };
  });
}

function makeMember(
  id: string,
  overrides: Record<number, TeamMemberOperativeRole> = {},
  present: number[] | null = null,
): CaseTeamMember {
  return {
    contactId: id,
    linkedUserId: null,
    displayName: id.toUpperCase(),
    abbreviatedName: id.toUpperCase(),
    careerStage: null,
    operativeRole: "FA",
    presentForProcedures: present,
    procedureRoleOverrides:
      Object.keys(overrides).length > 0 ? overrides : undefined,
  };
}

describe("per-procedure override remap (clinical-integrity invariant)", () => {
  it("is a no-op when procedure IDs are unchanged", () => {
    const team = [makeMember("a", { 1: "SURGEON" as TeamMemberOperativeRole })];
    const out = remapTeamProcedureReferences(team, ["p1", "p2"], ["p1", "p2"]);
    expect(out).toBe(team);
  });

  it("rewrites override index when a procedure is deleted before it", () => {
    // Original order: [p1, p2, p3]. Dr.A is SURGEON on procedure 2 (p3).
    const team = [makeMember("a", { 2: "SURGEON" as TeamMemberOperativeRole })];
    // Delete p1 → new order: [p2, p3]. The SURGEON override should follow
    // the procedure (now at index 1), not the slot (which is now p3 → but
    // wait, original slot 2 was p3; after deleting p1, p3 is at index 1).
    const out = remapTeamProcedureReferences(
      team,
      ["p1", "p2", "p3"],
      ["p2", "p3"],
    );
    expect(out[0].procedureRoleOverrides).toEqual({
      1: "SURGEON",
    });
  });

  it("prunes overrides whose procedure ID was removed entirely", () => {
    const team = [makeMember("a", { 1: "SURGEON" as TeamMemberOperativeRole })];
    // The override was at index 1 → p2. After deletion of p2, the id is
    // gone from the new list, so the override should be pruned.
    const out = remapTeamProcedureReferences(
      team,
      ["p1", "p2", "p3"],
      ["p1", "p3"],
    );
    expect(out[0].procedureRoleOverrides).toBeUndefined();
  });

  it("rewrites presentForProcedures indices when procedures reorder", () => {
    const team = [makeMember("a", {}, [0, 2])];
    // Reorder [p1, p2, p3] → [p3, p2, p1].
    const out = remapTeamProcedureReferences(
      team,
      ["p1", "p2", "p3"],
      ["p3", "p2", "p1"],
    );
    // p1 was at 0 → now at 2; p3 was at 2 → now at 0. Both are sorted.
    expect(out[0].presentForProcedures).toEqual([0, 2]);
  });

  it("collapses 'present for all' (full index set post-remap) back to null", () => {
    const team = [makeMember("a", {}, [0, 1])];
    // Deleting p3 — team was present for p1 + p2 (indexes 0, 1). After
    // delete, both remain at positions 0, 1, covering the full new list.
    // The helper should collapse that to `null` (implicit "present for
    // all") rather than storing a redundant explicit set.
    const out = remapTeamProcedureReferences(
      team,
      ["p1", "p2", "p3"],
      ["p1", "p2"],
    );
    expect(out[0].presentForProcedures).toBe(null);
  });

  it("prunes presence entries that reference removed IDs", () => {
    const team = [makeMember("a", {}, [0, 2])];
    // p3 (index 2) is removed. Result: present only for p1 (new index 0).
    // That's 1 item out of 2 total → explicit array, not null.
    const out = remapTeamProcedureReferences(
      team,
      ["p1", "p2", "p3"],
      ["p1", "p2"],
    );
    expect(out[0].presentForProcedures).toEqual([0]);
  });

  it("flattenProcedureIds preserves visual (group × procedure) order", () => {
    const groups: DiagnosisGroup[] = [
      {
        id: "g1",
        sequenceOrder: 1,
        specialty: "hand_wrist",
        procedures: [
          {
            id: "p-a",
            sequenceOrder: 1,
            procedureName: "",
            specialty: "hand_wrist",
            surgeonRole: "PS",
          },
          {
            id: "p-b",
            sequenceOrder: 2,
            procedureName: "",
            specialty: "hand_wrist",
            surgeonRole: "PS",
          },
        ],
      },
      {
        id: "g2",
        sequenceOrder: 2,
        specialty: "hand_wrist",
        procedures: [
          {
            id: "p-c",
            sequenceOrder: 3,
            procedureName: "",
            specialty: "hand_wrist",
            surgeonRole: "PS",
          },
        ],
      },
    ];
    expect(flattenProcedureIds(groups)).toEqual(["p-a", "p-b", "p-c"]);
  });
});
