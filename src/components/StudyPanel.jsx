import { useEffect, useState } from "react";
import { Brain, Loader2 } from "lucide-react";
import { generateAiLexicon, generateAiQuiz } from "../lib/api";
import { LexiconPanel } from "./LexiconPanel";
import { QuizPanel } from "./QuizPanel";
import { ReviewPanel } from "./ReviewPanel";
import { cn } from "../lib/utils";
import { Button } from "./ui/Button";

const modes = [
  { value: "subtitles", label: "SRT", countKey: "sentences" },
  { value: "quiz", label: "Quiz", countKey: "quiz" },
  { value: "lexicon", label: "Lexique", countKey: "vocabulary" },
  { value: "review", label: "Revision", countKey: "review" },
];

const quizTypes = [
  { value: "comprehension", label: "Comprehension" },
  { value: "vocabulary", label: "Vocabulaire" },
  { value: "grammar", label: "Grammaire" },
];

export function StudyPanel({
  video,
  script,
  canUseAi,
  quizProgress,
  reviewCards = [],
  reviewProgressByCardId = {},
  subtitlesPanel,
  onQuizGenerated,
  onLexiconGenerated,
  onQuizProgress,
  onReviewGrade,
  onReviewReplay,
}) {
  const [activeMode, setActiveMode] = useState("subtitles");
  const [quizIndex, setQuizIndex] = useState(0);
  const [activeReviewCardId, setActiveReviewCardId] = useState("");
  const [showReviewAnswer, setShowReviewAnswer] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [isValidated, setIsValidated] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [isGeneratingLexicon, setIsGeneratingLexicon] = useState(false);
  const [isGeneratingStudyPack, setIsGeneratingStudyPack] = useState(false);
  const [quizError, setQuizError] = useState("");
  const [questionCount, setQuestionCount] = useState(8);
  const [lexiconCount, setLexiconCount] = useState(18);
  const [quizType, setQuizType] = useState("comprehension");
  const isGeneratingAi =
    isGeneratingQuiz || isGeneratingLexicon || isGeneratingStudyPack;
  const counts = {
    sentences: video.duration,
    quiz: Array.isArray(video.quiz) ? video.quiz.length : 0,
    vocabulary: Array.isArray(video.vocabulary) ? video.vocabulary.length : 0,
    review: reviewCards.length,
  };

  useEffect(() => {
    setQuizIndex(0);
    setSelectedChoice(null);
    setIsValidated(false);
    setCorrectAnswers(0);
  }, [video.id, video.quiz]);

  useEffect(() => {
    setActiveReviewCardId(reviewCards[0]?.id ?? "");
    setShowReviewAnswer(false);
  }, [reviewCards, video.id]);

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
    if (
      Array.isArray(video.quiz) &&
      video.quiz.length &&
      !window.confirm("Relancer le QCM IA utilisera de nouveaux tokens OpenAI.")
    ) {
      return;
    }

    setQuizError("");
    setIsGeneratingQuiz(true);

    try {
      const questions = await generateAiQuiz({
        script,
        level: video.level,
        questionCount,
        quizType,
      });
      if (!questions.length) {
        throw new Error("L'IA n'a pas renvoye de questions exploitables.");
      }
      onQuizGenerated(questions);
      setActiveMode("quiz");
      restartQuiz();
    } catch (error) {
      setQuizError(error.message);
    } finally {
      setIsGeneratingQuiz(false);
    }
  }

  async function handleGenerateLexicon() {
    if (
      Array.isArray(video.vocabulary) &&
      video.vocabulary.length &&
      !window.confirm(
        "Relancer le lexique IA utilisera de nouveaux tokens OpenAI."
      )
    ) {
      return;
    }

    setQuizError("");
    setIsGeneratingLexicon(true);

    try {
      const vocabulary = await generateAiLexicon({
        script,
        level: video.level,
        maxItems: lexiconCount,
        vocabulary: video.vocabulary?.length
          ? video.vocabulary
          : video.localVocabulary ?? [],
      });
      onLexiconGenerated(vocabulary);
      setActiveMode("lexicon");
    } catch (error) {
      setQuizError(error.message);
    } finally {
      setIsGeneratingLexicon(false);
    }
  }

  async function handleGenerateStudyPack() {
    if (
      (Array.isArray(video.quiz) && video.quiz.length) ||
      (Array.isArray(video.vocabulary) && video.vocabulary.length)
    ) {
      const confirmed = window.confirm(
        "Relancer Tout IA remplacera le lexique et le QCM, et utilisera de nouveaux tokens OpenAI."
      );
      if (!confirmed) return;
    }

    setQuizError("");
    setIsGeneratingStudyPack(true);

    try {
      const vocabulary = await generateAiLexicon({
        script,
        level: video.level,
        maxItems: lexiconCount,
        vocabulary: video.vocabulary?.length
          ? video.vocabulary
          : video.localVocabulary ?? [],
      });
      onLexiconGenerated(vocabulary);

      const questions = await generateAiQuiz({
        script,
        level: video.level,
        questionCount,
        quizType,
      });
      if (!questions.length) {
        throw new Error("L'IA n'a pas renvoye de questions exploitables.");
      }
      onQuizGenerated(questions);
      setActiveMode("quiz");
      restartQuiz();
    } catch (error) {
      setQuizError(error.message);
    } finally {
      setIsGeneratingStudyPack(false);
    }
  }

  function gradeReviewCard(card, grade) {
    onReviewGrade(card, grade);
    const currentIndex = reviewCards.findIndex((item) => item.id === card.id);
    const nextCard = reviewCards[currentIndex + 1] ?? reviewCards[0];
    setActiveReviewCardId(nextCard?.id ?? "");
    setShowReviewAnswer(false);
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
                : activeMode === "lexicon"
                  ? "Lexique"
                  : "Revision"}
          </h2>
          {quizProgress?.total > 0 && (
            <p className="mt-1 text-xs font-medium text-[#68756d]">
              Dernier score {quizProgress.lastScore} / {quizProgress.total} ·
              meilleur {quizProgress.bestScore} / {quizProgress.total}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={quizType}
            onChange={(event) => setQuizType(event.target.value)}
            className="h-8 rounded-md border border-[#d7ddd8] bg-white px-2 text-xs font-medium text-[#526058] outline-none transition focus:border-[#315b40] focus:ring-2 focus:ring-[#d8e7dc]"
            title="Type de QCM"
          >
            {quizTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <label className="inline-flex h-8 items-center gap-1 rounded-md border border-[#d7ddd8] bg-white px-2 text-xs font-medium text-[#526058]">
            QCM
            <input
              type="number"
              min="3"
              max="12"
              value={questionCount}
              onChange={(event) => setQuestionCount(Number(event.target.value))}
              className="w-10 bg-transparent text-center outline-none"
            />
          </label>
          <label className="inline-flex h-8 items-center gap-1 rounded-md border border-[#d7ddd8] bg-white px-2 text-xs font-medium text-[#526058]">
            Mots
            <input
              type="number"
              min="6"
              max="24"
              value={lexiconCount}
              onChange={(event) => setLexiconCount(Number(event.target.value))}
              className="w-10 bg-transparent text-center outline-none"
            />
          </label>
          <Button
            size="sm"
            onClick={handleGenerateStudyPack}
            disabled={!script || isGeneratingAi || !canUseAi}
            title={
              canUseAi
                ? "Generer le lexique et le QCM avec l'API locale."
                : "Lance npm run app et renseigne OPENAI_API_KEY dans .env."
            }
          >
            {isGeneratingStudyPack ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Brain className="h-4 w-4" />
            )}
            Tout IA
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleGenerateQuiz}
            disabled={!script || isGeneratingAi || !canUseAi}
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
          <Button
            size="sm"
            variant="secondary"
            onClick={handleGenerateLexicon}
            disabled={!script || isGeneratingAi || !canUseAi}
            title={
              canUseAi
                ? "Generer un lexique contextualise avec l'API locale."
                : "Lance npm run app et renseigne OPENAI_API_KEY dans .env."
            }
          >
            {isGeneratingLexicon ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Brain className="h-4 w-4" />
            )}
            Lexique IA
          </Button>
          <div className="grid grid-cols-4 rounded-md border border-[#dbe1dc] bg-[#eef2ee] p-1">
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
            canUseAi={canUseAi}
            vocabulary={video.vocabulary}
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
        ) : activeMode === "lexicon" ? (
          <LexiconPanel vocabulary={video.vocabulary} canUseAi={canUseAi} />
        ) : (
          <ReviewPanel
            cards={reviewCards}
            progressByCardId={reviewProgressByCardId}
            activeCardId={activeReviewCardId}
            showAnswer={showReviewAnswer}
            onShowAnswer={() => setShowReviewAnswer(true)}
            onGrade={gradeReviewCard}
            onReplay={onReviewReplay}
            onRestart={() => {
              setActiveReviewCardId(reviewCards[0]?.id ?? "");
              setShowReviewAnswer(false);
            }}
          />
        )}
      </div>
    </aside>
  );
}
