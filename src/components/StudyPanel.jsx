import { useEffect, useState } from "react";
import { LexiconPanel } from "./LexiconPanel";
import { QuizPanel } from "./QuizPanel";
import { cn } from "../lib/utils";

const modes = [
  { value: "quiz", label: "Quiz" },
  { value: "lexicon", label: "Lexique" },
];

export function StudyPanel({ video }) {
  const [activeMode, setActiveMode] = useState("quiz");
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [isValidated, setIsValidated] = useState(false);

  useEffect(() => {
    setQuizIndex(0);
    setSelectedChoice(null);
    setIsValidated(false);
  }, [video.id, video.quiz]);

  function nextQuestion() {
    setSelectedChoice(null);
    setIsValidated(false);
    setQuizIndex((index) => index + 1);
  }

  function restartQuiz() {
    setQuizIndex(0);
    setSelectedChoice(null);
    setIsValidated(false);
  }

  return (
    <aside className="rounded-lg border border-[#dfe5df] bg-[#fbfcfb]">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#e3e8e3] p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#7a857e]">
            Etude
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[#1d2b22]">
            {activeMode === "quiz" ? `Quiz ${video.level}` : "Lexique"}
          </h2>
        </div>
        <div className="grid grid-cols-2 rounded-md border border-[#dbe1dc] bg-[#eef2ee] p-1">
          {modes.map((mode) => (
            <button
              key={mode.value}
              onClick={() => setActiveMode(mode.value)}
              className={cn(
                "h-9 min-w-24 rounded px-3 text-sm font-medium transition",
                activeMode === mode.value
                  ? "bg-white text-[#1d2b22] shadow-sm"
                  : "text-[#66736a] hover:text-[#1d2b22]"
              )}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>
      <div className="study-scroll max-h-[calc(100vh-170px)] overflow-auto p-4">
        {activeMode === "quiz" ? (
          <QuizPanel
            questions={video.quiz}
            currentIndex={quizIndex}
            selectedChoice={selectedChoice}
            isValidated={isValidated}
            onSelectChoice={setSelectedChoice}
            onValidate={() => setIsValidated(true)}
            onNext={nextQuestion}
            onRestart={restartQuiz}
          />
        ) : (
          <LexiconPanel vocabulary={video.vocabulary} />
        )}
      </div>
    </aside>
  );
}
