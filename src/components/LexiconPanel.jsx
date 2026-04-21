export function LexiconPanel({ vocabulary, canUseAi }) {
  if (!vocabulary.length) {
    return (
      <div className="rounded-md border border-dashed border-[#d9e0da] bg-white p-4 text-sm leading-6 text-[#68756d]">
        {canUseAi
          ? "Aucun lexique IA genere. Lance Tout IA ou Lexique IA pour creer un lexique contextualise."
          : "Aucun lexique IA genere. Renseigne OPENAI_API_KEY puis lance npm run app."}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {vocabulary.map((item) => (
        <article
          key={`${item.japanese}-${item.example}`}
          className="rounded-md border border-[#e2e7e2] bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div
                className="text-xl font-semibold text-[#1d2b22]"
                dangerouslySetInnerHTML={{ __html: item.japanese }}
              />
              <p className="mt-1 text-xs font-medium text-[#7a857e]">
                {[item.reading, item.partOfSpeech, item.levelHint]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <p className="rounded bg-[#eef5ef] px-2 py-1 text-sm font-medium text-[#315b40]">
              {item.french}
            </p>
          </div>
          {(item.dictionaryForm || item.explanation) && (
            <div className="mt-3 rounded-md bg-[#f7f9f7] p-3 text-sm leading-6 text-[#405048]">
              {item.dictionaryForm && (
                <p className="font-medium text-[#26332b]">
                  Forme dictionnaire : {item.dictionaryForm}
                </p>
              )}
              {item.explanation && (
                <p className={item.dictionaryForm ? "mt-1" : ""}>
                  {item.explanation}
                </p>
              )}
            </div>
          )}
          <div
            className="mt-3 border-t border-[#edf0ed] pt-3 text-sm leading-6 text-[#53625a]"
            dangerouslySetInnerHTML={{ __html: item.example }}
          />
        </article>
      ))}
    </div>
  );
}
