const cors = require("cors");
const dotenv = require("dotenv");
const express = require("express");

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 8787;
const model = process.env.OPENAI_MODEL || "gpt-5-mini";

app.use(cors());
app.use(express.json({ limit: "2mb" }));

function requireApiKey() {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error(
      "OPENAI_API_KEY manque dans .env. Copie .env.example vers .env puis ajoute ta cle API."
    );
    error.status = 500;
    throw error;
  }
}

function readOutputText(responseBody) {
  if (typeof responseBody.output_text === "string") {
    return responseBody.output_text.trim();
  }

  const message = responseBody.output?.find((item) => item.type === "message");
  const text = message?.content?.find((item) => item.type === "output_text");
  return typeof text?.text === "string" ? text.text.trim() : "";
}

async function createTextResponse({ instructions, input, maxOutputTokens = 500 }) {
  requireApiKey();

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions,
      input,
      max_output_tokens: maxOutputTokens,
      store: false,
    }),
  });

  const responseBody = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      responseBody.error?.message ??
      `OpenAI a retourne une erreur HTTP ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  const text = readOutputText(responseBody);
  if (!text) {
    const error = new Error("La reponse OpenAI ne contient pas de texte.");
    error.status = 502;
    throw error;
  }

  return text;
}

function normalizeLevel(level) {
  return ["N5", "N4", "N3", "N2", "N1"].includes(level) ? level : "N5";
}

function parseJsonOutput(value) {
  const cleanValue = value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  return JSON.parse(cleanValue);
}

function normalizeQuizQuestions(questions) {
  if (!Array.isArray(questions)) return [];

  return questions
    .map((question) => {
      const choices = Array.isArray(question?.choices)
        ? question.choices.map((choice) => String(choice)).filter(Boolean)
        : [];
      const answerIndex = Number(question?.answerIndex);

      if (
        !question?.prompt ||
        choices.length !== 4 ||
        !Number.isInteger(answerIndex) ||
        answerIndex < 0 ||
        answerIndex >= choices.length
      ) {
        return null;
      }

      return {
        prompt: String(question.prompt),
        sentence: String(question.sentence ?? ""),
        choices,
        answerIndex,
        explanation: String(question.explanation ?? ""),
      };
    })
    .filter(Boolean);
}

app.get("/api/health", (request, response) => {
  response.json({
    ok: true,
    model,
    hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY),
  });
});

app.post("/api/translate-sentence", async (request, response, next) => {
  try {
    const text = String(request.body?.text ?? "").trim();
    const level = normalizeLevel(request.body?.level);

    if (!text) {
      response.status(400).json({ error: "Le texte a traduire est vide." });
      return;
    }

    const translation = await createTextResponse({
      instructions:
        "Tu aides un francophone qui apprend le japonais. Traduis la phrase japonaise en francais naturel. Reponds uniquement avec la traduction, sans commentaire.",
      input: `Niveau de l'apprenant: ${level}\nPhrase japonaise:\n${text}`,
      maxOutputTokens: 220,
    });

    response.json({ translation });
  } catch (error) {
    next(error);
  }
});

app.post("/api/analyze-script", async (request, response, next) => {
  try {
    const sentences = Array.isArray(request.body?.sentences)
      ? request.body.sentences
      : [];
    const level = normalizeLevel(request.body?.level);
    const normalizedSentences = sentences
      .map((sentence, index) => ({
        id: String(sentence?.id ?? `sentence-${index}`),
        text: String(sentence?.text ?? "").trim(),
        time: String(sentence?.time ?? ""),
      }))
      .filter((sentence) => sentence.text)
      .slice(0, 120);

    if (!normalizedSentences.length) {
      response.status(400).json({ error: "Aucune phrase a analyser." });
      return;
    }

    const rawJson = await createTextResponse({
      instructions:
        "Tu analyses un script japonais pour un francophone qui apprend le japonais. Reponds en JSON valide uniquement. Pour chaque phrase, donne une traduction francaise naturelle et des tokens japonais utiles. Les readings doivent etre en hiragana. Les meanings doivent etre en francais court. Garde les particules utiles. N'invente pas de phrase absente.",
      input: JSON.stringify({
        level,
        expectedShape: {
          sentences: [
            {
              id: "id original",
              text: "phrase japonaise originale",
              translationFr: "traduction francaise naturelle",
              tokens: [
                {
                  surface: "日本語",
                  reading: "にほんご",
                  meaningFr: "japonais",
                  partOfSpeech: "nom",
                },
              ],
            },
          ],
        },
        sentences: normalizedSentences,
      }),
      maxOutputTokens: 6000,
    });

    const parsed = parseJsonOutput(rawJson);
    response.json({
      level,
      analyzedAt: new Date().toISOString(),
      sentences: Array.isArray(parsed.sentences) ? parsed.sentences : [],
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/generate-quiz", async (request, response, next) => {
  try {
    const script = String(request.body?.script ?? "").trim();
    const level = normalizeLevel(request.body?.level);
    const questionCount = Math.min(
      Math.max(Number(request.body?.questionCount) || 8, 3),
      12
    );

    if (!script) {
      response.status(400).json({ error: "Le script est vide." });
      return;
    }

    const rawJson = await createTextResponse({
      instructions:
        "Tu generes un QCM de comprehension pour un francophone qui apprend le japonais. Reponds en JSON valide uniquement.",
      input: JSON.stringify({
        level,
        questionCount,
        expectedShape: {
          questions: [
            {
              prompt: "question en francais",
              sentence: "extrait japonais court ou contexte",
              choices: ["choix A", "choix B", "choix C", "choix D"],
              answerIndex: 0,
              explanation: "explication courte en francais",
            },
          ],
        },
        script,
      }),
      maxOutputTokens: 1800,
    });

    const parsed = parseJsonOutput(rawJson);
    const questions = normalizeQuizQuestions(parsed.questions);
    response.json({ questions });
  } catch (error) {
    next(error);
  }
});

app.use((error, request, response, next) => {
  const status = Number(error.status) || 500;
  response.status(status).json({
    error: error.message || "Erreur serveur.",
  });
});

app.listen(port, () => {
  console.log(`Kotoba API listening on http://localhost:${port}`);
});
