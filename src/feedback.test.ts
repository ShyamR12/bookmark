import { describe, expect, it } from "vitest";
import { feedbackUrl } from "./feedback";

describe("feedbackUrl", () => {
  it("opens a Gmail compose window addressed to the feedback inbox", () => {
    expect(feedbackUrl("0.1.0")).toBe(
      "https://mail.google.com/mail/?view=cm&fs=1&to=shyamrandar12%40gmail.com&su=Feedback%3A%20bookmarkit_0.1.0"
    );
  });
});
