import { useEffect, useMemo, useState } from "react";
import { VideoList } from "./components/VideoList";
import { VideoPlayer } from "./components/VideoPlayer";
import { StudyPanel } from "./components/StudyPanel";
import { VideoImporter } from "./components/VideoImporter";
import {
  extractYoutubeId,
  generateStudyMaterials,
  makeVideoTitle,
} from "./lib/utils";

const STORAGE_KEY = "japonais.studyLibrary.v1";
const EMPTY_LIBRARY = {
  videos: [],
  selectedVideoId: "",
  subtitleDrafts: {},
};

function loadStoredLibrary() {
  if (typeof window === "undefined") return EMPTY_LIBRARY;

  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    if (!storedValue) return EMPTY_LIBRARY;

    const parsedValue = JSON.parse(storedValue);
    const videos = Array.isArray(parsedValue?.videos)
      ? parsedValue.videos.filter((video) => video?.id)
      : [];
    const subtitleDrafts =
      parsedValue?.subtitleDrafts &&
      typeof parsedValue.subtitleDrafts === "object" &&
      !Array.isArray(parsedValue.subtitleDrafts)
        ? Object.fromEntries(
            Object.entries(parsedValue.subtitleDrafts).filter(
              ([, value]) => typeof value === "string"
            )
          )
        : {};
    const selectedVideoId =
      typeof parsedValue?.selectedVideoId === "string" &&
      videos.some((video) => video.id === parsedValue.selectedVideoId)
        ? parsedValue.selectedVideoId
        : videos[0]?.id ?? "";

    return { videos, selectedVideoId, subtitleDrafts };
  } catch {
    return EMPTY_LIBRARY;
  }
}

export default function App() {
  const [library] = useState(loadStoredLibrary);
  const [videos, setVideos] = useState(library.videos);
  const [selectedVideoId, setSelectedVideoId] = useState(
    library.selectedVideoId
  );
  const [subtitleDrafts, setSubtitleDrafts] = useState(library.subtitleDrafts);
  const [importError, setImportError] = useState("");

  const selectedVideo = useMemo(
    () => videos.find((video) => video.id === selectedVideoId) ?? null,
    [videos, selectedVideoId]
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          videos,
          selectedVideoId,
          subtitleDrafts,
        })
      );
    } catch {
      setImportError(
        "Le navigateur n'a pas pu sauvegarder les donnees localement."
      );
    }
  }, [videos, selectedVideoId, subtitleDrafts]);

  function addVideo({ youtubeUrl, subtitles }) {
    const youtubeId = extractYoutubeId(youtubeUrl);
    if (!youtubeId) {
      setImportError("Le lien YouTube n'est pas valide.");
      return false;
    }

    const rawSubtitles = subtitles
      .map((subtitle) => subtitle.text)
      .join("\n\n");
    const fileNames = subtitles.map((subtitle) => subtitle.name);
    const materials = generateStudyMaterials(rawSubtitles);
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${youtubeId}-${Date.now()}`;
    const video = {
      id,
      title: makeVideoTitle(youtubeUrl, fileNames),
      level: "Auto",
      duration: `${materials.stats.lines} lignes`,
      youtubeId,
      youtubeUrl,
      summary: `${fileNames.length} fichier${
        fileNames.length > 1 ? "s" : ""
      } SRT importe${fileNames.length > 1 ? "s" : ""}.`,
      focus: ["SRT", "Lexique auto", "Quiz auto"],
      vocabulary: materials.vocabulary,
      quiz: materials.quiz,
      fileNames,
    };

    setImportError("");
    setVideos((currentVideos) => [video, ...currentVideos]);
    setSubtitleDrafts((drafts) => ({ ...drafts, [id]: rawSubtitles }));
    setSelectedVideoId(id);
    return true;
  }

  function updateSubtitles(value) {
    if (!selectedVideo) return;
    const materials = generateStudyMaterials(value);
    setSubtitleDrafts((drafts) => ({
      ...drafts,
      [selectedVideo.id]: value,
    }));
    setVideos((currentVideos) =>
      currentVideos.map((video) =>
        video.id === selectedVideo.id
          ? {
              ...video,
              duration: `${materials.stats.lines} lignes`,
              vocabulary: materials.vocabulary,
              quiz: materials.quiz,
            }
          : video
      )
    );
  }

  function resetSubtitles() {
    if (!selectedVideo) return;
    setSubtitleDrafts((drafts) => ({
      ...drafts,
      [selectedVideo.id]: "",
    }));
    setVideos((currentVideos) =>
      currentVideos.map((video) =>
        video.id === selectedVideo.id
          ? { ...video, duration: "0 ligne", vocabulary: [], quiz: [] }
          : video
      )
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f4] p-3 text-[#1d2b22] md:p-5">
      <div className="mx-auto grid max-w-[1680px] gap-4 xl:grid-cols-[300px_minmax(520px,1fr)_420px]">
        <div className="grid content-start gap-4">
          <VideoImporter onAddVideo={addVideo} />
          {importError && (
            <div className="rounded-md border border-[#f1c8c2] bg-[#fff6f4] p-3 text-sm font-medium text-[#a13d32]">
              {importError}
            </div>
          )}
          <VideoList
            videos={videos}
            selectedVideoId={selectedVideoId}
            subtitleDrafts={subtitleDrafts}
            onSelect={setSelectedVideoId}
          />
        </div>
        <div className="grid content-start gap-4">
          {selectedVideo ? (
            <VideoPlayer video={selectedVideo} />
          ) : (
            <section className="rounded-lg border border-[#dfe5df] bg-white p-6">
              <h1 className="text-2xl font-semibold text-[#1d2b22]">
                Ajoute une video YouTube
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#59665e]">
                La liste est vide au depart. Entre un lien YouTube, importe les
                fichiers SRT, puis l'application creera le lexique et le quiz a
                partir des sous-titres.
              </p>
            </section>
          )}
        </div>
        {selectedVideo ? (
          <StudyPanel
            video={selectedVideo}
            subtitleText={subtitleDrafts[selectedVideo.id] ?? ""}
            onSubtitleChange={updateSubtitles}
            onSubtitleReset={resetSubtitles}
          />
        ) : (
          <aside className="rounded-lg border border-[#dfe5df] bg-[#fbfcfb] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#7a857e]">
              Etude
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[#1d2b22]">
              Aucun contenu
            </h2>
          </aside>
        )}
      </div>
    </main>
  );
}
