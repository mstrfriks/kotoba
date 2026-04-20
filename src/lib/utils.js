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

export function generateStudyMaterials(rawSrt) {
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

  const quiz = vocabulary.slice(0, 8).map((item) => {
    const hasTranslation = item.french !== "a traduire";
    return {
      prompt: hasTranslation
        ? `Que signifie ${stripHtml(item.japanese)} ?`
        : `Retrouve le sens de ${stripHtml(item.japanese)} dans l'extrait.`,
      answer: hasTranslation ? item.french : item.example,
      hint: item.example,
    };
  });

  return {
    cleanedText,
    vocabulary,
    quiz,
    stats: getTextStats(cleanedText),
  };
}
