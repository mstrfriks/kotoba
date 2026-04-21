import { useEffect, useMemo, useRef, useState } from "react";
import {
  Brain,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Languages,
  Loader2,
  PlayCircle,
  RotateCcw,
} from "lucide-react";
import { analyzeScript, translateSentence } from "../lib/api";
import {
  addFuriganaToText,
  cleanSrtText,
  cn,
  getTextStats,
  parseSrtSentences,
} from "../lib/utils";
import { Button } from "./ui/Button";

const TRANSLATION_CACHE_KEY = "japonais.sentenceTranslations.v1";
const furiganaModes = [
  { value: "always", label: "Toujours" },
  { value: "hover", label: "Survol" },
  { value: "hidden", label: "Masque" },
];

function makeTranslationKey(sentence, level) {
  return `${level}:${sentence}`;
}

function loadTranslationCache() {
  try {
    const stored = window.localStorage.getItem(TRANSLATION_CACHE_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function makeAnalysisMap(analysis) {
  const entries = Array.isArray(analysis?.sentences) ? analysis.sentences : [];
  return new Map(
    entries
      .filter((sentence) => sentence?.id)
      .map((sentence) => [sentence.id, sentence])
  );
}

function hasJapaneseText(value) {
  return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(value);
}

function TokenizedSentence({
  sentence,
  analyzedSentence,
  vocabulary,
  furiganaMode,
}) {
  const tokens = Array.isArray(analyzedSentence?.tokens)
    ? analyzedSentence.tokens.filter((token) => token?.surface)
    : [];
  const sentenceClassName = cn(
    "whitespace-pre-wrap text-base leading-8 text-[#243229]",
    furiganaMode === "hover" && "furigana-hover"
  );

  if (!tokens.length) {
    return (
      <p
        className={sentenceClassName}
        dangerouslySetInnerHTML={{
          __html: addFuriganaToText(sentence.text, vocabulary, furiganaMode),
        }}
      />
    );
  }

  return (
    <p className={sentenceClassName}>
      {tokens.map((token, index) => {
        const showRuby = furiganaMode !== "hidden" && token.reading;
        const content = showRuby ? (
          <ruby>
            {token.surface}
            <rt>{token.reading}</rt>
          </ruby>
        ) : (
          token.surface
        );
        const details = [token.meaningFr, token.partOfSpeech]
          .filter(Boolean)
          .join(" · ");

        if (!details || !hasJapaneseText(token.surface)) {
          return <span key={`${token.surface}-${index}`}>{content}</span>;
        }

        return (
          <span
            key={`${token.surface}-${index}`}
            className="group relative inline-block cursor-help rounded px-0.5 transition hover:bg-[#eef5ef] focus:bg-[#eef5ef]"
            tabIndex={0}
          >
            {content}
            <span className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden min-w-40 max-w-64 rounded-md border border-[#d8dfd9] bg-white p-2 text-xs leading-5 text-[#314138] shadow-lg group-hover:block group-focus:block">
              <span className="block font-semibold text-[#1d2b22]">
                {token.surface}
                {token.reading ? ` · ${token.reading}` : ""}
              </span>
              {details}
            </span>
          </span>
        );
      })}
    </p>
  );
}

export function SubtitlesPanel({
  rawText,
  sentences: providedSentences,
  vocabulary,
  level,
  analysis,
  canUseAi,
  embedded = false,
  currentTime = 0,
  onAnalysis,
  onChange,
  onReset,
  onSeek,
}) {
  const [translations, setTranslations] = useState(loadTranslationCache);
  const [loadingKey, setLoadingKey] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [followPlayback, setFollowPlayback] = useState(true);
  const [furiganaMode, setFuriganaMode] = useState("always");
  const sentenceRefs = useRef(new Map());
  const cleanedText = cleanSrtText(rawText);
  const stats = getTextStats(cleanedText);
  const parsedSentences = useMemo(() => parseSrtSentences(rawText), [rawText]);
  const sentences = providedSentences ?? parsedSentences;
  const analysisMap = useMemo(() => makeAnalysisMap(analysis), [analysis]);
  const analyzedCount = analysisMap.size;
  const timedSentenceIndexes = useMemo(
    () =>
      sentences
        .map((sentence, index) => ({ sentence, index }))
        .filter(({ sentence }) => typeof sentence.startTime === "number"),
    [sentences]
  );
  const activeSentenceIndex = useMemo(() => {
    const activeSentence = sentences.find(
      (sentence) =>
        typeof sentence.startTime === "number" &&
        typeof sentence.endTime === "number" &&
        currentTime >= sentence.startTime &&
        currentTime < sentence.endTime + 0.25
    );
    return activeSentence ? sentences.indexOf(activeSentence) : -1;
  }, [currentTime, sentences]);
  const activeSentenceId =
    activeSentenceIndex >= 0 ? sentences[activeSentenceIndex]?.id ?? "" : "";

  useEffect(() => {
    try {
      window.localStorage.setItem(
        TRANSLATION_CACHE_KEY,
        JSON.stringify(translations)
      );
    } catch {
      setError("Le navigateur n'a pas pu sauvegarder les traductions.");
    }
  }, [translations]);

  useEffect(() => {
    if (!followPlayback) return;

    const activeElement = sentenceRefs.current.get(activeSentenceId);
    activeElement?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeSentenceId, followPlayback]);

  function seekToSentence(sentence) {
    if (typeof sentence?.startTime !== "number") return;
    onSeek?.(sentence.startTime, sentence.endTime);
  }

  function seekByOffset(offset) {
    if (!timedSentenceIndexes.length) return;

    const currentTimedPosition =
      activeSentenceIndex >= 0
        ? timedSentenceIndexes.findIndex(
            ({ index }) => index === activeSentenceIndex
          )
        : -1;
    const fallbackPosition =
      offset > 0
        ? timedSentenceIndexes.findIndex(
            ({ sentence }) => sentence.startTime > currentTime
          )
        : [...timedSentenceIndexes]
            .reverse()
            .findIndex(({ sentence }) => sentence.startTime < currentTime);
    const normalizedFallback =
      fallbackPosition < 0
        ? offset > 0
          ? timedSentenceIndexes.length - 1
          : 0
        : offset > 0
          ? fallbackPosition
          : timedSentenceIndexes.length - 1 - fallbackPosition;
    const basePosition =
      currentTimedPosition >= 0 ? currentTimedPosition : normalizedFallback;
    const nextPosition = Math.min(
      timedSentenceIndexes.length - 1,
      Math.max(0, activeSentenceIndex >= 0 ? basePosition + offset : basePosition)
    );
    seekToSentence(timedSentenceIndexes[nextPosition]?.sentence);
  }

  async function copyCleanedText() {
    if (!cleanedText) return;
    await navigator.clipboard.writeText(cleanedText);
  }

  async function handleTranslate(sentence) {
    const translationKey = makeTranslationKey(sentence.text, level);
    if (translations[translationKey]) return;

    setError("");
    setLoadingKey(translationKey);

    try {
      const translation = await translateSentence({
        text: sentence.text,
        level,
      });
      setTranslations((currentTranslations) => ({
        ...currentTranslations,
        [translationKey]: translation,
      }));
    } catch (translationError) {
      setError(translationError.message);
    } finally {
      setLoadingKey("");
    }
  }

  async function handleAnalyzeScript() {
    if (
      analysis &&
      !window.confirm(
        "Relancer l'analyse et les traductions utilisera de nouveaux tokens OpenAI."
      )
    ) {
      return;
    }

    setError("");
    setIsAnalyzing(true);

    try {
      const scriptAnalysis = await analyzeScript({
        sentences,
        level,
      });
      onAnalysis(scriptAnalysis);
    } catch (analysisError) {
      setError(analysisError.message);
    } finally {
      setIsAnalyzing(false);
    }
  }

  const panelContent = (
    <>
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-md",
          embedded ? "pb-3" : "border-b border-[#e8ece8] p-3"
        )}
      >
        <div>
          {!embedded && (
            <h2 className="font-semibold text-[#1d2b22]">Sous-titres</h2>
          )}
          <p className="mt-1 text-xs text-[#718078]">
            {stats.sentences} phrase{stats.sentences > 1 ? "s" : ""} ·{" "}
            {stats.lines} ligne{stats.lines > 1 ? "s" : ""} ·{" "}
            {stats.characters} caractere{stats.characters > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={furiganaMode}
            onChange={(event) => setFuriganaMode(event.target.value)}
            className="h-8 rounded-md border border-[#d7ddd8] bg-white px-2 text-xs font-medium text-[#526058] outline-none transition focus:border-[#315b40] focus:ring-2 focus:ring-[#d8e7dc]"
            title="Affichage des furigana"
          >
            {furiganaModes.map((mode) => (
              <option key={mode.value} value={mode.value}>
                Furigana {mode.label}
              </option>
            ))}
          </select>
          <div className="flex items-center rounded-md border border-[#d7ddd8] bg-white">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-l-md text-[#526058] transition hover:bg-[#f0f3f0] disabled:pointer-events-none disabled:opacity-40"
              onClick={() => seekByOffset(-1)}
              disabled={!timedSentenceIndexes.length}
              title="Passage precedent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center text-[#526058] transition hover:bg-[#f0f3f0] disabled:pointer-events-none disabled:opacity-40"
              onClick={() => seekByOffset(1)}
              disabled={!timedSentenceIndexes.length}
              title="Passage suivant"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={cn(
                "inline-flex h-8 items-center gap-1 rounded-r-md border-l border-[#d7ddd8] px-2 text-xs font-medium transition",
                followPlayback
                  ? "bg-[#eef5ef] text-[#315b40]"
                  : "text-[#526058] hover:bg-[#f0f3f0]"
              )}
              onClick={() => setFollowPlayback((value) => !value)}
              title="Suivre automatiquement le passage actif."
            >
              <Check
                className={cn(
                  "h-3.5 w-3.5",
                  followPlayback ? "opacity-100" : "opacity-0"
                )}
              />
              Suivi
            </button>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleAnalyzeScript}
            disabled={!sentences.length || isAnalyzing || !canUseAi}
            title={
              canUseAi
                ? "Analyser le script avec l'API locale."
                : "Lance npm run app et renseigne OPENAI_API_KEY dans .env."
            }
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Brain className="h-4 w-4" />
            )}
            Analyser
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={copyCleanedText}
            disabled={!cleanedText}
          >
            <Copy className="h-4 w-4" />
            Copier
          </Button>
          <Button size="sm" variant="ghost" onClick={onReset} disabled={!rawText}>
            <RotateCcw className="h-4 w-4" />
            Reinitialiser
          </Button>
        </div>
      </div>
      {analysis && (
        <div className="border-b border-[#e8ece8] bg-white px-3 py-2 text-xs font-medium text-[#657069]">
          Analyse {analysis.level ?? level} · {analyzedCount} phrase
          {analyzedCount > 1 ? "s" : ""}
        </div>
      )}
      <div
        className={cn(
          embedded ? "" : "study-scroll max-h-[34vh] overflow-auto p-3"
        )}
      >
        {sentences.length ? (
          <div className="grid gap-2">
            {sentences.map((sentence, index) => {
              const translationKey = makeTranslationKey(sentence.text, level);
              const analyzedSentence = analysisMap.get(sentence.id);
              const translation =
                analyzedSentence?.translationFr ?? translations[translationKey];
              const isLoading = loadingKey === translationKey;
              const isActive = activeSentenceId === sentence.id;

              return (
              <article
                key={sentence.id}
                ref={(element) => {
                  if (element) {
                    sentenceRefs.current.set(sentence.id, element);
                  } else {
                    sentenceRefs.current.delete(sentence.id);
                  }
                }}
                className={cn(
                  "rounded-md border px-3 py-3 transition",
                  isActive
                    ? "border-[#315b40] bg-white shadow-sm ring-1 ring-[#d8e7dc]"
                    : "border-[#e3e8e3] bg-white/80"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <p
                    className={cn(
                      "pt-1 text-xs font-semibold tabular-nums",
                      isActive ? "text-[#315b40]" : "text-[#9aa39d]"
                    )}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <div className="min-w-0 flex-1">
                    <TokenizedSentence
                      sentence={sentence}
                      analyzedSentence={analyzedSentence}
                      vocabulary={vocabulary}
                      furiganaMode={furiganaMode}
                    />
                    {translation && (
                      <p className="mt-2 rounded-md bg-[#f4f7f4] p-3 text-sm leading-6 text-[#405048]">
                        {translation}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pl-7">
                  {sentence.time ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded text-left text-[11px] font-medium text-[#7a857e] transition hover:text-[#315b40] disabled:pointer-events-none"
                      onClick={() => onSeek?.(sentence.startTime, sentence.endTime)}
                      disabled={typeof sentence.startTime !== "number"}
                      title="Aller a ce passage dans la video."
                    >
                      <Clock3 className="h-3 w-3" />
                      {sentence.time}
                    </button>
                  ) : (
                    <span />
                  )}
                  {typeof sentence.startTime === "number" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onSeek?.(sentence.startTime, sentence.endTime)}
                      title="Rejouer cette phrase et s'arreter a la fin du sous-titre."
                    >
                      <PlayCircle className="h-4 w-4" />
                      Rejouer
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleTranslate(sentence)}
                    disabled={isLoading || Boolean(translation) || !canUseAi}
                    title={
                      canUseAi
                        ? "Traduire cette phrase."
                        : "Lance npm run app et renseigne OPENAI_API_KEY dans .env."
                    }
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Languages className="h-4 w-4" />
                    )}
                    {translation ? "Traduit" : "Traduire"}
                  </Button>
                </div>
              </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-[#d9e0da] bg-white p-4 text-sm leading-6 text-[#68756d]">
            Les sous-titres apparaitront ici.
          </div>
        )}
        {error && (
          <div className="mt-3 rounded-md border border-[#f1c8c2] bg-[#fff6f4] p-3 text-sm font-medium text-[#a13d32]">
            {error}
          </div>
        )}
      </div>
      <details className="mt-3 rounded-md border border-[#e3e8e3] bg-white p-3">
        <summary className="cursor-pointer text-sm font-medium text-[#526058]">
          Modifier le SRT
        </summary>
        <textarea
          value={rawText}
          onChange={(event) => onChange(event.target.value)}
          className="mt-3 min-h-32 w-full resize-y rounded-md border border-[#d9e0da] bg-white p-3 text-sm leading-6 text-[#26332b] outline-none transition placeholder:text-[#9aa39d] focus:border-[#315b40] focus:ring-2 focus:ring-[#d8e7dc]"
          placeholder="1&#10;00:00:01,000 --> 00:00:03,000&#10;こんにちは。今日は..."
        />
      </details>
    </>
  );

  if (embedded) {
    return panelContent;
  }

  return (
    <section className="rounded-lg border border-[#dfe5df] bg-[#fbfcfb]">
      {panelContent}
    </section>
  );
}
