import { Copy, RotateCcw } from "lucide-react";
import {
  addFuriganaToText,
  cleanSrtText,
  getTextStats,
  parseSrtCues,
} from "../lib/utils";
import { Button } from "./ui/Button";

export function SubtitlesPanel({ rawText, vocabulary, onChange, onReset }) {
  const cleanedText = cleanSrtText(rawText);
  const stats = getTextStats(cleanedText);
  const cues = parseSrtCues(rawText);

  async function copyCleanedText() {
    if (!cleanedText) return;
    await navigator.clipboard.writeText(cleanedText);
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
      <div className="study-scroll max-h-[34vh] overflow-auto p-3">
        {cues.length ? (
          <div className="grid gap-2">
            {cues.map((cue) => (
              <article
                key={cue.id}
                className="rounded-md border border-[#e6eae6] bg-white px-3 py-2"
              >
                <div className="grid gap-1">
                  {cue.sentences.map((sentence, index) => (
                    <p
                      key={`${cue.id}-${index}`}
                      className="whitespace-pre-wrap text-base leading-8 text-[#243229]"
                      dangerouslySetInnerHTML={{
                        __html: addFuriganaToText(sentence, vocabulary),
                      }}
                    />
                  ))}
                </div>
                {cue.time && (
                  <p className="mt-1 text-[11px] font-medium text-[#9aa39d]">
                    {cue.time}
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-[#d9e0da] bg-white p-4 text-sm leading-6 text-[#68756d]">
            Les sous-titres apparaitront ici.
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
