import { useEffect, useMemo, useState } from "react";
import { VideoList } from "./components/VideoList";
import { VideoPlayer } from "./components/VideoPlayer";
import { StudyPanel } from "./components/StudyPanel";
import { SubtitlesPanel } from "./components/SubtitlesPanel";
import { VideoImporter } from "./components/VideoImporter";
import { Button } from "./components/ui/Button";
import {
  extractYoutubeId,
  generateStudyMaterials,
  makeVideoTitle,
  studyLevels,
} from "./lib/utils";

const STORAGE_KEY = "japonais.studyLibrary.v1";
const EMPTY_LIBRARY = {
  videos: [],
  selectedVideoId: "",
  subtitleDrafts: {},
  selectedLevel: "N5",
};

function isStudyLevel(value) {
  return studyLevels.some((level) => level.value === value);
}

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
    const videoLevel = videos.find(
      (video) => video.id === selectedVideoId
    )?.level;
    const selectedLevel = isStudyLevel(parsedValue?.selectedLevel)
      ? parsedValue.selectedLevel
      : isStudyLevel(videoLevel)
        ? videoLevel
        : EMPTY_LIBRARY.selectedLevel;

    return { videos, selectedVideoId, subtitleDrafts, selectedLevel };
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
  const [selectedLevel, setSelectedLevel] = useState(library.selectedLevel);
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
          selectedLevel,
        })
      );
    } catch {
      setImportError(
        "Le navigateur n'a pas pu sauvegarder les donnees localement."
      );
    }
  }, [videos, selectedVideoId, subtitleDrafts, selectedLevel]);

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
    const materials = generateStudyMaterials(rawSubtitles, selectedLevel);
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${youtubeId}-${Date.now()}`;
    const video = {
      id,
      title: makeVideoTitle(youtubeUrl, fileNames),
      level: selectedLevel,
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
    const materials = generateStudyMaterials(value, selectedVideo.level);
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

  function changeLevel(level) {
    setSelectedLevel(level);
    if (!selectedVideo) return;

    const subtitles = subtitleDrafts[selectedVideo.id] ?? "";
    const materials = generateStudyMaterials(subtitles, level);
    setVideos((currentVideos) =>
      currentVideos.map((video) =>
        video.id === selectedVideo.id
          ? {
              ...video,
              level,
              duration: `${materials.stats.lines} lignes`,
              vocabulary: materials.vocabulary,
              quiz: materials.quiz,
            }
          : video
      )
    );
  }

  function selectVideo(videoId) {
    const nextVideo = videos.find((video) => video.id === videoId);
    setSelectedVideoId(videoId);
    if (isStudyLevel(nextVideo?.level)) {
      setSelectedLevel(nextVideo.level);
    }
  }

  function showLibrary() {
    setSelectedVideoId("");
  }

  return (
    <main className="min-h-screen bg-[#f7f7f4] p-3 text-[#1d2b22] md:p-5">
      <div className="mx-auto max-w-[1680px]">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <h1 className="project-title text-5xl font-semibold uppercase leading-none text-[#1d2b22] md:text-6xl">
            kotoba
          </h1>
          <div className="flex flex-wrap items-end gap-3">
            {selectedVideo && (
              <Button variant="secondary" onClick={showLibrary}>
                Parcours
              </Button>
            )}
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#7a857e]">
                Niveau du quiz
              </span>
              <select
                value={selectedLevel}
                onChange={(event) => changeLevel(event.target.value)}
                className="h-10 rounded-md border border-[#d9e0da] bg-white px-3 text-sm font-semibold text-[#26332b] outline-none transition focus:border-[#315b40] focus:ring-2 focus:ring-[#d8e7dc]"
              >
                {studyLevels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label} - {level.description}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>
      </div>
      <div
        className={
          selectedVideo
            ? "mx-auto grid max-w-[1680px] gap-4"
            : "mx-auto grid max-w-[1680px] gap-4 xl:grid-cols-[300px_minmax(0,1fr)]"
        }
      >
        {selectedVideo ? (
          <div className="grid content-start gap-4 xl:grid-cols-[minmax(420px,0.9fr)_minmax(620px,1.25fr)]">
            <div className="grid content-start gap-4">
              <VideoPlayer video={selectedVideo} />
              <SubtitlesPanel
                rawText={subtitleDrafts[selectedVideo.id] ?? ""}
                vocabulary={selectedVideo.vocabulary}
                onChange={updateSubtitles}
                onReset={resetSubtitles}
              />
            </div>
            <StudyPanel
              video={selectedVideo}
            />
          </div>
        ) : (
          <>
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
                onSelect={selectVideo}
              />
            </div>
            <section className="rounded-lg border border-[#dfe5df] bg-white p-6">
              <h1 className="text-2xl font-semibold text-[#1d2b22]">
                {videos.length
                  ? "Selectionne une video"
                  : "Ajoute une video YouTube"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#59665e]">
                {videos.length
                  ? "Choisis une video dans le parcours pour ouvrir la lecture, les sous-titres et le quiz."
                  : "La liste est vide au depart. Entre un lien YouTube, importe les fichiers SRT, puis l'application creera le lexique et le quiz a partir des sous-titres."}
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
