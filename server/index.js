const cors = require("cors");
const dotenv = require("dotenv");
const express = require("express");
const fs = require("fs/promises");
const path = require("path");

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 8787;
const model = process.env.OPENAI_MODEL || "gpt-5-mini";
const accessToken = process.env.KOTOBA_ACCESS_TOKEN || "";
const backupDir =
  process.env.KOTOBA_BACKUP_DIR || path.join(__dirname, "..", "backups");
const currentLibraryFilename = "kotoba-bibliotheque-current.json";
const currentLibraryPath = path.join(backupDir, currentLibraryFilename);

app.use(cors());
app.use(express.json({ limit: "20mb" }));

function requireAccessToken(request, response, next) {
  if (!accessToken) {
    next();
    return;
  }

  const bearerToken = request.get("authorization")?.replace(/^Bearer\s+/i, "");
  const requestToken = request.get("x-kotoba-token") || bearerToken;
  if (requestToken === accessToken) {
    next();
    return;
  }

  response.status(401).json({
    error: "Acces Kotoba refuse. Renseigne le token d'acces local.",
  });
}

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

  try {
    return JSON.parse(cleanValue);
  } catch {
    const error = new Error(
      "La reponse IA est incomplete. Reessaie avec moins de lignes SRT, moins de mots ou moins de questions."
    );
    error.status = 502;
    throw error;
  }
}

function limitText(value, maxCharacters) {
  const text = String(value ?? "").trim();
  if (text.length <= maxCharacters) return text;
  return text.slice(0, maxCharacters);
}

function makeScriptOverview(script) {
  return script
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 80)
    .map((line, index) => `${index + 1}. ${line}`)
    .join("\n");
}

function normalizeQuizQuestions(questions) {
  const sourceQuestions = Array.isArray(questions?.questions)
    ? questions.questions
    : questions;
  if (!Array.isArray(sourceQuestions)) return [];

  return sourceQuestions
    .map((question) => {
      const choices = Array.isArray(question?.choices)
        ? question.choices
            .map((choice) =>
              typeof choice === "object"
                ? String(choice?.text ?? choice?.label ?? choice?.answer ?? "")
                : String(choice)
            )
            .map((choice) => choice.trim())
            .filter(Boolean)
        : [];
      const rawAnswerIndex =
        question?.answerIndex ?? question?.correctIndex ?? question?.correct;
      let answerIndex = Number(rawAnswerIndex);
      const answerText = String(
        question?.answer ?? question?.correctAnswer ?? question?.correctChoice ?? ""
      ).trim();

      if (
        (!Number.isInteger(answerIndex) || answerIndex < 0) &&
        /^[A-D]$/i.test(String(rawAnswerIndex ?? ""))
      ) {
        answerIndex = String(rawAnswerIndex).toUpperCase().charCodeAt(0) - 65;
      }

      if (
        (!Number.isInteger(answerIndex) || answerIndex < 0) &&
        answerText
      ) {
        answerIndex = choices.findIndex((choice) => choice === answerText);
      }

      if (
        !question?.prompt && !question?.question ||
        choices.length !== 4 ||
        !Number.isInteger(answerIndex) ||
        answerIndex < 0 ||
        answerIndex >= choices.length
      ) {
        return null;
      }

      return {
        prompt: String(question.prompt ?? question.question),
        sentence: String(question.sentence ?? question.context ?? ""),
        choices,
        answerIndex,
        explanation: String(question.explanation ?? ""),
      };
    })
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeVocabularyItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const japanese = String(item?.japanese ?? "").trim();
      const reading = String(item?.reading ?? "").trim();
      const french = String(item?.french ?? "").trim();

      if (!japanese || !reading || !french) return null;

      return {
        japanese,
        reading,
        french,
        example: String(item?.example ?? "").trim(),
        partOfSpeech: String(item?.partOfSpeech ?? "").trim(),
        dictionaryForm: String(item?.dictionaryForm ?? "").trim(),
        levelHint: String(item?.levelHint ?? "").trim(),
        explanation: String(item?.explanation ?? "").trim(),
      };
    })
    .filter(Boolean)
    .slice(0, 24);
}

function isValidLibrary(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function makeRevision() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function writeCurrentLibrary(library) {
  await fs.mkdir(backupDir, { recursive: true });
  const payload = {
    app: "kotoba",
    version: 1,
    revision: makeRevision(),
    updatedAt: new Date().toISOString(),
    library,
  };

  await fs.writeFile(
    currentLibraryPath,
    JSON.stringify(payload, null, 2),
    "utf8"
  );
  return payload;
}

app.get("/api/health", (request, response) => {
  response.json({
    ok: true,
    model,
    hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY),
    hasAccessToken: Boolean(accessToken),
  });
});

app.use("/api", requireAccessToken);

app.get("/api/library", async (request, response, next) => {
  try {
    const payload = JSON.parse(await fs.readFile(currentLibraryPath, "utf8"));
    response.json({
      ok: true,
      revision: payload.revision ?? "",
      updatedAt: payload.updatedAt ?? payload.savedAt ?? "",
      library: payload.library ?? payload,
    });
  } catch (error) {
    if (error.code === "ENOENT") {
      response.status(404).json({ error: "Aucune bibliotheque serveur." });
      return;
    }

    next(error);
  }
});

app.put("/api/library", async (request, response, next) => {
  try {
    const library = request.body?.library;
    const baseRevision = String(request.body?.baseRevision ?? "");
    if (!isValidLibrary(library)) {
      response.status(400).json({ error: "Bibliotheque absente ou invalide." });
      return;
    }

    const currentPayload = await fs
      .readFile(currentLibraryPath, "utf8")
      .then((content) => JSON.parse(content))
      .catch((error) => {
        if (error.code === "ENOENT") return null;
        throw error;
      });
    const currentRevision = currentPayload?.revision ?? "";

    if (currentRevision && baseRevision && currentRevision !== baseRevision) {
      response.status(409).json({
        error: "La bibliotheque serveur a change depuis ton dernier chargement.",
        revision: currentRevision,
        updatedAt: currentPayload.updatedAt ?? currentPayload.savedAt ?? "",
        library: currentPayload.library ?? currentPayload,
      });
      return;
    }

    const payload = await writeCurrentLibrary(library);
    response.json({
      ok: true,
      revision: payload.revision,
      updatedAt: payload.updatedAt,
      filename: currentLibraryFilename,
      directory: backupDir,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/library-backup", async (request, response, next) => {
  try {
    const library = request.body?.library;
    if (!isValidLibrary(library)) {
      response.status(400).json({ error: "Bibliotheque absente ou invalide." });
      return;
    }

    await fs.mkdir(backupDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `kotoba-bibliotheque-${timestamp}.json`;
    const payload = {
      app: "kotoba",
      version: 1,
      savedAt: new Date().toISOString(),
      library,
    };
    await fs.writeFile(
      path.join(backupDir, filename),
      JSON.stringify(payload, null, 2),
      "utf8"
    );

    response.json({ ok: true, filename, directory: backupDir });
  } catch (error) {
    next(error);
  }
});

async function listBackupFiles() {
  await fs.mkdir(backupDir, { recursive: true });
  const entries = await fs.readdir(backupDir, { withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.startsWith("kotoba-bibliotheque-") &&
          entry.name !== currentLibraryFilename &&
          entry.name.endsWith(".json")
      )
      .map(async (entry) => {
        const filepath = path.join(backupDir, entry.name);
        const stats = await fs.stat(filepath);
        return {
          filename: entry.name,
          filepath,
          updatedAt: stats.mtime.toISOString(),
          size: stats.size,
        };
      })
  );

  return files.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

app.get("/api/library-backups/latest", async (request, response, next) => {
  try {
    const [latestBackup] = await listBackupFiles();
    if (!latestBackup) {
      response.status(404).json({ error: "Aucune sauvegarde trouvee." });
      return;
    }

    const payload = JSON.parse(await fs.readFile(latestBackup.filepath, "utf8"));
    response.json({
      ok: true,
      filename: latestBackup.filename,
      updatedAt: latestBackup.updatedAt,
      size: latestBackup.size,
      backup: payload,
    });
  } catch (error) {
    next(error);
  }
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
        sentences: normalizedSentences.slice(0, 60),
      }),
      maxOutputTokens: 9000,
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
    const quizType = ["comprehension", "vocabulary", "grammar"].includes(
      request.body?.quizType
    )
      ? request.body.quizType
      : "comprehension";
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
        [
          "Tu es un professeur de japonais exigeant.",
          "Tu crees un QCM de comprehension pour un etudiant francophone, mais le QCM lui-meme doit etre entierement en japonais.",
          "Le niveau cible est JLPT, avec difficulte adaptee au niveau fourni. Pour N4, utilise un japonais naturel mais simple : phrases courtes, vocabulaire courant, grammaire N5/N4, pas de keigo complexe.",
          "Les questions doivent verifier la comprehension de l'integralite du texte, pas seulement une phrase isolee. Couvre le debut, le milieu, la fin, les relations cause/consequence, les intentions, les faits importants et les changements de situation.",
          "Ne donne pas dans la question un extrait qui contient directement la reponse. Le champ sentence sert seulement de reference interne courte, pas d'indice pour l'etudiant.",
          "Chaque question doit etre en japonais. Les 4 choix doivent etre en japonais. L'explication doit etre en japonais clair et expliquer pourquoi la bonne reponse est correcte, avec un indice ou une reference au contenu du texte.",
          "Evite les questions triviales de vocabulaire si le type demande est comprehension. Les distracteurs doivent etre plausibles mais contredits par le texte.",
          "Reponds en JSON valide uniquement, sans markdown. La racine doit etre un objet avec une cle questions. Chaque question doit avoir exactement prompt, sentence, choices, answerIndex, explanation. choices doit contenir exactement 4 chaines japonaises. answerIndex doit etre un entier 0, 1, 2 ou 3.",
        ].join(" "),
      input: JSON.stringify({
        level,
        quizType,
        questionCount,
        language: "ja",
        requirements: {
          promptLanguage: "ja",
          choicesLanguage: "ja",
          explanationLanguage: "ja",
          coverWholeText: true,
          comprehensionFirst: quizType === "comprehension",
        },
        expectedShape: {
          questions: [
            {
              prompt: "主人公はどうして店へ行きましたか。",
              sentence: "reference interne courte, sans indice direct",
              choices: [
                "新しい本を買いたかったからです。",
                "友だちに会いたかったからです。",
                "駅へ行く必要があったからです。",
                "先生に質問したかったからです。",
              ],
              answerIndex: 0,
              explanation:
                "本文では、主人公が本について話してから店へ行くので、正しい答えは一番目です。他の選択肢は本文にありません。",
            },
          ],
        },
        scriptOverview: makeScriptOverview(limitText(script, 12000)),
        script: limitText(script, 12000),
      }),
      maxOutputTokens: 4500,
    });

    const parsed = parseJsonOutput(rawJson);
    const questions = normalizeQuizQuestions(parsed.questions ?? parsed);
    if (!questions.length) {
      const error = new Error(
        "La reponse IA ne contient aucune question QCM exploitable. Reessaie avec moins de questions ou un autre type de QCM."
      );
      error.status = 502;
      throw error;
    }
    response.json({ questions });
  } catch (error) {
    next(error);
  }
});

app.post("/api/generate-lexicon", async (request, response, next) => {
  try {
    const script = String(request.body?.script ?? "").trim();
    const level = normalizeLevel(request.body?.level);
    const maxItems = Math.min(Math.max(Number(request.body?.maxItems) || 18, 6), 24);
    const vocabulary = Array.isArray(request.body?.vocabulary)
      ? request.body.vocabulary.slice(0, 24)
      : [];

    if (!script) {
      response.status(400).json({ error: "Le script est vide." });
      return;
    }

    const rawJson = await createTextResponse({
      instructions:
        "Tu crees un lexique japonais-francais contextualise pour un francophone qui apprend le japonais. Reponds en JSON valide uniquement. Choisis les mots et expressions les plus utiles du script. Les readings doivent etre en hiragana. Les exemples doivent venir du script quand possible. Adapte les explications au niveau JLPT.",
      input: JSON.stringify({
        level,
        maxItems,
        currentVocabulary: vocabulary,
        expectedShape: {
          vocabulary: [
            {
              japanese: "思い出す",
              reading: "おもいだす",
              french: "se souvenir",
              partOfSpeech: "verbe",
              dictionaryForm: "思い出す",
              levelHint: "N3",
              example: "phrase exacte ou courte du script",
              explanation: "explication courte en francais",
            },
          ],
        },
        script: limitText(script, 12000),
      }),
      maxOutputTokens: 5000,
    });

    const parsed = parseJsonOutput(rawJson);
    const items = normalizeVocabularyItems(parsed.vocabulary);
    response.json({ vocabulary: items });
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
