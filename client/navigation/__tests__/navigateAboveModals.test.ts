import { beforeEach, describe, expect, it, vi } from "vitest";

const ref = {
  isReady: vi.fn(() => true),
  getRootState: vi.fn(() => ({ routes: [{ name: "Main" }] })),
  dispatch: vi.fn(),
  navigate: vi.fn(),
};

vi.mock("@react-navigation/native", () => ({
  createNavigationContainerRef: () => ref,
  StackActions: {
    pop: (count: number) => ({ type: "POP", payload: { count } }),
  },
}));

const { navigateAboveModals } = await import("../navigationRef");

describe("navigateAboveModals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ref.isReady.mockReturnValue(true);
    ref.getRootState.mockReturnValue({ routes: [{ name: "Main" }] });
  });

  it("navigates directly when no modal is on top", () => {
    expect(navigateAboveModals("SharedInbox")).toBe(true);
    expect(ref.dispatch).not.toHaveBeenCalled();
    expect(ref.navigate).toHaveBeenCalledWith("SharedInbox", undefined);
  });

  it("pops every trailing modal before navigating", () => {
    ref.getRootState.mockReturnValue({
      routes: [
        { name: "Main" },
        { name: "CaseDetail" },
        { name: "AddTimelineEvent" },
        { name: "AddOperativeMedia" },
      ],
    });
    expect(
      navigateAboveModals("Assessment", { sharedCaseId: "s1" } as never),
    ).toBe(true);
    expect(ref.dispatch).toHaveBeenCalledWith({
      type: "POP",
      payload: { count: 2 },
    });
    expect(ref.navigate).toHaveBeenCalledWith("Assessment", {
      sharedCaseId: "s1",
    });
    expect(ref.dispatch.mock.invocationCallOrder[0]).toBeLessThan(
      ref.navigate.mock.invocationCallOrder[0]!,
    );
  });

  it("is a no-op when the container is not ready", () => {
    ref.isReady.mockReturnValue(false);
    expect(navigateAboveModals("SharedInbox")).toBe(false);
    expect(ref.navigate).not.toHaveBeenCalled();
  });
});
