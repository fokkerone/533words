import { describe, expect, it, vi, afterEach } from "vitest";
import { speak } from "./speech";

type MockVoice = { lang: string; name: string };

function makeUtteranceMock() {
  return vi.fn(function (
    this: { text: string; voice?: MockVoice; rate?: number },
    text: string,
  ) {
    this.text = text;
  });
}

function makeSpeechSynthesisMock(options: {
  voices: MockVoice[];
  speak?: ReturnType<typeof vi.fn>;
  cancel?: ReturnType<typeof vi.fn>;
}) {
  const listeners: Record<string, Array<() => void>> = {};
  return {
    getVoices: vi.fn(() => options.voices),
    speak: options.speak ?? vi.fn(),
    cancel: options.cancel ?? vi.fn(),
    addEventListener: vi.fn((event: string, cb: () => void) => {
      listeners[event] = listeners[event] ?? [];
      listeners[event].push(cb);
    }),
    removeEventListener: vi.fn(),
    __fireVoicesChanged() {
      (listeners["voiceschanged"] ?? []).forEach((cb) => cb());
    },
  };
}

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

    expect(() => speak("hello", 1.0)).not.toThrow();
  });

  it("does not throw when the underlying speak call itself throws", () => {
    (
      globalThis as unknown as { SpeechSynthesisUtterance?: unknown }
    ).SpeechSynthesisUtterance = makeUtteranceMock();
    (window as unknown as { speechSynthesis?: unknown }).speechSynthesis =
      makeSpeechSynthesisMock({
        voices: [],
        speak: vi.fn(() => {
          throw new Error("permission denied");
        }),
      });

    expect(() => speak("hello", 1.0)).not.toThrow();
  });

  it("calls speechSynthesis.speak when available", () => {
    (
      globalThis as unknown as { SpeechSynthesisUtterance?: unknown }
    ).SpeechSynthesisUtterance = makeUtteranceMock();
    const mockSynth = makeSpeechSynthesisMock({ voices: [] });
    (window as unknown as { speechSynthesis?: unknown }).speechSynthesis =
      mockSynth;

    speak("hello", 1.0);

    expect(mockSynth.speak).toHaveBeenCalledTimes(1);
  });

  it("selects a German voice when present in the voice list", () => {
    (
      globalThis as unknown as { SpeechSynthesisUtterance?: unknown }
    ).SpeechSynthesisUtterance = makeUtteranceMock();
    const germanVoice: MockVoice = { lang: "de-DE", name: "German" };
    const mockSynth = makeSpeechSynthesisMock({
      voices: [
        { lang: "en-US", name: "English" },
        germanVoice,
        { lang: "fr-FR", name: "French" },
      ],
    });
    (window as unknown as { speechSynthesis?: unknown }).speechSynthesis =
      mockSynth;

    speak("hallo", 1.0);

    const utteranceInstance = mockSynth.speak.mock.calls[0][0] as {
      voice?: MockVoice;
    };
    expect(utteranceInstance.voice).toBe(germanVoice);
  });

  it("prefers de-DE over other German voices when multiple are present", () => {
    (
      globalThis as unknown as { SpeechSynthesisUtterance?: unknown }
    ).SpeechSynthesisUtterance = makeUtteranceMock();
    const deAtVoice: MockVoice = { lang: "de-AT", name: "Austrian" };
    const deDeVoice: MockVoice = { lang: "de-DE", name: "German" };
    const mockSynth = makeSpeechSynthesisMock({
      voices: [deAtVoice, deDeVoice],
    });
    (window as unknown as { speechSynthesis?: unknown }).speechSynthesis =
      mockSynth;

    speak("hallo", 1.0);

    const utteranceInstance = mockSynth.speak.mock.calls[0][0] as {
      voice?: MockVoice;
    };
    expect(utteranceInstance.voice).toBe(deDeVoice);
  });

  it("does not force a voice when no German voice is present", () => {
    (
      globalThis as unknown as { SpeechSynthesisUtterance?: unknown }
    ).SpeechSynthesisUtterance = makeUtteranceMock();
    const mockSynth = makeSpeechSynthesisMock({
      voices: [
        { lang: "en-US", name: "English" },
        { lang: "fr-FR", name: "French" },
      ],
    });
    (window as unknown as { speechSynthesis?: unknown }).speechSynthesis =
      mockSynth;

    expect(() => speak("hello", 1.0)).not.toThrow();

    const utteranceInstance = mockSynth.speak.mock.calls[0][0] as {
      voice?: MockVoice;
    };
    expect(utteranceInstance.voice).toBeUndefined();
  });

  it("calls speechSynthesis.cancel() before speak()", () => {
    (
      globalThis as unknown as { SpeechSynthesisUtterance?: unknown }
    ).SpeechSynthesisUtterance = makeUtteranceMock();
    const callOrder: string[] = [];
    const mockSynth = makeSpeechSynthesisMock({
      voices: [],
      cancel: vi.fn(() => {
        callOrder.push("cancel");
      }),
      speak: vi.fn(() => {
        callOrder.push("speak");
      }),
    });
    (window as unknown as { speechSynthesis?: unknown }).speechSynthesis =
      mockSynth;

    speak("hello", 1.0);

    expect(mockSynth.cancel).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(["cancel", "speak"]);
  });

  it("applies the configured rate to the utterance", () => {
    (
      globalThis as unknown as { SpeechSynthesisUtterance?: unknown }
    ).SpeechSynthesisUtterance = makeUtteranceMock();
    const mockSynth = makeSpeechSynthesisMock({ voices: [] });
    (window as unknown as { speechSynthesis?: unknown }).speechSynthesis =
      mockSynth;

    speak("hello", 1.25);

    const utteranceInstance = mockSynth.speak.mock.calls[0][0] as {
      rate?: number;
    };
    expect(utteranceInstance.rate).toBe(1.25);
  });

  it("selects the correct voice once voiceschanged fires after an initially empty list", () => {
    (
      globalThis as unknown as { SpeechSynthesisUtterance?: unknown }
    ).SpeechSynthesisUtterance = makeUtteranceMock();
    const germanVoice: MockVoice = { lang: "de-DE", name: "German" };
    const mockSynth = makeSpeechSynthesisMock({ voices: [] });
    (window as unknown as { speechSynthesis?: unknown }).speechSynthesis =
      mockSynth;

    // First call: voice list is empty.
    speak("hello", 1.0);
    const firstUtterance = mockSynth.speak.mock.calls[0][0] as {
      voice?: MockVoice;
    };
    expect(firstUtterance.voice).toBeUndefined();

    // Voice list becomes available and voiceschanged fires.
    mockSynth.getVoices.mockReturnValue([germanVoice]);
    mockSynth.__fireVoicesChanged();

    // Subsequent call should use the correctly selected voice.
    speak("hello again", 1.0);
    const secondUtterance = mockSynth.speak.mock.calls[1][0] as {
      voice?: MockVoice;
    };
    expect(secondUtterance.voice).toBe(germanVoice);
  });
});
