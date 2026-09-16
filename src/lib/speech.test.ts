import { describe, expect, it, vi, afterEach } from "vitest";
import { speak } from "./speech";

describe("speak", () => {
  const originalSpeechSynthesis = (
    window as unknown as { speechSynthesis?: unknown }
  ).speechSynthesis;
  const originalUtterance = (
    globalThis as unknown as { SpeechSynthesisUtterance?: unknown }
  ).SpeechSynthesisUtterance;

  afterEach(() => {
    (window as unknown as { speechSynthesis?: unknown }).speechSynthesis =
      originalSpeechSynthesis;
    (
      globalThis as unknown as { SpeechSynthesisUtterance?: unknown }
    ).SpeechSynthesisUtterance = originalUtterance;
    vi.restoreAllMocks();
  });

  it("does not throw when window.speechSynthesis is undefined", () => {
    delete (window as unknown as { speechSynthesis?: unknown })
      .speechSynthesis;
    delete (globalThis as unknown as { SpeechSynthesisUtterance?: unknown })
      .SpeechSynthesisUtterance;

    expect(() => speak("hello")).not.toThrow();
  });

  it("does not throw when the underlying speak call itself throws", () => {
    (
      globalThis as unknown as { SpeechSynthesisUtterance?: unknown }
    ).SpeechSynthesisUtterance = vi.fn(function (this: { text: string }, text: string) {
      this.text = text;
    });
    (window as unknown as { speechSynthesis?: unknown }).speechSynthesis = {
      speak: vi.fn(() => {
        throw new Error("permission denied");
      }),
    };

    expect(() => speak("hello")).not.toThrow();
  });

  it("calls speechSynthesis.speak when available", () => {
    const speakMock = vi.fn();
    (
      globalThis as unknown as { SpeechSynthesisUtterance?: unknown }
    ).SpeechSynthesisUtterance = vi.fn(function (this: { text: string }, text: string) {
      this.text = text;
    });
    (window as unknown as { speechSynthesis?: unknown }).speechSynthesis = {
      speak: speakMock,
    };

    speak("hello");

    expect(speakMock).toHaveBeenCalledTimes(1);
  });
});
