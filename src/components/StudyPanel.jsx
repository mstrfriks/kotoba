import { useEffect, useState } from "react";
import { Tabs } from "./ui/Tabs";
import { LexiconPanel } from "./LexiconPanel";
import { QuizPanel } from "./QuizPanel";
import { SubtitlesPanel } from "./SubtitlesPanel";

const tabs = [
  { value: "lexicon", label: "Lexique" },
  { value: "quiz", label: "Quiz" },
  { value: "subtitles", label: "Sous-titres" },
];

export function StudyPanel({
  video,
  subtitleText,
  onSubtitleChange,
  onSubtitleReset,
}) {
  const [activeTab, setActiveTab] = useState("lexicon");
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
    <aside className="rounded-lg border border-[#dfe5df] bg-[#fbfcfb]">
      <div className="border-b border-[#e3e8e3] p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#7a857e]">
          Etude
        </p>
        <h2 className="mt-1 text-lg font-semibold text-[#1d2b22]">
          {video.title}
        </h2>
        <div className="mt-4">
          <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
        </div>
      </div>
      <div className="study-scroll max-h-[calc(100vh-190px)] overflow-auto p-4">
        {activeTab === "lexicon" && (
          <LexiconPanel vocabulary={video.vocabulary} />
        )}
        {activeTab === "quiz" && (
          <QuizPanel
            questions={video.quiz}
            currentIndex={quizIndex}
            showAnswer={showAnswer}
            onShowAnswer={() => setShowAnswer(true)}
            onNext={nextQuestion}
            onRestart={restartQuiz}
          />
        )}
        {activeTab === "subtitles" && (
          <SubtitlesPanel
            rawText={subtitleText}
            onChange={onSubtitleChange}
            onReset={onSubtitleReset}
          />
        )}
      </div>
    </aside>
  );
}
