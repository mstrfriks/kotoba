export function VideoPlayer({ video }) {
  return (
    <section className="rounded-lg border border-[#dfe5df] bg-white">
      <div className="aspect-video overflow-hidden rounded-t-lg bg-[#111815]">
        <iframe
          className="h-full w-full"
          src={`https://www.youtube.com/embed/${video.youtubeId}`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
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
