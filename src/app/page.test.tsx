import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Home from "./page";
import { useWords, useFlagWord, useUserStars } from "@/hooks/use-words";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { clearSession, saveSession } from "@/lib/session-storage";
import { createSessionState, flagWord, pickNextWord, type SessionState } from "@/lib/session";
import { speak, listGermanVoices } from "@/lib/speech";
import { loadSpeed, saveSpeed } from "@/lib/speech-settings";
import { loadVoiceURI, saveVoiceURI, clearVoiceURI } from "@/lib/voice-settings";
import { loadSessionSize, saveSessionSize } from "@/lib/session-size-settings";
import { loadTheme, saveTheme } from "@/lib/theme-settings";

const TEST_USER_ID = "test-user-id";

vi.mock("@/hooks/use-words", () => ({
  useWords: vi.fn(),
  useFlagWord: vi.fn(),
  useUserStars: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
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
const mockedUseUserStars = vi.mocked(useUserStars);
const mockedUseSession = vi.mocked(useSession);
const mockedSignOut = vi.mocked(signOut);
const mockedUseRouter = vi.mocked(useRouter);
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
  const result = render(
    <QueryClientProvider client={queryClient}>
      <Home />
    </QueryClientProvider>
  );
  return {
    ...result,
    rerenderHome: () =>
      result.rerender(
        <QueryClientProvider client={queryClient}>
          <Home />
        </QueryClientProvider>
      ),
  };
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
  let routerPush: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    document.documentElement.classList.remove("dark");
    clearSession(TEST_USER_ID);
    routerPush = vi.fn();
    mockedUseRouter.mockReturnValue({
      push: routerPush,
    } as unknown as ReturnType<typeof useRouter>);
    mockedUseSession.mockReturnValue({
      data: {
        user: { id: TEST_USER_ID, name: "Test Learner", email: "learner@example.com" },
      },
      isPending: false,
      isRefetching: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useSession>);
    mockedSignOut.mockReset();
    mockedSignOut.mockResolvedValue(undefined as never);
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
    mockedUseUserStars.mockReturnValue({
      data: 0,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useUserStars>);
  });

  it("shows the Play control before reveal and the word text after reveal (mutually exclusive)", async () => {
    setupUseWords(makeWords(2));
    renderHome();

    const playButton = await screen.findByRole("button", { name: /^abspielen$/i });
    expect(playButton).toBeInTheDocument();
    expect(screen.queryByText(/^word\d$/)).not.toBeInTheDocument();

    const revealButton = screen.getByRole("button", { name: /aufdecken/i });
    fireEvent.click(revealButton);

    expect(await screen.findByText(/^word\d$/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^abspielen$/i })).not.toBeInTheDocument();
  });

  it("renders the Play control as an icon-only button with a German aria-label and no visible text", async () => {
    setupUseWords(makeWords(2));
    renderHome();

    const playButton = await screen.findByRole("button", { name: /^abspielen$/i });
    expect(playButton).toHaveAttribute("aria-label", "Abspielen");
    expect(within(playButton).queryByText(/^play$/i)).not.toBeInTheDocument();
    expect(playButton).not.toHaveTextContent(/play/i);
  });

  it("auto-advances to a new word and speaks it after flagging correct, with words remaining", async () => {
    setupUseWords(makeWords(2));
    renderHome();

    await screen.findByRole("button", { name: /^abspielen$/i });
    fireEvent.click(screen.getByRole("button", { name: /aufdecken/i }));
    const firstWordText = (await screen.findByText(/^word\d$/)).textContent;

    vi.mocked(speak).mockClear();
    fireEvent.click(await screen.findByRole("button", { name: /^richtig$/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ correct: true })
      );
    });

    // A new current word is presented automatically (Play control back, not
    // revealed) with no separate "next word" click.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^abspielen$/i })).toBeInTheDocument();
    });
    expect(screen.queryByText(firstWordText!)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(speak).toHaveBeenCalledWith(expect.any(String), 1.0, null, expect.anything());
    });

    // The flag controls for the new (unrevealed) word are disabled again.
    expect(screen.getByRole("button", { name: /^richtig$/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^falsch$/i })).toBeDisabled();
  });

  it("auto-advances after flagging incorrect too", async () => {
    setupUseWords(makeWords(2));
    renderHome();

    await screen.findByRole("button", { name: /^abspielen$/i });
    fireEvent.click(screen.getByRole("button", { name: /aufdecken/i }));
    vi.mocked(speak).mockClear();

    fireEvent.click(await screen.findByRole("button", { name: /^falsch$/i }));

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

    await screen.findByRole("button", { name: /^abspielen$/i });
    fireEvent.click(screen.getByRole("button", { name: /aufdecken/i }));
    vi.mocked(speak).mockClear();

    fireEvent.click(await screen.findByRole("button", { name: /^richtig$/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({ wordId: "w0", correct: true });
    });

    expect(await screen.findByText(/abgeschlossen/i)).toBeInTheDocument();
    expect(speak).not.toHaveBeenCalled();
  });

  it("shows an error alert and does not auto-advance when the flag mutation fails", async () => {
    mutateAsync.mockRejectedValue(new Error("write failed"));
    setupUseWords(makeWords(2));
    renderHome();

    await screen.findByRole("button", { name: /^abspielen$/i });
    fireEvent.click(screen.getByRole("button", { name: /aufdecken/i }));
    const currentWordText = (await screen.findByText(/^word\d$/)).textContent;
    vi.mocked(speak).mockClear();

    const thumbsUp = await screen.findByRole("button", { name: /^richtig$/i });
    fireEvent.click(thumbsUp);

    expect(await screen.findByRole("alert")).toBeInTheDocument();

    // word should still be actionable (not flagged, not advanced) - flag
    // buttons remain enabled so the learner can retry.
    expect(screen.getByRole("button", { name: /^richtig$/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /^falsch$/i })).not.toBeDisabled();
    expect(screen.getByText(currentWordText!)).toBeInTheDocument();
    expect(speak).not.toHaveBeenCalled();
  });

  it("does not render a 'next word' control anywhere, in any session state", async () => {
    setupUseWords(makeWords(1));
    renderHome();

    await screen.findByRole("button", { name: /^abspielen$/i });
    expect(screen.queryByRole("button", { name: /next word/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /aufdecken/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^richtig$/i }));

    expect(await screen.findByText(/abgeschlossen/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /next word/i })).not.toBeInTheDocument();
  });

  it("shows an empty-word-bank message instead of starting a session", async () => {
    setupUseWords([]);
    renderHome();

    expect(await screen.findByText(/wortliste ist leer/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^abspielen$/i })).not.toBeInTheDocument();
  });

  it("discards the in-progress session without confirmation when New Session is pressed", async () => {
    setupUseWords(makeWords(5));
    renderHome();

    await screen.findByRole("button", { name: /^abspielen$/i });
    fireEvent.click(screen.getByRole("button", { name: /aufdecken/i }));
    expect(await screen.findByText(/^word\d$/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /neue sitzung/i }));

    // No confirmation dialog; the prior in-progress word is discarded and a
    // fresh session starts immediately with a new, unrevealed current word.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^abspielen$/i })).toBeInTheDocument();
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

    await screen.findByRole("button", { name: /^abspielen$/i });
    fireEvent.click(screen.getByRole("button", { name: /aufdecken/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^richtig$/i }));

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
    saveSession<SessionState>(TEST_USER_ID, state);
    const currentWordText = state.current!.text;

    setupUseWords(words);
    renderHome();

    // The restored word is immediately current (Play shown, Reveal enabled)
    // rather than a fresh session being auto-started.
    expect(await screen.findByRole("button", { name: /aufdecken/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /^abspielen$/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /aufdecken/i }));
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
    const newRate = mockedSaveSpeed.mock.calls[0][1];
    expect(newRate).not.toBe(1.0);

    vi.mocked(speak).mockClear();
    fireEvent.click(await screen.findByRole("button", { name: /^abspielen$/i }));

    await waitFor(() => {
      expect(speak).toHaveBeenCalledWith(expect.any(String), newRate, null, expect.anything());
    });
  });

  it("Play button speaks the current word at the current rate before reveal", async () => {
    mockedLoadSpeed.mockReturnValue(0.8);
    setupUseWords(makeWords(2));
    renderHome();

    await screen.findByRole("button", { name: /^abspielen$/i });
    vi.mocked(speak).mockClear();

    const playButton = screen.getByRole("button", { name: /^abspielen$/i });
    expect(playButton).not.toBeDisabled();
    fireEvent.click(playButton);

    await waitFor(() => {
      expect(speak).toHaveBeenCalledWith(expect.any(String), 0.8, null, expect.anything());
    });
  });

  it("allows the Play control to be activated repeatedly before reveal, without error", async () => {
    setupUseWords(makeWords(2));
    renderHome();

    const playButton = await screen.findByRole("button", { name: /^abspielen$/i });
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

    await screen.findByRole("button", { name: /^abspielen$/i });
    fireEvent.click(screen.getByRole("button", { name: /aufdecken/i }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /^abspielen$/i })).not.toBeInTheDocument();
    });

    vi.mocked(speak).mockClear();
    expect(screen.queryByRole("button", { name: /^abspielen$/i })).not.toBeInTheDocument();
    expect(speak).not.toHaveBeenCalled();
  });

  it("speaks the first word automatically once the session auto-starts", async () => {
    mockedLoadSpeed.mockReturnValue(1.4);
    setupUseWords(makeWords(2));
    renderHome();

    await waitFor(() => {
      expect(speak).toHaveBeenCalledWith(expect.any(String), 1.4, null, expect.anything());
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

    await screen.findByRole("button", { name: /^abspielen$/i });
    const combobox = await screen.findByRole("combobox", { name: /stimme|voice/i });
    fireEvent.click(combobox);
    fireEvent.click(await screen.findByRole("option", { name: "Anna" }));

    await waitFor(() => {
      expect(mockedSaveVoiceURI).toHaveBeenCalledWith(TEST_USER_ID, "anna-uri");
    });

    vi.mocked(speak).mockClear();
    fireEvent.click(screen.getByRole("button", { name: /^abspielen$/i }));

    await waitFor(() => {
      expect(speak).toHaveBeenCalledWith(expect.any(String), 1.0, "anna-uri", expect.anything());
    });
  });

  it("returning to 'Automatic' clears the persisted voice and uses automatic selection again", async () => {
    const voiceA = makeVoice({ name: "Anna", voiceURI: "anna-uri" });
    mockedListGermanVoices.mockReturnValue([voiceA]);
    mockedLoadVoiceURI.mockReturnValue("anna-uri");
    setupUseWords(makeWords(2));
    renderHome();

    await screen.findByRole("button", { name: /^abspielen$/i });
    const combobox = await screen.findByRole("combobox", { name: /stimme|voice/i });
    fireEvent.click(combobox);
    fireEvent.click(await screen.findByRole("option", { name: /automat/i }));

    await waitFor(() => {
      expect(mockedClearVoiceURI).toHaveBeenCalled();
    });

    vi.mocked(speak).mockClear();
    fireEvent.click(screen.getByRole("button", { name: /^abspielen$/i }));

    await waitFor(() => {
      expect(speak).toHaveBeenCalledWith(expect.any(String), 1.0, null, expect.anything());
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

    await screen.findByRole("button", { name: /^abspielen$/i });
    fireEvent.click(screen.getByRole("button", { name: /aufdecken/i }));
    expect(await screen.findByText(/^word\d$/)).toBeInTheDocument();

    const sizeCombobox = await screen.findByRole("combobox", {
      name: /sitzungsgröße/i,
    });
    fireEvent.click(sizeCombobox);
    fireEvent.click(await screen.findByRole("option", { name: "8" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^abspielen$/i })).toBeInTheDocument();
    });
  });

  it("persists the newly selected session size", async () => {
    mockedLoadSessionSize.mockReturnValue(24);
    setupUseWords(makeWords(5));
    renderHome();

    const sizeCombobox = await screen.findByRole("combobox", {
      name: /sitzungsgröße/i,
    });
    fireEvent.click(sizeCombobox);
    fireEvent.click(await screen.findByRole("option", { name: "16" }));

    await waitFor(() => {
      expect(mockedSaveSessionSize).toHaveBeenCalledWith(TEST_USER_ID, 16);
    });
  });

  it("shows a results summary in flagged order after completing a session", async () => {
    mockedLoadSessionSize.mockReturnValue(8);
    setupUseWords(makeWords(2));
    renderHome();

    await screen.findByRole("button", { name: /^abspielen$/i });
    fireEvent.click(screen.getByRole("button", { name: /aufdecken/i }));
    const firstWordText = (
      await screen.findByText(/^word\d$/)
    ).textContent;
    fireEvent.click(await screen.findByRole("button", { name: /^richtig$/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^abspielen$/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /aufdecken/i }));
    const secondWordText = (
      await screen.findByText(/^word\d$/)
    ).textContent;
    fireEvent.click(await screen.findByRole("button", { name: /^falsch$/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledTimes(2);
    });

    expect(await screen.findByText(/abgeschlossen/i)).toBeInTheDocument();

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

    await screen.findByRole("button", { name: /^abspielen$/i });
    fireEvent.click(screen.getByRole("button", { name: /aufdecken/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^richtig$/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByRole("table")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /neue sitzung/i }));

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
    saveSession<SessionState>(TEST_USER_ID, completedState);

    setupUseWords(words);
    renderHome();

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    // A fresh session auto-starts (same 1-word bank), with a current word
    // ready to play/reveal, rather than "press next word to begin".
    expect(await screen.findByRole("button", { name: /^abspielen$/i })).toBeInTheDocument();
  });

  describe("header region", () => {
    it("shows brand, session-size selector, theme toggle, and New Session together before a session exists", async () => {
      setupUseWords(makeWords(2));
      renderHome();

      const header = await screen.findByRole("banner");
      expect(within(header).getByText(/533words/i)).toBeInTheDocument();
      expect(within(header).getByRole("combobox", { name: /sitzungsgröße/i })).toBeInTheDocument();
      expect(within(header).getByRole("button", { name: /zu (hellem|dunklem) modus wechseln/i })).toBeInTheDocument();
      expect(within(header).getByRole("button", { name: /neue sitzung/i })).toBeInTheDocument();
    });

    it("shows brand, session-size selector, theme toggle, and New Session together during an active session", async () => {
      setupUseWords(makeWords(2));
      renderHome();
      await screen.findByRole("button", { name: /^abspielen$/i });

      const header = screen.getByRole("banner");
      expect(within(header).getByText(/533words/i)).toBeInTheDocument();
      expect(within(header).getByRole("combobox", { name: /sitzungsgröße/i })).toBeInTheDocument();
      expect(within(header).getByRole("button", { name: /zu (hellem|dunklem) modus wechseln/i })).toBeInTheDocument();
      expect(within(header).getByRole("button", { name: /neue sitzung/i })).toBeInTheDocument();
    });

    it("shows brand, session-size selector, theme toggle, and New Session together when the session is complete", async () => {
      setupUseWords(makeWords(1));
      renderHome();
      await screen.findByRole("button", { name: /^abspielen$/i });
      fireEvent.click(screen.getByRole("button", { name: /aufdecken/i }));
      fireEvent.click(await screen.findByRole("button", { name: /^richtig$/i }));
      await screen.findByText(/abgeschlossen/i);

      const header = screen.getByRole("banner");
      expect(within(header).getByText(/533words/i)).toBeInTheDocument();
      expect(within(header).getByRole("combobox", { name: /sitzungsgröße/i })).toBeInTheDocument();
      expect(within(header).getByRole("button", { name: /zu (hellem|dunklem) modus wechseln/i })).toBeInTheDocument();
      expect(within(header).getByRole("button", { name: /neue sitzung/i })).toBeInTheDocument();
    });
  });

  describe("user menu", () => {
    it("shows the signed-in learner's identity and a Logout action in the header", async () => {
      setupUseWords(makeWords(2));
      renderHome();

      const header = await screen.findByRole("banner");
      expect(within(header).getByText(/test learner/i)).toBeInTheDocument();
      expect(within(header).getByRole("button", { name: /log ?out/i })).toBeInTheDocument();
    });

    it("falls back to showing the email when the learner has no name", async () => {
      mockedUseSession.mockReturnValue({
        data: { user: { id: TEST_USER_ID, name: "", email: "learner@example.com" } },
        isPending: false,
        isRefetching: false,
        error: null,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useSession>);
      setupUseWords(makeWords(2));
      renderHome();

      const header = await screen.findByRole("banner");
      expect(within(header).getByText(/learner@example\.com/i)).toBeInTheDocument();
    });

    it("activating Logout calls Better Auth's client signOut and redirects to /login", async () => {
      setupUseWords(makeWords(2));
      renderHome();

      const header = await screen.findByRole("banner");
      fireEvent.click(within(header).getByRole("button", { name: /log ?out/i }));

      await waitFor(() => {
        expect(mockedSignOut).toHaveBeenCalled();
      });
      await waitFor(() => {
        expect(routerPush).toHaveBeenCalledWith("/login");
      });
    });
  });

  describe("star badge", () => {
    it("shows the learner's current star total rescaled to one decimal place", async () => {
      mockedUseUserStars.mockReturnValue({
        data: 53,
        isLoading: false,
        isError: false,
        error: null,
      } as unknown as ReturnType<typeof useUserStars>);
      setupUseWords(makeWords(2));
      renderHome();

      const header = await screen.findByRole("banner");
      expect(within(header).getByText("5.3")).toBeInTheDocument();
    });

    it("shows a negative star total as negative and rescaled, not clamped or hidden", async () => {
      mockedUseUserStars.mockReturnValue({
        data: -53,
        isLoading: false,
        isError: false,
        error: null,
      } as unknown as ReturnType<typeof useUserStars>);
      setupUseWords(makeWords(2));
      renderHome();

      const header = await screen.findByRole("banner");
      expect(within(header).getByText("-5.3")).toBeInTheDocument();
      expect(within(header).queryByText("0.0")).not.toBeInTheDocument();
    });

    it("shows 0.0 for a fresh account with a total of 0, not blank or bare 0", async () => {
      mockedUseUserStars.mockReturnValue({
        data: 0,
        isLoading: false,
        isError: false,
        error: null,
      } as unknown as ReturnType<typeof useUserStars>);
      setupUseWords(makeWords(2));
      renderHome();

      const header = await screen.findByRole("banner");
      expect(within(header).getByText("0.0")).toBeInTheDocument();
    });

    it("shows 0.0 as a fallback while the star total is loading, without blocking the rest of the header", async () => {
      mockedUseUserStars.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
      } as unknown as ReturnType<typeof useUserStars>);
      setupUseWords(makeWords(2));
      renderHome();

      const header = await screen.findByRole("banner");
      expect(within(header).getByText("0.0")).toBeInTheDocument();
      expect(within(header).getByRole("combobox", { name: /sitzungsgröße/i })).toBeInTheDocument();
      expect(within(header).getByRole("button", { name: /zu (hellem|dunklem) modus wechseln/i })).toBeInTheDocument();
      expect(within(header).getByRole("button", { name: /neue sitzung/i })).toBeInTheDocument();
      expect(within(header).getByRole("button", { name: /log ?out/i })).toBeInTheDocument();
      expect(within(header).queryByText(/du benötigst noch/i)).not.toBeInTheDocument();
      expect(within(header).queryByText(/ziel erreicht/i)).not.toBeInTheDocument();
    });

    it("shows 0.0 as a fallback when the star total fetch errors, without blocking the rest of the header", async () => {
      mockedUseUserStars.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error("boom"),
      } as unknown as ReturnType<typeof useUserStars>);
      setupUseWords(makeWords(2));
      renderHome();

      const header = await screen.findByRole("banner");
      expect(within(header).getByText("0.0")).toBeInTheDocument();
      expect(within(header).getByRole("combobox", { name: /sitzungsgröße/i })).toBeInTheDocument();
      expect(within(header).getByRole("button", { name: /neue sitzung/i })).toBeInTheDocument();
      expect(within(header).queryByText(/du benötigst noch/i)).not.toBeInTheDocument();
      expect(within(header).queryByText(/ziel erreicht/i)).not.toBeInTheDocument();
      fireEvent.click(within(header).getByRole("button", { name: /neue sitzung/i }));
      expect(await screen.findByRole("button", { name: /^abspielen$/i })).toBeInTheDocument();
    });

    it("does not change the badge when the flag write fails", async () => {
      mutateAsync.mockRejectedValue(new Error("write failed"));
      mockedUseUserStars.mockReturnValue({
        data: 50,
        isLoading: false,
        isError: false,
        error: null,
      } as unknown as ReturnType<typeof useUserStars>);
      setupUseWords(makeWords(2));
      renderHome();

      const header = await screen.findByRole("banner");
      expect(within(header).getByText("5.0")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /aufdecken/i }));
      fireEvent.click(await screen.findByRole("button", { name: /^richtig$/i }));

      await screen.findByRole("alert");

      // No optimistic update: the badge still shows the last known total,
      // never a stale-but-changed value, since useUserStars was never
      // invalidated (the flag write never succeeded).
      expect(within(screen.getByRole("banner")).getByText("5.0")).toBeInTheDocument();
    });

    it("updates the badge after a successful flag when the mocked total changes, without a full reload", async () => {
      setupUseWords(makeWords(2));
      const { rerenderHome } = renderHome();

      const header = await screen.findByRole("banner");
      expect(within(header).getByText("0.0")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /aufdecken/i }));
      fireEvent.click(await screen.findByRole("button", { name: /^richtig$/i }));

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalled();
      });

      mockedUseUserStars.mockReturnValue({
        data: 10,
        isLoading: false,
        isError: false,
        error: null,
      } as unknown as ReturnType<typeof useUserStars>);
      rerenderHome();

      expect(within(screen.getByRole("banner")).getByText("1.0")).toBeInTheDocument();
    });
  });

  describe("goal-distance message", () => {
    it("shows the distance to 533 when below the goal", async () => {
      mockedUseUserStars.mockReturnValue({
        data: 53,
        isLoading: false,
        isError: false,
        error: null,
      } as unknown as ReturnType<typeof useUserStars>);
      setupUseWords(makeWords(2));
      renderHome();

      const header = await screen.findByRole("banner");
      expect(
        within(header).getByText("Du benötigst noch 527.7 Sterne")
      ).toBeInTheDocument();
    });

    it("shows the goal-reached message when the rescaled total exactly equals 533", async () => {
      mockedUseUserStars.mockReturnValue({
        data: 5330,
        isLoading: false,
        isError: false,
        error: null,
      } as unknown as ReturnType<typeof useUserStars>);
      setupUseWords(makeWords(2));
      renderHome();

      const header = await screen.findByRole("banner");
      expect(within(header).getByText("Ziel erreicht! 🎉")).toBeInTheDocument();
      expect(within(header).queryByText(/du benötigst noch/i)).not.toBeInTheDocument();
    });

    it("shows the goal-reached message when the rescaled total exceeds 533", async () => {
      mockedUseUserStars.mockReturnValue({
        data: 5400,
        isLoading: false,
        isError: false,
        error: null,
      } as unknown as ReturnType<typeof useUserStars>);
      setupUseWords(makeWords(2));
      renderHome();

      const header = await screen.findByRole("banner");
      expect(within(header).getByText("Ziel erreicht! 🎉")).toBeInTheDocument();
      expect(within(header).queryByText(/-\d/)).not.toBeInTheDocument();
    });

    it("hides the message entirely while the star total is loading", async () => {
      mockedUseUserStars.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
      } as unknown as ReturnType<typeof useUserStars>);
      setupUseWords(makeWords(2));
      renderHome();

      const header = await screen.findByRole("banner");
      expect(within(header).getByText("0.0")).toBeInTheDocument();
      expect(within(header).queryByText(/du benötigst noch/i)).not.toBeInTheDocument();
      expect(within(header).queryByText(/ziel erreicht/i)).not.toBeInTheDocument();
    });

    it("hides the message entirely when the star total failed to load", async () => {
      mockedUseUserStars.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error("boom"),
      } as unknown as ReturnType<typeof useUserStars>);
      setupUseWords(makeWords(2));
      renderHome();

      const header = await screen.findByRole("banner");
      expect(within(header).getByText("0.0")).toBeInTheDocument();
      expect(within(header).queryByText(/du benötigst noch/i)).not.toBeInTheDocument();
      expect(within(header).queryByText(/ziel erreicht/i)).not.toBeInTheDocument();
    });
  });

  describe("navigation region", () => {
    it("groups the reveal action and both flag actions together for an active, incomplete session", async () => {
      setupUseWords(makeWords(2));
      renderHome();
      await screen.findByRole("button", { name: /^abspielen$/i });

      const group = screen.getByRole("group", { name: /wortaktionen/i });
      expect(within(group).getByRole("button", { name: /aufdecken/i })).toBeInTheDocument();
      expect(within(group).getByRole("button", { name: /^richtig$/i })).toBeInTheDocument();
      expect(within(group).getByRole("button", { name: /^falsch$/i })).toBeInTheDocument();
    });
  });

  describe("theme toggle", () => {
    it("shows German visible text ('Dunkel' when light, 'Hell' when dark), matching its current state", async () => {
      mockedLoadTheme.mockReturnValue("light");
      setupUseWords(makeWords(2));
      renderHome();

      const header = await screen.findByRole("banner");
      const toggle = within(header).getByRole("button", {
        name: /zu (hellem|dunklem) modus wechseln/i,
      });
      expect(toggle).toHaveTextContent("Dunkel");

      fireEvent.click(toggle);

      await waitFor(() => {
        expect(document.documentElement.classList.contains("dark")).toBe(true);
      });
      expect(
        within(screen.getByRole("banner")).getByRole("button", {
          name: /zu (hellem|dunklem) modus wechseln/i,
        }),
      ).toHaveTextContent("Hell");
    });

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

      await screen.findByRole("button", { name: /^abspielen$/i });
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("toggling flips the dark class and persists the new theme", async () => {
      mockedLoadTheme.mockReturnValue("light");
      setupUseWords(makeWords(2));
      renderHome();

      const header = await screen.findByRole("banner");
      const toggle = within(header).getByRole("button", { name: /zu (hellem|dunklem) modus wechseln/i });

      fireEvent.click(toggle);

      await waitFor(() => {
        expect(document.documentElement.classList.contains("dark")).toBe(true);
      });
      expect(mockedSaveTheme).toHaveBeenCalledWith(TEST_USER_ID, "dark");

      fireEvent.click(toggle);

      await waitFor(() => {
        expect(document.documentElement.classList.contains("dark")).toBe(false);
      });
      expect(mockedSaveTheme).toHaveBeenLastCalledWith(TEST_USER_ID, "light");
    });
  });
});
