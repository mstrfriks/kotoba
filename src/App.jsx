import { useEffect, useMemo, useRef, useState } from "react";
import { VideoPlayer } from "./components/VideoPlayer";
import { StudyPanel } from "./components/StudyPanel";
import { SubtitlesPanel } from "./components/SubtitlesPanel";
import { HomeDashboard } from "./components/HomeDashboard";
import { Button } from "./components/ui/Button";
import {
  getAccessToken,
  getApiHealth,
  getLatestLibraryBackup,
  getSharedLibrary,
  saveLibraryBackup,
  saveAccessToken,
  saveSharedLibrary,
} from "./lib/api";
import {
  cleanSrtText,
  extractYoutubeId,
  generateStudyMaterials,
  makeVideoTitle,
  makeStudyCards,
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
  studyCardsByVideoId: {},
  reviewProgressByCardId: {},
  deletedVideoIds: {},
  selectedLevel: "N5",
};

function makeEmptyLibrary() {
  return {
    ...EMPTY_LIBRARY,
    videos: [],
    subtitleDrafts: {},
    analysisByVideoId: {},
    quizProgressByVideoId: {},
    studyCardsByVideoId: {},
    reviewProgressByCardId: {},
    deletedVideoIds: {},
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

function hasVideoFocus(video, value) {
  return Array.isArray(video?.focus) && video.focus.includes(value);
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

function normalizeDeletedVideoIds(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .filter(([videoId]) => typeof videoId === "string" && videoId)
      .map(([videoId, deletedAt]) => [
        videoId,
        typeof deletedAt === "string" && deletedAt
          ? deletedAt
          : new Date(0).toISOString(),
      ])
  );
}

function normalizeRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function getProgressTimestamp(progress) {
  return Date.parse(progress?.updatedAt ?? "") || 0;
}

function getReviewTimestamp(progress) {
  return Date.parse(progress?.reviewedAt ?? "") || 0;
}

function getVideoTimestamp(video) {
  return Date.parse(video?.updatedAt ?? video?.createdAt ?? "") || 0;
}

function getDeletedTimestamp(deletedVideoIds, videoId) {
  return Date.parse(deletedVideoIds?.[videoId] ?? "") || 0;
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
  const studyCardsByVideoId = normalizeRecord(source?.studyCardsByVideoId);
  const reviewProgressByCardId = normalizeRecord(source?.reviewProgressByCardId);
  const deletedVideoIds = normalizeDeletedVideoIds(source?.deletedVideoIds);
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
    const level = isStudyLevel(video.level) ? video.level : selectedLevel;
    const subtitles = subtitleDrafts[video.id] ?? "";
    const materials = generateStudyMaterials(subtitles, level);
    const hasAiLexicon = hasVideoFocus(video, "Lexique IA");
    const hasAiQuiz = hasVideoFocus(video, "QCM IA");
    const storedVocabulary = Array.isArray(video.vocabulary)
      ? video.vocabulary
      : [];
    const storedQuiz = hasQcmQuiz(video) ? video.quiz : [];
    const now = new Date().toISOString();
    const createdAt =
      typeof video.createdAt === "string" && video.createdAt
        ? video.createdAt
        : typeof video.updatedAt === "string" && video.updatedAt
          ? video.updatedAt
          : now;

    return {
      ...video,
      createdAt,
      updatedAt:
        typeof video.updatedAt === "string" && video.updatedAt
          ? video.updatedAt
          : createdAt,
      level,
      duration: formatStudyDuration(materials.stats),
      localVocabulary: Array.isArray(video.localVocabulary)
        ? video.localVocabulary
        : hasAiLexicon
          ? materials.vocabulary
          : storedVocabulary.length > 0
            ? storedVocabulary
            : materials.vocabulary,
      localQuiz: Array.isArray(video.localQuiz)
        ? video.localQuiz
        : hasAiQuiz
          ? materials.quiz
          : storedQuiz.length > 0
            ? storedQuiz
            : materials.quiz,
      vocabulary: hasAiLexicon ? storedVocabulary : [],
      quiz: hasAiQuiz ? storedQuiz : [],
    };
  });

  return {
    videos: migratedVideos,
    selectedVideoId,
    subtitleDrafts,
    analysisByVideoId,
    quizProgressByVideoId,
    studyCardsByVideoId,
    reviewProgressByCardId,
    deletedVideoIds,
    selectedLevel,
  };
}

function hasLibraryContent(library) {
  return Array.isArray(library?.videos) && library.videos.length > 0;
}

function mergeQuizProgress(localProgress, remoteProgress) {
  const localTime = getProgressTimestamp(localProgress);
  const remoteTime = getProgressTimestamp(remoteProgress);
  const latestProgress =
    remoteTime > localTime ? remoteProgress : localProgress;

  return {
    ...latestProgress,
    bestScore: Math.max(
      Number(localProgress?.bestScore) || 0,
      Number(remoteProgress?.bestScore) || 0
    ),
  };
}

function mergeReviewProgress(localProgress = {}, remoteProgress = {}) {
  const mergedProgress = {};
  for (const cardId of new Set([
    ...Object.keys(localProgress),
    ...Object.keys(remoteProgress),
  ])) {
    mergedProgress[cardId] =
      getReviewTimestamp(localProgress[cardId]) >=
      getReviewTimestamp(remoteProgress[cardId])
        ? localProgress[cardId]
        : remoteProgress[cardId];
  }
  return mergedProgress;
}

function mergeLibraries(localLibrary, remoteLibrary) {
  const local = normalizeLibrary(localLibrary);
  const remote = normalizeLibrary(remoteLibrary);
  const deletedVideoIds = {};
  for (const videoId of new Set([
    ...Object.keys(local.deletedVideoIds),
    ...Object.keys(remote.deletedVideoIds),
  ])) {
    deletedVideoIds[videoId] =
      getDeletedTimestamp(local.deletedVideoIds, videoId) >=
      getDeletedTimestamp(remote.deletedVideoIds, videoId)
        ? local.deletedVideoIds[videoId]
        : remote.deletedVideoIds[videoId];
  }
  const videosById = new Map();

  for (const video of [...remote.videos, ...local.videos]) {
    const deletedAt = getDeletedTimestamp(deletedVideoIds, video.id);
    if (deletedAt && deletedAt >= getVideoTimestamp(video)) continue;

    const previousVideo = videosById.get(video.id);
    if (
      !previousVideo ||
      getVideoTimestamp(video) >= getVideoTimestamp(previousVideo)
    ) {
      videosById.set(video.id, video);
    }
  }

  const videos = [...videosById.values()].sort(
    (a, b) => getVideoTimestamp(b) - getVideoTimestamp(a)
  );
  const liveVideoIds = new Set(videos.map((video) => video.id));
  const subtitleDrafts = {};
  const analysisByVideoId = {};
  const quizProgressByVideoId = {};
  const studyCardsByVideoId = {};

  for (const video of videos) {
    const localVideoTime = getVideoTimestamp(
      local.videos.find((item) => item.id === video.id)
    );
    const remoteVideoTime = getVideoTimestamp(
      remote.videos.find((item) => item.id === video.id)
    );
    subtitleDrafts[video.id] =
      localVideoTime >= remoteVideoTime
        ? local.subtitleDrafts[video.id] ?? remote.subtitleDrafts[video.id] ?? ""
        : remote.subtitleDrafts[video.id] ??
          local.subtitleDrafts[video.id] ??
          "";

    analysisByVideoId[video.id] =
      localVideoTime >= remoteVideoTime
        ? local.analysisByVideoId[video.id] ?? remote.analysisByVideoId[video.id]
        : remote.analysisByVideoId[video.id] ??
          local.analysisByVideoId[video.id];

    quizProgressByVideoId[video.id] = mergeQuizProgress(
      local.quizProgressByVideoId[video.id],
      remote.quizProgressByVideoId[video.id]
    );

    if (!quizProgressByVideoId[video.id]?.total) {
      delete quizProgressByVideoId[video.id];
    }

    studyCardsByVideoId[video.id] =
      localVideoTime >= remoteVideoTime
        ? local.studyCardsByVideoId[video.id] ??
          remote.studyCardsByVideoId[video.id] ??
          []
        : remote.studyCardsByVideoId[video.id] ??
          local.studyCardsByVideoId[video.id] ??
          [];
  }

  const selectedVideoId = liveVideoIds.has(local.selectedVideoId)
    ? local.selectedVideoId
    : liveVideoIds.has(remote.selectedVideoId)
      ? remote.selectedVideoId
      : videos[0]?.id ?? "";

  return normalizeLibrary({
    videos,
    selectedVideoId,
    subtitleDrafts,
    analysisByVideoId,
    quizProgressByVideoId,
    studyCardsByVideoId,
    reviewProgressByCardId: mergeReviewProgress(
      local.reviewProgressByCardId,
      remote.reviewProgressByCardId
    ),
    deletedVideoIds,
    selectedLevel: local.selectedLevel || remote.selectedLevel,
  });
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
  const [studyCardsByVideoId, setStudyCardsByVideoId] = useState(
    library.studyCardsByVideoId
  );
  const [reviewProgressByCardId, setReviewProgressByCardId] = useState(
    library.reviewProgressByCardId
  );
  const [deletedVideoIds, setDeletedVideoIds] = useState(
    library.deletedVideoIds
  );
  const [selectedLevel, setSelectedLevel] = useState(library.selectedLevel);
  const [importError, setImportError] = useState("");
  const [backupStatus, setBackupStatus] = useState("");
  const [accessToken, setAccessToken] = useState(getAccessToken);
  const hasLoadedSharedLibraryRef = useRef(false);
  const isSharedSyncReadyRef = useRef(false);
  const isApplyingSharedLibraryRef = useRef(false);
  const serverRevisionRef = useRef("");
  const syncTimerRef = useRef(null);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [seekRequest, setSeekRequest] = useState(null);
  const [apiHealth, setApiHealth] = useState({
    status: "checking",
    hasOpenAiKey: false,
    hasAccessToken: false,
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
  const selectedReviewCards = useMemo(() => {
    if (!selectedVideo) return [];
    const storedCards = studyCardsByVideoId[selectedVideo.id];
    if (Array.isArray(storedCards) && storedCards.length) return storedCards;

    return makeStudyCards({
      videoId: selectedVideo.id,
      vocabulary: selectedVideo.vocabulary,
      sentences: selectedSubtitleSentences,
      analysis: analysisByVideoId[selectedVideo.id],
    });
  }, [
    selectedVideo,
    selectedSubtitleSentences,
    analysisByVideoId,
    studyCardsByVideoId,
  ]);

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
          studyCardsByVideoId,
          reviewProgressByCardId,
          deletedVideoIds,
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
    studyCardsByVideoId,
    reviewProgressByCardId,
    deletedVideoIds,
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
          hasAccessToken: Boolean(health.hasAccessToken),
          model: health.model ?? "",
        });
      })
      .catch(() => {
        if (!isCurrent) return;
        setApiHealth({
          status: "offline",
          hasOpenAiKey: false,
          hasAccessToken: false,
          model: "",
        });
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    if (
      apiHealth.status !== "online" ||
      hasLoadedSharedLibraryRef.current ||
      (apiHealth.hasAccessToken && !accessToken)
    ) {
      return;
    }

    hasLoadedSharedLibraryRef.current = true;
    setBackupStatus("Synchronisation serveur...");

    getSharedLibrary()
      .then((result) => {
        const sharedLibrary = normalizeLibrary(result.library);
        serverRevisionRef.current = result.revision ?? "";
        if (!hasLibraryContent(sharedLibrary)) {
          isSharedSyncReadyRef.current = true;
          setBackupStatus("Aucune bibliotheque serveur.");
          return;
        }

        isApplyingSharedLibraryRef.current = true;
        applyLibrary(sharedLibrary);
        isSharedSyncReadyRef.current = true;
        setImportError("");
        setBackupStatus("Bibliotheque serveur chargee.");
      })
      .catch((error) => {
        if (error.status !== 404) {
          if (error.status === 401) {
            hasLoadedSharedLibraryRef.current = false;
            isSharedSyncReadyRef.current = false;
          }
          setBackupStatus(error.message);
          return;
        }

        const localLibrary = getLibrarySnapshot();
        if (!hasLibraryContent(localLibrary)) {
          isSharedSyncReadyRef.current = true;
          setBackupStatus("Aucune bibliotheque serveur.");
          return;
        }

        saveSharedLibrary(localLibrary)
          .then((result) => {
            serverRevisionRef.current = result.revision ?? "";
            isSharedSyncReadyRef.current = true;
            setBackupStatus("Bibliotheque locale envoyee au serveur.");
          })
          .catch((syncError) => {
            if (syncError.status === 401) {
              hasLoadedSharedLibraryRef.current = false;
              isSharedSyncReadyRef.current = false;
            }
            setBackupStatus(syncError.message);
          });
      });
  }, [apiHealth.status, apiHealth.hasAccessToken, accessToken]);

  useEffect(() => {
    if (
      apiHealth.status !== "online" ||
      !hasLoadedSharedLibraryRef.current ||
      (apiHealth.hasAccessToken && !accessToken)
    ) {
      return;
    }

    if (!isSharedSyncReadyRef.current) {
      return;
    }

    if (isApplyingSharedLibraryRef.current) {
      isApplyingSharedLibraryRef.current = false;
      return;
    }

    window.clearTimeout(syncTimerRef.current);
    const snapshot = getLibrarySnapshot();

    syncTimerRef.current = window.setTimeout(() => {
      setBackupStatus("Synchronisation serveur...");
      saveSharedLibrary(snapshot, serverRevisionRef.current)
        .then((result) => {
          serverRevisionRef.current = result.revision ?? "";
          setBackupStatus("Bibliotheque synchronisee sur le serveur.");
        })
        .catch((error) => {
          if (error.status === 409 && error.library) {
            const mergedLibrary = mergeLibraries(snapshot, error.library);
            isApplyingSharedLibraryRef.current = true;
            applyLibrary(mergedLibrary);
            serverRevisionRef.current = error.revision ?? "";
            saveSharedLibrary(mergedLibrary, serverRevisionRef.current)
              .then((result) => {
                serverRevisionRef.current = result.revision ?? "";
                setBackupStatus("Conflit fusionne et synchronise.");
              })
              .catch((syncError) => {
                setBackupStatus(syncError.message);
              });
            return;
          }

          setBackupStatus(error.message);
        });
    }, 900);

    return () => {
      window.clearTimeout(syncTimerRef.current);
    };
  }, [
    videos,
    selectedVideoId,
    subtitleDrafts,
    analysisByVideoId,
    quizProgressByVideoId,
    studyCardsByVideoId,
    reviewProgressByCardId,
    deletedVideoIds,
    selectedLevel,
    apiHealth.status,
    apiHealth.hasAccessToken,
    accessToken,
  ]);

  const hasRequiredAccessToken = !apiHealth.hasAccessToken || Boolean(accessToken);
  const canUseAi =
    apiHealth.status === "online" &&
    apiHealth.hasOpenAiKey &&
    hasRequiredAccessToken;
  const aiStatusLabel =
    apiHealth.status === "checking"
      ? "API..."
      : canUseAi
        ? `IA ${apiHealth.model || "prete"}`
        : apiHealth.status === "online" && apiHealth.hasAccessToken
          ? "Token requis"
        : apiHealth.status === "online"
          ? "Cle API manquante"
          : "API hors ligne";

  function updateAccessToken(value) {
    setAccessToken(value);
    saveAccessToken(value);
  }

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
    const now = new Date().toISOString();
    const video = {
      id,
      createdAt: now,
      updatedAt: now,
      title: makeVideoTitle(youtubeUrl, fileNames),
      level: selectedLevel,
      youtubeId,
      youtubeUrl,
      summary: `${fileNames.length} fichier${
        fileNames.length > 1 ? "s" : ""
      } SRT importe${fileNames.length > 1 ? "s" : ""}.`,
      focus: ["SRT"],
      localVocabulary: materials.vocabulary,
      localQuiz: materials.quiz,
      vocabulary: [],
      quiz: [],
      fileNames,
      duration: formatStudyDuration(materials.stats),
    };

    setImportError("");
    setVideos((currentVideos) => [video, ...currentVideos]);
    setDeletedVideoIds((deletedIds) => {
      const { [id]: ignored, ...remainingDeletedIds } = deletedIds;
      return remainingDeletedIds;
    });
    setSubtitleDrafts((drafts) => ({ ...drafts, [id]: rawSubtitles }));
    setAnalysisByVideoId((analyses) => {
      const { [id]: ignored, ...remainingAnalyses } = analyses;
      return remainingAnalyses;
    });
    setStudyCardsByVideoId((cardsByVideoId) => ({
      ...cardsByVideoId,
      [id]: makeStudyCards({
        videoId: id,
        vocabulary: [],
        sentences: parseSrtSentences(rawSubtitles),
        analysis: null,
      }),
    }));
    setQuizProgressByVideoId((progress) => {
      const { [id]: ignored, ...remainingProgress } = progress;
      return remainingProgress;
    });
    setSelectedVideoId(id);
    return true;
  }

  function updateSubtitles(value) {
    if (!selectedVideo) return;
    const now = new Date().toISOString();
    const materials = generateStudyMaterials(value, selectedVideo.level);
    setSubtitleDrafts((drafts) => ({
      ...drafts,
      [selectedVideo.id]: value,
    }));
    setAnalysisByVideoId((analyses) => {
      const { [selectedVideo.id]: ignored, ...remainingAnalyses } = analyses;
      return remainingAnalyses;
    });
    setStudyCardsByVideoId((cardsByVideoId) => ({
      ...cardsByVideoId,
      [selectedVideo.id]: makeStudyCards({
        videoId: selectedVideo.id,
        vocabulary: selectedVideo.vocabulary,
        sentences: parseSrtSentences(value),
        analysis: null,
      }),
    }));
    setQuizProgressByVideoId((progress) => {
      const { [selectedVideo.id]: ignored, ...remainingProgress } = progress;
      return remainingProgress;
    });
    setVideos((currentVideos) =>
      currentVideos.map((video) =>
        video.id === selectedVideo.id
          ? {
              ...video,
              updatedAt: now,
              duration: formatStudyDuration(materials.stats),
              localVocabulary: materials.vocabulary,
              localQuiz: materials.quiz,
            }
          : video
      )
    );
  }

  function resetSubtitles() {
    if (!selectedVideo) return;
    const now = new Date().toISOString();
    setSubtitleDrafts((drafts) => ({
      ...drafts,
      [selectedVideo.id]: "",
    }));
    setAnalysisByVideoId((analyses) => {
      const { [selectedVideo.id]: ignored, ...remainingAnalyses } = analyses;
      return remainingAnalyses;
    });
    setStudyCardsByVideoId((cardsByVideoId) => ({
      ...cardsByVideoId,
      [selectedVideo.id]: [],
    }));
    setQuizProgressByVideoId((progress) => {
      const { [selectedVideo.id]: ignored, ...remainingProgress } = progress;
      return remainingProgress;
    });
    setVideos((currentVideos) =>
      currentVideos.map((video) =>
        video.id === selectedVideo.id
          ? {
              ...video,
              updatedAt: now,
              duration: "0 ligne",
              localVocabulary: [],
              localQuiz: [],
              vocabulary: [],
              quiz: [],
            }
          : video
      )
    );
  }

  function changeLevel(level) {
    setSelectedLevel(level);
    if (!selectedVideo) return;

    const now = new Date().toISOString();
    const subtitles = subtitleDrafts[selectedVideo.id] ?? "";
    const materials = generateStudyMaterials(subtitles, level);
    setVideos((currentVideos) =>
      currentVideos.map((video) =>
        video.id === selectedVideo.id
          ? {
              ...video,
              updatedAt: now,
              level,
              duration: formatStudyDuration(materials.stats),
              localVocabulary: materials.vocabulary,
              localQuiz: materials.quiz,
            }
          : video
      )
    );
    setAnalysisByVideoId((analyses) => {
      const { [selectedVideo.id]: ignored, ...remainingAnalyses } = analyses;
      return remainingAnalyses;
    });
    setStudyCardsByVideoId((cardsByVideoId) => ({
      ...cardsByVideoId,
      [selectedVideo.id]: makeStudyCards({
        videoId: selectedVideo.id,
        vocabulary: selectedVideo.vocabulary,
        sentences: selectedSubtitleSentences,
        analysis: null,
      }),
    }));
    setQuizProgressByVideoId((progress) => {
      const { [selectedVideo.id]: ignored, ...remainingProgress } = progress;
      return remainingProgress;
    });
  }

  function saveScriptAnalysis(analysis) {
    if (!selectedVideo) return;
    const now = new Date().toISOString();
    setVideos((currentVideos) =>
      currentVideos.map((video) =>
        video.id === selectedVideo.id ? { ...video, updatedAt: now } : video
      )
    );
    setAnalysisByVideoId((analyses) => ({
      ...analyses,
      [selectedVideo.id]: analysis,
    }));
    setStudyCardsByVideoId((cardsByVideoId) => ({
      ...cardsByVideoId,
      [selectedVideo.id]: makeStudyCards({
        videoId: selectedVideo.id,
        vocabulary: selectedVideo.vocabulary,
        sentences: selectedSubtitleSentences,
        analysis,
      }),
    }));
  }

  function saveGeneratedQuiz(quiz) {
    if (!selectedVideo) return;
    const now = new Date().toISOString();
    setVideos((currentVideos) =>
      currentVideos.map((video) =>
        video.id === selectedVideo.id
          ? {
              ...video,
              updatedAt: now,
              quiz,
              focus: [
                ...new Set([
                  ...(video.focus ?? []).filter((item) => item !== "Quiz auto"),
                  "QCM IA",
                ]),
              ],
            }
          : video
      )
    );
    setQuizProgressByVideoId((progress) => {
      const { [selectedVideo.id]: ignored, ...remainingProgress } = progress;
      return remainingProgress;
    });
  }

  function saveGeneratedLexicon(vocabulary) {
    if (!selectedVideo) return;
    const now = new Date().toISOString();
    setVideos((currentVideos) =>
      currentVideos.map((video) =>
        video.id === selectedVideo.id
          ? {
              ...video,
              updatedAt: now,
              vocabulary,
              focus: [
                ...new Set([
                  ...(video.focus ?? []).filter(
                    (item) => item !== "Lexique auto"
                  ),
                  "Lexique IA",
                ]),
              ],
            }
          : video
      )
    );
    setStudyCardsByVideoId((cardsByVideoId) => ({
      ...cardsByVideoId,
      [selectedVideo.id]: makeStudyCards({
        videoId: selectedVideo.id,
        vocabulary,
        sentences: selectedSubtitleSentences,
        analysis: analysisByVideoId[selectedVideo.id],
      }),
    }));
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
    setVideos((currentVideos) =>
      currentVideos.map((video) =>
        video.id === selectedVideo.id
          ? { ...video, updatedAt: new Date().toISOString() }
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

  function renameVideo(videoId, title) {
    const nextTitle = title.trim();
    if (!nextTitle) return;

    const now = new Date().toISOString();
    setVideos((currentVideos) =>
      currentVideos.map((video) =>
        video.id === videoId
          ? { ...video, title: nextTitle, updatedAt: now }
          : video
      )
    );
  }

  function deleteVideo(videoId) {
    const now = new Date().toISOString();
    setVideos((currentVideos) =>
      currentVideos.filter((video) => video.id !== videoId)
    );
    setDeletedVideoIds((deletedIds) => ({ ...deletedIds, [videoId]: now }));
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
    setStudyCardsByVideoId((cardsByVideoId) => {
      const { [videoId]: ignored, ...remainingCards } = cardsByVideoId;
      return remainingCards;
    });
    setReviewProgressByCardId((progressByCardId) =>
      Object.fromEntries(
        Object.entries(progressByCardId).filter(
          ([cardId]) => !cardId.startsWith(`${videoId}:`)
        )
      )
    );
    if (selectedVideoId === videoId) {
      setSelectedVideoId("");
    }
  }

  function showLibrary() {
    setSelectedVideoId("");
  }

  function seekToSubtitle(time, endTime = null) {
    setSeekRequest({ time, endTime, requestedAt: Date.now() });
  }

  function saveReviewProgress(card, grade) {
    if (!card?.id) return;

    const now = new Date();
    const previousProgress = reviewProgressByCardId[card.id] ?? {};
    const previousBox = Number(previousProgress.box) || 1;
    const nextBox =
      grade === "again" ? 1 : grade === "easy" ? previousBox + 2 : previousBox + 1;
    const intervals = {
      again: 15 * 60 * 1000,
      good: Math.min(14, nextBox * nextBox) * 24 * 60 * 60 * 1000,
      easy: Math.min(30, nextBox * nextBox + 3) * 24 * 60 * 60 * 1000,
    };
    const dueAt = new Date(now.getTime() + intervals[grade]).toISOString();

    setReviewProgressByCardId((progressByCardId) => ({
      ...progressByCardId,
      [card.id]: {
        box: nextBox,
        grade,
        reviewedAt: now.toISOString(),
        dueAt,
      },
    }));
  }

  function replayReviewCard(card) {
    if (typeof card?.startTime !== "number") return;
    seekToSubtitle(card.startTime, card.endTime);
  }

  function getLibrarySnapshot() {
    return {
      videos,
      selectedVideoId,
      subtitleDrafts,
      analysisByVideoId,
      quizProgressByVideoId,
      studyCardsByVideoId,
      reviewProgressByCardId,
      deletedVideoIds,
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
      applyLibrary(importedLibrary);
      setImportError("");
    } catch {
      setImportError("Le fichier de sauvegarde Kotoba n'est pas valide.");
    }
  }

  async function saveLibraryToServer() {
    setBackupStatus("");

    try {
      const syncResult = await saveSharedLibrary(
        getLibrarySnapshot(),
        serverRevisionRef.current
      );
      serverRevisionRef.current = syncResult.revision ?? "";
      const result = await saveLibraryBackup(getLibrarySnapshot());
      setBackupStatus(`Bibliotheque synchronisee : ${result.filename}`);
    } catch (error) {
      if (error.status === 409 && error.library) {
        const mergedLibrary = mergeLibraries(getLibrarySnapshot(), error.library);
        applyLibrary(mergedLibrary);
        serverRevisionRef.current = error.revision ?? "";
        const syncResult = await saveSharedLibrary(
          mergedLibrary,
          serverRevisionRef.current
        );
        serverRevisionRef.current = syncResult.revision ?? "";
        const result = await saveLibraryBackup(mergedLibrary);
        setBackupStatus(`Conflit fusionne : ${result.filename}`);
        return;
      }

      setBackupStatus(error.message);
    }
  }

  function applyLibrary(importedLibrary) {
    setVideos(importedLibrary.videos);
    setSelectedVideoId(importedLibrary.selectedVideoId);
    setSubtitleDrafts(importedLibrary.subtitleDrafts);
    setAnalysisByVideoId(importedLibrary.analysisByVideoId);
    setQuizProgressByVideoId(importedLibrary.quizProgressByVideoId);
    setStudyCardsByVideoId(importedLibrary.studyCardsByVideoId);
    setReviewProgressByCardId(importedLibrary.reviewProgressByCardId);
    setDeletedVideoIds(importedLibrary.deletedVideoIds);
    setSelectedLevel(importedLibrary.selectedLevel);
  }

  async function restoreLatestLibraryBackup() {
    setBackupStatus("");

    try {
      const result = await getLatestLibraryBackup();
      applyLibrary(normalizeLibrary(result.backup));
      setImportError("");
      setBackupStatus(`Sauvegarde restauree : ${result.filename}`);
    } catch (error) {
      setBackupStatus(error.message);
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
            {apiHealth.hasAccessToken && (
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#7a857e]">
                  Token
                </span>
                <input
                  type="password"
                  value={accessToken}
                  onChange={(event) => updateAccessToken(event.target.value)}
                  className="h-10 w-44 rounded-md border border-[#d9e0da] bg-white px-3 text-sm font-medium text-[#26332b] outline-none transition placeholder:text-[#9aa39d] focus:border-[#315b40] focus:ring-2 focus:ring-[#d8e7dc]"
                  placeholder="Acces Kotoba"
                />
              </label>
            )}
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
              reviewCards={selectedReviewCards}
              reviewProgressByCardId={reviewProgressByCardId}
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
              onLexiconGenerated={saveGeneratedLexicon}
              onQuizProgress={saveQuizProgress}
              onReviewGrade={saveReviewProgress}
              onReviewReplay={replayReviewCard}
            />
          </div>
        ) : (
          <HomeDashboard
            videos={videos}
            subtitleDrafts={subtitleDrafts}
            quizProgressByVideoId={quizProgressByVideoId}
            importError={importError}
            backupStatus={backupStatus}
            onAddVideo={addVideo}
            onSaveLibrary={saveLibraryToServer}
            onRestoreLibrary={restoreLatestLibraryBackup}
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
