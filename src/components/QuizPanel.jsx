import { CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "./ui/Button";

export function QuizPanel({
  questions,
  currentIndex,
  showAnswer,
  onShowAnswer,
  onNext,
  onRestart,
}) {
  const total = questions.length;
  const question = questions[currentIndex];
  const isDone = currentIndex >= total;
  const progress = total ? Math.min((currentIndex / total) * 100, 100) : 0;

  if (!total) {
    return (
      <div className="rounded-md border border-dashed border-[#d9e0da] bg-white p-4 text-sm leading-6 text-[#68756d]">
        Aucun quiz genere. Ajoute un fichier SRT contenant du texte japonais.
      </div>
    );
  }

  if (isDone) {
    return (
      <div className="rounded-md border border-[#dfe5df] bg-white p-5 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-[#315b40]" />
        <h3 className="mt-3 text-lg font-semibold text-[#1d2b22]">
          Revision terminee
        </h3>
        <p className="mt-2 text-sm leading-6 text-[#5d6a62]">
          Tu as parcouru toutes les cartes FR. Relance la serie pour consolider
          les mots difficiles.
        </p>
        <Button className="mt-4" variant="secondary" onClick={onRestart}>
          <RotateCcw className="h-4 w-4" />
          Recommencer
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-[#dfe5df] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[#1d2b22]">
          Question {currentIndex + 1} / {total}
        </p>
        <p className="text-xs text-[#7a857e]">Mode revision FR</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#edf1ed]">
        <div
          className="h-full rounded-full bg-[#315b40] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#7a857e]">
          Question
        </p>
        <h3 className="mt-2 text-xl font-semibold text-[#1d2b22]">
          {question.prompt}
        </h3>
        <p className="mt-3 text-sm text-[#657069]">{question.hint}</p>
      </div>
      {showAnswer && (
        <div className="mt-5 rounded-md bg-[#eef5ef] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6b776f]">
            Reponse
          </p>
          <p className="mt-2 text-lg font-semibold text-[#1f3d2b]">
            {question.answer}
          </p>
        </div>
      )}
      <div className="mt-5 flex gap-2">
        <Button variant="secondary" onClick={onShowAnswer} disabled={showAnswer}>
          Afficher
        </Button>
        <Button onClick={onNext}>{showAnswer ? "Suivant" : "Passer"}</Button>
      </div>
    </div>
  );
}
