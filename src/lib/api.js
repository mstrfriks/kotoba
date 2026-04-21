const ACCESS_TOKEN_KEY = "kotoba.accessToken.v1";

export function getAccessToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ACCESS_TOKEN_KEY) ?? "";
}

export function saveAccessToken(token) {
  if (typeof window === "undefined") return;
  const cleanToken = token.trim();
  if (cleanToken) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, cleanToken);
  } else {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

function makeHeaders(extraHeaders = {}) {
  const token = getAccessToken();
  return {
    ...extraHeaders,
    ...(token ? { "X-Kotoba-Token": token } : {}),
  };
}

function makeJsonHeaders() {
  return makeHeaders({
    "Content-Type": "application/json",
  });
}

export async function translateSentence({ text, level }) {
  const response = await fetch("/api/translate-sentence", {
    method: "POST",
    headers: makeJsonHeaders(),
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
    headers: makeJsonHeaders(),
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
    headers: makeJsonHeaders(),
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
  const response = await fetch("/api/library", {
    headers: makeHeaders(),
  });
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
  const response = await fetch("/api/library-backups/latest", {
    headers: makeHeaders(),
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error ?? "Impossible de charger la sauvegarde.");
  }

  return body;
}

export async function analyzeScript({ sentences, level }) {
  const response = await fetch("/api/analyze-script", {
    method: "POST",
    headers: makeJsonHeaders(),
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
    headers: makeJsonHeaders(),
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
    headers: makeJsonHeaders(),
    body: JSON.stringify({ script, level, vocabulary, maxItems }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error ?? "Impossible de generer le lexique.");
  }

  return Array.isArray(body.vocabulary) ? body.vocabulary : [];
}
