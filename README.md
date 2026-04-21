# Kotoba

Kotoba est une application React pour etudier le japonais avec un podcast video. L'utilisateur donne le lien de la video YouTube, importe les sous-titres qu'il a recuperes au format SRT, puis utilise le script pour lire, comprendre et reviser le contenu.

Les sous-titres peuvent par exemple etre recuperes avec :

<https://www.downloadyoutubesubtitles.com/fr>

L'objectif est de transformer une video en support d'etude complet : phrases decoupees, aide a la lecture, traduction, vocabulaire contextualise et QCM de comprehension adapte au niveau de l'utilisateur.

## Fonctionnalites

- Import d'un lien YouTube.
- Import d'un ou plusieurs fichiers `.srt`.
- Decoupage du script a partir des sous-titres.
- Generation automatique d'un lexique a partir du script.
- Generation automatique d'un quiz par niveau JLPT.
- Choix du niveau d'etude, de N5 a N1.
- Affichage de la video, des sous-titres, du lexique et du quiz.
- Sauvegarde locale de la bibliotheque dans le navigateur avec `localStorage`.

## Parcours utilisateur vise

1. L'utilisateur choisit son niveau dans la topbar du site.
2. Il colle le lien de la video YouTube du podcast.
3. Il recupere les sous-titres de la video via `downloadyoutubesubtitles.com`.
4. Il importe le ou les fichiers `.srt` dans Kotoba.
5. Kotoba decoupe le script phrase par phrase.
6. Chaque phrase affiche une aide a la lecture avec furigana.
7. Un bouton sous chaque phrase permet d'afficher la traduction francaise.
8. Au survol d'un mot, l'utilisateur peut voir sa traduction ou son explication.
9. Un QCM est genere a partir de l'ensemble du script pour verifier la comprehension globale.
10. Le niveau choisi par l'utilisateur sert a calibrer la difficulte du lexique, des traductions et des questions.

## Fonctionnalites a consolider

- Decouper plus finement chaque phrase japonaise depuis les cues SRT.
- Afficher les furigana au-dessus des kanji pour faciliter la lecture.
- Ajouter une traduction francaise phrase par phrase, affichee a la demande.
- Ajouter une traduction ou une definition au survol de chaque mot.
- Brancher une API de traduction, de dictionnaire ou de modele de langue pour enrichir les traductions et le vocabulaire.
- Generer un QCM de comprehension qui couvre tout le script, avec une difficulte ajustee au niveau JLPT choisi.

## Prerequis

- Node.js
- npm

## Installation

```sh
npm install
```

Copier ensuite le fichier d'environnement local :

```sh
cp .env.example .env
```

Puis renseigner `OPENAI_API_KEY` dans `.env`.

Si le backend est accessible depuis un autre appareil ou un reseau public,
ajouter aussi un token d'acces local :

```sh
KOTOBA_ACCESS_TOKEN=une-longue-valeur-aleatoire
```

Quand ce token est defini, l'interface demande ce token dans la barre du haut
et l'envoie au backend via l'en-tete `X-Kotoba-Token`.

## Developpement

```sh
npm run dev
```

Le serveur Vite affiche ensuite l'URL locale a ouvrir dans le navigateur.

Pour utiliser les fonctions IA locales, lancer plutot le frontend et le backend ensemble :

```sh
npm run app
```

Le backend local demarre par defaut sur `http://localhost:8787`.

## Backend local

Le dossier `server/` expose une API locale utilisee par l'interface React.

Endpoints disponibles :

- `GET /api/health` : verifier que le serveur local est lance.
- `GET /api/library` : charger la bibliotheque partagee.
- `PUT /api/library` : synchroniser la bibliotheque partagee.
- `POST /api/library-backup` : creer une sauvegarde datee.
- `POST /api/translate-sentence` : traduire une phrase japonaise en francais selon le niveau de l'utilisateur.
- `POST /api/generate-quiz` : generer un QCM de comprehension a partir du script complet.

La cle OpenAI reste dans `.env` et n'est pas exposee dans le navigateur. Le
token `KOTOBA_ACCESS_TOKEN` protege les endpoints de donnees et les appels IA
si le serveur est joignable depuis l'exterieur.

## Build

```sh
npm run build
```

La version de production est generee dans `dist`.

## Previsualisation du build

```sh
npm run preview
```

## Structure du projet

```text
src/
  App.jsx                    Point d'entree de l'interface
  main.jsx                   Montage React
  styles.css                 Styles globaux et Tailwind
  components/                Composants de l'application
    VideoImporter.jsx        Formulaire d'import YouTube + SRT
    VideoPlayer.jsx          Lecteur video YouTube
    SubtitlesPanel.jsx       Edition et affichage des sous-titres
    StudyPanel.jsx           Conteneur quiz / lexique
    QuizPanel.jsx            Quiz interactif
    LexiconPanel.jsx         Lexique genere
    VideoList.jsx            Bibliotheque de videos importees
  data/
    videos.js                Donnees initiales
  lib/
    utils.js                 Parsing SRT, generation du lexique et du quiz
```

## Notes

- Les donnees importees restent dans le navigateur de l'utilisateur via `localStorage`.
- Le projet utilise Vite, React, Tailwind CSS et `lucide-react`.
- La configuration Vite definit `base: "/kotoba/"`, ce qui convient a un deploiement sous le chemin `/kotoba/`, par exemple sur GitHub Pages.
