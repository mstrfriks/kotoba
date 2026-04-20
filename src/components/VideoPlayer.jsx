import { useEffect, useRef } from "react";

function loadYouTubeIframeApi() {
  if (typeof window === "undefined") return Promise.reject();
  if (window.YT?.Player) return Promise.resolve(window.YT);

  return new Promise((resolve) => {
    const existingScript = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );
    const previousReady = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      resolve(window.YT);
    };

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    }
  });
}

export function VideoPlayer({
  video,
  activeSubtitle,
  onTimeChange,
  seekRequest,
}) {
  const iframeRef = useRef(null);
  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const pendingSeekRef = useRef(null);

  function applySeekRequest(request) {
    if (
      typeof request?.time !== "number" ||
      Number.isNaN(request.time)
    ) {
      return false;
    }

    const player = playerRef.current;
    if (!player?.seekTo) {
      pendingSeekRef.current = request;
      return false;
    }

    player.seekTo(request.time, true);
    player.playVideo?.();
    pendingSeekRef.current = null;
    return true;
  }

  useEffect(() => {
    let isCurrent = true;

    loadYouTubeIframeApi().then((YT) => {
      if (!isCurrent || !iframeRef.current) return;

      playerRef.current = new YT.Player(iframeRef.current, {
        events: {
          onReady: () => {
            applySeekRequest(pendingSeekRef.current);
            intervalRef.current = window.setInterval(() => {
              const player = playerRef.current;
              if (!player?.getCurrentTime) return;
              onTimeChange?.(player.getCurrentTime());
            }, 400);
          },
        },
      });
    });

    return () => {
      isCurrent = false;
      pendingSeekRef.current = null;
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [onTimeChange, video.youtubeId]);

  useEffect(() => {
    applySeekRequest(seekRequest);
  }, [seekRequest]);

  const origin =
    typeof window === "undefined" ? "" : `&origin=${window.location.origin}`;

  return (
    <section className="rounded-lg border border-[#dfe5df] bg-white">
      <div className="relative aspect-video overflow-hidden rounded-t-lg bg-[#111815]">
        <iframe
          ref={iframeRef}
          className="h-full w-full"
          src={`https://www.youtube.com/embed/${video.youtubeId}?enablejsapi=1${origin}`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
        {activeSubtitle?.text && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/55 to-transparent px-4 pb-4 pt-10">
            <p className="mx-auto max-w-3xl rounded bg-black/65 px-3 py-2 text-center text-base font-semibold leading-7 text-white shadow md:text-lg">
              {activeSubtitle.text}
            </p>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[#1d2b22]">
              {video.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#59665e]">
              {video.summary}
            </p>
          </div>
          <div className="rounded-md border border-[#dfe5df] px-3 py-2 text-sm text-[#4f5d55]">
            {video.level} · {video.duration}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {video.focus.map((item) => (
            <span
              key={item}
              className="rounded-md bg-[#eef2ee] px-2.5 py-1 text-xs font-medium text-[#516158]"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
