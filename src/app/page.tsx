"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFlagWord, useUserStars, useWords } from "@/hooks/use-words";
import { useSession, signOut } from "@/lib/auth-client";
import { getUserId } from "@/lib/session-user";
import { listGermanVoices, speak } from "@/lib/speech";
import {
  generateFakeFrequencies,
  RESTING_FREQUENCIES,
} from "@/lib/speech-equalizer";
import { SpeechEqualizer } from "@/components/speech-equalizer";
import { loadSpeed, saveSpeed } from "@/lib/speech-settings";
import {
  loadVoiceURI,
  saveVoiceURI,
  clearVoiceURI,
} from "@/lib/voice-settings";
import { loadSessionSize, saveSessionSize } from "@/lib/session-size-settings";
import { loadSession, saveSession } from "@/lib/session-storage";
import { loadTheme, saveTheme, type Theme } from "@/lib/theme-settings";
import {
  createSessionState,
  flagWord,
  isSessionComplete,
  pickNextWord,
  type SessionState,
} from "@/lib/session";

/**
 * Reads any in-progress session from localStorage once, at first render.
 * A lazy useState initializer (rather than an effect) since this is a
 * one-time synchronous read of local storage before paint.
 */
function restoreSession(userId: string): SessionState | null {
  const stored = loadSession<SessionState>(userId);
  if (stored && !isSessionComplete(stored)) {
    return stored;
  }
  return null;
}

/**
 * The practice screen itself, rendered only once a learner ID is known.
 * Split out from `Home` so every hook/state initializer here (several of
 * which read localStorage keyed by `userId` at mount, e.g. `restoreSession`
 * and `loadSpeed`) can treat `userId` as a stable, always-known value
 * rather than a possibly-null one that might change out from under
 * already-initialized state.
 */
function PracticeScreen({ userId }: { userId: string }) {
  const router = useRouter();
  const { data: authSession } = useSession();
  const identity = authSession?.user.name || authSession?.user.email || "";
  const { data: words, isLoading, isError, error } = useWords(userId);
  const flagMutation = useFlagWord(userId);
  const { data: starTotal, isLoading: starsLoading, isError: starsError } =
    useUserStars(userId);
  // Loading/error is shown as "0", the same grilled fallback the rest of
  // the header uses (e.g. a concrete default session size) rather than a
  // blank state -- never blocks the rest of the header's controls.
  const displayedStarTotal =
    starsLoading || starsError || starTotal === undefined ? 0 : starTotal;

  const [session, setSession] = useState<SessionState | null>(() =>
    restoreSession(userId),
  );
  const [revealed, setRevealed] = useState(false);
  const [flagError, setFlagError] = useState<string | null>(null);
  const [rate, setRate] = useState<number>(() => loadSpeed(userId));
  const [voices, setVoices] =
    useState<SpeechSynthesisVoice[]>(listGermanVoices);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string | null>(() =>
    loadVoiceURI(userId),
  );
  const [sessionSize, setSessionSize] = useState<number>(() =>
    loadSessionSize(userId),
  );
  const [theme, setTheme] = useState<Theme>(() => loadTheme(userId));
  const [amplitude, setAmplitude] = useState<number[]>(RESTING_FREQUENCIES);
  const autoStarted = useRef(false);

  // Chrome (among others) loads the voice list asynchronously; re-read it
  // once it finishes so the dropdown reflects the now-available voices
  // without requiring a reload.
  //
  // Also re-read it once immediately here, not just on the event: in
  // practice voiceschanged can fire (and the list finish loading) before
  // this effect gets a chance to attach its listener — React effects run
  // after the initial paint, but the event can arrive within that same
  // window. Relying on the event alone left the dropdown stuck showing
  // only "Automatic" in real Chrome despite voices being available
  // moments later, since the event had already come and gone unseen.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with an external system (the browser's voice list) on mount, exactly the documented exception to this rule; guards against the voiceschanged event having already fired before this effect's listener could attach.
    setVoices(listGermanVoices());
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }
    const synth = window.speechSynthesis;
    if (typeof synth.addEventListener !== "function") {
      return;
    }
    const handleVoicesChanged = () => setVoices(listGermanVoices());
    synth.addEventListener("voiceschanged", handleVoicesChanged);
    return () => {
      synth.removeEventListener("voiceschanged", handleVoicesChanged);
    };
  }, []);

  // Apply the persisted/toggled theme by adding or removing the `dark`
  // class on <html>, matching globals.css's `@custom-variant dark
  // (&:is(.dark *))` convention. A brief flash of the light theme before
  // this effect applies a persisted dark preference is an accepted, known
  // rough edge for this spec (no pre-hydration inline script).
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  /**
   * Selects the next word (if any) from the pool and speaks it aloud,
   * exactly as the automatic-read-aloud behavior already does. Shared by
   * session start and post-flag auto-advance so both behave identically.
   */
  function advance(state: SessionState): SessionState {
    const next = pickNextWord(state);
    if (next.current) {
      const word = next.current.text;
      speak(word, rate, selectedVoiceURI, {
        onTick: () => setAmplitude(generateFakeFrequencies(word)),
        onEnd: () => setAmplitude(RESTING_FREQUENCIES),
      });
    }
    return next;
  }

  // Auto-start a new session once the word bank has loaded, if no
  // in-progress session was restored from storage and the bank is
  // non-empty. This synchronizes local state with the async query result,
  // which is the canonical use case for an effect (reacting to an
  // external data source becoming available), so a direct setState here
  // is intentional and safe (guarded to run at most once).
  useEffect(() => {
    if (autoStarted.current) return;
    if (session) return;
    if (!words || words.length === 0) return;
    autoStarted.current = true;
    const fresh = advance(createSessionState(words, sessionSize));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time auto-start reacting to the word bank finishing its initial async fetch; guarded by autoStarted so it can't cascade.
    setSession(fresh);
    saveSession<SessionState>(userId, fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- advance() closes over rate/selectedVoiceURI intentionally read at call time, not tracked as a dependency (mirrors the pre-existing pattern for this effect).
  }, [session, words, sessionSize]);

  function startNewSession(size: number) {
    if (!words || words.length === 0) return;
    const fresh = advance(createSessionState(words, size));
    setSession(fresh);
    setRevealed(false);
    setFlagError(null);
    saveSession<SessionState>(userId, fresh);
  }

  function handleSessionSizeChange(value: string) {
    const size = Number(value);
    setSessionSize(size);
    saveSessionSize(userId, size);
    startNewSession(size);
  }

  function handleReveal() {
    setRevealed(true);
  }

  function handlePlay() {
    if (!session?.current || revealed) return;
    const word = session.current.text;
    speak(word, rate, selectedVoiceURI, {
      onTick: () => setAmplitude(generateFakeFrequencies(word)),
      onEnd: () => setAmplitude(RESTING_FREQUENCIES),
    });
  }

  function handleRateChange(value: number[]) {
    const newRate = value[0];
    setRate(newRate);
    saveSpeed(userId, newRate);
  }

  function handleVoiceChange(value: string) {
    if (value === "auto") {
      setSelectedVoiceURI(null);
      clearVoiceURI(userId);
    } else {
      setSelectedVoiceURI(value);
      saveVoiceURI(userId, value);
    }
  }

  function handleThemeToggle() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    saveTheme(userId, nextTheme);
  }

  async function handleLogout() {
    await signOut();
    router.push("/login");
  }

  async function handleFlag(correct: boolean) {
    if (!session || !session.current) return;
    const wordId = session.current.id;
    setFlagError(null);
    try {
      await flagMutation.mutateAsync({ wordId, correct });
      let next = flagWord(session, wordId, correct);
      setRevealed(false);
      // Auto-advance: select and speak the next word in the same action,
      // unless the session is now complete (no next word to present).
      if (!isSessionComplete(next)) {
        next = advance(next);
      }
      setSession(next);
      saveSession<SessionState>(userId, next);
    } catch (err) {
      setFlagError(
        err instanceof Error
          ? err.message
          : "Fehler beim Speichern des Ergebnisses.",
      );
    }
  }

  const complete = session ? isSessionComplete(session) : false;

  const header = (
    <header className='flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 tablet:px-8 desktop:px-12'>
      <span className='text-lg font-black tracking-tight desktop:text-xl'>
        533words
      </span>
      <div className='flex flex-wrap items-center gap-2'>
        <Select
          value={String(sessionSize)}
          onValueChange={handleSessionSizeChange}
        >
          <SelectTrigger aria-label='Sitzungsgröße' className='w-[5.5rem]'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[8, 16, 24, 32, 64].map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={handleThemeToggle}
          variant='outline'
          size='sm'
          aria-label={
            theme === "dark"
              ? "Zu hellem Modus wechseln"
              : "Zu dunklem Modus wechseln"
          }
        >
          {theme === "dark" ? "Hell" : "Dunkel"}
        </Button>
        <Button
          onClick={() => startNewSession(sessionSize)}
          variant='secondary'
          size='sm'
        >
          Neue Sitzung
        </Button>
        <div className='flex items-center gap-2 border-l border-border pl-2'>
          <span
            aria-label='Sterne gesamt'
            className='inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-sm font-semibold tabular-nums'
          >
            <span aria-hidden='true'>⭐</span>
            {displayedStarTotal}
          </span>
          {identity && (
            <span className='max-w-[10rem] truncate text-sm text-muted-foreground'>
              {identity}
            </span>
          )}
          <Button onClick={handleLogout} variant='outline' size='sm'>
            Logout
          </Button>
        </div>
      </div>
    </header>
  );

  let body: React.ReactNode;

  if (isLoading) {
    body = (
      <div className='flex flex-1 items-center justify-center'>
        <p className='text-muted-foreground'>Wortliste wird geladen…</p>
      </div>
    );
  } else if (isError) {
    body = (
      <div className='flex flex-1 items-center justify-center p-4'>
        <Alert variant='destructive' className='max-w-md'>
          <AlertTitle>Wortliste konnte nicht geladen werden</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Unbekannter Fehler."}
          </AlertDescription>
        </Alert>
      </div>
    );
  } else if (words && words.length === 0) {
    body = (
      <div className='flex flex-1 items-center justify-center p-4'>
        <Alert className='max-w-md'>
          <AlertTitle>Wortliste ist leer</AlertTitle>
          <AlertDescription>
            Es gibt noch keine Wörter zum Üben. Wortliste befüllen, um eine
            Sitzung zu starten.
          </AlertDescription>
        </Alert>
      </div>
    );
  } else {
    body = (
      <>
        <section className='flex flex-1 flex-col items-center justify-center gap-8 px-4 py-8 tablet:px-8 desktop:px-12'>
          {flagError && (
            <Alert variant='destructive' className='w-full max-w-2xl'>
              <AlertTitle>Ergebnis konnte nicht gespeichert werden</AlertTitle>
              <AlertDescription>{flagError}</AlertDescription>
            </Alert>
          )}

          {complete && session ? (
            <div className='flex w-full max-w-2xl flex-col items-center gap-4'>
              <p className='text-2xl font-black tablet:text-3xl'>
                Sitzung abgeschlossen!
              </p>
              <table className='w-full text-left text-sm'>
                <thead>
                  <tr>
                    <th className='pr-2 font-medium text-muted-foreground'>
                      Wort
                    </th>
                    <th className='font-medium text-muted-foreground'>
                      Ergebnis
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {session.flagOrder.map((id) => {
                    const word = words?.find((w) => w.id === id);
                    return (
                      <tr key={id}>
                        <td className='pr-2'>{word?.text ?? id}</td>
                        <td>{session.flagged[id]}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <>
              <div className='flex flex-1 w-full items-center justify-center'>
                {session?.current && !revealed && (
                  <div className='relative flex h-36 w-36 items-center justify-center tablet:h-48 tablet:w-48 desktop:h-60 desktop:w-60'>
                    <SpeechEqualizer amplitudes={amplitude} />
                    <SpeechEqualizer amplitudes={amplitude} />
                    <Button
                      onClick={handlePlay}
                      disabled={!session?.current || revealed}
                      size='lg'
                      aria-label='Abspielen'
                      className='relative z-10 h-24 w-24 rounded-full text-base tablet:h-32 tablet:w-32 desktop:h-40 desktop:w-40'
                    >
                      <Play
                        className='h-10 w-10 tablet:h-14 tablet:w-14 desktop:h-16 desktop:w-16'
                        fill='currentColor'
                      />
                    </Button>
                  </div>
                )}
                {session?.current && revealed && (
                  <p
                    className='text-center font-black break-words'
                    style={{
                      fontSize: "clamp(2.5rem, 6vw + 1rem, 9rem)",
                      lineHeight: 1.05,
                    }}
                  >
                    {session.current.text}
                  </p>
                )}
              </div>

              <div className='flex w-full max-w-xl flex-col gap-2'>
                <div className='flex items-center gap-2'>
                  <span className='text-sm text-muted-foreground'>Tempo</span>
                  <Slider
                    value={[rate]}
                    min={0.1}
                    max={2.0}
                    step={0.05}
                    onValueChange={handleRateChange}
                    className='flex-1'
                  />
                  <span className='w-10 text-right text-sm text-muted-foreground'>
                    {rate.toFixed(2)}x
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <span className='text-sm text-muted-foreground'>Stimme</span>
                  <Select
                    value={selectedVoiceURI ?? "auto"}
                    onValueChange={handleVoiceChange}
                  >
                    <SelectTrigger aria-label='Stimme' className='flex-1'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='auto'>Automatisch</SelectItem>
                      {voices.map((voice) => (
                        <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                          {voice.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
        </section>

        {!complete && (
          <div
            role='group'
            aria-label='Wortaktionen'
            className='flex w-full flex-wrap items-center justify-center gap-3 px-4 pb-8 tablet:px-8 desktop:px-12'
          >
            <Button
              onClick={handleReveal}
              disabled={!session?.current || revealed}
              variant='outline'
              size='lg'
              className='flex-1 max-w-xs'
            >
              Aufdecken
            </Button>
            <Button
              onClick={() => handleFlag(true)}
              disabled={!session?.current || !revealed}
              variant='secondary'
              size='lg'
              className='flex-1 max-w-xs'
              aria-label='Richtig'
            >
              👍 Richtig
            </Button>
            <Button
              onClick={() => handleFlag(false)}
              disabled={!session?.current || !revealed}
              variant='secondary'
              size='lg'
              className='flex-1 max-w-xs'
              aria-label='Falsch'
            >
              👎 Falsch
            </Button>
          </div>
        )}
      </>
    );
  }

  return (
    <div className='flex flex-1 flex-col'>
      <div className='container-editorial flex w-full flex-1 flex-col'>
        {header}
        {body}
      </div>
    </div>
  );
}

/**
 * Top-level route component. `middleware.ts`/`src/proxy.ts` already
 * guarantees an unauthenticated visitor never reaches this page (redirected
 * to `/login` before any word-bank content is requested), so by the time
 * this renders a session should resolve almost immediately. Still,
 * `useSession()` starts in a pending state on first mount, and every
 * per-learner hook/localStorage read downstream (`useWords`, `useFlagWord`,
 * and all five settings modules) requires a real, non-null user ID -- so
 * this component renders nothing but a minimal loading placeholder (no
 * word text, score, or session-progress content) until `userId` is known,
 * then mounts `PracticeScreen` with it. `PracticeScreen` is a separate
 * component (rather than an inline conditional within one component body)
 * so its own hooks only ever run once a stable `userId` exists -- they
 * never need to cope with it being null.
 */
export default function Home() {
  const { data: session } = useSession();
  const userId = getUserId(session);

  if (!userId) {
    return (
      <div className='flex flex-1 items-center justify-center'>
        <p className='text-muted-foreground'>Wird geladen…</p>
      </div>
    );
  }

  return <PracticeScreen userId={userId} />;
}
