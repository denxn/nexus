import { describe, expect, test, vi } from "vitest";
import { showSystemNotice } from "./notify";

describe("showSystemNotice", () => {
  test("does not throw when the platform forbids new Notification (Chrome on Android)", () => {
    const Throwing = Object.assign(
      function () {
        throw new TypeError("Illegal constructor");
      },
      { permission: "granted" },
    );
    expect(showSystemNotice(Throwing as never, "Study group", "Starts at 09:30", "k")).toBe(false);
  });

  test("shows nothing without permission", () => {
    const ctor = Object.assign(vi.fn(), { permission: "default" });
    expect(showSystemNotice(ctor as never, "t", "b", "k")).toBe(false);
    expect(ctor).not.toHaveBeenCalled();
  });

  test("shows a notification when permitted", () => {
    const ctor = Object.assign(vi.fn(), { permission: "granted" });
    expect(showSystemNotice(ctor as never, "t", "b", "k")).toBe(true);
    expect(ctor).toHaveBeenCalledWith("t", { body: "b", tag: "k" });
  });
});
