import { useState } from "react";
import { Brain, Link, Loader2, Upload } from "lucide-react";
import { Button } from "./ui/Button";

export function VideoImporter({ canUseAi, onAddVideo }) {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [files, setFiles] = useState([]);
  const [generateOnImport, setGenerateOnImport] = useState(true);
  const [questionCount, setQuestionCount] = useState(8);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsImporting(true);

    if (!youtubeUrl.trim()) {
      setError("Ajoute un lien YouTube.");
      setIsImporting(false);
      return;
    }
    if (!files.length) {
      setError("Ajoute au moins un fichier SRT.");
      setIsImporting(false);
      return;
    }

    try {
      const subtitles = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          text: await file.text(),
        }))
      );
      const added = await onAddVideo({
        youtubeUrl,
        subtitles,
        importAiOptions: {
          enabled: generateOnImport && canUseAi,
          questionCount,
          quizType: "comprehension",
          lexiconCount: 18,
        },
      });
      if (added) {
        setYoutubeUrl("");
        setFiles([]);
        event.target.reset();
      }
    } catch (submitError) {
      setError(submitError.message || "Impossible de lire les fichiers SRT.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <section className="rounded-lg border border-[#cfd8d1] bg-white p-4 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#7a857e]">
          Import
        </p>
        <h2 className="mt-1 text-lg font-semibold text-[#1d2b22]">
          Nouvelle video
        </h2>
      </div>
      <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-[#26332b]">
            Lien YouTube
          </span>
          <div className="flex items-center gap-2 rounded-md border border-[#d9e0da] bg-[#fbfcfb] px-3 focus-within:border-[#315b40] focus-within:ring-2 focus-within:ring-[#d8e7dc]">
            <Link className="h-4 w-4 shrink-0 text-[#68756d]" />
            <input
              value={youtubeUrl}
              onChange={(event) => setYoutubeUrl(event.target.value)}
              className="h-10 min-w-0 flex-1 bg-transparent text-sm text-[#26332b] outline-none placeholder:text-[#9aa39d]"
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-[#26332b]">
            Fichiers SRT
          </span>
          <div className="rounded-md border border-dashed border-[#cfd8d1] bg-[#fbfcfb] p-3">
            <div className="flex items-center gap-2 text-sm text-[#526058]">
              <Upload className="h-4 w-4" />
              <span>
                {files.length
                  ? `${files.length} fichier${files.length > 1 ? "s" : ""}`
                  : "Selectionne un ou plusieurs fichiers .srt"}
              </span>
            </div>
            <input
              type="file"
              accept=".srt,text/plain"
              multiple
              onChange={(event) => setFiles([...event.target.files])}
              className="mt-3 w-full text-sm text-[#526058] file:mr-3 file:rounded-md file:border-0 file:bg-[#eef2ee] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#26332b]"
            />
          </div>
        </label>
        <div className="rounded-md border border-[#e3e8e3] bg-[#fbfcfb] p-3">
          <label className="flex items-start gap-2 text-sm font-medium text-[#26332b]">
            <input
              type="checkbox"
              checked={generateOnImport}
              onChange={(event) => setGenerateOnImport(event.target.checked)}
              disabled={!canUseAi}
              className="mt-1"
            />
            <span>
              Generer les traductions, le lexique et le QCM a l'import
              <span className="mt-1 block text-xs font-normal leading-5 text-[#68756d]">
                Utilise des tokens OpenAI. Les traductions viennent de
                l'analyse IA des phrases.
              </span>
            </span>
          </label>
          <label className="mt-3 inline-flex h-8 items-center gap-2 rounded-md border border-[#d7ddd8] bg-white px-2 text-xs font-medium text-[#526058]">
            Questions
            <input
              type="number"
              min="3"
              max="12"
              value={questionCount}
              onChange={(event) => setQuestionCount(Number(event.target.value))}
              disabled={!generateOnImport || !canUseAi}
              className="w-10 bg-transparent text-center outline-none"
            />
          </label>
          {!canUseAi && (
            <p className="mt-2 text-xs font-medium text-[#a06a1d]">
              Renseigne le token Kotoba et verifie OPENAI_API_KEY pour activer
              l'IA a l'import.
            </p>
          )}
        </div>
        {error && <p className="text-sm font-medium text-[#a13d32]">{error}</p>}
        <Button type="submit" className="w-full" disabled={isImporting}>
          {isImporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : generateOnImport && canUseAi ? (
            <Brain className="h-4 w-4" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {generateOnImport && canUseAi
            ? "Importer et lancer l'IA"
            : "Importer la video"}
        </Button>
      </form>
    </section>
  );
}
