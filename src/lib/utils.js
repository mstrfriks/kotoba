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

const kanjiHiraganaReadings = {
  一: "いち",
  二: "に",
  三: "さん",
  四: "よん",
  五: "ご",
  六: "ろく",
  七: "なな",
  八: "はち",
  九: "きゅう",
  十: "じゅう",
  百: "ひゃく",
  千: "せん",
  万: "まん",
  円: "えん",
  人: "ひと",
  日: "にち",
  月: "つき",
  火: "ひ",
  水: "みず",
  木: "き",
  金: "かね",
  土: "つち",
  今: "いま",
  明: "あか",
  昨: "さく",
  時: "とき",
  間: "あいだ",
  分: "ふん",
  半: "はん",
  年: "とし",
  週: "しゅう",
  先: "さき",
  生: "せい",
  学: "がく",
  校: "こう",
  語: "ご",
  本: "ほん",
  国: "くに",
  私: "わたし",
  僕: "ぼく",
  友: "とも",
  達: "たち",
  家: "いえ",
  仕: "し",
  事: "ごと",
  会: "かい",
  社: "しゃ",
  駅: "えき",
  電: "でん",
  車: "くるま",
  店: "みせ",
  食: "た",
  飲: "の",
  行: "い",
  来: "く",
  見: "み",
  聞: "き",
  話: "はな",
  買: "か",
  好: "す",
  大: "だい",
  丈: "じょう",
  夫: "ぶ",
  願: "ねが",
  入: "はい",
  出: "で",
  上: "うえ",
  下: "した",
  左: "ひだり",
  右: "みぎ",
  中: "なか",
  外: "そと",
  前: "まえ",
  後: "あと",
  東: "ひがし",
  西: "にし",
  南: "みなみ",
  北: "きた",
  高: "たか",
  安: "やす",
  新: "しん",
  古: "ふる",
  長: "なが",
  小: "しょう",
  白: "しろ",
  黒: "くろ",
  赤: "あか",
  青: "あお",
  名: "な",
  何: "なに",
  誰: "だれ",
  男: "おとこ",
  女: "おんな",
  子: "こ",
  父: "ちち",
  母: "はは",
  兄: "あに",
  姉: "あね",
  弟: "おとうと",
  妹: "いもうと",
  口: "くち",
  目: "め",
  耳: "みみ",
  手: "て",
  足: "あし",
  力: "ちから",
  気: "き",
  天: "てん",
  雨: "あめ",
  山: "やま",
  川: "かわ",
  田: "た",
  空: "そら",
  花: "はな",
  休: "やす",
  言: "い",
  読: "よ",
  書: "か",
  作: "つく",
  思: "おも",
  知: "し",
  使: "つか",
  持: "も",
  待: "ま",
  帰: "かえ",
  始: "はじ",
  終: "お",
  起: "お",
  寝: "ね",
  働: "はたら",
  勉: "べん",
  強: "きょう",
};

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
        sentences: splitJapaneseSentences(lines.slice(timeIndex + 1).join(" ")),
      };
    })
    .filter((cue) => cue?.sentences.length);

  if (cues.length) return cues;

  return cleanSrtText(value)
    .split(/\r?\n/)
    .map((line, index) => line.trim())
    .filter(Boolean)
    .map((line, index) => ({
      id: `line-${index}`,
      time: "",
      sentences: splitJapaneseSentences(line),
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

function romajiToHiragana(value) {
  const directReadings = {
    watashi: "わたし",
    boku: "ぼく",
    kyou: "きょう",
    ashita: "あした",
    kinou: "きのう",
    jikan: "じかん",
    nihon: "にほん",
    nihongo: "にほんご",
    gakkou: "がっこう",
    sensei: "せんせい",
    gakusei: "がくせい",
    tomodachi: "ともだち",
    ie: "いえ",
    shigoto: "しごと",
    kaisha: "かいしゃ",
    eki: "えき",
    densha: "でんしゃ",
    kuruma: "くるま",
    mise: "みせ",
    mizu: "みず",
    taberu: "たべる",
    nomu: "のむ",
    iku: "いく",
    kuru: "くる",
    miru: "みる",
    kiku: "きく",
    hanasu: "はなす",
    kau: "かう",
    suki: "すき",
    daijoubu: "だいじょうぶ",
    onegaishimasu: "おねがいします",
    arigatou: "ありがとう",
    konnichiwa: "こんにちは",
    sumimasen: "すみません",
  };
  return directReadings[value] ?? value;
}

export function addFuriganaToText(value, vocabulary = []) {
  const readings = new Map(
    [...commonJapaneseTerms, ...vocabulary]
      .filter((item) => item?.japanese && item?.reading)
      .filter((item) => item.reading !== "a completer")
      .map((item) => [stripHtml(item.japanese), romajiToHiragana(item.reading)])
  );
  const terms = [...readings.keys()].sort((a, b) => b.length - a.length);
  let output = "";
  let index = 0;

  while (index < value.length) {
    const match = terms.find((term) => value.startsWith(term, index));
    if (match) {
      output += `<ruby>${escapeHtml(match)}<rt>${escapeHtml(
        readings.get(match)
      )}</rt></ruby>`;
      index += match.length;
      continue;
    }

    const character = value[index];
    if (/\p{Script=Han}/u.test(character)) {
      output += `<ruby>${escapeHtml(character)}<rt>${escapeHtml(
        kanjiHiraganaReadings[character] ?? "?"
      )}</rt></ruby>`;
    } else {
      output += escapeHtml(character);
    }
    index += 1;
  }

  return output;
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
  N5: "この文の内容として正しいものはどれですか。",
  N4: "この文で話していることは何ですか。",
  N3: "この文の意味に一番近いものはどれですか。",
  N2: "この文から分かることはどれですか。",
  N1: "この文の意図として最も自然なものはどれですか。",
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

function findSentenceTopic(sentence, vocabulary) {
  const vocabularyTerm = vocabulary.find((item) =>
    sentence.includes(stripHtml(item.japanese))
  );
  if (vocabularyTerm) return stripHtml(vocabularyTerm.japanese);

  const matches =
    sentence.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々]+/gu) ??
    [];
  return matches.find((match) => match.length >= 2) ?? sentence.slice(0, 8);
}

function uniqueItems(items) {
  return [...new Set(items.filter(Boolean))];
}

function rotateItems(items, offset) {
  if (!items.length) return [];
  return [...items.slice(offset), ...items.slice(0, offset)];
}

function makeComprehensionQuiz(sentences, vocabulary, level, fallbackText) {
  const prompt = levelInstructions[normalizeLevel(level)];
  const sourceSentences = sentences.length
    ? sentences
    : fallbackText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const selectedSentences = sourceSentences.slice(0, 6);
  const topics = uniqueItems([
    ...selectedSentences.map((sentence) => findSentenceTopic(sentence, vocabulary)),
    ...vocabulary.map((item) => stripHtml(item.japanese)),
  ]);

  if (!selectedSentences.length) return [];

  return selectedSentences.map((sentence, index) => {
    const topic = findSentenceTopic(sentence, vocabulary);
    const distractors = rotateItems(
      topics.filter((item) => item !== topic),
      index
    ).slice(0, 3);
    const fallbackDistractors = ["時間", "場所", "人", "気持ち"].filter(
      (item) => item !== topic && !distractors.includes(item)
    );
    const allDistractors = [...distractors, ...fallbackDistractors].slice(0, 3);
    const correctAnswer = `「${topic}」について話しています。`;
    const choices = [correctAnswer, ...allDistractors.map((item) => `「${item}」について話しています。`)];
    const rotatedChoices = rotateItems(choices, index % choices.length);

    return {
      prompt,
      sentence,
      choices: rotatedChoices,
      answerIndex: rotatedChoices.indexOf(correctAnswer),
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
