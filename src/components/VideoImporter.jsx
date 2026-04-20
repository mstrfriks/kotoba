import { useState } from "react";
import { Link, Upload } from "lucide-react";
import { Button } from "./ui/Button";

export function VideoImporter({ onAddVideo }) {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!youtubeUrl.trim()) {
      setError("Ajoute un lien YouTube.");
      return;
    }
    if (!files.length) {
      setError("Ajoute au moins un fichier SRT.");
      return;
    }

    try {
      const subtitles = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          text: await file.text(),
        }))
      );
      const added = onAddVideo({ youtubeUrl, subtitles });
      if (added) {
        setYoutubeUrl("");
        setFiles([]);
        event.target.reset();
      }
    } catch {
      setError("Impossible de lire les fichiers SRT.");
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
        {error && <p className="text-sm font-medium text-[#a13d32]">{error}</p>}
        <Button type="submit" className="w-full">
          Creer le lexique et le quiz
        </Button>
      </form>
    </section>
  );
}
