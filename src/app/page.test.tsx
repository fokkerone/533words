import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Home from "./page";
import { useWords, useFlagWord } from "@/hooks/use-words";
import { clearSession, saveSession } from "@/lib/session-storage";
import { createSessionState, pickNextWord, type SessionState } from "@/lib/session";

vi.mock("@/hooks/use-words", () => ({
  useWords: vi.fn(),
  useFlagWord: vi.fn(),
}));

vi.mock("@/lib/speech", () => ({
  speak: vi.fn(),
}));

const mockedUseWords = vi.mocked(useWords);
const mockedUseFlagWord = vi.mocked(useFlagWord);

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
    clearSession();
    mutateAsync = vi.fn().mockResolvedValue(undefined);
    mockedUseFlagWord.mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
      error: null,
      isSuccess: false,
    } as unknown as ReturnType<typeof useFlagWord>);
  });

  it("shows the word text after Next Word then reveal", async () => {
    setupUseWords(makeWords(2));
    renderHome();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /next word/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /next word/i }));

    const revealButton = await screen.findByRole("button", { name: /reveal/i });
    expect(screen.queryByText(/^word\d$/)).not.toBeInTheDocument();

    fireEvent.click(revealButton);

    expect(await screen.findByText(/^word\d$/)).toBeInTheDocument();
  });

  it("disables further flagging on a word after it is flagged correct", async () => {
    setupUseWords(makeWords(2));
    renderHome();

    fireEvent.click(await screen.findByRole("button", { name: /next word/i }));
    fireEvent.click(await screen.findByRole("button", { name: /reveal/i }));

    const thumbsUp = await screen.findByRole("button", { name: /^correct$/i });
    const thumbsDown = screen.getByRole("button", { name: /^incorrect$/i });

    fireEvent.click(thumbsUp);

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ correct: true })
      );
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /next word/i })).not.toBeDisabled();
    });

    // Flag controls for the flagged word should no longer be actionable
    // (current word cleared after flagging, so the buttons become disabled)
    expect(screen.getByRole("button", { name: /^correct$/i })).toBeDisabled();
    expect(thumbsDown).toBeDisabled();
  });

  it("shows session complete and New Session after flagging the last word", async () => {
    setupUseWords(makeWords(1));
    renderHome();

    fireEvent.click(await screen.findByRole("button", { name: /next word/i }));
    fireEvent.click(await screen.findByRole("button", { name: /reveal/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^correct$/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({ wordId: "w0", correct: true });
    });

    expect(await screen.findByText(/session complete/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /new session/i })).toBeInTheDocument();
  });

  it("shows an error alert and does not update state when the flag mutation fails", async () => {
    mutateAsync.mockRejectedValue(new Error("write failed"));
    setupUseWords(makeWords(2));
    renderHome();

    fireEvent.click(await screen.findByRole("button", { name: /next word/i }));
    fireEvent.click(await screen.findByRole("button", { name: /reveal/i }));

    const thumbsUp = await screen.findByRole("button", { name: /^correct$/i });
    fireEvent.click(thumbsUp);

    expect(await screen.findByRole("alert")).toBeInTheDocument();

    // word should still be actionable (not flagged) - flag buttons remain
    // enabled so the learner can retry, per the spec's "Score write fails"
    // scenario.
    expect(screen.getByRole("button", { name: /^correct$/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /^incorrect$/i })).not.toBeDisabled();
  });

  it("shows an empty-word-bank message instead of starting a session", async () => {
    setupUseWords([]);
    renderHome();

    expect(await screen.findByText(/word bank is empty/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /next word/i })).not.toBeInTheDocument();
  });

  it("discards the in-progress session without confirmation when New Session is pressed", async () => {
    setupUseWords(makeWords(5));
    renderHome();

    fireEvent.click(await screen.findByRole("button", { name: /next word/i }));
    fireEvent.click(await screen.findByRole("button", { name: /reveal/i }));

    // A word is current and revealed - Next Word is disabled until it's
    // resolved.
    expect(screen.getByRole("button", { name: /next word/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /new session/i }));

    // No confirmation dialog; the prior in-progress word is discarded and a
    // fresh session starts immediately (current cleared, ready to pick again).
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /next word/i })).not.toBeDisabled();
    });
    expect(screen.getByText(/press "next word" to begin/i)).toBeInTheDocument();
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

    fireEvent.click(await screen.findByRole("button", { name: /next word/i }));
    fireEvent.click(await screen.findByRole("button", { name: /reveal/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^correct$/i }));

    await waitFor(() => {
      // db-write (Next Word's save) then reveal has none, then the flag's
      // db-write must precede its local-save.
      const flagWriteIndex = callOrder.lastIndexOf("db-write");
      const flagSaveIndex = callOrder.lastIndexOf("local-save");
      expect(flagWriteIndex).toBeGreaterThanOrEqual(0);
      expect(flagSaveIndex).toBeGreaterThan(flagWriteIndex);
    });

    vi.restoreAllMocks();
  });

  it("restores an in-progress session (current word and pool) after a reload", async () => {
    const words = makeWords(5);
    let state: SessionState = createSessionState(words);
    state = pickNextWord(state);
    saveSession<SessionState>(state);
    const currentWordText = state.current!.text;

    setupUseWords(words);
    renderHome();

    // The restored word is immediately current (Next Word disabled, Reveal
    // enabled) rather than a fresh session being auto-started.
    expect(await screen.findByRole("button", { name: /reveal/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /next word/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /reveal/i }));
    expect(await screen.findByText(currentWordText)).toBeInTheDocument();
  });
});
