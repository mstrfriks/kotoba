import { useEffect, useState } from "react";
import { Brain, Loader2 } from "lucide-react";
import { generateAiQuiz } from "../lib/api";
import { LexiconPanel } from "./LexiconPanel";
import { QuizPanel } from "./QuizPanel";
import { cn } from "../lib/utils";
import { Button } from "./ui/Button";

const modes = [
  { value: "quiz", label: "Quiz" },
  { value: "lexicon", label: "Lexique" },
];

export function StudyPanel({ video, script, canUseAi, onQuizGenerated }) {
  const [activeMode, setActiveMode] = useState("quiz");
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [isValidated, setIsValidated] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizError, setQuizError] = useState("");

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

  async function handleGenerateQuiz() {
    setQuizError("");
    setIsGeneratingQuiz(true);

    try {
      const questions = await generateAiQuiz({
        script,
        level: video.level,
        questionCount: 8,
      });
      onQuizGenerated(questions);
      setActiveMode("quiz");
      restartQuiz();
    } catch (error) {
      setQuizError(error.message);
    } finally {
      setIsGeneratingQuiz(false);
    }
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
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleGenerateQuiz}
            disabled={!script || isGeneratingQuiz || !canUseAi}
            title={
              canUseAi
                ? "Generer un QCM de comprehension avec l'API locale."
                : "Lance npm run app et renseigne OPENAI_API_KEY dans .env."
            }
          >
            {isGeneratingQuiz ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Brain className="h-4 w-4" />
            )}
            QCM IA
          </Button>
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
      </div>
      {quizError && (
        <div className="border-b border-[#f1c8c2] bg-[#fff6f4] px-4 py-3 text-sm font-medium text-[#a13d32]">
          {quizError}
        </div>
      )}
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
