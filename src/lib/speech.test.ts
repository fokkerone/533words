import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { listGermanVoices, speak } from "./speech";

type MockVoice = { lang: string; name: string; voiceURI?: string };

function makeUtteranceMock() {
  return vi.fn(function (
    this: { text: string; voice?: MockVoice; rate?: number },
    text: string,
  ) {
    this.text = text;
  });
}

type MockUtteranceInstance = {
  text: string;
  voice?: MockVoice;
  rate?: number;
  onboundary?: (event: { name: string; charIndex: number; charLength?: number }) => void;
  onend?: () => void;
  onerror?: () => void;
};

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

  it("prefers a voice named 'Google Deutsch' over de-DE and any other German voice", () => {
    (
      globalThis as unknown as { SpeechSynthesisUtterance?: unknown }
    ).SpeechSynthesisUtterance = makeUtteranceMock();
    const deDeVoice: MockVoice = { lang: "de-DE", name: "Anna" };
    const googleVoice: MockVoice = { lang: "de-DE", name: "Google Deutsch" };
    const deAtVoice: MockVoice = { lang: "de-AT", name: "Austrian" };
    const mockSynth = makeSpeechSynthesisMock({
      voices: [deAtVoice, deDeVoice, googleVoice],
    });
    (window as unknown as { speechSynthesis?: unknown }).speechSynthesis =
      mockSynth;

    speak("hallo", 1.0);

    const utteranceInstance = mockSynth.speak.mock.calls[0][0] as {
      voice?: MockVoice;
    };
    expect(utteranceInstance.voice).toBe(googleVoice);
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

  it("selects the correct voice once the list finishes loading after an initially empty result", () => {
    // Some browsers (notably Chrome) return an empty voice list from the
    // first getVoices() call, populating it asynchronously afterward.
    // speak() re-reads getVoices() fresh on every call rather than caching
    // it, so a later call naturally picks up the now-populated list without
    // needing to listen for the voiceschanged event.
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

    // Voice list finishes loading.
    mockSynth.getVoices.mockReturnValue([germanVoice]);

    // Subsequent call should use the correctly selected voice.
    speak("hello again", 1.0);
    const secondUtterance = mockSynth.speak.mock.calls[1][0] as {
      voice?: MockVoice;
    };
    expect(secondUtterance.voice).toBe(germanVoice);
  });

  it("uses the explicitly requested voice when its voiceURI matches an available voice", () => {
    (
      globalThis as unknown as { SpeechSynthesisUtterance?: unknown }
    ).SpeechSynthesisUtterance = makeUtteranceMock();
    const deDeVoice: MockVoice = {
      lang: "de-DE",
      name: "German",
      voiceURI: "de-DE-voice",
    };
    const deAtVoice: MockVoice = {
      lang: "de-AT",
      name: "Austrian",
      voiceURI: "de-AT-voice",
    };
    const mockSynth = makeSpeechSynthesisMock({
      voices: [deDeVoice, deAtVoice],
    });
    (window as unknown as { speechSynthesis?: unknown }).speechSynthesis =
      mockSynth;

    // Explicitly request the non-preferred (de-AT) voice — it should win
    // over the automatic de-DE preference.
    speak("hallo", 1.0, "de-AT-voice");

    const utteranceInstance = mockSynth.speak.mock.calls[0][0] as {
      voice?: MockVoice;
    };
    expect(utteranceInstance.voice).toBe(deAtVoice);
  });

  it("falls back to automatic selection when the requested voiceURI is not found", () => {
    (
      globalThis as unknown as { SpeechSynthesisUtterance?: unknown }
    ).SpeechSynthesisUtterance = makeUtteranceMock();
    const deDeVoice: MockVoice = {
      lang: "de-DE",
      name: "German",
      voiceURI: "de-DE-voice",
    };
    const mockSynth = makeSpeechSynthesisMock({ voices: [deDeVoice] });
    (window as unknown as { speechSynthesis?: unknown }).speechSynthesis =
      mockSynth;

    speak("hallo", 1.0, "some-voice-uri-that-no-longer-exists");

    const utteranceInstance = mockSynth.speak.mock.calls[0][0] as {
      voice?: MockVoice;
    };
    expect(utteranceInstance.voice).toBe(deDeVoice);
  });

  it("falls back to automatic selection when no voiceURI is given (undefined or null)", () => {
    (
      globalThis as unknown as { SpeechSynthesisUtterance?: unknown }
    ).SpeechSynthesisUtterance = makeUtteranceMock();
    const deDeVoice: MockVoice = {
      lang: "de-DE",
      name: "German",
      voiceURI: "de-DE-voice",
    };
    const mockSynth = makeSpeechSynthesisMock({ voices: [deDeVoice] });
    (window as unknown as { speechSynthesis?: unknown }).speechSynthesis =
      mockSynth;

    speak("hallo", 1.0, null);

    const utteranceInstance = mockSynth.speak.mock.calls[0][0] as {
      voice?: MockVoice;
    };
    expect(utteranceInstance.voice).toBe(deDeVoice);
  });

  it("calls onBoundary with the word being spoken when a word boundary fires", () => {
    (
      globalThis as unknown as { SpeechSynthesisUtterance?: unknown }
    ).SpeechSynthesisUtterance = makeUtteranceMock();
    const mockSynth = makeSpeechSynthesisMock({ voices: [] });
    (window as unknown as { speechSynthesis?: unknown }).speechSynthesis =
      mockSynth;
    const onBoundary = vi.fn();

    speak("hallo welt", 1.0, null, { onBoundary });

    const utteranceInstance = mockSynth.speak.mock
      .calls[0][0] as MockUtteranceInstance;
    utteranceInstance.onboundary?.({ name: "word", charIndex: 6, charLength: 4 });

    expect(onBoundary).toHaveBeenCalledWith("welt");
  });

  it("does not call onBoundary for a non-word boundary (e.g. sentence)", () => {
    (
      globalThis as unknown as { SpeechSynthesisUtterance?: unknown }
    ).SpeechSynthesisUtterance = makeUtteranceMock();
    const mockSynth = makeSpeechSynthesisMock({ voices: [] });
    (window as unknown as { speechSynthesis?: unknown }).speechSynthesis =
      mockSynth;
    const onBoundary = vi.fn();

    speak("hallo welt", 1.0, null, { onBoundary });

    const utteranceInstance = mockSynth.speak.mock
      .calls[0][0] as MockUtteranceInstance;
    utteranceInstance.onboundary?.({ name: "sentence", charIndex: 0 });

    expect(onBoundary).not.toHaveBeenCalled();
  });

  it("calls onEnd when the utterance finishes", () => {
    (
      globalThis as unknown as { SpeechSynthesisUtterance?: unknown }
    ).SpeechSynthesisUtterance = makeUtteranceMock();
    const mockSynth = makeSpeechSynthesisMock({ voices: [] });
    (window as unknown as { speechSynthesis?: unknown }).speechSynthesis =
      mockSynth;
    const onEnd = vi.fn();

    speak("hallo", 1.0, null, { onEnd });

    const utteranceInstance = mockSynth.speak.mock
      .calls[0][0] as MockUtteranceInstance;
    utteranceInstance.onend?.();

    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("calls onEnd when the utterance errors, so a caller's UI never gets stuck", () => {
    (
      globalThis as unknown as { SpeechSynthesisUtterance?: unknown }
    ).SpeechSynthesisUtterance = makeUtteranceMock();
    const mockSynth = makeSpeechSynthesisMock({ voices: [] });
    (window as unknown as { speechSynthesis?: unknown }).speechSynthesis =
      mockSynth;
    const onEnd = vi.fn();

    speak("hallo", 1.0, null, { onEnd });

    const utteranceInstance = mockSynth.speak.mock
      .calls[0][0] as MockUtteranceInstance;
    utteranceInstance.onerror?.();

    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("works without callbacks (backward compatible)", () => {
    (
      globalThis as unknown as { SpeechSynthesisUtterance?: unknown }
    ).SpeechSynthesisUtterance = makeUtteranceMock();
    const mockSynth = makeSpeechSynthesisMock({ voices: [] });
    (window as unknown as { speechSynthesis?: unknown }).speechSynthesis =
      mockSynth;

    expect(() => speak("hallo", 1.0)).not.toThrow();
  });

  describe("onTick", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("does not fire before the utterance starts", () => {
      (
        globalThis as unknown as { SpeechSynthesisUtterance?: unknown }
      ).SpeechSynthesisUtterance = makeUtteranceMock();
      const mockSynth = makeSpeechSynthesisMock({ voices: [] });
      (window as unknown as { speechSynthesis?: unknown }).speechSynthesis =
        mockSynth;
      const onTick = vi.fn();

      speak("hallo", 1.0, null, { onTick });
      vi.advanceTimersByTime(500);

      expect(onTick).not.toHaveBeenCalled();
    });

    it("fires repeatedly on an interval once the utterance starts, regardless of whether boundary events ever fire", () => {
      // This is the whole point of onTick: it must animate for every voice,
      // including ones (like Chrome's "Google Deutsch") that never report
      // word boundaries at all -- confirmed via manual testing that some
      // real voices fire zero `boundary` events for an entire utterance.
      (
        globalThis as unknown as { SpeechSynthesisUtterance?: unknown }
      ).SpeechSynthesisUtterance = makeUtteranceMock();
      const mockSynth = makeSpeechSynthesisMock({ voices: [] });
      (window as unknown as { speechSynthesis?: unknown }).speechSynthesis =
        mockSynth;
      const onTick = vi.fn();

      speak("hallo", 1.0, null, { onTick });
      const utteranceInstance = mockSynth.speak.mock
        .calls[0][0] as MockUtteranceInstance & { onstart?: () => void };
      utteranceInstance.onstart?.();

      vi.advanceTimersByTime(350);

      expect(onTick.mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    it("stops ticking once the utterance ends", () => {
      (
        globalThis as unknown as { SpeechSynthesisUtterance?: unknown }
      ).SpeechSynthesisUtterance = makeUtteranceMock();
      const mockSynth = makeSpeechSynthesisMock({ voices: [] });
      (window as unknown as { speechSynthesis?: unknown }).speechSynthesis =
        mockSynth;
      const onTick = vi.fn();

      speak("hallo", 1.0, null, { onTick });
      const utteranceInstance = mockSynth.speak.mock
        .calls[0][0] as MockUtteranceInstance & { onstart?: () => void };
      utteranceInstance.onstart?.();
      vi.advanceTimersByTime(150);
      const callsBeforeEnd = onTick.mock.calls.length;

      utteranceInstance.onend?.();
      vi.advanceTimersByTime(500);

      expect(onTick.mock.calls.length).toBe(callsBeforeEnd);
    });

    it("stops ticking if the utterance errors instead of ending normally", () => {
      (
        globalThis as unknown as { SpeechSynthesisUtterance?: unknown }
      ).SpeechSynthesisUtterance = makeUtteranceMock();
      const mockSynth = makeSpeechSynthesisMock({ voices: [] });
      (window as unknown as { speechSynthesis?: unknown }).speechSynthesis =
        mockSynth;
      const onTick = vi.fn();

      speak("hallo", 1.0, null, { onTick });
      const utteranceInstance = mockSynth.speak.mock
        .calls[0][0] as MockUtteranceInstance & { onstart?: () => void };
      utteranceInstance.onstart?.();
      vi.advanceTimersByTime(150);
      const callsBeforeError = onTick.mock.calls.length;

      utteranceInstance.onerror?.();
      vi.advanceTimersByTime(500);

      expect(onTick.mock.calls.length).toBe(callsBeforeError);
    });
  });
});

describe("listGermanVoices", () => {
  const originalSpeechSynthesis = (
    window as unknown as { speechSynthesis?: unknown }
  ).speechSynthesis;

  afterEach(() => {
    (window as unknown as { speechSynthesis?: unknown }).speechSynthesis =
      originalSpeechSynthesis;
    vi.restoreAllMocks();
  });

  it("returns only voices whose lang starts with de", () => {
    const deDeVoice: MockVoice = { lang: "de-DE", name: "German" };
    const deAtVoice: MockVoice = { lang: "de-AT", name: "Austrian" };
    const mockSynth = makeSpeechSynthesisMock({
      voices: [
        { lang: "en-US", name: "English" },
        deDeVoice,
        deAtVoice,
        { lang: "fr-FR", name: "French" },
      ],
    });
    (window as unknown as { speechSynthesis?: unknown }).speechSynthesis =
      mockSynth;

    expect(listGermanVoices()).toEqual([deDeVoice, deAtVoice]);
  });

  it("returns an empty array when speechSynthesis is unavailable", () => {
    delete (window as unknown as { speechSynthesis?: unknown })
      .speechSynthesis;

    expect(listGermanVoices()).toEqual([]);
  });

  it("returns an empty array when no German voices are present", () => {
    const mockSynth = makeSpeechSynthesisMock({
      voices: [{ lang: "en-US", name: "English" }],
    });
    (window as unknown as { speechSynthesis?: unknown }).speechSynthesis =
      mockSynth;

    expect(listGermanVoices()).toEqual([]);
  });
});
