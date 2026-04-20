export async function translateSentence({ text, level }) {
  const response = await fetch("/api/translate-sentence", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, level }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error ?? "Impossible de traduire cette phrase.");
  }

  return body.translation;
}

export async function getApiHealth() {
  const response = await fetch("/api/health");
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error ?? "API locale indisponible.");
  }

  return body;
}

export async function analyzeScript({ sentences, level }) {
  const response = await fetch("/api/analyze-script", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sentences, level }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error ?? "Impossible d'analyser le script.");
  }

  return body;
}

export async function generateAiQuiz({ script, level, questionCount = 8 }) {
  const response = await fetch("/api/generate-quiz", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ script, level, questionCount }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error ?? "Impossible de generer le QCM.");
  }

  return Array.isArray(body.questions) ? body.questions : [];
}
