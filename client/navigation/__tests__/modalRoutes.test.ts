import { describe, expect, it } from "vitest";

import {
  MODAL_ROUTE_NAMES,
  MODAL_ROUTE_PRESENTATION,
  countModalsOnTop,
  findCardStackedOnModal,
  isModalRoute,
} from "../modalRoutes";

const r = (...names: string[]) => names.map((name) => ({ name }));

describe("modal route registry", () => {
  it("CaseSearch is a plain push — it pushes CaseDetail and must never be a modal", () => {
    expect(isModalRoute("CaseSearch")).toBe(false);
    expect(MODAL_ROUTE_NAMES).not.toContain("CaseSearch");
  });

  it("every registered modal has a modal presentation", () => {
    for (const name of MODAL_ROUTE_NAMES) {
      expect(["modal", "fullScreenModal"]).toContain(
        MODAL_ROUTE_PRESENTATION[name],
      );
    }
  });
});

describe("findCardStackedOnModal", () => {
  it("is null for a healthy stack (cards only, or modals only on top)", () => {
    expect(findCardStackedOnModal(r("Main", "CaseDetail"))).toBeNull();
    expect(
      findCardStackedOnModal(r("Main", "CaseDetail", "AddTimelineEvent")),
    ).toBeNull();
    expect(
      findCardStackedOnModal(
        r("Main", "AddTimelineEvent", "AddOperativeMedia"),
      ),
    ).toBeNull();
  });

  it("flags the first card pushed above a modal (the no-back-button case)", () => {
    expect(
      findCardStackedOnModal(
        r("Main", "AddTimelineEvent", "CaseDetail", "Assessment"),
      ),
    ).toEqual({ card: "CaseDetail", modal: "AddTimelineEvent" });
  });

  it("is null after a replace removed the modal", () => {
    expect(findCardStackedOnModal(r("Main", "Inbox", "CaseDetail"))).toBeNull();
  });
});

describe("countModalsOnTop", () => {
  it("counts only the trailing modal run", () => {
    expect(countModalsOnTop(r("Main"))).toBe(0);
    expect(countModalsOnTop(r("Main", "AddTimelineEvent"))).toBe(1);
    expect(
      countModalsOnTop(r("Main", "AddTimelineEvent", "AddOperativeMedia")),
    ).toBe(2);
    expect(countModalsOnTop(r("Main", "AddTimelineEvent", "CaseDetail"))).toBe(
      0,
    );
    expect(countModalsOnTop([])).toBe(0);
  });
});
