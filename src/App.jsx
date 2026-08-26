import { useState, useEffect, useRef, useCallback, useMemo, Component } from "react";
import { loadData, saveData, syncData, connectData, isSupabaseConfigured, DEFAULT_DATA, DEFAULT_PROFILE } from "./storage.js";

// =============================================
// ERROR BOUNDARY
// =============================================
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("Moa crash:", error, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: "'Plus Jakarta Sans'", maxWidth: 500, margin: "40px auto" }}>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>⚠️ Moa a rencontré une erreur</div>
          <div style={{ fontSize: 13, color: "#636366", lineHeight: 1.6, marginBottom: 16 }}>
            Copie le message ci-dessous pour le diagnostic :
          </div>
          <pre style={{ background: "#f8f8fa", border: "1px solid #e5e5ea", borderRadius: 8, padding: 12, fontSize: 11, whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.5, maxHeight: 200, overflow: "auto" }}>
            {this.state.error?.toString()}{"\n"}{this.state.error?.stack?.substring(0, 500)}
          </pre>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={() => { localStorage.removeItem("moa-active-lesson"); this.setState({ error: null }); }}
              style={{ padding: "8px 16px", borderRadius: 6, background: "#7b7ff5", color: "#fff", border: "none", fontSize: 13, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>
              Réessayer
            </button>
            <button onClick={() => { localStorage.removeItem("moa-active-lesson"); localStorage.removeItem("moa-app-data"); localStorage.removeItem("moa-sync-id"); this.setState({ error: null }); window.location.reload(); }}
              style={{ padding: "8px 16px", borderRadius: 6, background: "none", border: "1px solid #d1d1d6", color: "#636366", fontSize: 13, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>
              Reset complet
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// =============================================
// TRANSLATIONS
// =============================================
const T = {
  fr: {
    library: "Bibliothèque", lesson: "Leçon", import: "Importer", exercise: "Exercice",
    profile: "Profil",
    review: "À revoir", acquired: "Acquis", reviewBtn: "Revoir",
    statusNew: "Nouveau", statusInProgress: "En cours", statusStudied: "Étudié", statusAcquired: "Acquis",
    reviewCount: (n) => `${n} révision${n > 1 ? "s" : ""}`,
    importTitle: "Importer un texte",
    importSub: "Colle un article de blog, un extrait, ou n'importe quel texte coréen. L'IA va repérer les points pertinents pour ton niveau.",
    analyze: "Analyser ce texte", analyzing: "Analyse en cours...",
    pointsFound: (n) => `${n} point${n > 1 ? "s" : ""} repéré${n > 1 ? "s" : ""} dans ton texte`,
    pickSub: "Choisis celui que tu veux étudier, ou marque ceux que tu connais déjà.",
    iKnow: "Je connais", addedAcq: "Ajouté (acquis)",
    startLesson: "Commencer la leçon", morePoints: "Trouver d'autres points",
    exerciseTitle: "Exercice global",
    exerciseSub: "Choisis un mode et les cartes que tu veux travailler.",
    story: "Raconter une histoire", storyDesc: "Utilise les structures choisies dans un texte cohérent.",
    qcm: "QCM aléatoire", qcmDesc: "Questions sur des exemples nouveaux.",
    fillBlanks: "Compléter les phrases", fillDesc: "Phrases à trous tirées de vrais articles.",
    availableCards: "Cartes disponibles (acquises)", launchEx: "Lancer l'exercice",
    moreExamples: "Plus d'exemples", onlineRes: "Ressources complémentaires", realExamples: "Exemples authentiques", searching: "Recherche en cours...", sources: "Sources", showTranslations: "Traductions", tapToReveal: "Touche les zones floues pour révéler la traduction",
    anExercise: "Un exercice", explainOther: "Expliquer autrement",
    yourAnswer: "Votre réponse...", grammar: "Grammaire", expression: "Expression",
    points: "points", toReview: "à revoir", acq: "acquis",
    noCards: "Aucune carte pour le moment. Importe un texte pour commencer !",
    placeholder: "큰아이는 요즘 자기가 원하는 게 생기면\n\"엄마, 나 이거 사도 돼요?\"라고 꼭 허락을 구한다...",
    back: "Retour", thinking: "Réflexion...",
    noAcquired: "Aucune carte étudiée ou acquise.",
    emptyLesson: "Importe un texte et choisis un point pour commencer.",
    syncLabel: "Code de synchro",
    syncPlaceholder: "un mot de passe simple...",
    syncInfo: "Ce code synchronise tes données entre appareils. Utilise le même partout.",
    syncOn: "Synchro activée",
    syncOff: "Local uniquement",
    connect: "Connecter",
    disconnect: "Déconnecter",
    syncConnected: "Connecté avec le code :",
    syncLoading: "Synchronisation...",
    syncError: "Erreur de connexion. Vérifie ta configuration Supabase.",
    syncSuccess: "Données synchronisées !",
    welcomeTitle: "Bienvenue sur 모아",
    welcomeSub: "Connecte-toi à ton compte ou crée-en un nouveau pour commencer.",
    welcomeLoginTitle: "Retrouve ton compte",
    welcomeLoginSub: "Entre ton code personnel pour retrouver tes données.",
    welcomeCreateTitle: "Crée ton compte",
    welcomeCreateSub: "Choisis un code personnel pour créer ton compte.",
    welcomeLogin: "Se connecter",
    welcomeCreate: "Créer un compte",
    welcomeCode: "Code personnel",
    welcomeCodePlaceholder: "ton code personnel...",
    welcomeNoAccount: "Aucun compte trouvé avec ce code.",
    welcomeCreateHint: "Choisis n'importe quel mot ou phrase comme code.",
    welcomeLoginHint: "Utilise le code de ton compte existant pour retrouver tes données.",
    welcomeSwitchToLogin: "Se connecter plutôt",
    welcomeSwitchToCreate: "Créer un compte plutôt",
    // Profile
    profileTitle: "Mon profil",
    profileSub: "Ces informations permettent à l'IA d'adapter les leçons, les exemples et les exercices à tes centres d'intérêt et à ton niveau.",
    levelLabel: "Niveau",
    levelPlaceholder: "ex: Débutant, connaît l'alphabet et les bases / TOPIK 3 / CECRL A2...",
    interestsLabel: "Centres d'intérêt",
    interestsPlaceholder: "Sois précis ! ex: K-Pop (BTS, surtout Jungkook, chanson préférée : Spring Day), dramas (Crash Landing on You, Reply 1988), cuisine coréenne (tteokbokki)...",
    goalsLabel: "Objectifs",
    goalsPlaceholder: "ex: Pouvoir lire des articles de blog sans dictionnaire, comprendre les paroles de chansons, passer TOPIK 4...",
    notesLabel: "Notes",
    notesPlaceholder: "Toute info utile : difficultés récurrentes, temps disponible, préférences d'apprentissage...",
    profileSaved: "Profil enregistré !",
    saveProfile: "Enregistrer",
    genderLabel: "Genre",
    genderNone: "Non renseigné",
    genderM: "Homme",
    genderF: "Femme",
    ageLabel: "Âge",
    agePlaceholder: "ex: 28",
    nationalityLabel: "Nationalité / langue maternelle",
    nationalityPlaceholder: "ex: Français, Sénégalais francophone, Japonais...",
    profileAutoUpdate: "Le profil est aussi enrichi automatiquement à chaque leçon en fonction de ce que tu partages.",
    // Lesson summary
    endLesson: "Terminer la leçon",
    endLessonConfirm: "Terminer et voir le résumé ?",
    summaryTitle: "Résumé de la leçon",
    generating: "Génération du résumé...",
    summaryHistory: "Historique des leçons",
    noSummaries: "Aucune leçon terminée pour le moment.",
    summaryLearned: "Ce qui a été compris",
    summaryMistakes: "Points à clarifier",
    summaryNext: "Prochaines étapes",
    newLesson: "Nouvelle leçon",
    moreExercises: "Plus d'exercices",
    derivedFrom: "issu de",
    viewGrid: "Grille",
    viewTree: "Arbre",
    noParent: "Structure racine",
    childCount: (n) => `${n} dérivée${n > 1 ? "s" : ""}`,
    recapTitle: "Récap de la leçon",
    recapSub: "Voici ce qu'on a vu lors de tes précédentes sessions sur cette structure.",
    redoLesson: "Refaire la leçon",
    redoLessonSub: "Recommencer une leçon socratique",
    doExercises: "S'exercer",
    noRecapYet: "Cette structure n'a pas encore de résumé de leçon.",
    structureInfo: "Fiche",
    addLang: "Ajouter une langue",
    studyLang: "Langue étudiée",
    chooseLang: "Quelle langue veux-tu étudier ?",
    // Onboarding
    onbTitle1: "Parle-nous de toi",
    onbSub1: "Ces infos aident l'IA à choisir le bon ton et à repérer les pièges liés à ta langue maternelle.",
    onbTitle2: "Ton rêve le plus fou",
    onbSub2: "Dans cette langue, qu'est-ce que tu rêverais de pouvoir faire ? Pas de limite, sois ambitieux !",
    dreamPlaceholder: "ex: Discuter des heures avec mes beaux-parents sans traducteur. Lire Han Kang en version originale. Faire un stand-up en coréen...",
    spokenLangsLabel: "Langues que tu parles",
    spokenLangsPlaceholder: "ex: Français (natif), Anglais (courant), Espagnol (notions)",
    onbNext: "Suivant",
    onbSkip: "Passer",
    onbFinish: "C'est parti !",
    onbStep: (a, b) => `${a} / ${b}`,
    // Points
    points_: "points",
    pointsEarned: (n) => `+${n} points !`,
    // Detailed questionnaire
    detailedTitle: "Questionnaire détaillé",
    detailedSub: "Plus l'IA te connaît, plus tes leçons seront taillées pour toi. Chaque réponse rend les exemples plus vivants.",
    detailedCta: "Compléter mon profil",
    detailedReward: "+100 points",
    detailedDone_: "Questionnaire complété ✓",
    favFilms: "3 films ou séries préférés",
    favFilmsPh: "ex: Crash Landing on You, Reply 1988, Parasite",
    favMusic: "3 chanteurs ou chansons préférés",
    favMusicPh: "ex: BTS (surtout Jungkook), Spring Day, IU",
    favSports: "3 sports préférés",
    favSportsPh: "ex: escalade, natation, badminton",
    favFood: "3 plats préférés",
    favFoodPh: "ex: tteokbokki, bibimbap, kimchi jjigae",
    favBooks: "3 livres, mangas ou BD préférés",
    favBooksPh: "ex: Pachinko, Solo Leveling, Le Petit Prince",
    favHobbies: "3 hobbies préférés",
    favHobbiesPh: "ex: photographie argentique, jardinage, jeux de société",
    dreamJobs: "3 jobs de rêve",
    dreamJobsPh: "ex: traductrice littéraire, chef pâtissière, pilote",
    otherTools: "Utilises-tu d'autres outils en parallèle ?",
    otherToolsPh: "Duolingo, Anki, YouTube, comptes Insta... Qu'en penses-tu ?",
    bestMemory: "Ton meilleur souvenir d'apprentissage d'une langue",
    bestMemoryPh: "Qu'est-ce qui rendait ce moment spécial ?",
    worstMemory: "Une expérience frustrante avec un prof ou une méthode",
    worstMemoryPh: "Qu'est-ce qui ne fonctionnait pas pour toi ?",
    saveAndEarn: "Enregistrer et gagner 100 points",
    quickPractice: "Pratique rapide",
    quickPracticeSub: "Travaille cette structure sans refaire toute la leçon.",
    backToRecap: "Retour au récap",
    feed: "Feed",
    feedTitle: "Ton feed",
    feedSub: "Des textes authentiques choisis selon tes centres d'intérêt. Lis, repère ce qui t'intrigue.",
    feedSearch: "Chercher un sujet...",
    feedLoading: "Chargement du feed...",
    feedEmpty: "Aucun résultat. Essaie un autre mot-clé.",
    feedNoKeywords: "Complète ton profil pour un feed personnalisé, ou lance une recherche.",
    feedRefresh: "Rafraîchir",
    feedRead: "Lire l'article",
    feedCatBlog: "Blogs",
    feedCatNews: "Actu",
    feedCatCafe: "Forums",
    feedCatKin: "Q&R",
    feedGenKeywords: "Génération des sujets...",
    exFinished: "Exercice terminé !",
    newExercise: "Nouvel exercice",
    backToLibrary: "Bibliothèque",
  },
  en: {
    library: "Library", lesson: "Lesson", import: "Import", exercise: "Exercise",
    profile: "Profile",
    review: "To review", acquired: "Acquired", reviewBtn: "Review",
    statusNew: "New", statusInProgress: "In progress", statusStudied: "Studied", statusAcquired: "Acquired",
    reviewCount: (n) => `${n} review${n > 1 ? "s" : ""}`,
    importTitle: "Import a text",
    importSub: "Paste a blog article or any Korean text. The AI will find relevant points for your level.",
    analyze: "Analyze this text", analyzing: "Analyzing...",
    pointsFound: (n) => `${n} point${n > 1 ? "s" : ""} found in your text`,
    pickSub: "Choose one to study, or mark the ones you already know.",
    iKnow: "I know this", addedAcq: "Added (acquired)",
    startLesson: "Start lesson", morePoints: "Find more points",
    exerciseTitle: "Global exercise",
    exerciseSub: "Choose a mode and cards to work on.",
    story: "Tell a story", storyDesc: "Use chosen structures in a coherent text.",
    qcm: "Random quiz", qcmDesc: "Questions on new random examples.",
    fillBlanks: "Fill in the blanks", fillDesc: "Gap-fill from real articles.",
    availableCards: "Available cards (acquired)", launchEx: "Launch exercise",
    moreExamples: "More examples", onlineRes: "Further resources", realExamples: "Real examples", searching: "Searching...", sources: "Sources", showTranslations: "Translations", tapToReveal: "Tap blurred areas to reveal the translation",
    anExercise: "An exercise", explainOther: "Explain differently",
    yourAnswer: "Your answer...", grammar: "Grammar", expression: "Expression",
    points: "points", toReview: "to review", acq: "acquired",
    noCards: "No cards yet. Import a text to get started!",
    placeholder: "큰아이는 요즘 자기가 원하는 게 생기면\n\"엄마, 나 이거 사도 돼요?\"라고 꼭 허락을 구한다...",
    back: "Back", thinking: "Thinking...",
    noAcquired: "No studied or acquired cards yet.",
    emptyLesson: "Import a text and pick a point to start.",
    syncLabel: "Sync code",
    syncPlaceholder: "a simple passphrase...",
    syncInfo: "This code syncs your data across devices. Use the same one everywhere.",
    syncOn: "Sync enabled",
    syncOff: "Local only",
    connect: "Connect",
    disconnect: "Disconnect",
    syncConnected: "Connected with code:",
    syncLoading: "Syncing...",
    syncError: "Connection error. Check your Supabase setup.",
    syncSuccess: "Data synced!",
    welcomeTitle: "Welcome to 모아",
    welcomeSub: "Log in to your account or create a new one to get started.",
    welcomeLoginTitle: "Access your account",
    welcomeLoginSub: "Enter your personal code to retrieve your data.",
    welcomeCreateTitle: "Create your account",
    welcomeCreateSub: "Choose a personal code to create your account.",
    welcomeLogin: "Log in",
    welcomeCreate: "Create an account",
    welcomeCode: "Personal code",
    welcomeCodePlaceholder: "your personal code...",
    welcomeNoAccount: "No account was found with this code.",
    welcomeCreateHint: "Pick any word or phrase as your code.",
    welcomeLoginHint: "Use your existing account code to retrieve your data.",
    welcomeSwitchToLogin: "Log in instead",
    welcomeSwitchToCreate: "Create an account instead",
    // Profile
    profileTitle: "My profile",
    profileSub: "This information helps the AI tailor lessons, examples, and exercises to your interests and level.",
    levelLabel: "Level",
    levelPlaceholder: "e.g. Beginner, knows the alphabet and basics / TOPIK 3 / CEFR A2...",
    interestsLabel: "Interests",
    interestsPlaceholder: "Be specific! e.g. K-Pop (BTS, especially Jungkook, favorite song: Spring Day), dramas (Crash Landing on You, Reply 1988), Korean food (tteokbokki)...",
    goalsLabel: "Goals",
    goalsPlaceholder: "e.g. Read blog articles without a dictionary, understand song lyrics, pass TOPIK 4...",
    notesLabel: "Notes",
    notesPlaceholder: "Any useful info: recurring difficulties, available study time, learning preferences...",
    profileSaved: "Profile saved!",
    saveProfile: "Save",
    genderLabel: "Gender",
    genderNone: "Not specified",
    genderM: "Male",
    genderF: "Female",
    ageLabel: "Age",
    agePlaceholder: "e.g. 28",
    nationalityLabel: "Nationality / native language",
    nationalityPlaceholder: "e.g. French, Senegalese (French-speaking), Japanese...",
    profileAutoUpdate: "Your profile is also enriched automatically after each lesson based on what you share.",
    // Lesson summary
    endLesson: "End lesson",
    endLessonConfirm: "End lesson and see summary?",
    summaryTitle: "Lesson summary",
    generating: "Generating summary...",
    summaryHistory: "Lesson history",
    noSummaries: "No completed lessons yet.",
    summaryLearned: "What was understood",
    summaryMistakes: "Points to clarify",
    summaryNext: "Next steps",
    newLesson: "New lesson",
    moreExercises: "More exercises",
    derivedFrom: "derived from",
    viewGrid: "Grid",
    viewTree: "Tree",
    noParent: "Root structure",
    childCount: (n) => `${n} derived`,
    recapTitle: "Lesson recap",
    recapSub: "Here's what we covered in your previous sessions on this structure.",
    redoLesson: "Redo the lesson",
    redoLessonSub: "Start a fresh Socratic lesson",
    doExercises: "Practice",
    noRecapYet: "No lesson summary for this structure yet.",
    structureInfo: "Info",
    addLang: "Add a language",
    studyLang: "Studying",
    chooseLang: "Which language do you want to study?",
    // Onboarding
    onbTitle1: "Tell us about you",
    onbSub1: "This helps the AI pick the right tone and spot pitfalls linked to your native language.",
    onbTitle2: "Your wildest dream",
    onbSub2: "In this language, what would you dream of being able to do? No limits, be ambitious!",
    dreamPlaceholder: "e.g. Chat for hours with my in-laws without a translator. Read Han Kang in the original. Do stand-up in Korean...",
    spokenLangsLabel: "Languages you speak",
    spokenLangsPlaceholder: "e.g. French (native), English (fluent), Spanish (basics)",
    onbNext: "Next",
    onbSkip: "Skip",
    onbFinish: "Let's go!",
    onbStep: (a, b) => `${a} / ${b}`,
    // Points
    points_: "points",
    pointsEarned: (n) => `+${n} points!`,
    // Detailed questionnaire
    detailedTitle: "Detailed questionnaire",
    detailedSub: "The more the AI knows you, the more your lessons fit you. Every answer makes examples come alive.",
    detailedCta: "Complete my profile",
    detailedReward: "+100 points",
    detailedDone_: "Questionnaire completed ✓",
    favFilms: "3 favorite films or series",
    favFilmsPh: "e.g. Crash Landing on You, Reply 1988, Parasite",
    favMusic: "3 favorite singers or songs",
    favMusicPh: "e.g. BTS (especially Jungkook), Spring Day, IU",
    favSports: "3 favorite sports",
    favSportsPh: "e.g. climbing, swimming, badminton",
    favFood: "3 favorite dishes",
    favFoodPh: "e.g. tteokbokki, bibimbap, kimchi jjigae",
    favBooks: "3 favorite books, manga or comics",
    favBooksPh: "e.g. Pachinko, Solo Leveling, The Little Prince",
    favHobbies: "3 favorite hobbies",
    favHobbiesPh: "e.g. film photography, gardening, board games",
    dreamJobs: "3 dream jobs",
    dreamJobsPh: "e.g. literary translator, pastry chef, pilot",
    otherTools: "Do you use other tools alongside?",
    otherToolsPh: "Duolingo, Anki, YouTube, Insta accounts... What do you think of them?",
    bestMemory: "Your best language learning memory",
    bestMemoryPh: "What made that moment special?",
    worstMemory: "A frustrating experience with a teacher or method",
    worstMemoryPh: "What didn't work for you?",
    saveAndEarn: "Save and earn 100 points",
    quickPractice: "Quick practice",
    quickPracticeSub: "Work on this structure without redoing the whole lesson.",
    backToRecap: "Back to recap",
    feed: "Feed",
    feedTitle: "Your feed",
    feedSub: "Authentic texts picked from your interests. Read, spot what intrigues you.",
    feedSearch: "Search a topic...",
    feedLoading: "Loading feed...",
    feedEmpty: "No results. Try another keyword.",
    feedNoKeywords: "Fill in your profile for a personalized feed, or run a search.",
    feedRefresh: "Refresh",
    feedRead: "Read article",
    feedCatBlog: "Blogs",
    feedCatNews: "News",
    feedCatCafe: "Forums",
    feedCatKin: "Q&A",
    feedGenKeywords: "Generating topics...",
    exFinished: "Exercise complete!",
    newExercise: "New exercise",
    backToLibrary: "Library",
  },
};

// =============================================
// COLORS
// =============================================
const C = {
  bg: "#f0f0f3", s0: "#ffffff", s1: "#f8f8fa", s2: "#ffffff",
  border: "#e5e5ea", borderS: "#d1d1d6", bAcc: "#7b7ff5",
  acc: "#7b7ff5", accBg: "rgba(123,127,245,0.08)", onAcc: "#fff",
  txt: "#1d1d1f", txtS: "#636366", txtM: "#aeaeb2",
  warn: "#d9882e", warnBg: "rgba(217,136,46,0.08)", warnB: "rgba(217,136,46,0.25)",
  ok: "#3daa5c", okBg: "rgba(61,170,92,0.08)", okB: "rgba(61,170,92,0.25)",
  proBg: "rgba(175,82,222,0.08)", pro: "#af52de",
  // Card statuses
  stNew: "#aeaeb2", stNewBg: "rgba(174,174,178,0.08)", stNewB: "rgba(174,174,178,0.25)",
  stProg: "#e85d9a", stProgBg: "rgba(232,93,154,0.08)", stProgB: "rgba(232,93,154,0.25)",
  stStudied: "#5b8def", stStudiedBg: "rgba(91,141,239,0.08)", stStudiedB: "rgba(91,141,239,0.25)",
  stAcq: "#3daa5c", stAcqBg: "rgba(61,170,92,0.08)", stAcqB: "rgba(61,170,92,0.25)",
};

// =============================================
// TARGET LANGUAGES
// =============================================
const TARGET_LANGS = {
  ko: {
    flag: "🇰🇷", nativeName: "한국어",
    name: { fr: "Coréen", en: "Korean" },
    font: "'Noto Sans KR'",
    placeholder: "큰아이는 요즘 자기가 원하는 게 생기면\n\"엄마, 나 이거 사도 돼요?\"라고 꼭 허락을 구한다...",
    promptExtra: "For online resources, suggest Naver Blog, Korean variety shows, webtoons. For level references, use TOPIK scale.",
  },
  de: {
    flag: "🇩🇪", nativeName: "Deutsch",
    name: { fr: "Allemand", en: "German" },
    font: null,
    placeholder: "Die Kinder spielen gern im Garten, besonders wenn die Sonne scheint. Meine Nachbarin hat gesagt, dass sie sich darauf freut...",
    promptExtra: "For online resources, suggest Deutsche Welle, Spiegel Online, ARD Mediathek. For level references, use CEFR scale (A1-C2).",
  },
};

function getTargetLangName(tlCode, uiLang) {
  return TARGET_LANGS[tlCode]?.name?.[uiLang] || TARGET_LANGS[tlCode]?.nativeName || tlCode;
}

function getTargetFont(tlCode) {
  return TARGET_LANGS[tlCode]?.font || "'Plus Jakarta Sans'";
}

// Shared instruction: all translations must be wrapped so the UI can blur them
const TRANSLATION_RULE = `
CRITICAL FORMATTING RULE: Every time you write a translation of a target-language sentence or phrase into the student's language, you MUST wrap it in double square brackets like this: [[the translation here]].
This lets the app hide translations so the student can try to understand first, then tap to reveal.
Examples of correct formatting:
  청년 대회가 재밌었길 바랍니다
  [[J'espère que la convention des jeunes était amusante.]]

  Die Kinder spielen gern im Garten.
  [[Les enfants aiment jouer dans le jardin.]]
Apply this to EVERY translation you write in your message body.
EXCEPTION: never use [[...]] inside MCQ option labels. Options are answers the student must be able to read and click, so write them in plain text with no brackets.
Do NOT wrap explanations, grammar notes, or questions: only actual translations of target-language text.`;

// =============================================
// AI CALL (via serverless proxy)
// =============================================
async function callAI(systemPrompt, userMessage, maxTokens, useSearch, plainText) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      max_tokens: maxTokens || 1200,
      search: useSearch === true,
      plain: plainText === true,
    }),
  });
  const rawText = await res.text();
  if (!res.ok) {
    let errMsg = rawText;
    try { const ej = JSON.parse(rawText); errMsg = ej.error || rawText; } catch {}
    throw new Error(errMsg);
  }
  let data;
  try { data = JSON.parse(rawText); } catch { throw new Error("Server response is not JSON: " + rawText.substring(0, 200)); }
  const text = (data.content || []).map((b) => b.text || "").join("\n");
  if (!text) throw new Error("Empty AI response. Raw: " + rawText.substring(0, 200));
  return { text, sources: data.sources || [] };
}

function parseJSON(raw) {
  try { return JSON.parse(raw); } catch {}
  let cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  try { return JSON.parse(cleaned); } catch {}
  const start = cleaned.search(/[\[{]/);
  const lastBracket = cleaned.lastIndexOf(']');
  const lastBrace = cleaned.lastIndexOf('}');
  const end = Math.max(lastBracket, lastBrace);
  if (start >= 0 && end > start) {
    try { return JSON.parse(cleaned.substring(start, end + 1)); } catch {}
  }
  throw new Error("Could not parse AI response as JSON: " + raw.substring(0, 200));
}

// =============================================
// CONTEXT BUILDER
// =============================================
function buildContext(data, lang) {
  const L = lang === "fr" ? "French" : "English";
  const p = data.profile || {};
  const summaries = data.summaries || [];

  let ctx = "";

  // Profile section
  const favs = [
    p.favFilms && `films/series: ${p.favFilms}`,
    p.favMusic && `music: ${p.favMusic}`,
    p.favSports && `sports: ${p.favSports}`,
    p.favFood && `food: ${p.favFood}`,
    p.favBooks && `books/manga: ${p.favBooks}`,
    p.favHobbies && `hobbies: ${p.favHobbies}`,
    p.dreamJobs && `dream jobs: ${p.dreamJobs}`,
  ].filter(Boolean).join(" | ");

  const hasProfile = p.gender || p.age || p.nationality || p.spokenLanguages || p.dream || p.level || p.interests || p.goals || p.notes || favs;
  if (hasProfile) {
    ctx += "=== LEARNER PROFILE ===\n";
    ctx += "Level: intermediate learner.\n";
    if (p.gender) ctx += `Gender: ${p.gender}\n`;
    if (p.age) ctx += `Age: ${p.age}\n`;
    if (p.nationality) ctx += `Nationality / native language: ${p.nationality}\n`;
    if (p.spokenLanguages) ctx += `Languages spoken: ${p.spokenLanguages} (you can draw comparisons with these languages when useful)\n`;
    if (p.dream) ctx += `Their dream in this language: ${p.dream}\n`;
    if (p.level) ctx += `Self-described level: ${p.level}\n`;
    if (favs) ctx += `FAVORITES (use these to build examples that resonate): ${favs}\n`;
    if (p.interests) ctx += `Other interests: ${p.interests}\n`;
    if (p.goals) ctx += `Goals: ${p.goals}\n`;
    if (p.notes) ctx += `Additional notes: ${p.notes}\n`;
    ctx += "\n";
  }

  // Teaching preferences from the detailed questionnaire
  if (p.otherTools || p.bestMemory || p.worstMemory) {
    ctx += "=== HOW TO TEACH THIS LEARNER ===\n";
    if (p.otherTools) ctx += `Other tools they use: ${p.otherTools}\n`;
    if (p.bestMemory) ctx += `What worked for them in the past (lean into this): ${p.bestMemory}\n`;
    if (p.worstMemory) ctx += `What frustrated them in the past (AVOID this): ${p.worstMemory}\n`;
    ctx += "\n";
  }

  // Full learning history (all past lessons, chronological)
  if (summaries.length > 0) {
    ctx += `=== LEARNING HISTORY (${summaries.length} completed lesson${summaries.length > 1 ? "s" : ""}) ===\n`;
    summaries.forEach((s) => {
      ctx += `[${s.date}] ${s.cardKorean}`;
      if (s.structuresLearned) ctx += ` | Understood: ${s.structuresLearned}`;
      if (s.mistakesMade) ctx += ` | Struggled with: ${s.mistakesMade}`;
      if (s.nextSteps) ctx += ` | Next: ${s.nextSteps}`;
      ctx += "\n";
    });
    ctx += "\n";
  }

  // Card inventory (brief)
  if (data.cards && data.cards.length > 0) {
    const revCards = data.cards.filter(c => c.status === "review" || c.status === "new");
    const acqCards = data.cards.filter(c => c.status === "acquired" || c.status === "studied");
    ctx += `=== CARD INVENTORY ===\n`;
    if (acqCards.length > 0) ctx += `Already studied (${acqCards.length}): ${acqCards.map(c => c.korean).join(", ")}\n`;
    if (revCards.length > 0) ctx += `Not yet studied (${revCards.length}): ${revCards.map(c => c.korean).join(", ")}\n`;
    ctx += "\n";
  }

  // Cap total context to avoid overwhelming the model (keep it under ~6000 chars)
  if (ctx.length > 6000) {
    ctx = ctx.substring(0, 6000) + "\n[...context truncated...]\n\n";
  }

  return ctx;
}

// =============================================
// AI FUNCTIONS (with context injection)
// =============================================
async function analyzeText(text, existing, lang, context, tlCode) {
  const known = existing.map((c) => c.korean).join(", ");
  const L = lang === "fr" ? "French" : "English";
  const TL = getTargetLangName(tlCode, "en");
  const tlExtra = TARGET_LANGS[tlCode]?.promptExtra || "";
  const sys = `You are an expert ${TL} language analyst. Your job is to find the most interesting and teachable grammar structures or expressions in a ${TL} text, personalized for this specific learner.

${context}
TASK: Analyze the provided ${TL} text and extract exactly 3 interesting grammatical structures or expressions worth studying.

SELECTION CRITERIA (in order of priority):
1. Structures that connect to the learner's interests (if known) make better examples and stick in memory longer
2. Prefer structures that are emotionally expressive, subjective, or commonly found in blogs and conversation
3. Prefer structures that reveal a nuance hard to guess from textbook definitions alone
4. Adapt difficulty to the learner's stated level: if they are a beginner, favor high-frequency patterns; if intermediate/advanced, favor subtle nuances
5. Avoid structures the learner has already studied (see ALREADY KNOWN and CARD INVENTORY above)
6. Each structure must appear clearly in the provided text with a real example sentence
${tlExtra}

ALREADY KNOWN (skip these): ${known || "none"}

For each structure, provide:
- "korean": the structure pattern (the ${TL} grammar form)
- "type": "grammar" or "expression"
- "description_fr": one clear sentence in French explaining what it means and when to use it
- "description_en": same in English
- "example_kr": the exact sentence from the text where this structure appears
- "example_fr": natural French translation of that sentence
- "example_en": natural English translation of that sentence

Return a JSON array of exactly 3 items.`;
  return parseJSON((await callAI(sys, text)).text);
}

async function startSocratic(card, article, lang, context, tlCode) {
  const L = lang === "fr" ? "French" : "English";
  const TL = getTargetLangName(tlCode, "en");
  const d = lang === "fr" ? card.description_fr : card.description_en;
  const sys = `You are a warm, encouraging ${TL} language teacher who uses the Socratic method. You NEVER explain a rule directly. Instead, you guide the student to discover it themselves through observation and pattern recognition.

${context}
METHODOLOGY:
1. Start by showing the target structure highlighted in a sentence from the article. Briefly set the scene so the student understands the context.
2. Then show 2 NEW example sentences (not from the article) that use the same structure in different contexts. If you know the student's interests (see LEARNER PROFILE above), draw examples from those topics. Choose examples where the meaning of the structure becomes obvious from context.
3. Ask ONE multiple-choice question that tests whether the student has grasped the core meaning or nuance. The question should be about what the structure conveys emotionally or functionally, not about grammar terminology.

PERSONALIZATION:
- If the learner has studied related structures before (see LEARNING HISTORY), you can reference them
- If the learner has recurring mistakes (see LEARNING HISTORY), preemptively address them
- Adapt vocabulary complexity to the stated level

TONE:
- Speak in ${L}
- Be warm and conversational, like a patient tutor who genuinely knows the student
- Use short paragraphs with line breaks for readability
- Write ${TL} examples on their own lines
- After each ${TL} example, add the ${L} translation on the next line
${TRANSLATION_RULE}

IMPORTANT RULES:
- Do NOT name the grammar rule or give its official name yet
- Do NOT immediately explain what the structure means. Let the student figure it out first.
- The wrong MCQ options should be plausible but clearly distinguishable from the right answer
- Use "label" as the key name for each option's text

Return JSON: {"message": "your teaching text", "options": [{"label": "a) ...", "correct": false}, {"label": "b) ...", "correct": true}, {"label": "c) ...", "correct": false}]}`;
  return parseJSON((await callAI(sys, `Structure to teach: ${card.korean}
Meaning (do NOT reveal this to the student): ${d}
Example from the article: ${card.example_kr}
Article context:\n${(article || "").substring(0, 800)}`, 1600)).text);
}

async function continueChat(card, conv, action, lang) {
  const L = lang === "fr" ? "French" : "English";
  const hist = conv.map((m) => `${m.role === "ai" ? "Teacher" : "Student"}: ${m.content}${m.selected ? ` [chose: ${m.selected}]` : ""}`).join("\n");
  const aiTurns = conv.filter(m => m.role === "ai").length;
  const phase = aiTurns <= 2 ? "DISCOVERY" : aiTurns <= 5 ? "DEEPENING" : "CONSOLIDATION";

  const correctByPhase = {
    DISCOVERY: `The student answered correctly! Briefly confirm (1 sentence). Now reveal the official grammar name and explain the core nuance more explicitly. Show one more example that highlights a subtlety. Ask a slightly harder question to go deeper. Include MCQ options.`,
    DEEPENING: `The student answered correctly! Briefly confirm (1 sentence). Now show an edge case, a common mistake Korean learners make, or introduce a closely related/derived expression if one exists (e.g. an idiom built from this structure). Mention how this structure differs from similar ones they might confuse it with. Ask a question that tests this deeper understanding. Include MCQ options.`,
    CONSOLIDATION: `The student answered correctly! Briefly confirm (1 sentence). Now give a mini production exercise: provide a situation in ${L} and ask the student to write a Korean sentence using "${card.korean}". IMPORTANT: when they attempt to write Korean, if they make mistakes, do NOT give the corrected sentence. Instead, point out what needs fixing with hints and let them self-correct. After they succeed (or after 2 attempts), wrap up the lesson: summarize what was covered, congratulate the student, and explicitly tell them they can click the "End lesson" button to save their progress.`,
  };

  const acts = {
    examples: `The student wants more examples. Give 2-3 NEW example sentences using the structure "${card.korean}" in varied, real-life contexts. If you know their interests from the conversation or profile, tailor examples to those topics. For each example, write the sentence, then the ${L} translation on the next line. After the examples, ask a new question to check understanding. Include MCQ options if appropriate.`,
    
    exercise: `The student wants a practice exercise. Create a fill-in-the-blank or sentence-building exercise that requires using "${card.korean}". Give a context sentence in ${L}, then ask the student to complete or translate it into Korean using the structure. If you include MCQ options, use "label" as the key name.`,
    
    explain: `The student is struggling. Explain the structure "${card.korean}" differently. Use an analogy with ${L} or compare it to a simpler Korean structure the student likely knows. Use concrete, visual examples rather than abstract grammar explanations. Then give one more example and ask a simpler question to rebuild confidence.`,
    
    correct: correctByPhase[phase],
    
    "incorrect, explain": `The student picked the wrong answer in a multiple-choice question. Gently say which answer was correct and explain WHY it is correct. Then explain why the student's choice was wrong. Be encouraging. Give one more example to reinforce the correct understanding. If you include a new question, use "label" as the key name for MCQ options.`
  };

  const instruction = acts[action] || `The student said: "${action}". Respond naturally as a Socratic Korean teacher. Stay focused on the structure "${card.korean}".

IMPORTANT: If the student attempts to write Korean and makes mistakes, do NOT give them the corrected sentence directly. Instead:
1. Acknowledge their effort positively
2. Point out specifically what needs fixing (e.g. "the particle after this word needs to change" or "check how you conjugated the verb")
3. Give a hint or rule reminder that helps them self-correct
4. Ask them to try again
Only reveal the full correct sentence after they have made at least 2 attempts, or if they explicitly ask for the answer.

If they ask a question in their native language, answer it helpfully. Always try to keep the lesson moving forward with the current phase in mind.`;

  const phaseGuide = `
CURRENT LESSON PHASE: ${phase} (AI turn ${aiTurns + 1})
- DISCOVERY (turns 1-2): Observe, guess, first MCQ. Do NOT explain the rule yet.
- DEEPENING (turns 3-5): Reveal the name, show nuances, edge cases, derived expressions.
- CONSOLIDATION (turns 6+): Mini production exercise, then wrap up and suggest ending the lesson.`;

  const sys = `You are a Socratic language teacher having an ongoing lesson about the structure "${card.korean}". Speak in ${L}. Be warm, patient, and encouraging. Write target-language text on its own lines followed by translations.
${TRANSLATION_RULE}
${phaseGuide}

${instruction}

Return JSON: {"message": "your response"} or {"message": "your response", "options": [{"label": "a) ...", "correct": false}, ...]} if you include a question. Always use "label" (not "text") as the key for option text.`;
  
  return parseJSON((await callAI(sys, `Conversation so far:\n${hist}`)).text);
}

async function findResources(card, lang, tlCode) {
  const L = lang === "fr" ? "French" : "English";
  const TL = getTargetLangName(tlCode, "en");
  const sys = `You are a ${TL} language learning research assistant. Search the web for high-quality pedagogical resources explaining the grammar structure "${card.korean}".

TASK: Find 2-4 published grammar guides, lesson pages, or reference articles that explain this specific structure in depth.

PRIORITIZE:
- Dedicated grammar reference sites and language-learning blogs
- Pages that explain the rule, its conjugation, and its nuances
- Resources in ${L} or English when available, but include target-language resources if they are the best explanation

For each resource, give:
- The site or page name
- A one-line description of what it covers and why it is useful
- The URL

Then add a short note in ${L} comparing what the different resources emphasize, so the student knows which to read first.

Write your answer in ${L}, in clear prose with line breaks. Do NOT return JSON. Do NOT invent URLs: only cite pages you actually found in your search.`;

  const fallbackSys = `You are a ${TL} language learning assistant. The student wants pedagogical resources explaining the grammar structure "${card.korean}".

You do NOT have web access right now, so do NOT invent URLs.

Instead, in ${L}:
1. Name 3-4 well-established reference sites you genuinely know cover ${TL} grammar (e.g. for Korean: How To Study Korean, Talk To Me In Korean, Naver 국어사전; for German: Deutsche Welle, Lingolia, Canoonet).
2. For each, give the EXACT search terms the student should type to land on the right page (e.g. site name + the structure in quotes).
3. Add a 2-3 sentence summary of the rule itself so the student has something useful right now.

Be explicit that these are search suggestions, not direct links.

Write plain readable prose with line breaks. Do NOT return JSON, do NOT use curly braces or key-value pairs.`;

  try {
    const r = await callAI(sys, `Find pedagogical resources explaining the ${TL} grammar structure: ${card.korean}`, 1600, true);
    return { ...r, text: flattenIfJSON(r.text) };
  } catch (e) {
    if (String(e.message).includes("SEARCH_QUOTA")) {
      const r = await callAI(fallbackSys, `Suggest how to find resources for: ${card.korean}`, 1200, false, true);
      return { text: flattenIfJSON(r.text), sources: [], degraded: true };
    }
    throw e;
  }
}

async function findRealExamples(card, lang, tlCode, profileInterests) {
  const L = lang === "fr" ? "French" : "English";
  const TL = getTargetLangName(tlCode, "en");
  const sys = `You are a ${TL} language research assistant. Search the web for REAL, authentic examples of the structure "${card.korean}" used by native speakers.

TASK: Find 4-6 genuine example sentences from varied sources. Aim for a mix:
- Modern/casual sources: blog posts, YouTube video titles or comments, social media, news headlines, song lyrics
- More literary or formal sources: published articles, essays, literature, journalism

${profileInterests ? `The learner is interested in: ${profileInterests}. Prioritize sources connected to these interests when you can find them.` : ""}

For EACH example:
1. The sentence in ${TL}, exactly as it appears in the source
2. The ${L} translation on the next line, wrapped in [[double square brackets]]
3. The source: where it comes from (site name, author, or publication) and the URL

Group them into two sections: modern/everyday usage, and literary/formal usage.

Write your answer in ${L}, in clear prose with line breaks. Do NOT return JSON. CRITICAL: only cite sentences and sources you actually found in your search. Never invent an example or a URL. If you find fewer than 4 real examples, say so and give only the ones you found.`;

  const fallbackSys = `You are a ${TL} language teacher. The student wants to see the structure "${card.korean}" used in varied real-world registers.

You do NOT have web access right now, so you cannot cite real sources. Be transparent about that in one short line at the top.

Then, in ${L}, write 5 example sentences you compose yourself, clearly labelled by register:
- 2 casual/social media style
- 2 blog or journalism style
- 1 literary or formal style
${profileInterests ? `Where it fits naturally, connect examples to these interests: ${profileInterests}.` : ""}

For each: the ${TL} sentence, then the ${L} translation on the next line wrapped in [[double square brackets]].

Finish with 2-3 precise search queries the student can run themselves to find authentic occurrences.

Write plain readable prose with line breaks. Do NOT return JSON, do NOT use curly braces or key-value pairs.`;

  try {
    const r = await callAI(sys, `Find authentic real-world examples of the ${TL} structure: ${card.korean}`, 2000, true);
    return { ...r, text: flattenIfJSON(r.text) };
  } catch (e) {
    if (String(e.message).includes("SEARCH_QUOTA")) {
      const r = await callAI(fallbackSys, `Give varied register examples for: ${card.korean}`, 1600, false, true);
      return { text: flattenIfJSON(r.text), sources: [], degraded: true };
    }
    throw e;
  }
}

async function genExercise(cards, mode, lang, context, tlCode) {
  const L = lang === "fr" ? "French" : "English";
  const TL = getTargetLangName(tlCode, "en");
  const structs = cards.map((c) => `- ${c.korean}: ${lang === "fr" ? c.description_fr : c.description_en} (example: ${c.example_kr})`).join("\n");
  
  const modes = {
    story: `STORY MODE: Create a creative writing prompt in ${L} that requires using ALL the listed structures naturally in a short paragraph (3-5 sentences). 
If you know the student's interests (see LEARNER PROFILE), set the scenario in a context they care about.
Give the student:
1. A scenario/context personalized to their interests if possible
2. A starter sentence in the target language to help them begin
3. Clear instructions about which structures to incorporate
The goal is a coherent mini-text, not isolated sentences. No MCQ options for this mode.`,

    qcm: `QUIZ MODE: Ask exactly ONE multiple-choice question now. This is question 1 of 3 in a series.

Structure your message like this:
1. A brief one-line intro announcing the quiz (only for question 1)
2. A short context line saying where the sentence comes from (e.g. an Instagram post, a blog, a news headline)
3. The sentence in the target language
4. The question about its meaning or nuance
5. Provide exactly 3 MCQ options, one correct

Keep the whole message SHORT and focused on this single question. Do NOT preview or list the other questions. Do NOT use markdown headers (###). Use "label" as the key for option text.`,

    fill: `FILL-IN-THE-BLANK MODE: Give exactly ONE fill-in-the-blank exercise now. This is exercise 1 of 3 in a series.

Structure your message like this:
1. A brief one-line intro (only for exercise 1)
2. The ${L} translation of the full sentence
3. The sentence in the target language with a blank (use ______)
4. Ask the student to write the missing part

Keep it SHORT. Do NOT preview the other exercises. Do NOT use markdown headers (###). The student answers in the text field, so no MCQ options needed unless the choice is genuinely ambiguous.`
  };

  const sys = `You are a ${TL} language exercise designer. Speak in ${L}. Be clear and encouraging.
${TRANSLATION_RULE}

${context}
${modes[mode]}

Structures to practice:
${structs}

Return JSON: {"message": "your exercise content"} or {"message": "your exercise", "options": [{"label": "...", "correct": true/false}, ...]} if the exercise format includes MCQ. Always use "label" as the key for option text, and use boolean true/false for "correct".`;
  
  return parseJSON((await callAI(sys, `Generate the exercise now.`)).text);
}

async function continueExercise(cards, mode, lang, conv, wasCorrect, tlCode) {
  const L = lang === "fr" ? "French" : "English";
  const TL = getTargetLangName(tlCode, "en");
  const structs = cards.map((c) => `- ${c.korean}: ${lang === "fr" ? c.description_fr : c.description_en}`).join("\n");
  const hist = conv.map((m) => `${m.role === "ai" ? "Teacher" : "Student"}: ${m.content}${m.selected ? ` [chose: ${m.selected}]` : ""}`).join("\n");
  // Count how many questions have been asked so far
  const asked = conv.filter(m => m.role === "ai").length;
  const isLast = asked >= 3;

  const feedback = wasCorrect === true
    ? "The student answered CORRECTLY. Confirm briefly (1 sentence) and explain why in 1-2 sentences."
    : wasCorrect === false
      ? "The student answered INCORRECTLY. Say which answer was right and explain why in 2-3 sentences. Be encouraging."
      : "Evaluate the student's written answer. If correct, confirm and explain. If not, point out what to fix and give the correct form.";

  const next = isLast
    ? `This was the last question. After your feedback, wrap up with a short encouraging summary of how the session went (2-3 sentences). Do NOT ask another question, do NOT include options, and do NOT tell the student where to click or which tab to open: the app already shows them the buttons.`
    : mode === "qcm"
      ? `Then ask question ${asked + 1} of 3: a NEW multiple-choice question on one of the structures, with a short real-world context line, the sentence in ${TL}, the question, and exactly 3 options (one correct). Keep it short.`
      : `Then give exercise ${asked + 1} of 3: a NEW fill-in-the-blank with the ${L} translation, the ${TL} sentence with ______, and the instruction. Keep it short.`;

  const sys = `You are a ${TL} language exercise tutor. Speak in ${L}. Be warm and concise.
${TRANSLATION_RULE}

Structures being practiced:
${structs}

${feedback}

${next}

Do NOT use markdown headers (###). Return JSON: {"message": "your text"} or {"message": "your text", "options": [{"label": "a) ...", "correct": false}, ...]}. Always use "label" as the key for option text.`;

  return parseJSON((await callAI(sys, `Exercise conversation so far:\n${hist}`, 1200)).text);
}

async function genFeedKeywords(profile, lang, tlCode) {
  const TL = getTargetLangName(tlCode, "en");
  const p = profile || {};
  const bits = [
    p.interests, p.favMusic, p.favFilms, p.favSports,
    p.favFood, p.favBooks, p.favHobbies, p.dreamJobs, p.goals, p.dream,
  ].filter(Boolean).join(" | ");

  if (!bits) return [];

  const sys = `You turn a language learner's interests into search keywords for finding authentic ${TL} content online.

Given their interests, produce 8 search keywords WRITTEN IN ${TL.toUpperCase()} that would surface real blog posts, forum threads and articles a native speaker wrote.

Rules:
- Write every keyword in ${TL}, not in the learner's language
- Prefer natural search terms a native would type, not literal translations
- Mix specific (a named artist, a dish, a show) and broader topical terms
- Keep each keyword 1-4 words
- Avoid brand-new or obscure terms that would return nothing

Return JSON: {"keywords": ["...", "...", ...]}`;

  const r = await callAI(sys, `Learner interests: ${bits}`, 500, false);
  const parsed = parseJSON(r.text);
  return Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 8) : [];
}

async function fetchFeed(query, targetLang, category) {
  const res = await fetch("/api/feed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, targetLang, category }),
  });
  const raw = await res.text();
  let data;
  try { data = JSON.parse(raw); } catch { throw new Error("Réponse illisible: " + raw.substring(0, 150)); }
  if (!res.ok) throw new Error(data.error || raw.substring(0, 150));
  return data.items || [];
}

async function generateSummary(card, conv, lang) {
  const L = lang === "fr" ? "French" : "English";
  const hist = conv.map((m) => `${m.role === "ai" ? "Teacher" : "Student"}: ${m.content}${m.selected ? ` [chose: ${m.selected}]` : ""}`).join("\n");

  const sys = `You are an expert at analyzing language learning conversations. Read the full conversation, then produce TWO things:

1. A GRAMMAR RECAP for the student: a short, clear reference card they can re-read later. Write it in ${L}. Include:
   - What the structure means and when to use it (1-2 sentences)
   - 2-3 key example sentences from the lesson (target language sentence, then the ${L} translation wrapped in [[double square brackets]])
   - Common pitfalls or confusions to avoid (if any came up)
   - Related or derived structures mentioned (if any)
   Keep it concise and practical. No praise, no "you did well." Just the grammar facts.

2. TUTOR NOTES (internal, the student won't see these): detailed observations about the student's performance for future lesson personalization.

Also: extract any personal info the student shared about themselves.

Return JSON:
{
  "grammarRecap": "The student-facing grammar recap in ${L}, using line breaks for readability",
  "structuresLearned": "Internal: what the student demonstrated understanding of",
  "mistakesMade": "Internal: specific errors or confusions",
  "nextSteps": "Internal: what to work on next",
  "profileInsights": {
    "interests": "New interests mentioned. Empty string if none.",
    "level": "Level observations. Empty string if none.",
    "notes": "Other personal info. Empty string if none."
  },
  "derivedStructures": [
    {
      "korean": "pattern name",
      "type": "grammar or expression",
      "description_fr": "one sentence in French",
      "description_en": "one sentence in English",
      "example_kr": "example sentence",
      "example_fr": "French translation",
      "example_en": "English translation"
    }
  ]
}

For "derivedStructures": include any related patterns the TEACHER introduced. Empty array [] if none.`;

  return parseJSON((await callAI(sys, `Structure studied: ${card.korean}\n\nFull conversation:\n${hist}`, 1200)).text);
}

// =============================================
// STATUS HELPERS
// =============================================
// Migrate old statuses: "review" → "new", "acquired" stays
function migrateStatus(s) {
  if (s === "review") return "new";
  if (s === "acquired" || s === "studied" || s === "in_progress" || s === "new") return s;
  return "new";
}

function statusInfo(status, t) {
  const s = migrateStatus(status);
  switch (s) {
    case "new": return { label: t.statusNew, color: C.stNew, bg: C.stNewBg, border: C.stNewB };
    case "in_progress": return { label: t.statusInProgress, color: C.stProg, bg: C.stProgBg, border: C.stProgB };
    case "studied": return { label: t.statusStudied, color: C.stStudied, bg: C.stStudiedBg, border: C.stStudiedB };
    case "acquired": return { label: t.statusAcquired, color: C.stAcq, bg: C.stAcqBg, border: C.stAcqB };
    default: return { label: s, color: C.stNew, bg: C.stNewBg, border: C.stNewB };
  }
}

// =============================================
// COMPONENTS
// =============================================

// Lightweight inline markdown: **bold**, *italic*, `code`, ~~strike~~
// If the model returned JSON despite being asked for prose, flatten it to readable text
function flattenIfJSON(text) {
  const trimmed = (text || "").trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return text;
  let obj;
  try { obj = JSON.parse(trimmed); } catch { return text; }

  const lines = [];
  const walk = (val, depth) => {
    const pad = "  ".repeat(depth);
    if (val === null || val === undefined) return;
    if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
      lines.push(pad + String(val));
    } else if (Array.isArray(val)) {
      val.forEach(v => walk(v, depth));
    } else if (typeof val === "object") {
      Object.entries(val).forEach(([k, v]) => {
        if (v === null || v === undefined || v === "") return;
        const label = k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        if (typeof v === "object") {
          lines.push("");
          lines.push(pad + "**" + label + "**");
          walk(v, depth + 1);
        } else {
          lines.push(pad + "**" + label + "** : " + String(v));
        }
      });
    }
  };
  walk(obj, 0);
  const out = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return out || text;
}

function BlurredTranslation({ text, revealAll }) {
  const [shown, setShown] = useState(false);
  const visible = shown || revealAll;
  // When revealAll is on, render plain text so clicks pass through to any parent
  if (revealAll) return <span>{text}</span>;
  return (
    <span
      onClick={e => { e.stopPropagation(); setShown(!shown); }}
      title={visible ? "" : "Toucher pour afficher la traduction"}
      style={{
        cursor: "pointer",
        filter: visible ? "none" : "blur(4px)",
        opacity: visible ? 1 : 0.75,
        transition: "filter 0.18s, opacity 0.18s",
        userSelect: visible ? "auto" : "none",
        borderRadius: 3,
        background: visible ? "none" : "rgba(123,127,245,0.07)",
        padding: visible ? 0 : "0 2px",
        display: "inline",
      }}>
      {text}
    </span>
  );
}

function renderMarkdown(text, revealAll) {
  if (!text) return text;
  // Strip markdown headers (### Title -> Title) and horizontal rules (--- -> nothing)
  let clean = text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*---+\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const parts = [];
  // Handles: [[translation]], **bold**, *italic*, `code`, ~~strike~~
  const regex = /(\[\[([\s\S]+?)\]\]|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|~~(.+?)~~)/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(clean)) !== null) {
    if (match.index > lastIndex) {
      parts.push(clean.slice(lastIndex, match.index));
    }
    if (match[2] !== undefined) {
      // [[translation]] -> blurred until tapped
      parts.push(<BlurredTranslation key={match.index} text={match[2]} revealAll={revealAll} />);
    } else if (match[3] !== undefined) {
      parts.push(<strong key={match.index} style={{ fontWeight: 600 }}>{match[3]}</strong>);
    } else if (match[4] !== undefined) {
      parts.push(<em key={match.index}>{match[4]}</em>);
    } else if (match[5] !== undefined) {
      parts.push(<code key={match.index} style={{ background: "rgba(0,0,0,0.06)", padding: "1px 4px", borderRadius: 3, fontSize: "0.9em", fontFamily: "monospace" }}>{match[5]}</code>);
    } else if (match[6] !== undefined) {
      parts.push(<del key={match.index} style={{ opacity: 0.6 }}>{match[6]}</del>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < clean.length) {
    parts.push(clean.slice(lastIndex));
  }
  return parts.length > 0 ? parts : clean;
}

function Bubble({ msg, revealAll }) {
  const ai = msg.role === "ai";
  const [preSel, setPreSel] = useState(null);
  const confirmed = !!msg.selected;
  const canPick = ai && !confirmed && msg.options && msg.onSelect;

  return (
    <div style={{ display: "flex", gap: 7, alignSelf: ai ? "flex-start" : "flex-end", flexDirection: ai ? "row" : "row-reverse", maxWidth: ai ? "92%" : "80%" }}>
      <div style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0, background: C.s1, border: `1px solid ${C.border}`, color: C.txtM }}>
        {ai ? "✦" : "🧑"}
      </div>
      <div style={{ padding: "9px 12px", borderRadius: ai ? "2px 12px 12px 12px" : "12px 2px 12px 12px", fontSize: 12.5, lineHeight: 1.7, whiteSpace: "pre-wrap", background: ai ? C.s2 : C.acc, border: ai ? `1px solid ${C.border}` : "none", color: ai ? C.txt : C.onAcc }}>
        {msg.degraded && (
          <div style={{ marginBottom: 8, padding: "6px 9px", background: C.warnBg, border: `1px solid ${C.warnB}`, borderRadius: 6, fontSize: 10.5, color: C.warn, lineHeight: 1.5 }}>
            ⚠️ Quota de recherche web atteint pour aujourd'hui. Réponse générée sans sources en ligne.
          </div>
        )}
        {ai ? renderMarkdown(msg.content, revealAll) : msg.content}
        {msg.sources && msg.sources.length > 0 && (
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.txtM, textTransform: "uppercase", marginBottom: 5 }}>Sources</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {msg.sources.map((s, i) => (
                <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 11, color: C.acc, textDecoration: "none", display: "flex", alignItems: "center", gap: 4, lineHeight: 1.4 }}>
                  <span style={{ flexShrink: 0 }}>🔗</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</span>
                </a>
              ))}
            </div>
          </div>
        )}
        {msg.retry && (
          <button onClick={msg.retry}
            style={{ display: "block", marginTop: 6, padding: "4px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.s1, color: C.acc, fontSize: 11, fontFamily: "'Plus Jakarta Sans'", cursor: "pointer", fontWeight: 500 }}>
            🔄 {msg.role === "ai" ? "Réessayer" : "Retry"}
          </button>
        )}
        {msg.options && (
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 8 }}>
            {msg.options.map((o, i) => {
              const oLabel = o.label || o.text || String(o);
              const oCorrect = (o.correct === true || o.correct === "true");
              const sel = msg.selected === oLabel;
              const showOk = confirmed && oCorrect;
              const bad = sel && !oCorrect;
              const isPre = !confirmed && preSel === oLabel;
              return (
                <button key={i}
                  onClick={() => { if (canPick) setPreSel(isPre ? null : oLabel); }}
                  disabled={confirmed}
                  style={{
                    background: showOk ? C.okBg : bad ? C.warnBg : isPre ? C.accBg : C.s1,
                    border: `1px solid ${showOk ? C.okB : bad ? C.warnB : isPre ? C.acc : C.border}`,
                    borderRadius: 6, padding: "6px 10px", fontSize: 12,
                    color: showOk ? C.ok : bad ? C.warn : isPre ? C.acc : C.txt,
                    cursor: confirmed ? "default" : "pointer",
                    fontFamily: "'Plus Jakarta Sans'", textAlign: "left",
                    fontWeight: isPre ? 500 : 400,
                    opacity: confirmed && !sel && !showOk ? 0.4 : 1,
                  }}>
                  {renderMarkdown(oLabel.replace(/\[\[([\s\S]+?)\]\]/g, "$1"), true)}
                </button>
              );
            })}
            {canPick && preSel && (
              <button
                onClick={() => {
                  const opt = msg.options.find(o => (o.label || o.text || String(o)) === preSel);
                  if (opt) msg.onSelect({ ...opt, label: preSel, correct: (opt.correct === true || opt.correct === "true") });
                }}
                style={{ alignSelf: "flex-end", padding: "4px 14px", borderRadius: 6, background: C.acc, color: C.onAcc, border: "none", fontFamily: "'Plus Jakarta Sans'", fontSize: 11, fontWeight: 500, cursor: "pointer", marginTop: 2 }}>
                Valider ✓
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function GrammarCard({ card, t, onToggle, onReview }) {
  const si = statusInfo(card.status, t);
  const canToggle = card.status === "studied" || card.status === "acquired";
  return (
    <div onClick={onReview}
      style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, position: "relative", overflow: "hidden", cursor: "pointer", transition: "transform 0.12s, box-shadow 0.12s" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
      <div style={{ position: "absolute", bottom: -12, right: -3, fontFamily: "'Noto Sans KR', sans-serif", fontSize: 72, fontWeight: 500, color: C.acc, opacity: 0.07, lineHeight: 1, pointerEvents: "none", userSelect: "none" }}>
        {card.korean.replace(/[~()]/g, "").slice(0, 2)}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 7px", borderRadius: 4, background: card.type === "grammar" ? C.accBg : C.proBg, color: card.type === "grammar" ? C.acc : C.pro }}>{card.type === "grammar" ? t.grammar : t.expression}</span>
        <button onClick={e => { e.stopPropagation(); if (canToggle) onToggle(); }}
          style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 7px", borderRadius: 10, fontSize: 10, cursor: canToggle ? "pointer" : "default", border: "none", background: si.bg, color: si.color, fontFamily: "'Plus Jakarta Sans'" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: si.color }} />
          {si.label}
        </button>
        {(card.reviewCount || 0) > 0 && (
          <span style={{ fontSize: 9, color: C.txtM }}>({t.reviewCount(card.reviewCount)})</span>
        )}
        <span style={{ fontSize: 11, color: C.txtM, marginLeft: "auto" }}>{card.date}</span>
      </div>
      <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 17, color: C.txt, marginBottom: 3 }}>{card.korean}</div>
      <div style={{ fontSize: 11.5, color: C.txtS, lineHeight: 1.5, marginBottom: 8 }}>{card.description}</div>
      <div style={{ background: C.s1, borderRadius: 6, padding: "7px 9px", marginBottom: 8 }}>
        <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 12.5, color: C.txt }}>{card.example_kr}</div>
        <div style={{ fontSize: 11, color: C.txtM, fontStyle: "italic", marginTop: 2 }}>{card.example_tr}</div>
      </div>
      {card.parentKorean && (
        <div style={{ fontSize: 10, color: C.acc, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ opacity: 0.6 }}>↳</span> {t.derivedFrom} <span style={{ fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 500 }}>{card.parentKorean}</span>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: C.txtM }}>{card.source || ""}</span>
        {(card.status === "new" || card.status === "review" || card.status === "studied") && (
          <button onClick={e => { e.stopPropagation(); onReview(); }}
            style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, fontFamily: "'Plus Jakarta Sans'", fontSize: 11, cursor: "pointer", border: `1px solid ${si.border}`, background: "#ffffff", color: si.color }}>
            {card.status === "new" || card.status === "review" ? t.startLesson : t.reviewBtn}
          </button>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ summary, t, lang }) {
  const [open, setOpen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const hasRecap = summary.grammarRecap && summary.grammarRecap.length > 0;
  const hasTutorNotes = summary.structuresLearned || summary.mistakesMade || summary.nextSteps;
  return (
    <div style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", textAlign: "left" }}>
        <span style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 14, color: C.txt, fontWeight: 500 }}>{summary.cardKorean}</span>
        <span style={{ fontSize: 11, color: C.txtM, marginLeft: "auto", flexShrink: 0 }}>{summary.date}</span>
        <span style={{ fontSize: 10, color: C.txtM, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: "0 14px 12px" }}>
          {hasRecap ? (
            <div style={{ fontSize: 12.5, color: C.txt, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
              {renderMarkdown(summary.grammarRecap, false)}
            </div>
          ) : hasTutorNotes ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.ok, textTransform: "uppercase", marginBottom: 3 }}>{t.summaryLearned}</div>
                <div style={{ fontSize: 12, color: C.txt, lineHeight: 1.6 }}>{summary.structuresLearned}</div>
              </div>
              {summary.mistakesMade && <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.warn, textTransform: "uppercase", marginBottom: 3 }}>{t.summaryMistakes}</div>
                <div style={{ fontSize: 12, color: C.txt, lineHeight: 1.6 }}>{summary.mistakesMade}</div>
              </div>}
              {summary.nextSteps && <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.acc, textTransform: "uppercase", marginBottom: 3 }}>{t.summaryNext}</div>
                <div style={{ fontSize: 12, color: C.txt, lineHeight: 1.6 }}>{summary.nextSteps}</div>
              </div>}
            </div>
          ) : null}
          {hasRecap && hasTutorNotes && (
            <div style={{ marginTop: 10 }}>
              <button onClick={() => setShowNotes(!showNotes)}
                style={{ fontSize: 10, color: C.txtM, background: "none", border: "none", cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", padding: 0, textDecoration: "underline" }}>
                {showNotes ? (lang === "fr" ? "Masquer les notes du tuteur" : "Hide tutor notes") : (lang === "fr" ? "Notes du tuteur" : "Tutor notes")}
              </button>
              {showNotes && (
                <div style={{ marginTop: 8, padding: "8px 10px", background: C.s1, borderRadius: 6, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div><span style={{ fontSize: 10, fontWeight: 600, color: C.ok }}>{t.summaryLearned} : </span><span style={{ fontSize: 11, color: C.txtS }}>{summary.structuresLearned}</span></div>
                  {summary.mistakesMade && <div><span style={{ fontSize: 10, fontWeight: 600, color: C.warn }}>{t.summaryMistakes} : </span><span style={{ fontSize: 11, color: C.txtS }}>{summary.mistakesMade}</span></div>}
                  {summary.nextSteps && <div><span style={{ fontSize: 10, fontWeight: 600, color: C.acc }}>{t.summaryNext} : </span><span style={{ fontSize: 11, color: C.txtS }}>{summary.nextSteps}</span></div>}
                </div>
              )}
            </div>
          )}
          {summary.conversationLength && (
            <div style={{ fontSize: 10, color: C.txtM, marginTop: 8 }}>{summary.conversationLength} messages</div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================
// TREE VIEW (knowledge graph)
// =============================================
function TreeView({ cards, t, onToggle, onReview }) {
  const cardMap = {};
  const childrenMap = {};
  const roots = [];

  cards.forEach(c => { cardMap[c.id] = c; });
  cards.forEach(c => {
    if (c.parentId && cardMap[c.parentId]) {
      if (!childrenMap[c.parentId]) childrenMap[c.parentId] = [];
      childrenMap[c.parentId].push(c);
    } else {
      roots.push(c);
    }
  });

  const renderNode = (card, depth) => {
    const children = childrenMap[card.id] || [];
    const si = statusInfo(card.status, t);
    return (
      <div key={card.id}>
        <div style={{ display: "flex", alignItems: "stretch", marginLeft: depth * 28 }}>
          {depth > 0 && (
            <div style={{ width: 22, display: "flex", alignItems: "center", flexShrink: 0, position: "relative" }}>
              <div style={{ position: "absolute", top: 0, bottom: "50%", left: 0, borderLeft: `2px solid ${C.acc}33`, borderBottom: `2px solid ${C.acc}33`, borderBottomLeftRadius: 8, width: 14 }} />
            </div>
          )}
          <button onClick={() => onReview(card)}
            style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", margin: "3px 0", background: C.s2, border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", textAlign: "left", transition: "border-color 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.acc; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: si.color, flexShrink: 0 }} />
            <span style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 14, color: C.txt, fontWeight: 500 }}>{card.korean}</span>
            <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 3, background: card.type === "grammar" ? C.accBg : C.proBg, color: card.type === "grammar" ? C.acc : C.pro, flexShrink: 0 }}>
              {card.type === "grammar" ? t.grammar : t.expression}
            </span>
            {children.length > 0 && (
              <span style={{ fontSize: 10, color: C.txtM, marginLeft: "auto", flexShrink: 0 }}>{t.childCount(children.length)}</span>
            )}
            <button onClick={e => { e.stopPropagation(); onToggle(card.id); }}
              style={{ fontSize: 10, padding: "2px 6px", borderRadius: 8, border: "none", background: si.bg, color: si.color, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", flexShrink: 0 }}>
              {si.label}
            </button>
          </button>
        </div>
        {children.map(child => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div style={{ padding: "14px 16px" }}>
      {roots.map(r => renderNode(r, 0))}
    </div>
  );
}

// =============================================
// MAIN APP
// =============================================
function AppInner() {
  const [data, setData] = useState(DEFAULT_DATA);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("library");
  const [libView, setLibView] = useState("grid");
  const [langOpen, setLangOpen] = useState(false);
  const [targetLang, setTargetLang] = useState(null); // "ko", "de", etc.
  const [tlOpen, setTlOpen] = useState(false);
  const [syncId, setSyncId] = useState(() => localStorage.getItem("moa-sync-id") || "");
  const [syncInput, setSyncInput] = useState("");
  const [welcomeMode, setWelcomeMode] = useState(null); // null | "login" | "create"
  const [showSync, setShowSync] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null); // null | "loading" | "success" | "error"

  // Import
  const [impText, setImpText] = useState("");
  const [impStep, setImpStep] = useState("input");
  const [found, setFound] = useState([]);
  const [selPick, setSelPick] = useState(0);
  const [known, setKnown] = useState(new Set());

  // Lesson
  const [lCard, setLCard] = useState(null);
  const [lArticle, setLArticle] = useState(null);
  const [conv, setConv] = useState([]);
  const [lLoad, setLLoad] = useState(false);
  const [searching, setSearching] = useState(false);
  const [revealTr, setRevealTr] = useState(() => localStorage.getItem("moa-reveal-tr") === "1");
  const [kbOpen, setKbOpen] = useState(false);
  const [inp, setInp] = useState("");
  const [tray, setTray] = useState(false);
  const [lessonDone, setLessonDone] = useState(false);
  const [lessonSummary, setLessonSummary] = useState(null);
  const [lessonRestored, setLessonRestored] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const [recapCard, setRecapCard] = useState(null);
  const [recapConv, setRecapConv] = useState([]);
  const [recapLoad, setRecapLoad] = useState(false);
  const [recapInp, setRecapInp] = useState("");
  const [recapMode, setRecapMode] = useState(null); // null | "examples" | "realExamples" | "resources" | "exercise"

  // Exercise
  const [exMode, setExMode] = useState("story");
  const [exSel, setExSel] = useState(new Set());
  const [exConv, setExConv] = useState([]);
  const [exLoad, setExLoad] = useState(false);
  const [exInp, setExInp] = useState("");
  const [exOn, setExOn] = useState(false);
  const [exDone, setExDone] = useState(false);

  // Profile
  const [profileDraft, setProfileDraft] = useState(null);
  const [profileSavedMsg, setProfileSavedMsg] = useState(false);
  const [onbStep, setOnbStep] = useState(0);
  const [onbDraft, setOnbDraft] = useState({ gender: "", age: "", nationality: "", spokenLanguages: "", dream: "" });
  const [showDetailed, setShowDetailed] = useState(false);
  const [pointsToast, setPointsToast] = useState(null);

  // Feed
  const [feedItems, setFeedItems] = useState([]);
  const [feedLoad, setFeedLoad] = useState(false);
  const [feedErr, setFeedErr] = useState(null);
  const [feedQuery, setFeedQuery] = useState("");
  const [feedInput, setFeedInput] = useState("");
  const [feedCat, setFeedCat] = useState("blog");
  const [feedKwLoad, setFeedKwLoad] = useState(false);

  const msgsR = useRef(null);
  const exR = useRef(null);
  const lastMsgRef = useRef(null);
  const lastExMsgRef = useRef(null);
  const recapR = useRef(null);
  const lastRecapMsgRef = useRef(null);

  const lang = data.lang || "fr";
  const t = T[lang];
  const enabledTLs = data.targetLangs || [];
  const tl = targetLang || data.lastTargetLang || enabledTLs[0] || null;
  const tlConf = tl ? TARGET_LANGS[tl] : null;
  const tFont = tl ? getTargetFont(tl) : "'Plus Jakarta Sans'";
  const TLName = tl ? getTargetLangName(tl, lang) : "";

  // Filter cards by current target language, sorted by status priority
  const allCards = data.cards || [];
  const filteredCards = useMemo(() => {
    const base = tl ? allCards.filter(c => (c.targetLang || "ko") === tl) : allCards;
    const order = { in_progress: 0, new: 1, review: 1, studied: 2, acquired: 3 };
    return [...base].sort((a, b) => {
      const oa = order[migrateStatus(a.status)] ?? 4;
      const ob = order[migrateStatus(b.status)] ?? 4;
      return oa - ob;
    });
  }, [allCards, tl]);
  const revCount = filteredCards.filter(c => c.status === "new" || c.status === "review" || c.status === "in_progress").length;
  const studiedCount = filteredCards.filter(c => c.status === "studied").length;
  const acqCount = filteredCards.filter(c => c.status === "acquired").length;
  const exerciseCards = useMemo(() => filteredCards.filter(c => c.status === "studied" || c.status === "acquired"), [filteredCards]);
  const context = useMemo(() => buildContext(data, lang), [data, lang]);

  // Load
  useEffect(() => {
    loadData(syncId).then(d => {
      const loaded = d || DEFAULT_DATA;
      setData(loaded);
      if (loaded.lastTargetLang) setTargetLang(loaded.lastTargetLang);
      else if (loaded.targetLangs?.length) setTargetLang(loaded.targetLangs[0]);
      setLoaded(true);
    });
  }, [syncId]);

  // Restore active lesson from localStorage on first load
  useEffect(() => {
    if (!loaded || lessonRestored) return;
    setLessonRestored(true);
    try {
      const raw = localStorage.getItem("moa-active-lesson");
      if (!raw) return;
      const saved = JSON.parse(raw);
      // Only restore if the lesson belongs to the current account
      if (saved && saved.card && saved.conv && saved.conv.length > 0 && (!saved.syncId || saved.syncId === syncId)) {
        setLCard(saved.card);
        setLArticle(saved.article || "");
        setConv(saved.conv.map(m => ({ ...m, options: m.options || null })));
        setLessonDone(saved.lessonDone || false);
        setLessonSummary(saved.lessonSummary && !saved.lessonSummary.error ? saved.lessonSummary : null);
        setView("lesson");
      } else {
        // Lesson belongs to a different account, discard it
        localStorage.removeItem("moa-active-lesson");
      }
    } catch (e) { console.error("Failed to restore lesson:", e); }
  }, [loaded, lessonRestored, syncId]);

  // Persist active lesson to localStorage whenever conversation changes
  useEffect(() => {
    if (!lessonRestored) return; // don't save during initial restore or after disconnect
    if (!syncId) { localStorage.removeItem("moa-active-lesson"); return; } // no account = no persistence
    if (lCard && conv.length > 0) {
      try {
        localStorage.setItem("moa-active-lesson", JSON.stringify({
          card: lCard, article: lArticle, syncId: syncId,
          conv: conv.map(m => ({ role: m.role, content: m.content, options: m.options || null, selected: m.selected || null, sources: m.sources || null, degraded: m.degraded || false })),
          lessonDone, lessonSummary,
        }));
      } catch (e) { console.error("Failed to save lesson:", e); }
    } else if (!lCard) {
      localStorage.removeItem("moa-active-lesson");
    }
  }, [conv, lCard, lArticle, lessonDone, lessonSummary, lessonRestored, syncId]);

  // Init profile draft when data loads or view switches to profile
  useEffect(() => {
    if (view === "profile") {
      setProfileDraft({ ...(data.profile || DEFAULT_PROFILE) });
      setProfileSavedMsg(false);
    }
  }, [view, data.profile]);

  // Scroll to start of last message
  useEffect(() => {
    if (lastMsgRef.current) {
      lastMsgRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [conv]);
  useEffect(() => {
    if (lastExMsgRef.current) {
      lastExMsgRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [exConv]);
  useEffect(() => {
    if (lastRecapMsgRef.current) {
      lastRecapMsgRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [recapConv]);

  // Reset exercise only when entering the exercise tab or switching target language
  useEffect(() => {
    if (view === "exercise") {
      setExSel(new Set(exerciseCards.map(c => c.id)));
      setExOn(false);
      setExConv([]);
      setExDone(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, tl]);

  // Keep the app sized to the visible viewport so the on-screen keyboard
  // shrinks the app instead of pushing content off-screen.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      if (window.innerWidth >= 700) {
        document.documentElement.style.removeProperty("--app-h");
        setKbOpen(false);
        return;
      }
      const h = vv.height;
      document.documentElement.style.setProperty("--app-h", h + "px");
      setKbOpen(window.innerHeight - h > 150);
    };
    onResize();
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
    };
  }, []);

  // When the keyboard opens mid-exercise, re-anchor to the last message
  useEffect(() => {
    if (!kbOpen) return;
    const el = lastExMsgRef.current || lastMsgRef.current || lastRecapMsgRef.current;
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    }
  }, [kbOpen]);

  const save = useCallback((nd) => { setData(nd); saveData(nd, syncId); }, [syncId]);

  const handleSync = async () => {
    const id = syncInput.trim();
    if (!id) return;
    setSyncStatus("loading");
    try {
      const result = welcomeMode === "login" ? await connectData(id) : await syncData(id, null);
      if (!result.ok) {
        console.error("Sync failed:", result.error);
        setSyncStatus("error");
        return;
      }
      // Clear any stale active lesson
      localStorage.removeItem("moa-active-lesson");
      // Reset lesson state completely
      setLCard(null); setConv([]); setLessonDone(false); setLessonSummary(null);
      setShowRecap(false); setRecapCard(null);
      setLessonRestored(false);
      // Save the id and load the data
      localStorage.setItem("moa-sync-id", id);
      setSyncId(id);
      setData(result.data);
      // Set target lang from loaded data
      if (result.data.lastTargetLang) setTargetLang(result.data.lastTargetLang);
      else if (result.data.targetLangs?.length) setTargetLang(result.data.targetLangs[0]);
      else setTargetLang(null);
      setSyncStatus("success");
      setTimeout(() => { setSyncStatus(null); setShowSync(false); }, 1500);
    } catch (e) {
      console.error("Sync error:", e);
      setSyncStatus("error");
    }
  };

  const handleDisconnect = () => {
    // Clear sync id
    localStorage.removeItem("moa-sync-id");
    // Clear persisted data and active lesson
    localStorage.removeItem("moa-app-data");
    localStorage.removeItem("moa-active-lesson");
    // Reset all state
    setSyncId("");
    setSyncInput("");
    setSyncStatus(null);
    setData(DEFAULT_DATA);
    setTargetLang(null);
    setLCard(null);
    setConv([]);
    setLessonDone(false);
    setLessonSummary(null);
    setShowRecap(false);
    setRecapCard(null);
    setLessonRestored(false);
    setView("library");
    setFound([]);
    setImpStep("input");
    setImpText("");
  };

  const switchTargetLang = (code) => {
    setTargetLang(code);
    save({ ...data, lastTargetLang: code });
    setTlOpen(false);
  };

  const addTargetLang = (code) => {
    const newTLs = [...new Set([...(data.targetLangs || []), code])];
    setTargetLang(code);
    save({ ...data, targetLangs: newTLs, lastTargetLang: code });
    setTlOpen(false);
  };

  // ---- FEED ----
  const feedKeywords = (data.feedKeywords && data.feedKeywords[tl]) || [];

  const loadFeed = useCallback(async (query, category) => {
    if (!query) return;
    setFeedLoad(true); setFeedErr(null);
    try {
      const items = await fetchFeed(query, tl, category || feedCat);
      setFeedItems(items);
      setFeedQuery(query);
    } catch (e) {
      console.error("feed error:", e);
      setFeedErr(e.message);
      setFeedItems([]);
    }
    setFeedLoad(false);
  }, [tl, feedCat]);

  const ensureKeywords = async () => {
    if (feedKeywords.length > 0) return feedKeywords;
    setFeedKwLoad(true);
    try {
      const kws = await genFeedKeywords(data.profile, lang, tl);
      if (kws.length) {
        save({ ...data, feedKeywords: { ...(data.feedKeywords || {}), [tl]: kws } });
      }
      setFeedKwLoad(false);
      return kws;
    } catch (e) {
      console.error("keyword gen error:", e);
      setFeedKwLoad(false);
      return [];
    }
  };

  // Auto-load feed when entering the tab
  useEffect(() => {
    if (view !== "feed" || feedItems.length > 0 || feedLoad || feedKwLoad) return;
    (async () => {
      const kws = await ensureKeywords();
      if (kws.length) {
        const pick = kws[Math.floor(Math.random() * kws.length)];
        loadFeed(pick, feedCat);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, tl]);

  // ---- POINTS ----
  const awardPoints = (n, dataOverride) => {
    const base = dataOverride || data;
    const cur = base.profile?.points || 0;
    const next = { ...base, profile: { ...(base.profile || DEFAULT_PROFILE), points: cur + n } };
    setPointsToast(n);
    setTimeout(() => setPointsToast(null), 2500);
    return next;
  };

  // ---- ONBOARDING ----
  const finishOnboarding = (skip) => {
    let nd = {
      ...data,
      profile: {
        ...(data.profile || DEFAULT_PROFILE),
        ...(skip ? {} : onbDraft),
        onboarded: true,
      },
    };
    if (!skip) nd = awardPoints(50, nd);
    save(nd);
    setOnbStep(0);
  };

  // ---- PROFILE ----
  const saveProfile = () => {
    if (!profileDraft) return;
    save({ ...data, profile: { ...profileDraft } });
    setProfileSavedMsg(true);
    setTimeout(() => setProfileSavedMsg(false), 2000);
  };

  // ---- IMPORT ----
  const doAnalyze = async () => {
    if (!impText.trim()) return;
    setImpStep("scanning");
    try {
      setFound(await analyzeText(impText, data.cards, lang, context, tl));
      setSelPick(0); setKnown(new Set()); setImpStep("picks");
    } catch (e) { console.error(e); alert(e.message); setImpStep("input"); }
  };

  const markKnown = (i) => {
    const p = found[i], nk = new Set(known);
    if (nk.has(i)) { nk.delete(i); save({ ...data, cards: data.cards.filter(c => c.korean !== p.korean) }); }
    else {
      nk.add(i);
      if (!data.cards.find(c => c.korean === p.korean)) {
        save({ ...data, cards: [...data.cards, makeCard(p, "acquired")] });
      }
    }
    setKnown(nk);
  };

  const makeCard = (p, status) => ({
    id: Date.now().toString() + Math.random().toString(36).slice(2, 5),
    korean: p.korean, type: p.type,
    description: lang === "fr" ? p.description_fr : p.description_en,
    description_fr: p.description_fr, description_en: p.description_en,
    example_kr: p.example_kr,
    example_tr: lang === "fr" ? p.example_fr : p.example_en,
    status, source: "Import", articleText: impText, reviewCount: 0,
    targetLang: tl || "ko",
    date: new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { day: "numeric", month: "short" }),
  });

  // ---- LESSON ----
  const beginLesson = async (point, art) => {
    const p = point || found[selPick]; const text = art || impText;
    if (!p) return;
    const card = makeCard(p, "in_progress");
    // Set card to in_progress (or create it)
    const existing = data.cards.find(c => c.korean === p.korean);
    if (existing) {
      save({ ...data, cards: data.cards.map(c => c.korean === p.korean ? { ...c, status: c.status === "new" || c.status === "review" ? "in_progress" : c.status } : c) });
    } else {
      save({ ...data, cards: [...data.cards, card] });
    }
    setLCard(existing || card); setLArticle(text); setConv([]); setLLoad(true); setView("lesson");
    setLessonDone(false); setLessonSummary(null); setShowRecap(false); setRecapCard(null);
    try { const r = await startSocratic(card, text, lang, context, tl); setConv([{ role: "ai", content: r.message, options: r.options, selected: null }]); }
    catch (e) {
      console.error("startSocratic error:", e);
      setConv([{
        role: "ai",
        content: `⚠️ ${lang === "fr" ? "L'IA n'a pas pu démarrer la leçon" : "AI couldn't start the lesson"}${e?.message ? `\n\n${e.message.substring(0, 150)}` : ""}`,
        retry: () => beginLesson(point, art),
      }]);
    }
    setLLoad(false);
  };

  const reviewCard = (c) => {
    const effectiveStatus = migrateStatus(c.status);
    // Check if this card has any past summaries
    const cardSummaries = (data.summaries || []).filter(s => s.cardKorean === c.korean);
    if (cardSummaries.length > 0 && effectiveStatus !== "new") {
      // Show recap screen instead of starting lesson directly
      setRecapCard(c);
      setShowRecap(true);
      setRecapConv([]); setRecapMode(null); setRecapInp("");
      setLCard(null); setConv([]); setLessonDone(false); setLessonSummary(null);
      setView("lesson");
      return;
    }
    // No summaries or brand new card: start lesson directly
    startLessonFromCard(c);
  };

  const startLessonFromCard = (c) => {
    setShowRecap(false); setRecapCard(null); setRecapConv([]); setRecapMode(null);
    beginLesson({
      korean: c.korean, type: c.type, description_fr: c.description_fr || c.description, description_en: c.description_en || c.description,
      example_kr: c.example_kr, example_fr: c.example_tr, example_en: c.example_tr,
    }, c.articleText || "");
  };

  // ---- RECAP QUICK PRACTICE ----
  const startRecapAction = async (action) => {
    if (!recapCard) return;
    setRecapMode(action);
    setRecapConv([]);
    setRecapLoad(true);
    const labels = { examples: t.moreExamples, realExamples: t.realExamples, resources: t.onlineRes, exercise: t.anExercise };
    const u = [{ role: "user", content: labels[action] || action }];
    setRecapConv(u);
    try {
      if (action === "resources" || action === "realExamples") {
        setSearching(true);
        const r = action === "resources"
          ? await findResources(recapCard, lang, tl)
          : await findRealExamples(recapCard, lang, tl, data.profile?.interests || "");
        setSearching(false);
        setRecapConv([...u, { role: "ai", content: r.text, sources: r.sources, degraded: r.degraded, options: null, selected: null }]);
      } else {
        const r = await continueChat(recapCard, u, action, lang);
        setRecapConv([...u, { role: "ai", content: r.message, options: r.options || null, selected: null }]);
      }
    } catch (e) {
      setSearching(false);
      console.error("recap action error:", e);
      setRecapConv([...u, aiError(e, () => startRecapAction(action))]);
    }
    setRecapLoad(false);
  };

  const recapPickOpt = async (i, opt) => {
    const isRight = (opt.correct === true || opt.correct === "true");
    const nc = [...recapConv]; nc[i] = { ...nc[i], selected: opt.label };
    const u = [...nc, { role: "user", content: opt.label }]; setRecapConv(u); setRecapLoad(true);
    try {
      const r = await continueChat(recapCard, u, isRight ? "correct" : "incorrect, explain", lang);
      setRecapConv([...u, { role: "ai", content: r.message, options: r.options || null, selected: null }]);
    } catch (e) { console.error(e); setRecapConv([...u, aiError(e)]); }
    setRecapLoad(false);
  };

  const recapSend = async () => {
    if (!recapInp.trim()) return; const m = recapInp.trim(); setRecapInp(""); setRecapLoad(true);
    const u = [...recapConv, { role: "user", content: m }]; setRecapConv(u);
    try {
      const r = await continueChat(recapCard, u, m, lang);
      setRecapConv([...u, { role: "ai", content: r.message, options: r.options || null, selected: null }]);
    } catch (e) { console.error(e); setRecapConv([...u, aiError(e)]); }
    setRecapLoad(false);
  };

  // ---- END LESSON ----
  const endLesson = async () => {
    if (!lCard || conv.length < 2) return;
    setLLoad(true); setLessonDone(true);
    try {
      const result = await generateSummary(lCard, conv, lang);
      const summary = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 5),
        cardKorean: lCard.korean,
        grammarRecap: result.grammarRecap || "",
        structuresLearned: result.structuresLearned || "",
        mistakesMade: result.mistakesMade || "",
        nextSteps: result.nextSteps || "",
        date: new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { day: "numeric", month: "short", year: "numeric" }),
        conversationLength: conv.length,
      };
      setLessonSummary(summary);
      // Merge profile insights from lesson into existing profile
      const insights = result.profileInsights || {};
      const currentProfile = { ...(data.profile || DEFAULT_PROFILE) };
      if (insights.interests) {
        currentProfile.interests = currentProfile.interests
          ? currentProfile.interests + "\n" + insights.interests
          : insights.interests;
      }
      if (insights.level) {
        currentProfile.level = currentProfile.level
          ? currentProfile.level + " | " + summary.date + ": " + insights.level
          : insights.level;
      }
      if (insights.notes) {
        currentProfile.notes = currentProfile.notes
          ? currentProfile.notes + "\n" + insights.notes
          : insights.notes;
      }
      // Create derived cards with parent link
      const derived = (result.derivedStructures || []);
      const newDerivedCards = derived
        .filter(d => d.korean && !data.cards.find(c => c.korean === d.korean))
        .map(d => ({
          id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
          korean: d.korean, type: d.type || "expression",
          description: lang === "fr" ? d.description_fr : d.description_en,
          description_fr: d.description_fr, description_en: d.description_en,
          example_kr: d.example_kr || "",
          example_tr: lang === "fr" ? d.example_fr : d.example_en,
          status: "review", source: "Derived",
          parentId: lCard.id, parentKorean: lCard.korean,
          targetLang: tl || "ko",
          articleText: "",
          date: new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { day: "numeric", month: "short" }),
        }));
      // Update card status: new/in_progress -> studied, studied -> studied (increment reviewCount), acquired stays acquired
      const wasFirstTime = (data.cards.find(c => c.korean === lCard.korean)?.reviewCount || 0) === 0;
      const updatedCards = data.cards.map(c => {
        if (c.korean !== lCard.korean) return c;
        const rc = (c.reviewCount || 0) + 1;
        if (c.status === "acquired") return { ...c, reviewCount: rc };
        return { ...c, status: "studied", reviewCount: rc };
      });
      const gain = wasFirstTime ? 20 : 10;
      const withPoints = { ...currentProfile, points: (currentProfile.points || 0) + gain };
      setPointsToast(gain);
      setTimeout(() => setPointsToast(null), 2500);
      save({ ...data, cards: [...updatedCards, ...newDerivedCards], summaries: [...(data.summaries || []), summary], profile: withPoints });
    } catch (e) {
      console.error("Summary generation error:", e);
      // Still mark the card as studied even if summary generation failed
      const updatedCards = data.cards.map(c => {
        if (c.korean !== lCard.korean) return c;
        const rc = (c.reviewCount || 0) + 1;
        if (c.status === "acquired") return { ...c, reviewCount: rc };
        return { ...c, status: "studied", reviewCount: rc };
      });
      save({ ...data, cards: updatedCards });
      setLessonSummary({
        cardKorean: lCard.korean,
        structuresLearned: "",
        mistakesMade: "",
        nextSteps: "",
        date: "",
        conversationLength: conv.length,
        error: e?.message || "Unknown error",
      });
    }
    setLLoad(false);
  };

  const aiError = (e, retryFn) => ({
    role: "ai",
    content: `⚠️ ${lang === "fr" ? "L'IA n'a pas répondu" : "AI didn't respond"}${e?.message ? ` (${e.message.substring(0, 100)})` : ""}`,
    retry: retryFn || null,
  });

  const pickOpt = async (i, opt) => {
    const isRight = (opt.correct === true || opt.correct === "true");
    const nc = [...conv]; nc[i] = { ...nc[i], selected: opt.label };
    const u = [...nc, { role: "user", content: opt.label }]; setConv(u); setLLoad(true);
    try { const r = await continueChat(lCard, u, isRight ? "correct" : "incorrect, explain", lang); setConv([...u, { role: "ai", content: r.message, options: r.options || null, selected: null }]); }
    catch (e) { console.error("pickOpt error:", e); setConv([...u, aiError(e, () => pickOpt(i, opt))]); }
    setLLoad(false);
  };

  const quickAct = async (a) => {
    setTray(false); setLLoad(true);
    const labels = { resources: t.onlineRes, realExamples: t.realExamples };
    const u = [...conv, { role: "user", content: labels[a] || a }]; setConv(u);
    try {
      if (a === "resources" || a === "realExamples") {
        setSearching(true);
        const r = a === "resources"
          ? await findResources(lCard, lang, tl)
          : await findRealExamples(lCard, lang, tl, data.profile?.interests || "");
        setSearching(false);
        setConv([...u, { role: "ai", content: r.text, sources: r.sources, degraded: r.degraded, options: null, selected: null }]);
      } else {
        const r = await continueChat(lCard, u, a, lang);
        setConv([...u, { role: "ai", content: r.message, options: r.options || null, selected: null }]);
      }
    }
    catch (e) { setSearching(false); console.error("quickAct error:", e); setConv([...u, aiError(e, () => quickAct(a))]); }
    setLLoad(false);
  };

  const sendMsg = async () => {
    if (!inp.trim()) return; const m = inp.trim(); setInp(""); setLLoad(true);
    const u = [...conv, { role: "user", content: m }]; setConv(u);
    try { const r = await continueChat(lCard, u, m, lang); setConv([...u, { role: "ai", content: r.message, options: r.options || null, selected: null }]); }
    catch (e) { console.error("sendMsg error:", e); setConv([...u, aiError(e, () => { setInp(m); })]); }
    setLLoad(false);
  };

  const toggleSt = (id) => save({ ...data, cards: data.cards.map(c => c.id === id ? { ...c, status: c.status === "acquired" ? "studied" : "acquired" } : c) });

  // ---- EXERCISE ----
  const launchEx = async () => {
    const sel = exerciseCards.filter(c => exSel.has(c.id)); if (!sel.length) return;
    setExOn(true); setExLoad(true); setExDone(false);
    try { const r = await genExercise(sel, exMode, lang, context, tl); setExConv([{ role: "ai", content: r.message, options: r.options || null, selected: null }]); }
    catch (e) { console.error("launchEx error:", e); setExConv([aiError(e, () => launchEx())]); }
    setExLoad(false);
  };

  const exOpt = async (i, opt) => {
    const isRight = (opt.correct === true || opt.correct === "true");
    const nc = [...exConv]; nc[i] = { ...nc[i], selected: opt.label };
    const u = [...nc, { role: "user", content: opt.label }]; setExConv(u); setExLoad(true);
    try {
      const sel = exerciseCards.filter(c => exSel.has(c.id));
      const wasLast = u.filter(m => m.role === "ai").length >= 3;
      const r = await continueExercise(sel, exMode, lang, u, isRight, tl);
      setExConv([...u, { role: "ai", content: r.message, options: r.options || null, selected: null }]);
      if (wasLast) { setExDone(true); save(awardPoints(15)); }
    }
    catch (e) { console.error("exOpt error:", e); setExConv([...u, aiError(e)]); }
    setExLoad(false);
  };

  const exSend = async () => {
    if (!exInp.trim()) return; const m = exInp.trim(); setExInp(""); setExLoad(true);
    const u = [...exConv, { role: "user", content: m }]; setExConv(u);
    try {
      const sel = exerciseCards.filter(c => exSel.has(c.id));
      const wasLast = u.filter(msg => msg.role === "ai").length >= 3;
      const r = await continueExercise(sel, exMode, lang, u, null, tl);
      setExConv([...u, { role: "ai", content: r.message, options: r.options || null, selected: null }]);
      if (wasLast) { setExDone(true); save(awardPoints(15)); }
    } catch (e) { console.error("exSend error:", e); setExConv([...u, aiError(e)]); }
    setExLoad(false);
  };

  const changeLang = (nl) => {
    save({ ...data, lang: nl, cards: data.cards.map(c => ({ ...c, description: nl === "fr" ? (c.description_fr || c.description) : (c.description_en || c.description), example_tr: nl === "fr" ? (c.example_fr || c.example_tr) : (c.example_en || c.example_tr) })) });
    setLangOpen(false);
  };

  const tabS = (on) => ({
    padding: "0 14px", height: "100%", display: "flex", alignItems: "center",
    fontSize: 12.5, fontWeight: on ? 500 : 400, background: "none", border: "none",
    borderBottom: on ? `3px solid ${C.acc}` : "3px solid transparent", marginBottom: -1,
    color: on ? C.acc : C.txtM, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", whiteSpace: "nowrap",
  });

  const qa = [
    { k: "examples", l: t.moreExamples, i: "💡" }, { k: "realExamples", l: t.realExamples, i: "🔍" },
    { k: "resources", l: t.onlineRes, i: "📚" },
    { k: "exercise", l: t.anExercise, i: "✏️" }, { k: "explain", l: t.explainOther, i: "🔄" },
  ];

  const fieldStyle = {
    width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px",
    fontFamily: "'Plus Jakarta Sans'", fontSize: 13, color: C.txt, background: C.s1,
    outline: "none", resize: "vertical", lineHeight: 1.6,
  };

  if (!loaded) return <div style={{ padding: 40, textAlign: "center", color: C.txtM }}>Loading...</div>;

  // Welcome / login screen if no sync code
  if (!syncId) {
    return (
      <div style={{ fontFamily: "'Plus Jakarta Sans'", display: "flex", flexDirection: "column", height: "100%", background: C.s0, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <span style={{ fontSize: 40, fontWeight: 700, color: C.txt, letterSpacing: -1 }}>
            모<span style={{ color: C.acc }}>아</span>
          </span>
          <div style={{ fontSize: 16, fontWeight: 500, color: C.txt, textAlign: "center" }}>
            {welcomeMode === "login" ? t.welcomeLoginTitle : welcomeMode === "create" ? t.welcomeCreateTitle : t.welcomeTitle}
          </div>
          <div style={{ fontSize: 13, color: C.txtS, textAlign: "center", lineHeight: 1.7 }}>
            {welcomeMode === "login" ? t.welcomeLoginSub : welcomeMode === "create" ? t.welcomeCreateSub : t.welcomeSub}
          </div>
          {!welcomeMode ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
              <button onClick={() => setWelcomeMode("login")}
                style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: C.acc, color: C.onAcc, fontFamily: "'Plus Jakarta Sans'", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                {t.welcomeLogin}
              </button>
              <button onClick={() => setWelcomeMode("create")}
                style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.s1, color: C.txt, fontFamily: "'Plus Jakarta Sans'", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                {t.welcomeCreate}
              </button>
            </div>
          ) : (
            <>
              <div style={{ width: "100%", fontSize: 12, color: C.txtS, textAlign: "center" }}>
                {welcomeMode === "login" ? t.welcomeLoginHint : t.welcomeCreateHint}
              </div>
              <label style={{ width: "100%", fontSize: 12, fontWeight: 500, color: C.txt }}>{t.welcomeCode}</label>
              <input
                autoFocus
                value={syncInput} onChange={e => { setSyncInput(e.target.value); setSyncStatus(null); }}
                onKeyDown={e => e.key === "Enter" && handleSync()}
                placeholder={t.welcomeCodePlaceholder}
                disabled={syncStatus === "loading"}
                style={{ width: "100%", boxSizing: "border-box", border: `2px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", fontSize: 14, fontFamily: "'Plus Jakarta Sans'", color: C.txt, background: C.s1, outline: "none", textAlign: "center" }}
                onFocus={e => { e.target.style.borderColor = C.acc; }}
                onBlur={e => { e.target.style.borderColor = C.border; }}
              />
              <button onClick={handleSync} disabled={syncStatus === "loading" || !syncInput.trim()}
                style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: syncInput.trim() && syncStatus !== "loading" ? C.acc : C.s1, color: syncInput.trim() && syncStatus !== "loading" ? C.onAcc : C.txtM, fontFamily: "'Plus Jakarta Sans'", fontSize: 14, fontWeight: 500, cursor: syncInput.trim() && syncStatus !== "loading" ? "pointer" : "default" }}>
                {syncStatus === "loading" ? t.syncLoading : welcomeMode === "login" ? t.welcomeLogin : t.welcomeCreate}
              </button>
              {syncStatus === "error" && <div style={{ fontSize: 12, color: C.warn, textAlign: "center", lineHeight: 1.5 }}>{welcomeMode === "login" ? t.welcomeNoAccount : t.syncError}</div>}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
                <button onClick={() => { setWelcomeMode(null); setSyncInput(""); setSyncStatus(null); }}
                  style={{ padding: "4px 10px", border: "none", background: "none", color: C.txtM, fontFamily: "'Plus Jakarta Sans'", fontSize: 12, cursor: "pointer" }}>
                  {t.back}
                </button>
                <span style={{ color: C.border }}>|</span>
                <button onClick={() => { setWelcomeMode(welcomeMode === "login" ? "create" : "login"); setSyncInput(""); setSyncStatus(null); }}
                  style={{ padding: "4px 10px", border: "none", background: "none", color: C.acc, fontFamily: "'Plus Jakarta Sans'", fontSize: 12, cursor: "pointer" }}>
                  {welcomeMode === "login" ? t.welcomeSwitchToCreate : t.welcomeSwitchToLogin}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Language selection screen if no target language chosen yet
  if (!tl || enabledTLs.length === 0) {
    return (
      <div style={{ fontFamily: "'Plus Jakarta Sans'", display: "flex", flexDirection: "column", height: "100%", background: C.s0, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <span style={{ fontSize: 40, fontWeight: 700, color: C.txt, letterSpacing: -1 }}>
            모<span style={{ color: C.acc }}>아</span>
          </span>
          <div style={{ fontSize: 16, fontWeight: 500, color: C.txt }}>{t.chooseLang}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
            {Object.entries(TARGET_LANGS).map(([code, conf]) => (
              <button key={code} onClick={() => addTargetLang(code)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.s2, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", fontSize: 14, color: C.txt, textAlign: "left", transition: "border-color 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.acc; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
                <span style={{ fontSize: 28 }}>{conf.flag}</span>
                <div>
                  <div style={{ fontWeight: 500 }}>{conf.name[lang]}</div>
                  <div style={{ fontSize: 12, color: C.txtM }}>{conf.nativeName}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Onboarding: 2 short screens for new learners
  if (!data.profile?.onboarded) {
    const box = { width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontFamily: "'Plus Jakarta Sans'", fontSize: 13, color: C.txt, background: C.s1, outline: "none", lineHeight: 1.6, resize: "vertical" };
    return (
      <div style={{ fontFamily: "'Plus Jakarta Sans'", display: "flex", flexDirection: "column", height: "100%", background: C.s0, alignItems: "center", justifyContent: "center", padding: 24, overflowY: "auto" }}>
        <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Progress */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, height: 3, background: C.border, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${((onbStep + 1) / 2) * 100}%`, height: "100%", background: C.acc, transition: "width 0.25s" }} />
            </div>
            <span style={{ fontSize: 11, color: C.txtM }}>{t.onbStep(onbStep + 1, 2)}</span>
          </div>

          {onbStep === 0 ? (
            <>
              <div style={{ fontSize: 18, fontWeight: 600, color: C.txt }}>{t.onbTitle1}</div>
              <div style={{ fontSize: 12.5, color: C.txtS, lineHeight: 1.6 }}>{t.onbSub1}</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 130px" }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: C.txt, display: "block", marginBottom: 5 }}>{t.genderLabel}</label>
                  <select value={onbDraft.gender} onChange={e => setOnbDraft({ ...onbDraft, gender: e.target.value })}
                    style={{ ...box, appearance: "auto", cursor: "pointer" }}>
                    <option value="">{t.genderNone}</option>
                    <option value="homme">{t.genderM}</option>
                    <option value="femme">{t.genderF}</option>
                  </select>
                </div>
                <div style={{ flex: "0 0 90px" }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: C.txt, display: "block", marginBottom: 5 }}>{t.ageLabel}</label>
                  <input type="number" min="1" max="120" value={onbDraft.age} onChange={e => setOnbDraft({ ...onbDraft, age: e.target.value })} placeholder={t.agePlaceholder} style={box} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: C.txt, display: "block", marginBottom: 5 }}>{t.nationalityLabel}</label>
                <input value={onbDraft.nationality} onChange={e => setOnbDraft({ ...onbDraft, nationality: e.target.value })} placeholder={t.nationalityPlaceholder} style={box} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: C.txt, display: "block", marginBottom: 5 }}>{t.spokenLangsLabel}</label>
                <input value={onbDraft.spokenLanguages} onChange={e => setOnbDraft({ ...onbDraft, spokenLanguages: e.target.value })} placeholder={t.spokenLangsPlaceholder} style={box} />
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 18, fontWeight: 600, color: C.txt }}>✨ {t.onbTitle2}</div>
              <div style={{ fontSize: 12.5, color: C.txtS, lineHeight: 1.6 }}>{t.onbSub2}</div>
              <textarea value={onbDraft.dream} onChange={e => setOnbDraft({ ...onbDraft, dream: e.target.value })} placeholder={t.dreamPlaceholder} rows={5} style={box} />
            </>
          )}

          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
            <button onClick={() => onbStep === 0 ? setOnbStep(1) : finishOnboarding(false)}
              style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: C.acc, color: C.onAcc, fontFamily: "'Plus Jakarta Sans'", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
              {onbStep === 0 ? t.onbNext : t.onbFinish}
            </button>
            <button onClick={() => finishOnboarding(true)}
              style={{ padding: "12px 16px", borderRadius: 10, border: "none", background: "none", color: C.txtM, fontFamily: "'Plus Jakarta Sans'", fontSize: 13, cursor: "pointer" }}>
              {t.onbSkip}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans'", display: "flex", flexDirection: "column", height: "100%", minHeight: 0, background: C.s0, overflow: "hidden" }}>
      <style>{`@keyframes p{0%,100%{opacity:1}50%{opacity:.3}}.pulse{animation:p 1.5s infinite}@keyframes pop{0%{transform:translateY(10px) scale(.9);opacity:0}20%{transform:translateY(0) scale(1);opacity:1}80%{opacity:1}100%{opacity:0}}`}</style>

      {/* POINTS TOAST */}
      {pointsToast && (
        <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", zIndex: 1000, background: C.acc, color: C.onAcc, padding: "10px 20px", borderRadius: 20, fontSize: 14, fontWeight: 600, boxShadow: "0 4px 16px rgba(123,127,245,0.35)", animation: "pop 2.5s ease-out forwards", pointerEvents: "none" }}>
          ⭐ {t.pointsEarned(pointsToast)}
        </div>
      )}

      {/* NAV */}
      <header style={{ display: "flex", alignItems: "stretch", padding: "0 12px", height: 46, background: C.s2, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <span style={{ fontSize: 18, fontWeight: 600, color: C.txt, letterSpacing: -0.5, marginRight: 8, display: "flex", alignItems: "center", flexShrink: 0 }}>
          모<span style={{ color: C.acc }}>아</span>
        </span>
        {/* Target language selector */}
        <div style={{ display: "flex", alignItems: "center", marginRight: 8, flexShrink: 0 }}>
          <button onClick={e => { e.stopPropagation(); setTlOpen(!tlOpen); setLangOpen(false); }}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.s1, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", fontSize: 12, color: C.txt }}>
            {tlConf?.flag} <span style={{ fontSize: 9, color: C.txtM }}>▾</span>
          </button>
        </div>
        {/* Scrollable tabs */}
        <div style={{ display: "flex", alignItems: "stretch", flex: 1, overflowX: "auto", minWidth: 0 }}>
        <button style={tabS(view === "library")} onClick={() => setView("library")}>{t.library}</button>
        <button style={tabS(view === "lesson")} onClick={() => setView("lesson")}>{t.lesson}</button>
        <button style={tabS(view === "import")} onClick={() => { setView("import"); setImpStep("input"); }}>{t.import}</button>
        <button style={tabS(view === "feed")} onClick={() => setView("feed")}>{t.feed}</button>
        <button style={tabS(view === "exercise")} onClick={() => setView("exercise")}>{t.exercise}</button>
        <button style={tabS(view === "profile")} onClick={() => setView("profile")}>{t.profile}</button>
        </div>{/* end scrollable tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.acc, background: C.accBg, padding: "3px 8px", borderRadius: 10, whiteSpace: "nowrap" }}>
            ⭐ {data.profile?.points || 0}
          </span>
          {/* Sync / account */}
          <button onClick={() => setShowSync(!showSync)}
            title={syncId}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 13, border: `1px solid ${C.border}`, background: C.s1, color: C.txtS, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", fontSize: 13, flexShrink: 0, padding: 0 }}>
            👤
          </button>
          {/* Lang */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setLangOpen(!langOpen)} style={{ display: "flex", alignItems: "center", gap: 3, padding: "4px 6px", border: "none", borderRadius: 6, background: "none", cursor: "pointer", fontSize: 14 }}>
              {lang === "fr" ? "🇫🇷" : "🇬🇧"} <span style={{ fontSize: 9, color: C.txtM }}>▾</span>
            </button>
            {langOpen && (
              <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, background: C.s2, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden", zIndex: 50, minWidth: 110, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                {[["fr", "🇫🇷 Français"], ["en", "🇬🇧 English"]].map(([k, l]) => (
                  <button key={k} onClick={() => changeLang(k)}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", fontSize: 12.5, color: lang === k ? C.acc : C.txtS, fontWeight: lang === k ? 500 : 400, cursor: "pointer", border: "none", background: "none", width: "100%", fontFamily: "'Plus Jakarta Sans'" }}>
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* SYNC BAR */}
      {showSync && (
        <div style={{ padding: "10px 16px", background: C.s1, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: C.ok, fontWeight: 500 }}>🔗 {t.syncConnected}</span>
          <span style={{ fontSize: 12, color: C.txt, fontFamily: "monospace", background: C.okBg, padding: "2px 8px", borderRadius: 4 }}>{syncId}</span>
          <button onClick={handleDisconnect}
            style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.s2, fontSize: 11, fontFamily: "'Plus Jakarta Sans'", color: C.txtS, cursor: "pointer" }}>
            {t.disconnect}
          </button>
          <span style={{ fontSize: 11, color: C.txtM, flex: 1 }}>{t.syncInfo}</span>
        </div>
      )}

      {/* TARGET LANGUAGE PANEL */}
      {tlOpen && (
        <div style={{ padding: "10px 16px", background: C.s1, borderBottom: `1px solid ${C.border}`, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {enabledTLs.map(code => (
            <button key={code} onClick={() => switchTargetLang(code)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer", border: tl === code ? `2px solid ${C.acc}` : `1px solid ${C.border}`, background: tl === code ? C.accBg : C.s2, color: tl === code ? C.acc : C.txt, fontWeight: tl === code ? 600 : 400, fontFamily: "'Plus Jakarta Sans'" }}>
              {TARGET_LANGS[code]?.flag} {getTargetLangName(code, lang)}
            </button>
          ))}
          {Object.keys(TARGET_LANGS).filter(code => !enabledTLs.includes(code)).map(code => (
            <button key={code} onClick={() => addTargetLang(code)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer", border: `1px dashed ${C.borderS}`, background: "none", color: C.txtM, fontFamily: "'Plus Jakarta Sans'" }}>
              + {TARGET_LANGS[code]?.flag} {getTargetLangName(code, lang)}
            </button>
          ))}
        </div>
      )}

      {/* VIEWS */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex" }} onClick={() => { setLangOpen(false); setTlOpen(false); }}>

        {/* LIBRARY */}
        {view === "library" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>
            <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 12, color: C.txtM }}>{filteredCards.length} {t.points} · {studiedCount} {t.statusStudied.toLowerCase()} · {acqCount} {t.statusAcquired.toLowerCase()}</span>
              {filteredCards.length > 0 && (
                <div style={{ display: "flex", gap: 2, background: C.s1, borderRadius: 6, padding: 2, border: `1px solid ${C.border}` }}>
                  {[["grid", "▦", t.viewGrid], ["tree", "🌿", t.viewTree]].map(([k, icon, label]) => (
                    <button key={k} onClick={() => setLibView(k)}
                      style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 4, border: "none", fontSize: 11, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", background: libView === k ? C.s2 : "transparent", color: libView === k ? C.acc : C.txtM, fontWeight: libView === k ? 500 : 400, boxShadow: libView === k ? "0 1px 3px rgba(0,0,0,0.06)" : "none" }}>
                      {icon} {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {filteredCards.length === 0
              ? <div style={{ padding: 40, textAlign: "center", color: C.txtM, fontSize: 13 }}>{t.noCards}</div>
              : libView === "grid"
                ? <div style={{ padding: "14px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 12 }}>
                    {filteredCards.map(c => <GrammarCard key={c.id} card={c} t={t} onToggle={() => toggleSt(c.id)} onReview={() => reviewCard(c)} />)}
                  </div>
                : <TreeView cards={filteredCards} t={t} onToggle={(id) => toggleSt(id)} onReview={(c) => reviewCard(c)} />
            }
          </div>
        )}

        {/* IMPORT */}
        {view === "import" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, gap: 16, overflowY: "auto" }}>
            {impStep === "input" && (<>
              <div style={{ fontSize: 36 }}>📄</div>
              <div style={{ fontSize: 16, fontWeight: 500, color: C.txt }}>{t.importTitle}</div>
              <div style={{ fontSize: 12.5, color: C.txtS, textAlign: "center", maxWidth: 400, lineHeight: 1.6 }}>{t.importSub}</div>
              <textarea value={impText} onChange={e => setImpText(e.target.value)} placeholder={tlConf?.placeholder || t.placeholder}
                style={{ width: "100%", maxWidth: 480, height: 160, border: `2px dashed ${C.borderS}`, borderRadius: 12, background: C.s1, padding: 14, fontFamily: "'Plus Jakarta Sans'", fontSize: 13, color: C.txt, resize: "none", outline: "none", lineHeight: 1.6 }}
                onFocus={e => { e.target.style.borderColor = C.acc; e.target.style.borderStyle = "solid"; }}
                onBlur={e => { e.target.style.borderColor = C.borderS; e.target.style.borderStyle = "dashed"; }} />
              <button onClick={doAnalyze} disabled={!impText.trim()}
                style={{ padding: "8px 22px", borderRadius: 6, border: "none", cursor: impText.trim() ? "pointer" : "default", background: impText.trim() ? C.acc : C.s1, color: impText.trim() ? C.onAcc : C.txtM, fontFamily: "'Plus Jakarta Sans'", fontSize: 13, fontWeight: 500 }}>
                ✨ {t.analyze}
              </button>
            </>)}
            {impStep === "scanning" && <div style={{ fontSize: 36 }}>📄</div>}
            {impStep === "scanning" && <div className="pulse" style={{ fontSize: 13, color: C.txtS }}>{t.analyzing}</div>}
            {impStep === "picks" && (
              <div style={{ width: "100%", maxWidth: 520, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.txt }}>{t.pointsFound(found.length)}</div>
                <div style={{ fontSize: 12, color: C.txtM, marginBottom: 8 }}>{t.pickSub}</div>
                {found.map((p, i) => (
                  <div key={i} onClick={() => setSelPick(i)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, cursor: "pointer", border: `1px solid ${selPick === i ? C.acc : C.border}`, background: selPick === i ? C.accBg : C.s2 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: tFont, fontSize: 15, color: C.txt }}>{p.korean}</div>
                      <div style={{ fontSize: 11.5, color: C.txtS, marginTop: 2 }}>{lang === "fr" ? p.description_fr : p.description_en}</div>
                    </div>
                    <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 3, background: p.type === "grammar" ? C.accBg : C.proBg, color: p.type === "grammar" ? C.acc : C.pro }}>{p.type === "grammar" ? t.grammar : t.expression}</span>
                    <button onClick={e => { e.stopPropagation(); markKnown(i); }}
                      style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10.5, cursor: "pointer", whiteSpace: "nowrap", border: `1px solid ${known.has(i) ? C.okB : C.border}`, background: known.has(i) ? C.okBg : "none", color: known.has(i) ? C.ok : C.txtM, fontFamily: "'Plus Jakarta Sans'" }}>
                      ✓ {known.has(i) ? t.addedAcq : t.iKnow}
                    </button>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <button onClick={() => beginLesson(null, null)} style={{ padding: "8px 18px", borderRadius: 6, background: C.acc, color: C.onAcc, border: "none", fontFamily: "'Plus Jakarta Sans'", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>→ {t.startLesson}</button>
                  <button onClick={async () => { setImpStep("scanning"); try { const m = await analyzeText(impText, [...data.cards, ...found.map(p => ({ korean: p.korean }))], lang, context, tl); setFound([...found, ...m]); } catch (e) { console.error(e); } setImpStep("picks"); }}
                    style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.borderS}`, background: "none", fontFamily: "'Plus Jakarta Sans'", fontSize: 12, color: C.txtS, cursor: "pointer" }}>+ {t.morePoints}</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* LESSON */}
        {view === "lesson" && (
          showRecap && recapCard && recapMode ? (
            // FULL-SCREEN QUICK PRACTICE CHAT
            <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.s1, minHeight: 0 }}>
              <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, background: C.s2, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <button onClick={() => { setRecapMode(null); setRecapConv([]); setRecapInp(""); }}
                  style={{ padding: "5px 11px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.s1, color: C.txtS, fontSize: 11.5, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", flexShrink: 0 }}>
                  ← {t.backToRecap}
                </button>
                <span style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 13, fontWeight: 500, color: C.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {recapCard.korean}
                </span>
                <button
                  onClick={() => { const v = !revealTr; setRevealTr(v); localStorage.setItem("moa-reveal-tr", v ? "1" : "0"); }}
                  title={t.tapToReveal}
                  style={{ marginLeft: "auto", flexShrink: 0, display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", borderRadius: 6, fontSize: 10.5, cursor: "pointer", border: `1px solid ${revealTr ? C.acc : C.border}`, background: revealTr ? C.accBg : C.s1, color: revealTr ? C.acc : C.txtM, fontFamily: "'Plus Jakarta Sans'" }}>
                  {revealTr ? "👁" : "🙈"}
                </button>
              </div>
              <div ref={recapR} style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                {recapConv.map((m, i) => (
                  <div key={i} ref={i === recapConv.length - 1 ? lastRecapMsgRef : null}>
                    <Bubble revealAll={revealTr}
                      msg={{ ...m, onSelect: m.role === "ai" && !m.selected && m.options ? (o) => recapPickOpt(i, o) : null }} />
                  </div>
                ))}
                {recapLoad && <div className="pulse" style={{ fontSize: 12, color: C.txtM, padding: 8 }}>{searching ? t.searching : t.thinking}</div>}
              </div>
              <div style={{ padding: "8px 10px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 6, background: C.s2, alignItems: "center", flexShrink: 0 }}>
                <input value={recapInp} onChange={e => setRecapInp(e.target.value)} onKeyDown={e => e.key === "Enter" && recapSend()} placeholder={t.yourAnswer}
                  style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 10px", fontFamily: "'Plus Jakarta Sans'", fontSize: 12, color: C.txt, background: C.s1, outline: "none" }} />
                <button onClick={recapSend} style={{ width: 30, height: 30, background: C.acc, color: C.onAcc, border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>↑</button>
              </div>
            </div>
          ) : showRecap && recapCard ? (
            // RECAP SCREEN
            <div style={{ flex: 1, overflowY: "auto", display: "flex", justifyContent: "center" }}>
              <div style={{ width: "100%", maxWidth: 540, padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Card info */}
                <div style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 7px", borderRadius: 4, background: recapCard.type === "grammar" ? C.accBg : C.proBg, color: recapCard.type === "grammar" ? C.acc : C.pro }}>{recapCard.type === "grammar" ? t.grammar : t.expression}</span>
                    {(() => { const si = statusInfo(recapCard.status, t); return (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, padding: "2px 7px", borderRadius: 10, background: si.bg, color: si.color }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: si.color }} />{si.label}
                      </span>
                    ); })()}
                    {(recapCard.reviewCount || 0) > 0 && <span style={{ fontSize: 10, color: C.txtM }}>{t.reviewCount(recapCard.reviewCount)}</span>}
                    <button
                      onClick={() => { const v = !revealTr; setRevealTr(v); localStorage.setItem("moa-reveal-tr", v ? "1" : "0"); }}
                      title={t.tapToReveal}
                      style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, fontSize: 10, cursor: "pointer", border: `1px solid ${revealTr ? C.acc : C.border}`, background: revealTr ? C.accBg : C.s1, color: revealTr ? C.acc : C.txtM, fontFamily: "'Plus Jakarta Sans'" }}>
                      {revealTr ? "👁" : "🙈"} {t.showTranslations}
                    </button>
                  </div>
                  <div style={{ fontFamily: tFont, fontSize: 22, color: C.txt, marginBottom: 4 }}>{recapCard.korean}</div>
                  <div style={{ fontSize: 12.5, color: C.txtS, lineHeight: 1.6, marginBottom: 10 }}>{recapCard.description}</div>
                  <div style={{ background: C.s1, borderRadius: 8, padding: "9px 11px" }}>
                    <div style={{ fontFamily: tFont, fontSize: 13, color: C.txt, lineHeight: 1.8 }}>{recapCard.example_kr}</div>
                    <div style={{ fontSize: 11.5, color: C.txtM, fontStyle: "italic", marginTop: 3 }}>{recapCard.example_tr}</div>
                  </div>
                  {recapCard.parentKorean && (
                    <div style={{ fontSize: 10, color: C.acc, marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ opacity: 0.6 }}>↳</span> {t.derivedFrom} <span style={{ fontFamily: tFont, fontWeight: 500 }}>{recapCard.parentKorean}</span>
                    </div>
                  )}
                </div>

                {/* Past lesson summaries */}
                {(() => {
                  const cardSummaries = (data.summaries || []).filter(s => s.cardKorean === recapCard.korean);
                  return cardSummaries.length > 0 ? (
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: C.txt, marginBottom: 10 }}>{t.recapTitle}</div>
                      <div style={{ fontSize: 12, color: C.txtM, marginBottom: 12, lineHeight: 1.5 }}>{t.recapSub}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {cardSummaries.map((s, i) => <SummaryCard key={s.id || i} summary={s} t={t} lang={lang} />)}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: C.txtM, textAlign: "center", padding: 12 }}>{t.noRecapYet}</div>
                  );
                })()}

                {/* Quick practice */}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.txt, marginBottom: 4 }}>{t.quickPractice}</div>
                  <div style={{ fontSize: 12, color: C.txtM, marginBottom: 10, lineHeight: 1.5 }}>{t.quickPracticeSub}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
                    {[
                      { k: "exercise", l: t.anExercise, i: "✏️" },
                      { k: "examples", l: t.moreExamples, i: "💡" },
                      { k: "realExamples", l: t.realExamples, i: "🔍" },
                      { k: "resources", l: t.onlineRes, i: "📚" },
                    ].map(a => (
                      <button key={a.k} onClick={() => startRecapAction(a.k)}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 13px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.s2, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", fontSize: 12.5, color: C.txt, textAlign: "left", transition: "border-color 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = C.acc; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
                        <span style={{ fontSize: 16, flexShrink: 0 }}>{a.i}</span>{a.l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Full lesson */}
                <button onClick={() => startLessonFromCard(recapCard)}
                  style={{ padding: "12px 16px", borderRadius: 10, background: C.acc, color: C.onAcc, border: "none", fontFamily: "'Plus Jakarta Sans'", fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "center" }}>
                  🔄 {t.redoLesson}
                </button>
              </div>
            </div>
          ) : lCard ? (
            <div style={{ flex: 1, display: "flex", overflow: "hidden", flexDirection: window.innerWidth < 700 ? "column" : "row" }}>
              <div style={{ width: window.innerWidth < 700 ? "100%" : "40%", maxHeight: window.innerWidth < 700 ? "35%" : "none", flexShrink: 0, borderRight: window.innerWidth >= 700 ? `1px solid ${C.border}` : "none", borderBottom: window.innerWidth < 700 ? `1px solid ${C.border}` : "none", display: "flex", flexDirection: "column", background: C.s2 }}>
                <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, flexShrink: 0, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: C.txt, marginBottom: 5 }}>📄 Article</div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, padding: "2px 7px", borderRadius: 4, background: C.warnBg, border: `1px solid ${C.warnB}`, color: C.warn }}>🎯 {lCard.korean}</span>
                  </div>
                  <button
                    onClick={() => { const v = !revealTr; setRevealTr(v); localStorage.setItem("moa-reveal-tr", v ? "1" : "0"); }}
                    title={t.tapToReveal}
                    style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", borderRadius: 6, fontSize: 10.5, cursor: "pointer", border: `1px solid ${revealTr ? C.acc : C.border}`, background: revealTr ? C.accBg : C.s1, color: revealTr ? C.acc : C.txtM, fontFamily: "'Plus Jakarta Sans'" }}>
                    {revealTr ? "👁 " : "🙈 "}{t.showTranslations}
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
                  {lArticle ? lArticle.split("\n").filter(Boolean).map((p, i) => (
                    <p key={i} style={{ fontFamily: tFont, fontSize: 13, lineHeight: 2.1, color: C.txt, marginBottom: 10 }}>{p}</p>
                  )) : null}
                </div>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.s1, minHeight: 0 }}>
                <div ref={msgsR} style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                  {conv.map((m, i) => (
                    <div key={i} ref={i === conv.length - 1 ? lastMsgRef : null}>
                      <Bubble revealAll={revealTr} msg={{ ...m, onSelect: m.role === "ai" && !m.selected && m.options ? (o) => pickOpt(i, o) : null }} />
                    </div>
                  ))}
                  {lLoad && <div className="pulse" style={{ fontSize: 12, color: C.txtM, padding: 8 }}>{searching ? t.searching : lessonDone ? t.generating : t.thinking}</div>}
                  {/* LESSON SUMMARY */}
                  {lessonSummary && (
                    <div style={{ background: C.s2, border: `1px solid ${(lessonSummary.error || lessonSummary.structuresLearned === "Error generating summary") ? C.warnB : C.okB}`, borderRadius: 10, padding: 16, margin: "4px 0" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.txt, marginBottom: 12 }}>📋 {t.summaryTitle}</div>
                      {(lessonSummary.error || lessonSummary.structuresLearned === "Error generating summary") ? (
                        <div>
                          <div style={{ fontSize: 12, color: C.warn, lineHeight: 1.6, marginBottom: 8 }}>
                            ⚠️ {lang === "fr" ? "Erreur lors de la génération du résumé" : "Error generating summary"}
                          </div>
                          {lessonSummary.error && (
                            <div style={{ fontSize: 11, color: C.txtM, lineHeight: 1.5, marginBottom: 12, background: C.s1, padding: "6px 10px", borderRadius: 6, fontFamily: "monospace", wordBreak: "break-all" }}>
                              {String(lessonSummary.error).substring(0, 200)}
                            </div>
                          )}
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button onClick={() => { setLessonSummary(null); setLessonDone(false); endLesson(); }}
                              style={{ padding: "6px 16px", borderRadius: 6, background: C.acc, color: C.onAcc, border: "none", fontFamily: "'Plus Jakarta Sans'", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                              🔄 {lang === "fr" ? "Réessayer" : "Retry"}
                            </button>
                            <button onClick={() => { setLCard(null); setConv([]); setLessonDone(false); setLessonSummary(null); setView("library"); }}
                              style={{ padding: "6px 16px", borderRadius: 6, background: "none", border: `1px solid ${C.borderS}`, color: C.txtS, fontFamily: "'Plus Jakarta Sans'", fontSize: 12, cursor: "pointer" }}>
                              ← {lang === "fr" ? "Quitter" : "Close"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize: 12.5, color: C.txt, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                            {renderMarkdown(lessonSummary.grammarRecap || lessonSummary.structuresLearned, revealTr)}
                          </div>
                          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                            <button onClick={() => {
                              const cardId = data.cards.find(c => c.korean === lCard.korean)?.id;
                              setLCard(null); setConv([]); setLessonDone(false); setLessonSummary(null);
                              if (cardId) { setExSel(new Set([cardId])); }
                              setView("exercise");
                            }}
                              style={{ padding: "6px 16px", borderRadius: 6, background: C.acc, color: C.onAcc, border: "none", fontFamily: "'Plus Jakarta Sans'", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                              ✏️ {t.moreExercises}
                            </button>
                            <button onClick={() => { setLCard(null); setConv([]); setLessonDone(false); setLessonSummary(null); setView("import"); }}
                              style={{ padding: "6px 16px", borderRadius: 6, background: "none", border: `1px solid ${C.borderS}`, color: C.txtS, fontFamily: "'Plus Jakarta Sans'", fontSize: 12, cursor: "pointer" }}>
                              → {t.newLesson}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
                {!lessonDone && (<>
                  {(() => {
                    const aiTurns = conv.filter(m => m.role === "ai").length;
                    return aiTurns >= 6 ? (
                      <div style={{ padding: "6px 10px", borderTop: `1px solid ${C.border}`, background: C.okBg, display: "flex", justifyContent: "center" }}>
                        <button onClick={endLesson} disabled={lLoad}
                          style={{ padding: "6px 18px", borderRadius: 6, border: `1px solid ${C.okB}`, background: C.s2, color: C.ok, fontFamily: "'Plus Jakarta Sans'", fontSize: 12, fontWeight: 500, cursor: lLoad ? "default" : "pointer" }}>
                          ✓ {t.endLesson}
                        </button>
                      </div>
                    ) : null;
                  })()}
                  {tray && (
                    <div style={{ padding: "6px 10px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 5, flexWrap: "wrap", background: C.s1 }}>
                      {qa.map(a => (
                        <button key={a.k} onClick={() => quickAct(a.k)}
                          style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", background: C.s2, border: `1px solid ${C.borderS}`, borderRadius: 20, fontFamily: "'Plus Jakarta Sans'", fontSize: 11.5, color: C.txtS, cursor: "pointer" }}>
                          {a.i} {a.l}
                        </button>
                      ))}
                    </div>
                  )}
                  <div style={{ padding: "8px 10px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 6, background: C.s2, alignItems: "center", flexShrink: 0 }}>
                    <input value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMsg()} placeholder={t.yourAnswer}
                      style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 10px", fontFamily: "'Plus Jakarta Sans'", fontSize: 12, color: C.txt, background: C.s1, outline: "none" }} />
                    <button onClick={sendMsg} style={{ width: 30, height: 30, background: C.acc, color: C.onAcc, border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>↑</button>
                    <button onClick={() => setTray(!tray)} style={{ width: 30, height: 30, border: `1px solid ${C.borderS}`, borderRadius: 6, background: tray ? C.s1 : "none", cursor: "pointer", color: C.txtM, fontSize: 15, letterSpacing: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>···</button>
                  </div>
                </>)}
              </div>
            </div>
          ) : <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.txtM, fontSize: 13, flexDirection: "column", gap: 8 }}><div style={{ fontSize: 32 }}>📖</div><div>{t.emptyLesson}</div></div>
        )}

        {/* EXERCISE */}
        {view === "exercise" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>
            {!exOn ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 24px", gap: 18 }}>
                <div style={{ fontSize: 16, fontWeight: 500, color: C.txt }}>{t.exerciseTitle}</div>
                <div style={{ fontSize: 12.5, color: C.txtS, textAlign: "center", maxWidth: 420, lineHeight: 1.6 }}>{t.exerciseSub}</div>
                <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 460, flexWrap: "wrap" }}>
                  {[{ k: "story", l: t.story, d: t.storyDesc, i: "✍️" }, { k: "qcm", l: t.qcm, d: t.qcmDesc, i: "🔀" }, { k: "fill", l: t.fillBlanks, d: t.fillDesc, i: "🔄" }].map(m => (
                    <button key={m.k} onClick={() => setExMode(m.k)}
                      style={{ flex: "1 1 130px", background: exMode === m.k ? C.accBg : C.s2, border: `1px solid ${exMode === m.k ? C.acc : C.border}`, borderRadius: 12, padding: 16, cursor: "pointer", textAlign: "center", fontFamily: "'Plus Jakarta Sans'" }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>{m.i}</div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: C.txt, marginBottom: 3 }}>{m.l}</div>
                      <div style={{ fontSize: 11, color: C.txtS, lineHeight: 1.5 }}>{m.d}</div>
                    </button>
                  ))}
                </div>
                <div style={{ width: "100%", maxWidth: 460 }}>
                  <div style={{ fontSize: 12, color: C.txtM, marginBottom: 8 }}>{t.availableCards}</div>
                  {exerciseCards.length === 0
                    ? <div style={{ fontSize: 12, color: C.txtM, padding: 12, textAlign: "center" }}>{t.noAcquired}</div>
                    : <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {exerciseCards.map(c => (
                          <button key={c.id} onClick={() => { const ns = new Set(exSel); ns.has(c.id) ? ns.delete(c.id) : ns.add(c.id); setExSel(ns); }}
                            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", border: `1px solid ${exSel.has(c.id) ? C.acc : C.border}`, borderRadius: 6, background: exSel.has(c.id) ? C.accBg : C.s2, fontFamily: tFont, fontSize: 12.5, color: C.txt, cursor: "pointer" }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.ok }} />{c.korean}
                          </button>
                        ))}
                      </div>
                  }
                </div>
                {exerciseCards.length > 0 && (
                  <button onClick={launchEx} disabled={exSel.size === 0}
                    style={{ padding: "8px 22px", borderRadius: 6, border: "none", alignSelf: "flex-end", background: exSel.size > 0 ? C.acc : C.s1, color: exSel.size > 0 ? C.onAcc : C.txtM, fontFamily: "'Plus Jakarta Sans'", fontSize: 13, fontWeight: 500, cursor: exSel.size > 0 ? "pointer" : "default" }}>
                    ▶ {t.launchEx}
                  </button>
                )}
              </div>
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "8px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: C.txt }}>{t.exercise}</span>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button
                      onClick={() => { const v = !revealTr; setRevealTr(v); localStorage.setItem("moa-reveal-tr", v ? "1" : "0"); }}
                      title={t.tapToReveal}
                      style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 6, fontSize: 10.5, cursor: "pointer", border: `1px solid ${revealTr ? C.acc : C.border}`, background: revealTr ? C.accBg : C.s1, color: revealTr ? C.acc : C.txtM, fontFamily: "'Plus Jakarta Sans'" }}>
                      {revealTr ? "👁 " : "🙈 "}{t.showTranslations}
                    </button>
                    <button onClick={() => setExOn(false)} style={{ fontSize: 11, color: C.txtS, border: `1px solid ${C.border}`, borderRadius: 6, padding: "3px 9px", background: "#fff", cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>← {t.back}</button>
                  </div>
                </div>
                <div ref={exR} style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                  {exConv.map((m, i) => (
                    <div key={i} ref={i === exConv.length - 1 ? lastExMsgRef : null}>
                      <Bubble revealAll={revealTr} msg={{ ...m, onSelect: m.role === "ai" && !m.selected && m.options ? (o) => exOpt(i, o) : null }} />
                    </div>
                  ))}
                  {exLoad && <div className="pulse" style={{ fontSize: 12, color: C.txtM, padding: 8 }}>{t.thinking}</div>}
                  {exDone && !exLoad && (
                    <div style={{ background: C.s2, border: `1px solid ${C.okB}`, borderRadius: 12, padding: 16, margin: "4px 0", textAlign: "center" }}>
                      <div style={{ fontSize: 28, marginBottom: 6 }}>🎉</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.txt, marginBottom: 14 }}>{t.exFinished}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                        <button onClick={() => { setExOn(false); setExConv([]); setExDone(false); }}
                          style={{ padding: "8px 18px", borderRadius: 8, background: C.acc, color: C.onAcc, border: "none", fontFamily: "'Plus Jakarta Sans'", fontSize: 12.5, fontWeight: 500, cursor: "pointer" }}>
                          ▶ {t.newExercise}
                        </button>
                        <button onClick={() => { setExOn(false); setExConv([]); setExDone(false); setView("library"); }}
                          style={{ padding: "8px 18px", borderRadius: 8, background: "none", border: `1px solid ${C.borderS}`, color: C.txtS, fontFamily: "'Plus Jakarta Sans'", fontSize: 12.5, cursor: "pointer" }}>
                          📚 {t.backToLibrary}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {!exDone && <div style={{ padding: "8px 10px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 6, background: C.s2, alignItems: "center", flexShrink: 0 }}>
                  <input value={exInp} onChange={e => setExInp(e.target.value)} onKeyDown={e => e.key === "Enter" && exSend()} placeholder={t.yourAnswer}
                    style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 10px", fontFamily: "'Plus Jakarta Sans'", fontSize: 12, color: C.txt, background: C.s1, outline: "none" }} />
                  <button onClick={exSend} style={{ width: 30, height: 30, background: C.acc, color: C.onAcc, border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>↑</button>
                </div>}
              </div>
            )}
          </div>
        )}

        {/* FEED */}
        {view === "feed" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Search + categories */}
            <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, background: C.s2, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <input value={feedInput} onChange={e => setFeedInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && feedInput.trim()) loadFeed(feedInput.trim(), feedCat); }}
                  placeholder={t.feedSearch}
                  style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontFamily: "'Plus Jakarta Sans'", fontSize: 13, color: C.txt, background: C.s1, outline: "none" }} />
                <button onClick={() => feedInput.trim() && loadFeed(feedInput.trim(), feedCat)}
                  style={{ width: 36, height: 36, background: C.acc, color: C.onAcc, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>🔍</button>
              </div>

              {/* Categories (Korean only) */}
              {tl === "ko" && (
                <div style={{ display: "flex", gap: 5, overflowX: "auto" }}>
                  {[["blog", t.feedCatBlog], ["news", t.feedCatNews], ["cafe", t.feedCatCafe], ["kin", t.feedCatKin]].map(([k, l]) => (
                    <button key={k} onClick={() => { setFeedCat(k); if (feedQuery) loadFeed(feedQuery, k); }}
                      style={{ padding: "4px 11px", borderRadius: 14, fontSize: 11.5, cursor: "pointer", whiteSpace: "nowrap", border: `1px solid ${feedCat === k ? C.acc : C.border}`, background: feedCat === k ? C.accBg : C.s1, color: feedCat === k ? C.acc : C.txtM, fontFamily: "'Plus Jakarta Sans'", flexShrink: 0 }}>
                      {l}
                    </button>
                  ))}
                </div>
              )}

              {/* Auto keywords */}
              {feedKeywords.length > 0 && (
                <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 2 }}>
                  {feedKeywords.map((kw, i) => (
                    <button key={i} onClick={() => { setFeedInput(kw); loadFeed(kw, feedCat); }}
                      style={{ padding: "4px 11px", borderRadius: 14, fontSize: 11.5, cursor: "pointer", whiteSpace: "nowrap", border: `1px solid ${feedQuery === kw ? C.acc : C.border}`, background: feedQuery === kw ? C.accBg : "none", color: feedQuery === kw ? C.acc : C.txtS, fontFamily: tFont, flexShrink: 0 }}>
                      {kw}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Items */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
              {feedKwLoad && <div className="pulse" style={{ textAlign: "center", color: C.txtM, fontSize: 13, padding: 30 }}>{t.feedGenKeywords}</div>}
              {feedLoad && <div className="pulse" style={{ textAlign: "center", color: C.txtM, fontSize: 13, padding: 30 }}>{t.feedLoading}</div>}
              {feedErr && (
                <div style={{ padding: 14, background: C.warnBg, border: `1px solid ${C.warnB}`, borderRadius: 10, fontSize: 12, color: C.warn, lineHeight: 1.6 }}>
                  ⚠️ {feedErr}
                </div>
              )}
              {!feedLoad && !feedKwLoad && !feedErr && feedItems.length === 0 && (
                <div style={{ padding: 40, textAlign: "center", color: C.txtM, fontSize: 13, lineHeight: 1.6 }}>
                  {feedKeywords.length === 0 ? t.feedNoKeywords : t.feedEmpty}
                </div>
              )}
              {!feedLoad && feedItems.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {feedItems.map((it, i) => (
                    <a key={i} href={it.link} target="_blank" rel="noopener noreferrer"
                      style={{ display: "block", background: C.s2, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, textDecoration: "none", transition: "border-color 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = C.acc; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 9.5, fontWeight: 500, padding: "2px 7px", borderRadius: 4, background: C.accBg, color: C.acc }}>{it.source}</span>
                        {it.author && <span style={{ fontSize: 10.5, color: C.txtM }}>{it.author}</span>}
                        {it.date && <span style={{ fontSize: 10.5, color: C.txtM, marginLeft: "auto" }}>{it.date}</span>}
                      </div>
                      <div style={{ fontFamily: tFont, fontSize: 14.5, fontWeight: 500, color: C.txt, lineHeight: 1.5, marginBottom: 6 }}>
                        {it.title}
                      </div>
                      <div style={{ fontFamily: tFont, fontSize: 13, color: C.txtS, lineHeight: 1.9 }}>
                        {it.snippet}
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PROFILE */}
        {view === "profile" && profileDraft && (
          <div style={{ flex: 1, overflowY: "auto", display: "flex", justifyContent: "center" }}>
            <div style={{ width: "100%", maxWidth: 520, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 500, color: C.txt, marginBottom: 4 }}>{t.profileTitle}</div>
                <div style={{ fontSize: 12.5, color: C.txtS, lineHeight: 1.6 }}>{t.profileSub}</div>
              </div>

              {/* Detailed questionnaire CTA */}
              {!data.profile?.detailedDone && !showDetailed && (
                <button onClick={() => setShowDetailed(true)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 12, border: `1px solid ${C.acc}`, background: C.accBg, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", textAlign: "left", width: "100%" }}>
                  <span style={{ fontSize: 24 }}>🎯</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: C.acc, marginBottom: 2 }}>{t.detailedCta}</div>
                    <div style={{ fontSize: 11.5, color: C.txtS, lineHeight: 1.5 }}>{t.detailedSub}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.onAcc, background: C.acc, padding: "4px 9px", borderRadius: 10, whiteSpace: "nowrap", flexShrink: 0 }}>{t.detailedReward}</span>
                </button>
              )}
              {data.profile?.detailedDone && !showDetailed && (
                <button onClick={() => setShowDetailed(true)}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.okB}`, background: C.okBg, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", fontSize: 12.5, color: C.ok, width: "100%" }}>
                  ✓ {t.detailedDone_}
                </button>
              )}

              {/* Detailed questionnaire form */}
              {showDetailed && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: 16, borderRadius: 12, border: `1px solid ${C.acc}`, background: C.accBg }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.txt }}>{t.detailedTitle}</div>
                  {[
                    ["favFilms", t.favFilms, t.favFilmsPh],
                    ["favMusic", t.favMusic, t.favMusicPh],
                    ["favSports", t.favSports, t.favSportsPh],
                    ["favFood", t.favFood, t.favFoodPh],
                    ["favBooks", t.favBooks, t.favBooksPh],
                    ["favHobbies", t.favHobbies, t.favHobbiesPh],
                    ["dreamJobs", t.dreamJobs, t.dreamJobsPh],
                  ].map(([key, label, ph]) => (
                    <div key={key}>
                      <label style={{ fontSize: 12, fontWeight: 500, color: C.txt, display: "block", marginBottom: 5 }}>{label}</label>
                      <input value={profileDraft[key] || ""} onChange={e => setProfileDraft({ ...profileDraft, [key]: e.target.value })} placeholder={ph} style={fieldStyle} />
                    </div>
                  ))}
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                    {[
                      ["otherTools", t.otherTools, t.otherToolsPh],
                      ["bestMemory", t.bestMemory, t.bestMemoryPh],
                      ["worstMemory", t.worstMemory, t.worstMemoryPh],
                    ].map(([key, label, ph]) => (
                      <div key={key} style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 12, fontWeight: 500, color: C.txt, display: "block", marginBottom: 5 }}>{label}</label>
                        <textarea value={profileDraft[key] || ""} onChange={e => setProfileDraft({ ...profileDraft, [key]: e.target.value })} placeholder={ph} rows={2} style={fieldStyle} />
                      </div>
                    ))}
                  </div>
                  <button onClick={() => {
                    const alreadyDone = data.profile?.detailedDone;
                    let nd = { ...data, profile: { ...profileDraft, detailedDone: true } };
                    if (!alreadyDone) nd = awardPoints(100, nd);
                    save(nd);
                    setShowDetailed(false);
                    setProfileSavedMsg(true);
                    setTimeout(() => setProfileSavedMsg(false), 2000);
                  }}
                    style={{ padding: "10px", borderRadius: 8, background: C.acc, color: C.onAcc, border: "none", fontFamily: "'Plus Jakarta Sans'", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                    {data.profile?.detailedDone ? t.saveProfile : t.saveAndEarn}
                  </button>
                </div>
              )}

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 140px" }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: C.txt, display: "block", marginBottom: 5 }}>{t.genderLabel}</label>
                  <select value={profileDraft.gender || ""} onChange={e => setProfileDraft({ ...profileDraft, gender: e.target.value })}
                    style={{ ...fieldStyle, appearance: "auto", cursor: "pointer" }}>
                    <option value="">{t.genderNone}</option>
                    <option value="homme">{t.genderM}</option>
                    <option value="femme">{t.genderF}</option>
                  </select>
                </div>
                <div style={{ flex: "0 0 90px" }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: C.txt, display: "block", marginBottom: 5 }}>{t.ageLabel}</label>
                  <input type="number" min="1" max="120" value={profileDraft.age || ""} onChange={e => setProfileDraft({ ...profileDraft, age: e.target.value })}
                    placeholder={t.agePlaceholder} style={fieldStyle} />
                </div>
                <div style={{ flex: "2 1 200px" }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: C.txt, display: "block", marginBottom: 5 }}>{t.nationalityLabel}</label>
                  <input value={profileDraft.nationality || ""} onChange={e => setProfileDraft({ ...profileDraft, nationality: e.target.value })}
                    placeholder={t.nationalityPlaceholder} style={fieldStyle} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: C.txt, display: "block", marginBottom: 5 }}>{t.spokenLangsLabel}</label>
                <input value={profileDraft.spokenLanguages || ""} onChange={e => setProfileDraft({ ...profileDraft, spokenLanguages: e.target.value })}
                  placeholder={t.spokenLangsPlaceholder} style={fieldStyle} />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: C.txt, display: "block", marginBottom: 5 }}>✨ {t.onbTitle2}</label>
                <textarea value={profileDraft.dream || ""} onChange={e => setProfileDraft({ ...profileDraft, dream: e.target.value })}
                  placeholder={t.dreamPlaceholder} rows={2} style={fieldStyle} />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: C.txt, display: "block", marginBottom: 5 }}>{t.levelLabel}</label>
                <input value={profileDraft.level} onChange={e => setProfileDraft({ ...profileDraft, level: e.target.value })}
                  placeholder={t.levelPlaceholder} style={fieldStyle} />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: C.txt, display: "block", marginBottom: 5 }}>{t.interestsLabel}</label>
                <textarea value={profileDraft.interests} onChange={e => setProfileDraft({ ...profileDraft, interests: e.target.value })}
                  placeholder={t.interestsPlaceholder} rows={3} style={fieldStyle} />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: C.txt, display: "block", marginBottom: 5 }}>{t.goalsLabel}</label>
                <textarea value={profileDraft.goals} onChange={e => setProfileDraft({ ...profileDraft, goals: e.target.value })}
                  placeholder={t.goalsPlaceholder} rows={2} style={fieldStyle} />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: C.txt, display: "block", marginBottom: 5 }}>{t.notesLabel}</label>
                <textarea value={profileDraft.notes} onChange={e => setProfileDraft({ ...profileDraft, notes: e.target.value })}
                  placeholder={t.notesPlaceholder} rows={2} style={fieldStyle} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button onClick={saveProfile}
                    style={{ padding: "8px 22px", borderRadius: 6, background: C.acc, color: C.onAcc, border: "none", fontFamily: "'Plus Jakarta Sans'", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                    {t.saveProfile}
                  </button>
                  {profileSavedMsg && (
                    <span style={{ fontSize: 12, color: C.ok, fontWeight: 500 }}>✓ {t.profileSaved}</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: C.txtM, lineHeight: 1.5, fontStyle: "italic" }}>
                  💡 {t.profileAutoUpdate}
                </div>
              </div>

              {/* Lesson history */}
              {(data.summaries || []).length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.txt, marginBottom: 10 }}>{t.summaryHistory}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {[...(data.summaries || [])].reverse().map((s, i) => (
                      <SummaryCard key={s.id || i} summary={s} t={t} lang={lang} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return <ErrorBoundary><AppInner /></ErrorBoundary>;
}
