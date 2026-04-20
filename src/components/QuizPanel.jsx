import { CheckCircle2, RotateCcw } from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "./ui/Button";

export function QuizPanel({
  questions,
  currentIndex,
  selectedChoice,
  isValidated,
  correctAnswers,
  savedProgress,
  onSelectChoice,
  onValidate,
  onNext,
  onRestart,
}) {
  const total = questions.length;
  const question = questions[currentIndex];
  const isDone = currentIndex >= total;
  const progress = total ? Math.min((currentIndex / total) * 100, 100) : 0;
  const choices = Array.isArray(question?.choices) ? question.choices : [];
  const isCorrect = selectedChoice === question?.answerIndex;
  const explanation = question?.explanation;
  const answeredCount = Math.min(total, currentIndex + (isValidated ? 1 : 0));

  if (!total) {
    return (
      <div className="rounded-md border border-dashed border-[#d9e0da] bg-white p-4 text-sm leading-6 text-[#68756d]">
        Aucun quiz genere. Ajoute un fichier SRT contenant du texte japonais.
      </div>
    );
  }

  const hasSavedProgress = savedProgress?.total > 0;

  if (isDone) {
    return (
      <div className="rounded-md border border-[#dfe5df] bg-white p-5 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-[#315b40]" />
        <h3 className="mt-3 text-lg font-semibold text-[#1d2b22]">
          Revision terminee
        </h3>
        <p className="mt-2 text-sm leading-6 text-[#5d6a62]">
          Score final : {correctAnswers} / {total}. Relance la serie pour
          revoir les phrases.
        </p>
        <Button className="mt-4" variant="secondary" onClick={onRestart}>
          <RotateCcw className="h-4 w-4" />
          Recommencer
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-[#dfe5df] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[#1d2b22]">
          Question {currentIndex + 1} / {total}
        </p>
        <p className="text-xs font-medium text-[#7a857e]">
          Score {correctAnswers} / {answeredCount}
        </p>
      </div>
      {hasSavedProgress && currentIndex === 0 && !isValidated && (
        <div className="mt-3 rounded-md bg-[#f7f9f7] px-3 py-2 text-xs font-medium text-[#68756d]">
          Derniere serie : {savedProgress.lastScore} / {savedProgress.total} ·
          meilleur score : {savedProgress.bestScore} / {savedProgress.total}
        </div>
      )}
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
        <p className="mt-3 rounded-md bg-[#f7f9f7] p-4 text-lg leading-8 text-[#243229]">
          {question.sentence}
        </p>
      </div>
      <div className="mt-5 grid gap-2">
        {choices.map((choice, index) => {
          const isSelected = selectedChoice === index;
          const isAnswer = question.answerIndex === index;
          return (
            <button
              key={`${choice}-${index}`}
              type="button"
              onClick={() => !isValidated && onSelectChoice(index)}
              className={cn(
                "rounded-md border p-3 text-left text-sm font-medium leading-6 transition",
                !isValidated && isSelected
                  ? "border-[#315b40] bg-[#eef5ef] text-[#1d2b22]"
                  : "border-[#dfe5df] bg-white text-[#35423a] hover:border-[#b8c4bb]",
                isValidated && isAnswer
                  ? "border-[#315b40] bg-[#e8f4eb] text-[#1f3d2b]"
                  : "",
                isValidated && isSelected && !isAnswer
                  ? "border-[#e3b3aa] bg-[#fff5f3] text-[#8f3228]"
                  : ""
              )}
              disabled={isValidated}
            >
              {choice}
            </button>
          );
        })}
      </div>
      {isValidated && (
        <div
          className={cn(
            "mt-5 rounded-md p-4 text-sm font-medium leading-6",
            isCorrect ? "bg-[#eef5ef] text-[#1f3d2b]" : "bg-[#fff5f3] text-[#8f3228]"
          )}
        >
          <p>{isCorrect ? "正解です。" : "もう一度確認しましょう。"}</p>
          {explanation && (
            <p className="mt-2 font-normal text-[#405048]">{explanation}</p>
          )}
        </div>
      )}
      <div className="mt-5 flex gap-2">
        <Button
          variant="secondary"
          onClick={onValidate}
          disabled={selectedChoice === null || isValidated}
        >
          Valider
        </Button>
        <Button onClick={onNext}>{isValidated ? "Suivant" : "Passer"}</Button>
      </div>
    </div>
  );
}
