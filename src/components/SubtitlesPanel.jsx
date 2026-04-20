import { Copy, RotateCcw } from "lucide-react";
import { cleanSrtText, getTextStats } from "../lib/utils";
import { Button } from "./ui/Button";

export function SubtitlesPanel({ rawText, onChange, onReset }) {
  const cleanedText = cleanSrtText(rawText);
  const stats = getTextStats(cleanedText);

  async function copyCleanedText() {
    if (!cleanedText) return;
    await navigator.clipboard.writeText(cleanedText);
  }

  return (
    <div className="grid gap-4">
      <div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-[#1d2b22]">Sous-titres SRT</h3>
            <p className="mt-1 text-sm text-[#68756d]">
              Le lexique et le quiz se mettent a jour avec ce contenu.
            </p>
          </div>
        </div>
        <textarea
          value={rawText}
          onChange={(event) => onChange(event.target.value)}
          className="mt-3 min-h-44 w-full resize-y rounded-md border border-[#d9e0da] bg-white p-3 text-sm leading-6 text-[#26332b] outline-none transition placeholder:text-[#9aa39d] focus:border-[#315b40] focus:ring-2 focus:ring-[#d8e7dc]"
          placeholder="1&#10;00:00:01,000 --> 00:00:03,000&#10;こんにちは。今日は..."
        />
      </div>
      <div className="rounded-md border border-[#dfe5df] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8ece8] p-3">
          <div>
            <p className="font-medium text-[#1d2b22]">Texte nettoye</p>
            <p className="text-xs text-[#718078]">
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
            <Button
              size="sm"
              variant="ghost"
              onClick={onReset}
              disabled={!rawText}
            >
              <RotateCcw className="h-4 w-4" />
              Reinitialiser
            </Button>
          </div>
        </div>
        <pre className="study-scroll max-h-72 overflow-auto whitespace-pre-wrap p-3 text-sm leading-6 text-[#35423a]">
          {cleanedText || "Le texte nettoye apparaitra ici."}
        </pre>
      </div>
    </div>
  );
}
