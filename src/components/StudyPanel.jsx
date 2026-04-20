import { useEffect, useState } from "react";
import { LexiconPanel } from "./LexiconPanel";
import { QuizPanel } from "./QuizPanel";
export function StudyPanel({ video }) {
  const [quizIndex, setQuizIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    setQuizIndex(0);
    setShowAnswer(false);
  }, [video.id, video.quiz]);

  function nextQuestion() {
    setShowAnswer(false);
    setQuizIndex((index) => index + 1);
  }

  function restartQuiz() {
    setQuizIndex(0);
    setShowAnswer(false);
  }

  return (
    <aside className="grid content-start gap-4 xl:grid-cols-[minmax(160px,1fr)_minmax(420px,3fr)]">
      <section className="rounded-lg border border-[#dfe5df] bg-[#fbfcfb]">
        <div className="border-b border-[#e3e8e3] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#7a857e]">
            Lexique
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[#1d2b22]">
            {video.title}
          </h2>
        </div>
        <div className="study-scroll max-h-[calc(100vh-210px)] overflow-auto p-4">
          <LexiconPanel vocabulary={video.vocabulary} />
        </div>
      </section>
      <section className="rounded-lg border border-[#dfe5df] bg-[#fbfcfb] p-4">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#7a857e]">
              Quiz de comprehension
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[#1d2b22]">
              Niveau {video.level}
            </h2>
          </div>
          <p className="text-sm text-[#68756d]">
            Questions generees depuis les sous-titres importes.
          </p>
        </div>
          <QuizPanel
            questions={video.quiz}
            currentIndex={quizIndex}
            showAnswer={showAnswer}
            onShowAnswer={() => setShowAnswer(true)}
            onNext={nextQuestion}
            onRestart={restartQuiz}
          />
      </section>
    </aside>
  );
}
