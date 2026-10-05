import { describe, expect, test } from "vitest";
import { repeatLabel } from "./label";
import type { Rule } from "./rule";

const r = (over: Partial<Rule>): Rule => ({ repeat: "DAILY", interval: 1, weekdays: [], until: null, monthDay: null, ...over });

describe("repeatLabel", () => {
  test("none is empty", () => {
    expect(repeatLabel(r({ repeat: "NONE" }))).toBe("");
  });

  test("daily, weekly and monthly in plain words", () => {
    expect(repeatLabel(r({}))).toBe("Daily");
    expect(repeatLabel(r({ interval: 3 }))).toBe("Every 3 days");
    expect(repeatLabel(r({ repeat: "WEEKLY" }))).toBe("Weekly");
    expect(repeatLabel(r({ repeat: "WEEKLY", weekdays: [0, 2] }))).toBe("Weekly on Mon, Wed");
    expect(repeatLabel(r({ repeat: "WEEKLY", interval: 2 }))).toBe("Every 2 weeks");
    expect(repeatLabel(r({ repeat: "WEEKLY", interval: 2, weekdays: [4] }))).toBe("Every 2 weeks on Fri");
    expect(repeatLabel(r({ repeat: "MONTHLY" }))).toBe("Monthly");
    expect(repeatLabel(r({ repeat: "MONTHLY", interval: 3 }))).toBe("Every 3 months");
  });

  test("weekdays are listed Monday first whatever the stored order", () => {
    expect(repeatLabel(r({ repeat: "WEEKLY", weekdays: [6, 0, 2] }))).toBe("Weekly on Mon, Wed, Sun");
  });

  test("an until date is appended", () => {
    expect(repeatLabel(r({ until: "2026-11-05" }))).toBe("Daily until 5 Nov");
    expect(repeatLabel(r({ repeat: "WEEKLY", weekdays: [0], until: "2027-01-02" }))).toBe("Weekly on Mon until 2 Jan");
  });
});
