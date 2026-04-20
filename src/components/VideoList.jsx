import { Pencil, PlayCircle, Trash2 } from "lucide-react";
import { cn } from "../lib/utils";

export function VideoList({
  videos,
  title = "Videos importees",
  selectedVideoId,
  subtitleDrafts,
  quizProgressByVideoId = {},
  onRename,
  onDelete,
  onSelect,
}) {
  return (
    <aside className="overflow-hidden rounded-lg border border-[#cfd8d1] bg-white shadow-sm">
      <div className="border-b border-[#e5e9e5] p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#7a857e]">
          Parcours
        </p>
        <h2 className="mt-1 text-lg font-semibold text-[#1d2b22]">
          {title}
        </h2>
      </div>
      <div className="study-scroll max-h-[calc(100vh-150px)] overflow-auto bg-[#fbfcfb] p-2">
        {!videos.length && (
          <div className="rounded-md border border-dashed border-[#d9e0da] p-4 text-sm leading-6 text-[#68756d]">
            Aucune video pour l'instant.
          </div>
        )}
        <div className="grid gap-2">
          {videos.map((video) => {
            const hasSubtitles = Boolean(subtitleDrafts[video.id]?.trim());
            const progress = quizProgressByVideoId[video.id];
            return (
              <div
                key={video.id}
                className={cn(
                  "overflow-hidden rounded-md border bg-white transition",
                  selectedVideoId === video.id
                    ? "border-[#244a34] bg-[#eef5ef]"
                    : "border-transparent hover:border-[#d9e0da] hover:bg-[#f7f9f7]"
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(video.id)}
                  className="block w-full p-3 text-left"
                >
                  <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
                    <PlayCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#315b40]" />
                    <div className="min-w-0">
                      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                        <p className="min-w-0 truncate font-medium text-[#1d2b22]">
                          {video.title}
                        </p>
                        {hasSubtitles && (
                          <span className="shrink-0 rounded bg-[#e2eee5] px-2 py-0.5 text-[11px] font-medium text-[#315b40]">
                            SRT
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-xs text-[#68756d]">
                        {video.level} · {video.duration}
                      </p>
                      {progress?.total > 0 && (
                        <p className="mt-1 truncate text-xs font-medium text-[#315b40]">
                          Meilleur score {progress.bestScore} / {progress.total}
                        </p>
                      )}
                      {video.fileNames?.length > 0 && (
                        <p className="mt-1 truncate text-xs text-[#7a857e]">
                          {video.fileNames.join(", ")}
                        </p>
                      )}
                      <p className="mt-2 line-clamp-2 overflow-anywhere text-sm leading-6 text-[#4f5d55]">
                        {video.summary}
                      </p>
                    </div>
                  </div>
                </button>
                <div className="flex items-center justify-end gap-1 border-t border-[#edf0ed] px-2 py-1">
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 items-center justify-center rounded text-[#526058] transition hover:bg-[#eef2ee] hover:text-[#1d2b22]"
                    title="Renommer la video"
                    onClick={() => {
                      const title = window.prompt(
                        "Nouveau titre de la video",
                        video.title
                      );
                      if (title !== null) onRename?.(video.id, title);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 items-center justify-center rounded text-[#8f3228] transition hover:bg-[#fff5f3]"
                    title="Supprimer la video"
                    onClick={() => {
                      const confirmed = window.confirm(
                        `Supprimer "${video.title}" et ses donnees locales ?`
                      );
                      if (confirmed) onDelete?.(video.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
