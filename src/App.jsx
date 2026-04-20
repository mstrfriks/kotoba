import { useEffect, useMemo, useState } from "react";
import { VideoPlayer } from "./components/VideoPlayer";
import { StudyPanel } from "./components/StudyPanel";
import { SubtitlesPanel } from "./components/SubtitlesPanel";
import { HomeDashboard } from "./components/HomeDashboard";
import { Button } from "./components/ui/Button";
import { getApiHealth } from "./lib/api";
import {
  cleanSrtText,
  extractYoutubeId,
  generateStudyMaterials,
  makeVideoTitle,
  parseSrtSentences,
  studyLevels,
} from "./lib/utils";

const STORAGE_KEY = "japonais.studyLibrary.v1";
const LIBRARY_EXPORT_VERSION = 1;
const EMPTY_LIBRARY = {
  videos: [],
  selectedVideoId: "",
  subtitleDrafts: {},
  analysisByVideoId: {},
  quizProgressByVideoId: {},
  selectedLevel: "N5",
};

function makeEmptyLibrary() {
  return {
    ...EMPTY_LIBRARY,
    videos: [],
    subtitleDrafts: {},
    analysisByVideoId: {},
    quizProgressByVideoId: {},
  };
}

function isStudyLevel(value) {
  return studyLevels.some((level) => level.value === value);
}

function hasQcmQuiz(video) {
  return Array.isArray(video?.quiz)
    ? video.quiz.every(
        (question) =>
          Array.isArray(question?.choices) &&
          Number.isInteger(question?.answerIndex)
      )
    : false;
}

function formatStudyDuration(stats) {
  const sentenceCount = stats?.sentences ?? 0;
  if (sentenceCount > 0) {
    return `${sentenceCount} phrase${sentenceCount > 1 ? "s" : ""}`;
  }

  const lineCount = stats?.lines ?? 0;
  return `${lineCount} ligne${lineCount > 1 ? "s" : ""}`;
}

function normalizeQuizProgress(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, progress]) => progress && typeof progress === "object")
      .map(([videoId, progress]) => [
        videoId,
        {
          bestScore: Number.isFinite(progress.bestScore)
            ? progress.bestScore
            : 0,
          lastScore: Number.isFinite(progress.lastScore)
            ? progress.lastScore
            : 0,
          answered: Number.isFinite(progress.answered) ? progress.answered : 0,
          total: Number.isFinite(progress.total) ? progress.total : 0,
          updatedAt:
            typeof progress.updatedAt === "string" ? progress.updatedAt : "",
          completedAt:
            typeof progress.completedAt === "string"
              ? progress.completedAt
              : "",
        },
      ])
  );
}

function loadStoredLibrary() {
  if (typeof window === "undefined") return makeEmptyLibrary();

  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    if (!storedValue) return makeEmptyLibrary();

    return normalizeLibrary(JSON.parse(storedValue));
  } catch {
    return makeEmptyLibrary();
  }
}

function normalizeLibrary(value) {
  const source =
    value?.library && typeof value.library === "object" ? value.library : value;
  const videos = Array.isArray(source?.videos)
    ? source.videos.filter((video) => video?.id)
    : [];
  const subtitleDrafts =
    source?.subtitleDrafts &&
    typeof source.subtitleDrafts === "object" &&
    !Array.isArray(source.subtitleDrafts)
      ? Object.fromEntries(
          Object.entries(source.subtitleDrafts).filter(
            ([, value]) => typeof value === "string"
          )
        )
      : {};
  const analysisByVideoId =
    source?.analysisByVideoId &&
    typeof source.analysisByVideoId === "object" &&
    !Array.isArray(source.analysisByVideoId)
      ? source.analysisByVideoId
      : {};
  const quizProgressByVideoId = normalizeQuizProgress(
    source?.quizProgressByVideoId
  );
  const selectedVideoId =
    typeof source?.selectedVideoId === "string" &&
    videos.some((video) => video.id === source.selectedVideoId)
      ? source.selectedVideoId
      : videos[0]?.id ?? "";
  const videoLevel = videos.find(
    (video) => video.id === selectedVideoId
  )?.level;
  const selectedLevel = isStudyLevel(source?.selectedLevel)
    ? source.selectedLevel
    : isStudyLevel(videoLevel)
      ? videoLevel
      : EMPTY_LIBRARY.selectedLevel;
  const migratedVideos = videos.map((video) => {
    if (hasQcmQuiz(video)) return video;

    const level = isStudyLevel(video.level) ? video.level : selectedLevel;
    const subtitles = subtitleDrafts[video.id] ?? "";
    const materials = generateStudyMaterials(subtitles, level);
    return {
      ...video,
      level,
      duration: formatStudyDuration(materials.stats),
      vocabulary: materials.vocabulary,
      quiz: materials.quiz,
    };
  });

  return {
    videos: migratedVideos,
    selectedVideoId,
    subtitleDrafts,
    analysisByVideoId,
    quizProgressByVideoId,
    selectedLevel,
  };
}

export default function App() {
  const [library] = useState(loadStoredLibrary);
  const [videos, setVideos] = useState(library.videos);
  const [selectedVideoId, setSelectedVideoId] = useState(
    library.selectedVideoId
  );
  const [subtitleDrafts, setSubtitleDrafts] = useState(library.subtitleDrafts);
  const [analysisByVideoId, setAnalysisByVideoId] = useState(
    library.analysisByVideoId
  );
  const [quizProgressByVideoId, setQuizProgressByVideoId] = useState(
    library.quizProgressByVideoId
  );
  const [selectedLevel, setSelectedLevel] = useState(library.selectedLevel);
  const [importError, setImportError] = useState("");
  const [playbackTime, setPlaybackTime] = useState(0);
  const [seekRequest, setSeekRequest] = useState(null);
  const [apiHealth, setApiHealth] = useState({
    status: "checking",
    hasOpenAiKey: false,
    model: "",
  });

  const selectedVideo = useMemo(
    () => videos.find((video) => video.id === selectedVideoId) ?? null,
    [videos, selectedVideoId]
  );
  const selectedSubtitleText = selectedVideo
    ? subtitleDrafts[selectedVideo.id] ?? ""
    : "";
  const selectedSubtitleSentences = useMemo(
    () => parseSrtSentences(selectedSubtitleText),
    [selectedSubtitleText]
  );
  const activeSubtitle = useMemo(
    () =>
      selectedSubtitleSentences.find(
        (sentence) =>
          typeof sentence.startTime === "number" &&
          typeof sentence.endTime === "number" &&
          playbackTime >= sentence.startTime &&
          playbackTime < sentence.endTime + 0.25
      ) ?? null,
    [playbackTime, selectedSubtitleSentences]
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          videos,
          selectedVideoId,
          subtitleDrafts,
          analysisByVideoId,
          quizProgressByVideoId,
          selectedLevel,
        })
      );
    } catch {
      setImportError(
        "Le navigateur n'a pas pu sauvegarder les donnees localement."
      );
    }
  }, [
    videos,
    selectedVideoId,
    subtitleDrafts,
    analysisByVideoId,
    quizProgressByVideoId,
    selectedLevel,
  ]);

  useEffect(() => {
    let isCurrent = true;

    getApiHealth()
      .then((health) => {
        if (!isCurrent) return;
        setApiHealth({
          status: "online",
          hasOpenAiKey: Boolean(health.hasOpenAiKey),
          model: health.model ?? "",
        });
      })
      .catch(() => {
        if (!isCurrent) return;
        setApiHealth({
          status: "offline",
          hasOpenAiKey: false,
          model: "",
        });
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const canUseAi = apiHealth.status === "online" && apiHealth.hasOpenAiKey;
  const aiStatusLabel =
    apiHealth.status === "checking"
      ? "API..."
      : canUseAi
        ? `IA ${apiHealth.model || "prete"}`
        : apiHealth.status === "online"
          ? "Cle API manquante"
          : "API hors ligne";

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
      youtubeId,
      youtubeUrl,
      summary: `${fileNames.length} fichier${
        fileNames.length > 1 ? "s" : ""
      } SRT importe${fileNames.length > 1 ? "s" : ""}.`,
      focus: ["SRT", "Lexique auto", "Quiz auto"],
      vocabulary: materials.vocabulary,
      quiz: materials.quiz,
      fileNames,
      duration: formatStudyDuration(materials.stats),
    };

    setImportError("");
    setVideos((currentVideos) => [video, ...currentVideos]);
    setSubtitleDrafts((drafts) => ({ ...drafts, [id]: rawSubtitles }));
    setAnalysisByVideoId((analyses) => {
      const { [id]: ignored, ...remainingAnalyses } = analyses;
      return remainingAnalyses;
    });
    setQuizProgressByVideoId((progress) => {
      const { [id]: ignored, ...remainingProgress } = progress;
      return remainingProgress;
    });
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
    setAnalysisByVideoId((analyses) => {
      const { [selectedVideo.id]: ignored, ...remainingAnalyses } = analyses;
      return remainingAnalyses;
    });
    setQuizProgressByVideoId((progress) => {
      const { [selectedVideo.id]: ignored, ...remainingProgress } = progress;
      return remainingProgress;
    });
    setVideos((currentVideos) =>
      currentVideos.map((video) =>
        video.id === selectedVideo.id
          ? {
              ...video,
              duration: formatStudyDuration(materials.stats),
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
    setAnalysisByVideoId((analyses) => {
      const { [selectedVideo.id]: ignored, ...remainingAnalyses } = analyses;
      return remainingAnalyses;
    });
    setQuizProgressByVideoId((progress) => {
      const { [selectedVideo.id]: ignored, ...remainingProgress } = progress;
      return remainingProgress;
    });
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
              duration: formatStudyDuration(materials.stats),
              vocabulary: materials.vocabulary,
              quiz: materials.quiz,
            }
          : video
      )
    );
    setAnalysisByVideoId((analyses) => {
      const { [selectedVideo.id]: ignored, ...remainingAnalyses } = analyses;
      return remainingAnalyses;
    });
    setQuizProgressByVideoId((progress) => {
      const { [selectedVideo.id]: ignored, ...remainingProgress } = progress;
      return remainingProgress;
    });
  }

  function saveScriptAnalysis(analysis) {
    if (!selectedVideo) return;
    setAnalysisByVideoId((analyses) => ({
      ...analyses,
      [selectedVideo.id]: analysis,
    }));
  }

  function saveGeneratedQuiz(quiz) {
    if (!selectedVideo) return;
    setVideos((currentVideos) =>
      currentVideos.map((video) =>
        video.id === selectedVideo.id
          ? {
              ...video,
              quiz,
              focus: [...new Set([...(video.focus ?? []), "QCM IA"])],
            }
          : video
      )
    );
    setQuizProgressByVideoId((progress) => {
      const { [selectedVideo.id]: ignored, ...remainingProgress } = progress;
      return remainingProgress;
    });
  }

  function saveQuizProgress(progress) {
    if (!selectedVideo) return;

    setQuizProgressByVideoId((currentProgress) => {
      const previousProgress = currentProgress[selectedVideo.id] ?? {};
      const now = new Date().toISOString();
      const bestScore = Math.max(
        previousProgress.bestScore ?? 0,
        progress.correctAnswers
      );

      return {
        ...currentProgress,
        [selectedVideo.id]: {
          bestScore,
          lastScore: progress.correctAnswers,
          answered: progress.answered,
          total: progress.total,
          updatedAt: now,
          completedAt: progress.completed
            ? now
            : previousProgress.completedAt ?? "",
        },
      };
    });
  }

  function selectVideo(videoId) {
    const nextVideo = videos.find((video) => video.id === videoId);
    setSelectedVideoId(videoId);
    if (isStudyLevel(nextVideo?.level)) {
      setSelectedLevel(nextVideo.level);
    }
  }

  function renameVideo(videoId, title) {
    const nextTitle = title.trim();
    if (!nextTitle) return;

    setVideos((currentVideos) =>
      currentVideos.map((video) =>
        video.id === videoId ? { ...video, title: nextTitle } : video
      )
    );
  }

  function deleteVideo(videoId) {
    setVideos((currentVideos) =>
      currentVideos.filter((video) => video.id !== videoId)
    );
    setSubtitleDrafts((drafts) => {
      const { [videoId]: ignored, ...remainingDrafts } = drafts;
      return remainingDrafts;
    });
    setAnalysisByVideoId((analyses) => {
      const { [videoId]: ignored, ...remainingAnalyses } = analyses;
      return remainingAnalyses;
    });
    setQuizProgressByVideoId((progress) => {
      const { [videoId]: ignored, ...remainingProgress } = progress;
      return remainingProgress;
    });
    if (selectedVideoId === videoId) {
      setSelectedVideoId("");
    }
  }

  function showLibrary() {
    setSelectedVideoId("");
  }

  function seekToSubtitle(time) {
    setSeekRequest({ time, requestedAt: Date.now() });
  }

  function getLibrarySnapshot() {
    return {
      videos,
      selectedVideoId,
      subtitleDrafts,
      analysisByVideoId,
      quizProgressByVideoId,
      selectedLevel,
    };
  }

  function exportLibrary() {
    const payload = {
      app: "kotoba",
      version: LIBRARY_EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      library: getLibrarySnapshot(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `kotoba-bibliotheque-${date}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function importLibrary(file) {
    if (!file) return;

    try {
      const importedLibrary = normalizeLibrary(JSON.parse(await file.text()));
      setVideos(importedLibrary.videos);
      setSelectedVideoId(importedLibrary.selectedVideoId);
      setSubtitleDrafts(importedLibrary.subtitleDrafts);
      setAnalysisByVideoId(importedLibrary.analysisByVideoId);
      setQuizProgressByVideoId(importedLibrary.quizProgressByVideoId);
      setSelectedLevel(importedLibrary.selectedLevel);
      setImportError("");
    } catch {
      setImportError("Le fichier de sauvegarde Kotoba n'est pas valide.");
    }
  }

  return (
    <main className="min-h-screen bg-[#eef1ed] p-3 text-[#1d2b22] md:p-5">
      <div className="mx-auto max-w-[1680px]">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[#d8dfd9] bg-white px-4 py-3 shadow-sm">
          <h1 className="project-title text-5xl font-semibold uppercase leading-none text-[#1d2b22] md:text-6xl">
            kotoba
          </h1>
          <div className="flex flex-wrap items-end gap-3">
            <div
              className={
                canUseAi
                  ? "rounded-md border border-[#b9d5c0] bg-[#edf7ef] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#245332]"
                  : "rounded-md border border-[#e5d5b0] bg-[#fff9e8] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#7a5a18]"
              }
              title={
                canUseAi
                  ? "Le backend local est pret pour les fonctions IA."
                  : "Lance npm run app et renseigne OPENAI_API_KEY dans .env."
              }
            >
              {aiStatusLabel}
            </div>
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
            : ""
        }
      >
        {selectedVideo ? (
          <div className="grid content-start gap-4 xl:grid-cols-[minmax(460px,0.95fr)_minmax(620px,1.15fr)]">
            <div className="sticky top-5 grid content-start gap-4 self-start">
              <VideoPlayer
                video={selectedVideo}
                activeSubtitle={activeSubtitle}
                onTimeChange={setPlaybackTime}
                seekRequest={seekRequest}
              />
            </div>
            <StudyPanel
              video={selectedVideo}
              script={cleanSrtText(selectedSubtitleText)}
              canUseAi={canUseAi}
              quizProgress={quizProgressByVideoId[selectedVideo.id]}
              subtitlesPanel={
                <SubtitlesPanel
                  rawText={selectedSubtitleText}
                  sentences={selectedSubtitleSentences}
                  vocabulary={selectedVideo.vocabulary}
                  level={selectedVideo.level}
                  analysis={analysisByVideoId[selectedVideo.id]}
                  canUseAi={canUseAi}
                  embedded
                  currentTime={playbackTime}
                  onAnalysis={saveScriptAnalysis}
                  onChange={updateSubtitles}
                  onReset={resetSubtitles}
                  onSeek={seekToSubtitle}
                />
              }
              onQuizGenerated={saveGeneratedQuiz}
              onQuizProgress={saveQuizProgress}
            />
          </div>
        ) : (
          <HomeDashboard
            videos={videos}
            subtitleDrafts={subtitleDrafts}
            quizProgressByVideoId={quizProgressByVideoId}
            importError={importError}
            onAddVideo={addVideo}
            onExportLibrary={exportLibrary}
            onImportLibrary={importLibrary}
            onRenameVideo={renameVideo}
            onDeleteVideo={deleteVideo}
            onSelectVideo={selectVideo}
          />
        )}
      </div>
    </main>
  );
}
