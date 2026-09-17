import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Home from "./page";
import { useWords, useFlagWord } from "@/hooks/use-words";
import { clearSession, saveSession } from "@/lib/session-storage";
import { createSessionState, flagWord, pickNextWord, type SessionState } from "@/lib/session";
import { speak, listGermanVoices } from "@/lib/speech";
import { loadSpeed, saveSpeed } from "@/lib/speech-settings";
import { loadVoiceURI, saveVoiceURI, clearVoiceURI } from "@/lib/voice-settings";
import { loadSessionSize, saveSessionSize } from "@/lib/session-size-settings";
import { loadTheme, saveTheme } from "@/lib/theme-settings";

vi.mock("@/hooks/use-words", () => ({
  useWords: vi.fn(),
  useFlagWord: vi.fn(),
}));

vi.mock("@/lib/speech", () => ({
  speak: vi.fn(),
  listGermanVoices: vi.fn(),
}));

vi.mock("@/lib/speech-settings", () => ({
  loadSpeed: vi.fn(),
  saveSpeed: vi.fn(),
}));

vi.mock("@/lib/voice-settings", () => ({
  loadVoiceURI: vi.fn(),
  saveVoiceURI: vi.fn(),
  clearVoiceURI: vi.fn(),
}));

vi.mock("@/lib/session-size-settings", () => ({
  loadSessionSize: vi.fn(),
  saveSessionSize: vi.fn(),
}));

vi.mock("@/lib/theme-settings", () => ({
  loadTheme: vi.fn(),
  saveTheme: vi.fn(),
}));

const mockedUseWords = vi.mocked(useWords);
const mockedUseFlagWord = vi.mocked(useFlagWord);
const mockedLoadSpeed = vi.mocked(loadSpeed);
const mockedSaveSpeed = vi.mocked(saveSpeed);
const mockedListGermanVoices = vi.mocked(listGermanVoices);
const mockedLoadVoiceURI = vi.mocked(loadVoiceURI);
const mockedSaveVoiceURI = vi.mocked(saveVoiceURI);
const mockedClearVoiceURI = vi.mocked(clearVoiceURI);
const mockedLoadSessionSize = vi.mocked(loadSessionSize);
const mockedSaveSessionSize = vi.mocked(saveSessionSize);
const mockedLoadTheme = vi.mocked(loadTheme);
const mockedSaveTheme = vi.mocked(saveTheme);

function makeVoice(
  overrides: Partial<SpeechSynthesisVoice> = {},
): SpeechSynthesisVoice {
  return {
    lang: "de-DE",
    name: "German",
    voiceURI: "de-DE-voice",
    default: false,
    localService: true,
    ...overrides,
  } as SpeechSynthesisVoice;
}

function makeWords(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `w${i}`,
    text: `word${i}`,
    score: 0,
  }));
}

function renderHome() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <Home />
    </QueryClientProvider>
  );
}

function setupUseWords(words: ReturnType<typeof makeWords>) {
  mockedUseWords.mockReturnValue({
    data: words,
    isLoading: false,
    isError: false,
    error: null,
  } as unknown as ReturnType<typeof useWords>);
}

describe("Home practice screen", () => {
  let mutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    document.documentElement.classList.remove("dark");
    clearSession();
    mutateAsync = vi.fn().mockResolvedValue(undefined);
    mockedUseFlagWord.mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
      error: null,
      isSuccess: false,
    } as unknown as ReturnType<typeof useFlagWord>);
    mockedLoadSpeed.mockReturnValue(1.0);
    mockedSaveSpeed.mockReset();
    mockedListGermanVoices.mockReturnValue([]);
    mockedLoadVoiceURI.mockReturnValue(null);
    mockedSaveVoiceURI.mockReset();
    mockedClearVoiceURI.mockReset();
    vi.mocked(speak).mockReset();
    mockedLoadSessionSize.mockReturnValue(24);
    mockedSaveSessionSize.mockReset();
    mockedLoadTheme.mockReturnValue("light");
    mockedSaveTheme.mockReset();
  });

  it("shows the Play control before reveal and the word text after reveal (mutually exclusive)", async () => {
    setupUseWords(makeWords(2));
    renderHome();

    const playButton = await screen.findByRole("button", { name: /^play$/i });
    expect(playButton).toBeInTheDocument();
    expect(screen.queryByText(/^word\d$/)).not.toBeInTheDocument();

    const revealButton = screen.getByRole("button", { name: /reveal/i });
    fireEvent.click(revealButton);

    expect(await screen.findByText(/^word\d$/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^play$/i })).not.toBeInTheDocument();
  });

  it("auto-advances to a new word and speaks it after flagging correct, with words remaining", async () => {
    setupUseWords(makeWords(2));
    renderHome();

    await screen.findByRole("button", { name: /^play$/i });
    fireEvent.click(screen.getByRole("button", { name: /reveal/i }));
    const firstWordText = (await screen.findByText(/^word\d$/)).textContent;

    vi.mocked(speak).mockClear();
    fireEvent.click(await screen.findByRole("button", { name: /^correct$/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ correct: true })
      );
    });

    // A new current word is presented automatically (Play control back, not
    // revealed) with no separate "next word" click.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^play$/i })).toBeInTheDocument();
    });
    expect(screen.queryByText(firstWordText!)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(speak).toHaveBeenCalledWith(expect.any(String), 1.0, null);
    });

    // The flag controls for the new (unrevealed) word are disabled again.
    expect(screen.getByRole("button", { name: /^correct$/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^incorrect$/i })).toBeDisabled();
  });

  it("auto-advances after flagging incorrect too", async () => {
    setupUseWords(makeWords(2));
    renderHome();

    await screen.findByRole("button", { name: /^play$/i });
    fireEvent.click(screen.getByRole("button", { name: /reveal/i }));
    vi.mocked(speak).mockClear();

    fireEvent.click(await screen.findByRole("button", { name: /^incorrect$/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ correct: false })
      );
    });
    await waitFor(() => {
      expect(speak).toHaveBeenCalled();
    });
  });

  it("shows session complete and does not speak again after flagging the last word", async () => {
    setupUseWords(makeWords(1));
    renderHome();

    await screen.findByRole("button", { name: /^play$/i });
    fireEvent.click(screen.getByRole("button", { name: /reveal/i }));
    vi.mocked(speak).mockClear();

    fireEvent.click(await screen.findByRole("button", { name: /^correct$/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({ wordId: "w0", correct: true });
    });

    expect(await screen.findByText(/session complete/i)).toBeInTheDocument();
    expect(speak).not.toHaveBeenCalled();
  });

  it("shows an error alert and does not auto-advance when the flag mutation fails", async () => {
    mutateAsync.mockRejectedValue(new Error("write failed"));
    setupUseWords(makeWords(2));
    renderHome();

    await screen.findByRole("button", { name: /^play$/i });
    fireEvent.click(screen.getByRole("button", { name: /reveal/i }));
    const currentWordText = (await screen.findByText(/^word\d$/)).textContent;
    vi.mocked(speak).mockClear();

    const thumbsUp = await screen.findByRole("button", { name: /^correct$/i });
    fireEvent.click(thumbsUp);

    expect(await screen.findByRole("alert")).toBeInTheDocument();

    // word should still be actionable (not flagged, not advanced) - flag
    // buttons remain enabled so the learner can retry.
    expect(screen.getByRole("button", { name: /^correct$/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /^incorrect$/i })).not.toBeDisabled();
    expect(screen.getByText(currentWordText!)).toBeInTheDocument();
    expect(speak).not.toHaveBeenCalled();
  });

  it("does not render a 'next word' control anywhere, in any session state", async () => {
    setupUseWords(makeWords(1));
    renderHome();

    await screen.findByRole("button", { name: /^play$/i });
    expect(screen.queryByRole("button", { name: /next word/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /reveal/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^correct$/i }));

    expect(await screen.findByText(/session complete/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /next word/i })).not.toBeInTheDocument();
  });

  it("shows an empty-word-bank message instead of starting a session", async () => {
    setupUseWords([]);
    renderHome();

    expect(await screen.findByText(/word bank is empty/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^play$/i })).not.toBeInTheDocument();
  });

  it("discards the in-progress session without confirmation when New Session is pressed", async () => {
    setupUseWords(makeWords(5));
    renderHome();

    await screen.findByRole("button", { name: /^play$/i });
    fireEvent.click(screen.getByRole("button", { name: /reveal/i }));
    expect(await screen.findByText(/^word\d$/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /new session/i }));

    // No confirmation dialog; the prior in-progress word is discarded and a
    // fresh session starts immediately with a new, unrevealed current word.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^play$/i })).toBeInTheDocument();
    });
  });

  it("saves to local storage only after the DB write succeeds, never before", async () => {
    const callOrder: string[] = [];
    mutateAsync.mockImplementation(async () => {
      callOrder.push("db-write");
    });
    vi.spyOn(await import("@/lib/session-storage"), "saveSession").mockImplementation(
      (() => {
        callOrder.push("local-save");
      }) as typeof saveSession
    );

    setupUseWords(makeWords(2));
    renderHome();

    await screen.findByRole("button", { name: /^play$/i });
    fireEvent.click(screen.getByRole("button", { name: /reveal/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^correct$/i }));

    await waitFor(() => {
      const flagWriteIndex = callOrder.lastIndexOf("db-write");
      const flagSaveIndex = callOrder.lastIndexOf("local-save");
      expect(flagWriteIndex).toBeGreaterThanOrEqual(0);
      expect(flagSaveIndex).toBeGreaterThan(flagWriteIndex);
    });

    vi.restoreAllMocks();
  });

  it("restores an in-progress session (current word and pool) after a reload", async () => {
    const words = makeWords(5);
    let state: SessionState = createSessionState(words, 24);
    state = pickNextWord(state);
    saveSession<SessionState>(state);
    const currentWordText = state.current!.text;

    setupUseWords(words);
    renderHome();

    // The restored word is immediately current (Play shown, Reveal enabled)
    // rather than a fresh session being auto-started.
    expect(await screen.findByRole("button", { name: /reveal/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /^play$/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /reveal/i }));
    expect(await screen.findByText(currentWordText)).toBeInTheDocument();
  });

  it("initializes the speed slider from the persisted speed, not the 1.0 default", async () => {
    mockedLoadSpeed.mockReturnValue(0.75);
    setupUseWords(makeWords(2));
    renderHome();

    const slider = await screen.findByRole("slider");
    await waitFor(() => {
      expect(slider).toHaveAttribute("aria-valuenow", "0.75");
    });
  });

  it("persists and applies a new speed when the slider is changed", async () => {
    setupUseWords(makeWords(2));
    renderHome();

    const slider = await screen.findByRole("slider");
    fireEvent.keyDown(slider, { key: "ArrowRight" });

    await waitFor(() => {
      expect(mockedSaveSpeed).toHaveBeenCalled();
    });
    const newRate = mockedSaveSpeed.mock.calls[0][0];
    expect(newRate).not.toBe(1.0);

    vi.mocked(speak).mockClear();
    fireEvent.click(await screen.findByRole("button", { name: /^play$/i }));

    await waitFor(() => {
      expect(speak).toHaveBeenCalledWith(expect.any(String), newRate, null);
    });
  });

  it("Play button speaks the current word at the current rate before reveal", async () => {
    mockedLoadSpeed.mockReturnValue(0.8);
    setupUseWords(makeWords(2));
    renderHome();

    await screen.findByRole("button", { name: /^play$/i });
    vi.mocked(speak).mockClear();

    const playButton = screen.getByRole("button", { name: /^play$/i });
    expect(playButton).not.toBeDisabled();
    fireEvent.click(playButton);

    await waitFor(() => {
      expect(speak).toHaveBeenCalledWith(expect.any(String), 0.8, null);
    });
  });

  it("allows the Play control to be activated repeatedly before reveal, without error", async () => {
    setupUseWords(makeWords(2));
    renderHome();

    const playButton = await screen.findByRole("button", { name: /^play$/i });
    vi.mocked(speak).mockClear();

    expect(() => {
      fireEvent.click(playButton);
      fireEvent.click(playButton);
      fireEvent.click(playButton);
    }).not.toThrow();

    await waitFor(() => {
      expect(speak).toHaveBeenCalledTimes(3);
    });
    expect(playButton).not.toBeDisabled();
  });

  it("shows the word text (not Play) once the current word has been revealed", async () => {
    setupUseWords(makeWords(2));
    renderHome();

    await screen.findByRole("button", { name: /^play$/i });
    fireEvent.click(screen.getByRole("button", { name: /reveal/i }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /^play$/i })).not.toBeInTheDocument();
    });

    vi.mocked(speak).mockClear();
    expect(screen.queryByRole("button", { name: /^play$/i })).not.toBeInTheDocument();
    expect(speak).not.toHaveBeenCalled();
  });

  it("speaks the first word automatically once the session auto-starts", async () => {
    mockedLoadSpeed.mockReturnValue(1.4);
    setupUseWords(makeWords(2));
    renderHome();

    await waitFor(() => {
      expect(speak).toHaveBeenCalledWith(expect.any(String), 1.4, null);
    });
  });

  it("lists an 'Automatic' option plus every available German voice in the dropdown", async () => {
    const voiceA = makeVoice({ name: "Anna", voiceURI: "anna-uri" });
    const voiceB = makeVoice({ name: "Petra", voiceURI: "petra-uri" });
    mockedListGermanVoices.mockReturnValue([voiceA, voiceB]);
    setupUseWords(makeWords(2));
    renderHome();

    const combobox = await screen.findByRole("combobox", { name: /stimme|voice/i });
    fireEvent.click(combobox);

    expect(await screen.findByRole("option", { name: /automat/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Anna" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Petra" })).toBeInTheDocument();
  });

  it("initializes the voice dropdown from a persisted voiceURI", async () => {
    const voiceA = makeVoice({ name: "Anna", voiceURI: "anna-uri" });
    mockedListGermanVoices.mockReturnValue([voiceA]);
    mockedLoadVoiceURI.mockReturnValue("anna-uri");
    setupUseWords(makeWords(2));
    renderHome();

    expect(await screen.findByText("Anna")).toBeInTheDocument();
  });

  it("selecting a voice persists it and uses it for subsequent playback", async () => {
    const voiceA = makeVoice({ name: "Anna", voiceURI: "anna-uri" });
    mockedListGermanVoices.mockReturnValue([voiceA]);
    setupUseWords(makeWords(2));
    renderHome();

    await screen.findByRole("button", { name: /^play$/i });
    const combobox = await screen.findByRole("combobox", { name: /stimme|voice/i });
    fireEvent.click(combobox);
    fireEvent.click(await screen.findByRole("option", { name: "Anna" }));

    await waitFor(() => {
      expect(mockedSaveVoiceURI).toHaveBeenCalledWith("anna-uri");
    });

    vi.mocked(speak).mockClear();
    fireEvent.click(screen.getByRole("button", { name: /^play$/i }));

    await waitFor(() => {
      expect(speak).toHaveBeenCalledWith(expect.any(String), 1.0, "anna-uri");
    });
  });

  it("returning to 'Automatic' clears the persisted voice and uses automatic selection again", async () => {
    const voiceA = makeVoice({ name: "Anna", voiceURI: "anna-uri" });
    mockedListGermanVoices.mockReturnValue([voiceA]);
    mockedLoadVoiceURI.mockReturnValue("anna-uri");
    setupUseWords(makeWords(2));
    renderHome();

    await screen.findByRole("button", { name: /^play$/i });
    const combobox = await screen.findByRole("combobox", { name: /stimme|voice/i });
    fireEvent.click(combobox);
    fireEvent.click(await screen.findByRole("option", { name: /automat/i }));

    await waitFor(() => {
      expect(mockedClearVoiceURI).toHaveBeenCalled();
    });

    vi.mocked(speak).mockClear();
    fireEvent.click(screen.getByRole("button", { name: /^play$/i }));

    await waitFor(() => {
      expect(speak).toHaveBeenCalledWith(expect.any(String), 1.0, null);
    });
  });

  it("updates the dropdown when the voice list finishes loading asynchronously", async () => {
    class FakeSpeechSynthesis extends EventTarget {}
    const fakeSynth = new FakeSpeechSynthesis();
    const original = (window as unknown as { speechSynthesis?: unknown })
      .speechSynthesis;
    (window as unknown as { speechSynthesis?: unknown }).speechSynthesis =
      fakeSynth;

    try {
      mockedListGermanVoices.mockReturnValue([]);
      setupUseWords(makeWords(2));
      renderHome();

      expect(screen.queryByText("Anna")).not.toBeInTheDocument();

      const voiceA = makeVoice({ name: "Anna", voiceURI: "anna-uri" });
      mockedListGermanVoices.mockReturnValue([voiceA]);
      fakeSynth.dispatchEvent(new Event("voiceschanged"));

      const combobox = await screen.findByRole("combobox", {
        name: /stimme|voice/i,
      });
      fireEvent.click(combobox);
      expect(
        await screen.findByRole("option", { name: "Anna" })
      ).toBeInTheDocument();
    } finally {
      (window as unknown as { speechSynthesis?: unknown }).speechSynthesis =
        original;
    }
  });

  it("picks up voices already loaded by the time the mount effect runs, even if voiceschanged never fires again", async () => {
    const voiceA = makeVoice({ name: "Anna", voiceURI: "anna-uri" });
    mockedListGermanVoices.mockReturnValueOnce([]).mockReturnValue([voiceA]);
    setupUseWords(makeWords(2));
    renderHome();

    const combobox = await screen.findByRole("combobox", {
      name: /stimme|voice/i,
    });
    fireEvent.click(combobox);
    expect(
      await screen.findByRole("option", { name: "Anna" })
    ).toBeInTheDocument();
  });

  it("shows the default session size (24) when nothing is persisted", async () => {
    mockedLoadSessionSize.mockReturnValue(24);
    setupUseWords(makeWords(2));
    renderHome();

    expect(await screen.findByText("24")).toBeInTheDocument();
  });

  it("shows a persisted non-default session size on mount", async () => {
    mockedLoadSessionSize.mockReturnValue(8);
    setupUseWords(makeWords(2));
    renderHome();

    expect(await screen.findByText("8")).toBeInTheDocument();
  });

  it("selecting a session size discards an in-progress session and starts fresh", async () => {
    mockedLoadSessionSize.mockReturnValue(24);
    setupUseWords(makeWords(5));
    renderHome();

    await screen.findByRole("button", { name: /^play$/i });
    fireEvent.click(screen.getByRole("button", { name: /reveal/i }));
    expect(await screen.findByText(/^word\d$/)).toBeInTheDocument();

    const sizeCombobox = await screen.findByRole("combobox", {
      name: /session size/i,
    });
    fireEvent.click(sizeCombobox);
    fireEvent.click(await screen.findByRole("option", { name: "8" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^play$/i })).toBeInTheDocument();
    });
  });

  it("persists the newly selected session size", async () => {
    mockedLoadSessionSize.mockReturnValue(24);
    setupUseWords(makeWords(5));
    renderHome();

    const sizeCombobox = await screen.findByRole("combobox", {
      name: /session size/i,
    });
    fireEvent.click(sizeCombobox);
    fireEvent.click(await screen.findByRole("option", { name: "16" }));

    await waitFor(() => {
      expect(mockedSaveSessionSize).toHaveBeenCalledWith(16);
    });
  });

  it("shows a results summary in flagged order after completing a session", async () => {
    mockedLoadSessionSize.mockReturnValue(8);
    setupUseWords(makeWords(2));
    renderHome();

    await screen.findByRole("button", { name: /^play$/i });
    fireEvent.click(screen.getByRole("button", { name: /reveal/i }));
    const firstWordText = (
      await screen.findByText(/^word\d$/)
    ).textContent;
    fireEvent.click(await screen.findByRole("button", { name: /^correct$/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^play$/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /reveal/i }));
    const secondWordText = (
      await screen.findByText(/^word\d$/)
    ).textContent;
    fireEvent.click(await screen.findByRole("button", { name: /^incorrect$/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledTimes(2);
    });

    expect(await screen.findByText(/session complete/i)).toBeInTheDocument();

    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    expect(within(rows[1]).getByText(firstWordText!)).toBeInTheDocument();
    expect(within(rows[1]).getByText(/correct/i)).toBeInTheDocument();
    expect(within(rows[2]).getByText(secondWordText!)).toBeInTheDocument();
    expect(within(rows[2]).getByText(/incorrect/i)).toBeInTheDocument();
  });

  it("removes the previous results summary when a new session is started", async () => {
    mockedLoadSessionSize.mockReturnValue(8);
    setupUseWords(makeWords(1));
    renderHome();

    await screen.findByRole("button", { name: /^play$/i });
    fireEvent.click(screen.getByRole("button", { name: /reveal/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^correct$/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByRole("table")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /new session/i }));

    await waitFor(() => {
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
  });

  it("does not restore a completed session's results summary after a reload; a fresh session auto-starts instead", async () => {
    const words = makeWords(1);
    let completedState: SessionState = createSessionState(words, 24);
    completedState = pickNextWord(completedState);
    completedState = flagWord(completedState, completedState.current!.id, true);
    expect(completedState.pool).toHaveLength(0);
    expect(completedState.current).toBeNull();
    saveSession<SessionState>(completedState);

    setupUseWords(words);
    renderHome();

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    // A fresh session auto-starts (same 1-word bank), with a current word
    // ready to play/reveal, rather than "press next word to begin".
    expect(await screen.findByRole("button", { name: /^play$/i })).toBeInTheDocument();
  });

  describe("header region", () => {
    it("shows brand, session-size selector, theme toggle, and New Session together before a session exists", async () => {
      setupUseWords(makeWords(2));
      renderHome();

      const header = await screen.findByRole("banner");
      expect(within(header).getByText(/533words/i)).toBeInTheDocument();
      expect(within(header).getByRole("combobox", { name: /session size/i })).toBeInTheDocument();
      expect(within(header).getByRole("button", { name: /theme|dark|light|dunkel|hell/i })).toBeInTheDocument();
      expect(within(header).getByRole("button", { name: /new session/i })).toBeInTheDocument();
    });

    it("shows brand, session-size selector, theme toggle, and New Session together during an active session", async () => {
      setupUseWords(makeWords(2));
      renderHome();
      await screen.findByRole("button", { name: /^play$/i });

      const header = screen.getByRole("banner");
      expect(within(header).getByText(/533words/i)).toBeInTheDocument();
      expect(within(header).getByRole("combobox", { name: /session size/i })).toBeInTheDocument();
      expect(within(header).getByRole("button", { name: /theme|dark|light|dunkel|hell/i })).toBeInTheDocument();
      expect(within(header).getByRole("button", { name: /new session/i })).toBeInTheDocument();
    });

    it("shows brand, session-size selector, theme toggle, and New Session together when the session is complete", async () => {
      setupUseWords(makeWords(1));
      renderHome();
      await screen.findByRole("button", { name: /^play$/i });
      fireEvent.click(screen.getByRole("button", { name: /reveal/i }));
      fireEvent.click(await screen.findByRole("button", { name: /^correct$/i }));
      await screen.findByText(/session complete/i);

      const header = screen.getByRole("banner");
      expect(within(header).getByText(/533words/i)).toBeInTheDocument();
      expect(within(header).getByRole("combobox", { name: /session size/i })).toBeInTheDocument();
      expect(within(header).getByRole("button", { name: /theme|dark|light|dunkel|hell/i })).toBeInTheDocument();
      expect(within(header).getByRole("button", { name: /new session/i })).toBeInTheDocument();
    });
  });

  describe("navigation region", () => {
    it("groups the reveal action and both flag actions together for an active, incomplete session", async () => {
      setupUseWords(makeWords(2));
      renderHome();
      await screen.findByRole("button", { name: /^play$/i });

      const group = screen.getByRole("group", { name: /word actions|wortaktionen/i });
      expect(within(group).getByRole("button", { name: /reveal/i })).toBeInTheDocument();
      expect(within(group).getByRole("button", { name: /^correct$/i })).toBeInTheDocument();
      expect(within(group).getByRole("button", { name: /^incorrect$/i })).toBeInTheDocument();
    });
  });

  describe("theme toggle", () => {
    it("reflects a persisted dark theme on mount by applying the dark class to <html>", async () => {
      mockedLoadTheme.mockReturnValue("dark");
      setupUseWords(makeWords(2));
      renderHome();

      await waitFor(() => {
        expect(document.documentElement.classList.contains("dark")).toBe(true);
      });
    });

    it("does not apply the dark class on mount when the persisted theme is light", async () => {
      mockedLoadTheme.mockReturnValue("light");
      setupUseWords(makeWords(2));
      renderHome();

      await screen.findByRole("button", { name: /^play$/i });
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("toggling flips the dark class and persists the new theme", async () => {
      mockedLoadTheme.mockReturnValue("light");
      setupUseWords(makeWords(2));
      renderHome();

      const header = await screen.findByRole("banner");
      const toggle = within(header).getByRole("button", { name: /theme|dark|light|dunkel|hell/i });

      fireEvent.click(toggle);

      await waitFor(() => {
        expect(document.documentElement.classList.contains("dark")).toBe(true);
      });
      expect(mockedSaveTheme).toHaveBeenCalledWith("dark");

      fireEvent.click(toggle);

      await waitFor(() => {
        expect(document.documentElement.classList.contains("dark")).toBe(false);
      });
      expect(mockedSaveTheme).toHaveBeenLastCalledWith("light");
    });
  });
});
