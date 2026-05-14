import { describe, expect, it, vi } from "vitest";

import {
  createFormScrollRegistry,
  type FieldLayoutEntry,
} from "@/lib/formScrollRegistry";

const noopMeasure = () => {};

const layoutEntry = (
  overrides: Partial<FieldLayoutEntry> = {},
): FieldLayoutEntry => ({
  measure: noopMeasure,
  ...overrides,
});

describe("formScrollRegistry", () => {
  describe("field layouts", () => {
    it("stores and retrieves a field entry", () => {
      const r = createFormScrollRegistry();
      const measure = vi.fn();
      r.setFieldLayout("patientIdentifier", { measure });

      const entry = r.getFieldLayout("patientIdentifier");
      expect(entry).toBeDefined();
      expect(entry?.measure).toBe(measure);
      expect(entry?.parentCollapsibleId).toBeUndefined();
    });

    it("captures parent collapsible id when supplied", () => {
      const r = createFormScrollRegistry();
      r.setFieldLayout(
        "asaScore",
        layoutEntry({ parentCollapsibleId: "operativePatientFactors" }),
      );

      expect(r.getFieldLayout("asaScore")?.parentCollapsibleId).toBe(
        "operativePatientFactors",
      );
    });

    it("overwrites the prior entry on subsequent set (re-register on layout)", () => {
      const r = createFormScrollRegistry();
      const first = vi.fn();
      const second = vi.fn();
      r.setFieldLayout("procedureDate", { measure: first });
      r.setFieldLayout("procedureDate", { measure: second });

      expect(r.getFieldLayout("procedureDate")?.measure).toBe(second);
    });

    it("removes a field by id", () => {
      const r = createFormScrollRegistry();
      r.setFieldLayout("facility", layoutEntry());
      r.removeField("facility");
      expect(r.getFieldLayout("facility")).toBeUndefined();
    });

    it("returns undefined for an unknown fieldId", () => {
      const r = createFormScrollRegistry();
      expect(r.getFieldLayout("missing")).toBeUndefined();
    });
  });

  describe("field focusables", () => {
    it("stores and retrieves a focus callback", () => {
      const r = createFormScrollRegistry();
      const focus = vi.fn();
      r.setFieldFocusable("patientIdentifier", focus);

      r.getFieldFocusable("patientIdentifier")?.();
      expect(focus).toHaveBeenCalledTimes(1);
    });

    it("removes a focus callback", () => {
      const r = createFormScrollRegistry();
      r.setFieldFocusable("patientIdentifier", vi.fn());
      r.removeFieldFocusable("patientIdentifier");
      expect(r.getFieldFocusable("patientIdentifier")).toBeUndefined();
    });
  });

  describe("collapsibles", () => {
    it("stores and invokes an expand callback", () => {
      const r = createFormScrollRegistry();
      const expand = vi.fn();
      r.setCollapsible("operativePatientFactors", expand);

      r.getCollapsible("operativePatientFactors")?.();
      expect(expand).toHaveBeenCalledTimes(1);
    });

    it("removes a collapsible by id", () => {
      const r = createFormScrollRegistry();
      r.setCollapsible("operativePatientFactors", vi.fn());
      r.removeCollapsible("operativePatientFactors");
      expect(r.getCollapsible("operativePatientFactors")).toBeUndefined();
    });

    it("returns undefined for an unknown collapsibleId", () => {
      const r = createFormScrollRegistry();
      expect(r.getCollapsible("missing")).toBeUndefined();
    });
  });

  describe("clear", () => {
    it("drops every entry across all three maps", () => {
      const r = createFormScrollRegistry();
      r.setFieldLayout("a", layoutEntry());
      r.setFieldFocusable("a", vi.fn());
      r.setCollapsible("a", vi.fn());

      r.clear();

      expect(r.getFieldLayout("a")).toBeUndefined();
      expect(r.getFieldFocusable("a")).toBeUndefined();
      expect(r.getCollapsible("a")).toBeUndefined();
    });
  });
});
