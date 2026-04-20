import { useEffect, useMemo, useState } from "react";
import { Brain, Copy, Languages, Loader2, RotateCcw } from "lucide-react";
import { analyzeScript, translateSentence } from "../lib/api";
import {
  addFuriganaToText,
  cleanSrtText,
  getTextStats,
  parseSrtSentences,
} from "../lib/utils";
import { Button } from "./ui/Button";

const TRANSLATION_CACHE_KEY = "japonais.sentenceTranslations.v1";

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

function TokenizedSentence({ sentence, analyzedSentence, vocabulary }) {
  const tokens = Array.isArray(analyzedSentence?.tokens)
    ? analyzedSentence.tokens.filter((token) => token?.surface)
    : [];

  if (!tokens.length) {
    return (
      <p
        className="whitespace-pre-wrap text-base leading-8 text-[#243229]"
        dangerouslySetInnerHTML={{
          __html: addFuriganaToText(sentence.text, vocabulary),
        }}
      />
    );
  }

  return (
    <p className="whitespace-pre-wrap text-base leading-8 text-[#243229]">
      {tokens.map((token, index) => {
        const content = token.reading ? (
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
  vocabulary,
  level,
  analysis,
  canUseAi,
  onAnalysis,
  onChange,
  onReset,
}) {
  const [translations, setTranslations] = useState(loadTranslationCache);
  const [loadingKey, setLoadingKey] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const cleanedText = cleanSrtText(rawText);
  const stats = getTextStats(cleanedText);
  const sentences = useMemo(() => parseSrtSentences(rawText), [rawText]);
  const analysisMap = useMemo(() => makeAnalysisMap(analysis), [analysis]);
  const analyzedCount = analysisMap.size;

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

  return (
    <section className="rounded-lg border border-[#dfe5df] bg-[#fbfcfb]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8ece8] p-3">
        <div>
          <h2 className="font-semibold text-[#1d2b22]">Sous-titres</h2>
          <p className="mt-1 text-xs text-[#718078]">
            {stats.lines} ligne{stats.lines > 1 ? "s" : ""} ·{" "}
            {stats.characters} caractere{stats.characters > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
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
      <div className="study-scroll max-h-[34vh] overflow-auto p-3">
        {sentences.length ? (
          <div className="grid gap-2">
            {sentences.map((sentence, index) => {
              const translationKey = makeTranslationKey(sentence.text, level);
              const analyzedSentence = analysisMap.get(sentence.id);
              const translation =
                analyzedSentence?.translationFr ?? translations[translationKey];
              const isLoading = loadingKey === translationKey;

              return (
              <article
                key={sentence.id}
                className="rounded-md border border-[#e6eae6] bg-white px-3 py-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="pt-1 text-xs font-semibold text-[#9aa39d]">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <div className="min-w-0 flex-1">
                    <TokenizedSentence
                      sentence={sentence}
                      analyzedSentence={analyzedSentence}
                      vocabulary={vocabulary}
                    />
                    {translation && (
                      <p className="mt-2 rounded-md bg-[#f4f7f4] p-3 text-sm leading-6 text-[#405048]">
                        {translation}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pl-7">
                  {sentence.time ? (
                    <p className="text-[11px] font-medium text-[#9aa39d]">
                      {sentence.time}
                    </p>
                  ) : (
                    <span />
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
      <details className="border-t border-[#e8ece8] p-3">
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
    </section>
  );
}
