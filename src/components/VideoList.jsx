import { PlayCircle } from "lucide-react";
import { cn } from "../lib/utils";

export function VideoList({ videos, selectedVideoId, subtitleDrafts, onSelect }) {
  return (
    <aside className="rounded-lg border border-[#dfe5df] bg-white">
      <div className="border-b border-[#e5e9e5] p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#7a857e]">
          Parcours
        </p>
        <h2 className="mt-1 text-lg font-semibold text-[#1d2b22]">
          Videos importees
        </h2>
      </div>
      <div className="study-scroll max-h-[calc(100vh-150px)] overflow-auto p-2">
        {!videos.length && (
          <div className="rounded-md border border-dashed border-[#d9e0da] p-4 text-sm leading-6 text-[#68756d]">
            Aucune video pour l'instant.
          </div>
        )}
        {videos.map((video) => {
          const hasSubtitles = Boolean(subtitleDrafts[video.id]?.trim());
          return (
            <button
              key={video.id}
              onClick={() => onSelect(video.id)}
              className={cn(
                "mb-2 w-full rounded-md border p-3 text-left transition",
                selectedVideoId === video.id
                  ? "border-[#244a34] bg-[#eef5ef]"
                  : "border-transparent hover:border-[#d9e0da] hover:bg-[#f7f9f7]"
              )}
            >
              <div className="flex items-start gap-3">
                <PlayCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#315b40]" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium text-[#1d2b22]">
                      {video.title}
                    </p>
                    {hasSubtitles && (
                      <span className="rounded bg-[#e2eee5] px-2 py-0.5 text-[11px] font-medium text-[#315b40]">
                        SRT
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[#68756d]">
                    {video.level} · {video.duration}
                  </p>
                  {video.fileNames?.length > 0 && (
                    <p className="mt-1 truncate text-xs text-[#7a857e]">
                      {video.fileNames.join(", ")}
                    </p>
                  )}
                  <p className="mt-2 line-clamp-2 text-sm text-[#4f5d55]">
                    {video.summary}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
