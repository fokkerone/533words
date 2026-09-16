"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFlagWord, useWords } from "@/hooks/use-words";
import { listGermanVoices, speak } from "@/lib/speech";
import { loadSpeed, saveSpeed } from "@/lib/speech-settings";
import { loadVoiceURI, saveVoiceURI, clearVoiceURI } from "@/lib/voice-settings";
import { loadSession, saveSession } from "@/lib/session-storage";
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
function restoreSession(): SessionState | null {
  const stored = loadSession<SessionState>();
  if (stored && !isSessionComplete(stored)) {
    return stored;
  }
  return null;
}

export default function Home() {
  const { data: words, isLoading, isError, error } = useWords();
  const flagMutation = useFlagWord();

  const [session, setSession] = useState<SessionState | null>(restoreSession);
  const [revealed, setRevealed] = useState(false);
  const [flagError, setFlagError] = useState<string | null>(null);
  const [rate, setRate] = useState<number>(loadSpeed);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(listGermanVoices);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string | null>(
    loadVoiceURI,
  );
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
    const fresh = createSessionState(words);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time auto-start reacting to the word bank finishing its initial async fetch; guarded by autoStarted so it can't cascade.
    setSession(fresh);
    saveSession<SessionState>(fresh);
  }, [session, words]);

  function startNewSession() {
    if (!words || words.length === 0) return;
    const fresh = createSessionState(words);
    setSession(fresh);
    setRevealed(false);
    setFlagError(null);
    saveSession<SessionState>(fresh);
  }

  function handleNextWord() {
    if (!session) return;
    const next = pickNextWord(session);
    setSession(next);
    setRevealed(false);
    setFlagError(null);
    if (next.current) {
      speak(next.current.text, rate, selectedVoiceURI);
    }
    saveSession<SessionState>(next);
  }

  function handleReveal() {
    setRevealed(true);
  }

  function handlePlay() {
    if (!session?.current || revealed) return;
    speak(session.current.text, rate, selectedVoiceURI);
  }

  function handleRateChange(value: number[]) {
    const newRate = value[0];
    setRate(newRate);
    saveSpeed(newRate);
  }

  function handleVoiceChange(value: string) {
    if (value === "auto") {
      setSelectedVoiceURI(null);
      clearVoiceURI();
    } else {
      setSelectedVoiceURI(value);
      saveVoiceURI(value);
    }
  }

  async function handleFlag(correct: boolean) {
    if (!session || !session.current) return;
    const wordId = session.current.id;
    setFlagError(null);
    try {
      await flagMutation.mutateAsync({ wordId, correct });
      const next = flagWord(session, wordId, correct);
      setSession(next);
      setRevealed(false);
      saveSession<SessionState>(next);
    } catch (err) {
      setFlagError(err instanceof Error ? err.message : "Failed to save score.");
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Loading word bank…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Failed to load word bank</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Unknown error."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (words && words.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <Alert className="max-w-md">
          <AlertTitle>Word bank is empty</AlertTitle>
          <AlertDescription>
            There are no words to practice yet. Seed the word bank to start a
            session.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const complete = session ? isSessionComplete(session) : false;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>533words practice</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          {complete ? (
            <p className="text-lg font-medium">Session complete!</p>
          ) : session?.current ? (
            <div
              className={`min-h-10 text-2xl font-semibold transition-opacity duration-300 ${
                revealed ? "opacity-100" : "opacity-0"
              }`}
            >
              {revealed ? session.current.text : ""}
            </div>
          ) : (
            <p className="text-muted-foreground">
              Press &quot;Next Word&quot; to begin.
            </p>
          )}

          {flagError && (
            <Alert variant="destructive" className="w-full">
              <AlertTitle>Could not save score</AlertTitle>
              <AlertDescription>{flagError}</AlertDescription>
            </Alert>
          )}

          {!complete && (
            <div className="flex w-full flex-col gap-2">
              <Button
                onClick={handlePlay}
                disabled={!session?.current || revealed}
                variant="outline"
                className="w-full"
              >
                Play
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Speed</span>
                <Slider
                  value={[rate]}
                  min={0.1}
                  max={2.0}
                  step={0.05}
                  onValueChange={handleRateChange}
                  className="flex-1"
                />
                <span className="w-10 text-right text-sm text-muted-foreground">
                  {rate.toFixed(2)}x
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Stimme</span>
                <Select
                  value={selectedVoiceURI ?? "auto"}
                  onValueChange={handleVoiceChange}
                >
                  <SelectTrigger aria-label="Stimme" className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automatisch</SelectItem>
                    {voices.map((voice) => (
                      <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                        {voice.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          {complete ? (
            <Button onClick={startNewSession} className="w-full">
              New Session
            </Button>
          ) : (
            <>
              <div className="flex w-full gap-2">
                <Button
                  onClick={handleNextWord}
                  disabled={!session || !!session.current}
                  className="flex-1"
                >
                  Next Word
                </Button>
                <Button
                  onClick={handleReveal}
                  disabled={!session?.current || revealed}
                  variant="outline"
                  className="flex-1"
                >
                  Reveal
                </Button>
              </div>
              <div className="flex w-full gap-2">
                <Button
                  onClick={() => handleFlag(true)}
                  disabled={!session?.current || !revealed}
                  variant="secondary"
                  className="flex-1"
                  aria-label="correct"
                >
                  👍 Correct
                </Button>
                <Button
                  onClick={() => handleFlag(false)}
                  disabled={!session?.current || !revealed}
                  variant="secondary"
                  className="flex-1"
                  aria-label="incorrect"
                >
                  👎 Incorrect
                </Button>
              </div>
              <Button onClick={startNewSession} variant="ghost" className="w-full">
                New Session
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
