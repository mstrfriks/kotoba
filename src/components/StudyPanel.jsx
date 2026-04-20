import { useEffect, useState } from "react";
import { Brain, Loader2 } from "lucide-react";
import { generateAiQuiz } from "../lib/api";
import { LexiconPanel } from "./LexiconPanel";
import { QuizPanel } from "./QuizPanel";
import { cn } from "../lib/utils";
import { Button } from "./ui/Button";

const modes = [
  { value: "subtitles", label: "SRT", countKey: "sentences" },
  { value: "quiz", label: "Quiz", countKey: "quiz" },
  { value: "lexicon", label: "Lexique", countKey: "vocabulary" },
];

export function StudyPanel({
  video,
  script,
  canUseAi,
  quizProgress,
  subtitlesPanel,
  onQuizGenerated,
  onQuizProgress,
}) {
  const [activeMode, setActiveMode] = useState("subtitles");
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [isValidated, setIsValidated] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizError, setQuizError] = useState("");
  const counts = {
    sentences: video.duration,
    quiz: Array.isArray(video.quiz) ? video.quiz.length : 0,
    vocabulary: Array.isArray(video.vocabulary) ? video.vocabulary.length : 0,
  };

  useEffect(() => {
    setQuizIndex(0);
    setSelectedChoice(null);
    setIsValidated(false);
    setCorrectAnswers(0);
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
    setCorrectAnswers(0);
  }

  function validateQuestion() {
    if (selectedChoice === null || isValidated) return;
    const isCorrect = selectedChoice === video.quiz[quizIndex]?.answerIndex;
    const nextScore = correctAnswers + (isCorrect ? 1 : 0);
    const answered = Math.min(video.quiz.length, quizIndex + 1);

    if (isCorrect) {
      setCorrectAnswers((score) => score + 1);
    }
    setIsValidated(true);
    onQuizProgress?.({
      correctAnswers: nextScore,
      answered,
      total: video.quiz.length,
      completed: answered >= video.quiz.length,
    });
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
    <aside className="overflow-hidden rounded-lg border border-[#cfd8d1] bg-[#fbfcfb] shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#e3e8e3] bg-white p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#7a857e]">
            Etude
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[#1d2b22]">
            {activeMode === "subtitles"
              ? "Sous-titres"
              : activeMode === "quiz"
                ? `Quiz ${video.level}`
                : "Lexique"}
          </h2>
          {quizProgress?.total > 0 && (
            <p className="mt-1 text-xs font-medium text-[#68756d]">
              Dernier score {quizProgress.lastScore} / {quizProgress.total} ·
              meilleur {quizProgress.bestScore} / {quizProgress.total}
            </p>
          )}
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
          <div className="grid grid-cols-3 rounded-md border border-[#dbe1dc] bg-[#eef2ee] p-1">
            {modes.map((mode) => (
              <button
                key={mode.value}
                onClick={() => setActiveMode(mode.value)}
                className={cn(
                  "grid h-11 min-w-24 content-center rounded px-3 text-sm font-medium leading-none transition",
                  activeMode === mode.value
                    ? "bg-white text-[#1d2b22] shadow-sm"
                    : "text-[#66736a] hover:text-[#1d2b22]"
                )}
              >
                <span>{mode.label}</span>
                <span className="mt-1 text-[11px] font-normal text-[#7a857e]">
                  {counts[mode.countKey]}
                </span>
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
      <div className="study-scroll max-h-[calc(100vh-154px)] overflow-auto bg-[#f7f8f6] p-4">
        {activeMode === "subtitles" ? (
          subtitlesPanel
        ) : activeMode === "quiz" ? (
          <QuizPanel
            questions={video.quiz}
            currentIndex={quizIndex}
            selectedChoice={selectedChoice}
            isValidated={isValidated}
            correctAnswers={correctAnswers}
            savedProgress={quizProgress}
            onSelectChoice={setSelectedChoice}
            onValidate={validateQuestion}
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
