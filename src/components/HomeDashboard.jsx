import { useMemo, useState } from "react";
import {
  BookOpen,
  Clock3,
  Download,
  PlayCircle,
  Search,
  Upload,
} from "lucide-react";
import { VideoImporter } from "./VideoImporter";
import { VideoList } from "./VideoList";
import { Button } from "./ui/Button";

function getThumbnailUrl(video) {
  return `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`;
}

function formatProgress(progress) {
  if (!progress?.total) return "";
  return `Score ${progress.bestScore} / ${progress.total}`;
}

function VideoProposalCard({
  video,
  subtitleDrafts,
  progress,
  featured = false,
  onSelect,
}) {
  const hasSubtitles = Boolean(subtitleDrafts[video.id]?.trim());
  const quizCount = Array.isArray(video.quiz) ? video.quiz.length : 0;
  const vocabularyCount = Array.isArray(video.vocabulary)
    ? video.vocabulary.length
    : 0;
  const progressLabel = formatProgress(progress);

  return (
    <button
      type="button"
      onClick={() => onSelect(video.id)}
      className={
        featured
          ? "group grid overflow-hidden rounded-lg border border-[#cfd8d1] bg-white text-left shadow-sm transition hover:border-[#315b40] md:grid-cols-[minmax(240px,0.85fr)_minmax(0,1fr)]"
          : "group overflow-hidden rounded-lg border border-[#dfe5df] bg-white text-left shadow-sm transition hover:border-[#315b40]"
      }
    >
      <div className="relative aspect-video bg-[#111815]">
        <img
          src={getThumbnailUrl(video)}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/10 transition group-hover:bg-black/0" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-xs font-semibold text-white">
          <PlayCircle className="h-3.5 w-3.5" />
          {video.level}
        </span>
      </div>
      <div className={featured ? "p-5" : "p-4"}>
        <div className="flex flex-wrap items-center gap-2">
          {hasSubtitles && (
            <span className="rounded bg-[#e2eee5] px-2 py-1 text-xs font-semibold text-[#315b40]">
              SRT
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-xs font-medium text-[#68756d]">
            <Clock3 className="h-3.5 w-3.5" />
            {video.duration}
          </span>
        </div>
        <h3
          className={
            featured
              ? "mt-3 line-clamp-2 text-2xl font-semibold leading-8 text-[#1d2b22]"
              : "mt-3 line-clamp-2 text-lg font-semibold leading-7 text-[#1d2b22]"
          }
        >
          {video.title}
        </h3>
        <p className="mt-2 line-clamp-2 overflow-anywhere text-sm leading-6 text-[#59665e]">
          {video.summary}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-[#526058]">
          <span className="rounded bg-[#f1f4f1] px-2 py-1">
            {vocabularyCount} mots
          </span>
          <span className="rounded bg-[#f1f4f1] px-2 py-1">
            {quizCount} questions
          </span>
          {progressLabel && (
            <span className="rounded bg-[#eef5ef] px-2 py-1 text-[#315b40]">
              {progressLabel}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function HomeDashboard({
  videos,
  subtitleDrafts,
  quizProgressByVideoId = {},
  importError,
  backupStatus,
  canUseAi,
  onAddVideo,
  onSaveLibrary,
  onRestoreLibrary,
  onExportLibrary,
  onImportLibrary,
  onRenameVideo,
  onDeleteVideo,
  onSelectVideo,
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleVideos = useMemo(() => {
    if (!normalizedQuery) return videos;

    return videos.filter((video) =>
      [
        video.title,
        video.summary,
        video.level,
        video.duration,
        ...(video.fileNames ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [normalizedQuery, videos]);
  const featuredVideo = visibleVideos[0] ?? null;
  const proposedVideos = visibleVideos.slice(featuredVideo ? 1 : 0, 7);
  const isFiltered = Boolean(normalizedQuery);

  return (
    <div className="mx-auto grid max-w-[1680px] gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
      <div className="grid content-start gap-4">
        <section className="rounded-lg border border-[#cfd8d1] bg-white p-4 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#7a857e]">
              Sauvegarde
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[#1d2b22]">
              Bibliotheque partagee
            </h2>
          </div>
          <div className="mt-4 grid gap-2">
            <Button
              type="button"
              onClick={onSaveLibrary}
              disabled={!videos.length}
              className="w-full"
            >
              <Download className="h-4 w-4" />
              Synchroniser
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onRestoreLibrary}
              className="w-full"
            >
              <Upload className="h-4 w-4" />
              Restaurer backup
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onExportLibrary}
              disabled={!videos.length}
              className="w-full"
            >
              <Download className="h-4 w-4" />
              Export fichier
            </Button>
            <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-[#d7ddd8] bg-white px-4 text-sm font-medium text-[#233128] transition hover:bg-[#f0f3f0]">
              <Upload className="h-4 w-4" />
              Importer
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(event) => {
                  onImportLibrary(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          </div>
          {backupStatus && (
            <p className="mt-3 rounded-md bg-[#f7f9f7] p-2 text-xs font-medium text-[#526058]">
              {backupStatus}
            </p>
          )}
        </section>
        <VideoImporter canUseAi={canUseAi} onAddVideo={onAddVideo} />
        {importError && (
          <div className="rounded-md border border-[#f1c8c2] bg-[#fff6f4] p-3 text-sm font-medium text-[#a13d32]">
            {importError}
          </div>
        )}
        <VideoList
          videos={visibleVideos}
          title={isFiltered ? "Resultats" : "Videos importees"}
          selectedVideoId=""
          subtitleDrafts={subtitleDrafts}
          quizProgressByVideoId={quizProgressByVideoId}
          onRename={onRenameVideo}
          onDelete={onDeleteVideo}
          onSelect={onSelectVideo}
        />
      </div>

      <section className="grid content-start gap-4">
        <div className="rounded-lg border border-[#cfd8d1] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#7a857e]">
                Accueil
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-[#1d2b22]">
                Reprendre une video
              </h2>
            </div>
            <div className="inline-flex items-center gap-2 rounded-md bg-[#eef5ef] px-3 py-2 text-sm font-semibold text-[#315b40]">
              <BookOpen className="h-4 w-4" />
              {videos.length} video{videos.length > 1 ? "s" : ""}
            </div>
          </div>
          <label className="mt-4 flex items-center gap-2 rounded-md border border-[#d9e0da] bg-[#fbfcfb] px-3 focus-within:border-[#315b40] focus-within:ring-2 focus-within:ring-[#d8e7dc]">
            <Search className="h-4 w-4 shrink-0 text-[#68756d]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-10 min-w-0 flex-1 bg-transparent text-sm text-[#26332b] outline-none placeholder:text-[#9aa39d]"
              placeholder="Chercher une video, un fichier SRT, un niveau..."
            />
          </label>
          {isFiltered && (
            <p className="mt-2 text-xs font-medium text-[#68756d]">
              {visibleVideos.length} resultat
              {visibleVideos.length > 1 ? "s" : ""} sur {videos.length}
            </p>
          )}
        </div>

        {featuredVideo ? (
          <>
            <VideoProposalCard
              video={featuredVideo}
              subtitleDrafts={subtitleDrafts}
              progress={quizProgressByVideoId[featuredVideo.id]}
              featured
              onSelect={onSelectVideo}
            />
            {proposedVideos.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {proposedVideos.map((video) => (
                  <VideoProposalCard
                    key={video.id}
                    video={video}
                    subtitleDrafts={subtitleDrafts}
                    progress={quizProgressByVideoId[video.id]}
                    onSelect={onSelectVideo}
                  />
                ))}
              </div>
            )}
          </>
        ) : isFiltered ? (
          <div className="grid min-h-[280px] place-items-center rounded-lg border border-dashed border-[#cad5cc] bg-white p-8 text-center">
            <div className="max-w-md">
              <Search className="mx-auto h-10 w-10 text-[#315b40]" />
              <h2 className="mt-4 text-2xl font-semibold text-[#1d2b22]">
                Aucun resultat
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#59665e]">
                Essaie avec le titre, le nom du fichier SRT ou le niveau de la
                video.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid min-h-[360px] place-items-center rounded-lg border border-dashed border-[#cad5cc] bg-white p-8 text-center">
            <div className="max-w-md">
              <Upload className="mx-auto h-10 w-10 text-[#315b40]" />
              <h2 className="mt-4 text-2xl font-semibold text-[#1d2b22]">
                Ajoute ta premiere video
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#59665e]">
                Importe un lien YouTube et un fichier SRT pour creer un parcours
                local avec sous-titres, lexique et quiz.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
