export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const commonJapaneseTerms = [
  { japanese: "私", reading: "watashi", french: "je, moi" },
  { japanese: "僕", reading: "boku", french: "je, moi" },
  { japanese: "今日", reading: "kyou", french: "aujourd'hui" },
  { japanese: "明日", reading: "ashita", french: "demain" },
  { japanese: "昨日", reading: "kinou", french: "hier" },
  { japanese: "時間", reading: "jikan", french: "temps, heure" },
  { japanese: "日本", reading: "nihon", french: "Japon" },
  { japanese: "日本語", reading: "nihongo", french: "japonais" },
  { japanese: "学校", reading: "gakkou", french: "ecole" },
  { japanese: "先生", reading: "sensei", french: "professeur" },
  { japanese: "学生", reading: "gakusei", french: "etudiant" },
  { japanese: "友達", reading: "tomodachi", french: "ami" },
  { japanese: "家", reading: "ie", french: "maison" },
  { japanese: "仕事", reading: "shigoto", french: "travail" },
  { japanese: "会社", reading: "kaisha", french: "entreprise" },
  { japanese: "駅", reading: "eki", french: "gare" },
  { japanese: "電車", reading: "densha", french: "train" },
  { japanese: "車", reading: "kuruma", french: "voiture" },
  { japanese: "店", reading: "mise", french: "magasin" },
  { japanese: "水", reading: "mizu", french: "eau" },
  { japanese: "食べる", reading: "taberu", french: "manger" },
  { japanese: "飲む", reading: "nomu", french: "boire" },
  { japanese: "行く", reading: "iku", french: "aller" },
  { japanese: "来る", reading: "kuru", french: "venir" },
  { japanese: "見る", reading: "miru", french: "voir, regarder" },
  { japanese: "聞く", reading: "kiku", french: "ecouter, demander" },
  { japanese: "話す", reading: "hanasu", french: "parler" },
  { japanese: "買う", reading: "kau", french: "acheter" },
  { japanese: "好き", reading: "suki", french: "aimer, apprecier" },
  { japanese: "大丈夫", reading: "daijoubu", french: "ca va, pas de probleme" },
  { japanese: "お願いします", reading: "onegaishimasu", french: "s'il vous plait" },
  { japanese: "ありがとう", reading: "arigatou", french: "merci" },
  { japanese: "こんにちは", reading: "konnichiwa", french: "bonjour" },
  { japanese: "すみません", reading: "sumimasen", french: "excusez-moi" },
];

export function cleanSrtText(value) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^\d+$/.test(line) && !line.includes("-->"))
    .join("\n");
}

export function getTextStats(value) {
  const clean = value.trim();
  return {
    characters: clean.length,
    lines: clean ? clean.split(/\r?\n/).filter(Boolean).length : 0,
  };
}

export function parseSrtCues(value) {
  const blocks = value
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  const cues = blocks
    .map((block, index) => {
      const lines = block.split(/\r?\n/).map((line) => line.trim());
      const timeIndex = lines.findIndex((line) => line.includes("-->"));
      if (timeIndex < 0) return null;

      return {
        id: `${index}-${lines[timeIndex]}`,
        time: lines[timeIndex].replace(/\s+/g, " "),
        text: lines.slice(timeIndex + 1).join("\n").trim(),
      };
    })
    .filter((cue) => cue?.text);

  if (cues.length) return cues;

  return cleanSrtText(value)
    .split(/\r?\n/)
    .map((line, index) => line.trim())
    .filter(Boolean)
    .map((line, index) => ({
      id: `line-${index}`,
      time: "",
      text: line,
    }));
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function addFuriganaToText(value, vocabulary = []) {
  const readings = new Map(
    [...commonJapaneseTerms, ...vocabulary]
      .filter((item) => item?.japanese && item?.reading)
      .filter((item) => item.reading !== "a completer")
      .map((item) => [stripHtml(item.japanese), item.reading])
  );
  const terms = [...readings.keys()].sort((a, b) => b.length - a.length);

  if (!terms.length) return escapeHtml(value);

  const pattern = new RegExp(terms.map(escapeRegExp).join("|"), "gu");
  return escapeHtml(value).replace(pattern, (match) => {
    const reading = readings.get(match);
    return reading
      ? `<ruby>${match}<rt>${escapeHtml(reading)}</rt></ruby>`
      : match;
  });
}

export function extractYoutubeId(value) {
  const input = value.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

  try {
    const url = new URL(input);
    if (url.hostname.includes("youtu.be")) {
      return url.pathname.split("/").filter(Boolean)[0] ?? "";
    }
    if (url.searchParams.has("v")) {
      return url.searchParams.get("v") ?? "";
    }
    const parts = url.pathname.split("/").filter(Boolean);
    const markerIndex = parts.findIndex((part) =>
      ["embed", "shorts", "live"].includes(part)
    );
    return markerIndex >= 0 ? parts[markerIndex + 1] ?? "" : "";
  } catch {
    return "";
  }
}

export function makeVideoTitle(youtubeUrl, fileNames = []) {
  const firstFile = fileNames[0]?.replace(/\.[^.]+$/, "");
  if (firstFile) return firstFile.replace(/[-_]+/g, " ");
  const id = extractYoutubeId(youtubeUrl);
  return id ? `Video YouTube ${id}` : "Nouvelle video";
}

export const studyLevels = [
  { value: "N5", label: "N5", description: "questions simples" },
  { value: "N4", label: "N4", description: "details et contexte" },
  { value: "N3", label: "N3", description: "intentions et liens" },
  { value: "N2", label: "N2", description: "nuances et inference" },
  { value: "N1", label: "N1", description: "analyse approfondie" },
];

const levelInstructions = {
  N5: {
    mode: "Comprehension directe",
    prompts: [
      "Qui ou quoi est mentionne dans cet extrait ?",
      "Quelle action principale comprends-tu ?",
      "Quel mot cle aide a comprendre la phrase ?",
    ],
  },
  N4: {
    mode: "Comprehension du contexte",
    prompts: [
      "Que se passe-t-il dans cet extrait ?",
      "Quelle information importante faut-il retenir ?",
      "Quelle relation vois-tu entre les idees de la phrase ?",
    ],
  },
  N3: {
    mode: "Comprehension globale",
    prompts: [
      "Quel est le message principal de cet extrait ?",
      "Pourquoi cette phrase est-elle importante pour la scene ?",
      "Quelle intention du locuteur peut-on comprendre ?",
    ],
  },
  N2: {
    mode: "Inference",
    prompts: [
      "Quelle nuance ou implication peut-on deduire ?",
      "Quel changement de situation cet extrait suggere-t-il ?",
      "Quelle information n'est pas dite directement mais reste probable ?",
    ],
  },
  N1: {
    mode: "Analyse fine",
    prompts: [
      "Analyse la position ou l'attitude implicite du locuteur.",
      "Quelle nuance discursive structure cet extrait ?",
      "Comment reformulerais-tu l'idee centrale en francais precis ?",
    ],
  },
};

function splitJapaneseSentences(text) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[。！？!?])\s*/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function stripHtml(value) {
  return value.replace(/<[^>]*>/g, "");
}

function normalizeLevel(level) {
  return studyLevels.some((item) => item.value === level) ? level : "N5";
}

function countTerms(text) {
  const counts = new Map();
  const matches =
    text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々]+/gu) ??
    [];
  const ignored = new Set([
    "これ",
    "それ",
    "あれ",
    "ここ",
    "そこ",
    "あそこ",
    "です",
    "ます",
    "した",
    "して",
    "する",
    "ある",
    "いる",
    "この",
    "その",
    "あの",
    "ので",
    "から",
    "まで",
    "こと",
    "もの",
  ]);

  for (const match of matches) {
    if (match.length < 2 || ignored.has(match)) continue;
    counts.set(match, (counts.get(match) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, 16);
}

function findContext(term, sentences, fallbackText) {
  return (
    sentences.find((sentence) => sentence.includes(term)) ??
    fallbackText.split(/\r?\n/).find((line) => line.includes(term)) ??
    term
  );
}

function makeComprehensionQuiz(sentences, vocabulary, level, fallbackText) {
  const profile = levelInstructions[normalizeLevel(level)];
  const sourceSentences = sentences.length
    ? sentences
    : fallbackText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const selectedSentences = sourceSentences.slice(0, 6);

  if (!selectedSentences.length) return [];

  return selectedSentences.map((sentence, index) => {
    const term = vocabulary.find((item) => sentence.includes(item.japanese));
    const prompt = profile.prompts[index % profile.prompts.length];
    const answer = term
      ? `Reponse attendue: expliquer l'extrait avec "${stripHtml(
          term.japanese
        )}" (${term.french}).`
      : "Reponse attendue: reformuler l'idee principale en francais avec les indices du contexte.";

    return {
      prompt: `${prompt} (${profile.mode})`,
      answer,
      hint: sentence,
    };
  });
}

export function generateStudyMaterials(rawSrt, level = "N5") {
  const cleanedText = cleanSrtText(rawSrt);
  const sentences = splitJapaneseSentences(cleanedText);
  const knownTerms = commonJapaneseTerms
    .filter((term) => cleanedText.includes(term.japanese))
    .map((term) => [term.japanese, term]);
  const unknownTerms = countTerms(cleanedText).map(([japanese]) => [
    japanese,
    null,
  ]);

  const seen = new Set();
  const vocabulary = [...knownTerms, ...unknownTerms]
    .filter(([japanese]) => {
      if (seen.has(japanese)) return false;
      seen.add(japanese);
      return true;
    })
    .slice(0, 12)
    .map(([japanese, known]) => {
      const example = findContext(japanese, sentences, cleanedText);
      return {
        japanese,
        reading: known?.reading ?? "a completer",
        french: known?.french ?? "a traduire",
        example,
      };
    });

  const quiz = makeComprehensionQuiz(
    sentences,
    vocabulary,
    level,
    cleanedText
  );

  return {
    cleanedText,
    vocabulary,
    quiz,
    stats: getTextStats(cleanedText),
  };
}
