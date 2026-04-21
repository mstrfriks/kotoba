import { Clock3, PlayCircle, RotateCcw } from "lucide-react";
import { Button } from "./ui/Button";

function getDueTime(progress) {
  return Date.parse(progress?.dueAt ?? "") || 0;
}

function isDue(card, progressByCardId) {
  const dueTime = getDueTime(progressByCardId[card.id]);
  return !dueTime || dueTime <= Date.now();
}

function formatCardType(type) {
  return type === "sentence" ? "Phrase" : "Mot";
}

export function ReviewPanel({
  cards,
  progressByCardId,
  activeCardId,
  showAnswer,
  onShowAnswer,
  onGrade,
  onReplay,
  onRestart,
}) {
  const dueCards = cards.filter((card) => isDue(card, progressByCardId));
  const activeCard =
    cards.find((card) => card.id === activeCardId) ?? dueCards[0] ?? cards[0];
  const activeProgress = activeCard
    ? progressByCardId[activeCard.id] ?? {}
    : {};

  if (!cards.length) {
    return (
      <div className="rounded-md border border-dashed border-[#d9e0da] bg-white p-4 text-sm leading-6 text-[#68756d]">
        Aucun paquet de revision. Genere un lexique IA ou analyse les phrases
        horodatees pour creer des cartes.
      </div>
    );
  }

  if (!activeCard) {
    return null;
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#dfe5df] bg-white px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#7a857e]">
            Revision espacee
          </p>
          <p className="mt-1 text-sm font-medium text-[#26332b]">
            {dueCards.length} carte{dueCards.length > 1 ? "s" : ""} a revoir
            · {cards.length} au total
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={onRestart}>
          <RotateCcw className="h-4 w-4" />
          Session
        </Button>
      </div>

      <article className="rounded-md border border-[#dfe5df] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded bg-[#eef5ef] px-2 py-1 text-xs font-semibold text-[#315b40]">
            {formatCardType(activeCard.type)}
          </span>
          {activeProgress.reviewedAt && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#7a857e]">
              <Clock3 className="h-3.5 w-3.5" />
              Niveau {activeProgress.box ?? 1}
            </span>
          )}
        </div>

        <div className="mt-5 rounded-md bg-[#f7f9f7] p-4">
          <p className="text-2xl font-semibold leading-9 text-[#1d2b22]">
            {activeCard.front}
          </p>
          {activeCard.reading && (
            <p className="mt-2 text-sm font-medium text-[#68756d]">
              {activeCard.reading}
            </p>
          )}
          {activeCard.hint && (
            <p className="mt-3 text-sm leading-6 text-[#526058]">
              {activeCard.hint}
            </p>
          )}
        </div>

        {showAnswer ? (
          <div className="mt-4 rounded-md border border-[#e3e8e3] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#7a857e]">
              Reponse
            </p>
            <p className="mt-2 text-lg font-semibold leading-7 text-[#26332b]">
              {activeCard.back || "A completer depuis l'analyse IA."}
            </p>
            {activeCard.sentence && activeCard.sentence !== activeCard.front && (
              <p className="mt-3 text-sm leading-6 text-[#526058]">
                {activeCard.sentence}
              </p>
            )}
          </div>
        ) : (
          <Button className="mt-4" onClick={onShowAnswer}>
            Afficher
          </Button>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {typeof activeCard.startTime === "number" && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onReplay(activeCard)}
            >
              <PlayCircle className="h-4 w-4" />
              Rejouer
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onGrade(activeCard, "again")}
            disabled={!showAnswer}
          >
            Encore
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onGrade(activeCard, "good")}
            disabled={!showAnswer}
          >
            Bien
          </Button>
          <Button size="sm" onClick={() => onGrade(activeCard, "easy")} disabled={!showAnswer}>
            Facile
          </Button>
        </div>
      </article>
    </div>
  );
}
