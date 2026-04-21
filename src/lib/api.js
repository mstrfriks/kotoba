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

export async function saveLibraryBackup(library) {
  const response = await fetch("/api/library-backup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ library }),
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error ?? "Impossible de sauvegarder la bibliotheque.");
  }

  return body;
}

export async function saveSharedLibrary(library, baseRevision = "") {
  const response = await fetch("/api/library", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ library, baseRevision }),
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      body.error ?? "Impossible de synchroniser la bibliotheque."
    );
    error.status = response.status;
    error.revision = body.revision ?? "";
    error.updatedAt = body.updatedAt ?? "";
    error.library = body.library;
    throw error;
  }

  return body;
}

export async function getSharedLibrary() {
  const response = await fetch("/api/library");
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      body.error ?? "Impossible de charger la bibliotheque serveur."
    );
    error.status = response.status;
    throw error;
  }

  return body;
}

export async function getLatestLibraryBackup() {
  const response = await fetch("/api/library-backups/latest");
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error ?? "Impossible de charger la sauvegarde.");
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

export async function generateAiQuiz({
  script,
  level,
  questionCount = 8,
  quizType = "comprehension",
}) {
  const response = await fetch("/api/generate-quiz", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ script, level, questionCount, quizType }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error ?? "Impossible de generer le QCM.");
  }

  return Array.isArray(body.questions) ? body.questions : [];
}

export async function generateAiLexicon({
  script,
  level,
  vocabulary = [],
  maxItems = 18,
}) {
  const response = await fetch("/api/generate-lexicon", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ script, level, vocabulary, maxItems }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error ?? "Impossible de generer le lexique.");
  }

  return Array.isArray(body.vocabulary) ? body.vocabulary : [];
}
