import { useState, useEffect, useRef, useCallback, useMemo, Component } from "react";
import { loadData, saveData, syncData, connectData, isSupabaseConfigured, DEFAULT_DATA, DEFAULT_PROFILE, DEFAULT_LANG_PROFILE } from "./storage.js";

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
    toAcqTitle: "Marquer comme Acquis ?", toAcqMsg: (k) => `« ${k} » rejoindra l'étagère « Acquis » (seul le titre y sera affiché).`,
    toStudiedTitle: "Remettre en Étudié ?", toStudiedMsg: (k) => `« ${k} » repassera parmi les cartes en apprentissage.`,
    confirmBtn: "Confirmer", learningShelf: "En apprentissage",
    statusNew: "Nouveau", statusInProgress: "En cours", statusStudied: "Étudié", statusAcquired: "Acquis",
    today: "Aujourd'hui", todayCards: (n) => `${n} carte${n > 1 ? "s" : ""}`, todayEmpty: "Toutes les cartes sont acquises, bravo ! 🎉", todayDone: "fait !",
    shelfMaskedHint: "sens masqué, à toi de deviner", shelfExpandHint: "clic pour dérouler", toStudied: "Remettre en Étudié",
    dailyCountLabel: "Cartes proposées chaque jour", markAcquired: "Marquer acquis",
    reviewCount: (n) => `${n} révision${n > 1 ? "s" : ""}`,
    importTitle: "Importer un texte",
    importSub: "Colle un article de blog, un extrait, ou n'importe quel texte coréen. L'IA va repérer les points pertinents pour ton niveau.",
    analyze: "Analyser ce texte", analyzing: "Analyse en cours...",
    importImage: "Importer une image", ocrLoading: "Extraction du texte...", ocrEmpty: "Aucun texte détecté dans l'image.",
    ocrNoTarget: (l) => `Aucun texte en ${l} n'a été détecté dans cette image. Tu t'es peut-être trompé d'image ?`,
    pointsFound: (n) => `${n} point${n > 1 ? "s" : ""} repéré${n > 1 ? "s" : ""} dans ton texte`,
    importAllKnown: "Tous les points de ce texte sont déjà dans ta bibliothèque — rien de nouveau à ajouter.",
    pickSub: "Choisis celui que tu veux étudier, ou marque ceux que tu connais déjà.",
    iKnow: "Je connais", addedAcq: "Ajouté (acquis)",
    startLesson: "Commencer la leçon", morePoints: "Trouver d'autres points",
    vocab: "Vocabulaire",
    importModeGrammar: "Grammaire", importModeVocab: "Vocabulaire", importModeComprehension: "Compréhension", importModeBulk: "Import en masse",
    importModeSub: "Que veux-tu étudier dans ce texte ?",
    bulkPickTitle: "Contenu extrait", bulkPickSub: "Deselecte ce que tu ne veux pas importer.", bulkAddToLib: "Ajouter a la biblio", bulkAdded: (n) => `${n} carte${n > 1 ? "s" : ""} ajoutee${n > 1 ? "s" : ""} !`, bulkNone: "Selectionne au moins un element.",
    bulkTagBtn: "Tagger", bulkTagTitle: "Tagger en masse", bulkTagApply: "Appliquer", bulkTagDone: "Terminer", bulkTagSelectAll: "Tout", bulkTagNone: "Aucun",
    compTitle: "Compréhension du texte", compLevel1: "Niveau 1 : QCM", compLevel2: "Niveau 2 : Reformulation",
    compParagraph: (i, n) => `Paragraphe ${i}/${n}`,
    compQuestion: "Question", compCheck: "Vérifier", compNext: "Suivant",
    compCorrect: "Bonne réponse !", compWrong: "Pas tout à fait.",
    compLevel1Done: "Niveau 1 terminé ! Tu veux tenter le niveau 2 ?",
    compStartLevel2: "Passer au niveau 2", compFinish: "Terminer",
    compReformulate: "Reformule en 1-2 phrases ce qui a été dit :",
    compYourReformulation: "Ta reformulation...",
    compIllustration: "Illustration",
    compIllustrationLoading: "Recherche d'illustration...",
    compEncourage: "Pas besoin de connaître tout le vocabulaire, l'important c'est de saisir le sens général !",
    compSaved: "Compréhension sauvegardée !",
    compResume: "Reprendre", compLevel: (n) => `Niveau ${n}`,
    compDone: "Terminé",
    compInTargetLang: "Questions en langue cible", compInInterfaceLang: "Questions en français",
    vocabPickTitle: "Mots à étudier", vocabPickSub: "Désélectionne ceux que tu connais déjà.",
    studyTheseWords: "Étudier ces mots", vocabNoneSelected: "Sélectionne au moins un mot.",
    vocabStepGuess: "Devine le sens", vocabStepEtym: "Étymologie", vocabStepSyn: "Synonymes & mots liés",
    vocabStepFun: "Le sais-tu ?", vocabStepEx: "Autres exemples",
    vocabNext: "Suivant", vocabNextWord: "Mot suivant →", vocabFinishBtn: "Terminer",
    vocabCorrect: "Correct ✓", vocabWrong: "Pas tout à fait", vocabWordOf: (i, n) => `Mot ${i}/${n}`,
    vocabDone: "Vocab étudié ✓", vocabExitConfirm: "Quitter l'étude du vocabulaire ?",
    exerciseTitle: "Exercices",
    exerciseSub: "Choisis une catégorie, puis un exercice.",
    exCatCE: "Compréhension Écrite", exCatCEDesc: "Lire et comprendre",
    exCatCO: "Compréhension Orale", exCatCODesc: "Écouter et comprendre",
    exCatPE: "Production Écrite", exCatPEDesc: "Écrire et produire",
    exCatPO: "Production Orale", exCatPODesc: "Parler et s'exprimer",
    exPickExercise: "Choisis un exercice",
    exPickCards: "Choisis les cartes à travailler",
    exBackToCat: "Catégories",
    exBackToEx: "Exercices",
    story: "Continue l'histoire", storyDesc: "L'IA commence une histoire, tu la continues avec les structures choisies.",
    qcm: "QCM", qcmDesc: "Teste tes connaissances.",
    fillBlanks: "Histoire à trous", fillDesc: "Complète une histoire générée avec les mots choisis.",
    exMatch: "Relier", exMatchDesc: "Associe chaque mot à sa définition.",
    exCross: "Mots croisés", exCrossDesc: "Retrouve les mots à partir des définitions.",
    exFlash: "Flashcards", exFlashDesc: "Retourne les cartes pour réviser le vocabulaire.",
    exDictation: "Dictée", exDictationDesc: "Écoute le mot ou la phrase et écris-le.",
    exYouglish: "Vidéo en contexte", exYouglishDesc: "Voir le mot utilisé dans une vraie vidéo.",
    exDialogueFill: "Dialogue à trous", exDialogueFillDesc: "Complète un dialogue généré avec les mots choisis.",
    flashKnow: "Je sais", flashReview: "À revoir", flashProgress: (i, n) => `${i} / ${n}`, flashScore: (k, r) => `${k} su${k > 1 ? "s" : ""}, ${r} à revoir`,
    flashDone: "Bravo pour ta révision !", flashRemaining: (n) => `${n} restante${n > 1 ? "s" : ""}`,
    exImgWrite: "Image -> Mot", exImgWriteDesc: "Retrouve le mot à partir de son image.",
    imgWriteHint: "Écris le mot correspondant à l'image", imgWriteCheck: "Vérifier", imgWriteCorrect: "Correct !", imgWriteWrong: (w) => `C'était : ${w}`, imgWriteNext: "Suivant",
    exNeedImages: "Pas assez de mots avec image pour cet exercice (choisis-en d'autres).",
    exVocabOnly: "Vocabulaire uniquement",
    matchWords: "Mots", matchDefs: "Définitions", exRestart: "Recommencer",
    exNeedWords: "Pas assez de mots adaptés pour cet exercice (choisis-en d'autres).",
    crossCheck: "Vérifier", crossSolved: "Grille complétée !", crossHint: "Une case = une syllabe. Remplis à partir des définitions.", crossNextLvl: "Niveau suivant →",
    fillWordBank: "Banque de mots", fillCheck: "Vérifier mes réponses", fillScore: (c, t) => `${c}/${t} correct${c > 1 ? "s" : ""}`,
    fillCorrect: "Bonne réponse !", fillWrong: (w) => `Réponse : ${w}`, fillDone: "Bravo pour cet exercice !", fillTryAgain: "Bien essayé ! Tu veux retenter ?", fillRetry: "Réessayer",
    fillNewStory: "Nouvelle histoire", fillTapBlank: "Touche un trou, puis un mot de la banque.", fillTapWord: "Touche un mot du texte pour le traduire.",
    fillTranslateStory: "Traduire l'histoire", fillAddVocab: "Ajouter à la biblio", fillListen: "Écouter", fillListenStop: "Arrêter",
    fillThemeLabel: "Thème du scénario", fillThemeRandom: "Surprise !", fillThemes: ["Vie quotidienne", "Amis / sorties", "K-drama", "K-pop / fandom", "Réseaux sociaux", "Travail / business", "Café / restaurant", "Voyage en Corée"],
    crossAcross: "Horizontal", crossDown: "Vertical",
    crossLvl1: "Niveau 1 · mots affichés", crossLvl2: "Niveau 2 · de mémoire", crossLvl3: "Niveau 3 · indices en langue cible",
    genTargetDesc: "Définition en langue cible", genTargetDescDone: "Définition générée !",
    etymBtn: "Étymologie & racines", etymLoading: "Recherche étymologique...", etymDone: "Étymologie générée !",
    rootWordsBtn: "Mots de la même famille", rootWordsAsk: "Montre-moi plus de mots partageant les mêmes racines",
    shelfTagged: "Catégorisé", shelfUntagged: "Non catégorisé",
    exGender: "Le ou La ?", exGenderDesc: "Choisis le bon article pour chaque nom.",
    genderQuestion: "Masculin ou féminin ?", genderDone: "Bravo !",
    genderScore: (c, t) => `${c}/${t} correct${c > 1 ? "s" : ""}`,
    exRandom: "Au hasard",
    exMusicOn: "Musique", exMusicOff: "Musique",
    progressTitle: "Pratiquer", progressGlobal: "Global",
    progressReviews: (n, r) => `${n}/${r} révision${n > 1 ? "s" : ""}`,
    progressNextReview: "Prochaine révision recommandée",
    progressNextDays: (n) => n === 0 ? "aujourd'hui" : n === 1 ? "demain" : `dans ${n} jour${n > 1 ? "s" : ""}`,
    progressCanPractice: "Vous pouvez néanmoins vous entraîner aujourd'hui.",
    progressJustDiscovered: "Vous venez à peine de découvrir cette carte. Mais si vous voulez, vous pouvez déjà vous entraîner.",
    progressAlreadyDone: "Vous vous êtes déjà entraîné aujourd'hui, mais vous pouvez réviser encore si vous voulez.",
    progressNextPast: "En retard",
    progressAcquired: "Acquise !",
    progressAutoAcquired: "Carte acquise ! Répétition espacée terminée.",
    progressNewReview: "Nouvelle révision enregistrée !",
    availableCards: "Cartes disponibles (acquises)", launchEx: "Lancer l'exercice",
    moreExamples: "Plus d'exemples", onlineRes: "Ressources complémentaires", realExamples: "Exemples authentiques", searching: "Recherche en cours...", sources: "Sources", showTranslations: "Traductions", tapToReveal: "Touche les zones floues pour révéler la traduction",
    resourcesAsk: "Peux-tu me donner des ressources supplémentaires sur ce point, s'il te plaît ? 📚",
    askExamples: "Donne-moi plus d'exemples, s'il te plaît 💡",
    askExercise: "Propose-moi un petit exercice, s'il te plaît ✏️",
    askExplain: "Peux-tu m'expliquer ça autrement ? 🔄",
    anExercise: "Un exercice", explainOther: "Expliquer autrement", anImage: "Une image", youglishBtn: "Une vidéo",
    askImage: "Montre-moi une image de ce mot 📷", imageNone: "Aucune image trouvée pour ce mot.",
    otherImages: "D'autres images", refineImage: "Préciser (ex. dessin, réel…)",
    imgChoose: "Choisir", imgAdded: "Image ajoutée ✓", imgAlready: "Image déjà sur la carte",
    cardImages: "Images de la carte", imgReplaceTitle: "2 images déjà — laquelle remplacer ?", imgMain: "Principale", imgSwap: "Changer l'ordre", imgRemove: "Retirer l'image", imgReplaceCancel: "Annuler",
    studyChooseTitle: "Comment veux-tu étudier ce mot ?",
    studyLesson: "Leçon complète", studyLessonDesc: "Découverte guidée, questions, exemples",
    studyDirect: "Juste la traduction", studyDirectDesc: "Le sens directement (mot facile)",
    directLoading: "Récupération du sens…",
    addToVocab: "Ajouter au vocab", addedToVocab: "Ajouté à ta bibliothèque ✓", alreadyInLib: "Déjà dans ta bibliothèque", selectionSource: "Sélection",
    yourAnswer: "Votre réponse...", askQuestion: "Une question ? Pose-la ici.", grammar: "Grammaire", expression: "Expression",
    points: "points", toReview: "à revoir", acq: "acquis",
    noCards: "Aucune carte pour le moment. Importe un texte pour commencer !",
    placeholder: "큰아이는 요즘 자기가 원하는 게 생기면\n\"엄마, 나 이거 사도 돼요?\"라고 꼭 허락을 구한다...",
    back: "Retour", thinking: "Réflexion...",
    leaveTitle: "Quitter la leçon ?", leaveBody: "Tu as une leçon en cours. Que veux-tu faire ?",
    leaveKeep: "Garder et reprendre plus tard", leaveDiscard: "Quitter sans sauvegarder", leaveCancel: "Annuler",
    resumeTitle: "Reprendre la leçon ?", resumeBody: "Tu as une session en cours pour cette carte.",
    resumeBtn: "Reprendre", restartBtn: "Recommencer",
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
    profileSaved: "Enregistré !", autoSaveHint: "Enregistrement automatique",
    saveProfile: "Enregistrer",
    langProfileTitle: (flag, name) => `Profil pour ${flag} ${name}`,
    langProfileSub: "Adapte ces informations pour cette langue. Elles aident l'IA à personnaliser tes leçons.",
    langProfilePrefill: "Pré-rempli depuis ton profil existant. Modifie ce que tu veux !",
    langProfileSave: "Continuer",
    langProfileSkip: "Plus tard",
    langDreamLabel: "Ton rêve le plus fou avec cette langue",
    langLevelLabel: "Ton niveau dans cette langue",
    langGoalsLabel: "Tes objectifs",
    langToolsLabel: "Outils utilisés en parallèle pour cette langue",
    langDailyLabel: "Cartes par jour",
    langNotesLabel: "Tes notes personnelles",
    langTeacherNotesLabel: "Notes du professeur",
    genderLabel: "Genre",
    genderNone: "Non renseigné(e)",
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
    wrapUpTitle: "Tu peux conclure la leçon, ou aller un peu plus loin :",
    summaryTitle: "Résumé de la leçon",
    endPractice: "Terminer la pratique",
    practiceWrapUp: "Tu peux terminer et générer un résumé :",
    practiceExitWarn: (n) => `Si tu quittes maintenant, aucun résumé ne sera généré. Encore ${n} tour${n > 1 ? "s" : ""} avant le résumé. Quitter quand même ?`,
    goalsTab: "Objectifs",
    goalCreate: "Créer un objectif",
    goalName: "Nom de l'objectif",
    goalNamePh: "Ex : Topik II, Cours du 7 octobre...",
    goalDeadline: "Date limite",
    goalCards: "Cartes associées",
    goalNoCards: "Aucune carte associée",
    goalAddCards: "Ajouter des cartes",
    goalImportText: "Importer un texte",
    goalDailyTarget: "Voilà comment on s'organise par rapport à ta date limite :",
    goalCardsPerDay: (n) => `~${n} carte${n > 1 ? "s" : ""} / jour`,
    goalDiscoverPerDay: (n) => `Tu découvriras ~${n} nouvelle${n > 1 ? "s" : ""} carte${n > 1 ? "s" : ""} par jour`,
    goalPracticePerDay: (n) => `et en fonction des jours, tu pourras avoir jusqu'à environ ${n} révision${n > 1 ? "s" : ""} à faire`,
    goalRecommendR: (r) => `Je te recommande de réviser chaque carte ${r} fois avant la date limite.`,
    goalTodayTitle: "Aujourd'hui",
    goalTodayDiscover: "À découvrir",
    goalTodayPractice: "À pratiquer",
    goalTodayAllDone: "Tout est fait pour aujourd'hui !",
    goalEditDeadline: "Modifier la date",
    goalDaysLeft: (n) => n <= 0 ? "Délai dépassé" : `${n} jour${n > 1 ? "s" : ""} restant${n > 1 ? "s" : ""}`,
    goalProgress1: "Découvertes",
    goalProgress3: "Révisions",
    goalProgress2: "Acquises",
    goalEmpty: "Pas encore d'objectif. Crée ton premier objectif !",
    goalDelete: "Supprimer l'objectif",
    goalDeleteConfirm: "Supprimer cet objectif ?",
    goalDeleteCards: "Supprimer aussi les cartes associées ?",
    goalDeleteKeep: "Garder les cartes",
    goalDeleteRemove: "Supprimer les cartes",
    goalCancel: "Annuler",
    goalDeadlineTitle: "La deadline est arrivée !",
    goalDeadlineMsg: "Bravo pour tes progrès !",
    goalDeadlineTest: "Si tu as été testé(e), comment s'est passé ton test ?",
    goalDeadlineGreat: "Super, merci pour ton aide !",
    goalDeadlineMedium: "Moyen",
    goalDeadlineBad: "Bof",
    goalDeadlineNoTest: "Je n'ai pas eu de test",
    goalDeadlineReplyGreat: "Je suis content pour toi !",
    goalDeadlineReplyMedium: "Tu as fait de ton mieux, j'en suis sûr !",
    goalDeadlineStats: "Voici tes statistiques actuelles.",
    goalDeadlineWhat: "Que veux-tu faire à présent ?",
    goalDeadlineArchive: "Archiver l'objectif et garder les cartes pour réviser à long terme",
    goalDeadlineExtend: "Repousser la deadline",
    goalDeadlineDelete: "Supprimer l'objectif et ses cartes",
    goalDeadlineDeleteWarn: "(non recommandé)",
    goalSave: "Créer",
    goalUpdate: "Mettre à jour",
    goalTrophyHall: "Hall des trophées",
    goalNoTrophy: "Aucun trophée pour le moment.",
    goalCompleted: "Terminé le",
    goalExpired: "Le délai est dépassé. Prolonger ?",
    goalExtend: "Prolonger",
    goalNewDeadline: "Nouvelle date limite",
    goalMilestone: (pct) => `${pct}% de l'objectif atteint !`,
    goalCardCount: (n) => `${n} carte${n > 1 ? "s" : ""}`,
    goalOf: "sur",
    goalPickCards: "Sélectionner des cartes",
    goalPickSub: "Choisis les cartes à associer à cet objectif.",
    goalImportScreenshots: "Importer des screenshots",
    goalImportPaste: "ou coller une image (Ctrl+V)",
    goalImportOcr: "Lecture des images...",
    goalImportScanning: "Analyse en cours...",
    goalImportConfirm: "Ajouter à l'objectif",
    goalImportCancel: "Annuler l'import",
    goalOverdue: "En retard",
    goalActive: "En cours",
    generating: "Génération du résumé...",
    summaryHistory: "Historique des leçons",
    noSummaries: "Aucune leçon terminée pour le moment.",
    summaryLearned: "Ce qui a été compris",
    summaryMistakes: "Points à clarifier",
    summaryNext: "Prochaines étapes",
    newLesson: "Nouvelle leçon",
    derivedTitle: "Structures rencontrées",
    derivedSub: "Coche celles que tu veux ajouter à ta bibliothèque (rien n'est ajouté sans toi).",
    derivedAdd: (n) => n > 0 ? `Ajouter (${n})` : "Ajouter",
    derivedAll: "Tout cocher",
    derivedNone: "Tout décocher",
    derivedSkip: "Ignorer",
    formalityLabel: "Registre",
    formality: { casual: "courant", neutral: "neutre", formal: "formel" },
    registerNoFormal: "Pas de forme formelle", registerNoCasual: "Pas de forme courante",
    registerShow: "Voir le registre (formel / courant)", registerExamples: "Exemples d'usage",
    registerExamplesAsk: "Montre-moi des exemples qui contrastent l'usage formel et courant de ce mot, s'il te plaît",
    registerLoading: "Analyse du registre…",
    moreExercises: "Plus d'exercices",
    derivedFrom: "issu de", derivedChildren: "a donné",
    viewGrid: "Grille",
    viewTree: "Arbre",
    viewSources: "Textes",
    deleteCard: "Supprimer la carte", deleteConfirmTitle: "Supprimer cette carte ?",
    deleteConfirmMsg: (k) => `« ${k} » sera supprimée définitivement, ainsi que ses récaps.`,
    deleteBtn: "Supprimer", cancelBtn: "Annuler",
    filterAll: "Tout", filterGrammar: "Grammaire", filterVocab: "Vocab",
    filterByTag: "Filtrer par tag", allTags: "Tous les tags",
    addTag: "Ajouter un tag", removeTag: "Retirer", tagMax: "3 tags maximum", tagRelated: "Cartes avec ce tag", tagNoOther: "Aucune autre carte avec ce tag",
    tagPlaceholder: "Nouveau tag...", tagSuggested: "Suggéré",
    noTags: "Aucun tag",
    restudyText: "Réétudier ce texte",
    sourcesNone: "Sans texte d'origine",
    pointsFromText: "Points associés",
    recapExcerpt: "Extrait du récap",
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
    langColLang: "Langue", langColLevel: "Niveau", langAddRow: "+ Ajouter une langue",
    langPh: "ex : Français", langLevelPick: "Niveau…",
    langLevelNative: "Langue maternelle", langLevelBilingual: "Bilingue", langLevelAdvanced: "Avancé", langLevelIntermediate: "Intermédiaire",
    myNotesLabel: "Mes notes", teacherNotesLabel: "Notes du professeur", teacherNotesEmpty: "Aucune note du professeur pour l'instant.",
    myNotesPlaceholder: "Tes propres notes : objectifs perso, rappels, préférences...",
    contact: "Contact", contactSub: "Besoin d'aide ? Écris-nous.",
    onbNext: "Suivant",
    onbSkip: "Passer",
    onbFinish: "C'est parti !",
    onbStep: (a, b) => `${a} / ${b}`,
    // Points
    points_: "points",
    pointsEarned: (n) => `+${n} point${n > 1 ? "s" : ""} !`,
    dailyGoalReached: (n) => `Objectif du jour atteint ! +${n} points 🎉`,
    // Detailed questionnaire
    detailedTitle: "Questionnaire détaillé",
    detailedSub: "Plus l'IA te connaît, plus tes leçons seront taillées pour toi. Chaque réponse rend les exemples plus vivants.",
    detailedCta: "Compléter mon profil",
    detailedReward: "+100 points",
    detailedDone_: "Questionnaire complété ✓",
    editAnswers: "Éditer mes réponses",
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
    quickPractice: "Approfondir",
    quickPracticeSub: "Explore cette structure autrement.",
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
    feedThreadTitle: "Fil",
    feedThreadEmpty: "Ce post n'a pas pu être chargé.",
    feedCatNews: "Actu",
    feedCatPress: "Manchettes",
    feedCatSns: "Bluesky",
    feedCatMasto: "Mastodon",
    feedCatRecap: "📰 Journal",
    recapMasthead: "Le Quotidien coréen",
    recapGeneralTitle: "À la une aujourd'hui",
    recapInterestTitle: "Autour de ton rêve",
    recapRefresh: "Rafraîchir",
    recapLoading: "Édition du jour en préparation…",
    recapEmpty: "Pas d'actualité trouvée pour aujourd'hui.",
    recapInterestHint: "Renseigne ton rêve dans le Profil pour une rubrique sur mesure.",
    recapRawNote: "Traduction indisponible (quota IA) — titres affichés en version d'origine.",
    recapEdition: (d) => `Édition du ${d}`,
    feedGenKeywords: "Génération des sujets...",
    exFinished: "Exercice terminé !",
    newExercise: "Nouvel exercice",
    backToLibrary: "Bibliothèque",
  },
  en: {
    library: "Library", lesson: "Lesson", import: "Import", exercise: "Exercise",
    profile: "Profile",
    review: "To review", acquired: "Acquired", reviewBtn: "Review",
    toAcqTitle: "Mark as Acquired?", toAcqMsg: (k) => `"${k}" will move to the "Acquired" shelf (only the title is shown there).`,
    toStudiedTitle: "Move back to Studied?", toStudiedMsg: (k) => `"${k}" will return to the cards you're still learning.`,
    confirmBtn: "Confirm", learningShelf: "Learning",
    statusNew: "New", statusInProgress: "In progress", statusStudied: "Studied", statusAcquired: "Acquired",
    today: "Today", todayCards: (n) => `${n} card${n > 1 ? "s" : ""}`, todayEmpty: "All cards acquired, great job! 🎉", todayDone: "done!",
    shelfMaskedHint: "meaning hidden — guess it", shelfExpandHint: "click to expand", toStudied: "Move back to Studied",
    dailyCountLabel: "Cards suggested each day", markAcquired: "Mark acquired",
    reviewCount: (n) => `${n} review${n > 1 ? "s" : ""}`,
    importTitle: "Import a text",
    importSub: "Paste a blog article or any Korean text. The AI will find relevant points for your level.",
    analyze: "Analyze this text", analyzing: "Analyzing...",
    importImage: "Import an image", ocrLoading: "Extracting text...", ocrEmpty: "No text detected in the image.",
    ocrNoTarget: (l) => `No ${l} text was detected in this image. Did you maybe pick the wrong image?`,
    pointsFound: (n) => `${n} point${n > 1 ? "s" : ""} found in your text`,
    importAllKnown: "All the points in this text are already in your library — nothing new to add.",
    pickSub: "Choose one to study, or mark the ones you already know.",
    iKnow: "I know this", addedAcq: "Added (acquired)",
    startLesson: "Start lesson", morePoints: "Find more points",
    vocab: "Vocabulary",
    importModeGrammar: "Grammar", importModeVocab: "Vocabulary", importModeComprehension: "Comprehension", importModeBulk: "Bulk import",
    importModeSub: "What do you want to study in this text?",
    bulkPickTitle: "Extracted content", bulkPickSub: "Deselect what you don't want to import.", bulkAddToLib: "Add to library", bulkAdded: (n) => `${n} card${n > 1 ? "s" : ""} added!`, bulkNone: "Select at least one item.",
    bulkTagBtn: "Tag", bulkTagTitle: "Bulk tag", bulkTagApply: "Apply", bulkTagDone: "Done", bulkTagSelectAll: "All", bulkTagNone: "None",
    compTitle: "Text Comprehension", compLevel1: "Level 1: QCM", compLevel2: "Level 2: Reformulation",
    compParagraph: (i, n) => `Paragraph ${i}/${n}`,
    compQuestion: "Question", compCheck: "Check", compNext: "Next",
    compCorrect: "Correct!", compWrong: "Not quite.",
    compLevel1Done: "Level 1 complete! Want to try Level 2?",
    compStartLevel2: "Go to Level 2", compFinish: "Finish",
    compReformulate: "Reformulate in 1-2 sentences what was said:",
    compYourReformulation: "Your reformulation...",
    compIllustration: "Illustration",
    compIllustrationLoading: "Searching for illustration...",
    compEncourage: "You don't need to know every word, what matters is grasping the overall meaning!",
    compSaved: "Comprehension saved!",
    compResume: "Resume", compLevel: (n) => `Level ${n}`,
    compDone: "Done",
    compInTargetLang: "Questions in target language", compInInterfaceLang: "Questions in English",
    vocabPickTitle: "Words to study", vocabPickSub: "Deselect the ones you already know.",
    studyTheseWords: "Study these words", vocabNoneSelected: "Select at least one word.",
    vocabStepGuess: "Guess the meaning", vocabStepEtym: "Etymology", vocabStepSyn: "Synonyms & related",
    vocabStepFun: "Did you know?", vocabStepEx: "More examples",
    vocabNext: "Next", vocabNextWord: "Next word →", vocabFinishBtn: "Finish",
    vocabCorrect: "Correct ✓", vocabWrong: "Not quite", vocabWordOf: (i, n) => `Word ${i}/${n}`,
    vocabDone: "Vocab studied ✓", vocabExitConfirm: "Leave vocabulary study?",
    exerciseTitle: "Exercises",
    exerciseSub: "Choose a category, then an exercise.",
    exCatCE: "Reading Comprehension", exCatCEDesc: "Read and understand",
    exCatCO: "Listening Comprehension", exCatCODesc: "Listen and understand",
    exCatPE: "Written Production", exCatPEDesc: "Write and produce",
    exCatPO: "Oral Production", exCatPODesc: "Speak and express",
    exPickExercise: "Choose an exercise",
    exPickCards: "Choose the cards to work on",
    exBackToCat: "Categories",
    exBackToEx: "Exercises",
    story: "Continue the story", storyDesc: "The AI starts a story, you continue it using the chosen structures.",
    qcm: "Random quiz", qcmDesc: "Questions on new random examples.",
    fillBlanks: "Story fill-in", fillDesc: "Complete a generated story with chosen words.",
    exMatch: "Match", exMatchDesc: "Match each word to its definition.",
    exCross: "Crossword", exCrossDesc: "Find the words from their definitions.",
    exFlash: "Flashcards", exFlashDesc: "Flip cards to review vocabulary.",
    exDictation: "Dictation", exDictationDesc: "Listen to the word or sentence and write it.",
    exYouglish: "Video in context", exYouglishDesc: "See the word used in a real video.",
    exDialogueFill: "Dialogue fill-in", exDialogueFillDesc: "Complete a generated dialogue with chosen words.",
    flashKnow: "I know", flashReview: "Review", flashProgress: (i, n) => `${i} / ${n}`, flashScore: (k, r) => `${k} known, ${r} to review`,
    flashDone: "Great review session!", flashRemaining: (n) => `${n} remaining`,
    exImgWrite: "Image -> Word", exImgWriteDesc: "Find the word from its image.",
    imgWriteHint: "Write the word matching the image", imgWriteCheck: "Check", imgWriteCorrect: "Correct!", imgWriteWrong: (w) => `It was: ${w}`, imgWriteNext: "Next",
    exNeedImages: "Not enough words with images for this exercise (pick some others).",
    exVocabOnly: "Vocabulary only",
    matchWords: "Words", matchDefs: "Definitions", exRestart: "Play again",
    exNeedWords: "Not enough suitable words for this exercise (pick some others).",
    crossCheck: "Check", crossSolved: "Grid complete!", crossHint: "One cell = one syllable. Fill it in from the clues.", crossNextLvl: "Next level →",
    fillWordBank: "Word bank", fillCheck: "Check my answers", fillScore: (c, t) => `${c}/${t} correct`,
    fillCorrect: "Correct!", fillWrong: (w) => `Answer: ${w}`, fillDone: "Great job on this exercise!", fillTryAgain: "Nice try! Want to try again?", fillRetry: "Try again",
    fillNewStory: "New story", fillTapBlank: "Tap a blank, then a word from the bank.", fillTapWord: "Tap a word in the text to translate it.",
    fillTranslateStory: "Translate story", fillAddVocab: "Add to library", fillListen: "Listen", fillListenStop: "Stop",
    fillThemeLabel: "Scenario theme", fillThemeRandom: "Surprise me!", fillThemes: ["Daily life", "Friends / hangouts", "K-drama", "K-pop / fandom", "Social media", "Work / business", "Cafe / restaurant", "Travel in Korea"],
    crossAcross: "Across", crossDown: "Down",
    crossLvl1: "Level 1 · words shown", crossLvl2: "Level 2 · from memory", crossLvl3: "Level 3 · clues in target language",
    genTargetDesc: "Definition in target language", genTargetDescDone: "Definition generated!",
    etymBtn: "Etymology & roots", etymLoading: "Looking up etymology...", etymDone: "Etymology generated!",
    rootWordsBtn: "Related word family", rootWordsAsk: "Show me more words sharing the same roots",
    shelfTagged: "Categorized", shelfUntagged: "Uncategorized",
    exGender: "Le or La?", exGenderDesc: "Pick the correct article for each noun.",
    genderQuestion: "Masculine or feminine?", genderDone: "Well done!",
    genderScore: (c, t) => `${c}/${t} correct`,
    exRandom: "Random",
    exMusicOn: "Music", exMusicOff: "Music",
    progressTitle: "Practice", progressGlobal: "Overall",
    progressReviews: (n, r) => `${n}/${r} review${n > 1 ? "s" : ""}`,
    progressNextReview: "Next recommended review",
    progressNextDays: (n) => n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} day${n > 1 ? "s" : ""}`,
    progressCanPractice: "You can still practice today.",
    progressJustDiscovered: "You just discovered this card. But you can already practice if you want.",
    progressAlreadyDone: "You already practiced today, but you can review again if you want.",
    progressNextPast: "Overdue",
    progressAcquired: "Acquired!",
    progressAutoAcquired: "Card acquired! Spaced repetition complete.",
    progressNewReview: "New review recorded!",
    availableCards: "Available cards (acquired)", launchEx: "Launch exercise",
    moreExamples: "More examples", onlineRes: "Further resources", realExamples: "Real examples", searching: "Searching...", sources: "Sources", showTranslations: "Translations", tapToReveal: "Tap blurred areas to reveal the translation",
    resourcesAsk: "Could you give me some extra resources on this point, please? 📚",
    askExamples: "Could you give me more examples, please? 💡",
    askExercise: "Could you give me a quick exercise, please? ✏️",
    askExplain: "Could you explain this differently? 🔄",
    anExercise: "An exercise", explainOther: "Explain differently", anImage: "An image", youglishBtn: "In video",
    askImage: "Show me an image of this word 📷", imageNone: "No image found for this word.",
    otherImages: "Other images", refineImage: "Refine (e.g. drawing, real…)",
    imgChoose: "Choose", imgAdded: "Image added ✓", imgAlready: "Image already on the card",
    cardImages: "Card images", imgReplaceTitle: "2 images already — which one to replace?", imgMain: "Main", imgSwap: "Reorder", imgRemove: "Remove image", imgReplaceCancel: "Cancel",
    studyChooseTitle: "How do you want to study this word?",
    studyLesson: "Full lesson", studyLessonDesc: "Guided discovery, questions, examples",
    studyDirect: "Just the translation", studyDirectDesc: "The meaning directly (easy word)",
    directLoading: "Fetching the meaning…",
    addToVocab: "Add to vocab", addedToVocab: "Added to your library ✓", alreadyInLib: "Already in your library", selectionSource: "Selection",
    yourAnswer: "Your answer...", askQuestion: "Got a question? Ask here.", grammar: "Grammar", expression: "Expression",
    points: "points", toReview: "to review", acq: "acquired",
    noCards: "No cards yet. Import a text to get started!",
    placeholder: "큰아이는 요즘 자기가 원하는 게 생기면\n\"엄마, 나 이거 사도 돼요?\"라고 꼭 허락을 구한다...",
    back: "Back", thinking: "Thinking...",
    leaveTitle: "Leave the lesson?", leaveBody: "You have a lesson in progress. What would you like to do?",
    leaveKeep: "Keep and resume later", leaveDiscard: "Leave without saving", leaveCancel: "Cancel",
    resumeTitle: "Resume the lesson?", resumeBody: "You have a session in progress for this card.",
    resumeBtn: "Resume", restartBtn: "Start over",
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
    profileSaved: "Saved!", autoSaveHint: "Saved automatically",
    saveProfile: "Save",
    langProfileTitle: (flag, name) => `Profile for ${flag} ${name}`,
    langProfileSub: "Customize these settings for this language. They help the AI personalize your lessons.",
    langProfilePrefill: "Pre-filled from your existing profile. Edit what you like!",
    langProfileSave: "Continue",
    langProfileSkip: "Later",
    langDreamLabel: "Your biggest dream with this language",
    langLevelLabel: "Your level in this language",
    langGoalsLabel: "Your goals",
    langToolsLabel: "Other tools you use for this language",
    langDailyLabel: "Cards per day",
    langNotesLabel: "Your personal notes",
    langTeacherNotesLabel: "Teacher's notes",
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
    wrapUpTitle: "You can wrap up the lesson, or go a little further:",
    summaryTitle: "Lesson summary",
    endPractice: "End practice",
    practiceWrapUp: "You can finish and generate a summary:",
    practiceExitWarn: (n) => `If you leave now, no summary will be generated. ${n} turn${n > 1 ? "s" : ""} remaining before the summary. Leave anyway?`,
    goalsTab: "Goals",
    goalCreate: "Create a goal",
    goalName: "Goal name",
    goalNamePh: "E.g.: Topik II, October 7 class...",
    goalDeadline: "Deadline",
    goalCards: "Associated cards",
    goalNoCards: "No cards associated",
    goalAddCards: "Add cards",
    goalImportText: "Import text",
    goalDailyTarget: "Here's how we organize based on your deadline:",
    goalCardsPerDay: (n) => `~${n} card${n > 1 ? "s" : ""} / day`,
    goalDiscoverPerDay: (n) => `You'll discover ~${n} new card${n > 1 ? "s" : ""} per day`,
    goalPracticePerDay: (n) => `and depending on the day, you may have up to around ${n} review${n > 1 ? "s" : ""} to do`,
    goalRecommendR: (r) => `I recommend reviewing each card ${r} time${r > 1 ? "s" : ""} before the deadline.`,
    goalTodayTitle: "Today",
    goalTodayDiscover: "To discover",
    goalTodayPractice: "To practice",
    goalTodayAllDone: "All done for today!",
    goalEditDeadline: "Change date",
    goalDaysLeft: (n) => n <= 0 ? "Overdue" : `${n} day${n > 1 ? "s" : ""} left`,
    goalProgress1: "Discovered",
    goalProgress3: "Reviews",
    goalProgress2: "Acquired",
    goalEmpty: "No goals yet. Create your first goal!",
    goalDelete: "Delete goal",
    goalDeleteConfirm: "Delete this goal?",
    goalDeleteCards: "Also delete the associated cards?",
    goalDeleteKeep: "Keep cards",
    goalDeleteRemove: "Delete cards",
    goalCancel: "Cancel",
    goalDeadlineTitle: "The deadline has arrived!",
    goalDeadlineMsg: "Well done on your progress!",
    goalDeadlineTest: "If you were tested, how did it go?",
    goalDeadlineGreat: "Great, thanks for your help!",
    goalDeadlineMedium: "So-so",
    goalDeadlineBad: "Not great",
    goalDeadlineNoTest: "I didn't have a test",
    goalDeadlineReplyGreat: "I'm happy for you!",
    goalDeadlineReplyMedium: "You did your best, I'm sure!",
    goalDeadlineStats: "Here are your current stats.",
    goalDeadlineWhat: "What would you like to do now?",
    goalDeadlineArchive: "Archive the goal and keep cards for long-term review",
    goalDeadlineExtend: "Extend the deadline",
    goalDeadlineDelete: "Delete the goal and its cards",
    goalDeadlineDeleteWarn: "(not recommended)",
    goalSave: "Create",
    goalUpdate: "Update",
    goalTrophyHall: "Trophy hall",
    goalNoTrophy: "No trophies yet.",
    goalCompleted: "Completed on",
    goalExpired: "Deadline passed. Extend?",
    goalExtend: "Extend",
    goalNewDeadline: "New deadline",
    goalMilestone: (pct) => `${pct}% of the goal reached!`,
    goalCardCount: (n) => `${n} card${n > 1 ? "s" : ""}`,
    goalOf: "of",
    goalPickCards: "Select cards",
    goalPickSub: "Choose cards to associate with this goal.",
    goalImportScreenshots: "Import screenshots",
    goalImportPaste: "or paste an image (Ctrl+V)",
    goalImportOcr: "Reading images...",
    goalImportScanning: "Analyzing...",
    goalImportConfirm: "Add to goal",
    goalImportCancel: "Cancel import",
    goalOverdue: "Overdue",
    goalActive: "Active",
    generating: "Generating summary...",
    summaryHistory: "Lesson history",
    noSummaries: "No completed lessons yet.",
    summaryLearned: "What was understood",
    summaryMistakes: "Points to clarify",
    summaryNext: "Next steps",
    newLesson: "New lesson",
    derivedTitle: "Structures you came across",
    derivedSub: "Tick the ones you'd like to add to your library (nothing is added without you).",
    derivedAdd: (n) => n > 0 ? `Add (${n})` : "Add",
    derivedAll: "Select all",
    derivedNone: "Deselect all",
    derivedSkip: "Skip",
    formalityLabel: "Register",
    formality: { casual: "casual", neutral: "neutral", formal: "formal" },
    registerNoFormal: "No formal form", registerNoCasual: "No casual form",
    registerShow: "Show register (formal / casual)", registerExamples: "Usage examples",
    registerExamplesAsk: "Please show me examples contrasting the formal vs casual usage of this word",
    registerLoading: "Analyzing register…",
    moreExercises: "More exercises",
    derivedFrom: "derived from", derivedChildren: "led to",
    viewGrid: "Grid",
    viewTree: "Tree",
    viewSources: "Texts",
    deleteCard: "Delete card", deleteConfirmTitle: "Delete this card?",
    deleteConfirmMsg: (k) => `"${k}" will be permanently deleted, along with its recaps.`,
    deleteBtn: "Delete", cancelBtn: "Cancel",
    filterAll: "All", filterGrammar: "Grammar", filterVocab: "Vocab",
    filterByTag: "Filter by tag", allTags: "All tags",
    addTag: "Add tag", removeTag: "Remove", tagMax: "3 tags max", tagRelated: "Cards with this tag", tagNoOther: "No other cards with this tag",
    tagPlaceholder: "New tag...", tagSuggested: "Suggested",
    noTags: "No tags",
    restudyText: "Study this text again",
    sourcesNone: "No source text",
    pointsFromText: "Associated points",
    recapExcerpt: "Recap excerpt",
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
    langColLang: "Language", langColLevel: "Level", langAddRow: "+ Add a language",
    langPh: "e.g. French", langLevelPick: "Level…",
    langLevelNative: "Native", langLevelBilingual: "Bilingual", langLevelAdvanced: "Advanced", langLevelIntermediate: "Intermediate",
    myNotesLabel: "My notes", teacherNotesLabel: "Teacher's notes", teacherNotesEmpty: "No teacher notes yet.",
    myNotesPlaceholder: "Your own notes: personal goals, reminders, preferences...",
    contact: "Contact", contactSub: "Need help? Write to us.",
    onbNext: "Next",
    onbSkip: "Skip",
    onbFinish: "Let's go!",
    onbStep: (a, b) => `${a} / ${b}`,
    // Points
    points_: "points",
    pointsEarned: (n) => `+${n} point${n > 1 ? "s" : ""}!`,
    dailyGoalReached: (n) => `Daily goal reached! +${n} points 🎉`,
    // Detailed questionnaire
    detailedTitle: "Detailed questionnaire",
    detailedSub: "The more the AI knows you, the more your lessons fit you. Every answer makes examples come alive.",
    detailedCta: "Complete my profile",
    detailedReward: "+100 points",
    detailedDone_: "Questionnaire completed ✓",
    editAnswers: "Edit my answers",
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
    quickPractice: "Go deeper",
    quickPracticeSub: "Explore this structure in other ways.",
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
    feedThreadTitle: "Thread",
    feedThreadEmpty: "This post could not be loaded.",
    feedCatNews: "News",
    feedCatPress: "Headlines",
    feedCatSns: "Bluesky",
    feedCatMasto: "Mastodon",
    feedCatRecap: "📰 Daily",
    recapMasthead: "The Korea Daily",
    recapGeneralTitle: "Today's headlines",
    recapInterestTitle: "Around your dream",
    recapRefresh: "Refresh",
    recapLoading: "Setting today's edition…",
    recapEmpty: "No news found for today.",
    recapInterestHint: "Set your dream in your Profile for a tailored section.",
    recapRawNote: "Translation unavailable (AI quota) — showing original headlines.",
    recapEdition: (d) => `${d} edition`,
    feedGenKeywords: "Generating topics...",
    exFinished: "Exercise complete!",
    newExercise: "New exercise",
    backToLibrary: "Library",
  },
  ko: {
    library: "라이브러리", lesson: "레슨", import: "가져오기", exercise: "연습",
    profile: "프로필",
    review: "복습할 것", acquired: "습득 완료", reviewBtn: "복습하기",
    toAcqTitle: "습득 완료로 표시할까요?", toAcqMsg: (k) => `"${k}"이(가) "습득 완료" 선반으로 이동해요 (제목만 표시돼요).`,
    toStudiedTitle: "학습 중으로 되돌릴까요?", toStudiedMsg: (k) => `"${k}"이(가) 다시 학습 중인 카드로 돌아가요.`,
    confirmBtn: "확인", learningShelf: "학습 중",
    statusNew: "새 카드", statusInProgress: "진행 중", statusStudied: "학습함", statusAcquired: "습득 완료",
    today: "오늘", todayCards: (n) => `${n}장`, todayEmpty: "모든 카드를 습득했어, 대단해! 🎉", todayDone: "완료!",
    shelfMaskedHint: "뜻이 숨겨져 있어요, 맞춰보세요", shelfExpandHint: "클릭해서 펼치기", toStudied: "학습 중으로 되돌리기",
    dailyCountLabel: "매일 추천 카드 수", markAcquired: "습득 완료 표시",
    reviewCount: (n) => `복습 ${n}회`,
    importTitle: "텍스트 가져오기",
    importSub: "블로그 글이나 아무 학습 언어 텍스트를 붙여넣어 봐. AI가 네 수준에 맞는 포인트를 찾아줄 거야.",
    analyze: "이 텍스트 분석하기", analyzing: "분석 중...",
    importImage: "이미지 가져오기", ocrLoading: "텍스트 추출 중...", ocrEmpty: "이미지에서 텍스트를 찾지 못했어요.",
    ocrNoTarget: (l) => `이 이미지에서 ${l} 텍스트를 찾지 못했어요. 혹시 다른 이미지 아닌가요?`,
    pointsFound: (n) => `텍스트에서 포인트 ${n}개를 찾았어요`,
    importAllKnown: "이 텍스트의 모든 포인트가 이미 라이브러리에 있어요, 새로 추가할 게 없어요.",
    pickSub: "공부할 걸 골라봐, 아니면 이미 아는 건 체크해 둬.",
    iKnow: "이거 알아", addedAcq: "추가됨 (습득 완료)",
    startLesson: "레슨 시작", morePoints: "다른 포인트 찾기",
    vocab: "어휘",
    importModeGrammar: "문법", importModeVocab: "어휘", importModeComprehension: "독해", importModeBulk: "대량 가져오기",
    importModeSub: "이 텍스트에서 뭘 공부하고 싶어?",
    bulkPickTitle: "추출된 내용", bulkPickSub: "가져오고 싶지 않은 건 선택 해제해.", bulkAddToLib: "라이브러리에 추가", bulkAdded: (n) => `카드 ${n}개 추가됨!`, bulkNone: "최소 하나는 선택해 줘.",
    bulkTagBtn: "태그", bulkTagTitle: "대량 태그", bulkTagApply: "적용", bulkTagDone: "완료", bulkTagSelectAll: "전체", bulkTagNone: "없음",
    compTitle: "텍스트 독해", compLevel1: "레벨 1: 객관식", compLevel2: "레벨 2: 바꿔 말하기",
    compParagraph: (i, n) => `단락 ${i}/${n}`,
    compQuestion: "문제", compCheck: "확인", compNext: "다음",
    compCorrect: "정답이에요!", compWrong: "아쉽지만 틀렸어요.",
    compLevel1Done: "레벨 1 완료! 레벨 2에 도전해 볼래?",
    compStartLevel2: "레벨 2로 가기", compFinish: "끝내기",
    compReformulate: "내용을 1~2문장으로 다시 정리해 봐:",
    compYourReformulation: "네가 정리한 내용...",
    compIllustration: "삽화",
    compIllustrationLoading: "삽화 검색 중...",
    compEncourage: "모든 단어를 다 알 필요 없어, 전체적인 뜻을 파악하는 게 중요해!",
    compSaved: "독해 저장 완료!",
    compResume: "이어하기", compLevel: (n) => `레벨 ${n}`,
    compDone: "완료",
    compInTargetLang: "학습 언어로 된 문제", compInInterfaceLang: "한국어로 된 문제",
    vocabPickTitle: "공부할 단어", vocabPickSub: "이미 아는 단어는 선택 해제해.",
    studyTheseWords: "이 단어들 공부하기", vocabNoneSelected: "최소 한 단어는 선택해 줘.",
    vocabStepGuess: "뜻 맞춰보기", vocabStepEtym: "어원", vocabStepSyn: "동의어 & 관련어",
    vocabStepFun: "알고 있었어?", vocabStepEx: "다른 예문",
    vocabNext: "다음", vocabNextWord: "다음 단어 →", vocabFinishBtn: "끝내기",
    vocabCorrect: "정답 ✓", vocabWrong: "아쉽지만 틀렸어", vocabWordOf: (i, n) => `단어 ${i}/${n}`,
    vocabDone: "어휘 학습 완료 ✓", vocabExitConfirm: "어휘 학습을 그만둘까요?",
    exerciseTitle: "연습 문제",
    exerciseSub: "카테고리를 고른 다음, 연습을 골라봐.",
    exCatCE: "읽기", exCatCEDesc: "읽고 이해하기",
    exCatCO: "듣기", exCatCODesc: "듣고 이해하기",
    exCatPE: "쓰기", exCatPEDesc: "쓰고 표현하기",
    exCatPO: "말하기", exCatPODesc: "말하고 표현하기",
    exPickExercise: "연습을 골라봐",
    exPickCards: "연습할 카드를 골라봐",
    exBackToCat: "카테고리",
    exBackToEx: "연습 문제",
    story: "이야기 이어쓰기", storyDesc: "AI가 이야기를 시작하면, 선택한 구조를 사용해서 이어 써 봐.",
    qcm: "랜덤 퀴즈", qcmDesc: "새로운 예문으로 된 문제들.",
    fillBlanks: "빈칸 채우기", fillDesc: "생성된 이야기의 빈칸을 선택한 단어로 채워 봐.",
    exMatch: "연결하기", exMatchDesc: "각 단어를 뜻과 연결해 봐.",
    exCross: "십자말풀이", exCrossDesc: "뜻을 보고 단어를 찾아봐.",
    exFlash: "플래시카드", exFlashDesc: "카드를 뒤집어서 어휘를 복습해.",
    exDictation: "받아쓰기", exDictationDesc: "단어나 문장을 듣고 써 봐.",
    exYouglish: "영상 속 단어", exYouglishDesc: "실제 영상에서 단어가 쓰이는 걸 봐.",
    exDialogueFill: "대화 빈칸 채우기", exDialogueFillDesc: "생성된 대화의 빈칸을 선택한 단어로 채워 봐.",
    flashKnow: "알아", flashReview: "복습", flashProgress: (i, n) => `${i} / ${n}`, flashScore: (k, r) => `${k}개 알고 있고, ${r}개 복습 필요`,
    flashDone: "복습 수고했어!", flashRemaining: (n) => `${n}개 남았어`,
    exImgWrite: "이미지 → 단어", exImgWriteDesc: "이미지를 보고 단어를 찾아봐.",
    imgWriteHint: "이미지에 맞는 단어를 써 봐", imgWriteCheck: "확인", imgWriteCorrect: "정답!", imgWriteWrong: (w) => `정답은: ${w}`, imgWriteNext: "다음",
    exNeedImages: "이 연습에 필요한 이미지가 있는 단어가 부족해요 (다른 단어를 골라봐).",
    exVocabOnly: "어휘 전용",
    matchWords: "단어", matchDefs: "뜻", exRestart: "다시 하기",
    exNeedWords: "이 연습에 맞는 단어가 부족해요 (다른 단어를 골라봐).",
    crossCheck: "확인", crossSolved: "퍼즐 완성!", crossHint: "한 칸 = 한 음절. 뜻을 보고 채워 봐.", crossNextLvl: "다음 레벨 →",
    fillWordBank: "단어 은행", fillCheck: "정답 확인", fillScore: (c, t) => `${c}/${t} 정답`,
    fillCorrect: "정답!", fillWrong: (w) => `정답: ${w}`, fillDone: "잘했어!", fillTryAgain: "잘 했어! 다시 해볼래?", fillRetry: "다시 하기",
    fillNewStory: "새 이야기", fillTapBlank: "빈칸을 누르고, 단어를 골라 봐.", fillTapWord: "모르는 단어를 누르면 번역이 나와.",
    fillTranslateStory: "이야기 번역", fillAddVocab: "라이브러리에 추가", fillListen: "듣기", fillListenStop: "멈추기",
    fillThemeLabel: "시나리오 테마", fillThemeRandom: "랜덤!", fillThemes: ["일상생활", "친구 / 놀기", "한국 드라마", "K-pop / 팬덤", "SNS", "직장 / 비즈니스", "카페 / 식당", "한국 여행"],
    crossAcross: "가로", crossDown: "세로",
    crossLvl1: "레벨 1 · 단어 보이기", crossLvl2: "레벨 2 · 기억으로", crossLvl3: "레벨 3 · 학습 언어로 된 힌트",
    genTargetDesc: "학습 언어로 된 뜻", genTargetDescDone: "뜻 생성 완료!",
    etymBtn: "어원 & 관련어", etymLoading: "어원 검색 중...", etymDone: "어원 생성 완료!",
    rootWordsBtn: "같은 어근 단어들", rootWordsAsk: "같은 어근을 공유하는 단어 더 보여줘",
    shelfTagged: "분류됨", shelfUntagged: "미분류",
    exGender: "Le ou La?", exGenderDesc: "각 명사에 맞는 관사를 골라봐.",
    genderQuestion: "남성형? 여성형?", genderDone: "잘했어!",
    genderScore: (c, t) => `${c}/${t} 정답`,
    exRandom: "랜덤",
    exMusicOn: "음악", exMusicOff: "음악",
    progressTitle: "연습하기", progressGlobal: "전체",
    progressReviews: (n, r) => `${n}/${r}번 복습`,
    progressNextReview: "다음 추천 복습",
    progressNextDays: (n) => n === 0 ? "오늘" : n === 1 ? "내일" : `${n}일 후`,
    progressCanPractice: "그래도 오늘 연습할 수 있어요.",
    progressJustDiscovered: "방금 이 카드를 발견했어요. 그래도 벌써 연습해 보고 싶으면 해 보세요.",
    progressAlreadyDone: "오늘 이미 연습했어요. 그래도 더 복습하고 싶으면 할 수 있어요.",
    progressNextPast: "밀림",
    progressAcquired: "습득 완료!",
    progressAutoAcquired: "카드 습득 완료! 간격 반복 끝.",
    progressNewReview: "새 복습 기록!",
    availableCards: "사용 가능한 카드 (습득 완료)", launchEx: "연습 시작",
    moreExamples: "예문 더 보기", onlineRes: "추가 자료", realExamples: "실제 예문", searching: "검색 중...", sources: "출처", showTranslations: "번역 보기", tapToReveal: "흐린 부분을 터치하면 번역이 나와요",
    resourcesAsk: "이 포인트에 대한 추가 자료 좀 보여줄래? 📚",
    askExamples: "예문 좀 더 보여줄래? 💡",
    askExercise: "연습 문제 하나만 내줄래? ✏️",
    askExplain: "다른 방식으로 설명해 줄 수 있어? 🔄",
    anExercise: "연습 문제", explainOther: "다르게 설명", anImage: "이미지", youglishBtn: "영상",
    askImage: "이 단어 이미지를 보여줘 📷", imageNone: "이 단어에 대한 이미지를 찾지 못했어요.",
    otherImages: "다른 이미지", refineImage: "검색어 수정 (예: 그림, 실물...)",
    imgChoose: "선택", imgAdded: "이미지 추가됨 ✓", imgAlready: "이미 카드에 있는 이미지야",
    cardImages: "카드 이미지", imgReplaceTitle: "이미지가 이미 2개야, 어떤 걸 바꿀래?", imgMain: "메인", imgSwap: "순서 바꾸기", imgRemove: "이미지 제거", imgReplaceCancel: "취소",
    studyChooseTitle: "이 단어를 어떻게 공부할래?",
    studyLesson: "전체 레슨", studyLessonDesc: "가이드 학습, 질문, 예문",
    studyDirect: "번역만 보기", studyDirectDesc: "바로 뜻 확인 (쉬운 단어)",
    directLoading: "뜻을 가져오는 중...",
    addToVocab: "어휘에 추가", addedToVocab: "라이브러리에 추가됨 ✓", alreadyInLib: "이미 라이브러리에 있어", selectionSource: "선택",
    yourAnswer: "답을 입력해 봐...", askQuestion: "궁금한 게 있으면 여기에 물어봐!", grammar: "문법", expression: "표현",
    points: "포인트", toReview: "복습 필요", acq: "습득 완료",
    noCards: "아직 카드가 없어요. 텍스트를 가져와서 시작해 봐!",
    placeholder: "큰아이는 요즘 자기가 원하는 게 생기면\n\"엄마, 나 이거 사도 돼요?\"라고 꼭 허락을 구한다...",
    back: "뒤로", thinking: "생각 중...",
    leaveTitle: "레슨을 나갈까요?", leaveBody: "진행 중인 레슨이 있어. 어떻게 할래?",
    leaveKeep: "저장하고 나중에 이어하기", leaveDiscard: "저장 안 하고 나가기", leaveCancel: "취소",
    resumeTitle: "레슨을 이어할까요?", resumeBody: "이 카드에 대해 진행 중인 세션이 있어.",
    resumeBtn: "이어하기", restartBtn: "처음부터",
    noAcquired: "아직 학습하거나 습득한 카드가 없어요.",
    emptyLesson: "텍스트를 가져오고 포인트를 골라서 시작해 봐.",
    syncLabel: "동기화 코드",
    syncPlaceholder: "간단한 비밀번호...",
    syncInfo: "이 코드로 기기 간 데이터를 동기화해요. 어디서든 같은 코드를 사용해 줘.",
    syncOn: "동기화 활성화됨",
    syncOff: "로컬만 사용",
    connect: "연결",
    disconnect: "연결 해제",
    syncConnected: "연결된 코드:",
    syncLoading: "동기화 중...",
    syncError: "연결 오류. Supabase 설정을 확인해 봐.",
    syncSuccess: "데이터 동기화 완료!",
    welcomeTitle: "모아에 온 걸 환영해",
    welcomeSub: "계정에 로그인하거나 새 계정을 만들어서 시작해 봐.",
    welcomeLoginTitle: "계정 찾기",
    welcomeLoginSub: "개인 코드를 입력해서 데이터를 불러와.",
    welcomeCreateTitle: "계정 만들기",
    welcomeCreateSub: "개인 코드를 정해서 계정을 만들어 봐.",
    welcomeLogin: "로그인",
    welcomeCreate: "계정 만들기",
    welcomeCode: "개인 코드",
    welcomeCodePlaceholder: "개인 코드를 입력해...",
    welcomeNoAccount: "이 코드로 된 계정을 찾지 못했어요.",
    welcomeCreateHint: "아무 단어나 문장이면 돼, 코드로 쓸 거야.",
    welcomeLoginHint: "기존 계정 코드를 입력하면 데이터를 불러올 수 있어.",
    welcomeSwitchToLogin: "로그인할래",
    welcomeSwitchToCreate: "계정 만들래",
    profileTitle: "내 프로필",
    profileSub: "이 정보를 바탕으로 AI가 네 관심사와 수준에 맞게 레슨, 예문, 연습을 맞춤 제작해 줘.",
    levelLabel: "수준",
    levelPlaceholder: "예: 초급, 알파벳과 기초 알아요 / TOPIK 3 / CEFR A2...",
    interestsLabel: "관심사",
    interestsPlaceholder: "구체적으로! 예: K-Pop (BTS, 특히 정국, 최애곡: Spring Day), 드라마 (사랑의 불시착, 응답하라 1988), 한국 음식 (떡볶이)...",
    goalsLabel: "목표",
    goalsPlaceholder: "예: 사전 없이 블로그 읽기, 노래 가사 이해하기, TOPIK 4급 합격...",
    notesLabel: "메모",
    notesPlaceholder: "어떤 정보든 도움이 돼: 반복적인 어려움, 공부 가능 시간, 학습 스타일 선호...",
    profileSaved: "저장됨!", autoSaveHint: "자동 저장",
    saveProfile: "저장",
    langProfileTitle: (flag, name) => `${flag} ${name} 프로필`,
    langProfileSub: "이 언어에 맞게 정보를 수정해 봐. AI가 레슨을 맞춤화하는 데 도움이 돼.",
    langProfilePrefill: "기존 프로필에서 미리 채워졌어. 원하는 대로 수정해!",
    langProfileSave: "계속",
    langProfileSkip: "나중에",
    langDreamLabel: "이 언어로 이루고 싶은 가장 큰 꿈",
    langLevelLabel: "이 언어의 수준",
    langGoalsLabel: "목표",
    langToolsLabel: "이 언어 공부에 같이 쓰는 도구",
    langDailyLabel: "하루 카드 수",
    langNotesLabel: "개인 메모",
    langTeacherNotesLabel: "선생님 메모",
    genderLabel: "성별",
    genderNone: "미지정",
    genderM: "남성",
    genderF: "여성",
    ageLabel: "나이",
    agePlaceholder: "예: 28",
    nationalityLabel: "국적 / 모국어",
    nationalityPlaceholder: "예: 한국인, 프랑스어권 세네갈인, 일본인...",
    profileAutoUpdate: "레슨할 때마다 네가 공유하는 내용을 바탕으로 프로필이 자동으로 업데이트돼.",
    endLesson: "레슨 끝내기",
    endLessonConfirm: "레슨을 끝내고 요약을 볼까요?",
    wrapUpTitle: "레슨을 마무리하거나, 좀 더 해볼 수 있어:",
    summaryTitle: "레슨 요약",
    endPractice: "연습 끝내기",
    practiceWrapUp: "끝내고 요약을 만들 수 있어:",
    practiceExitWarn: (n) => `지금 나가면 요약이 생성되지 않아. 요약까지 ${n}턴 남았어. 그래도 나갈래?`,
    goalsTab: "목표",
    goalCreate: "목표 만들기",
    goalName: "목표 이름",
    goalNamePh: "예: 토픽 II, 10월 7일 수업...",
    goalDeadline: "마감일",
    goalCards: "연결된 카드",
    goalNoCards: "연결된 카드 없음",
    goalAddCards: "카드 추가",
    goalImportText: "텍스트 가져오기",
    goalDailyTarget: "마감일에 맞춰서 이렇게 계획했어:",
    goalCardsPerDay: (n) => `하루 ~${n}장`,
    goalDiscoverPerDay: (n) => `하루에 ~${n}장의 새 카드를 발견해`,
    goalPracticePerDay: (n) => `그리고 날에 따라 최대 약 ${n}회 복습이 있을 수 있어`,
    goalRecommendR: (r) => `마감일 전에 각 카드를 ${r}번 복습하는 걸 추천해.`,
    goalTodayTitle: "오늘",
    goalTodayDiscover: "발견할 카드",
    goalTodayPractice: "연습할 카드",
    goalTodayAllDone: "오늘 할 거 다 했어!",
    goalEditDeadline: "날짜 변경",
    goalDaysLeft: (n) => n <= 0 ? "기한 초과" : `${n}일 남음`,
    goalProgress1: "학습 시작",
    goalProgress3: "복습",
    goalProgress2: "습득 완료",
    goalEmpty: "아직 목표가 없어. 첫 번째 목표를 만들어 봐!",
    goalDelete: "목표 삭제",
    goalDeleteConfirm: "이 목표를 삭제할까?",
    goalDeleteCards: "연결된 카드도 삭제할까?",
    goalDeleteKeep: "카드 유지",
    goalDeleteRemove: "카드 삭제",
    goalCancel: "취소",
    goalDeadlineTitle: "마감일이 됐어!",
    goalDeadlineMsg: "정말 잘했어!",
    goalDeadlineTest: "시험을 봤다면, 어땠어?",
    goalDeadlineGreat: "좋았어, 도와줘서 고마워!",
    goalDeadlineMedium: "그저 그랬어",
    goalDeadlineBad: "별로였어",
    goalDeadlineNoTest: "시험은 안 봤어",
    goalDeadlineReplyGreat: "정말 잘했다!",
    goalDeadlineReplyMedium: "최선을 다한 거야, 분명!",
    goalDeadlineStats: "지금까지의 통계야.",
    goalDeadlineWhat: "이제 어떻게 할래?",
    goalDeadlineArchive: "목표를 보관하고 카드는 장기 복습용으로 유지",
    goalDeadlineExtend: "마감일 연장하기",
    goalDeadlineDelete: "목표와 카드 모두 삭제",
    goalDeadlineDeleteWarn: "(비추천)",
    goalSave: "만들기",
    goalUpdate: "업데이트",
    goalTrophyHall: "트로피 홀",
    goalNoTrophy: "아직 트로피가 없어.",
    goalCompleted: "완료일",
    goalExpired: "기한이 지났어. 연장할래?",
    goalExtend: "연장",
    goalNewDeadline: "새 마감일",
    goalMilestone: (pct) => `목표의 ${pct}% 달성!`,
    goalCardCount: (n) => `카드 ${n}장`,
    goalOf: "/",
    goalPickCards: "카드 선택",
    goalPickSub: "이 목표에 연결할 카드를 골라 봐.",
    goalImportScreenshots: "스크린샷 가져오기",
    goalImportPaste: "또는 이미지 붙여넣기 (Ctrl+V)",
    goalImportOcr: "이미지 읽는 중...",
    goalImportScanning: "분석 중...",
    goalImportConfirm: "목표에 추가",
    goalImportCancel: "가져오기 취소",
    goalOverdue: "기한 초과",
    goalActive: "진행 중",
    generating: "요약 생성 중...",
    summaryHistory: "레슨 기록",
    noSummaries: "아직 완료한 레슨이 없어요.",
    summaryLearned: "이해한 내용",
    summaryMistakes: "다시 볼 부분",
    summaryNext: "다음 단계",
    newLesson: "새 레슨",
    derivedTitle: "만난 구조들",
    derivedSub: "라이브러리에 추가하고 싶은 걸 체크해 (체크 안 하면 추가 안 돼).",
    derivedAdd: (n) => n > 0 ? `추가 (${n})` : "추가",
    derivedAll: "전체 선택",
    derivedNone: "전체 해제",
    derivedSkip: "건너뛰기",
    formalityLabel: "어투",
    formality: { casual: "반말", neutral: "중립", formal: "존댓말" },
    registerNoFormal: "존댓말 형태 없음", registerNoCasual: "반말 형태 없음",
    registerShow: "어투 보기 (존댓말 / 반말)", registerExamples: "사용 예시",
    registerExamplesAsk: "이 단어의 존댓말과 반말 사용을 비교하는 예문을 보여줘",
    registerLoading: "어투 분석 중...",
    moreExercises: "연습 더 하기",
    derivedFrom: "유래", derivedChildren: "파생",
    viewGrid: "그리드",
    viewTree: "트리",
    viewSources: "텍스트",
    deleteCard: "카드 삭제", deleteConfirmTitle: "이 카드를 삭제할까요?",
    deleteConfirmMsg: (k) => `"${k}"이(가) 요약과 함께 영구 삭제돼요.`,
    deleteBtn: "삭제", cancelBtn: "취소",
    filterAll: "전체", filterGrammar: "문법", filterVocab: "어휘",
    filterByTag: "태그로 필터", allTags: "모든 태그",
    addTag: "태그 추가", removeTag: "제거", tagMax: "태그 최대 3개", tagRelated: "이 태그가 있는 카드", tagNoOther: "이 태그가 있는 다른 카드가 없어",
    tagPlaceholder: "새 태그...", tagSuggested: "추천",
    noTags: "태그 없음",
    restudyText: "이 텍스트 다시 공부하기",
    sourcesNone: "원본 텍스트 없음",
    pointsFromText: "관련 포인트",
    recapExcerpt: "요약 발췌",
    noParent: "최상위 구조",
    childCount: (n) => `파생 ${n}개`,
    recapTitle: "레슨 요약",
    recapSub: "이 구조에 대한 이전 세션에서 다룬 내용이야.",
    redoLesson: "레슨 다시 하기",
    redoLessonSub: "소크라테스식 레슨 다시 시작",
    doExercises: "연습하기",
    noRecapYet: "이 구조에 대한 레슨 요약이 아직 없어요.",
    structureInfo: "정보",
    addLang: "언어 추가",
    studyLang: "학습 언어",
    chooseLang: "어떤 언어를 공부하고 싶어?",
    onbTitle1: "너에 대해 알려줘",
    onbSub1: "AI가 적절한 톤을 고르고, 모국어 때문에 생기는 함정을 찾는 데 도움이 돼.",
    onbTitle2: "네 가장 큰 꿈",
    onbSub2: "이 언어로 뭘 할 수 있으면 좋겠어? 한계 없이 마음껏 상상해 봐!",
    dreamPlaceholder: "예: 시부모님과 통역 없이 몇 시간이고 수다 떨기. 한강 소설 원서로 읽기. 한국어로 스탠드업 코미디 하기...",
    spokenLangsLabel: "할 수 있는 언어",
    spokenLangsPlaceholder: "예: 한국어 (모국어), 영어 (유창), 스페인어 (기초)",
    langColLang: "언어", langColLevel: "수준", langAddRow: "+ 언어 추가",
    langPh: "예: 한국어", langLevelPick: "수준...",
    langLevelNative: "모국어", langLevelBilingual: "이중 언어", langLevelAdvanced: "고급", langLevelIntermediate: "중급",
    myNotesLabel: "내 메모", teacherNotesLabel: "선생님 메모", teacherNotesEmpty: "아직 선생님 메모가 없어요.",
    myNotesPlaceholder: "내 메모: 개인 목표, 리마인더, 선호 사항...",
    contact: "문의", contactSub: "도움이 필요해? 연락해 줘.",
    onbNext: "다음",
    onbSkip: "건너뛰기",
    onbFinish: "시작해 볼까!",
    onbStep: (a, b) => `${a} / ${b}`,
    points_: "포인트",
    pointsEarned: (n) => `+${n} 포인트!`,
    dailyGoalReached: (n) => `오늘 목표 달성! +${n} 포인트 🎉`,
    detailedTitle: "상세 설문",
    detailedSub: "AI가 너를 잘 알수록 레슨이 더 딱 맞아. 답변 하나하나가 예문을 더 생생하게 만들어 줘.",
    detailedCta: "프로필 완성하기",
    detailedReward: "+100 포인트",
    detailedDone_: "설문 완료 ✓",
    editAnswers: "답변 수정하기",
    favFilms: "좋아하는 영화나 드라마 3개",
    favFilmsPh: "예: 사랑의 불시착, 응답하라 1988, 기생충",
    favMusic: "좋아하는 가수나 노래 3개",
    favMusicPh: "예: BTS (특히 정국), Spring Day, 아이유",
    favSports: "좋아하는 운동 3가지",
    favSportsPh: "예: 클라이밍, 수영, 배드민턴",
    favFood: "좋아하는 음식 3가지",
    favFoodPh: "예: 떡볶이, 비빔밥, 김치찌개",
    favBooks: "좋아하는 책, 만화 3개",
    favBooksPh: "예: 파친코, 나 혼자만 레벨업, 어린 왕자",
    favHobbies: "좋아하는 취미 3가지",
    favHobbiesPh: "예: 필름 카메라, 원예, 보드게임",
    dreamJobs: "꿈의 직업 3가지",
    dreamJobsPh: "예: 문학 번역가, 파티시에, 파일럿",
    otherTools: "다른 공부 도구도 쓰고 있어?",
    otherToolsPh: "듀오링고, Anki, 유튜브, 인스타 계정... 어떻게 생각해?",
    bestMemory: "언어 공부 중 최고의 순간",
    bestMemoryPh: "그 순간이 특별했던 이유가 뭐야?",
    worstMemory: "선생님이나 학습법에 대한 답답했던 경험",
    worstMemoryPh: "뭐가 안 맞았어?",
    saveAndEarn: "저장하고 100 포인트 받기",
    quickPractice: "심화 학습",
    quickPracticeSub: "다른 방법으로 이 구조를 탐구해 봐.",
    backToRecap: "요약으로 돌아가기",
    feed: "피드",
    feedTitle: "내 피드",
    feedSub: "네 관심사에 맞춰 고른 진짜 텍스트들이야. 읽으면서 끌리는 걸 찾아봐.",
    feedSearch: "주제 검색...",
    feedLoading: "피드 불러오는 중...",
    feedEmpty: "결과가 없어. 다른 키워드로 해봐.",
    feedNoKeywords: "맞춤 피드를 보려면 프로필을 채우거나, 검색을 해봐.",
    feedRefresh: "새로고침",
    feedRead: "기사 읽기",
    feedThreadTitle: "스레드",
    feedThreadEmpty: "이 게시물을 불러올 수 없었어요.",
    feedCatNews: "뉴스",
    feedCatPress: "헤드라인",
    feedCatSns: "Bluesky",
    feedCatMasto: "Mastodon",
    feedCatRecap: "📰 일간",
    recapMasthead: "모아 데일리",
    recapGeneralTitle: "오늘의 헤드라인",
    recapInterestTitle: "네 꿈과 관련된 소식",
    recapRefresh: "새로고침",
    recapLoading: "오늘의 에디션 준비 중...",
    recapEmpty: "오늘 뉴스를 찾지 못했어요.",
    recapInterestHint: "프로필에서 꿈을 설정하면 맞춤 섹션이 나와.",
    recapRawNote: "번역 불가 (AI 할당량 초과), 원문 제목이 표시돼요.",
    recapEdition: (d) => `${d} 에디션`,
    feedGenKeywords: "주제 생성 중...",
    exFinished: "연습 완료!",
    newExercise: "새 연습",
    backToLibrary: "라이브러리",
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
  stNew: "#aeaeb2", stNewBg: "rgba(174,174,178,0.06)", stNewB: "rgba(174,174,178,0.25)", stNewCard: "rgba(174,174,178,0.16)",
  stProg: "#e85d9a", stProgBg: "rgba(232,93,154,0.06)", stProgB: "rgba(232,93,154,0.25)", stProgCard: "rgba(232,93,154,0.13)",
  stStudied: "#5b8def", stStudiedBg: "rgba(91,141,239,0.06)", stStudiedB: "rgba(91,141,239,0.25)", stStudiedCard: "rgba(91,141,239,0.13)",
  stAcq: "#3daa5c", stAcqBg: "rgba(61,170,92,0.06)", stAcqB: "rgba(61,170,92,0.25)", stAcqCard: "rgba(61,170,92,0.13)",
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
    placeholders: {
      fr: { dream: "ex: Discuter des heures avec mes beaux-parents sans traducteur. Lire Han Kang en version originale. Faire un stand-up en coréen...", level: "ex: Débutant, connaît l'alphabet et les bases / TOPIK 3 / CECRL A2...", goals: "ex: Pouvoir lire des articles de blog sans dictionnaire, comprendre les paroles de chansons, passer TOPIK 4..." },
      en: { dream: "e.g. Chat for hours with my in-laws without a translator. Read Han Kang in the original. Do stand-up in Korean...", level: "e.g. Beginner, knows the alphabet and basics / TOPIK 3 / CEFR A2...", goals: "e.g. Read blog articles without a dictionary, understand song lyrics, pass TOPIK 4..." },
    },
  },
  fr: {
    flag: "🇫🇷", nativeName: "Français",
    name: { fr: "Français (FLE)", en: "French" },
    font: null,
    placeholder: "Les enfants adorent jouer dans le parc, surtout quand il fait beau. Ma voisine m'a dit qu'elle avait hâte de partir en vacances...",
    promptExtra: "For online resources, suggest TV5Monde, RFI Savoirs, Le Monde, Bescherelle. For level references, use CEFR scale (A1-C2). The student is learning French as a foreign language (FLE).",
    placeholders: {
      fr: { dream: "ex: Commander au restaurant sans stresser. Lire Victor Hugo en V.O. Comprendre les films sans sous-titres. Vivre en France...", level: "ex: Débutant A1 / Intermédiaire B1 / DELF B2 / CECRL A2...", goals: "ex: Réussir le DELF B2, tenir une conversation fluide, lire Le Monde sans dictionnaire..." },
      en: { dream: "e.g. Order at a restaurant without stress. Read Victor Hugo in the original. Watch French movies without subtitles. Live in France...", level: "e.g. Beginner A1 / Intermediate B1 / DELF B2 / CEFR A2...", goals: "e.g. Pass DELF B2, hold a fluent conversation, read Le Monde without a dictionary..." },
    },
  },
  // de: {
  //   flag: "🇩🇪", nativeName: "Deutsch",
  //   name: { fr: "Allemand", en: "German" },
  //   font: null,
  //   placeholder: "Die Kinder spielen gern im Garten, besonders wenn die Sonne scheint. Meine Nachbarin hat gesagt, dass sie sich darauf freut...",
  //   promptExtra: "For online resources, suggest Deutsche Welle, Spiegel Online, ARD Mediathek. For level references, use CEFR scale (A1-C2).",
  // },
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

// Downscale an image file to a JPEG (keeps payloads small; text stays legible).
function fileToScaledBase64(file, maxDim) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const scale = Math.min(1, (maxDim || 1600) / Math.max(width, height));
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      resolve({ base64: dataUrl.slice(dataUrl.indexOf(",") + 1), mimeType: "image/jpeg" });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image illisible")); };
    img.src = url;
  });
}

// OCR: extract the target-language text from an image via the vision model.
async function extractImageText(base64, mimeType, tlName) {
  const sys = `You are an OCR engine. Extract ALL the ${tlName} text visible in this image, preserving line breaks and natural reading order. Do NOT translate, summarize, describe the image, or add any commentary. If some text is not ${tlName}, include it as-is. Return ONLY the extracted text.`;
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system: sys,
      messages: [{ role: "user", content: "Extract the text from this image." }],
      plain: true,
      image: { mimeType, data: base64 },
    }),
  });
  const raw = await res.text();
  if (!res.ok) { let e = raw; try { e = JSON.parse(raw).error || raw; } catch {} throw new Error(e); }
  let data; try { data = JSON.parse(raw); } catch { throw new Error("Réponse illisible: " + raw.substring(0, 150)); }
  return (data.content || []).map((b) => b.text || "").join("\n").trim();
}

// Does the extracted text actually contain the target language's script?
function hasTargetScript(text, tlCode) {
  if (!text || !text.trim()) return false;
  if (tlCode === "ko") return /[가-힣ᄀ-ᇿ㄰-㆏]/.test(text); // Hangul
  if (tlCode === "ja") return /[぀-ヿ一-鿿]/.test(text);              // kana + kanji
  if (tlCode === "zh") return /[一-鿿]/.test(text);                           // Han
  return /[A-Za-zÀ-ɏ]/.test(text);                                          // Latin-script fallback
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
function getEffectiveProfile(data, tlCode) {
  const base = data.profile || {};
  const lp = (data.langProfiles || {})[tlCode];
  if (!lp) return base;
  return { ...base, ...Object.fromEntries(Object.entries(lp).filter(([, v]) => v !== '' && v !== undefined)) };
}

function buildContext(data, lang, tlCode) {
  const L = lang === "fr" ? "French" : lang === "ko" ? "Korean" : "English";
  const p = tlCode ? getEffectiveProfile(data, tlCode) : (data.profile || {});
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

  const hasProfile = p.gender || p.age || p.nationality || p.spokenLanguages || (p.languages && p.languages.length) || p.dream || p.level || p.interests || p.goals || p.notes || p.learnerNotes || favs;
  if (hasProfile) {
    ctx += "=== LEARNER PROFILE ===\n";
    ctx += "Level: intermediate learner.\n";
    if (p.gender) ctx += `Gender: ${p.gender}\n`;
    if (p.age) ctx += `Age: ${p.age}\n`;
    if (p.nationality) ctx += `Nationality / native language: ${p.nationality}\n`;
    const langStr = (p.languages && p.languages.length)
      ? p.languages.filter(r => r && r.lang).map(r => r.lang + (r.level ? ` (${r.level})` : "")).join(", ")
      : (p.spokenLanguages || "");
    if (langStr) ctx += `Languages spoken: ${langStr} (you can draw comparisons with these languages when useful)\n`;
    if (p.dream) ctx += `Their dream in this language: ${p.dream}\n`;
    if (p.level) ctx += `Self-described level: ${p.level}\n`;
    if (favs) ctx += `FAVORITES (use these to build examples that resonate): ${favs}\n`;
    if (p.interests) ctx += `Other interests: ${p.interests}\n`;
    if (p.goals) ctx += `Goals: ${p.goals}\n`;
    if (p.notes) ctx += `Teacher notes: ${p.notes}\n`;
    if (p.learnerNotes) ctx += `Learner's own notes: ${p.learnerNotes}\n`;
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
  const L = lang === "fr" ? "French" : lang === "ko" ? "Korean" : "English";
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
- "type": "grammar" for a grammatical structure/pattern, or "vocab" for a lexical item (word, set phrase, idiom)
- "description_fr": one clear sentence in French explaining what it means and when to use it
- "description_en": same in English
- "description_target": a clear, natural monolingual definition in ${TL} (as in a ${TL}-${TL} dictionary for learners, NOT a translation)
- "example_kr": the exact sentence from the text where this structure appears
- "example_fr": natural French translation of that sentence
- "example_en": natural English translation of that sentence
- "category": a short thematic tag (1-3 words) classifying this item, e.g. "emotions", "travel", "formal speech", "time expressions", "causality", "food", "politeness". Pick the most natural theme.

Return a JSON array of exactly 3 items.`;
  return parseJSON((await callAI(sys, text, 1500)).text);
}

// Pick likely-unknown vocabulary from a text for the learner to choose from.
async function analyzeVocab(text, existing, lang, context, tlCode) {
  const known = existing.map((c) => c.korean).join(", ");
  const TL = getTargetLangName(tlCode, "en");
  const sys = `You are an expert ${TL} vocabulary teacher. From the provided ${TL} text, pick the words most likely to be UNKNOWN or worth learning for this specific learner (skip trivial/basic words and anything already known).

${context}
TASK: Extract 6-10 vocabulary items (single words or short set expressions) from the text worth learning.

SELECTION CRITERIA:
1. Prefer mid/low-frequency words that carry real meaning (nouns, verbs, adjectives, idiomatic expressions)
2. Skip very basic/common words and grammatical particles
3. Adapt to the learner's level; skip words in ALREADY KNOWN
4. Each item must actually appear in the text

ALREADY KNOWN (skip these): ${known || "none"}

For each item provide:
- "word": the word/expression (dictionary form if inflected)
- "reading": pronunciation/romanization if helpful (or "")
- "gender": for nouns in gendered languages (French, German, etc.), "m" for masculine, "f" for feminine, "n" for neuter; "" for verbs/adjectives/other
- "meaning_fr": short French meaning
- "meaning_en": short English meaning
- "description_target": a clear, natural monolingual definition in ${TL} (as in a ${TL}-${TL} dictionary for learners, NOT a translation)
- "example_kr": the sentence from the text where it appears
- "example_fr": French translation of that sentence
- "example_en": English translation of that sentence
- "category": a short thematic tag (1-3 words) classifying this word, e.g. "emotions", "food", "nature", "daily life", "work", "body". Pick the most natural theme.
- "register": "neutral", "formal", or "casual". Neutral = standard dictionary form. Formal = polite/honorific (존댓말). Casual = everyday/반말. Most dictionary words are "neutral".
- "register_formal": the formal/honorific equivalent if one exists (e.g. 드시다 for 먹다), or "" if none
- "register_casual": the casual/반말 equivalent if one exists, or "" if none

Return a JSON array of 6-10 items.`;
  return parseJSON((await callAI(sys, text, 2000)).text);
}

async function analyzeBulk(text, existing, lang, context, tlCode, onProgress) {
  const known = existing.map((c) => c.korean).join(", ");
  const TL = getTargetLangName(tlCode, "en");
  const lines = text.split(/\n/).filter(l => l.trim());
  const CHUNK = 60;
  const chunks = [];
  for (let i = 0; i < lines.length; i += CHUNK) chunks.push(lines.slice(i, i + CHUNK).join("\n"));
  if (!chunks.length) chunks.push(text);
  const all = [];
  const foundSoFar = () => [...existing.map(c => c.korean), ...all.map(it => it.korean || it.word)].filter(Boolean).join(", ");
  for (let ci = 0; ci < chunks.length; ci++) {
    if (onProgress) onProgress(ci + 1, chunks.length);
    const skip = foundSoFar();
    const sys = `Extract every ${TL} vocabulary word and grammar pattern from this text. Return a JSON array. Be exhaustive.

Skip these already-known items: ${skip || "none"}

Each item: {"korean":"dictionary form","type":"vocab" or "grammar","meaning_fr":"French","meaning_en":"English","category":"topic tag","reading":"romanization or empty"}

IMPORTANT for grammar: merge conjugation variants of the same pattern into ONE entry using the base/citation form. For Korean, combine verb/adjective/noun-attaching forms (e.g. -는데도/-인데도/-ㄴ데도 become one entry "-ㄴ/는데도", -다가/-았다가 become "-다가"). Use the most general citation form as the "korean" value.

Extract ALL items. No limit.`;
    try {
      const items = parseJSON((await callAI(sys, chunks[ci], 8000)).text);
      if (Array.isArray(items)) all.push(...items);
    } catch (e) { console.warn("Bulk chunk", ci, "failed:", e); }
  }
  return all;
}

// Full 5-part study of ONE vocabulary word: guess (QCM), etymology, synonyms, fun facts, examples.
async function studyVocabWord(word, exampleSentence, lang, context, tlCode) {
  const L = lang === "fr" ? "French" : lang === "ko" ? "Korean" : "English";
  const TL = getTargetLangName(tlCode, "en");
  const sys = `You are an expert ${TL} vocabulary teacher creating a rich, memorable study of ONE word. Write all explanatory text in ${L}. Be concise but insightful.

${context}
The word to study: "${word}"
Context sentence where it appeared: "${exampleSentence || "(none)"}"

Produce a complete study as a JSON object with these fields:
- "qcm": { "question": a ${L} question asking what "${word}" means in context, "options": array of exactly 4 plausible ${L} meanings (only one correct), "answer": integer index 0-3 of the correct option, "explanation": one ${L} sentence explaining the correct meaning }
- "etymology": ${L} explanation of the word's origin. For ${TL}, if it is Sino-Korean, break down the hanja (한자) characters and their individual meanings; otherwise explain its formation.
- "synonyms": ${L} text listing synonyms and closely related words/expressions, with nuance differences.
- "funfacts": ${L} cultural or surprising facts that make the word memorable.
- "examples": array of 3 example sentences in ${TL} using the word in DIFFERENT contexts, each followed by " — " then its ${L} translation.

Return only the JSON object.`;
  return parseJSON((await callAI(sys, `Study the word: ${word}`, 1600)).text);
}

// Generate a comprehension QCM for one paragraph of a text.
async function generateComprehensionQCM(paragraph, fullText, paragraphIndex, lang, context, tlCode, inTargetLang) {
  const L = lang === "fr" ? "French" : lang === "ko" ? "Korean" : "English";
  const TL = getTargetLangName(tlCode, "en");
  const qLang = inTargetLang ? TL : L;
  const sys = `You are a warm, encouraging ${TL} reading comprehension tutor. Your goal is to help the student understand the overall meaning of a text, paragraph by paragraph.

${context}
The student is reading a ${TL} text. They do NOT need to understand every word. Focus on the GLOBAL MEANING.

Always encourage and reassure: "You don't need to know every word to understand the meaning!"

TASK: Generate ONE multiple-choice question about this specific paragraph's meaning.
Write the question and all options in ${qLang}.
The question should test whether the student grasped WHAT the paragraph is about (its main idea, who does what, what happens), NOT grammar or vocabulary details.

Return JSON:
{
  "question": "the question in ${qLang}",
  "options": ["option A", "option B", "option C", "option D"],
  "answer": 0,
  "explanation_fr": "brief explanation in French of the correct answer and what the paragraph means",
  "explanation_en": "same in English",
  "encouragement_fr": "a short encouraging message in French",
  "encouragement_en": "same in English"
}

"answer" is the 0-based index of the correct option.`;
  return parseJSON((await callAI(sys, `Full text:\n${fullText}\n\nParagraph ${paragraphIndex + 1} to ask about:\n${paragraph}`, 1200)).text);
}

// Evaluate a student's reformulation of a text excerpt.
async function evaluateReformulation(excerpt, userText, lang, context, tlCode) {
  const L = lang === "fr" ? "French" : lang === "ko" ? "Korean" : "English";
  const TL = getTargetLangName(tlCode, "en");
  const sys = `You are a warm, encouraging ${TL} reading comprehension tutor evaluating a student's reformulation.

${context}
The student read a ${TL} text excerpt and tried to reformulate/summarize it in ${TL} in their own words (1-2 sentences).

EVALUATION CRITERIA:
- Did they capture the main idea? (most important)
- Is their ${TL} reasonably understandable? (minor errors are fine)
- Always be encouraging and positive. Highlight what they got right first.

Return JSON:
{
  "correct": true or false (true if they captured the main idea, even imperfectly),
  "feedback_fr": "encouraging feedback in French, noting what they got right and gently correcting if needed",
  "feedback_en": "same in English",
  "suggestion_fr": "a model reformulation in French for reference",
  "suggestion_en": "same in English",
  "model_tl": "a model reformulation in ${TL} for reference"
}`;
  return parseJSON((await callAI(sys, `Original excerpt:\n${excerpt}\n\nStudent's reformulation:\n${userText}`, 1000)).text);
}

async function startSocratic(card, article, lang, context, tlCode) {
  const L = lang === "fr" ? "French" : lang === "ko" ? "Korean" : "English";
  const TL = getTargetLangName(tlCode, "en");
  const d = lang === "fr" ? card.description_fr : (card.description_en || card.description_fr);
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
Article context:\n${(article || "").substring(0, 800)}`, 4000)).text);
}

// Quick dictionary-style entry for a word (used when the learner picks "just the translation"
// for an easy vocab word, and for bare cards added by selection that have no meaning yet).
async function quickTranslateWord(word, lang, tlCode) {
  const L = lang === "fr" ? "French" : lang === "ko" ? "Korean" : "English";
  const TL = getTargetLangName(tlCode, "en");
  const sys = `Give a concise dictionary-style entry for the ${TL} word/expression "${word}".
Return ONLY JSON: {"description_fr":"<short French meaning, one line>","description_en":"<short English meaning, one line>","description_target":"<clear monolingual definition in ${TL}, as in a ${TL}-${TL} learner dictionary>","gender":"<for nouns in gendered languages: m/f/n; empty string for non-nouns>","example_kr":"<one natural ${TL} example sentence>","example_fr":"<French translation of the example>","example_en":"<English translation of the example>"}`;
  return parseJSON((await callAI(sys, `Word: ${word}`, 500)).text);
}

async function generateTargetDescription(card, tlCode) {
  const TL = getTargetLangName(tlCode, "en");
  const desc = card.description_fr || card.description_en || card.description || "";
  const sys = `You are a ${TL} language expert writing a monolingual definition.
Write a clear, natural definition of "${card.korean}" IN ${TL} ONLY.
This is NOT a translation. Write a real definition as you would find in a ${TL}-${TL} dictionary, suitable for a language learner.
Keep it to one or two sentences. Use simple, natural ${TL}.
${desc ? `Context (for your understanding only, do NOT translate this): ${desc}` : ""}
Return ONLY JSON: {"description_target":"<the ${TL} definition>"}`;
  return parseJSON((await callAI(sys, `Define in ${TL}: ${card.korean}`, 800)).text);
}

// Register variants of a Korean word: the formal vs casual way to express the same idea.
async function analyzeRegister(card, lang) {
  const L = lang === "fr" ? "French" : lang === "ko" ? "Korean" : "English";
  const d = lang === "fr" ? card.description_fr : (card.description_en || card.description_fr);
  const sys = `You are a Korean lexicon expert. For the Korean word/expression "${card.korean}"${d ? ` (meaning: ${d})` : ""}:
- "register": classify the word itself as "neutral", "formal", or "casual". Neutral = standard/dictionary form used in both contexts. Formal = polite/honorific register (존댓말). Casual = everyday/반말 register.
- "formal": the formal / polite / honorific equivalent of "${card.korean}". If the word IS already formal or has NO distinct formal form, return "" (empty string).
- "casual": the casual / everyday / 반말 equivalent of "${card.korean}". If the word IS already casual or has NO distinct casual form, return "" (empty string).
IMPORTANT: Do NOT return completely different words or synonyms. Stay as close to "${card.korean}" as possible. Only return a different word if it is the standard register variant that native speakers recognize as the formal/casual counterpart (e.g. 먹다/드시다, 있다/계시다). Do NOT return "${card.korean}" itself as formal or casual.
- "note": ONE short sentence in ${L} explaining the register, mentioning "${card.korean}" explicitly.
Return ONLY JSON: {"register":"...","formal":"...","casual":"...","note":"..."}`;
  return parseJSON((await callAI(sys, `Word: ${card.korean}`, 500)).text);
}

async function continueChat(card, conv, action, lang) {
  const L = lang === "fr" ? "French" : lang === "ko" ? "Korean" : "English";
  const hist = conv.map((m) => `${m.role === "ai" ? "Teacher" : "Student"}: ${m.content}${m.selected ? ` [chose: ${m.selected}]` : ""}`).join("\n");
  const aiTurns = conv.filter(m => m.role === "ai").length;
  const phase = aiTurns <= 2 ? "DISCOVERY" : aiTurns <= 5 ? "DEEPENING" : "CONSOLIDATION";

  const correctByPhase = {
    DISCOVERY: `The student answered correctly! Briefly confirm (1 sentence). Now reveal the official grammar name and explain the core nuance more explicitly. Show one more example that highlights a subtlety. Ask a slightly harder question to go deeper. Include MCQ options.`,
    DEEPENING: `The student answered correctly! Briefly confirm (1 sentence). Now show an edge case, a common mistake Korean learners make, or introduce a closely related/derived expression if one exists (e.g. an idiom built from this structure). Mention how this structure differs from similar ones they might confuse it with. Ask a question that tests this deeper understanding. Include MCQ options.`,
    CONSOLIDATION: `The student answered correctly! Briefly confirm (1 sentence). Now give a mini production exercise: provide a situation in ${L} and ask the student to write a Korean sentence using "${card.korean}". IMPORTANT: when they attempt to write Korean, if they make mistakes, do NOT give the corrected sentence. Instead, point out what needs fixing with hints and let them self-correct. After they succeed (or after 2 attempts), wrap up the lesson: summarize in 2-3 sentences what was covered and congratulate the student. Do NOT include MCQ options on this closing turn, and do NOT ask whether they want to end — the app itself shows the "end lesson / more examples / exercise" buttons.`,
  };

  const acts = {
    examples: `The student wants more examples. Give 2-3 NEW example sentences using the structure "${card.korean}" in varied, real-life contexts. If you know their interests from the conversation or profile, tailor examples to those topics. For each example, write the sentence, then the ${L} translation on the next line. After the examples, ask a new question to check understanding. Include MCQ options if appropriate.`,
    
    exercise: `The student wants a practice exercise. Create a fill-in-the-blank or sentence-building exercise that requires using "${card.korean}". Give a context sentence in ${L}, then ask the student to complete or translate it into Korean using the structure. If you include MCQ options, use "label" as the key name.`,
    
    explain: `The student is struggling. Explain the structure "${card.korean}" differently. Use an analogy with ${L} or compare it to a simpler Korean structure the student likely knows. Use concrete, visual examples rather than abstract grammar explanations. Then give one more example and ask a simpler question to rebuild confidence.`,

    register: `Give 2-3 short example sentences that CONTRAST the formal vs casual way of expressing "${card.korean}". Group them clearly (a "Formal" set and a "Casual" set). For each, write the Korean sentence, then its ${L} translation on the next line, and briefly note the situation where you'd use it. Keep it concise. Do NOT include MCQ options.`,

    rootWords: `The student wants to explore the WORD FAMILY of "${card.korean}". Generate 10-15 words that share the same root(s), hanja characters, or morphological base. For each word, write:
- The word in the target language
- Its ${L} translation
- Which root/hanja it shares with "${card.korean}"
Group them by shared root when there are multiple roots. Format as a clear numbered list. Do NOT include MCQ options. At the end, invite the student to ask questions if they want to know more about any of these words.`,
    
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
  
  return parseJSON((await callAI(sys, `Conversation so far:\n${hist}`, 3500)).text);
}

// Curated deep-links: each opens a trusted resource site pre-filtered to this
// structure (not a generic Google search). Used as a fallback when web search
// is unavailable. Language-aware, with a sensible generic set for other langs.
function resourceSearchLinks(card, tlCode) {
  const structure = card.korean.trim();
  const q = encodeURIComponent(structure);
  const target = getTargetLangName(tlCode, "en");
  const ytQ = encodeURIComponent(`${structure} ${target} grammar lesson`);
  const rdQ = encodeURIComponent(`${structure} ${target} grammar`);

  const common = [
    { title: `YouTube — leçon ${target}`, uri: `https://www.youtube.com/results?search_query=${ytQ}` },
    { title: `Reddit — apprenants ${target}`, uri: `https://www.reddit.com/search/?q=${rdQ}` },
    { title: "Wiktionary", uri: `https://en.wiktionary.org/w/index.php?search=${q}` },
  ];

  const byLang = {
    ko: [
      { title: "How To Study Korean", uri: `https://www.howtostudykorean.com/?s=${q}` },
      { title: "Talk To Me In Korean", uri: `https://talktomeinkorean.com/?s=${q}` },
      { title: "Naver 국어사전", uri: `https://ko.dict.naver.com/#/search?query=${q}` },
      { title: "HiNative", uri: `https://hinative.com/search?query=${q}` },
    ],
    fr: [
      { title: "Le Conjugueur", uri: `https://leconjugueur.lefigaro.fr/conjugaison/verbe/${q}.html` },
      { title: "TV5Monde Langue française", uri: `https://langue-francaise.tv5monde.com/decouvrir?search=${q}` },
      { title: "HiNative", uri: `https://hinative.com/search?query=${q}` },
    ],
    // de: [
    //   { title: "Lingolia Deutsch", uri: `https://deutsch.lingolia.com/?s=${q}` },
    //   { title: "DW Deutsch lernen", uri: `https://www.dw.com/search/?languageCode=de&item=${q}` },
    //   { title: "HiNative", uri: `https://hinative.com/search?query=${q}` },
    // ],
  };

  // Cap at 3, language-specific sites first (How To Study Korean already leads the ko list).
  return [...(byLang[tlCode] || []), ...common].slice(0, 3);
}

// Call the Brave-backed /api/resources route. Always resolves to { results: [...] }.
async function callResources(structure, targetLangName, uiLang, mode) {
  const res = await fetch("/api/resources", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ structure, targetLang: targetLangName, uiLang, mode: mode || "resources" }),
  });
  const raw = await res.text();
  let data;
  try { data = JSON.parse(raw); } catch { return { results: [] }; }
  return data && Array.isArray(data.results) ? data : { results: [] };
}

// "Ressources complémentaires": real web resources (with URLs) via Brave Search.
// Falls back to curated deep-links when the Brave key is missing or search fails,
// so the button always returns useful, clickable sources — never an error.
async function findResources(card, lang, tlCode) {
  const TL = getTargetLangName(tlCode, "en");
  const structure = card.korean.trim();

  const curatedFallback = () => {
    const note = lang === "fr"
      ? `Voici des sites fiables pour explorer « ${structure} » par toi-même : fiches pédagogiques et explications authentiques écrites par des humains. Compare-en plusieurs avant de te faire une idée — c'est aussi le meilleur moyen de vérifier que moi, l'IA, je n'ai pas halluciné 😉`
      : `Here are trusted sites to explore "${structure}" yourself: human-written teaching guides and authentic explanations. Compare a few before settling on one — it's also the best way to check that I, the AI, didn't hallucinate 😉`;
    return { text: note, sources: resourceSearchLinks(card, tlCode) };
  };

  try {
    const data = await callResources(structure, TL, lang);
    const results = (data.results || []).filter((r) => r && r.uri);
    if (results.length) {
      const intro = lang === "fr"
        ? `Voici des ressources authentiques (fiches, explications écrites par des humains) sur « ${structure} », pour creuser par toi-même. Compare-en plusieurs — c'est aussi un bon moyen de vérifier que moi, l'IA, je n'ai pas halluciné 😉`
        : `Authentic resources (guides, human-written explanations) about "${structure}", to dig deeper yourself. Compare a few — it's also a good way to check that I, the AI, didn't hallucinate 😉`;
      return { text: intro, sources: results };
    }
    return curatedFallback();
  } catch (e) {
    console.error("findResources error:", e);
    return curatedFallback();
  }
}

// Curated phrase-search links, used when Brave returns nothing (or has no key).
function exampleSearchLinks(card, tlCode) {
  const structure = card.korean.trim();
  const phrase = encodeURIComponent('"' + structure + '"');
  const plain = encodeURIComponent(structure);
  const links = [
    { title: `Google — « ${structure} »`, uri: `https://www.google.com/search?q=${phrase}` },
    { title: `YouTube — ${structure}`, uri: `https://www.youtube.com/results?search_query=${plain}` },
  ];
  if (tlCode === "ko") links.push({ title: `Naver — ${structure}`, uri: `https://search.naver.com/search.naver?query=${phrase}` });
  return links;
}

// "Exemples authentiques": real web occurrences of the structure via Brave Search (same
// engine as Ressources complémentaires), with a curated phrase-search fallback — reliable,
// no fabricated examples, and independent of the AI generation quota.
async function findRealExamples(card, lang, tlCode) {
  const TL = getTargetLangName(tlCode, "en");
  const structure = card.korean.trim();

  const curatedFallback = () => {
    const note = lang === "fr"
      ? `Voici des recherches pour voir « ${structure} » en usage réel. Chaque lien lance une recherche ciblée :`
      : `Here are searches to see "${structure}" in real usage. Each link runs a targeted search:`;
    return { text: note, sources: exampleSearchLinks(card, tlCode) };
  };

  try {
    const data = await callResources(structure, TL, lang, "examples");
    const results = (data.results || []).filter((r) => r && r.uri);
    if (results.length) {
      const intro = lang === "fr"
        ? `Exemples authentiques de « ${structure} » trouvés sur le web. Clique pour ouvrir la page source :`
        : `Authentic examples of "${structure}" found on the web. Click to open the source page:`;
      return { text: intro, sources: results };
    }
    return curatedFallback();
  } catch (e) {
    console.error("findRealExamples error:", e);
    return curatedFallback();
  }
}

async function genExercise(cards, mode, lang, context, tlCode, theme) {
  const L = lang === "fr" ? "French" : lang === "ko" ? "Korean" : "English";
  const TL = getTargetLangName(tlCode, "en");
  const structs = cards.map((c) => `- ${c.korean}: ${lang === "fr" ? c.description_fr : (c.description_en || c.description_fr)} (example: ${c.example_kr})`).join("\n");
  
  const modes = {
    story: `CONTINUE THE STORY MODE:

IDENTITY: You are a native ${TL} novelist. Think and write directly in ${TL}. Every sentence must sound originally written in ${TL}, with native word order, idioms, and culturally authentic details.

THEME: ${theme ? `"${theme}". Strictly respect this theme as the setting. "Daily life" means ordinary moments (cooking, commuting, shopping, a cafe, studying). Do NOT default to K-drama plots, entertainment industry, or celebrity stories.` : "Pick from the student's interests (see LEARNER PROFILE). Rotate between: daily routine, friendship, work, travel, food, hobbies, campus life, family, etc."}

YOUR PRIMARY OBJECTIVE IS CONTINUATION DESIRE: after reading your passage, the learner must immediately have ideas about what could happen next and WANT to write them. Do not resolve the central tension. Give narrative possibilities, not a completed mini-story.

STRUCTURE (6-8 sentences in ${TL}):
- Sentences 1-2: HOOK. Something unusual, intriguing, funny, unsettling or emotional happens IMMEDIATELY. No generic atmosphere intros (weather, cafe decor, routine description, "it was a beautiful day").
- Sentences 3-5: Context to understand the situation. Who is this person? What is at stake?
- Sentences 6-8: A complication or revelation that deepens the tension.
- LAST SENTENCE: The character must act or react. Stop mid-action so the learner naturally wants to write what happens next.

WRITING RULES:
- Use culturally authentic character names
- Show concrete details, not vague labels. NEVER write "something strange", "a mysterious place", "an unexpected message", "a surprising discovery". Instead SHOW the strange thing concretely without explaining it yet.
- Cut any sentence that could be removed without changing the plot. Prioritize action, reactions, meaningful details and dialogue over decorative descriptions.
- Before each sentence, silently ask yourself: "Would a reader want to know what comes next?" If not, rewrite with a stronger hook.
- The passage must read like the opening of a published ${TL} novel or a TV series episode, not a school exercise.

AFTER the story, write in ${L}:
1. A short line asking the student to continue (3-5 sentences)
2. The structures they MUST weave into their continuation
3. A reminder to stay in the story's tone

No MCQ options for this mode.`,

    qcm: `QUIZ MODE: Ask exactly ONE multiple-choice question now. This is question 1 of 3 in a series.

Structure your message like this:
1. A brief one-line intro announcing the quiz (only for question 1)
2. A short context line saying where the sentence comes from (e.g. an Instagram post, a blog, a news headline)
3. The sentence in the target language
4. The question about its meaning or nuance
5. Provide exactly 3 MCQ options, one correct

Keep the whole message SHORT and focused on this single question. Do NOT preview or list the other questions. Do NOT use markdown headers (###). Use "label" as the key for option text.`,

    fill: `FILL-IN-THE-BLANK STORY MODE: Generate a short, engaging story or paragraph (5-8 sentences) in the target language that naturally uses SOME or ALL of the vocabulary words listed below.

IMPORTANT RULES:
- THEME: ${theme ? `The student chose this theme: "${theme}". Set the story in this specific context.` : "Pick a varied, interesting context from the student's interests (see LEARNER PROFILE). Do NOT always default to K-drama scenarios; rotate between daily life, social media, friends, work, travel, food, hobbies, etc."}
- The story should feel natural and immersive, not like a textbook exercise
- You may use a SUBSET of the words if not all fit naturally (minimum 3, maximum all)
- Each word should appear EXACTLY ONCE as a blank
- Replace each used word with a numbered blank: (1)______, (2)______, etc.
- Do NOT include a word bank in the story text (the app renders it separately)

Return ONLY this JSON structure:
{
  "message": "One-line intro setting up the story context (in the student's UI language)",
  "story": "The story text in the target language with (1)______, (2)______, etc.",
  "blanks": [
    {"num": 1, "answer": "exact dictionary form from vocabulary list", "display": "conjugated/inflected form as it fits in the sentence"},
    {"num": 2, "answer": "exact dictionary form", "display": "form in context"}
  ]
}
CRITICAL: "answer" must be the EXACT word from the vocabulary list (dictionary form). "display" is how it appears grammatically in the story. If they are the same, set both to the same value.`,

    dialoguefill: `DIALOGUE FILL-IN MODE: Generate a short, realistic dialogue (6-8 lines) between two characters in the target language that naturally uses SOME or ALL of the vocabulary words listed below.

IMPORTANT RULES:
- THEME: ${theme ? `The student chose this theme: "${theme}". Set the dialogue in this specific context.` : "Pick a varied, interesting context from the student's interests (see LEARNER PROFILE). Do NOT always default to K-drama scenarios; rotate between daily life, social media, friends, work, travel, food, hobbies, etc."}
- Give the characters names and a realistic situation
- Each dialogue line MUST start with "CharacterName: " (name followed by colon and space)
- You may use a SUBSET of the words if not all fit naturally (minimum 3, maximum all)
- Each word should appear EXACTLY ONCE as a blank
- Replace each used word with a numbered blank: (1)______, (2)______, etc.
- Do NOT include a word bank in the text (the app renders it separately)

Return ONLY this JSON structure:
{
  "message": "One-line intro describing the situation (in the student's UI language)",
  "story": "The dialogue text with character names and (1)______, (2)______, etc.",
  "characters": [
    {"name": "CharName1", "gender": "F"},
    {"name": "CharName2", "gender": "M"}
  ],
  "blanks": [
    {"num": 1, "answer": "exact dictionary form from vocabulary list", "display": "conjugated/inflected form as it fits in the dialogue"},
    {"num": 2, "answer": "exact dictionary form", "display": "form in context"}
  ]
}
CRITICAL: "answer" must be the EXACT word from the vocabulary list (dictionary form). "display" is how it appears grammatically in the dialogue. If they are the same, set both to the same value. "characters" lists each speaker with their gender ("F" or "M").`
  };

  const sys = `You are a ${TL} language exercise designer. Speak in ${L}. Be clear and encouraging.
${TRANSLATION_RULE}

${context}
${modes[mode]}

Structures to practice:
${structs}

Return JSON as specified in the mode instructions above. For MCQ: {"message": "your exercise", "options": [{"label": "...", "correct": true/false}, ...]}. For story/fill modes: follow the exact JSON structure from the mode instructions. Always use "label" as the key for option text, and use boolean true/false for "correct".`;
  
  const tok = mode === "dialoguefill" ? 4000 : mode === "fill" ? 2500 : undefined;
  return parseJSON((await callAI(sys, `Generate the exercise now.`, tok)).text);
}

async function continueExercise(cards, mode, lang, conv, wasCorrect, tlCode) {
  const L = lang === "fr" ? "French" : lang === "ko" ? "Korean" : "English";
  const TL = getTargetLangName(tlCode, "en");
  const structs = cards.map((c) => `- ${c.korean}: ${lang === "fr" ? c.description_fr : (c.description_en || c.description_fr)}`).join("\n");
  const hist = conv.map((m) => `${m.role === "ai" ? "Teacher" : "Student"}: ${m.content}${m.selected ? ` [chose: ${m.selected}]` : ""}`).join("\n");
  // Count how many questions have been asked so far
  const asked = conv.filter(m => m.role === "ai").length;
  const isLast = asked >= 3;

  const isFillMode = mode === "fill" || mode === "dialoguefill";

  const feedback = wasCorrect === true
    ? "The student answered CORRECTLY. Confirm briefly (1 sentence) and explain why in 1-2 sentences."
    : wasCorrect === false
      ? "The student answered INCORRECTLY. Say which answer was right and explain why in 2-3 sentences. Be encouraging."
      : isFillMode
        ? "The student submitted their answers for the blanks. Check each answer: list which ones are correct and which are wrong. For wrong answers, give the correct word and a brief explanation. Be encouraging."
        : "Evaluate the student's written answer. If correct, confirm and explain. If not, point out what to fix and give the correct form.";

  const next = (isLast || isFillMode)
    ? `${isFillMode ? "This is a fill-in exercise, so after your correction feedback," : "This was the last question. After your feedback,"} wrap up with a short encouraging summary of how the session went (2-3 sentences). Do NOT ask another question, do NOT include options, and do NOT tell the student where to click or which tab to open: the app already shows them the buttons.`
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

// Turn the learner's dream into an INDUSTRY-news search query in the target language, so the
// interest section pulls real professional news (not fan/streaming pages) from local sources.
async function dreamToSearchQuery(dream, tlName, uiL) {
  const sys = `A language learner described their dream/aspiration below. Identify the real-world PROFESSION or INDUSTRY behind it, then build a search query to find recent ${tlName}-language NEWS about that industry — its professionals, projects, business and trends — NOT fan pages, wikis, or streaming/where-to-watch sites.

Example: dream "talk with K-drama screenwriters to create stories together" → the industry is K-drama SCREENWRITING, so a good ${tlName} query targets drama writers / scripts / the writing industry (e.g. in Korean: 드라마 작가 집필 소식), never "watch K-drama".

Return ONLY JSON: {"query":"<2-6 ${tlName} words targeting that industry's news>","label":"<a 2-4 word ${uiL} label for that world>"}`;
  const parsed = parseJSON((await callAI(sys, `Dream: ${dream}`, 150)).text);
  return { query: (parsed.query || "").toString().slice(0, 80), label: (parsed.label || "").toString().slice(0, 40) };
}

// Turn raw Brave news results (often Korean) into clean briefs in the interface language.
// Drops site homepages/boilerplate; never invents facts. Returns { general, interest }
// arrays of { i, title, description }, i = index into the original list (to keep sources).
async function summarizeRecap(general, interestItems, lang) {
  const L = lang === "fr" ? "French" : lang === "ko" ? "Korean" : "English";
  const pack = (arr) => arr.map((it, i) => `[${i}] ${it.title}\n${(it.snippet || "").slice(0, 300)}`).join("\n\n") || "(none)";
  const sys = `You are the editor of a daily news digest inside a language-learning app. Below are web/news search results (headline + snippet) in two sections, GENERAL (Korea news) and INTEREST (the learner's passion). Rewrite them as short news briefs IN ${L}, for a reader who cannot yet read Korean.
Rules:
- Translate/clarify each headline into natural, concise ${L} (no clickbait, no source name in the title).
- Write a 1-3 sentence description in ${L} summarizing the story, based ONLY on the given headline + snippet. Never invent specific facts, numbers, names or quotes not present.
- OMIT items that are just a site homepage, section page or boilerplate (e.g. titles like "Daum News | Home", "YTN channel", or snippets like "we cannot provide a description").
- Keep at most 5 per section, most newsworthy first.
Return ONLY JSON: {"general":[{"i":<original index>,"title":"...","description":"..."}],"interest":[{"i":...,"title":"...","description":"..."}]}.`;
  const user = `GENERAL:\n${pack(general)}\n\nINTEREST:\n${pack(interestItems)}`;
  return parseJSON((await callAI(sys, user, 1800)).text);
}

// Find a few illustrative images for a vocab word via Brave image search (keyless to the
// user; separate quota from Gemini). Resolves to [] on any error so the caller can degrade.
async function fetchImages(query, count) {
  try {
    const res = await fetch("/api/image", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, count: count || 20 }),
    });
    const raw = await res.text();
    let d; try { d = JSON.parse(raw); } catch { return []; }
    return d.images || [];
  } catch { return []; }
}

// Fetch a social post's full thread (ancestors + post + replies) for the in-app viewer.
async function fetchThread(item) {
  const res = await fetch("/api/feed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "thread", src: item.src, uri: item.uri, mhost: item.mhost, mid: item.mid }),
  });
  const raw = await res.text();
  let data;
  try { data = JSON.parse(raw); } catch { throw new Error("Réponse illisible: " + raw.substring(0, 150)); }
  if (!res.ok) throw new Error(data.error || raw.substring(0, 150));
  return data.posts || [];
}

async function generateSummary(card, conv, lang) {
  const L = lang === "fr" ? "French" : lang === "ko" ? "Korean" : "English";
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
  "category": "a short thematic tag (1-3 words) classifying this structure or word, e.g. 'emotions', 'travel', 'formal speech', 'time expressions', 'causality', 'food', 'politeness'. Pick the most natural theme based on the lesson content.",
  "formality": "ONLY for a Korean VOCABULARY WORD (card type 'vocab', target language Korean): the word's usual register, exactly one of 'casual' (everyday/informal speech), 'neutral' (standard, works in most contexts), or 'formal' (formal/polite/honorific or written register). Empty string for grammar structures, non-vocab, or non-Korean.",
  "profileInsights": {
    "interests": "New interests mentioned. Empty string if none.",
    "level": "Level observations. Empty string if none.",
    "notes": "Other personal info. Empty string if none."
  },
  "derivedStructures": [
    {
      "korean": "pattern name",
      "type": "grammar (a grammatical pattern) or vocab (a word / set phrase / idiom)",
      "description_fr": "one sentence in French",
      "description_en": "one sentence in English",
      "example_kr": "example sentence",
      "example_fr": "French translation",
      "example_en": "English translation"
    }
  ]
}

For "derivedStructures": include any related patterns the TEACHER introduced. Empty array [] if none.`;

  return parseJSON((await callAI(sys, `Structure studied: ${card.korean}\nCard type: ${card.type || "unknown"}; target language: ${card.targetLang || "ko"}\n\nFull conversation:\n${hist}`, 4000)).text);
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

// Remove extracted grammar/vocab items that duplicate an existing library card, and
// de-duplicate within the extraction. A card already "studied" (but not acquired) may be
// re-proposed once for review; anything acquired / already queued is dropped.
function dedupeExtracted(items, existingCards) {
  const byKorean = {};
  (existingCards || []).forEach(c => { if (c && c.korean) byKorean[c.korean.trim()] = c; });
  const seen = new Set();
  return (items || []).filter(it => {
    const key = ((it && (it.korean || it.word)) || "").trim();
    if (!key || seen.has(key)) return false;   // empty or already in this batch
    seen.add(key);
    const ex = byKorean[key];
    if (!ex) return true;                        // brand new -> show
    return migrateStatus(ex.status) === "studied"; // studied -> re-show; acquired/queued -> hide
  });
}

function statusInfo(status, t) {
  const s = migrateStatus(status);
  switch (s) {
    case "new": return { label: t.statusNew, color: C.stNew, bg: C.stNewBg, border: C.stNewB };
    case "in_progress": return { label: t.statusNew, color: C.stNew, bg: C.stNewBg, border: C.stNewB };
    case "studied": return { label: t.statusStudied, color: C.stStudied, bg: C.stStudiedBg, border: C.stStudiedB };
    case "acquired": return { label: t.statusAcquired, color: C.stAcq, bg: C.stAcqBg, border: C.stAcqB };
    default: return { label: s, color: C.stNew, bg: C.stNewBg, border: C.stNewB };
  }
}

// Only two card types: a grammar structure, or vocab (any lexical item — word, set phrase,
// idiom). The old "expression" type folds into vocab; the AI/vocab/grammar distinction was
// unreliable, so anything that isn't grammar is vocab.
function normType(type) {
  return type === "grammar" ? "grammar" : "vocab";
}
function typeLabel(type, t) {
  return normType(type) === "grammar" ? t.grammar : t.vocab;
}

// =============================================
// CARD PROGRESSION - Spaced Repetition
// =============================================
const SPACED_REP_SCHEDULE = {
  6:  { R: 1, intervals: [1] },
  13: { R: 2, intervals: [1, 5] },
  21: { R: 3, intervals: [1, 4, 10] },
  35: { R: 5, intervals: [1, 3, 7, 14, 21] },
  Infinity: { R: 7, intervals: [1, 3, 7, 14, 21, 30, 42] },
};

function getSpacedSchedule(daysAvailable) {
  for (const [maxDays, schedule] of Object.entries(SPACED_REP_SCHEDULE)) {
    if (daysAvailable <= Number(maxDays)) return schedule;
  }
  return SPACED_REP_SCHEDULE[Infinity];
}

function getCardReviewCount(card) {
  return (card.reviewDates || []).length;
}

function getCardNextReviewDate(card, daysAvailable) {
  const discovered = card.discoveredDate;
  if (!discovered) return null;
  const schedule = getSpacedSchedule(daysAvailable || Infinity);
  const reviewCount = getCardReviewCount(card);
  if (reviewCount >= schedule.R) return null;
  const dDate = new Date(discovered + "T00:00:00");
  const nextInterval = schedule.intervals[reviewCount] || schedule.intervals[schedule.intervals.length - 1];
  const next = new Date(dDate);
  next.setDate(next.getDate() + nextInterval);
  return next.toISOString().slice(0, 10);
}

function isCardGoalAcquired(card, daysAvailable) {
  const schedule = getSpacedSchedule(daysAvailable);
  return getCardReviewCount(card) >= schedule.R;
}

function isCardLongTermAcquired(card) {
  return getCardReviewCount(card) >= SPACED_REP_SCHEDULE[Infinity].R;
}

const GENDERED_LANGS = new Set(["fr", "de", "es", "it", "pt", "ru", "ar", "pl", "nl", "el"]);

function exModeToCategory(mode) {
  switch (mode) {
    case "flash": case "match": case "qcm": case "fill": return "ce";
    case "youglish": case "dictation": return "co";
    case "imgwrite": case "cross": case "story": case "dialoguefill": return "pe";
    default: return null;
  }
}

function recordExerciseProgress(dataObj, cardIds, exMode) {
  const cat = exModeToCategory(exMode);
  if (!cat || !cardIds.length) return { data: dataObj, autoAcquiredIds: [] };
  const today = new Date().toISOString().slice(0, 10);
  let autoAcquiredIds = [];
  const goals = dataObj.goals || [];
  const cards = dataObj.cards.map(c => {
    if (!cardIds.includes(c.id)) return c;
    const prog = c.progress ? { ...c.progress } : { ce: [], co: [], pe: [], po: [] };
    const days = prog[cat] || [];
    if (!days.includes(today)) prog[cat] = [...days, today];
    const reviewDates = c.reviewDates || [];
    if (!reviewDates.includes(today)) reviewDates.push(today);
    const discoveredDate = c.discoveredDate || today;
    let newStatus = c.status;
    let goalAcquired = c.goalAcquired || false;
    if (c.goalId) {
      const goal = goals.find(g => g.id === c.goalId);
      if (goal) {
        const dLeft = Math.max(1, Math.ceil((new Date(goal.deadline + "T23:59:59") - new Date(discoveredDate + "T00:00:00")) / 86400000));
        if (isCardGoalAcquired({ ...c, reviewDates, discoveredDate }, dLeft)) goalAcquired = true;
      }
    }
    if (isCardLongTermAcquired({ ...c, reviewDates }) && newStatus !== "acquired") {
      newStatus = "acquired";
      autoAcquiredIds.push(c.id);
    }
    return { ...c, progress: prog, reviewDates, discoveredDate, status: newStatus, goalAcquired };
  });
  return { data: { ...dataObj, cards }, autoAcquiredIds };
}

// =============================================
// CELEBRATION MEMES (Issue #76)
// =============================================
const CELEBRATION_SOUNDS = [
  "/sounds/validation/242501__gabrielaraujo__powerupsuccess.wav",
  "/sounds/validation/456965__funwithsound__short-success-sound-glockenspiel-treasure-video-game.mp3",
  "/sounds/validation/456966__funwithsound__success-fanfare-trumpets.mp3",
  "/sounds/validation/511484__mlaudio__success_bell.wav",
  "/sounds/validation/615099__mlaudio__magic_game_win_success.wav",
];

const CELEBRATION_GIFS = [
  { type: "tenor", id: "15007715" },
  { type: "tenor", id: "13717594879666614680" },
  { type: "tenor", id: "27610253" },
  { type: "tenor", id: "14309526032666019213" },
  { type: "tenor", id: "26668829" },
  { type: "tenor", id: "16817567465909252322" },
  { type: "tenor", id: "8780339755399479600" },
  { type: "tenor", id: "3268558299978945200" },
  { type: "tenor", id: "17425764863703054288" },
  { type: "tenor", id: "1598914448700171832" },
  { type: "tenor", id: "18218929844289842271" },
  { type: "tenor", id: "18317846230783265167" },
  { type: "tenor", id: "14160543473475444161" },
];

const CELEBRATION_MESSAGES_FR = [
  "Bien joué !", "Bravo !", "Génial !", "Tu gères !", "Excellent !",
  "Continue comme ça !", "Super travail !", "Trop fort !", "Yeah !",
];
const CELEBRATION_MESSAGES_EN = [
  "Well done!", "Bravo!", "Awesome!", "You nailed it!", "Excellent!",
  "Keep it up!", "Great work!", "Amazing!", "Yeah!",
];
const CELEBRATION_MESSAGES_KO = [
  "잘했어!", "대단해!", "멋져!", "완벽해!", "최고!",
  "이 조자로!", "굿!", "화이팅!", "짱!",
];

function CelebrationOverlay({ visible, onClose, lang }) {
  const [entry] = useState(() => CELEBRATION_GIFS[Math.floor(Math.random() * CELEBRATION_GIFS.length)]);
  const msgs = lang === "fr" ? CELEBRATION_MESSAGES_FR : lang === "ko" ? CELEBRATION_MESSAGES_KO : CELEBRATION_MESSAGES_EN;
  const [msg] = useState(() => msgs[Math.floor(Math.random() * msgs.length)]);

  useEffect(() => {
    if (!visible) return;
    const src = CELEBRATION_SOUNDS[Math.floor(Math.random() * CELEBRATION_SOUNDS.length)];
    const a = new Audio(src);
    a.volume = 0.5;
    a.play().catch(() => {});
  }, [visible]);

  if (!visible) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 2000, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)",
      cursor: "pointer", animation: "fadeIn 0.2s ease-out",
    }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#fff", marginBottom: 16, textShadow: "0 2px 8px rgba(0,0,0,0.4)", textAlign: "center" }}>
        🎉 {msg}
      </div>
      <div style={{ width: 280, height: 280, borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.3)", background: "#111", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 100, position: "absolute", zIndex: 0 }}>🥳</span>
        <iframe
          src={`https://tenor.com/embed/${entry.id}`}
          style={{ position: "absolute", inset: -20, width: "calc(100% + 40px)", height: "calc(100% + 40px)", border: "none", pointerEvents: "none", zIndex: 1 }}
          allowFullScreen
          title="celebration"
        />
      </div>
      <div style={{ marginTop: 16, fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
        {lang === "fr" ? "Touche pour continuer" : lang === "ko" ? "터치해서 계속" : "Tap to continue"}
      </div>
    </div>
  );
}

// =============================================
// TRY AGAIN MEMES (Issue #85)
// =============================================
const TRYAGAIN_GIFS = [
  { type: "tenor", id: "4594291201445099477" },
  { type: "tenor", id: "7859548" },
  { type: "tenor", id: "23923161" },
  { type: "tenor", id: "6007654011400576648" },
  { type: "tenor", id: "22763241" },
  { type: "tenor", id: "18154031" },
  { type: "tenor", id: "2957807524932750242" },
  { type: "tenor", id: "17896755514491849937" },
  { type: "tenor", id: "20066437" },
  { type: "tenor", id: "16810389090500041515" },
  { type: "tenor", id: "13022311" },
  { type: "tenor", id: "9007567504723413811" },
  { type: "tenor", id: "5802860041520475247" },
  { type: "tenor", id: "10499461630894773748" },
];

const TRYAGAIN_MESSAGES_FR = [
  "Pas grave, on recommence !", "Presque ! Encore un essai ?", "T'abandonnes pas, hein ?",
  "Allez, une autre chance !", "C'est en forgeant qu'on forge !", "Tu vas y arriver !",
];
const TRYAGAIN_MESSAGES_EN = [
  "Nice try! Again?", "Almost! One more shot?", "Don't give up!",
  "Let's try again!", "Practice makes perfect!", "You got this!",
];
const TRYAGAIN_MESSAGES_KO = [
  "괜찮아, 다시 해보자!", "거의 다 맞았어!", "포기하지 마!",
  "한 번 더!", "연습하면 잘할 수 있어!", "할 수 있어!",
];

const FAILURE_SOUNDS = [
  "/failure/370209__jugraf__fail-down.wav",
  "/failure/508862__xyahka__oh-really.m4a",
  "/failure/643668__snowfightstudios__indiana-jones-fail-music.mp3",
];

function TryAgainOverlay({ visible, onClose, lang }) {
  const [entry] = useState(() => TRYAGAIN_GIFS[Math.floor(Math.random() * TRYAGAIN_GIFS.length)]);
  const msgs = lang === "fr" ? TRYAGAIN_MESSAGES_FR : lang === "ko" ? TRYAGAIN_MESSAGES_KO : TRYAGAIN_MESSAGES_EN;
  const [msg] = useState(() => msgs[Math.floor(Math.random() * msgs.length)]);

  useEffect(() => {
    if (!visible) return;
    const src = FAILURE_SOUNDS[Math.floor(Math.random() * FAILURE_SOUNDS.length)];
    const a = new Audio(src);
    a.volume = 0.5;
    a.play().catch(() => {});
  }, [visible]);

  if (!visible) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 2000, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)",
      cursor: "pointer", animation: "fadeIn 0.2s ease-out",
    }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#fff", marginBottom: 16, textShadow: "0 2px 8px rgba(0,0,0,0.4)", textAlign: "center" }}>
        💪 {msg}
      </div>
      <div style={{ width: 280, height: 280, borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.3)", background: "#111", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 100, position: "absolute", zIndex: 0 }}>😅</span>
        <iframe
          src={`https://tenor.com/embed/${entry.id}`}
          style={{ position: "absolute", inset: -20, width: "calc(100% + 40px)", height: "calc(100% + 40px)", border: "none", pointerEvents: "none", zIndex: 1 }}
          allowFullScreen
          title="try again"
        />
      </div>
      <div style={{ marginTop: 16, fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
        {lang === "fr" ? "Touche pour continuer" : lang === "ko" ? "터치해서 계속" : "Tap to continue"}
      </div>
    </div>
  );
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

function Bubble({ msg, revealAll, onResourceClick, onMoreImages, onAttachImage, imgLabels = { other: "Other images", refine: "Refine…", choose: "Choose" } }) {
  const ai = msg.role === "ai";
  const [preSel, setPreSel] = useState(null);
  const [imgRefine, setImgRefine] = useState("");
  const [clickedLinks, setClickedLinks] = useState(() => new Set());
  const confirmed = !!msg.selected;
  const canPick = ai && !confirmed && msg.options && msg.onSelect;

  return (
    <div style={{ display: "flex", gap: 7, alignSelf: ai ? "flex-start" : "flex-end", flexDirection: ai ? "row" : "row-reverse", maxWidth: ai ? "92%" : "80%" }}>
      <div style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0, background: C.s1, border: `1px solid ${C.border}`, color: C.txtM }}>
        {ai ? "✦" : "🧑"}
      </div>
      <div style={{ minWidth: 0, padding: "10px 13px", borderRadius: ai ? "2px 12px 12px 12px" : "12px 2px 12px 12px", fontSize: 14.5, lineHeight: 1.75, whiteSpace: "pre-wrap", fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif", background: ai ? C.s2 : C.acc, border: ai ? `1px solid ${C.border}` : "none", color: ai ? C.txt : C.onAcc }}>
        {msg.degraded && (
          <div style={{ marginBottom: 8, padding: "6px 9px", background: C.warnBg, border: `1px solid ${C.warnB}`, borderRadius: 6, fontSize: 10.5, color: C.warn, lineHeight: 1.5 }}>
            ⚠️ Recherche web temporairement indisponible. Des liens de recherche ciblés sont proposés ci-dessous.
          </div>
        )}
        {ai ? renderMarkdown(msg.content, revealAll) : msg.content}
        {msg.images && msg.images.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {msg.images.map((im, i) => (
                <div key={i} style={{ position: "relative", lineHeight: 0 }}>
                  <a href={im.link || im.url || im.thumb} target="_blank" rel="noopener noreferrer" style={{ display: "block", lineHeight: 0 }}>
                    <img src={im.thumb || im.url} alt={im.title || ""} loading="lazy"
                      style={{ width: 148, height: 148, objectFit: "cover", borderRadius: 8, border: `1px solid ${C.border}`, background: C.s1 }} />
                  </a>
                  {onAttachImage && (
                    <button onClick={() => onAttachImage(im)} title={imgLabels.choose}
                      style={{ position: "absolute", right: 6, bottom: 6, display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 14, border: "none", background: "rgba(0,0,0,0.62)", color: "#fff", fontFamily: "'Plus Jakarta Sans'", fontSize: 11, fontWeight: 500, cursor: "pointer" }}>
                      ＋ {imgLabels.choose}
                    </button>
                  )}
                </div>
              ))}
            </div>
            {onMoreImages && (
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                <button onClick={() => onMoreImages("")}
                  style={{ padding: "5px 11px", borderRadius: 16, border: `1px solid ${C.border}`, background: C.s1, color: C.txtS, fontFamily: "'Plus Jakarta Sans'", fontSize: 11.5, cursor: "pointer" }}>🔄 {imgLabels.other}</button>
                <input value={imgRefine} onChange={e => setImgRefine(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && imgRefine.trim()) { onMoreImages(imgRefine); setImgRefine(""); } }}
                  placeholder={imgLabels.refine}
                  style={{ flex: 1, minWidth: 120, border: `1px solid ${C.border}`, borderRadius: 16, padding: "5px 11px", fontFamily: "'Plus Jakarta Sans'", fontSize: 11.5, color: C.txt, background: C.s1, outline: "none" }} />
                {imgRefine.trim() && (
                  <button onClick={() => { onMoreImages(imgRefine); setImgRefine(""); }}
                    style={{ padding: "5px 11px", borderRadius: 16, border: "none", background: C.acc, color: C.onAcc, fontFamily: "'Plus Jakarta Sans'", fontSize: 11.5, cursor: "pointer" }}>→</button>
                )}
              </div>
            )}
          </div>
        )}
        {msg.sources && msg.sources.length > 0 && (
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.txtM, textTransform: "uppercase", marginBottom: 5 }}>Sources</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {msg.sources.map((s, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                  <a href={s.uri} target="_blank" rel="noopener noreferrer"
                    onClick={() => { if (msg.pointOnClick && onResourceClick && s.uri && !clickedLinks.has(s.uri)) { onResourceClick(); setClickedLinks(prev => { const n = new Set(prev); n.add(s.uri); return n; }); } }}
                    style={{ fontSize: 11, color: C.acc, textDecoration: "none", display: "flex", alignItems: "center", gap: 4, lineHeight: 1.4, minWidth: 0, maxWidth: "100%" }}>
                    <span style={{ flexShrink: 0 }}>🔗</span>
                    <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</span>
                  </a>
                  {s.snippet && (
                    <span style={{ fontSize: 10, color: C.txtS, lineHeight: 1.45, marginLeft: 18, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{s.snippet}</span>
                  )}
                </div>
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
                    borderRadius: 8, padding: "8px 12px", fontSize: 13.5,
                    color: showOk ? C.ok : bad ? C.warn : isPre ? C.acc : C.txt,
                    cursor: confirmed ? "default" : "pointer",
                    fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif", textAlign: "left",
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

// Compact card for the "Acquired" shelf — title only (they're mastered). Click to review.
function AcquiredCard({ card, t, onReview, onToggle, onDelete }) {
  return (
    <div onClick={onReview} title={t.reviewBtn}
      style={{ display: "inline-flex", alignItems: "center", gap: 7, background: C.s2, border: `1px solid ${C.border}`, borderRadius: 20, padding: "6px 8px 6px 12px", cursor: "pointer", transition: "border-color 0.12s" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = C.stAcq; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.stAcq, flexShrink: 0 }} />
      <span style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 14, color: C.txt }}>{card.korean}</span>
      <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: card.type === "grammar" ? C.accBg : C.proBg, color: card.type === "grammar" ? C.acc : C.pro }}>{typeLabel(card.type, t)}</span>
      <button onClick={e => { e.stopPropagation(); onToggle(); }} title={t.toStudiedTitle}
        style={{ width: 20, height: 20, borderRadius: 6, border: "none", background: "transparent", color: C.txtM, cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
        onMouseEnter={e => { e.currentTarget.style.color = C.acc; e.currentTarget.style.background = C.accBg; }}
        onMouseLeave={e => { e.currentTarget.style.color = C.txtM; e.currentTarget.style.background = "transparent"; }}>↩</button>
      {onDelete && (
        <button onClick={e => { e.stopPropagation(); onDelete(); }} title={t.deleteCard}
          style={{ width: 20, height: 20, borderRadius: 6, border: "none", background: "transparent", color: C.txtM, cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.color = C.warn; e.currentTarget.style.background = C.warnBg; }}
          onMouseLeave={e => { e.currentTarget.style.color = C.txtM; e.currentTarget.style.background = "transparent"; }}>🗑</button>
      )}
    </div>
  );
}

// A card rendered as a horizontal "book spine": a colored binding + the Korean form.
// masked = hide the meaning (a "?" instead), for cards not yet learned.
function BookSpine({ card, t, color, cardBg, masked, compact, active, onClick, onToggleStatus, onDelete }) {
  const iconBtn = (glyph, title, handler, hover) => (
    <button onClick={e => { e.stopPropagation(); handler(); }} title={title}
      style={{ width: 19, height: 19, borderRadius: 5, border: "none", background: "transparent", color: C.txtM, cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
      onMouseEnter={e => { e.currentTarget.style.color = hover; e.currentTarget.style.background = C.s1; }}
      onMouseLeave={e => { e.currentTarget.style.color = C.txtM; e.currentTarget.style.background = "transparent"; }}>{glyph}</button>
  );
  return (
    <div onClick={onClick}
      style={{ display: "inline-flex", alignItems: "stretch", background: cardBg || C.s2, border: `1px solid ${active ? color : "transparent"}`, borderRadius: 6, overflow: "hidden", cursor: "pointer", transition: "border-color 0.12s, transform 0.1s" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = active ? color : "transparent"; e.currentTarget.style.transform = "none"; }}>
      <span style={{ width: compact ? 6 : 8, background: color, opacity: 0.75, flexShrink: 0 }} />
      <span style={{ width: 1, background: "rgba(255,255,255,0.35)", flexShrink: 0 }} />
      <span style={{ padding: compact ? "6px 8px 6px 11px" : "8px 10px 8px 11px", display: "flex", alignItems: "center", gap: 7 }}>
        {card.images && card.images[0] && <img src={card.images[0].thumb || card.images[0].url} alt="" style={{ width: compact ? 18 : 22, height: compact ? 18 : 22, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />}
        <span style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: compact ? 13.5 : 14.5, color: C.txt }}>{card.korean}</span>
        {masked && <span style={{ width: 15, height: 15, borderRadius: "50%", background: C.s1, color: C.txtM, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans'" }}>?</span>}
        {onToggleStatus && iconBtn("↩", t.toStudied, onToggleStatus, C.acc)}
        {onDelete && iconBtn("🗑", t.deleteCard, onDelete, C.warn)}
      </span>
    </div>
  );
}

// Where "today's weather" comes from, per target language (a representative city).
const WEATHER_CITY = {
  ko: { name: "Séoul", lat: 37.5665, lon: 126.978 },
  de: { name: "Berlin", lat: 52.52, lon: 13.405 },
};
function weatherEmoji(code) {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code >= 45 && code <= 48) return "🌫️";
  if (code >= 51 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "❄️";
  if (code >= 80 && code <= 86) return "🌦️";
  if (code >= 95) return "⛈️";
  return "🌡️";
}

// Local calendar day, used to keep the "Aujourd'hui" set stable until the next day.
function dayKey() { return new Date().toISOString().slice(0, 10); }

const LANG_LEVELS = ["native", "bilingual", "advanced", "intermediate"];
function langLevelLabel(level, t) {
  return { native: t.langLevelNative, bilingual: t.langLevelBilingual, advanced: t.langLevelAdvanced, intermediate: t.langLevelIntermediate }[level] || "";
}
function LanguagesTable({ value, onChange, t }) {
  const rows = Array.isArray(value) ? value : [];
  const setRow = (i, patch) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const addRow = () => onChange([...rows, { lang: "", level: "" }]);
  const delRow = (i) => onChange(rows.filter((_, j) => j !== i));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {rows.length > 0 && (
        <div style={{ display: "flex", gap: 8, fontSize: 10.5, color: C.txtM, fontWeight: 600, padding: "0 2px" }}>
          <span style={{ flex: 1 }}>{t.langColLang}</span>
          <span style={{ width: 150 }}>{t.langColLevel}</span>
          <span style={{ width: 24 }} />
        </div>
      )}
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input value={r.lang || ""} onChange={e => setRow(i, { lang: e.target.value })} placeholder={t.langPh}
            style={{ flex: 1, minWidth: 0, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", fontFamily: "'Plus Jakarta Sans'", fontSize: 13, color: C.txt, background: C.s1, outline: "none" }} />
          <select value={r.level || ""} onChange={e => setRow(i, { level: e.target.value })}
            style={{ width: 150, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", fontFamily: "'Plus Jakarta Sans'", fontSize: 13, color: r.level ? C.txt : C.txtM, background: C.s1, outline: "none", cursor: "pointer", appearance: "auto" }}>
            <option value="">{t.langLevelPick}</option>
            {LANG_LEVELS.map(lv => <option key={lv} value={lv}>{langLevelLabel(lv, t)}</option>)}
          </select>
          <button onClick={() => delRow(i)} title="×"
            style={{ width: 24, height: 24, flexShrink: 0, borderRadius: 6, border: `1px solid ${C.border}`, background: C.s1, color: C.txtM, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
      ))}
      <button onClick={addRow}
        style={{ alignSelf: "flex-start", padding: "5px 12px", borderRadius: 6, border: `1px dashed ${C.borderS}`, background: "none", color: C.acc, cursor: "pointer", fontSize: 12, fontWeight: 500, fontFamily: "'Plus Jakarta Sans'" }}>
        {t.langAddRow}
      </button>
    </div>
  );
}

function TagPicker({ cardId, existingTags, allTags, onAdd, onClose, t }) {
  const [inp, setInp] = useState("");
  const available = allTags.filter(tag => !existingTags.includes(tag));
  const filtered = inp.trim() ? available.filter(tag => tag.includes(inp.toLowerCase().trim())) : available;
  const canAddCustom = inp.trim() && !existingTags.includes(inp.toLowerCase().trim()) && existingTags.length < 3;
  return (
    <div onClick={e => e.stopPropagation()} style={{ background: C.s1, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", marginBottom: 8 }}>
      <input value={inp} onChange={e => setInp(e.target.value)} placeholder={t.tagPlaceholder}
        onKeyDown={e => { if (e.key === "Enter" && canAddCustom) { onAdd(cardId, inp.trim()); setInp(""); } }}
        autoFocus
        style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 8px", fontSize: 12, fontFamily: "'Plus Jakarta Sans'", color: C.txt, background: C.s2, outline: "none", boxSizing: "border-box", marginBottom: 6 }} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {canAddCustom && !filtered.includes(inp.toLowerCase().trim()) && (
          <button onClick={() => { onAdd(cardId, inp.trim()); setInp(""); }}
            style={{ padding: "3px 10px", borderRadius: 10, border: `1px solid ${C.acc}`, background: C.accBg, color: C.acc, fontSize: 10, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", fontWeight: 500 }}>
            + {inp.trim().toLowerCase()}
          </button>
        )}
        {filtered.slice(0, 12).map(tag => (
          <button key={tag} onClick={() => { onAdd(cardId, tag); setInp(""); }}
            style={{ padding: "3px 10px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.s2, color: C.txtS, fontSize: 10, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>
            #{tag}
          </button>
        ))}
      </div>
    </div>
  );
}

function GrammarCard({ card, t, onToggle, onReview, onDelete, onAddTag, onRemoveTag, allTags, tagEditId, onTagEditToggle }) {
  const si = statusInfo(card.status, t);
  const canToggle = card.status === "studied" || card.status === "acquired";
  const tags = card.tags || [];
  const isEditing = tagEditId === card.id;
  return (
    <div onClick={onReview}
      style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, position: "relative", overflow: "hidden", cursor: "pointer", transition: "transform 0.12s, box-shadow 0.12s" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
      <div style={{ position: "absolute", bottom: -12, right: -3, fontFamily: "'Noto Sans KR', sans-serif", fontSize: 72, fontWeight: 500, color: C.acc, opacity: 0.07, lineHeight: 1, pointerEvents: "none", userSelect: "none" }}>
        {card.korean.replace(/[~()]/g, "").slice(0, 2)}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 7px", borderRadius: 4, background: card.type === "grammar" ? C.accBg : C.proBg, color: card.type === "grammar" ? C.acc : C.pro }}>{typeLabel(card.type, t)}</span>
        <button onClick={e => { e.stopPropagation(); if (canToggle) onToggle(); }}
          style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 7px", borderRadius: 10, fontSize: 10, cursor: canToggle ? "pointer" : "default", border: "none", background: si.bg, color: si.color, fontFamily: "'Plus Jakarta Sans'" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: si.color }} />
          {si.label}
        </button>
        {(card.reviewCount || 0) > 0 && (
          <span style={{ fontSize: 9, color: C.txtM }}>({t.reviewCount(card.reviewCount)})</span>
        )}
        <span style={{ fontSize: 11, color: C.txtM, marginLeft: "auto" }}>{card.date}</span>
        {onDelete && (
          <button onClick={e => { e.stopPropagation(); onDelete(); }} title={t.deleteCard}
            style={{ width: 22, height: 22, borderRadius: 6, border: "none", background: "transparent", color: C.txtM, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.color = C.warn; e.currentTarget.style.background = C.warnBg; }}
            onMouseLeave={e => { e.currentTarget.style.color = C.txtM; e.currentTarget.style.background = "transparent"; }}>
            🗑
          </button>
        )}
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
      {/* Tags */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8, alignItems: "center" }}>
        {tags.map(tag => (
          <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: 10, background: C.accBg, color: C.acc, fontSize: 10, fontWeight: 500, fontFamily: "'Plus Jakarta Sans'" }}>
            #{tag}
            {isEditing && <span onClick={e => { e.stopPropagation(); onRemoveTag(card.id, tag); }} style={{ cursor: "pointer", opacity: 0.6, marginLeft: 2 }}>x</span>}
          </span>
        ))}
        {tags.length < 3 && (
          <button onClick={e => { e.stopPropagation(); onTagEditToggle(card.id); }}
            style={{ padding: "2px 7px", borderRadius: 10, border: `1px dashed ${C.borderS}`, background: "none", color: C.txtM, fontSize: 10, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>
            + {t.addTag}
          </button>
        )}
      </div>
      {isEditing && (
        <TagPicker cardId={card.id} existingTags={tags} allTags={allTags} onAdd={onAddTag} onClose={() => onTagEditToggle(null)} t={t} />
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
                {showNotes ? (lang === "fr" ? "Masquer les notes du tuteur" : lang === "ko" ? "선생님 메모 숨기기" : "Hide tutor notes") : (lang === "fr" ? "Notes du tuteur" : lang === "ko" ? "선생님 메모" : "Tutor notes")}
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
              {typeLabel(card.type, t)}
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
// SOURCES VIEW (original texts + their points)
// =============================================
function SourcesView({ cards, summaries, textStudies, t, lang, tFont, onReview, onRestudy, onResumeComprehension }) {
  const byKorean = {};
  cards.forEach(c => { byKorean[c.korean] = c; });
  // Derived cards resolve to their parent's source text.
  const resolveText = (c) => {
    if (c.articleText) return c.articleText;
    if (c.parentKorean && byKorean[c.parentKorean] && byKorean[c.parentKorean].articleText) return byKorean[c.parentKorean].articleText;
    return "";
  };
  const groupMap = new Map();
  const noSource = [];
  cards.forEach(c => {
    const text = resolveText(c);
    if (text) {
      if (!groupMap.has(text)) groupMap.set(text, []);
      groupMap.get(text).push(c);
    } else {
      noSource.push(c);
    }
  });
  const groups = [...groupMap.entries()].map(([text, cs]) => ({ text, cards: cs }));

  const recapExcerptFor = (c) => {
    const s = (summaries || []).filter(x => x.cardKorean === c.korean);
    if (!s.length) return "";
    const last = s[s.length - 1];
    return (last.grammarRecap || last.structuresLearned || last.nextSteps || "").slice(0, 220);
  };

  const PointChip = ({ c }) => {
    const si = statusInfo(c.status, t);
    return (
      <button onClick={() => onReview(c)}
        style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 9px", background: C.s1, border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = C.acc; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: si.color, flexShrink: 0 }} />
        <span style={{ fontFamily: tFont, fontSize: 13, color: C.txt }}>{c.korean}</span>
        <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: c.type === "grammar" ? C.accBg : C.proBg, color: c.type === "grammar" ? C.acc : C.pro }}>{typeLabel(c.type, t)}</span>
      </button>
    );
  };

  return (
    <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
      {groups.map((g, i) => (
        <div key={i} style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
          <div style={{ fontFamily: tFont, fontSize: 13.5, color: C.txt, lineHeight: 1.9, whiteSpace: "pre-wrap", maxHeight: 170, overflowY: "auto", background: C.s1, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px" }}>
            {g.text}
          </div>
          <button onClick={() => onRestudy(g.text)}
            style={{ marginTop: 10, padding: "6px 13px", borderRadius: 6, border: "none", background: C.acc, color: C.onAcc, fontFamily: "'Plus Jakarta Sans'", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
            ✨ {t.restudyText}
          </button>
          <div style={{ fontSize: 10, color: C.txtM, textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.3, margin: "13px 0 7px" }}>{t.pointsFromText}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {g.cards.map(c => <PointChip key={c.id} c={c} />)}
          </div>
        </div>
      ))}
      {noSource.length > 0 && (
        <div>
          <div style={{ fontSize: 10.5, color: C.txtM, textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.3, margin: "2px 0 8px" }}>{t.sourcesNone}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {noSource.map(c => {
              const ex = recapExcerptFor(c);
              return (
                <div key={c.id} style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
                  <PointChip c={c} />
                  {ex && (
                    <div style={{ marginTop: 8, fontSize: 12, color: C.txtS, lineHeight: 1.6 }}>
                      <span style={{ fontSize: 9, color: C.txtM, textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.3 }}>{t.recapExcerpt}</span>
                      <div style={{ marginTop: 3 }}>{ex}{ex.length >= 220 ? "…" : ""}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Text comprehension studies */}
      {(textStudies || []).length > 0 && (
        <div>
          <div style={{ fontSize: 10.5, color: C.txtM, textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.3, margin: "14px 0 8px" }}>{t.compTitle}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {textStudies.map(s => (
              <div key={s.id} style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
                <div style={{ fontFamily: tFont, fontSize: 12.5, color: C.txt, lineHeight: 1.8, whiteSpace: "pre-wrap", maxHeight: 100, overflowY: "auto", background: C.s1, borderRadius: 6, padding: "8px 10px", marginBottom: 8 }}>
                  {s.text.slice(0, 300)}{s.text.length > 300 ? "..." : ""}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: s.level1Complete ? "#e8f5e9" : C.s1, color: s.level1Complete ? C.ok : C.txtM, fontWeight: 500 }}>
                    {t.compLevel(1)} {s.level1Complete ? "✓" : ""}
                  </span>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: s.level2Complete ? "#e8f5e9" : C.s1, color: s.level2Complete ? C.ok : C.txtM, fontWeight: 500 }}>
                    {t.compLevel(2)} {s.level2Complete ? "✓" : ""}
                  </span>
                  <span style={{ fontSize: 10, color: C.txtM }}>{s.date}</span>
                  {(!s.level1Complete || !s.level2Complete) && onResumeComprehension && (
                    <button onClick={() => onResumeComprehension(s)}
                      style={{ marginLeft: "auto", padding: "4px 10px", borderRadius: 6, border: "none", background: C.acc, color: C.onAcc, fontFamily: "'Plus Jakarta Sans'", fontSize: 11, fontWeight: 500, cursor: "pointer" }}>
                      {t.compResume}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================
// VOCAB LESSON (one word at a time, 5-step study)
// =============================================
// =============================================
// TEXT COMPREHENSION (Issue #45)
// =============================================
function TextComprehension({ text, lang, tl, context, tFont, t, onFinish, onExit, existingStudy }) {
  const [paragraphs] = useState(() => {
    const ps = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 10);
    if (ps.length <= 1) return text.split(/[.!?。]+/).map(s => s.trim()).filter(s => s.length > 10);
    return ps;
  });
  const [level, setLevel] = useState(existingStudy?.level1Complete ? 2 : 1);
  const [paraIdx, setParaIdx] = useState(0);
  const [qcm, setQcm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(false);
  const [inTargetLang, setInTargetLang] = useState(true);
  const [reformInput, setReformInput] = useState("");
  const [reformResult, setReformResult] = useState(null);
  const [illustration, setIllustration] = useState(null);
  const [illustrationLoading, setIllustrationLoading] = useState(false);
  const [level1Done, setLevel1Done] = useState(existingStudy?.level1Complete || false);
  const [level2Done, setLevel2Done] = useState(existingStudy?.level2Complete || false);
  const [showLevel1Complete, setShowLevel1Complete] = useState(false);

  const loadQCM = async (idx) => {
    setLoading(true); setQcm(null); setSelected(null); setChecked(false); setIllustration(null);
    try {
      const result = await generateComprehensionQCM(paragraphs[idx], text, idx, lang, context, tl, inTargetLang);
      setQcm(result);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadReformExcerpt = () => {
    setReformInput(""); setReformResult(null); setIllustration(null);
  };

  useEffect(() => { if (level === 1 && !qcm && !loading) loadQCM(paraIdx); }, [paraIdx, level]);
  useEffect(() => { if (level === 2) loadReformExcerpt(); }, [paraIdx, level]);

  const handleCheck = () => {
    if (selected === null) return;
    setChecked(true);
  };

  const handleNext = () => {
    if (paraIdx < paragraphs.length - 1) {
      setParaIdx(paraIdx + 1);
      setQcm(null); setSelected(null); setChecked(false); setIllustration(null);
      setReformInput(""); setReformResult(null);
    } else {
      if (level === 1) { setLevel1Done(true); setShowLevel1Complete(true); }
      else { setLevel2Done(true); onFinish({ level1Complete: true, level2Complete: true }); }
    }
  };

  const handleReformCheck = async () => {
    if (!reformInput.trim()) return;
    setLoading(true);
    try {
      const result = await evaluateReformulation(paragraphs[paraIdx], reformInput, lang, context, tl);
      setReformResult(result);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleIllustration = async () => {
    setIllustrationLoading(true);
    try {
      const TL = getTargetLangName(tl, "en");
      const prompt = await callAI(
        `You generate a short image search query (2-4 English words) to find an illustration that helps visualize the meaning of a ${TL} paragraph. Return ONLY the search query, nothing else.`,
        paragraphs[paraIdx], 50, false, true
      );
      const images = await fetchImages(prompt.text.trim(), 4);
      if (images.length > 0) setIllustration(images[0]);
    } catch (e) { console.error(e); }
    setIllustrationLoading(false);
  };

  const startLevel2 = () => {
    setLevel(2); setParaIdx(0); setShowLevel1Complete(false);
    loadReformExcerpt();
  };

  const finishLevel1 = () => {
    onFinish({ level1Complete: true, level2Complete: level2Done });
  };

  const isCorrect = qcm && selected === qcm.answer;
  const explanation = qcm ? (lang === "fr" ? qcm.explanation_fr : (qcm.explanation_en || qcm.explanation_fr)) : "";
  const encouragement = qcm ? (lang === "fr" ? qcm.encouragement_fr : (qcm.encouragement_en || qcm.encouragement_fr)) : "";

  if (showLevel1Complete) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, gap: 16 }}>
        <div style={{ fontSize: 48 }}>🎉</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: C.txt, textAlign: "center" }}>{t.compLevel1Done}</div>
        <div style={{ fontSize: 13, color: C.txtS, textAlign: "center", maxWidth: 360 }}>{t.compEncourage}</div>
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <button onClick={startLevel2}
            style={{ padding: "8px 18px", borderRadius: 6, border: "none", background: C.acc, color: C.onAcc, fontFamily: "'Plus Jakarta Sans'", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
            {t.compStartLevel2}
          </button>
          <button onClick={finishLevel1}
            style={{ padding: "8px 18px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.s1, color: C.txtS, fontFamily: "'Plus Jakarta Sans'", fontSize: 13, cursor: "pointer" }}>
            {t.compFinish}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>
      {/* Header */}
      <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.txt }}>{t.compTitle}</span>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: C.accBg, color: C.acc, fontWeight: 500 }}>
            {level === 1 ? t.compLevel1 : t.compLevel2}
          </span>
          <span style={{ fontSize: 11, color: C.txtM }}>{t.compParagraph(paraIdx + 1, paragraphs.length)}</span>
        </div>
        <button onClick={onExit} style={{ fontSize: 11, color: C.txtS, border: `1px solid ${C.border}`, borderRadius: 6, padding: "3px 9px", background: "#fff", cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>
          {t.back}
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", justifyContent: "center", overflowY: "auto" }}>
        <div style={{ width: "100%", maxWidth: 520, padding: "20px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Current paragraph */}
          <div style={{ background: C.s1, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontFamily: tFont, fontSize: 14, color: C.txt, lineHeight: 1.9, whiteSpace: "pre-wrap" }}>
              {paragraphs[paraIdx]}
            </div>
          </div>

          {/* Illustration */}
          {illustration && (
            <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}` }}>
              <img src={illustration.thumb || illustration.url} alt="" style={{ width: "100%", maxHeight: 200, objectFit: "cover" }} />
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleIllustration} disabled={illustrationLoading}
              style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.s1, color: illustrationLoading ? C.txtM : C.txtS, fontFamily: "'Plus Jakarta Sans'", fontSize: 11, cursor: illustrationLoading ? "default" : "pointer" }}
              className={illustrationLoading ? "pulse" : ""}>
              🖼 {illustrationLoading ? t.compIllustrationLoading : t.compIllustration}
            </button>
            {level === 1 && (
              <button onClick={() => { setInTargetLang(!inTargetLang); setQcm(null); loadQCM(paraIdx); }}
                style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.s1, color: C.txtS, fontFamily: "'Plus Jakarta Sans'", fontSize: 11, cursor: "pointer" }}>
                {inTargetLang ? t.compInInterfaceLang : t.compInTargetLang}
              </button>
            )}
          </div>

          {/* Level 1: QCM */}
          {level === 1 && (
            loading ? (
              <div className="pulse" style={{ fontSize: 13, color: C.txtS, textAlign: "center", padding: 20 }}>{t.analyzing}</div>
            ) : qcm ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: C.txt }}>{qcm.question}</div>
                {qcm.options.map((opt, i) => (
                  <button key={i} onClick={() => { if (!checked) setSelected(i); }}
                    style={{
                      padding: "10px 14px", borderRadius: 8, textAlign: "left",
                      border: `1px solid ${checked ? (i === qcm.answer ? C.ok : i === selected ? C.warn : C.border) : (i === selected ? C.acc : C.border)}`,
                      background: checked ? (i === qcm.answer ? "#e8f5e9" : i === selected ? "#fce4ec" : C.s2) : (i === selected ? C.accBg : C.s2),
                      color: C.txt, fontSize: 12.5, cursor: checked ? "default" : "pointer", fontFamily: "'Plus Jakarta Sans'", lineHeight: 1.5
                    }}>
                    {opt}
                  </button>
                ))}
                {!checked ? (
                  <button onClick={handleCheck} disabled={selected === null}
                    style={{ alignSelf: "flex-end", padding: "7px 18px", borderRadius: 6, border: "none", background: selected !== null ? C.acc : C.s1, color: selected !== null ? C.onAcc : C.txtM, fontFamily: "'Plus Jakarta Sans'", fontSize: 12.5, fontWeight: 500, cursor: selected !== null ? "pointer" : "default" }}>
                    {t.compCheck}
                  </button>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ padding: "10px 14px", borderRadius: 8, background: isCorrect ? "#e8f5e9" : "#fff3e0", border: `1px solid ${isCorrect ? C.ok : "#ffb74d"}` }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: isCorrect ? C.ok : "#e65100", marginBottom: 4 }}>{isCorrect ? t.compCorrect : t.compWrong}</div>
                      <div style={{ fontSize: 12, color: C.txtS, lineHeight: 1.5 }}>{explanation}</div>
                      {encouragement && <div style={{ fontSize: 11.5, color: C.txtM, fontStyle: "italic", marginTop: 4 }}>{encouragement}</div>}
                    </div>
                    <button onClick={handleNext}
                      style={{ alignSelf: "flex-end", padding: "7px 18px", borderRadius: 6, border: "none", background: C.acc, color: C.onAcc, fontFamily: "'Plus Jakarta Sans'", fontSize: 12.5, fontWeight: 500, cursor: "pointer" }}>
                      {paraIdx < paragraphs.length - 1 ? t.compNext : t.compFinish} →
                    </button>
                  </div>
                )}
              </div>
            ) : null
          )}

          {/* Level 2: Reformulation */}
          {level === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: C.txt }}>{t.compReformulate}</div>
              <textarea value={reformInput} onChange={e => setReformInput(e.target.value)} placeholder={t.compYourReformulation}
                style={{ width: "100%", minHeight: 80, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontFamily: tFont, fontSize: 13, color: C.txt, background: C.s2, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.8 }} />
              {!reformResult ? (
                <button onClick={handleReformCheck} disabled={!reformInput.trim() || loading}
                  style={{ alignSelf: "flex-end", padding: "7px 18px", borderRadius: 6, border: "none", background: reformInput.trim() ? C.acc : C.s1, color: reformInput.trim() ? C.onAcc : C.txtM, fontFamily: "'Plus Jakarta Sans'", fontSize: 12.5, fontWeight: 500, cursor: reformInput.trim() && !loading ? "pointer" : "default" }}
                  className={loading ? "pulse" : ""}>
                  {loading ? t.analyzing : t.compCheck}
                </button>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ padding: "10px 14px", borderRadius: 8, background: reformResult.correct ? "#e8f5e9" : "#fff3e0", border: `1px solid ${reformResult.correct ? C.ok : "#ffb74d"}` }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: reformResult.correct ? C.ok : "#e65100", marginBottom: 4 }}>{reformResult.correct ? t.compCorrect : t.compWrong}</div>
                    <div style={{ fontSize: 12, color: C.txtS, lineHeight: 1.5 }}>{lang === "fr" ? reformResult.feedback_fr : (reformResult.feedback_en || reformResult.feedback_fr)}</div>
                    {reformResult.model_tl && (
                      <div style={{ marginTop: 6, padding: "6px 10px", background: C.s1, borderRadius: 6 }}>
                        <div style={{ fontSize: 10, color: C.txtM, marginBottom: 2 }}>Modele :</div>
                        <div style={{ fontFamily: tFont, fontSize: 12.5, color: C.txt, lineHeight: 1.7 }}>{reformResult.model_tl}</div>
                      </div>
                    )}
                  </div>
                  <button onClick={handleNext}
                    style={{ alignSelf: "flex-end", padding: "7px 18px", borderRadius: 6, border: "none", background: C.acc, color: C.onAcc, fontFamily: "'Plus Jakarta Sans'", fontSize: 12.5, fontWeight: 500, cursor: "pointer" }}>
                    {paraIdx < paragraphs.length - 1 ? t.compNext : t.compFinish} →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Encouragement */}
          <div style={{ fontSize: 11.5, color: C.txtM, fontStyle: "italic", textAlign: "center", padding: "8px 0" }}>
            {t.compEncourage}
          </div>
        </div>
      </div>
    </div>
  );
}

function VocabLesson({ words, startIdx, onIdx, lang, tl, context, tFont, t, onFinish, onExit }) {
  const [idx, setIdx] = useState(startIdx || 0);
  const [study, setStudy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [revealed, setRevealed] = useState(1); // steps shown (1..5)
  const [qcmSel, setQcmSel] = useState(null);
  const word = words[idx];

  useEffect(() => {
    let alive = true;
    setLoading(true); setErr(null); setStudy(null); setRevealed(1); setQcmSel(null);
    studyVocabWord(word.word, word.example_kr, lang, context, tl)
      .then(d => { if (alive) { setStudy(d); setLoading(false); } })
      .catch(e => { if (alive) { setErr(e.message); setLoading(false); } });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const qcm = study && study.qcm;
  const answered = qcmSel !== null;
  const isLastWord = idx >= words.length - 1;
  const next = () => { if (revealed < 5) setRevealed(revealed + 1); };
  const nextWord = () => { if (isLastWord) onFinish(); else { const ni = idx + 1; setIdx(ni); if (onIdx) onIdx(ni); } };

  const Panel = ({ label, children }) => (
    <div style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 10, padding: 13, marginTop: 10 }}>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: C.acc, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 7 }}>{label}</div>
      {children}
    </div>
  );
  const prose = { fontSize: 13, color: C.txt, lineHeight: 1.7, whiteSpace: "pre-wrap" };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.s1, minHeight: 0 }}>
      {/* header */}
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, background: C.s2, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <button onClick={onExit}
          style={{ padding: "5px 11px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.s1, color: C.txtS, fontSize: 11.5, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", flexShrink: 0 }}>← {t.back}</button>
        <span style={{ fontSize: 11.5, color: C.txtM, flexShrink: 0 }}>{t.vocabWordOf(idx + 1, words.length)}</span>
        <span style={{ fontFamily: tFont, fontSize: 15, fontWeight: 600, color: C.txt, marginLeft: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{word.word}</span>
        {word.reading ? <span style={{ fontSize: 11, color: C.txtM }}>[{word.reading}]</span> : null}
      </div>

      {/* body */}
      <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
        {loading && <div className="pulse" style={{ textAlign: "center", color: C.txtM, fontSize: 13, padding: 30 }}>{t.thinking}</div>}
        {err && <div style={{ padding: 14, background: C.warnBg, border: `1px solid ${C.warnB}`, borderRadius: 10, fontSize: 12, color: C.warn, lineHeight: 1.6 }}>⚠️ {err}</div>}
        {study && (
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            {/* Step 1 — guess from context (QCM) */}
            <Panel label={t.vocabStepGuess}>
              {word.example_kr ? (
                <div style={{ fontFamily: tFont, fontSize: 14, color: C.txt, lineHeight: 1.7, marginBottom: 10, padding: "8px 10px", background: C.s1, borderRadius: 8, border: `1px solid ${C.border}` }}>{word.example_kr}</div>
              ) : null}
              {qcm && <div style={{ fontSize: 13, fontWeight: 500, color: C.txt, marginBottom: 8 }}>{qcm.question}</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {qcm && (qcm.options || []).map((opt, i) => {
                  const isAnswer = i === qcm.answer;
                  const showOk = answered && isAnswer;
                  const showBad = answered && qcmSel === i && !isAnswer;
                  return (
                    <button key={i} disabled={answered} onClick={() => setQcmSel(i)}
                      style={{ textAlign: "left", padding: "9px 12px", borderRadius: 8, fontSize: 13, cursor: answered ? "default" : "pointer", fontFamily: "'Plus Jakarta Sans'",
                        border: `1px solid ${showOk ? C.okB : showBad ? C.warnB : C.border}`,
                        background: showOk ? C.okBg : showBad ? C.warnBg : C.s1,
                        color: showOk ? C.ok : showBad ? C.warn : C.txt }}>
                      {showOk ? "✓ " : showBad ? "✕ " : ""}{opt}
                    </button>
                  );
                })}
              </div>
              {answered && (
                <div style={{ marginTop: 9, fontSize: 12.5, color: qcmSel === qcm.answer ? C.ok : C.txtS, lineHeight: 1.6 }}>
                  <b>{qcmSel === qcm.answer ? t.vocabCorrect : t.vocabWrong}</b>{qcm.explanation ? " — " + qcm.explanation : ""}
                </div>
              )}
            </Panel>

            {revealed >= 2 && <Panel label={t.vocabStepEtym}><div style={prose}>{study.etymology}</div></Panel>}
            {revealed >= 3 && <Panel label={t.vocabStepSyn}><div style={prose}>{study.synonyms}</div></Panel>}
            {revealed >= 4 && <Panel label={t.vocabStepFun}><div style={prose}>{study.funfacts}</div></Panel>}
            {revealed >= 5 && (
              <Panel label={t.vocabStepEx}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(study.examples || []).map((ex, i) => {
                    const parts = String(ex).split(" — ");
                    return (
                      <div key={i}>
                        <div style={{ fontFamily: tFont, fontSize: 13.5, color: C.txt, lineHeight: 1.6 }}>{parts[0]}</div>
                        {parts[1] && <div style={{ fontSize: 11.5, color: C.txtM, lineHeight: 1.5 }}>{parts.slice(1).join(" — ")}</div>}
                      </div>
                    );
                  })}
                </div>
              </Panel>
            )}
          </div>
        )}
      </div>

      {/* footer */}
      {study && (
        <div style={{ padding: "9px 12px", borderTop: `1px solid ${C.border}`, background: C.s2, display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0 }}>
          {revealed < 5 ? (
            <button onClick={next} disabled={!answered && revealed === 1}
              style={{ padding: "8px 18px", borderRadius: 6, border: "none", cursor: (!answered && revealed === 1) ? "default" : "pointer", background: (!answered && revealed === 1) ? C.s1 : C.acc, color: (!answered && revealed === 1) ? C.txtM : C.onAcc, fontFamily: "'Plus Jakarta Sans'", fontSize: 13, fontWeight: 500 }}>
              {t.vocabNext}
            </button>
          ) : (
            <button onClick={nextWord}
              style={{ padding: "8px 18px", borderRadius: 6, border: "none", cursor: "pointer", background: C.acc, color: C.onAcc, fontFamily: "'Plus Jakarta Sans'", fontSize: 13, fontWeight: 500 }}>
              {isLastWord ? t.vocabFinishBtn : t.vocabNextWord}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================
// YOUGLISH WIDGET — video context for vocabulary
// =============================================
const YG_LANG_MAP = { ko: "korean", de: "german", it: "italian", fr: "french", es: "spanish", pt: "portuguese", ja: "japanese", zh: "chinese", ru: "russian", ar: "arabic", nl: "dutch", pl: "polish", tr: "turkish" };

function YouglishPanel({ word, lang }) {
  const containerRef = useRef(null);
  const widgetRef = useRef(null);
  const [total, setTotal] = useState(null);
  const [current, setCurrent] = useState(1);
  const [error, setError] = useState(false);

  const syncIndex = useCallback(() => {
    try {
      const w = widgetRef.current;
      if (!w) return;
      const idx = typeof w.getCurrentTrackIndex === "function" ? w.getCurrentTrackIndex() : null;
      if (idx != null && typeof idx === "number") setCurrent(idx + 1);
    } catch {}
  }, []);

  useEffect(() => {
    if (!word || !containerRef.current) return;
    setTotal(null); setCurrent(1); setError(false);
    widgetRef.current = null;
    containerRef.current.innerHTML = '<div id="yg-widget"></div>';

    const ygLang = YG_LANG_MAP[lang] || "korean";
    const initWidget = () => {
      try {
        const w = new window.YG.Widget("yg-widget", {
          components: 9,
          events: {
            onFetchDone: (e) => { if (e.totalResult === 0) setError(true); else { setTotal(e.totalResult); setCurrent(1); } },
            onVideoChange: (e) => {
              const idx = typeof e === "number" ? e : (e && e.index != null ? e.index : e && e.trackIndex != null ? e.trackIndex : null);
              if (idx != null) setCurrent(idx + 1);
              else setTimeout(syncIndex, 200);
            },
            onCaptionConsumed: () => { setTimeout(syncIndex, 200); },
            onError: () => { setError(true); },
          },
        });
        widgetRef.current = w;
        w.fetch(word, ygLang);
      } catch (e) { setError(true); }
    };

    if (window.YG) { initWidget(); return; }
    const script = document.createElement("script");
    script.src = "https://youglish.com/public/emb/widget.js";
    script.async = true;
    script.onload = () => { setTimeout(initWidget, 100); };
    script.onerror = () => setError(true);
    document.head.appendChild(script);

    return () => { widgetRef.current = null; };
  }, [word, lang, syncIndex]);

  const goNext = () => { if (widgetRef.current) { widgetRef.current.next(); setCurrent(c => total ? Math.min(c + 1, total) : c + 1); setTimeout(syncIndex, 500); } };
  const goPrev = () => { if (widgetRef.current) { widgetRef.current.previous(); setCurrent(c => Math.max(c - 1, 1)); setTimeout(syncIndex, 500); } };

  const navBtn = { padding: "4px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.s2, color: C.txtS, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", fontSize: 12 };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
      {error && (
        <div style={{ padding: 32, textAlign: "center", color: C.txtM, fontSize: 13, lineHeight: 1.6 }}>
          Aucune vidéo trouvée pour "{word}".
        </div>
      )}
      {!error && total !== null && (
        <div style={{ padding: "6px 14px", fontSize: 11, color: C.txtM, textAlign: "center", borderBottom: `1px solid ${C.border}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <button onClick={goPrev} style={navBtn}>←</button>
          <span>{current} / {total} vidéos</span>
          <button onClick={goNext} style={navBtn}>→</button>
        </div>
      )}
      <div ref={containerRef} style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 8 }} />
    </div>
  );
}

// =============================================
// NON-AI EXERCISES (#67 crossword, #68 match)
// =============================================
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// #68 — Match each word to its definition (two columns, tap a word then its definition).
function MatchExercise({ cards, tFont, t, onComplete, onExit }) {
  const [round, setRound] = useState(0);
  const pairs = useMemo(() => {
    const p = cards.filter(c => (c.description || "").trim()).map(c => ({ id: c.id, kr: c.korean, def: (c.description || "").trim() }));
    return shuffle(p).slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, round]);
  const left = useMemo(() => shuffle(pairs), [pairs]);
  const right = useMemo(() => shuffle(pairs), [pairs]);
  const [sel, setSel] = useState(null);       // selected item id
  const [selSide, setSelSide] = useState(null); // "left" or "right"
  const [matched, setMatched] = useState(() => new Set());
  const [wrong, setWrong] = useState(null);    // id flashing wrong
  const [wrongSide, setWrongSide] = useState(null); // "left" or "right"
  const [awarded, setAwarded] = useState(false);
  const done = pairs.length > 0 && matched.size === pairs.length;

  useEffect(() => { if (done && !awarded) { setAwarded(true); onComplete && onComplete(); } }, [done, awarded, onComplete]);

  const pick = (id, side) => {
    if (matched.has(id)) return;
    // Nothing selected yet, or same side clicked: just select this one
    if (!sel || selSide === side) { setSel(id); setSelSide(side); return; }
    // Other side already selected: check match
    if (id === sel) { const n = new Set(matched); n.add(id); setMatched(n); setSel(null); setSelSide(null); }
    else { setWrong(id); setWrongSide(side); setTimeout(() => { setWrong(null); setWrongSide(null); }, 500); setSel(null); setSelSide(null); }
  };
  const restart = () => { setMatched(new Set()); setSel(null); setSelSide(null); setWrong(null); setWrongSide(null); setAwarded(false); setRound(r => r + 1); };

  if (!pairs.length) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, color: C.txtM, fontSize: 13, textAlign: "center" }}>
      <div style={{ fontSize: 30 }}>🔗</div><div>{t.exNeedWords}</div>
      <button onClick={onExit} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.borderS}`, background: C.s1, color: C.txtS, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", fontSize: 12 }}>← {t.back}</button>
    </div>
  );

  const colBtn = (active, ok) => ({ width: "100%", textAlign: "left", padding: "11px 12px", borderRadius: 10, cursor: ok ? "default" : "pointer", fontFamily: "'Plus Jakarta Sans'", fontSize: 13, lineHeight: 1.4, border: `1px solid ${ok ? C.okB : active ? C.acc : C.border}`, background: ok ? C.okBg : active ? C.accBg : C.s2, color: ok ? C.ok : C.txt, transition: "background 0.12s, border-color 0.12s" });

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: "8px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: C.txt }}>🔗 {t.exMatch} · {matched.size}/{pairs.length}</span>
        <button onClick={onExit} style={{ fontSize: 11, color: C.txtS, border: `1px solid ${C.border}`, borderRadius: 6, padding: "3px 9px", background: "#fff", cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>← {t.back}</button>
      </div>
      {done ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24 }}>
          <div style={{ fontSize: 30 }}>🎉</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.txt }}>{t.exFinished}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <button onClick={restart} style={{ padding: "8px 18px", borderRadius: 8, background: C.acc, color: C.onAcc, border: "none", fontFamily: "'Plus Jakarta Sans'", fontSize: 12.5, fontWeight: 500, cursor: "pointer" }}>↻ {t.exRestart}</button>
            <button onClick={onExit} style={{ padding: "8px 18px", borderRadius: 8, background: "none", border: `1px solid ${C.borderS}`, color: C.txtS, fontFamily: "'Plus Jakarta Sans'", fontSize: 12.5, cursor: "pointer" }}>← {t.back}</button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", gap: 10 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 11, color: C.txtM, fontWeight: 600, marginBottom: 2 }}>{t.matchWords}</div>
            {left.map(p => { const ok = matched.has(p.id); const isWrong = wrong === p.id && wrongSide === "left"; return (
              <button key={p.id} onClick={() => pick(p.id, "left")} style={{ ...colBtn(sel === p.id && selSide === "left", ok), fontFamily: tFont, border: `1px solid ${isWrong ? C.warn : ok ? C.okB : sel === p.id && selSide === "left" ? C.acc : C.border}`, background: isWrong ? C.warnBg : ok ? C.okBg : sel === p.id && selSide === "left" ? C.accBg : C.s2 }}>{p.kr}</button>
            ); })}
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 11, color: C.txtM, fontWeight: 600, marginBottom: 2 }}>{t.matchDefs}</div>
            {right.map(p => { const ok = matched.has(p.id); const isWrong = wrong === p.id && wrongSide === "right"; return (
              <button key={p.id} onClick={() => pick(p.id, "right")} style={{ ...colBtn(sel === p.id && selSide === "right", ok), border: `1px solid ${isWrong ? C.warn : ok ? C.okB : sel === p.id && selSide === "right" ? C.acc : C.border}`, background: isWrong ? C.warnBg : ok ? C.okBg : sel === p.id && selSide === "right" ? C.accBg : C.s2 }}>{p.def}</button>
            ); })}
          </div>
        </div>
      )}
    </div>
  );
}

// #69 — Flashcard (Quizlet-style): show Korean front, flip to reveal definition + example.
function FlashcardExercise({ cards, tFont, t, onComplete, onExit }) {
  const initial = useMemo(() => {
    const d = cards.filter(c => c.type === "vocab" && (c.description || "").trim()).map(c => ({
      id: c.id, kr: c.korean, def: (c.description || "").trim(),
      ex: (c.example || "").trim(), exTr: (c.exampleTranslation || c.exTranslation || "").trim(),
      img: (c.images && c.images[0]) ? (c.images[0].thumb || c.images[0].url) : null,
    }));
    return shuffle(d);
  }, [cards]);
  const [queue, setQueue] = useState(() => [...initial]);
  const [flipped, setFlipped] = useState(false);
  const [knownSet, setKnownSet] = useState(() => new Set());
  const [awarded, setAwarded] = useState(false);
  const done = initial.length > 0 && queue.length === 0;

  useEffect(() => { if (done && !awarded) { setAwarded(true); onComplete && onComplete(); } }, [done, awarded, onComplete]);

  const answer = (isKnown) => {
    const current = queue[0];
    setFlipped(false);
    if (isKnown) {
      setKnownSet(s => { const n = new Set(s); n.add(current.id); return n; });
      setQueue(q => q.slice(1));
    } else {
      setQueue(q => {
        const rest = q.slice(1);
        const insertAt = Math.min(rest.length, 3 + Math.floor(Math.random() * 3));
        rest.splice(insertAt, 0, current);
        return rest;
      });
    }
  };
  const restart = () => { setQueue(shuffle([...initial])); setFlipped(false); setKnownSet(new Set()); setAwarded(false); };

  if (!initial.length) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, color: C.txtM, fontSize: 13, textAlign: "center" }}>
      <div style={{ fontSize: 30 }}>🃏</div><div>{t.exNeedWords}</div>
      <button onClick={onExit} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.borderS}`, background: C.s1, color: C.txtS, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", fontSize: 12 }}>← {t.back}</button>
    </div>
  );

  if (done) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24 }}>
      <div style={{ fontSize: 30 }}>🎉</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: C.txt }}>{t.flashDone}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={restart} style={{ padding: "8px 18px", borderRadius: 8, background: C.acc, color: C.onAcc, border: "none", fontFamily: "'Plus Jakarta Sans'", fontSize: 12.5, fontWeight: 500, cursor: "pointer" }}>↻ {t.exRestart}</button>
        <button onClick={onExit} style={{ padding: "8px 18px", borderRadius: 8, background: "none", border: `1px solid ${C.borderS}`, color: C.txtS, fontFamily: "'Plus Jakarta Sans'", fontSize: 12.5, cursor: "pointer" }}>← {t.back}</button>
      </div>
    </div>
  );

  const card = queue[0];
  const remaining = queue.length;
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: "8px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: C.txt }}>🃏 {t.exFlash} · {t.flashProgress(knownSet.size, initial.length)}</span>
        <button onClick={onExit} style={{ fontSize: 11, color: C.txtS, border: `1px solid ${C.border}`, borderRadius: 6, padding: "3px 9px", background: "#fff", cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>← {t.back}</button>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, gap: 20 }}>
        <div onClick={() => setFlipped(f => !f)} style={{
          width: "100%", maxWidth: 380, minHeight: 220, borderRadius: 16, cursor: "pointer", perspective: 800,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            width: "100%", minHeight: 220, position: "relative", transformStyle: "preserve-3d",
            transition: "transform 0.45s ease", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}>
            <div style={{
              position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
              borderRadius: 16, border: `2px solid ${C.border}`, background: C.s1, padding: 28, boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
            }}>
              <div style={{ fontSize: 32, fontFamily: tFont, fontWeight: 600, color: C.txt, textAlign: "center" }}>{card.kr}</div>
              <div style={{ fontSize: 12, color: C.txtM, marginTop: 8 }}>tap to flip</div>
            </div>
            <div style={{
              position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
              borderRadius: 16, border: `2px solid ${C.acc}`, background: C.accBg, padding: 28, boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
            }}>
              {card.img && <img src={card.img} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 10, marginBottom: 4 }} />}
              <div style={{ fontSize: 24, fontFamily: tFont, fontWeight: 600, color: C.txt }}>{card.kr}</div>
              <div style={{ fontSize: 14, color: C.txt, textAlign: "center", lineHeight: 1.6 }}>{card.def}</div>
              {card.ex && <div style={{ fontSize: 13, color: C.txtM, fontStyle: "italic", textAlign: "center", lineHeight: 1.5, marginTop: 4 }}>{card.ex}</div>}
              {card.exTr && <div style={{ fontSize: 12, color: C.txtS, textAlign: "center", lineHeight: 1.4 }}>{card.exTr}</div>}
            </div>
          </div>
        </div>
        {flipped && (
          <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
            <button onClick={() => answer(false)} style={{
              padding: "10px 28px", borderRadius: 10, border: `1px solid ${C.warn}`, background: C.warnBg,
              color: C.warn, fontFamily: "'Plus Jakarta Sans'", fontSize: 13, fontWeight: 500, cursor: "pointer",
            }}>{t.flashReview}</button>
            <button onClick={() => answer(true)} style={{
              padding: "10px 28px", borderRadius: 10, border: "none", background: C.ok,
              color: "#fff", fontFamily: "'Plus Jakarta Sans'", fontSize: 13, fontWeight: 500, cursor: "pointer",
            }}>{t.flashKnow}</button>
          </div>
        )}
      </div>
      <div style={{ padding: "6px 14px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "center", gap: 16, fontSize: 11, color: C.txtM, flexShrink: 0 }}>
        <span style={{ color: C.ok }}>✓ {knownSet.size}</span>
        <span style={{ color: C.txtM }}>{t.flashRemaining(remaining)}</span>
      </div>
    </div>
  );
}

// #69 — Image Write: show the card's image, user types the word.
function normalizeAnswer(s) {
  return s.replace(/\s+/g, "").toLowerCase();
}
function ImageWriteExercise({ cards, tFont, t, onComplete, onExit }) {
  const initial = useMemo(() => {
    const d = cards.filter(c => c.type === "vocab" && c.images && c.images.length > 0).map(c => ({
      id: c.id, kr: c.korean.trim(), img: c.images[0].thumb || c.images[0].url, def: (c.description || "").trim(),
    }));
    return shuffle(d);
  }, [cards]);
  const [queue, setQueue] = useState(() => [...initial]);
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [knownSet, setKnownSet] = useState(() => new Set());
  const [awarded, setAwarded] = useState(false);
  const done = initial.length > 0 && queue.length === 0;

  useEffect(() => { if (done && !awarded) { setAwarded(true); onComplete && onComplete(); } }, [done, awarded, onComplete]);

  const check = () => {
    if (!input.trim()) return;
    const correct = normalizeAnswer(input) === normalizeAnswer(queue[0].kr);
    setResult(correct ? "ok" : "wrong");
  };
  const next = () => {
    const current = queue[0];
    if (result === "ok") {
      setKnownSet(s => { const n = new Set(s); n.add(current.id); return n; });
      setQueue(q => q.slice(1));
    } else {
      setQueue(q => {
        const rest = q.slice(1);
        const insertAt = Math.min(rest.length, 3 + Math.floor(Math.random() * 3));
        rest.splice(insertAt, 0, current);
        return rest;
      });
    }
    setInput(""); setResult(null);
  };
  const restart = () => { setQueue(shuffle([...initial])); setInput(""); setResult(null); setKnownSet(new Set()); setAwarded(false); };

  if (!initial.length) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, color: C.txtM, fontSize: 13, textAlign: "center" }}>
      <div style={{ fontSize: 30 }}>🖼️</div><div>{t.exNeedImages}</div>
      <button onClick={onExit} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.borderS}`, background: C.s1, color: C.txtS, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", fontSize: 12 }}>← {t.back}</button>
    </div>
  );

  if (done) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24 }}>
      <div style={{ fontSize: 30 }}>🎉</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: C.txt }}>{t.flashDone}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={restart} style={{ padding: "8px 18px", borderRadius: 8, background: C.acc, color: C.onAcc, border: "none", fontFamily: "'Plus Jakarta Sans'", fontSize: 12.5, fontWeight: 500, cursor: "pointer" }}>↻ {t.exRestart}</button>
        <button onClick={onExit} style={{ padding: "8px 18px", borderRadius: 8, background: "none", border: `1px solid ${C.borderS}`, color: C.txtS, fontFamily: "'Plus Jakarta Sans'", fontSize: 12.5, cursor: "pointer" }}>← {t.back}</button>
      </div>
    </div>
  );

  const card = queue[0];
  const remaining = queue.length;
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: "8px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: C.txt }}>🖼️ {t.exImgWrite} · {t.flashProgress(knownSet.size, initial.length)}</span>
        <button onClick={onExit} style={{ fontSize: 11, color: C.txtS, border: `1px solid ${C.border}`, borderRadius: 6, padding: "3px 9px", background: "#fff", cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>← {t.back}</button>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, gap: 16 }}>
        <img src={card.img} alt="" style={{ width: 160, height: 160, objectFit: "cover", borderRadius: 16, border: `2px solid ${C.border}`, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }} />
        {card.def && <div style={{ fontSize: 13, color: C.txtM, textAlign: "center", maxWidth: 320 }}>{card.def}</div>}
        <div style={{ fontSize: 12, color: C.txtS }}>{t.imgWriteHint}</div>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { result ? next() : check(); } }}
          disabled={!!result}
          autoFocus
          style={{ width: "100%", maxWidth: 280, padding: "10px 14px", borderRadius: 10, border: `2px solid ${result === "ok" ? C.ok : result === "wrong" ? C.warn : C.border}`, fontFamily: tFont, fontSize: 18, textAlign: "center", outline: "none", background: result === "ok" ? C.okBg : result === "wrong" ? C.warnBg : "#fff", color: C.txt }}
        />
        {result === "ok" && <div style={{ fontSize: 14, color: C.ok, fontWeight: 600 }}>{t.imgWriteCorrect}</div>}
        {result === "wrong" && <div style={{ fontSize: 14, color: C.warn, fontWeight: 500 }}>{t.imgWriteWrong(card.kr)}</div>}
        {!result ? (
          <button onClick={check} disabled={!input.trim()} style={{ padding: "8px 22px", borderRadius: 8, border: "none", background: input.trim() ? C.acc : C.s1, color: input.trim() ? C.onAcc : C.txtM, fontFamily: "'Plus Jakarta Sans'", fontSize: 13, fontWeight: 500, cursor: input.trim() ? "pointer" : "default" }}>{t.imgWriteCheck}</button>
        ) : (
          <button onClick={next} style={{ padding: "8px 22px", borderRadius: 8, border: "none", background: C.acc, color: C.onAcc, fontFamily: "'Plus Jakarta Sans'", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{t.imgWriteNext} →</button>
        )}
      </div>
      <div style={{ padding: "6px 14px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "center", gap: 16, fontSize: 11, color: C.txtM, flexShrink: 0 }}>
        <span style={{ color: C.ok }}>✓ {knownSet.size}</span>
        <span style={{ color: C.txtM }}>{t.flashRemaining(remaining)}</span>
      </div>
    </div>
  );
}

// #60 — Gender exercise (FLE): pick Le/La for French nouns.
function GenderExercise({ cards, tFont, t, lang, onComplete, onExit }) {
  const [items, setItems] = useState(null);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [feedback, setFeedback] = useState(null);
  const [awarded, setAwarded] = useState(false);

  useEffect(() => {
    const withGender = cards.filter(c => c.type === "vocab" && (c.korean || "").trim() && c.gender);
    if (withGender.length > 0) {
      setItems(shuffle(withGender.map(c => ({ id: c.id, word: c.korean, gender: c.gender, desc: c.description || "" }))));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const done = items && idx >= items.length;
  useEffect(() => { if (done && !awarded) { setAwarded(true); onComplete && onComplete(); } }, [done, awarded, onComplete]);

  const answer = (picked) => {
    const item = items[idx];
    const correct = item.gender === picked;
    setScore(s => correct ? { ...s, correct: s.correct + 1 } : { ...s, wrong: s.wrong + 1 });
    setFeedback({ correct, answer: item.gender === "m" ? "masculin" : "féminin", article: item.gender === "m" ? "le" : "la", word: item.word });
    setTimeout(() => { setFeedback(null); setIdx(i => i + 1); }, correct ? 800 : 1800);
  };

  const restart = () => { setIdx(0); setScore({ correct: 0, wrong: 0 }); setFeedback(null); setItems(i => shuffle([...i])); setAwarded(false); };

  if (!items || !items.length) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, color: C.txtM, fontSize: 13, textAlign: "center" }}>
      <div style={{ fontSize: 30 }}>🔤</div><div>{t.exNeedWords}</div>
      <button onClick={onExit} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.borderS}`, background: C.s1, color: C.txtS, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", fontSize: 12 }}>← {t.back}</button>
    </div>
  );

  if (done) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24 }}>
      <div style={{ fontSize: 30 }}>🎉</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: C.txt }}>{t.genderDone}</div>
      <div style={{ fontSize: 13, color: C.txtS }}>{t.genderScore(score.correct, items.length)}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={restart} style={{ padding: "8px 18px", borderRadius: 8, background: C.acc, color: C.onAcc, border: "none", fontFamily: "'Plus Jakarta Sans'", fontSize: 12.5, fontWeight: 500, cursor: "pointer" }}>↻ {t.exRestart}</button>
        <button onClick={onExit} style={{ padding: "8px 18px", borderRadius: 8, background: "none", border: `1px solid ${C.borderS}`, color: C.txtS, fontFamily: "'Plus Jakarta Sans'", fontSize: 12.5, cursor: "pointer" }}>← {t.back}</button>
      </div>
    </div>
  );

  const item = items[idx];
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: "8px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: C.txt }}>🔤 {t.exGender} · {idx + 1}/{items.length}</span>
        <button onClick={onExit} style={{ fontSize: 11, color: C.txtS, border: `1px solid ${C.border}`, borderRadius: 6, padding: "3px 9px", background: "#fff", cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>← {t.back}</button>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, gap: 24 }}>
        <div style={{ fontSize: 13, color: C.txtM }}>{t.genderQuestion}</div>
        <div style={{ fontSize: 32, fontFamily: tFont, fontWeight: 600, color: C.txt, textAlign: "center" }}>{item.word}</div>
        {item.desc && <div style={{ fontSize: 12, color: C.txtS, textAlign: "center", maxWidth: 300 }}>{item.desc}</div>}
        {feedback ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 40 }}>{feedback.correct ? "✅" : "❌"}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: feedback.correct ? C.ok : C.warn }}>
              {feedback.article} {feedback.word} ({feedback.answer})
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 16 }}>
            <button onClick={() => answer("m")}
              style={{ padding: "14px 32px", borderRadius: 12, border: `2px solid #3B82F6`, background: "#EFF6FF", color: "#1D4ED8", fontFamily: "'Plus Jakarta Sans'", fontSize: 18, fontWeight: 700, cursor: "pointer", minWidth: 100 }}>
              Le
            </button>
            <button onClick={() => answer("f")}
              style={{ padding: "14px 32px", borderRadius: 12, border: `2px solid #EC4899`, background: "#FDF2F8", color: "#BE185D", fontFamily: "'Plus Jakarta Sans'", fontSize: 18, fontWeight: 700, cursor: "pointer", minWidth: 100 }}>
              La
            </button>
          </div>
        )}
        <div style={{ fontSize: 12, color: C.txtM }}>
          ✅ {score.correct} · ❌ {score.wrong}
        </div>
      </div>
    </div>
  );
}

// #67 — Crossword built from the selected words + their definitions as clues.
function isHangulWord(s) {
  if (!s) return false;
  const chars = Array.from(s.trim());
  if (chars.length < 2 || chars.length > 8) return false;
  return chars.every(ch => { const cp = ch.codePointAt(0); return cp >= 0xAC00 && cp <= 0xD7A3; });
}
function isHangulChar(ch) { const cp = ch.codePointAt(0); return cp >= 0xAC00 && cp <= 0xD7A3; }
function isCrosswordWord(s) {
  if (!s) return false;
  const w = s.trim();
  if (w.includes(' ') || w.includes('-')) return false;
  const chars = Array.from(w);
  return chars.length >= 2 && chars.length <= 8;
}
function stripAccents(s) { return s.normalize("NFD").replace(/[̀-ͯ]/g, ""); }

function buildCrossword(words) {
  const grid = {};
  const key = (r, c) => r + "," + c;
  const placed = [];
  const canPlace = (syl, r, c, dir) => {
    for (let i = 0; i < syl.length; i++) {
      const rr = dir === "h" ? r : r + i, cc = dir === "h" ? c + i : c;
      const ex = grid[key(rr, cc)];
      if (ex && ex !== syl[i]) return false;
    }
    return true;
  };
  const place = (w, r, c, dir) => {
    const cells = [];
    for (let i = 0; i < w.syl.length; i++) {
      const rr = dir === "h" ? r : r + i, cc = dir === "h" ? c + i : c;
      grid[key(rr, cc)] = w.syl[i];
      cells.push({ r: rr, c: cc, ch: w.syl[i] });
    }
    placed.push({ id: w.id, clue: w.clue, clueTarget: w.clueTarget, answer: w.answer, cells, dir, r, c });
  };
  const sorted = [...words].sort((a, b) => b.syl.length - a.syl.length);
  if (!sorted.length) return { placed: [], sol: {}, rows: 0, cols: 0 };
  place(sorted[0], 0, 0, "h");
  for (let i = 1; i < sorted.length; i++) {
    const w = sorted[i];
    let ok = false;
    outer:
    for (const p of placed) {
      for (const cell of p.cells) {
        for (let si = 0; si < w.syl.length; si++) {
          if (w.syl[si] === cell.ch) {
            const dir = p.dir === "h" ? "v" : "h";
            const r = dir === "v" ? cell.r - si : cell.r;
            const c = dir === "v" ? cell.c : cell.c - si;
            if (canPlace(w.syl, r, c, dir)) { place(w, r, c, dir); ok = true; break outer; }
          }
        }
      }
    }
    if (!ok) { let maxR = 0; for (const k in grid) { const rr = +k.split(",")[0]; if (rr > maxR) maxR = rr; } place(w, maxR + 2, 0, "h"); }
  }
  // Normalize to (0,0)
  let minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity;
  for (const k in grid) { const [r, c] = k.split(",").map(Number); minR = Math.min(minR, r); minC = Math.min(minC, c); maxR = Math.max(maxR, r); maxC = Math.max(maxC, c); }
  const sol = {};
  placed.forEach(p => { p.cells = p.cells.map(ce => ({ ...ce, r: ce.r - minR, c: ce.c - minC })); p.r -= minR; p.c -= minC; p.cells.forEach(ce => { sol[key(ce.r, ce.c)] = ce.ch; }); });
  // Numbering: entry start cells in reading order
  const starts = {};
  placed.forEach(p => { starts[key(p.r, p.c)] = true; });
  const startKeys = Object.keys(starts).sort((a, b) => { const [ra, ca] = a.split(",").map(Number), [rb, cb] = b.split(",").map(Number); return ra - rb || ca - cb; });
  const num = {}; startKeys.forEach((k, i) => { num[k] = i + 1; });
  placed.forEach(p => { p.num = num[key(p.r, p.c)]; });
  return { placed, sol, num, rows: maxR - minR + 1, cols: maxC - minC + 1 };
}

function CrosswordExercise({ cards, tFont, t, onComplete, onExit }) {
  const [round, setRound] = useState(0);
  const words = useMemo(() => {
    const w = cards
      .filter(c => isCrosswordWord(c.korean) && (c.description || "").trim())
      .map(c => {
        const raw = c.korean.trim();
        const hangul = Array.from(raw).every(ch => isHangulChar(ch));
        const display = hangul ? raw : stripAccents(raw).toUpperCase();
        return { id: c.id, answer: display, clue: (c.description || "").trim(), clueTarget: (c.description_target || "").trim(), syl: Array.from(display), hangul };
      });
    return shuffle(w).slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, round]);
  const isKorean = words.length > 0 && words.some(w => w.hangul);
  const cw = useMemo(() => buildCrossword(words), [words]);
  const [vals, setVals] = useState({});
  const [checked, setChecked] = useState(false);
  const [awarded, setAwarded] = useState(false);
  const [clueMode, setClueMode] = useState("words");
  const [activeDir, _setActiveDir] = useState("h");
  const activeDirRef = useRef("h");
  const setActiveDir = (d) => { const v = typeof d === "function" ? d(activeDirRef.current) : d; _setActiveDir(v); activeDirRef.current = v; };
  const bank = useMemo(() => shuffle(cw.placed.map(p => p.answer)), [cw]);
  const key = (r, c) => r + "," + c;
  const gridRef = useRef(null);
  const hiddenRef = useRef(null);
  const composingRef = useRef(false);
  const consumedRef = useRef(0);
  const [cursorCell, setCursorCell] = useState(null);
  const cursorRef = useRef(null);
  const [composingText, setComposingText] = useState("");

  const cellWords = useMemo(() => {
    const m = {};
    cw.placed.forEach(p => {
      p.cells.forEach((ce) => {
        const k = key(ce.r, ce.c);
        if (!m[k]) m[k] = [];
        m[k].push({ dir: p.dir });
      });
    });
    return m;
  }, [cw]);

  const setCursor = (r, c) => { setCursorCell({ r, c }); cursorRef.current = { r, c }; };
  const advanceCursor = () => {
    const cc = cursorRef.current;
    if (!cc) return;
    const dir = activeDirRef.current;
    const nr = dir === "v" ? cc.r + 1 : cc.r;
    const nc = dir === "h" ? cc.c + 1 : cc.c;
    if (cw.sol[key(nr, nc)] != null) setCursor(nr, nc);
  };
  const retreatCursor = () => {
    const cc = cursorRef.current;
    if (!cc) return;
    const dir = activeDirRef.current;
    const pr = dir === "v" ? cc.r - 1 : cc.r;
    const pc = dir === "h" ? cc.c - 1 : cc.c;
    if (cw.sol[key(pr, pc)] != null) setCursor(pr, pc);
  };

  const focusHidden = () => { if (hiddenRef.current) hiddenRef.current.focus(); };

  const handleCellTap = (r, c) => {
    if (cw.sol[key(r, c)] == null) return;
    resetHidden();
    if (cursorCell && cursorCell.r === r && cursorCell.c === c) {
      const cws = cellWords[key(r, c)] || [];
      if (cws.length > 1) setActiveDir(d => d === "h" ? "v" : "h");
    } else {
      setCursor(r, c);
      const cws = cellWords[key(r, c)] || [];
      if (cws.length === 1) setActiveDir(cws[0].dir);
    }
    focusHidden();
  };

  const resetHidden = () => {
    consumedRef.current = 0;
    if (hiddenRef.current) hiddenRef.current.value = "";
  };
  const handleCompositionStart = () => { composingRef.current = true; };
  const handleCompositionUpdate = (e) => { setComposingText(e.data || ""); };
  const handleCompositionEnd = (e) => {
    composingRef.current = false;
    setComposingText("");
    if (e.data) {
      const chars = Array.from(e.data);
      const consumed = consumedRef.current;
      for (let i = consumed; i < chars.length; i++) {
        const cc = cursorRef.current;
        if (!cc) break;
        const val = isKorean ? chars[i] : stripAccents(chars[i]).toUpperCase();
        setVals(s => ({ ...s, [key(cc.r, cc.c)]: val }));
        setChecked(false);
        if (i < chars.length - 1) advanceCursor();
      }
      if (chars.length > consumed) advanceCursor();
    }
    setTimeout(() => {
      if (!composingRef.current) resetHidden();
    }, 50);
  };
  const handleHiddenChange = (e) => {
    const cc = cursorRef.current;
    if (!cc) return;
    const raw = e.target.value || "";
    const chars = Array.from(raw);
    if (composingRef.current && isKorean) {
      const finalized = chars.length - 1;
      const consumed = consumedRef.current;
      if (finalized > consumed) {
        for (let i = consumed; i < finalized; i++) {
          const cur = cursorRef.current;
          if (!cur) break;
          setVals(s => ({ ...s, [key(cur.r, cur.c)]: chars[i] }));
          setChecked(false);
          advanceCursor();
        }
        consumedRef.current = finalized;
      }
      const last = chars[chars.length - 1] || "";
      const cur = cursorRef.current;
      if (cur) {
        setVals(s => ({ ...s, [key(cur.r, cur.c)]: last }));
        setComposingText(last);
      }
      return;
    }
    if (composingRef.current) return;
    const ch = chars[chars.length - 1] || "";
    const val = isKorean ? ch : stripAccents(ch).toUpperCase();
    setVals(s => ({ ...s, [key(cc.r, cc.c)]: val }));
    setChecked(false);
    resetHidden();
    if (val) advanceCursor();
  };
  const handleKeyDown = (e) => {
    if (composingRef.current) return;
    const cc = cursorRef.current;
    if (!cc) return;
    const { r, c } = cc;
    const k2 = key(r, c);
    if (e.key === "Backspace") {
      e.preventDefault();
      if (vals[k2]) { setVals(s => ({ ...s, [k2]: "" })); setChecked(false); }
      else retreatCursor();
    } else if (e.key === "ArrowRight") { e.preventDefault(); if (cw.sol[key(r, c + 1)] != null) setCursor(r, c + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); if (cw.sol[key(r, c - 1)] != null) setCursor(r, c - 1); }
    else if (e.key === "ArrowDown") { e.preventDefault(); if (cw.sol[key(r + 1, c)] != null) setCursor(r + 1, c); }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (cw.sol[key(r - 1, c)] != null) setCursor(r - 1, c); }
  };
  const handleBlur = () => { setCursorCell(null); cursorRef.current = null; setComposingText(""); resetHidden(); };

  const focusWord = (word) => {
    resetHidden();
    setActiveDir(word.dir);
    const empty = word.cells.find(ce => !(vals[key(ce.r, ce.c)]));
    const target = empty || word.cells[0];
    setCursor(target.r, target.c);
    focusHidden();
  };

  const highlightKeys = useMemo(() => {
    if (!cursorCell) return new Set();
    const dir = activeDirRef.current;
    const fc = key(cursorCell.r, cursorCell.c);
    for (const p of cw.placed) {
      if (p.dir === dir && p.cells.some(ce => key(ce.r, ce.c) === fc)) {
        return new Set(p.cells.map(ce => key(ce.r, ce.c)));
      }
    }
    for (const p of cw.placed) {
      if (p.cells.some(ce => key(ce.r, ce.c) === fc)) {
        return new Set(p.cells.map(ce => key(ce.r, ce.c)));
      }
    }
    return new Set();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursorCell, activeDir, cw.placed]);

  const allCorrect = cw.placed.length > 0 && Object.keys(cw.sol).every(k => (vals[k] || "") === cw.sol[k]);
  const solved = checked && allCorrect;
  useEffect(() => { if (solved && !awarded) { setAwarded(true); onComplete && onComplete(); } }, [solved, awarded, onComplete]);

  useEffect(() => {
    const scrollToFocused = () => {
      requestAnimationFrame(() => {
        const el = document.activeElement;
        if (el && gridRef.current && gridRef.current.contains(el)) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    };
    const vv = window.visualViewport;
    if (vv) { vv.addEventListener("resize", scrollToFocused); return () => vv.removeEventListener("resize", scrollToFocused); }
  }, []);

  const restart = () => { setVals({}); setChecked(false); setAwarded(false); setRound(r => r + 1); setCursorCell(null); cursorRef.current = null; };

  if (cw.placed.length < 2) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, color: C.txtM, fontSize: 13, textAlign: "center" }}>
      <div style={{ fontSize: 30 }}>🧩</div><div>{t.exNeedWords}</div>
      <button onClick={onExit} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.borderS}`, background: C.s1, color: C.txtS, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", fontSize: 12 }}>← {t.back}</button>
    </div>
  );

  const across = cw.placed.filter(p => p.dir === "h").sort((a, b) => a.num - b.num);
  const down = cw.placed.filter(p => p.dir === "v").sort((a, b) => a.num - b.num);
  const CELL = 34;
  const GAP = 2;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "8px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, background: C.bg }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: C.txt }}>🧩 {t.exCross}</span>
        <button onClick={onExit} style={{ fontSize: 11, color: C.txtS, border: `1px solid ${C.border}`, borderRadius: 6, padding: "3px 9px", background: "#fff", cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>← {t.back}</button>
      </div>
      <div style={{ flex: 1, overflowY: "scroll", WebkitOverflowScrolling: "touch", padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
        {solved && (
          <div style={{ background: C.okBg, border: `1px solid ${C.okB}`, borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, color: C.ok, fontSize: 13, fontWeight: 600 }}>🎉 {t.crossSolved}</div>
        )}
        <div style={{ display: "flex", gap: 2, background: C.s1, borderRadius: 8, padding: 3, border: `1px solid ${C.border}`, alignSelf: "flex-start", flexWrap: "wrap" }}>
          {[["words", t.crossLvl1], ["memory", t.crossLvl2], ["target", t.crossLvl3]].map(([v, label]) => (
            <button key={v} onClick={() => setClueMode(v)}
              style={{ padding: "5px 12px", borderRadius: 6, border: "none", fontSize: 11.5, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", background: clueMode === v ? C.s2 : "transparent", color: clueMode === v ? C.acc : C.txtM, fontWeight: clueMode === v ? 600 : 400, boxShadow: clueMode === v ? "0 1px 3px rgba(0,0,0,0.06)" : "none" }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: C.txtM }}>{t.crossHint}</div>
        {clueMode === "words" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {bank.map((w, i) => (
              <span key={i} style={{ padding: "4px 10px", borderRadius: 14, background: C.accBg, color: C.acc, fontFamily: tFont, fontSize: 13, border: `1px solid ${C.border}` }}>{w}</span>
            ))}
          </div>
        )}
        <div ref={gridRef} style={{ overflowX: "auto", flexShrink: 0 }}>
          <div style={{ position: "relative", display: "grid", gridTemplateColumns: `repeat(${cw.cols}, ${CELL}px)`, gap: GAP, width: cw.cols * (CELL + GAP) }}>
            {cursorCell && (
              <input ref={hiddenRef} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
                onCompositionStart={handleCompositionStart} onCompositionUpdate={handleCompositionUpdate}
                onCompositionEnd={handleCompositionEnd} onChange={handleHiddenChange}
                onKeyDown={handleKeyDown} onBlur={handleBlur}
                style={{ position: "absolute", left: cursorCell.c * (CELL + GAP), top: cursorCell.r * (CELL + GAP), width: CELL, height: CELL, opacity: 0, zIndex: 10, fontSize: 16, padding: 0, border: "none", caretColor: "transparent" }} />
            )}
            {Array.from({ length: cw.rows }).map((_, r) => Array.from({ length: cw.cols }).map((__, c) => {
              const k = key(r, c);
              const isCell = cw.sol[k] != null;
              if (!isCell) return <div key={k} style={{ width: CELL, height: CELL }} />;
              const v = vals[k] || "";
              const right = checked && v && v === cw.sol[k];
              const bad = checked && v && v !== cw.sol[k];
              const hl = highlightKeys.has(k);
              const isFoc = cursorCell && cursorCell.r === r && cursorCell.c === c;
              const bg = bad ? C.warnBg : right ? C.okBg : isFoc ? "#e0edff" : hl ? "#f0f5ff" : "#fff";
              const bdr = bad ? C.warn : right ? C.ok : isFoc ? C.acc : hl ? "#b0c4ff" : C.borderS;
              const displayVal = (isFoc && composingText) ? Array.from(composingText).slice(-1)[0] || "" : v;
              return (
                <div key={k} onClick={() => handleCellTap(r, c)} style={{ position: "relative", width: CELL, height: CELL, cursor: "pointer", userSelect: "none" }}>
                  {cw.num[k] && <span style={{ position: "absolute", top: 0, left: 1, fontSize: 8, color: C.txtM, lineHeight: 1, zIndex: 1 }}>{cw.num[k]}</span>}
                  <div style={{ width: CELL, height: CELL, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: tFont, fontSize: 15, border: `1px solid ${bdr}`, borderRadius: 4, background: bg, color: C.txt, boxSizing: "border-box" }}>
                    {displayVal}
                  </div>
                </div>
              );
            }))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
          <button onClick={() => setChecked(true)} style={{ padding: "7px 16px", borderRadius: 8, background: C.acc, color: C.onAcc, border: "none", fontFamily: "'Plus Jakarta Sans'", fontSize: 12.5, fontWeight: 500, cursor: "pointer" }}>✓ {t.crossCheck}</button>
          <button onClick={restart} style={{ padding: "7px 16px", borderRadius: 8, background: "none", border: `1px solid ${C.borderS}`, color: C.txtS, fontFamily: "'Plus Jakarta Sans'", fontSize: 12.5, cursor: "pointer" }}>↻ {t.exRestart}</button>
          {solved && clueMode !== "target" && <button onClick={() => { const next = clueMode === "words" ? "memory" : "target"; setClueMode(next); restart(); }} style={{ padding: "7px 16px", borderRadius: 8, background: C.okBg, border: `1px solid ${C.okB}`, color: C.ok, fontFamily: "'Plus Jakarta Sans'", fontSize: 12.5, fontWeight: 500, cursor: "pointer" }}>{t.crossNextLvl || "Niveau suivant →"}</button>}
        </div>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", flexShrink: 0 }}>
          {across.length > 0 && (
            <div style={{ minWidth: 160, flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.txtM, marginBottom: 5 }}>{t.crossAcross}</div>
              {across.map(p => {
                const clueText = clueMode === "target" && p.clueTarget ? p.clueTarget : p.clue;
                const isTarget = clueMode === "target" && p.clueTarget;
                return <div key={p.id} onClick={() => focusWord(p)} style={{ fontSize: 12.5, color: C.txt, lineHeight: 1.5, marginBottom: 3, cursor: "pointer", fontFamily: isTarget ? tFont : undefined, fontStyle: isTarget ? "italic" : undefined }}><b>{p.num}.</b> {clueText}{clueMode === "target" && !p.clueTarget ? <span style={{ color: C.txtM, fontSize: 10 }}> ({t.genTargetDesc})</span> : null}</div>;
              })}
            </div>
          )}
          {down.length > 0 && (
            <div style={{ minWidth: 160, flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.txtM, marginBottom: 5 }}>{t.crossDown}</div>
              {down.map(p => {
                const clueText = clueMode === "target" && p.clueTarget ? p.clueTarget : p.clue;
                const isTarget = clueMode === "target" && p.clueTarget;
                return <div key={p.id} onClick={() => focusWord(p)} style={{ fontSize: 12.5, color: C.txt, lineHeight: 1.5, marginBottom: 3, cursor: "pointer", fontFamily: isTarget ? tFont : undefined, fontStyle: isTarget ? "italic" : undefined }}><b>{p.num}.</b> {clueText}{clueMode === "target" && !p.clueTarget ? <span style={{ color: C.txtM, fontSize: 10 }}> ({t.genTargetDesc})</span> : null}</div>;
              })}
            </div>
          )}
        </div>
        <div style={{ minHeight: 200, flexShrink: 0 }} />
      </div>
    </div>
  );
}

// #64 — Fill-in-the-blank story exercise with interactive word bank
function stripKoreanParticle(word) {
  if (!word || !/[가-힣]/.test(word)) return word;
  const particles = [
    "에게서", "으로서", "으로써", "한테서",
    "에서", "에게", "한테", "으로", "부터", "까지", "처럼", "같이", "보다", "밖에", "대로", "이랑", "이나", "이며", "께서", "마저", "조차",
    "로서", "로써",
    "은", "는", "이", "가", "을", "를", "과", "와", "로", "의", "에", "도", "만", "뿐", "나", "랑", "며",
  ];
  for (const p of particles) {
    if (word.length > p.length && word.endsWith(p)) return word.slice(0, -p.length);
  }
  return word;
}

function FillStoryExercise({ data, cards, tFont, t, lang, tl, mode, onComplete, onExit, onRestart, onAddVocab }) {
  const [placed, setPlaced] = useState({});
  const [selectedBlank, setSelectedBlank] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState(null);
  const [wordPopup, setWordPopup] = useState(null);
  const [trCache, setTrCache] = useState({});
  const [storyTr, setStoryTr] = useState(null);
  const [storyTrLoad, setStoryTrLoad] = useState(false);
  const [addedWords, setAddedWords] = useState(new Set());
  const [audioState, setAudioState] = useState("idle");
  const [showTryAgain, setShowTryAgain] = useState(false);
  const audioRef = useRef(null);
  const stoppedRef = useRef(false);
  const scrollRef = useRef(null);

  const blanks = data.blanks || [];
  const words = useMemo(() => {
    const w = blanks.map(b => b.answer);
    for (let i = w.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [w[i], w[j]] = [w[j], w[i]]; }
    return w;
  }, [data]);

  const segments = useMemo(() => {
    const parts = (data.story || "").split(/\((\d+)\)_+/);
    return parts.map((part, i) => i % 2 === 0 ? { type: "text", value: part } : { type: "blank", num: parseInt(part) });
  }, [data]);

  const trLang = lang === "ko" ? "en" : lang;

  const translateWord = async (word, rect) => {
    const raw = word.replace(/[.,!?;:()""''「」『』]/g, "").trim();
    if (!raw) return;
    const key = tl === "ko" ? stripKoreanParticle(raw) : raw;
    const popupX = Math.min(rect.left, window.innerWidth - 200);
    const popupY = rect.bottom + 4;
    if (trCache[key]) {
      setWordPopup({ word: key, original: raw !== key ? raw : null, translation: trCache[key], x: popupX, y: popupY });
      return;
    }
    setWordPopup({ word: key, original: raw !== key ? raw : null, translation: null, x: popupX, y: popupY });
    try {
      const r = await fetch("/api/translate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: key, from: tl, to: trLang }),
      });
      const d = await r.json();
      const tr = d.translation || "?";
      setTrCache(prev => ({ ...prev, [key]: tr }));
      setWordPopup(prev => prev && prev.word === key ? { ...prev, translation: tr } : prev);
    } catch { setWordPopup(prev => prev && prev.word === key ? { ...prev, translation: "?" } : prev); }
  };

  const translateStory = async () => {
    if (storyTr) return;
    setStoryTrLoad(true);
    try {
      const fullText = (data.story || "").replace(/\(\d+\)_+/g, (m) => {
        const num = parseInt(m.match(/\d+/)[0]);
        const blank = blanks.find(b => b.num === num);
        return blank ? (blank.display || blank.answer) : "___";
      });
      const lines = fullText.split("\n").filter(l => l.trim());
      if (mode === "dialoguefill" && lines.length > 1) {
        const translated = [];
        for (const line of lines) {
          const match = line.match(/^([^:]+):\s*(.*)/);
          const textToTranslate = match ? match[2].trim() : line.trim();
          const prefix = match ? match[1] + ": " : "";
          try {
            const r = await fetch("/api/translate", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: textToTranslate, from: tl, to: trLang }),
            });
            const d = await r.json();
            translated.push(prefix + (d.translation || "?"));
          } catch { translated.push(prefix + "?"); }
        }
        setStoryTr(translated.join("\n"));
      } else {
        const r = await fetch("/api/translate", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: fullText, from: tl, to: trLang }),
        });
        const d = await r.json();
        setStoryTr(d.translation || "?");
      }
    } catch { setStoryTr("?"); }
    setStoryTrLoad(false);
  };

  const getFilledStory = () => {
    return (data.story || "").replace(/\(\d+\)_+/g, (m) => {
      const num = parseInt(m.match(/\d+/)[0]);
      const blank = blanks.find(b => b.num === num);
      return blank ? (blank.display || blank.answer) : "___";
    });
  };

  const fetchTtsAudio = async (text, voiceId) => {
    const r = await fetch("/api/tts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice_id: voiceId || undefined }),
    });
    if (!r.ok) {
      const errBody = await r.text().catch(() => "");
      throw new Error("TTS " + r.status + ": " + errBody.slice(0, 200));
    }
    const blob = await r.blob();
    return URL.createObjectURL(blob);
  };

  const playAudio = async () => {
    if (audioState === "playing") {
      stoppedRef.current = true;
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      setAudioState("idle");
      return;
    }
    stoppedRef.current = false;
    setAudioState("loading");
    try {
      const fullText = getFilledStory();
      const lines = fullText.split("\n").filter(l => l.trim());
      const isDialogue = mode === "dialoguefill" && lines.length > 1;
      if (isDialogue) {
        const chunks = [];
        for (const line of lines) {
          const match = line.match(/^([^:]+):\s*(.*)/);
          chunks.push({ text: match ? match[2].trim() : line.trim() });
        }
        setAudioState("playing");
        for (let ci = 0; ci < chunks.length; ci++) {
          if (stoppedRef.current) break;
          const chunk = chunks[ci];
          if (!chunk.text) continue;
          const url = await fetchTtsAudio(chunk.text);
          if (stoppedRef.current) { URL.revokeObjectURL(url); break; }
          const audio = new Audio(url);
          audioRef.current = audio;
          await new Promise((resolve) => {
            audio.onended = resolve;
            audio.onerror = resolve;
            audio.play().catch(resolve);
          });
          URL.revokeObjectURL(url);
        }
      } else {
        const url = await fetchTtsAudio(fullText);
        if (stoppedRef.current) { URL.revokeObjectURL(url); throw new Error("stopped"); }
        const audio = new Audio(url);
        audioRef.current = audio;
        setAudioState("playing");
        await new Promise((resolve) => {
          audio.onended = resolve;
          audio.onerror = resolve;
          audio.play().catch(resolve);
        });
        URL.revokeObjectURL(url);
      }
      audioRef.current = null;
      if (!stoppedRef.current) setAudioState("idle");
    } catch (e) {
      audioRef.current = null;
      setAudioState("idle");
      if (e.message && e.message !== "stopped") {
        console.error("TTS error:", e.message);
        alert("Audio: " + e.message);
      }
    }
  };

  useEffect(() => {
    return () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } };
  }, []);

  useEffect(() => {
    const close = () => setWordPopup(null);
    if (wordPopup) { document.addEventListener("click", close); return () => document.removeEventListener("click", close); }
  }, [wordPopup]);

  const placedWords = new Set(Object.values(placed));
  const allFilled = blanks.length > 0 && blanks.every(b => placed[b.num]);

  const handleBlankClick = (num) => {
    if (submitted) return;
    if (placed[num]) {
      setPlaced(p => { const np = { ...p }; delete np[num]; return np; });
      setSelectedBlank(null);
    } else {
      setSelectedBlank(num);
    }
  };

  const handleWordClick = (word) => {
    if (submitted || placedWords.has(word)) return;
    if (selectedBlank !== null && !placed[selectedBlank]) {
      setPlaced(p => ({ ...p, [selectedBlank]: word }));
      setSelectedBlank(null);
    } else {
      const emptyBlank = blanks.find(b => !placed[b.num]);
      if (emptyBlank) setPlaced(p => ({ ...p, [emptyBlank.num]: word }));
    }
  };

  const handleSubmit = () => {
    const res = {};
    blanks.forEach(b => { res[b.num] = placed[b.num] === b.answer; });
    setResults(res);
    setSubmitted(true);
    const allCorrect = blanks.every(b => placed[b.num] === b.answer);
    if (allCorrect) {
      const usedCardIds = [];
      blanks.forEach(b => {
        const card = cards.find(c => c.korean === b.answer);
        if (card) usedCardIds.push(card.id);
      });
      if (usedCardIds.length > 0 && onComplete) onComplete(usedCardIds);
    } else {
      setShowTryAgain(true);
    }
  };

  const handleRetry = () => {
    setPlaced({}); setSelectedBlank(null); setSubmitted(false); setResults(null);
    setStoryTr(null); setStoryTrLoad(false); setShowTryAgain(false);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setAudioState("idle"); stoppedRef.current = true;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  const correct = results ? Object.values(results).filter(Boolean).length : 0;
  const total = blanks.length;

  const renderTextWithTap = (text, segKey) => {
    const tokens = text.split(/(\s+)/);
    return tokens.map((tok, j) => {
      if (/^\s+$/.test(tok)) return <span key={segKey + "-" + j}>{tok}</span>;
      return (
        <span key={segKey + "-" + j} onClick={(e) => { e.stopPropagation(); translateWord(tok, e.currentTarget.getBoundingClientRect()); }}
          style={{ cursor: "pointer", borderRadius: 3, transition: "background 0.1s" }}
          onMouseEnter={e => e.currentTarget.style.background = C.accBg}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          {tok}
        </span>
      );
    });
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <button onClick={onExit} style={{ fontSize: 11, color: C.txtS, border: `1px solid ${C.border}`, borderRadius: 6, padding: "3px 9px", background: "#fff", cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>{"<-"} {t.back}</button>
        {submitted && <div style={{ fontSize: 12, fontWeight: 600, color: correct === total ? C.ok : C.warn }}>{t.fillScore(correct, total)}</div>}
      </div>
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px 14px 24px" }}>
        {data.message && <div style={{ fontSize: 13, color: C.txtS, marginBottom: 14, lineHeight: 1.6 }}>{data.message}</div>}
        <div style={{ fontSize: 14.5, lineHeight: 2.4, fontFamily: tFont, color: C.txt, whiteSpace: "pre-wrap" }}>
          {segments.map((seg, i) => {
            if (seg.type === "text") return <span key={i}>{renderTextWithTap(seg.value, i)}</span>;
            const num = seg.num;
            const word = placed[num];
            const blank = blanks.find(b => b.num === num);
            const isSelected = selectedBlank === num;
            const isCorrect = submitted && results && results[num];
            const isWrong = submitted && results && !results[num];
            return (
              <span key={i} onClick={() => handleBlankClick(num)} style={{
                display: "inline-block", minWidth: 56, padding: "2px 10px", margin: "0 2px",
                borderRadius: 6, cursor: submitted ? "default" : "pointer", textAlign: "center",
                border: `2px solid ${isCorrect ? C.ok : isWrong ? "#e53e3e" : isSelected ? C.acc : C.border}`,
                background: isCorrect ? C.okBg : isWrong ? "rgba(229,62,62,0.08)" : isSelected ? C.accBg : C.s1,
                color: isCorrect ? C.ok : isWrong ? "#e53e3e" : word ? C.txt : C.txtM,
                fontWeight: word ? 500 : 400, fontSize: 13.5, transition: "all 0.15s",
              }}>
                {submitted && isWrong ? (
                  <span><s style={{ color: "#e53e3e", opacity: 0.6 }}>{word}</s> <span style={{ color: C.ok, fontWeight: 600 }}>{blank?.display || blank?.answer}</span></span>
                ) : submitted && isCorrect ? (
                  <span>{blank?.display || word}</span>
                ) : word ? word : (
                  <span style={{ opacity: 0.4 }}>{num}</span>
                )}
              </span>
            );
          })}
        </div>

        {!submitted && <div style={{ fontSize: 11.5, color: C.txtM, marginTop: 12, marginBottom: 4 }}>{t.fillTapBlank} {t.fillTapWord}</div>}

        <div style={{ marginTop: 12, padding: "12px 14px", background: C.s2, border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.txtM, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>{t.fillWordBank}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {words.map((w, i) => {
              const isPlaced = placedWords.has(w);
              return (
                <button key={i} onClick={() => handleWordClick(w)} disabled={isPlaced || submitted}
                  style={{
                    padding: "6px 14px", borderRadius: 8, fontFamily: tFont, fontSize: 13, fontWeight: 500,
                    border: `1px solid ${isPlaced ? C.border : C.acc}`,
                    background: isPlaced ? C.s1 : C.accBg, color: isPlaced ? C.txtM : C.acc,
                    cursor: isPlaced || submitted ? "default" : "pointer", opacity: isPlaced ? 0.45 : 1,
                    transition: "all 0.15s", textDecoration: isPlaced ? "line-through" : "none",
                  }}>{w}</button>
              );
            })}
          </div>
        </div>

        {!submitted && allFilled && (
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <button onClick={handleSubmit} style={{ padding: "10px 28px", borderRadius: 10, background: C.acc, color: C.onAcc, border: "none", fontFamily: "'Plus Jakarta Sans'", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {t.fillCheck}
            </button>
          </div>
        )}

        {submitted && (
          <div style={{ marginTop: 20, background: C.s2, border: `1px solid ${correct === total ? C.okB : C.warnB}`, borderRadius: 12, padding: 16, textAlign: "center" }}>
            {correct === total && <div style={{ fontSize: 28, marginBottom: 6 }}>🎉</div>}
            <div style={{ fontSize: 14, fontWeight: 600, color: C.txt, marginBottom: 4 }}>{t.fillScore(correct, total)}</div>
            <div style={{ fontSize: 12.5, color: C.txtS, marginBottom: 10 }}>{correct === total ? t.fillDone : t.fillTryAgain}</div>
            <button onClick={playAudio} disabled={audioState === "loading"}
              style={{ padding: "10px 24px", borderRadius: 10, border: `2px solid ${audioState === "playing" ? C.acc : C.border}`, background: audioState === "playing" ? C.accBg : C.s1, color: audioState === "playing" ? C.acc : C.txt, fontFamily: "'Plus Jakarta Sans'", fontSize: 14, fontWeight: 600, cursor: audioState === "loading" ? "default" : "pointer", opacity: audioState === "loading" ? 0.6 : 1, marginBottom: 14 }}>
              {audioState === "loading" ? "..." : audioState === "playing" ? `⏹ ${t.fillListenStop}` : `🔊 ${t.fillListen}`}
            </button>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              {correct < total && (
                <button onClick={handleRetry} style={{ padding: "8px 18px", borderRadius: 8, background: C.acc, color: C.onAcc, border: "none", fontFamily: "'Plus Jakarta Sans'", fontSize: 12.5, fontWeight: 500, cursor: "pointer" }}>
                  {t.fillRetry}
                </button>
              )}
              <button onClick={onRestart} style={{ padding: "8px 18px", borderRadius: 8, background: correct === total ? C.acc : "none", color: correct === total ? C.onAcc : C.txtS, border: correct === total ? "none" : `1px solid ${C.borderS}`, fontFamily: "'Plus Jakarta Sans'", fontSize: 12.5, fontWeight: 500, cursor: "pointer" }}>
                {">"} {t.fillNewStory}
              </button>
              <button onClick={onExit} style={{ padding: "8px 18px", borderRadius: 8, background: "none", border: `1px solid ${C.borderS}`, color: C.txtS, fontFamily: "'Plus Jakarta Sans'", fontSize: 12.5, cursor: "pointer" }}>
                {t.backToLibrary}
              </button>
            </div>
            <div style={{ marginTop: 14 }}>
              <button onClick={translateStory} disabled={storyTrLoad}
                style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.s1, color: C.txtS, fontFamily: "'Plus Jakarta Sans'", fontSize: 11.5, cursor: storyTrLoad ? "default" : "pointer", opacity: storyTrLoad ? 0.6 : 1 }}>
                {storyTrLoad ? t.thinking : t.fillTranslateStory}
              </button>
            </div>
            {storyTr && <div style={{ marginTop: 10, fontSize: 12.5, color: C.txtS, lineHeight: 1.7, textAlign: "left", padding: "10px 12px", background: C.s1, borderRadius: 8, border: `1px solid ${C.border}`, whiteSpace: "pre-wrap" }}>{storyTr}</div>}
          </div>
        )}
      </div>

      <TryAgainOverlay visible={showTryAgain} onClose={() => setShowTryAgain(false)} lang={lang} />

      {wordPopup && (
        <div onClick={e => e.stopPropagation()} style={{
          position: "fixed", left: Math.max(8, Math.min(wordPopup.x, window.innerWidth - 220)), top: wordPopup.y,
          background: "#1d1d1f", color: "#fff", padding: "8px 12px", borderRadius: 8,
          fontSize: 12.5, fontFamily: "'Plus Jakarta Sans'", maxWidth: 220, zIndex: 9999,
          boxShadow: "0 4px 16px rgba(0,0,0,0.25)", lineHeight: 1.5,
        }}>
          <div style={{ fontWeight: 600, fontSize: 11, opacity: 0.7, marginBottom: 2, fontFamily: tFont }}>{wordPopup.word}{wordPopup.original ? <span style={{ fontWeight: 400, opacity: 0.5 }}> ({wordPopup.original})</span> : null}</div>
          {wordPopup.translation ? <div>{wordPopup.translation}</div> : <div className="pulse" style={{ opacity: 0.6 }}>...</div>}
          {wordPopup.translation && onAddVocab && (
            <button onClick={(e) => {
              e.stopPropagation();
              const w = wordPopup.word;
              if (!addedWords.has(w)) { onAddVocab(w); setAddedWords(prev => new Set([...prev, w])); }
            }}
              style={{
                marginTop: 6, display: "block", width: "100%", padding: "4px 8px", borderRadius: 5,
                border: "1px solid rgba(255,255,255,0.2)", background: addedWords.has(wordPopup.word) ? "rgba(61,170,92,0.3)" : "rgba(255,255,255,0.1)",
                color: "#fff", fontSize: 11, fontFamily: "'Plus Jakarta Sans'", cursor: addedWords.has(wordPopup.word) ? "default" : "pointer",
                textAlign: "center",
              }}>
              {addedWords.has(wordPopup.word) ? t.addedToVocab : `+ ${t.fillAddVocab}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================
// MAIN APP
// =============================================
function AppInner() {
  const [data, setData] = useState(DEFAULT_DATA);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("goals");
  const [libView, setLibView] = useState("grid");
  const [libFilter, setLibFilter] = useState("all"); // "all" | "grammar" | "vocab" (library)
  const [libTagFilter, setLibTagFilter] = useState(null); // null = all, string = specific tag
  const [exFilter, setExFilter] = useState("all"); // "all" | "grammar" | "vocab" (Exercise tab, independent of the library)
  const [exTagFilter, setExTagFilter] = useState(null); // null = all, string = specific tag
  const [tagEditCard, setTagEditCard] = useState(null); // card id currently editing tags
  const [editingTag, setEditingTag] = useState(null); // { cardId, tag } for inline rename
  const [showTargetDef, setShowTargetDef] = useState({}); // { cardId: true } for toggled target def display
  const [tagExplore, setTagExplore] = useState(null); // tag name to show related cards
  const [tagInput, setTagInput] = useState("");
  const [bulkTagMode, setBulkTagMode] = useState(false);
  const [bulkTagSel, setBulkTagSel] = useState(new Set());
  const [bulkTagPicker, setBulkTagPicker] = useState(false);
  const [bulkImportedIds, setBulkImportedIds] = useState([]);
  const [cardToDelete, setCardToDelete] = useState(null);
  const [confirmToggle, setConfirmToggle] = useState(null); // card pending Studied<->Acquired change
  const [expandedId, setExpandedId] = useState(null); // studied card whose explanation is unfolded
  const [weather, setWeather] = useState(null); // { city, temp, emoji } for the target language
  const [langOpen, setLangOpen] = useState(false);
  const [targetLang, setTargetLang] = useState(null); // "ko", "de", etc.
  const [tlOpen, setTlOpen] = useState(false);
  const [navMenuOpen, setNavMenuOpen] = useState(false); // mobile hamburger menu
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
  const [impMode, setImpMode] = useState("grammar"); // "grammar" | "vocab" | "comprehension" | "bulk"
  const [bulkFound, setBulkFound] = useState([]); // bulk import extracted items
  const [bulkSel, setBulkSel] = useState(new Set()); // indices selected for bulk import
  const [bulkProgress, setBulkProgress] = useState(null); // { current, total } during scanning
  const [compSession, setCompSession] = useState(null); // { text, existing } or null
  const [vocabFound, setVocabFound] = useState([]); // AI-picked vocab items
  const [vocabSel, setVocabSel] = useState(new Set()); // indices selected to study
  const [vocabSession, setVocabSession] = useState(null); // { words: [...] } or null

  // Lesson
  const [lCard, setLCard] = useState(null);
  const [lArticle, setLArticle] = useState(null);
  const [conv, setConv] = useState([]);
  const [lLoad, setLLoad] = useState(false);
  const [searching, setSearching] = useState(false);
  const [revealTr, setRevealTr] = useState(() => localStorage.getItem("moa-reveal-tr") === "1");
  const [kbOpen, setKbOpen] = useState(false);
  const [winW, setWinW] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1024));
  const [inp, setInp] = useState("");
  const [tray, setTray] = useState(false);
  const [lessonDone, setLessonDone] = useState(false);
  const [lessonSummary, setLessonSummary] = useState(null);
  // Derived structures proposed at the end of a lesson (opt-in, not auto-added).
  const [pendingDerived, setPendingDerived] = useState([]);
  const [derivedSel, setDerivedSel] = useState(() => new Set());
  const [lessonRestored, setLessonRestored] = useState(false);
  const [resumePrompt, setResumePrompt] = useState(null); // card to resume/restart when reopened with a live session, or null
  const [showRecap, setShowRecap] = useState(false);
  const [recapCard, setRecapCard] = useState(null);
  const [youglishWord, setYouglishWord] = useState(null);
  const [recapConv, setRecapConv] = useState([]);
  const [recapLoad, setRecapLoad] = useState(false);
  const [recapInp, setRecapInp] = useState("");
  const [recapMode, setRecapMode] = useState(null); // null | "examples" | "realExamples" | "resources" | "exercise"
  const [recapDone, setRecapDone] = useState(false);
  const [recapSummary, setRecapSummary] = useState(null);

  // Exercise
  const [exMode, setExMode] = useState("story");
  const [exCategory, setExCategory] = useState(null);
  const [exStep, setExStep] = useState("category");
  const [exSel, setExSel] = useState(new Set());
  const [exConv, setExConv] = useState([]);
  const [exLoad, setExLoad] = useState(false);
  const [exInp, setExInp] = useState("");
  const [exOn, setExOn] = useState(false);
  const [exDone, setExDone] = useState(false);
  const [fillData, setFillData] = useState(null);
  const [exTheme, setExTheme] = useState(null);
  const [exMusic, setExMusic] = useState(() => { try { return localStorage.getItem("moa-ex-music") === "1"; } catch { return false; } });
  const exMusicRef = useRef(null);

  // Profile
  const [profileDraft, setProfileDraft] = useState(null);
  const [profileSavedMsg, setProfileSavedMsg] = useState(false);
  const [savedFieldKey, setSavedFieldKey] = useState(null); // which profile field just auto-saved
  const [onbStep, setOnbStep] = useState(0);
  const [onbDraft, setOnbDraft] = useState({ gender: "", age: "", nationality: "", languages: [], dream: "" });
  const [showDetailed, setShowDetailed] = useState(false);
  const [pointsToast, setPointsToast] = useState(null);
  const [langProfileEdit, setLangProfileEdit] = useState(null);
  const [langProfileDraft, setLangProfileDraft] = useState(null);
  const [langProfDraft, setLangProfDraft] = useState(null);
  // Select any target-language word anywhere → offer to add it to the vocab library.
  const [selAdd, setSelAdd] = useState(null); // { text, x, y } or null
  const [flash, setFlash] = useState(null);   // brief confirmation toast text
  const [imgReplace, setImgReplace] = useState(null); // { korean, image } when a card already has 2 images
  const [studyChoice, setStudyChoice] = useState(null); // a vocab card awaiting "lesson vs direct translation"
  const [directLoad, setDirectLoad] = useState(false);
  const [registerLoad, setRegisterLoad] = useState(false); // #59: analyzing formal/casual register

  // Feed
  const [feedItems, setFeedItems] = useState([]);
  const [feedLoad, setFeedLoad] = useState(false);
  const [feedErr, setFeedErr] = useState(null);
  const [feedQuery, setFeedQuery] = useState("");
  const [feedInput, setFeedInput] = useState("");
  const [feedCat, setFeedCat] = useState("sns");
  const [feedKwLoad, setFeedKwLoad] = useState(false);
  const [feedThread, setFeedThread] = useState(null); // { loading, posts, link, source, error } or null
  // Daily news recap (#57): { date, lang, interest, general:[], interest:[] }
  const [newsRecap, setNewsRecap] = useState(null);
  const [newsRecapLoad, setNewsRecapLoad] = useState(false);
  const [newsRecapErr, setNewsRecapErr] = useState("");

  const msgsR = useRef(null);
  const exR = useRef(null);
  const lastMsgRef = useRef(null);
  const lastExMsgRef = useRef(null);
  const recapR = useRef(null);
  const lastRecapMsgRef = useRef(null);
  const skipExResetRef = useRef(false);
  const exPreselectedRef = useRef(false);
  const exPrimaryWordRef = useRef(null);

  const lang = data.lang || "fr";
  const t = T[lang];
  const enabledTLs = data.targetLangs || [];
  const tl = targetLang || data.lastTargetLang || enabledTLs[0] || null;
  const tlConf = tl ? TARGET_LANGS[tl] : null;
  const tFont = tl ? getTargetFont(tl) : "'Plus Jakarta Sans'";
  const TLName = tl ? getTargetLangName(tl, lang) : "";

  // Filter cards by current target language, sorted by status priority
  const allCards = data.cards || [];
  // Collect all unique tags across cards for the current target language
  const allTags = useMemo(() => {
    const tags = new Set();
    const tlCards = tl ? allCards.filter(c => (c.targetLang || "ko") === tl) : allCards;
    tlCards.forEach(c => (c.tags || []).forEach(tag => tags.add(tag)));
    return [...tags].sort();
  }, [allCards, tl]);
  const filteredCards = useMemo(() => {
    let base = tl ? allCards.filter(c => (c.targetLang || "ko") === tl) : allCards;
    if (libFilter === "vocab") base = base.filter(c => c.type === "vocab");
    else if (libFilter === "grammar") base = base.filter(c => c.type !== "vocab");
    if (libTagFilter === "__none__") base = base.filter(c => !(c.tags || []).length);
    else if (libTagFilter) base = base.filter(c => (c.tags || []).includes(libTagFilter));
    const order = { in_progress: 0, new: 1, review: 1, studied: 2, acquired: 3 };
    return [...base].sort((a, b) => {
      const oa = order[migrateStatus(a.status)] ?? 4;
      const ob = order[migrateStatus(b.status)] ?? 4;
      return oa - ob;
    });
  }, [allCards, tl, libFilter, libTagFilter]);
  const revCount = filteredCards.filter(c => c.status === "new" || c.status === "review" || c.status === "in_progress").length;
  const studiedCount = filteredCards.filter(c => c.status === "studied").length;
  const acqCount = filteredCards.filter(c => c.status === "acquired").length;
  // Exercise cards are independent of the library filter: all studied/acquired cards for the
  // current target language, filtered by the Exercise tab's own vocab/grammar toggle.
  const exerciseCards = useMemo(() => {
    let base = tl ? allCards.filter(c => (c.targetLang || "ko") === tl) : allCards;
    base = base.filter(c => c.status === "studied" || c.status === "acquired");
    if (exFilter === "vocab") base = base.filter(c => c.type === "vocab");
    else if (exFilter === "grammar") base = base.filter(c => c.type !== "vocab");
    if (exTagFilter === "__none__") base = base.filter(c => !(c.tags || []).length);
    else if (exTagFilter) base = base.filter(c => (c.tags || []).includes(exTagFilter));
    return base;
  }, [allCards, tl, exFilter, exTagFilter]);
  const context = useMemo(() => buildContext(data, lang, tl), [data, lang, tl]);

  // Load
  useEffect(() => {
    loadData(syncId).then(d => {
      let loaded = d || DEFAULT_DATA;
      let needsSave = false;
      if (loaded.cards?.length && loaded.cards.some(c => c.progress && !c.reviewDates)) {
        loaded = { ...loaded, cards: loaded.cards.map(c => {
          if (c.reviewDates) return c;
          const prog = c.progress || {};
          const allDays = new Set();
          ["ce", "co", "pe", "po"].forEach(k => (prog[k] || []).forEach(d => allDays.add(d)));
          if (!allDays.size) return c;
          const sorted = [...allDays].sort();
          return { ...c, reviewDates: sorted, discoveredDate: c.discoveredDate || sorted[0] };
        })};
        needsSave = true;
      }
      setData(loaded);
      if (needsSave) saveData(loaded, syncId);
      if (loaded.lastTargetLang) setTargetLang(loaded.lastTargetLang);
      else if (loaded.targetLangs?.length) setTargetLang(loaded.targetLangs[0]);
      setLoaded(true);
    });
  }, [syncId]);

  // Restore an in-progress lesson into memory on first load — but stay on the Library
  // (default) view, so the user lands there and chooses to resume (via the card or the
  // Leçon tab) rather than being dropped straight into the lesson.
  useEffect(() => {
    if (!loaded || lessonRestored) return;
    setLessonRestored(true);
    try {
      const raw = localStorage.getItem("moa-active-lesson");
      const saved = raw ? JSON.parse(raw) : null;
      // Restore only an UNFINISHED lesson that belongs to the current context (same
      // account code, or both anonymous). The article lives on the card (articleText).
      if (saved && saved.card && saved.conv && saved.conv.length > 0 && !saved.lessonDone && (saved.syncId || "") === (syncId || "")) {
        setLCard(saved.card);
        setLArticle(saved.card.articleText || saved.article || "");
        setConv(saved.conv.map(m => ({ ...m, options: m.options || null })));
        setLessonDone(false);
        setLessonSummary(null);
        return;
      } else if (raw) {
        localStorage.removeItem("moa-active-lesson"); // wrong context / finished
      }
      // No grammar lesson to restore -> keep an in-progress vocab session in memory.
      const vraw = localStorage.getItem("moa-active-vocab");
      const vsaved = vraw ? JSON.parse(vraw) : null;
      if (vsaved && Array.isArray(vsaved.words) && vsaved.words.length > 0 && (vsaved.syncId || "") === (syncId || "")) {
        setVocabSession({ words: vsaved.words, idx: Math.min(vsaved.idx || 0, vsaved.words.length - 1) });
      } else if (vraw) {
        localStorage.removeItem("moa-active-vocab");
      }
    } catch (e) { console.error("Failed to restore lesson:", e); }
  }, [loaded, lessonRestored, syncId]);

  // Persist an in-progress vocab session (words + current word index) so it can resume.
  useEffect(() => {
    if (!lessonRestored) return;
    if (vocabSession && vocabSession.words && vocabSession.words.length) {
      try { localStorage.setItem("moa-active-vocab", JSON.stringify({ words: vocabSession.words, idx: vocabSession.idx || 0, syncId: syncId || "" })); } catch (e) {}
    } else {
      try { localStorage.removeItem("moa-active-vocab"); } catch (e) {}
    }
  }, [vocabSession, lessonRestored, syncId]);

  // Persist the active lesson to localStorage whenever the conversation changes — while
  // it's unfinished, with or without an account (it's the learner's own browser). A
  // trailing (still-unanswered) user turn is dropped so a resumed session always lands on
  // an AI message. The article is NOT stored (it lives on the card) to keep this small,
  // and if storage is full we shed the oldest messages so recent turns always survive.
  useEffect(() => {
    if (!lessonRestored) return; // don't save during initial restore or after disconnect
    let msgs = conv;
    if (msgs.length && msgs[msgs.length - 1].role === "user") msgs = msgs.slice(0, -1);
    if (!(lCard && msgs.length > 0 && !lessonDone)) {
      // No live card, empty conversation, or the lesson is finished -> nothing to resume.
      localStorage.removeItem("moa-active-lesson");
      return;
    }
    const slim = msgs.map(m => ({ role: m.role, content: m.content, options: m.options || null, selected: m.selected || null, sources: m.sources || null, degraded: m.degraded || false }));
    for (let keep = slim.length; keep >= 1; keep = Math.floor(keep / 2)) {
      try {
        localStorage.setItem("moa-active-lesson", JSON.stringify({ card: lCard, syncId: syncId || "", conv: slim.slice(-keep), lessonDone: false }));
        return;
      } catch (e) {
        if (keep <= 1) console.error("Failed to save lesson (storage full):", e);
      }
    }
  }, [conv, lCard, lessonDone, lessonRestored, syncId]);

  // Init the profile draft when ENTERING the profile view (not on every data change,
  // so auto-save doesn't reset what the user is typing).
  useEffect(() => {
    if (view === "profile") {
      setProfileDraft({ ...(data.profile || DEFAULT_PROFILE) });
      setLangProfDraft({ ...DEFAULT_LANG_PROFILE, ...((data.langProfiles || {})[tl] || {}) });
      setProfileSavedMsg(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, tl]);

  // Auto-save the profile shortly after any edit; the green "Saved" shows under the field
  // that changed. No button.
  useEffect(() => {
    if (view !== "profile" || !profileDraft) return;
    const prof = data.profile || {};
    if (JSON.stringify(profileDraft) === JSON.stringify(prof)) return;
    const changedKey = Object.keys(profileDraft).find(k => JSON.stringify(profileDraft[k]) !== JSON.stringify(prof[k])) || null;
    const id = setTimeout(() => {
      save({ ...data, profile: { ...profileDraft } });
      setSavedFieldKey(changedKey);
      setProfileSavedMsg(true);
      setTimeout(() => setProfileSavedMsg(false), 2000);
    }, 700);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileDraft]);

  useEffect(() => {
    if (view !== "profile" || !langProfDraft) return;
    const current = (data.langProfiles || {})[tl] || {};
    if (JSON.stringify(langProfDraft) === JSON.stringify({ ...DEFAULT_LANG_PROFILE, ...current })) return;
    const changedKey = Object.keys(langProfDraft).find(k => JSON.stringify(langProfDraft[k]) !== JSON.stringify(current[k])) || null;
    const id = setTimeout(() => {
      save({ ...data, langProfiles: { ...(data.langProfiles || {}), [tl]: { ...langProfDraft } } });
      setSavedFieldKey(changedKey ? `lp_${changedKey}` : null);
      setProfileSavedMsg(true);
      setTimeout(() => setProfileSavedMsg(false), 2000);
    }, 700);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [langProfDraft]);

  // Inline "Saved ✓" shown right under the field that was just auto-saved.
  const savedTag = (k) => (profileSavedMsg && savedFieldKey === k)
    ? <div style={{ fontSize: 11, color: C.ok, fontWeight: 500, marginTop: 4 }}>✓ {t.profileSaved}</div>
    : null;

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
  const summaryRef = useRef(null);
  useEffect(() => {
    if ((lessonSummary || recapSummary) && summaryRef.current) {
      setTimeout(() => summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [lessonSummary, recapSummary]);

  // Reset exercise only when entering the exercise tab or switching target language
  useEffect(() => {
    if (view === "exercise") {
      exFilterUserRef.current = false;
      if (skipExResetRef.current) {
        skipExResetRef.current = false;
        exPreselectedRef.current = true;
      } else {
        exPrimaryWordRef.current = null;
        exPreselectedRef.current = false;
        setExSel(new Set(exerciseCards.map(c => c.id)));
      }
      setExOn(false);
      setExConv([]);
      setExDone(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, tl]);

  // Changing the Exercise vocab/grammar filter re-selects the whole filtered set.
  // exPreselectedRef survives mode changes (back/forth) but is consumed on the first
  // manual filter change on the cards step so the user gets the right card set.
  const exFilterUserRef = useRef(false);
  useEffect(() => {
    if (view === "exercise" && !exOn && exStep === "cards") {
      if (exPreselectedRef.current && !exFilterUserRef.current) {
        // first arrival on cards step with preselection: keep it
      } else {
        setExSel(new Set(exerciseCards.map(c => c.id)));
      }
      exFilterUserRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exFilter]);

  // Feed is Korean-only for now: never leave the learner stranded on it in another language.
  useEffect(() => {
    if (view === "feed" && tl !== "ko") setView("library");
  }, [view, tl]);

  // Track window width so responsive layouts re-render on resize (not just first paint).
  useEffect(() => {
    const onR = () => setWinW(window.innerWidth);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  // Today's weather in the target-language's city (Open-Meteo — free, no key).
  useEffect(() => {
    const city = WEATHER_CITY[tl];
    if (!city) { setWeather(null); return; }
    let alive = true;
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,weather_code`)
      .then(r => r.json())
      .then(d => { if (alive && d && d.current) setWeather({ city: city.name, temp: Math.round(d.current.temperature_2m), emoji: weatherEmoji(d.current.weather_code) }); })
      .catch(() => {});
    return () => { alive = false; };
  }, [tl]);

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

  // "Aujourd'hui" is a FIXED daily set per target language: chosen once per
  // calendar day from the cards still to discover in that language, then frozen
  // so finished cards stay (turn green) instead of being replaced.
  // Rebuilds when the day or target language changes.
  useEffect(() => {
    const today = dayKey();
    if (data.today && data.today.date === today && data.today.tl === tl && (data.today.ids || []).length > 0) return;
    const langCards = data.cards.filter(c => (c.targetLang || "ko") === tl);
    if (!langCards.length) return;
    const ep = getEffectiveProfile(data, tl);
    const dc = Number(ep.dailyCount) > 0 ? Number(ep.dailyCount) : 5;
    const newCards = langCards.filter(c => migrateStatus(c.status) === "new");
    const reviewCards = langCards.filter(c => { const s = migrateStatus(c.status); return s === "in_progress" || s === "studied"; });
    if (!newCards.length && !reviewCards.length) return;
    const dueReview = reviewCards.filter(c => {
      if (isCardLongTermAcquired(c)) return false;
      const next = getCardNextReviewDate(c, Infinity);
      return !next || next <= today;
    });
    const otherReview = reviewCards.filter(c => !dueReview.includes(c));
    const picked = [...newCards.slice(0, dc), ...dueReview.slice(0, Math.max(0, dc - newCards.length)), ...otherReview.sort(() => Math.random() - 0.5).slice(0, Math.max(0, dc - newCards.length - dueReview.length))].slice(0, dc);
    const ids = picked.map(c => c.id);
    const originalStatus = {};
    picked.forEach(c => { originalStatus[c.id] = migrateStatus(c.status); });
    save({ ...data, today: { date: today, tl, ids, originalStatus } });
  }, [data.today, data.cards, tl, save]);

  // Daily-goal bonus: when every card in today's set is finished, award +30 once.
  useEffect(() => {
    const sel = data.today;
    if (!sel || sel.bonusAwarded || sel.date !== dayKey()) return;
    const cards = (sel.ids || []).map(id => data.cards.find(c => c.id === id)).filter(Boolean);
    const origSt = sel.originalStatus || {};
    const todayDate = sel.date;
    const exercisedToday = c => { const p = c.progress; return p && ["ce","co","pe","po"].some(k => (p[k] || []).includes(todayDate)); };
    const isDone = c => {
      const s = migrateStatus(c.status);
      if (s === "acquired") return true;
      if ((origSt[c.id] || "new") === "new") return s === "studied" || s === "acquired";
      return exercisedToday(c);
    };
    if (!cards.length || !cards.every(isDone)) return;
    const base = data.profile || DEFAULT_PROFILE;
    save({ ...data, today: { ...sel, bonusAwarded: true }, profile: { ...base, points: (base.points || 0) + 30 } });
    setPointsToast({ n: 30, label: t.dailyGoalReached(30) });
    setTimeout(() => setPointsToast(null), 3000);
  }, [data.today, data.cards, save]);

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
    const nd = { ...data, targetLangs: newTLs, lastTargetLang: code };
    save(nd);
    setTlOpen(false);
    const existing = (nd.langProfiles || {})[code];
    if (!existing) {
      const base = nd.profile || {};
      setLangProfileDraft({
        dream: base.dream || '',
        level: base.level || '',
        goals: base.goals || '',
        notes: base.notes || '',
        learnerNotes: base.learnerNotes || '',
        otherTools: base.otherTools || '',
        dailyCount: base.dailyCount ?? 5,
      });
      setLangProfileEdit(code);
    }
  };

  // ---- FEED ----
  const feedKeywords = (data.feedKeywords && data.feedKeywords[tl]) || [];

  const loadFeed = useCallback(async (query, category) => {
    const cat = category || feedCat;
    // Only "news" personalizes with a keyword; press/sns/masto are keyless, and even news
    // falls back to top headlines with no query — so nothing here requires a keyword.
    setFeedLoad(true); setFeedErr(null);
    try {
      const items = await fetchFeed(query, tl, cat);
      setFeedItems(items);
      setFeedQuery(query);
    } catch (e) {
      console.error("feed error:", e);
      setFeedErr(e.message);
      setFeedItems([]);
    }
    setFeedLoad(false);
  }, [tl, feedCat]);

  // Daily news recap (#57): general + dream-based sections, translated into the interface
  // language and cached once per day (so the AI pass runs at most once a day).
  const loadNewsRecap = useCallback(async (force) => {
    const interest = (getEffectiveProfile(data, tl).dream || "").trim().slice(0, 80);
    const key = "moa-news-recap";
    if (!force) {
      try {
        const cached = JSON.parse(localStorage.getItem(key) || "null");
        if (cached && cached.v === 3 && cached.date === dayKey() && cached.lang === tl && cached.uiLang === lang && cached.interest === interest) {
          setNewsRecap(cached); return;
        }
      } catch {}
    }
    setNewsRecapLoad(true); setNewsRecapErr("");
    try {
      // Translate the dream into an industry-news query in the target language (Korean sources
      // cover niche topics); also get a short label for the section header.
      let interestQuery = interest, interestLabel = interest;
      if (interest) { try { const dq = await dreamToSearchQuery(interest, getTargetLangName(tl, "en"), lang === "fr" ? "French" : lang === "ko" ? "Korean" : "English"); if (dq.query) interestQuery = dq.query; if (dq.label) interestLabel = dq.label; } catch (qe) { console.warn("dream query translate failed:", qe); } }
      const res = await fetch("/api/feed", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "newsRecap", targetLang: tl, interest: interestQuery }),
      });
      const raw = await res.text();
      let d; try { d = JSON.parse(raw); } catch { throw new Error(raw.slice(0, 150)); }
      if (!res.ok) throw new Error(d.error || raw.slice(0, 150));
      const rawGeneral = d.general || [], rawInterest = d.interest || [];
      let general = rawGeneral.slice(0, 5), interestItems = rawInterest.slice(0, 5), translated = false;
      // Translate + summarize into the interface language (falls back to raw on quota/error).
      try {
        const s = await summarizeRecap(rawGeneral, rawInterest, lang);
        const merge = (parsed, rawArr) => (parsed || [])
          .map(p => { const r = rawArr[p.i]; return r ? { title: p.title || r.title, snippet: p.description || "", link: r.link, source: r.source, date: r.date, image: r.image } : null; })
          .filter(Boolean).slice(0, 5);
        const g = merge(s.general, rawGeneral), it = merge(s.interest, rawInterest);
        if (g.length) { general = g; interestItems = it; translated = true; }
      } catch (se) { console.warn("recap summarize failed, showing raw:", se); }
      const recap = { v: 3, date: dayKey(), lang: tl, uiLang: lang, interest, interestLabel, general, interestItems, translated };
      setNewsRecap(recap);
      try { localStorage.setItem(key, JSON.stringify(recap)); } catch {}
    } catch (e) {
      console.error("news recap error:", e);
      setNewsRecapErr(e.message);
    }
    setNewsRecapLoad(false);
  }, [tl, lang, data.profile?.dream, data.langProfiles]);

  // Open a social post (Bluesky/Mastodon) in the in-app thread viewer.
  const openThread = async (item) => {
    setFeedThread({ loading: true, posts: [], link: item.link, source: item.source });
    try {
      const posts = await fetchThread(item);
      setFeedThread({ loading: false, posts, link: item.link, source: item.source });
    } catch (e) {
      console.error("thread error:", e);
      setFeedThread({ loading: false, posts: [], link: item.link, source: item.source, error: e.message });
    }
  };

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
    if (view !== "feed" || feedLoad || feedKwLoad) return;
    // Daily recap is opt-in and keyless; load it if it's the active tab and not yet fetched.
    if (feedCat === "recap") { if (!newsRecap && !newsRecapLoad) loadNewsRecap(); return; }
    if (feedItems.length > 0) return;
    (async () => {
      // Keyless categories load directly (no AI keyword generation).
      if (feedCat === "sns" || feedCat === "masto" || feedCat === "press") { loadFeed("", feedCat); return; }
      // "news": personalize with AI keywords when available, else fall back to top headlines.
      const kws = await ensureKeywords();
      if (kws.length) {
        const pick = kws[Math.floor(Math.random() * kws.length)];
        loadFeed(pick, feedCat);
      } else {
        loadFeed("", feedCat);
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

  // +1 point the first time the learner opens a given "Further resources" link.
  const awardResourcePoint = () => save(awardPoints(1, data));

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
    setTimeout(() => setProfileSavedMsg(false), 2600);
  };

  // ---- IMPORT ----
  const doAnalyze = async () => {
    if (!impText.trim()) return;
    if (impMode === "comprehension") {
      const existing = (data.textStudies || []).find(s => s.text === impText.trim());
      setCompSession({ text: impText.trim(), existing: existing || null });
      setView("comprehension");
      return;
    }
    setImpStep("scanning");
    try {
      if (impMode === "bulk") {
        setBulkProgress(null);
        const items = dedupeExtracted(await analyzeBulk(impText, data.cards, lang, context, tl, (cur, tot) => setBulkProgress({ current: cur, total: tot })), data.cards);
        setBulkProgress(null);
        setBulkFound(items);
        setBulkSel(new Set(items.map((_, i) => i)));
        setImpStep("bulkpicks");
      } else if (impMode === "vocab") {
        const items = dedupeExtracted(await analyzeVocab(impText, data.cards, lang, context, tl), data.cards);
        setVocabFound(items);
        setVocabSel(new Set(items.map((_, i) => i))); // all selected by default
        setImpStep("vocabpicks");
      } else {
        setFound(dedupeExtracted(await analyzeText(impText, data.cards, lang, context, tl), data.cards));
        setSelPick(0); setKnown(new Set()); setImpStep("picks");
      }
    } catch (e) { console.error(e); alert(e.message); setImpStep("input"); }
  };

  const makeVocabCard = (v, status) => ({
    id: Date.now().toString() + Math.random().toString(36).slice(2, 5),
    korean: v.word || v.korean, type: "vocab",
    description: lang === "fr" ? v.meaning_fr : (v.meaning_en || v.meaning_fr),
    description_fr: v.meaning_fr, description_en: v.meaning_en,
    description_target: v.description_target || "",
    gender: v.gender || "",
    example_kr: v.example_kr || "",
    example_tr: lang === "fr" ? v.example_fr : (v.example_en || v.example_fr),
    reading: v.reading || "",
    tags: v.category ? [v.category.toLowerCase().trim()] : [],
    formality: v.register || "",
    registerFormal: v.register_formal || "",
    registerCasual: v.register_casual || "",
    status, source: "Import", articleText: impText, reviewCount: 0,
    targetLang: tl || "ko",
    date: new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : lang === "ko" ? "ko-KR" : "en-US", { day: "numeric", month: "short" }),
  });

  const startVocabLesson = () => {
    const words = [...vocabSel].sort((a, b) => a - b).map(i => vocabFound[i]).filter(Boolean);
    if (!words.length) { alert(t.vocabNoneSelected); return; }
    const newCards = words.filter(w => !data.cards.find(c => c.korean === w.word)).map(w => makeVocabCard(w, "in_progress"));
    if (newCards.length) save({ ...data, cards: [...data.cards, ...newCards] });
    setVocabSession({ words, idx: 0 });
    setLCard(null); setConv([]); setShowRecap(false); setRecapCard(null); setLessonDone(false); setLessonSummary(null);
    setView("lesson");
  };

  const finishVocab = () => {
    const studiedWords = (vocabSession?.words || []).map(w => w.word);
    const todayKey = new Date().toISOString().slice(0, 10);
    const goals = data.goals || [];
    const updated = data.cards.map(c => {
      if (c.type === "vocab" && studiedWords.includes(c.korean)) {
        const prog = c.progress ? { ...c.progress } : { ce: [], co: [], pe: [], po: [] };
        if (!(prog.ce || []).includes(todayKey)) prog.ce = [...(prog.ce || []), todayKey];
        const reviewDates = [...(c.reviewDates || [])];
        if (!reviewDates.includes(todayKey)) reviewDates.push(todayKey);
        const discoveredDate = c.discoveredDate || todayKey;
        let newStatus = c.status === "acquired" ? "acquired" : "studied";
        let goalAcquired = c.goalAcquired || false;
        if (c.goalId) {
          const goal = goals.find(g => g.id === c.goalId);
          if (goal) {
            const dLeft = Math.max(1, Math.ceil((new Date(goal.deadline + "T23:59:59") - new Date(discoveredDate + "T00:00:00")) / 86400000));
            if (isCardGoalAcquired({ ...c, reviewDates, discoveredDate }, dLeft)) goalAcquired = true;
          }
        }
        if (isCardLongTermAcquired({ ...c, reviewDates })) newStatus = "acquired";
        return { ...c, status: newStatus, reviewCount: (c.reviewCount || 0) + 1, progress: prog, reviewDates, discoveredDate, goalAcquired };
      }
      return c;
    });
    const base = data.profile || DEFAULT_PROFILE;
    const gain = 15;
    save({ ...data, cards: updated, profile: { ...base, points: (base.points || 0) + gain } });
    setPointsToast(gain); setTimeout(() => setPointsToast(null), 2500);
    updated.filter(c => c.type === "vocab" && studiedWords.includes(c.korean) && !c.description_target).forEach(c => {
      generateTargetDescription(c, c.targetLang || tl).then(res => {
        if (res.description_target) {
          setData(prev => {
            const nd = { ...prev, cards: prev.cards.map(x => x.id === c.id ? { ...x, description_target: res.description_target } : x) };
            saveData(nd, syncId);
            return nd;
          });
        }
      }).catch(() => {});
    });
    try { localStorage.removeItem("moa-active-vocab"); } catch (e) {}
    setVocabSession(null);
    setView("library");
  };

  const exitVocab = () => { setVocabSession(null); setView("library"); };

  // Import from an image/screenshot: extract the text via OCR, then let the user review it.
  const onImagePick = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setImpStep("ocr");
    try {
      const { base64, mimeType } = await fileToScaledBase64(file, 1600);
      const text = await extractImageText(base64, mimeType, getTargetLangName(tl, "en"));
      // Warn if the image has no text in the target language (likely the wrong image).
      if (!hasTargetScript(text, tl)) { alert(t.ocrNoTarget(getTargetLangName(tl, lang))); setImpStep("input"); return; }
      setImpText(prev => prev && prev.trim() ? prev + "\n" + text : text);
      setImpStep("input");
    } catch (err) { console.error("OCR error:", err); alert(err.message); setImpStep("input"); }
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
    korean: p.korean, type: normType(p.type),
    description: lang === "fr" ? p.description_fr : (p.description_en || p.description_fr),
    description_fr: p.description_fr, description_en: p.description_en,
    description_target: p.description_target || "",
    example_kr: p.example_kr,
    example_tr: lang === "fr" ? p.example_fr : (p.example_en || p.example_fr),
    tags: p.category ? [p.category.toLowerCase().trim()] : [],
    status, source: "Import", articleText: impText, reviewCount: 0,
    targetLang: tl || "ko",
    date: new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : lang === "ko" ? "ko-KR" : "en-US", { day: "numeric", month: "short" }),
  });

  const addWordToVocab = async (text) => {
    const word = (text || "").trim();
    if (!word) return;
    if (data.cards.find(c => c.korean === word)) { setFlash(t.alreadyInLib); setTimeout(() => setFlash(null), 1800); setSelAdd(null); return; }
    let baseForm = word;
    try {
      setFlash(lang === "fr" ? "Recherche de la forme de base..." : lang === "ko" ? "기본형 검색 중..." : "Looking up base form...");
      const sys = "You are a Korean linguistic assistant. Given a Korean word (possibly conjugated, inflected or with particles), return ONLY the dictionary/base form (기본형). For verbs and adjectives, return the -다 form. For nouns with particles, return just the noun. Reply with the single word only, nothing else.";
      const { text: lemma } = await callAI(sys, word, 50, false, true);
      const cleaned = (lemma || "").trim().split(/\s/)[0].trim();
      if (cleaned) baseForm = cleaned;
    } catch (e) {
      console.warn("Lemmatization failed, using original word:", e);
    }
    if (data.cards.find(c => c.korean === baseForm)) { setFlash(t.alreadyInLib); setTimeout(() => setFlash(null), 1800); setSelAdd(null); return; }
    const card = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
      korean: baseForm, type: "vocab",
      description: "", description_fr: "", description_en: "",
      example_kr: "", example_tr: "",
      tags: [],
      status: "new", source: t.selectionSource, articleText: "", reviewCount: 0,
      targetLang: tl || "ko",
      date: new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : lang === "ko" ? "ko-KR" : "en-US", { day: "numeric", month: "short" }),
    };
    save({ ...data, cards: [...data.cards, card] });
    setSelAdd(null);
    try { window.getSelection()?.removeAllRanges(); } catch {}
    setFlash((baseForm !== word ? baseForm + " " : "") + t.addedToVocab); setTimeout(() => setFlash(null), 2500);
  };

  useEffect(() => {
    const checkSel = () => {
      const sel = window.getSelection && window.getSelection();
      const text = sel ? sel.toString().trim() : "";
      if (!text || text.length > 40 || !hasTargetScript(text, tl)) { setSelAdd(null); return; }
      try {
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        if (!rect || (!rect.width && !rect.height)) { setSelAdd(null); return; }
        setSelAdd({ text, x: rect.left + rect.width / 2, y: rect.top });
      } catch { setSelAdd(null); }
    };
    let scTimer = null;
    const onSelChange = () => { clearTimeout(scTimer); scTimer = setTimeout(checkSel, 250); };
    const onUp = (e) => {
      if (e.target && e.target.closest && e.target.closest("input, textarea, [data-sel-add]")) return;
      checkSel();
    };
    const onDown = (e) => { if (!(e.target && e.target.closest && e.target.closest("[data-sel-add]"))) setSelAdd(null); };
    document.addEventListener("mouseup", onUp);
    document.addEventListener("selectionchange", onSelChange);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => { clearTimeout(scTimer); document.removeEventListener("mouseup", onUp); document.removeEventListener("selectionchange", onSelChange); document.removeEventListener("mousedown", onDown); document.removeEventListener("touchstart", onDown); };
  }, [tl]);

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
    setLCard(existing || card); setLArticle(text); setConv([]); setLLoad(true);
    window.history.pushState({ view: "lesson" }, ""); setView("lesson");
    setLessonDone(false); setLessonSummary(null); setShowRecap(false); setRecapCard(null);
    try { const r = await startSocratic(card, text, lang, context, tl); setConv([{ role: "ai", content: r.message, options: r.options, selected: null }]); }
    catch (e) {
      console.error("startSocratic error:", e);
      setConv([{
        role: "ai",
        content: `⚠️ ${lang === "fr" ? "L'IA n'a pas pu démarrer la leçon" : lang === "ko" ? "AI가 레슨을 시작하지 못했어요" : "AI couldn't start the lesson"}${e?.message ? `\n\n${e.message.substring(0, 150)}` : ""}`,
        retry: () => beginLesson(point, art),
      }]);
    }
    setLLoad(false);
  };

  // Nav-tab handler. An in-progress lesson auto-saves continuously (localStorage), so
  // leaving never needs a prompt — just navigate.
  // Browser history integration: push state on tab navigation so the mobile
  // back gesture (and browser back button) returns to the previous view
  // instead of leaving the app entirely.
  const historyNavRef = useRef(false); // true when popstate is driving the navigation
  useEffect(() => {
    window.history.replaceState({ view: "goals" }, "");
    const onPop = (e) => {
      const st = e.state;
      if (st && st.view) {
        historyNavRef.current = true;
        if (st.recap) {
          setRecapCard(st.recapCard || null);
          setShowRecap(true);
        } else {
          setShowRecap(false); setRecapCard(null); setLCard(null); setConv([]);
        }
        setView(st.view);
        setGoalView(st.goalView || "list");
        setGoalEditId(st.goalEditId || null);
        setGoalEditingDeadline(false);
        setGoalDeleteConfirm(null);
        setGoalCardPicker(false);
      } else {
        window.history.pushState({ view }, "");
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const navTo = (target) => {
    // Flush any unsaved profile edits before leaving the profile.
    if (view === "profile") {
      let nd = data;
      if (profileDraft && JSON.stringify(profileDraft) !== JSON.stringify(data.profile || {})) {
        nd = { ...nd, profile: { ...profileDraft } };
      }
      if (langProfDraft) {
        const current = (nd.langProfiles || {})[tl] || {};
        if (JSON.stringify(langProfDraft) !== JSON.stringify({ ...DEFAULT_LANG_PROFILE, ...current })) {
          nd = { ...nd, langProfiles: { ...(nd.langProfiles || {}), [tl]: { ...langProfDraft } } };
        }
      }
      if (nd !== data) save(nd);
    }
    if (target === "import") setImpStep("input");
    if (target === "exercise" && !skipExResetRef.current) { setExStep("category"); setExCategory(null); setExOn(false); }
    if (target === "goals") { setGoalView("list"); setGoalEditId(null); setGoalDeleteConfirm(null); setGoalCardPicker(false); setGoalPickTag(null); setGoalImpStep(null); setGoalImpFound([]); setGoalImpSel(new Set()); setGoalEditingDeadline(false); }
    if (bulkTagMode) { setBulkTagMode(false); setBulkTagSel(new Set()); setBulkTagPicker(false); }
    // Push history entry unless this navigation was triggered by popstate itself.
    if (!historyNavRef.current) {
      window.history.pushState({ view: target }, "");
    }
    historyNavRef.current = false;
    setView(target);
  };

  // Open a card the normal way: recap screen when it has past summaries, else a fresh lesson.
  const openCardFresh = (c) => {
    const effectiveStatus = migrateStatus(c.status);
    // An already-studied/acquired card always opens the recap MENU first (consistent, and
    // reviewing it saves nothing — only the recap conversation, for consultation). New or
    // in-progress cards start/continue the actual lesson.
    if (effectiveStatus === "studied" || effectiveStatus === "acquired") {
      setRecapCard(c);
      setShowRecap(true);
      setRecapConv([]); setRecapMode(null); setRecapInp(""); setTagExplore(null);
      setLCard(null); setConv([]); setLessonDone(false); setLessonSummary(null);
      window.history.pushState({ view: "lesson", recap: true, recapCard: c }, "");
      setView("lesson");
      return;
    }
    // Vocab: let the learner choose a full lesson OR just the direct translation (easy words).
    // Grammar always goes straight to a lesson.
    if (c.type === "vocab") { setStudyChoice(c); return; }
    startLessonFromCard(c);
  };

  // "Just the translation": show the meaning/example directly and mark the card studied,
  // no Socratic lesson. Fetches the meaning first if the card is a bare (selection) card.
  const directTranslate = async (c) => {
    setStudyChoice(null);
    let extra = {};
    if (!c.description && !c.description_fr && !c.description_en) {
      setDirectLoad(true);
      try {
        const info = await quickTranslateWord(c.korean, lang, tl);
        extra = {
          description_fr: info.description_fr || "", description_en: info.description_en || "",
          description: lang === "fr" ? (info.description_fr || "") : (info.description_en || ""),
          description_target: info.description_target || "",
          gender: info.gender || "",
          example_kr: info.example_kr || "", example_tr: lang === "fr" ? (info.example_fr || "") : (info.example_en || ""),
        };
      } catch (e) { console.error("quick translate error:", e); }
      setDirectLoad(false);
    }
    const base = data.profile || DEFAULT_PROFILE;
    const wasFirst = (data.cards.find(x => x.korean === c.korean)?.reviewCount || 0) === 0;
    const gain = wasFirst ? 5 : 0;
    const updatedCards = data.cards.map(x => {
      if (x.korean !== c.korean) return x;
      const rc = (x.reviewCount || 0) + 1;
      const st = migrateStatus(x.status) === "acquired" ? "acquired" : "studied";
      return { ...x, ...extra, status: st, reviewCount: rc };
    });
    save({ ...data, cards: updatedCards, profile: { ...base, points: (base.points || 0) + gain } });
    if (gain) { setPointsToast(gain); setTimeout(() => setPointsToast(null), 2000); }
    const card = updatedCards.find(x => x.korean === c.korean);
    // Open the recap screen so the translation/summary is shown right away.
    setRecapCard(card); setShowRecap(true); setRecapConv([]); setRecapMode(null); setRecapInp("");
    setLCard(null); setConv([]); setLessonDone(false); setLessonSummary(null);
    window.history.pushState({ view: "lesson" }, ""); setView("lesson");
  };

  // Re-open the Import flow prefilled with a source text, to study it again.
  const reStudyFromText = (text) => {
    setImpText(text || "");
    setFound([]); setSelPick(0); setKnown(new Set());
    setImpStep("input");
    setView("import");
  };

  // Find a resumable (unfinished) session for card c: the in-memory one first, else the
  // persisted copy from localStorage (so a lesson resumes even after a full page reload).
  const savedSessionFor = (c) => {
    if (lCard && lCard.korean === c.korean && conv.length > 0 && !lessonDone) {
      return { card: lCard, article: lArticle, conv };
    }
    try {
      const raw = localStorage.getItem("moa-active-lesson");
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.card && s.card.korean === c.korean && Array.isArray(s.conv) && s.conv.length > 0 && !s.lessonDone && (s.syncId || "") === (syncId || "")) {
          return { card: s.card, article: s.card.articleText || s.article || "", conv: s.conv.map(m => ({ ...m, options: m.options || null })) };
        }
      }
    } catch (e) { /* corrupt save -> treat as none */ }
    return null;
  };

  const reviewCard = (c) => {
    // A resumable session exists for this exact card -> offer to resume rather than restart.
    const sess = savedSessionFor(c);
    if (sess) { setResumePrompt({ card: c, sess }); return; }
    openCardFresh(c);
  };

  const startLessonFromCard = (c) => {
    setStudyChoice(null);
    setShowRecap(false); setRecapCard(null); setRecapConv([]); setRecapMode(null);
    beginLesson({
      korean: c.korean, type: c.type, description_fr: c.description_fr || c.description, description_en: c.description_en || c.description,
      example_kr: c.example_kr, example_fr: c.example_tr, example_en: c.example_tr,
    }, c.articleText || "");
  };

  // ---- RECAP QUICK PRACTICE ----
  // On-demand register analysis for a Korean vocab card (works for older cards too).
  const loadRegister = async () => {
    if (!recapCard || registerLoad) return;
    setRegisterLoad(true);
    try {
      const r = await analyzeRegister(recapCard, lang);
      const upd = { formality: r.register || "neutral", registerFormal: r.formal || "", registerCasual: r.casual || "", registerNote: r.note || "" };
      save({ ...data, cards: data.cards.map(c => c.korean === recapCard.korean ? { ...c, ...upd } : c) });
      setRecapCard(prev => prev ? { ...prev, ...upd } : prev);
    } catch (e) { console.error("register error:", e); setFlash(e?.message ? e.message.slice(0, 60) : "Erreur"); setTimeout(() => setFlash(null), 2200); }
    setRegisterLoad(false);
  };

  const startRecapAction = async (action) => {
    if (!recapCard) return;
    setRecapMode(action);
    setRecapConv([]);
    setRecapDone(false); setRecapSummary(null);
    setRecapLoad(true);
    const labels = { examples: t.askExamples, realExamples: t.realExamples, resources: t.resourcesAsk, exercise: t.askExercise, explain: t.askExplain, image: t.askImage, register: t.registerExamplesAsk, rootWords: t.rootWordsAsk };
    const u = [{ role: "user", content: labels[action] || action }];
    setRecapConv(u);
    try {
      if (action === "image") {
        setSearching(true);
        const pool = await fetchImages(recapCard.korean, 20);
        setSearching(false);
        setRecapConv([...u, { role: "ai", content: pool.length ? `📷 ${recapCard.korean}` : t.imageNone, images: pool.slice(0, 4), imagePool: pool, imgFrom: 0, imageWord: recapCard.korean, options: null, selected: null }]);
      } else if (action === "resources" || action === "realExamples") {
        setSearching(true);
        const r = action === "resources"
          ? await findResources(recapCard, lang, tl)
          : await findRealExamples(recapCard, lang, tl, data.profile?.interests || "");
        setSearching(false);
        setRecapConv([...u, { role: "ai", content: r.text, sources: r.sources, degraded: r.degraded, pointOnClick: action === "resources", options: null, selected: null }]);
      } else {
        const r = await continueChat(recapCard, u, action, lang);
        setRecapConv([...u, { role: "ai", content: r.message, options: r.options || null, selected: null }]);
        if (action === "rootWords" && r.message) {
          const summary = {
            id: Date.now().toString(),
            cardKorean: recapCard.korean,
            date: new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : lang === "ko" ? "ko-KR" : "en-US", { day: "numeric", month: "short", year: "numeric" }),
            grammarRecap: r.message,
            structuresLearned: t.rootWordsBtn,
          };
          save({ ...data, summaries: [...(data.summaries || []), summary] });
        }
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

  const endRecapPractice = async () => {
    if (!recapCard || recapConv.length < 2) return;
    setRecapLoad(true); setRecapDone(true);
    try {
      const result = await generateSummary(recapCard, recapConv, lang);
      const summary = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 5),
        cardKorean: recapCard.korean,
        targetLang: recapCard.targetLang || tl || "ko",
        grammarRecap: result.grammarRecap || "",
        structuresLearned: result.structuresLearned || "",
        mistakesMade: result.mistakesMade || "",
        nextSteps: result.nextSteps || "",
        date: new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : lang === "ko" ? "ko-KR" : "en-US", { day: "numeric", month: "short", year: "numeric" }),
        conversationLength: recapConv.length,
      };
      setRecapSummary(summary);
      const category = result.category ? result.category.toLowerCase().trim() : "";
      const todayKey = new Date().toISOString().slice(0, 10);
      const goals = data.goals || [];
      let nd = { ...data, summaries: [...(data.summaries || []), summary], cards: data.cards.map(c => {
        if (c.korean !== recapCard.korean) return c;
        const tags = (category && (c.tags || []).length < 3 && !(c.tags || []).includes(category)) ? [...(c.tags || []), category] : (c.tags || []);
        const reviewDates = [...(c.reviewDates || [])];
        if (!reviewDates.includes(todayKey)) reviewDates.push(todayKey);
        const discoveredDate = c.discoveredDate || todayKey;
        let newStatus = c.status;
        if (c.status !== "acquired" && c.status !== "studied") newStatus = "studied";
        let goalAcquired = c.goalAcquired || false;
        if (c.goalId) {
          const goal = goals.find(g => g.id === c.goalId);
          if (goal) {
            const dLeft = Math.max(1, Math.ceil((new Date(goal.deadline + "T23:59:59") - new Date(discoveredDate + "T00:00:00")) / 86400000));
            if (isCardGoalAcquired({ ...c, reviewDates, discoveredDate }, dLeft)) goalAcquired = true;
          }
        }
        if (isCardLongTermAcquired({ ...c, reviewDates }) && c.status !== "acquired") newStatus = "acquired";
        return { ...c, status: newStatus, tags, reviewDates, discoveredDate, goalAcquired };
      }) };
      nd = awardPoints(3, nd);
      save(nd);
    } catch (e) {
      console.error("recap summary error:", e);
      setRecapSummary({ error: e?.message || "Error", structuresLearned: "Error generating summary" });
    }
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
        targetLang: lCard.targetLang || tl || "ko",
        grammarRecap: result.grammarRecap || "",
        structuresLearned: result.structuresLearned || "",
        mistakesMade: result.mistakesMade || "",
        nextSteps: result.nextSteps || "",
        date: new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : lang === "ko" ? "ko-KR" : "en-US", { day: "numeric", month: "short", year: "numeric" }),
        conversationLength: conv.length,
      };
      setLessonSummary(summary);
      // Merge profile insights from lesson into per-language profile (level, notes) and global (interests)
      const insights = result.profileInsights || {};
      const currentProfile = { ...(data.profile || DEFAULT_PROFILE) };
      const currentLangProfiles = { ...(data.langProfiles || {}) };
      const currentLp = { ...(currentLangProfiles[tl] || DEFAULT_LANG_PROFILE) };
      if (insights.interests) {
        currentProfile.interests = currentProfile.interests
          ? currentProfile.interests + "\n" + insights.interests
          : insights.interests;
      }
      if (insights.level) {
        currentLp.level = currentLp.level
          ? currentLp.level + " | " + summary.date + ": " + insights.level
          : insights.level;
      }
      if (insights.notes) {
        currentLp.notes = currentLp.notes
          ? currentLp.notes + "\n" + insights.notes
          : insights.notes;
      }
      currentLangProfiles[tl] = currentLp;
      // Create derived cards with parent link
      const derived = (result.derivedStructures || []);
      const newDerivedCards = derived
        .filter(d => d.korean && !data.cards.find(c => c.korean === d.korean))
        .map(d => ({
          id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
          korean: d.korean, type: normType(d.type),
          description: lang === "fr" ? d.description_fr : (d.description_en || d.description_fr),
          description_fr: d.description_fr, description_en: d.description_en,
          example_kr: d.example_kr || "",
          example_tr: lang === "fr" ? d.example_fr : (d.example_en || d.example_fr),
          tags: [],
          status: "review", source: "Derived",
          parentId: lCard.id, parentKorean: lCard.korean,
          targetLang: tl || "ko",
          articleText: "",
          date: new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : lang === "ko" ? "ko-KR" : "en-US", { day: "numeric", month: "short" }),
        }));
      // Update card status: new/in_progress -> studied, studied -> studied (increment reviewCount), acquired stays acquired
      const wasFirstTime = (data.cards.find(c => c.korean === lCard.korean)?.reviewCount || 0) === 0;
      const fmt = (result.formality || "").toLowerCase();
      const formality = ["casual", "neutral", "formal"].includes(fmt) ? fmt : "";
      const aiCategory = (result.category || "").toLowerCase().trim();
      const todayKey = new Date().toISOString().slice(0, 10);
      const goals = data.goals || [];
      const updatedCards = data.cards.map(c => {
        if (c.korean !== lCard.korean) return c;
        const rc = (c.reviewCount || 0) + 1;
        const f = formality || c.formality || "";
        const existingTags = c.tags || [];
        const newTags = aiCategory && existingTags.length === 0 ? [aiCategory] : existingTags;
        const prog = c.progress ? { ...c.progress } : { ce: [], co: [], pe: [], po: [] };
        if (!(prog.ce || []).includes(todayKey)) prog.ce = [...(prog.ce || []), todayKey];
        const discoveredDate = c.discoveredDate || todayKey;
        const reviewDates = [...(c.reviewDates || [])];
        if (!reviewDates.includes(todayKey)) reviewDates.push(todayKey);
        let goalAcquired = c.goalAcquired || false;
        if (c.goalId) {
          const goal = goals.find(g => g.id === c.goalId);
          if (goal) {
            const dLeft = Math.max(1, Math.ceil((new Date(goal.deadline + "T23:59:59") - new Date(discoveredDate + "T00:00:00")) / 86400000));
            if (isCardGoalAcquired({ ...c, reviewDates, discoveredDate }, dLeft)) goalAcquired = true;
          }
        }
        let newStatus = c.status;
        if (isCardLongTermAcquired({ ...c, reviewDates }) && c.status !== "acquired") newStatus = "acquired";
        else if (c.status !== "acquired") newStatus = "studied";
        return { ...c, status: newStatus, reviewCount: rc, formality: f, tags: newTags, progress: prog, discoveredDate, reviewDates, goalAcquired };
      });
      const gain = wasFirstTime ? 20 : 10;
      const withPoints = { ...currentProfile, points: (currentProfile.points || 0) + gain };
      setPointsToast(gain);
      setTimeout(() => setPointsToast(null), 2500);
      // Don't auto-add derived cards — propose them for the learner to opt in.
      save({ ...data, cards: updatedCards, summaries: [...(data.summaries || []), summary], profile: withPoints, langProfiles: currentLangProfiles });
      setPendingDerived(newDerivedCards);
      setDerivedSel(new Set());
      if (!lCard.description_target) {
        generateTargetDescription(lCard, lCard.targetLang || tl).then(res => {
          if (res.description_target) {
            setData(prev => {
              const nd = { ...prev, cards: prev.cards.map(x => x.id === lCard.id ? { ...x, description_target: res.description_target } : x) };
              saveData(nd, syncId);
              return nd;
            });
          }
        }).catch(() => {});
      }
    } catch (e) {
      console.error("Summary generation error:", e);
      const todayKey2 = new Date().toISOString().slice(0, 10);
      const updatedCards = data.cards.map(c => {
        if (c.korean !== lCard.korean) return c;
        const rc = (c.reviewCount || 0) + 1;
        const prog = c.progress ? { ...c.progress } : { ce: [], co: [], pe: [], po: [] };
        if (!(prog.ce || []).includes(todayKey2)) prog.ce = [...(prog.ce || []), todayKey2];
        if (c.status === "acquired") return { ...c, reviewCount: rc, progress: prog };
        return { ...c, status: "studied", reviewCount: rc, progress: prog };
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
    content: `⚠️ ${lang === "fr" ? "L'IA n'a pas répondu" : lang === "ko" ? "AI가 응답하지 않았어요" : "AI didn't respond"}${e?.message ? ` (${e.message.substring(0, 100)})` : ""}`,
    retry: retryFn || null,
  });

  // Add only the derived cards the learner ticked (opt-in, not imposed).
  const addSelectedDerived = () => {
    const chosen = pendingDerived
      .filter((_, i) => derivedSel.has(i))
      .filter(d => !data.cards.find(c => c.korean === d.korean));
    if (chosen.length) save({ ...data, cards: [...data.cards, ...chosen] });
    setPendingDerived([]); setDerivedSel(new Set());
  };

  const pickOpt = async (i, opt) => {
    if (lLoad) return;
    const isRight = (opt.correct === true || opt.correct === "true");
    const nc = [...conv]; nc[i] = { ...nc[i], selected: opt.label };
    const u = [...nc, { role: "user", content: opt.label }]; setConv(u); setLLoad(true);
    try { const r = await continueChat(lCard, u, isRight ? "correct" : "incorrect, explain", lang); setConv([...u, { role: "ai", content: r.message, options: r.options || null, selected: null }]); }
    catch (e) { console.error("pickOpt error:", e); setConv([...u, aiError(e, () => pickOpt(i, opt))]); }
    setLLoad(false);
  };

  // Add or remove a tag on a card (max 3 tags per card).
  const addTagToCard = (cardId, newTag) => {
    const tg = (newTag || "").toLowerCase().trim();
    if (!tg) return;
    const card = data.cards.find(c => c.id === cardId);
    const hadNoTags = !card?.tags?.length;
    let nd = { ...data, cards: data.cards.map(c => {
      if (c.id !== cardId) return c;
      const tags = c.tags || [];
      if (tags.length >= 3 || tags.includes(tg)) return c;
      return { ...c, tags: [...tags, tg] };
    }) };
    if (hadNoTags && card) nd = awardPoints(1, nd);
    save(nd);
    setRecapCard(prev => prev && prev.id === cardId ? { ...prev, tags: [...(prev.tags || []), tg].slice(0, 3) } : prev);
  };
  const removeTagFromCard = (cardId, tag) => {
    save({ ...data, cards: data.cards.map(c => {
      if (c.id !== cardId) return c;
      return { ...c, tags: (c.tags || []).filter(tt => tt !== tag) };
    }) });
    setRecapCard(prev => prev && prev.id === cardId ? { ...prev, tags: (prev.tags || []).filter(tt => tt !== tag) } : prev);
  };
  const renameTagOnCard = (cardId, oldTag, newTag) => {
    const tg = (newTag || "").toLowerCase().trim();
    if (!tg || tg === oldTag) return;
    save({ ...data, cards: data.cards.map(c => {
      if (c.id !== cardId) return c;
      const tags = (c.tags || []).map(tt => tt === oldTag ? tg : tt);
      if (new Set(tags).size !== tags.length) return { ...c, tags: tags.filter((v, i, a) => a.indexOf(v) === i) };
      return { ...c, tags };
    }) });
    setRecapCard(prev => prev && prev.id === cardId ? { ...prev, tags: (prev.tags || []).map(tt => tt === oldTag ? tg : tt).filter((v, i, a) => a.indexOf(v) === i) } : prev);
  };

  const applyBulkTag = (tag) => {
    const tg = (tag || "").toLowerCase().trim();
    if (!tg || !bulkTagSel.size) return;
    let count = 0;
    const nd = { ...data, cards: data.cards.map(c => {
      if (!bulkTagSel.has(c.id)) return c;
      const tags = c.tags || [];
      if (tags.length >= 3 || tags.includes(tg)) return c;
      count++;
      return { ...c, tags: [...tags, tg] };
    }) };
    save(nd);
    setBulkTagMode(false); setBulkTagSel(new Set()); setBulkTagPicker(false);
    alert((lang === "fr" ? `Tag #${tg} appliqué à ${count} carte${count > 1 ? "s" : ""}` : lang === "ko" ? `#${tg} 태그가 카드 ${count}개에 적용됨` : `Tag #${tg} applied to ${count} card${count > 1 ? "s" : ""}`));
  };

  // Attach/reorder/remove images on a card (max 2; images[0] is the thumbnail shown in menus).
  const setCardImages = (korean, imgs) => {
    const next = imgs.slice(0, 2);
    save({ ...data, cards: data.cards.map(c => c.korean === korean ? { ...c, images: next } : c) });
    setLCard(prev => prev && prev.korean === korean ? { ...prev, images: next } : prev);
    setRecapCard(prev => prev && prev.korean === korean ? { ...prev, images: next } : prev);
  };
  const attachImage = (korean, image) => {
    if (!korean || !image) return;
    const card = data.cards.find(c => c.korean === korean);
    const current = (card && card.images) || [];
    if (current.some(x => x.thumb === image.thumb || (x.url && x.url === image.url))) {
      setFlash(t.imgAlready); setTimeout(() => setFlash(null), 1800); return;
    }
    const pick = { thumb: image.thumb || image.url, url: image.url || image.thumb, link: image.link || "" };
    if (current.length >= 2) { setImgReplace({ korean, image: pick }); return; } // ask which to replace
    setCardImages(korean, [...current, pick]);
    setFlash(t.imgAdded); setTimeout(() => setFlash(null), 1800);
  };

  // "Other images" / refine, without any AI: cycle within the fetched pool (instant), or
  // re-query Brave when the learner refines the search. scope picks lesson vs recap conv.
  const moreImages = async (scope, idx, refine, word) => {
    const setArr = scope === "recap" ? setRecapConv : setConv;
    if (refine && refine.trim()) {
      setSearching(true);
      const pool = await fetchImages(word + " " + refine.trim(), 20);
      setSearching(false);
      setArr(prev => prev.map((m, j) => j === idx
        ? { ...m, imagePool: pool, imgFrom: 0, images: pool.slice(0, 4), imageWord: word, content: pool.length ? `📷 ${word} · ${refine.trim()}` : t.imageNone }
        : m));
      return;
    }
    setArr(prev => prev.map((m, j) => {
      if (j !== idx) return m;
      const pool = m.imagePool || m.images || [];
      if (pool.length <= 4) return m;
      const from = ((m.imgFrom || 0) + 4) % pool.length;
      const rotated = [...pool, ...pool].slice(from, from + 4);
      return { ...m, imgFrom: from, images: rotated };
    }));
  };

  const quickAct = async (a) => {
    if (lLoad) return;
    setTray(false); setLLoad(true);
    const labels = { resources: t.resourcesAsk, realExamples: t.realExamples, examples: t.askExamples, exercise: t.askExercise, explain: t.askExplain, image: t.askImage };
    const u = [...conv, { role: "user", content: labels[a] || a }]; setConv(u);
    try {
      if (a === "image") {
        setSearching(true);
        const pool = await fetchImages(lCard.korean, 20);
        setSearching(false);
        setConv([...u, { role: "ai", content: pool.length ? `📷 ${lCard.korean}` : t.imageNone, images: pool.slice(0, 4), imagePool: pool, imgFrom: 0, imageWord: lCard.korean, options: null, selected: null }]);
      } else if (a === "resources" || a === "realExamples") {
        setSearching(true);
        const r = a === "resources"
          ? await findResources(lCard, lang, tl)
          : await findRealExamples(lCard, lang, tl, data.profile?.interests || "");
        setSearching(false);
        setConv([...u, { role: "ai", content: r.text, sources: r.sources, degraded: r.degraded, pointOnClick: a === "resources", options: null, selected: null }]);
      } else {
        const r = await continueChat(lCard, u, a, lang);
        setConv([...u, { role: "ai", content: r.message, options: r.options || null, selected: null }]);
      }
    }
    catch (e) { setSearching(false); console.error("quickAct error:", e); setConv([...u, aiError(e, () => quickAct(a))]); }
    setLLoad(false);
  };

  const sendMsg = async () => {
    if (lLoad || !inp.trim()) return; const m = inp.trim(); setInp(""); setLLoad(true);
    const u = [...conv, { role: "user", content: m }]; setConv(u);
    try { const r = await continueChat(lCard, u, m, lang); setConv([...u, { role: "ai", content: r.message, options: r.options || null, selected: null }]); }
    catch (e) { console.error("sendMsg error:", e); setConv([...u, aiError(e, () => { setInp(m); })]); }
    setLLoad(false);
  };

  const toggleSt = (id) => save({ ...data, cards: data.cards.map(c => c.id === id ? { ...c, status: c.status === "acquired" ? "studied" : "acquired" } : c) });

  const deleteCard = (c) => {
    save({
      ...data,
      cards: data.cards.filter(x => (c.id ? x.id !== c.id : x.korean !== c.korean)),
      summaries: (data.summaries || []).filter(s => s.cardKorean !== c.korean),
    });
    setCardToDelete(null);
  };

  // ---- EXERCISE MUSIC (Issue #77) ----
  const EX_MUSIC_URL = "/sounds/background/220060__portwain__quiz-game-music-loop-bpm-90.wav";
  useEffect(() => {
    const audio = exMusicRef.current;
    if (!audio) return;
    if (exMusic && view === "exercise" && exOn) {
      audio.volume = 0.25;
      audio.loop = true;
      audio.play().catch(() => {});
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [exMusic, view, exOn]);

  const toggleExMusic = () => {
    const next = !exMusic;
    setExMusic(next);
    try { localStorage.setItem("moa-ex-music", next ? "1" : "0"); } catch {}
  };

  // ---- EXERCISE PROGRESSION ----
  const [progressToast, setProgressToast] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);

  // Goals
  const [goalView, setGoalView] = useState("list"); // "list" | "detail" | "create" | "pick"
  const [goalEditId, setGoalEditId] = useState(null);
  const [goalForm, setGoalForm] = useState({ name: "", deadline: "" });
  const [goalCardPicker, setGoalCardPicker] = useState(false);
  const [goalPickSel, setGoalPickSel] = useState(new Set());
  const [goalDeleteConfirm, setGoalDeleteConfirm] = useState(null);
  const [goalCelebration, setGoalCelebration] = useState(null); // { pct }
  const [goalEditingDeadline, setGoalEditingDeadline] = useState(false);
  const [goalDeadlinePopup, setGoalDeadlinePopup] = useState(null);
  const [goalPickTag, setGoalPickTag] = useState(null); // null = all, string = filter by tag
  const [goalImpStep, setGoalImpStep] = useState(null); // null | "ocr" | "scanning" | "picks"
  const [goalImpFound, setGoalImpFound] = useState([]);
  const [goalImpSel, setGoalImpSel] = useState(new Set());
  const [goalImpProgress, setGoalImpProgress] = useState(null);

  const goals = data.goals || [];
  const activeGoals = goals.filter(g => !g.trophyDate);
  const trophyGoals = goals.filter(g => g.trophyDate);

  const goalProgress = (goal) => {
    const cards = (goal.cardIds || []).map(id => data.cards.find(c => c.id === id)).filter(Boolean);
    const total = cards.length;
    if (!total) return { discovered: 0, acquired: 0, total: 0, pct1: 0, pct2: 0, overall: 0, reviewsDone: 0, reviewsTotal: 0, pctReviews: 0 };
    const discovered = cards.filter(c => migrateStatus(c.status) !== "new").length;
    const acquired = cards.filter(c => c.goalAcquired || migrateStatus(c.status) === "acquired").length;
    const daysTotal = Math.max(1, Math.ceil((new Date(goal.deadline + "T23:59:59") - new Date(goal.createdAt || goal.deadline)) / 86400000));
    const R = getSpacedSchedule(daysTotal).R;
    let reviewsDone = 0;
    cards.forEach(c => { reviewsDone += Math.min(getCardReviewCount(c), R); });
    const reviewsTotal = total * R;
    const pctReviews = Math.round((reviewsDone / reviewsTotal) * 100);
    return { discovered, acquired, total, pct1: Math.round((discovered / total) * 100), pct2: Math.round((acquired / total) * 100), overall: Math.round((acquired / total) * 100), reviewsDone, reviewsTotal, pctReviews };
  };

  const goalDailyTarget = (goal) => {
    const cards = (goal.cardIds || []).map(id => data.cards.find(c => c.id === id)).filter(Boolean);
    const total = cards.length;
    if (!total) return { discover: 0, practice: 0, total: 0 };
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const dl = new Date(goal.deadline + "T23:59:59"); dl.setHours(0, 0, 0, 0);
    const daysLeft = Math.max(1, Math.ceil((dl - now) / 86400000));
    const daysTotal = Math.max(1, Math.ceil((dl - new Date(goal.createdAt || goal.deadline)) / 86400000));
    const schedule = getSpacedSchedule(daysTotal);
    const R = schedule.R;
    const undiscovered = cards.filter(c => { const s = migrateStatus(c.status); return s === "new" || s === "in_progress"; }).length;
    const discoverPerDay = undiscovered > 0 ? Math.ceil(undiscovered / daysLeft) : 0;
    let reviewsNeeded = 0;
    cards.forEach(c => {
      if (c.goalAcquired || migrateStatus(c.status) === "acquired") return;
      const done = getCardReviewCount(c);
      reviewsNeeded += Math.max(0, R - done);
    });
    const practicePerDay = reviewsNeeded > 0 ? Math.ceil(reviewsNeeded / daysLeft) : 0;
    return {
      discover: discoverPerDay,
      practice: practicePerDay,
      total: discoverPerDay + practicePerDay,
      R
    };
  };

  // Freeze today's card set per goal (like the library's data.today)
  useEffect(() => {
    if (!loaded || !data.goals?.length) return;
    const today = dayKey();
    const gt = data.goalToday || {};
    let changed = false;
    const updated = { ...gt };
    for (const goal of data.goals) {
      if (goal.trophyDate) continue;
      const existing = gt[goal.id];
      if (existing && existing.date === today) continue;
      changed = true;
      const goalCards = (goal.cardIds || []).map(id => data.cards.find(c => c.id === id)).filter(Boolean);
      const daily = goalDailyTarget(goal);
      const dLeft = Math.max(1, Math.ceil((new Date(goal.deadline + "T23:59:59") - Date.now()) / 86400000));
      const discoverCards = goalCards.filter(c => { const s = migrateStatus(c.status); return s === "new" || s === "in_progress"; }).slice(0, daily.discover || 3);
      const practiceCards = goalCards.filter(c => {
        const s = migrateStatus(c.status);
        if (s !== "studied") return false;
        if (c.goalAcquired) return false;
        const next = getCardNextReviewDate(c, dLeft);
        return !next || next <= today;
      });
      updated[goal.id] = { date: today, discoverIds: discoverCards.map(c => c.id), practiceIds: practiceCards.map(c => c.id) };
    }
    if (changed) save({ ...data, goalToday: updated });
  }, [loaded, data.goals, data.cards]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loaded || !data.goals?.length || goalDeadlinePopup) return;
    for (const goal of data.goals) {
      if (goal.trophyDate || goal.deadlineDismissed) continue;
      const dLeft = Math.ceil((new Date(goal.deadline + "T23:59:59") - new Date()) / 86400000);
      if (dLeft <= 0) {
        setGoalDeadlinePopup({ goalId: goal.id, step: 1, feedback: null });
        setGoalEditId(goal.id);
        setGoalView("detail");
        break;
      }
    }
  }, [loaded, data.goals]); // eslint-disable-line react-hooks/exhaustive-deps

  const goalDaysLeft = (goal) => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const dl = new Date(goal.deadline + "T23:59:59"); dl.setHours(0, 0, 0, 0);
    return Math.ceil((dl - now) / 86400000);
  };

  const createGoal = (name, deadline, cardIds) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 5);
    const goal = { id, name, deadline, cardIds: [...cardIds], milestones: {}, createdAt: new Date().toISOString(), trophyDate: null };
    const nd = { ...data, goals: [...goals, goal], cards: data.cards.map(c => cardIds.has(c.id) ? { ...c, goalId: id } : c) };
    save(nd);
    setGoalView("list"); setGoalForm({ name: "", deadline: "" }); setGoalPickSel(new Set());
  };

  const deleteGoal = (goalId, deleteCards) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    let cards = data.cards;
    if (deleteCards) {
      cards = cards.filter(c => !goal.cardIds.includes(c.id));
    } else {
      cards = cards.map(c => c.goalId === goalId ? { ...c, goalId: undefined } : c);
    }
    save({ ...data, goals: goals.filter(g => g.id !== goalId), cards });
    setGoalDeleteConfirm(null);
    if (goalEditId === goalId) { setGoalEditId(null); setGoalView("list"); }
  };

  const addCardsToGoal = (goalId, newCardIds) => {
    const nd = {
      ...data,
      goals: goals.map(g => g.id === goalId ? { ...g, cardIds: [...new Set([...g.cardIds, ...newCardIds])] } : g),
      cards: data.cards.map(c => newCardIds.has(c.id) ? { ...c, goalId: goalId } : c),
    };
    save(nd);
    setGoalCardPicker(false); setGoalPickSel(new Set()); setGoalPickTag(null);
  };

  const extendGoalDeadline = (goalId, newDeadline) => {
    save({ ...data, goals: goals.map(g => g.id === goalId ? { ...g, deadline: newDeadline } : g) });
  };

  const archiveGoal = (goalId) => {
    save({
      ...data,
      goals: goals.map(g => g.id === goalId ? { ...g, trophyDate: new Date().toISOString() } : g),
      cards: data.cards.map(c => c.goalId === goalId ? { ...c, goalId: undefined } : c),
    });
    setGoalDeadlinePopup(null);
    setGoalEditId(null);
    setGoalView("list");
  };

  const checkGoalMilestones = (goalId) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal || goal.trophyDate) return;
    const { overall } = goalProgress(goal);
    const ms = goal.milestones || {};
    const thresholds = [25, 50, 75, 100];
    let hit = null;
    for (const pct of thresholds) {
      if (overall >= pct && !ms[pct]) { hit = pct; }
    }
    if (!hit) return;
    const updatedMs = { ...ms };
    for (const pct of thresholds) { if (overall >= pct) updatedMs[pct] = true; }
    let nd = { ...data, goals: data.goals.map(g => g.id !== goalId ? g : { ...g, milestones: updatedMs, ...(hit === 100 ? { trophyDate: new Date().toISOString() } : {}) }) };
    nd = awardPoints(hit === 100 ? 50 : 25, nd);
    save(nd);
    setGoalCelebration({ pct: hit });
    setShowCelebration(true);
  };

  // Check milestones whenever card statuses change
  const goalMsRef = useRef({});
  useEffect(() => {
    if (!loaded) return;
    for (const goal of (data.goals || [])) {
      if (goal.trophyDate) continue;
      const { overall } = goalProgress(goal);
      const prev = goalMsRef.current[goal.id] || 0;
      if (overall > prev) {
        goalMsRef.current[goal.id] = overall;
        const thresholds = [25, 50, 75, 100];
        for (const pct of thresholds) {
          if (overall >= pct && prev < pct && !(goal.milestones || {})[pct]) {
            checkGoalMilestones(goal.id);
            break;
          }
        }
      } else {
        goalMsRef.current[goal.id] = overall;
      }
    }
  }, [data.cards, data.goals]);

  const processGoalImages = async (files) => {
    if (!files.length) return;
    setGoalImpStep("ocr");
    try {
      let combined = "";
      for (let i = 0; i < files.length; i++) {
        const { base64, mimeType } = await fileToScaledBase64(files[i], 1600);
        const text = await extractImageText(base64, mimeType, getTargetLangName(tl, "en"));
        if (text && text.trim()) combined += (combined ? "\n" : "") + text;
      }
      if (!combined.trim()) {
        alert(t.ocrNoTarget(getTargetLangName(tl, lang)));
        setGoalImpStep(null);
        return;
      }
      setGoalImpStep("scanning");
      setGoalImpProgress(null);
      const items = dedupeExtracted(
        await analyzeBulk(combined, data.cards, lang, context, tl, (cur, tot) => setGoalImpProgress({ current: cur, total: tot })),
        data.cards
      );
      setGoalImpProgress(null);
      const merged = [...goalImpFound];
      for (const it of items) { if (!merged.find(m => (m.korean || m.word) === (it.korean || it.word))) merged.push(it); }
      setGoalImpFound(merged);
      setGoalImpSel(new Set(merged.map((_, i) => i)));
      setGoalImpStep("picks");
    } catch (err) {
      console.error("Goal import error:", err);
      alert(err.message);
      setGoalImpStep(null);
    }
  };

  const onGoalImagePick = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    processGoalImages(files);
  };

  useEffect(() => {
    if (view !== "goals" || goalView !== "create") return;
    const handler = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const images = [];
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) images.push(file);
        }
      }
      if (images.length) { e.preventDefault(); processGoalImages(images); }
    };
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [view, goalView, goalImpFound]); // eslint-disable-line react-hooks/exhaustive-deps

  const goalImportConfirm = () => {
    if (!goalImpSel.size) return;
    const items = [...goalImpSel].sort((a, b) => a - b).map(i => goalImpFound[i]).filter(Boolean);
    const deadlineTag = goalForm.deadline || "";
    const newCards = items.filter(v => !data.cards.find(c => c.korean === (v.korean || v.word))).map(v => {
      const isVocab = v.type === "vocab";
      const card = isVocab ? makeVocabCard(v, "new") : makeCard({ korean: v.korean || v.word, type: v.type || "grammar", description_fr: v.meaning_fr || v.description_fr || "", description_en: v.meaning_en || v.description_en || "", description_target: v.description_target || "", example_kr: v.example_kr || "", example_fr: v.example_fr || "", example_en: v.example_en || "", category: v.category || "" }, "new");
      if (deadlineTag) card.tags = [deadlineTag];
      return card;
    });
    if (newCards.length) {
      save({ ...data, cards: [...data.cards, ...newCards] });
      setGoalPickSel(prev => new Set([...prev, ...newCards.map(c => c.id)]));
    }
    setGoalImpStep(null);
    setGoalImpFound([]);
    setGoalImpSel(new Set());
  };

  const completeExercise = (mode, cardIds) => {
    const result = recordExerciseProgress(data, cardIds, mode);
    let nd = awardPoints(15, result.data);
    if (result.autoAcquiredIds.length > 0) {
      setProgressToast(t.progressAutoAcquired);
      setTimeout(() => setProgressToast(null), 4000);
    } else {
      setProgressToast(t.progressNewReview);
      setTimeout(() => setProgressToast(null), 2500);
    }
    save(nd);
    setShowCelebration(true);
  };

  // ---- EXERCISE ----
  const launchEx = async (theme) => {
    const sel = exerciseCards.filter(c => exSel.has(c.id)); if (!sel.length) return;
    // Non-AI exercises render their own component; no generation call.
    if (exMode === "match" || exMode === "cross" || exMode === "flash" || exMode === "imgwrite") { setExConv([]); setExDone(false); setFillData(null); setExOn(true); return; }
    // Fill modes use interactive word-bank UI
    if (exMode === "fill" || exMode === "dialoguefill") {
      setExOn(true); setExLoad(true); setExDone(false); setFillData(null);
      try { const r = await genExercise(sel, exMode, lang, context, tl, theme); setFillData(r); }
      catch (e) { console.error("launchEx fill error:", e); setFillData(null); setExConv([aiError(e, () => launchEx(theme))]); }
      setExLoad(false); setExTheme(null);
      return;
    }
    setExOn(true); setExLoad(true); setExDone(false); setFillData(null);
    try { const r = await genExercise(sel, exMode, lang, context, tl, theme); setExConv([{ role: "ai", content: r.message, options: r.options || null, selected: null }]); }
    catch (e) { console.error("launchEx error:", e); setExConv([aiError(e, () => launchEx(theme))]); }
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
      if (wasLast) { setExDone(true); completeExercise(exMode, sel.map(c => c.id)); }
    }
    catch (e) { console.error("exOpt error:", e); setExConv([...u, aiError(e)]); }
    setExLoad(false);
  };

  const exSend = async () => {
    if (!exInp.trim()) return; const m = exInp.trim(); setExInp(""); setExLoad(true);
    const u = [...exConv, { role: "user", content: m }]; setExConv(u);
    try {
      const sel = exerciseCards.filter(c => exSel.has(c.id));
      const isFill = exMode === "fill" || exMode === "dialoguefill";
      const wasLast = isFill ? u.filter(msg => msg.role === "user").length >= 1 : u.filter(msg => msg.role === "ai").length >= 3;
      const r = await continueExercise(sel, exMode, lang, u, null, tl);
      setExConv([...u, { role: "ai", content: r.message, options: r.options || null, selected: null }]);
      if (wasLast) { setExDone(true); completeExercise(exMode, sel.map(c => c.id)); }
    } catch (e) { console.error("exSend error:", e); setExConv([...u, aiError(e)]); }
    setExLoad(false);
  };

  const changeLang = (nl) => {
    const pickDesc = (c) => nl === "fr" ? (c.description_fr || c.description) : (c.description_en || c.description);
    const pickEx = (c) => nl === "fr" ? (c.example_fr || c.example_tr) : (c.example_en || c.example_tr);
    save({ ...data, lang: nl, cards: data.cards.map(c => ({ ...c, description: pickDesc(c), example_tr: pickEx(c) })) });
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
    { k: "image", l: t.anImage, i: "📷" }, { k: "youglish", l: t.youglishBtn, i: "🎬" },
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
      <div style={{ fontFamily: "'Plus Jakarta Sans'", display: "flex", flexDirection: "column", height: "100%", background: "var(--entry-bg)", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", alignItems: "center", gap: 20, background: "var(--entry-panel-bg)", boxShadow: "var(--entry-panel-shadow)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", borderRadius: 20, padding: "26px 22px" }}>
          <span style={{ fontSize: 40, fontWeight: 700, color: C.txt, letterSpacing: -1, textShadow: "var(--wall-text-shadow)" }}>
            모<span style={{ color: C.acc }}>아</span>
          </span>
          <div style={{ fontSize: 16, fontWeight: 500, color: C.txt, textAlign: "center", textShadow: "var(--wall-text-shadow)" }}>
            {welcomeMode === "login" ? t.welcomeLoginTitle : welcomeMode === "create" ? t.welcomeCreateTitle : t.welcomeTitle}
          </div>
          <div style={{ fontSize: 13, color: C.txtS, textAlign: "center", lineHeight: 1.7, textShadow: "var(--wall-text-shadow)" }}>
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
      <div style={{ fontFamily: "'Plus Jakarta Sans'", display: "flex", flexDirection: "column", height: "100%", background: "var(--entry-bg)", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", alignItems: "center", gap: 20, background: "var(--entry-panel-bg)", boxShadow: "var(--entry-panel-shadow)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", borderRadius: 20, padding: "26px 22px" }}>
          <span style={{ fontSize: 40, fontWeight: 700, color: C.txt, letterSpacing: -1, textShadow: "var(--wall-text-shadow)" }}>
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

  // Per-language profile editor: shown when adding a new language
  if (langProfileEdit && langProfileDraft) {
    const lpCode = langProfileEdit;
    const lpConf = TARGET_LANGS[lpCode] || {};
    const lpPh = lpConf.placeholders?.[lang] || lpConf.placeholders?.en || {};
    const box = { width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontFamily: "'Plus Jakarta Sans'", fontSize: 13, color: C.txt, background: C.s1, outline: "none", lineHeight: 1.6, resize: "vertical" };
    const saveLangProfile = () => {
      const lps = { ...(data.langProfiles || {}), [lpCode]: { ...langProfileDraft } };
      save({ ...data, langProfiles: lps });
      setLangProfileEdit(null);
      setLangProfileDraft(null);
    };
    const skipLangProfile = () => {
      setLangProfileEdit(null);
      setLangProfileDraft(null);
    };
    return (
      <div style={{ fontFamily: "'Plus Jakarta Sans'", display: "flex", flexDirection: "column", height: "100%", background: "var(--entry-bg)", alignItems: "center", justifyContent: "center", padding: 24, overflowY: "auto" }}>
        <div style={{ width: "100%", maxWidth: 460, display: "flex", flexDirection: "column", gap: 16, background: "var(--entry-panel-bg)", boxShadow: "var(--entry-panel-shadow)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", borderRadius: 20, padding: "22px 20px" }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: C.txt }}>{t.langProfileTitle(lpConf.flag || "", lpConf.name?.[lang] || lpCode)}</div>
          <div style={{ fontSize: 12.5, color: C.txtS, lineHeight: 1.6 }}>{t.langProfileSub}</div>
          {(data.profile?.dream || data.profile?.level || data.profile?.goals) && (
            <div style={{ fontSize: 11.5, color: C.acc, fontStyle: "italic" }}>{t.langProfilePrefill}</div>
          )}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: C.txt, display: "block", marginBottom: 5 }}>{"✨ " + t.langDreamLabel}</label>
            <textarea value={langProfileDraft.dream || ""} onChange={e => setLangProfileDraft({ ...langProfileDraft, dream: e.target.value })} placeholder={lpPh.dream || t.dreamPlaceholder} rows={3} style={box} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: C.txt, display: "block", marginBottom: 5 }}>{t.langLevelLabel}</label>
            <input value={langProfileDraft.level || ""} onChange={e => setLangProfileDraft({ ...langProfileDraft, level: e.target.value })} placeholder={lpPh.level || t.levelPlaceholder} style={box} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: C.txt, display: "block", marginBottom: 5 }}>{t.langGoalsLabel}</label>
            <textarea value={langProfileDraft.goals || ""} onChange={e => setLangProfileDraft({ ...langProfileDraft, goals: e.target.value })} placeholder={lpPh.goals || t.goalsPlaceholder} rows={2} style={box} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: C.txt, display: "block", marginBottom: 5 }}>{t.langToolsLabel}</label>
            <textarea value={langProfileDraft.otherTools || ""} onChange={e => setLangProfileDraft({ ...langProfileDraft, otherTools: e.target.value })} placeholder={t.otherToolsPh} rows={2} style={box} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: C.txt, display: "block", marginBottom: 5 }}>{t.langDailyLabel}</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="number" min="1" max="20" value={langProfileDraft.dailyCount ?? 5}
                onChange={e => setLangProfileDraft({ ...langProfileDraft, dailyCount: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
                style={{ ...box, width: 90 }} />
              <span style={{ fontSize: 12, color: C.txtM }}>{t.today.toLowerCase()}</span>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: C.txt, display: "block", marginBottom: 5 }}>{t.langNotesLabel}</label>
            <textarea value={langProfileDraft.learnerNotes || ""} onChange={e => setLangProfileDraft({ ...langProfileDraft, learnerNotes: e.target.value })} rows={2} style={box} />
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
            <button onClick={saveLangProfile}
              style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: C.acc, color: C.onAcc, fontFamily: "'Plus Jakarta Sans'", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
              {t.langProfileSave}
            </button>
            <button onClick={skipLangProfile}
              style={{ padding: "12px 16px", borderRadius: 10, border: "none", background: "none", color: C.txtM, fontFamily: "'Plus Jakarta Sans'", fontSize: 13, cursor: "pointer" }}>
              {t.langProfileSkip}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Onboarding: 2 short screens for new learners
  if (!data.profile?.onboarded) {
    const box = { width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontFamily: "'Plus Jakarta Sans'", fontSize: 13, color: C.txt, background: C.s1, outline: "none", lineHeight: 1.6, resize: "vertical" };
    return (
      <div style={{ fontFamily: "'Plus Jakarta Sans'", display: "flex", flexDirection: "column", height: "100%", background: "var(--entry-bg)", alignItems: "center", justifyContent: "center", padding: 24, overflowY: "auto" }}>
        <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 16, background: "var(--entry-panel-bg)", boxShadow: "var(--entry-panel-shadow)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", borderRadius: 20, padding: "22px 20px" }}>
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
                <LanguagesTable value={onbDraft.languages} onChange={rows => setOnbDraft({ ...onbDraft, languages: rows })} t={t} />
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
    <div style={{ fontFamily: "'Plus Jakarta Sans'", display: "flex", flexDirection: "column", height: "100%", minHeight: 0, background: "var(--screen-bg)", overflow: "hidden" }}>
      <style>{`@keyframes p{0%,100%{opacity:1}50%{opacity:.3}}.pulse{animation:p 1.5s infinite}@keyframes pop{0%{transform:translateY(10px) scale(.9);opacity:0}20%{transform:translateY(0) scale(1);opacity:1}80%{opacity:1}100%{opacity:0}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>

      {/* POINTS TOAST */}
      {pointsToast && (
        <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", zIndex: 1000, background: C.acc, color: C.onAcc, padding: "10px 20px", borderRadius: 20, fontSize: 14, fontWeight: 600, boxShadow: "0 4px 16px rgba(123,127,245,0.35)", animation: "pop 2.5s ease-out forwards", pointerEvents: "none" }}>
          ⭐ {typeof pointsToast === "object" ? pointsToast.label : t.pointsEarned(pointsToast)}
        </div>
      )}

      {progressToast && (
        <div style={{ position: "fixed", bottom: 130, left: "50%", transform: "translateX(-50%)", zIndex: 1001, background: "#34C759", color: "#fff", padding: "10px 20px", borderRadius: 20, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 16px rgba(52,199,89,0.35)", animation: "pop 3.5s ease-out forwards", pointerEvents: "none" }}>
          🎉 {progressToast}
        </div>
      )}

      <audio ref={exMusicRef} src={EX_MUSIC_URL} preload="none" />
      {showCelebration && <CelebrationOverlay visible onClose={() => { setShowCelebration(false); setGoalCelebration(null); }} lang={lang} />}
      {goalCelebration && !showCelebration && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 1500, padding: "12px 20px", borderRadius: 12, background: C.ok, color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "'Plus Jakarta Sans'", boxShadow: "0 4px 16px rgba(0,0,0,0.2)", animation: "fadeIn 0.3s" }}
          onClick={() => setGoalCelebration(null)}>
          🎯 {t.goalMilestone(goalCelebration.pct)}
        </div>
      )}

      {selAdd && (winW < 700 ? (
        <div data-sel-add style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 3000, padding: "10px 16px", background: C.acc, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, boxShadow: "0 -4px 16px rgba(0,0,0,0.2)", animation: "fadeIn 0.15s ease-out" }}>
          <span style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 14, fontWeight: 600, color: C.onAcc, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selAdd.text}</span>
          <button data-sel-add onMouseDown={e => e.preventDefault()} onClick={() => addWordToVocab(selAdd.text)}
            style={{ flexShrink: 0, padding: "7px 16px", borderRadius: 18, border: `2px solid ${C.onAcc}`, background: "transparent", color: C.onAcc, fontFamily: "'Plus Jakarta Sans'", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
            + {t.addToVocab}
          </button>
        </div>
      ) : (
        <button data-sel-add onMouseDown={e => e.preventDefault()} onClick={() => addWordToVocab(selAdd.text)}
          style={{ position: "fixed", left: selAdd.x, top: Math.max(8, selAdd.y - 8), transform: "translate(-50%, -100%)", zIndex: 3000, display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 18, border: "none", background: C.acc, color: C.onAcc, fontFamily: "'Plus Jakarta Sans'", fontSize: 12, fontWeight: 500, cursor: "pointer", boxShadow: "0 4px 14px rgba(0,0,0,0.22)", whiteSpace: "nowrap" }}>
          ➕ {t.addToVocab}
        </button>
      ))}

      {flash && (
        <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", zIndex: 1000, background: C.txt, color: C.s1, padding: "9px 18px", borderRadius: 20, fontSize: 13, fontWeight: 500, boxShadow: "0 4px 16px rgba(0,0,0,0.25)", pointerEvents: "none" }}>
          {flash}
        </div>
      )}

      {/* LEAVE-LESSON GUARD */}
      {cardToDelete && (
        <div onClick={() => setCardToDelete(null)}
          style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, width: "100%", maxWidth: 340, boxShadow: "0 12px 40px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.txt }}>{t.deleteConfirmTitle}</div>
            <div style={{ fontSize: 12.5, color: C.txtS, lineHeight: 1.5, marginBottom: 6 }}>{t.deleteConfirmMsg(cardToDelete.korean)}</div>
            <button onClick={() => deleteCard(cardToDelete)}
              style={{ padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.warnB}`, background: C.warnBg, color: C.warn, fontFamily: "'Plus Jakarta Sans'", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              🗑 {t.deleteBtn}
            </button>
            <button onClick={() => setCardToDelete(null)}
              style={{ padding: "9px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.s1, color: C.txtS, fontFamily: "'Plus Jakarta Sans'", fontSize: 12.5, fontWeight: 500, cursor: "pointer" }}>
              {t.cancelBtn}
            </button>
          </div>
        </div>
      )}

      {/* VOCAB STUDY CHOICE: full lesson vs direct translation */}
      {studyChoice && (
        <div onClick={() => setStudyChoice(null)}
          style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, width: "100%", maxWidth: 380, boxShadow: "0 12px 40px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 20, color: C.txt, textAlign: "center" }}>{studyChoice.korean}</div>
            <div style={{ fontSize: 12.5, color: C.txtS, textAlign: "center", marginBottom: 4 }}>{t.studyChooseTitle}</div>
            <button onClick={() => startLessonFromCard(studyChoice)}
              style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 14px", borderRadius: 10, border: `1px solid ${C.acc}`, background: C.accBg, cursor: "pointer", textAlign: "left", fontFamily: "'Plus Jakarta Sans'" }}>
              <span style={{ fontSize: 20 }}>📖</span>
              <span><div style={{ fontSize: 13, fontWeight: 600, color: C.txt }}>{t.studyLesson}</div><div style={{ fontSize: 11.5, color: C.txtS, marginTop: 1 }}>{t.studyLessonDesc}</div></span>
            </button>
            <button onClick={() => directTranslate(studyChoice)}
              style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.s1, cursor: "pointer", textAlign: "left", fontFamily: "'Plus Jakarta Sans'" }}>
              <span style={{ fontSize: 20 }}>⚡</span>
              <span><div style={{ fontSize: 13, fontWeight: 600, color: C.txt }}>{t.studyDirect}</div><div style={{ fontSize: 11.5, color: C.txtS, marginTop: 1 }}>{t.studyDirectDesc}</div></span>
            </button>
          </div>
        </div>
      )}

      {directLoad && (
        <div style={{ position: "fixed", inset: 0, zIndex: 2100, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="pulse" style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 22px", fontSize: 13, color: C.txtS }}>{t.directLoading}</div>
        </div>
      )}

      {/* REPLACE-IMAGE PROMPT (card already has 2 images) */}
      {imgReplace && (() => {
        const card = data.cards.find(c => c.korean === imgReplace.korean);
        const cur = (card && card.images) || [];
        return (
          <div onClick={() => setImgReplace(null)}
            style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, width: "100%", maxWidth: 360, boxShadow: "0 12px 40px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.txt }}>{t.imgReplaceTitle}</div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                {cur.map((im, i) => (
                  <button key={i} onClick={() => { const next = cur.slice(); next[i] = imgReplace.image; setCardImages(imgReplace.korean, next); setImgReplace(null); setFlash(t.imgAdded); setTimeout(() => setFlash(null), 1800); }}
                    style={{ position: "relative", padding: 0, border: `2px solid ${C.border}`, borderRadius: 10, background: "none", cursor: "pointer", lineHeight: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = C.acc; }} onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
                    <img src={im.thumb || im.url} alt="" style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 8 }} />
                    {i === 0 && <span style={{ position: "absolute", left: 5, top: 5, fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 6, background: C.acc, color: C.onAcc }}>★</span>}
                  </button>
                ))}
              </div>
              <button onClick={() => setImgReplace(null)}
                style={{ padding: "9px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.s1, color: C.txtS, fontFamily: "'Plus Jakarta Sans'", fontSize: 12.5, fontWeight: 500, cursor: "pointer" }}>
                {t.imgReplaceCancel}
              </button>
            </div>
          </div>
        );
      })()}

      {/* STUDIED <-> ACQUIRED CONFIRMATION */}
      {confirmToggle && (() => { const toAcq = migrateStatus(confirmToggle.status) !== "acquired"; return (
        <div onClick={() => setConfirmToggle(null)}
          style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, width: "100%", maxWidth: 340, boxShadow: "0 12px 40px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.txt }}>{toAcq ? t.toAcqTitle : t.toStudiedTitle}</div>
            <div style={{ fontSize: 12.5, color: C.txtS, lineHeight: 1.5, marginBottom: 6 }}>{(toAcq ? t.toAcqMsg : t.toStudiedMsg)(confirmToggle.korean)}</div>
            <button onClick={() => { toggleSt(confirmToggle.id); setConfirmToggle(null); }}
              style={{ padding: "10px 14px", borderRadius: 8, border: "none", background: C.acc, color: C.onAcc, fontFamily: "'Plus Jakarta Sans'", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {toAcq ? "✅" : "↩"} {t.confirmBtn}
            </button>
            <button onClick={() => setConfirmToggle(null)}
              style={{ padding: "9px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.s1, color: C.txtS, fontFamily: "'Plus Jakarta Sans'", fontSize: 12.5, fontWeight: 500, cursor: "pointer" }}>
              {t.cancelBtn}
            </button>
          </div>
        </div>
      ); })()}

      {/* RESUME-LESSON PROMPT */}
      {resumePrompt && (
        <div onClick={() => setResumePrompt(null)}
          style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, width: "100%", maxWidth: 340, boxShadow: "0 12px 40px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.txt }}>{t.resumeTitle}</div>
            <div style={{ fontSize: 12.5, color: C.txtS, lineHeight: 1.5, marginBottom: 6 }}>{t.resumeBody}</div>
            <button onClick={() => {
                const { sess } = resumePrompt; setResumePrompt(null);
                setShowRecap(false); setRecapCard(null);
                setLCard(sess.card); setLArticle(sess.article || "");
                setConv(sess.conv);
                setLessonDone(false); setLessonSummary(null);
                setView("lesson");
              }}
              style={{ padding: "10px 14px", borderRadius: 8, border: "none", background: C.acc, color: C.onAcc, fontFamily: "'Plus Jakarta Sans'", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              ▶ {t.resumeBtn}
            </button>
            <button onClick={() => { const c = resumePrompt.card; setResumePrompt(null); try { localStorage.removeItem("moa-active-lesson"); } catch (e) {} openCardFresh(c); }}
              style={{ padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.s1, color: C.txtS, fontFamily: "'Plus Jakarta Sans'", fontSize: 12.5, fontWeight: 500, cursor: "pointer" }}>
              🔄 {t.restartBtn}
            </button>
          </div>
        </div>
      )}

      {/* FEED POST VIEWER (in-app native thread for Bluesky / Mastodon) */}
      {feedThread && (
        <div onClick={() => setFeedThread(null)}
          style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: C.s1, border: `1px solid ${C.border}`, borderRadius: 14, width: "100%", maxWidth: 560, height: "85vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: `1px solid ${C.border}`, background: C.s2, flexShrink: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.txt, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {(feedThread.source || "") + " · " + t.feedThreadTitle}
              </span>
              {feedThread.link && (
                <a href={feedThread.link} target="_blank" rel="noopener noreferrer" title="↗"
                  style={{ fontSize: 12, color: C.acc, textDecoration: "none", padding: "4px 9px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.s1 }}>↗</a>
              )}
              <button onClick={() => setFeedThread(null)}
                style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border}`, background: C.s1, color: C.txtS, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {feedThread.loading && <div className="pulse" style={{ textAlign: "center", color: C.txtM, fontSize: 13, padding: 24 }}>{t.feedLoading}</div>}
              {!feedThread.loading && (feedThread.error || feedThread.posts.length === 0) && (
                <div style={{ textAlign: "center", color: C.txtM, fontSize: 13, padding: 24, lineHeight: 1.6 }}>{t.feedThreadEmpty}</div>
              )}
              {!feedThread.loading && feedThread.posts.map((p, i) => {
                const isRoot = p.role === "root";
                // A run of same-author posts (a split message) shares a left rail.
                const rail = p.same ? C.acc : "transparent";
                return (
                  <div key={i} style={{ borderLeft: `3px solid ${rail}`, paddingLeft: 9, marginLeft: p.role === "reply" ? 10 : 0 }}>
                    <div style={{ background: isRoot ? C.accBg : C.s2, border: `1px solid ${isRoot ? C.acc : C.border}`, borderRadius: 10, padding: "9px 11px" }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 5, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: C.txt }}>{p.author}</span>
                        {p.handle && <span style={{ fontSize: 10, color: C.txtM }}>@{p.handle}</span>}
                        {p.date && <span style={{ fontSize: 10, color: C.txtM, marginLeft: "auto" }}>{p.date}</span>}
                      </div>
                      <div style={{ fontFamily: tFont, fontSize: 14, color: C.txt, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{p.text}</div>
                      {p.images && p.images.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                          {p.images.map((im, k) => (
                            <img key={k} src={im.url} alt={im.alt || ""} loading="lazy"
                              style={{ maxWidth: "100%", maxHeight: 300, borderRadius: 8, border: `1px solid ${C.border}`, objectFit: "contain" }} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Youglish modal */}
      {youglishWord && (
        <div onClick={() => setYouglishWord(null)}
          style={{ position: "fixed", inset: 0, zIndex: 2500, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: C.s1, border: `1px solid ${C.border}`, borderRadius: 14, width: "100%", maxWidth: 560, height: "80vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.txt, flex: 1 }}>🎬 {youglishWord}</span>
              <button onClick={() => setYouglishWord(null)}
                style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border}`, background: C.s1, color: C.txtS, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>x</button>
            </div>
            <YouglishPanel word={youglishWord} lang={tl} />
          </div>
        </div>
      )}

      {/* NAV */}
      <header style={{ display: "flex", alignItems: "stretch", padding: "0 12px", height: 46, background: "var(--panel-bg)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <span style={{ fontSize: 18, fontWeight: 600, color: C.txt, letterSpacing: -0.5, marginRight: 8, display: "flex", alignItems: "center", flexShrink: 0 }}>
          모<span style={{ color: C.acc }}>아</span>
        </span>
        {/* Target language selector (moves into the hamburger menu on mobile) */}
        <div className="nav-hide-mobile" style={{ display: "flex", alignItems: "center", marginRight: 8, flexShrink: 0 }}>
          <button onClick={e => { e.stopPropagation(); setTlOpen(!tlOpen); setLangOpen(false); }}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.s1, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", fontSize: 12, color: C.txt }}>
            {tlConf?.flag} <span style={{ fontSize: 9, color: C.txtM }}>▾</span>
          </button>
        </div>
        {/* Scrollable tabs (desktop) — replaced by a hamburger menu on mobile */}
        <div className="nav-tabs" style={{ display: "flex", alignItems: "stretch", flex: 1, overflowX: "auto", minWidth: 0 }}>
        <button style={tabS(view === "goals")} onClick={() => navTo("goals")}>🎯 {t.goalsTab}</button>
        <button style={tabS(view === "library")} onClick={() => navTo("library")}>{t.library}</button>
        <button style={tabS(view === "lesson")} onClick={() => navTo("lesson")}>{t.lesson}</button>
        <button style={tabS(view === "import")} onClick={() => navTo("import")}>{t.import}</button>
        <button style={tabS(view === "exercise")} onClick={() => navTo("exercise")}>{t.exercise}</button>
        <button style={tabS(view === "profile")} onClick={() => navTo("profile")}>{t.profile}</button>
        </div>{/* end scrollable tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: "auto" }}>
          {/* Hamburger (mobile only) */}
          <button className="nav-burger" onClick={e => { e.stopPropagation(); setNavMenuOpen(!navMenuOpen); setLangOpen(false); setTlOpen(false); }}
            aria-label="Menu"
            style={{ alignItems: "center", justifyContent: "center", width: 30, height: 28, borderRadius: 7, border: `1px solid ${C.border}`, background: navMenuOpen ? C.accBg : C.s1, color: navMenuOpen ? C.acc : C.txtS, cursor: "pointer", fontSize: 15, flexShrink: 0, padding: 0 }}>
            ☰
          </button>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.acc, background: C.accBg, padding: "3px 8px", borderRadius: 10, whiteSpace: "nowrap" }}>
            ⭐ {data.profile?.points || 0}
          </span>
          {/* Sync / account */}
          <button onClick={() => setShowSync(!showSync)}
            title={syncId}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 13, border: `1px solid ${C.border}`, background: C.s1, color: C.txtS, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", fontSize: 13, flexShrink: 0, padding: 0 }}>
            👤
          </button>
          {/* Lang picker hidden for now (issue #90) */}
        </div>
      </header>

      {/* MOBILE NAV MENU (hamburger) */}
      {navMenuOpen && (
        <div className="nav-menu" style={{ flexDirection: "column", background: "var(--panel-bg)", borderBottom: `1px solid ${C.border}`, flexShrink: 0, boxShadow: "0 6px 16px rgba(0,0,0,0.12)" }}>
          {[["goals", "🎯 " + t.goalsTab], ["library", t.library], ["lesson", t.lesson], ["import", t.import], ["exercise", t.exercise], ["profile", t.profile]].map(([v, label]) => (
            <button key={v} onClick={() => { navTo(v); setNavMenuOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "13px 18px", border: "none", borderBottom: `1px solid ${C.border}`, background: view === v ? C.accBg : "transparent", color: view === v ? C.acc : C.txt, fontWeight: view === v ? 600 : 400, fontSize: 14.5, fontFamily: "'Plus Jakarta Sans'", cursor: "pointer", textAlign: "left" }}>
              {label}
            </button>
          ))}
          {/* Language to study */}
          <div style={{ padding: "12px 18px 4px", fontSize: 11, fontWeight: 600, color: C.txtM }}>{lang === "fr" ? "Langue à étudier" : lang === "ko" ? "학습 언어" : "Language to study"}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "0 18px 12px" }}>
            {enabledTLs.map(code => (
              <button key={code} onClick={() => { switchTargetLang(code); setNavMenuOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer", border: tl === code ? `2px solid ${C.acc}` : `1px solid ${C.border}`, background: tl === code ? C.accBg : C.s1, color: tl === code ? C.acc : C.txt, fontWeight: tl === code ? 600 : 400, fontFamily: "'Plus Jakarta Sans'" }}>
                {TARGET_LANGS[code]?.flag} {getTargetLangName(code, lang)}
              </button>
            ))}
            {Object.keys(TARGET_LANGS).filter(code => !enabledTLs.includes(code)).map(code => (
              <button key={code} onClick={() => { addTargetLang(code); setNavMenuOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer", border: `1px dashed ${C.borderS}`, background: "none", color: C.txtM, fontFamily: "'Plus Jakarta Sans'" }}>
                + {TARGET_LANGS[code]?.flag} {getTargetLangName(code, lang)}
              </button>
            ))}
          </div>
          {/* Interface language hidden for now (issue #90) */}
        </div>
      )}

      {/* SYNC BAR */}
      {showSync && (
        <div style={{ padding: "10px 16px", background: C.s1, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: C.ok, fontWeight: 500 }}>🔗 {t.syncConnected}</span>
          <span style={{ fontSize: 12, color: C.txt, fontFamily: "monospace", background: C.okBg, padding: "2px 8px", borderRadius: 4 }}>{syncId}</span>
          <button onClick={handleDisconnect}
            style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.s2, fontSize: 11, fontFamily: "'Plus Jakarta Sans'", color: C.txtS, cursor: "pointer" }}>
            {t.disconnect}
          </button>
          <a href="mailto:sylingual@gmail.com" title={t.contactSub}
            style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.s2, fontSize: 11, fontFamily: "'Plus Jakarta Sans'", color: C.acc, cursor: "pointer", textDecoration: "none" }}>
            ✉️ {t.contact}
          </a>
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
      <div style={{ flex: 1, overflow: "hidden", display: "flex" }} onClick={() => { setLangOpen(false); setTlOpen(false); setNavMenuOpen(false); }}>

        {/* LIBRARY */}
        {view === "library" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>
            <div className="wall-band wall-band-top" />
            <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: C.txtM }}>{filteredCards.length} {t.points} · {studiedCount} {t.statusStudied.toLowerCase()} · {acqCount} {t.statusAcquired.toLowerCase()}</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {/* Type filter */}
                <div style={{ display: "flex", gap: 2, background: C.s1, borderRadius: 6, padding: 2, border: `1px solid ${C.border}` }}>
                  {[["all", t.filterAll], ["grammar", t.filterGrammar], ["vocab", t.filterVocab]].map(([k, label]) => (
                    <button key={k} onClick={() => setLibFilter(k)}
                      style={{ padding: "3px 10px", borderRadius: 4, border: "none", fontSize: 11, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", background: libFilter === k ? C.s2 : "transparent", color: libFilter === k ? C.acc : C.txtM, fontWeight: libFilter === k ? 500 : 400, boxShadow: libFilter === k ? "0 1px 3px rgba(0,0,0,0.06)" : "none" }}>
                      {label}
                    </button>
                  ))}
                </div>
                {/* Tag filter */}
                {allTags.length > 0 && (
                  <select value={libTagFilter || ""} onChange={e => setLibTagFilter(e.target.value || null)}
                    style={{ padding: "3px 8px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 11, fontFamily: "'Plus Jakarta Sans'", color: libTagFilter ? C.acc : C.txtM, background: C.s1, cursor: "pointer", outline: "none", appearance: "auto" }}>
                    <option value="">{t.allTags}</option>
                    <option value="__none__">{t.noTags}</option>
                    {allTags.map(tag => <option key={tag} value={tag}>#{tag}</option>)}
                  </select>
                )}
                {/* View toggle */}
                {filteredCards.length > 0 && (
                  <div style={{ display: "flex", gap: 2, background: C.s1, borderRadius: 6, padding: 2, border: `1px solid ${C.border}` }}>
                    {[["grid", "▦", t.viewGrid], ["tree", "🌿", t.viewTree], ["sources", "📄", t.viewSources]].map(([k, icon, label]) => (
                      <button key={k} onClick={() => setLibView(k)}
                        style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 4, border: "none", fontSize: 11, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", background: libView === k ? C.s2 : "transparent", color: libView === k ? C.acc : C.txtM, fontWeight: libView === k ? 500 : 400, boxShadow: libView === k ? "0 1px 3px rgba(0,0,0,0.06)" : "none" }}>
                        {icon} {label}
                      </button>
                    ))}
                  </div>
                )}
                {filteredCards.length > 0 && (
                  <button onClick={() => { setBulkTagMode(!bulkTagMode); setBulkTagSel(new Set()); setBulkTagPicker(false); }}
                    style={{ padding: "3px 10px", borderRadius: 6, border: `1px solid ${bulkTagMode ? C.acc : C.border}`, background: bulkTagMode ? C.accBg : C.s1, color: bulkTagMode ? C.acc : C.txtM, fontSize: 11, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", fontWeight: bulkTagMode ? 500 : 400 }}>
                    🏷 {bulkTagMode ? t.bulkTagDone : t.bulkTagBtn}
                  </button>
                )}
              </div>
            </div>
            {filteredCards.length === 0
              ? <div style={{ padding: 40, textAlign: "center", color: C.txtM, fontSize: 13, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                  <div>{t.noCards}</div>
                  <button onClick={() => navTo("import")}
                    style={{ padding: "10px 22px", borderRadius: 10, background: C.acc, color: C.onAcc, border: "none", fontFamily: "'Plus Jakarta Sans'", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                    📝 {t.import}
                  </button>
                </div>
              : libView === "sources"
                ? <SourcesView cards={filteredCards} summaries={data.summaries} textStudies={(data.textStudies || []).filter(s => (s.targetLang || "ko") === tl)} t={t} lang={lang} tFont={tFont} onReview={(c) => reviewCard(c)} onRestudy={reStudyFromText} onResumeComprehension={(s) => { setCompSession({ text: s.text, existing: s }); setView("comprehension"); }} />
                : libView === "grid"
                  ? (() => {
                      const groups = { new: [], in_progress: [], studied: [], acquired: [] };
                      filteredCards.forEach(c => { const s = migrateStatus(c.status); (groups[s] || groups.new).push(c); });
                      // "En cours" is folded into "à découvrir": lessons don't persist the
                      // conversation, so a started card is just one still waiting to be studied.
                      groups.new = [...groups.in_progress, ...groups.new];
                      groups.in_progress = [];
                      // Fixed daily set (frozen for the day); shows each card's CURRENT status.
                      const todayRaw = (data.today?.ids || []).map(id => data.cards.find(c => c.id === id)).filter(Boolean);
                      const today = [...todayRaw].sort((a, b) => {
                        const sa = migrateStatus(a.status), sb = migrateStatus(b.status);
                        const order = { new: 0, in_progress: 1, studied: 2, acquired: 3 };
                        return (order[sa] ?? 9) - (order[sb] ?? 9);
                      });
                      const shelf = (status, bg, color, cardBg, { masked, compact, expandable, subgroups } = {}) => {
                        const cs = groups[status];
                        if (!cs.length) return null;
                        const ex = expandable && expandedId ? cs.find(c => c.id === expandedId) : null;
                        const renderSpines = (cards) => cards.map(c => bulkTagMode ? (
                          <div key={c.id} onClick={() => { const s = new Set(bulkTagSel); if (s.has(c.id)) s.delete(c.id); else s.add(c.id); setBulkTagSel(s); }}
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                            <span style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, border: `1px solid ${bulkTagSel.has(c.id) ? C.acc : C.borderS}`, background: bulkTagSel.has(c.id) ? C.acc : "transparent", color: C.onAcc }}>{bulkTagSel.has(c.id) ? "✓" : ""}</span>
                            <BookSpine card={c} t={t} color={color} cardBg={cardBg} masked={false} compact={compact} active={false} onClick={() => {}} />
                          </div>
                        ) : <BookSpine key={c.id} card={c} t={t} color={color} cardBg={cardBg} masked={masked} compact={compact} active={expandable && expandedId === c.id}
                          onClick={() => { if (expandable) setExpandedId(expandedId === c.id ? null : c.id); else reviewCard(c); }}
                          onToggleStatus={compact ? () => setConfirmToggle(c) : undefined}
                          onDelete={(masked || compact) ? () => setCardToDelete(c) : undefined} />);
                        const hasSubs = subgroups && subgroups.length === 2 && subgroups[0].cards.length > 0 && subgroups[1].cards.length > 0;
                        return (
                          <div style={{ background: bg, borderRadius: 14, padding: "11px 13px" }}>
                            <div style={{ fontSize: 12, color, marginBottom: 10, display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 500 }}>{statusInfo(status, t).label}</span>
                              <span style={{ opacity: 0.7 }}>· {cs.length}</span>
                              {masked && <span style={{ color: C.txtM }}>— {t.shelfMaskedHint}</span>}
                              {expandable && <span style={{ color: C.txtM }}>— {t.shelfExpandHint}</span>}
                            </div>
                            {hasSubs ? subgroups.map((sg, si) => (
                              <div key={si} style={{ marginBottom: si < subgroups.length - 1 ? 10 : 0 }}>
                                <div style={{ fontSize: 10.5, fontWeight: 500, color: C.txtM, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                                  {sg.label} <span style={{ opacity: 0.6 }}>· {sg.cards.length}</span>
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>{renderSpines(sg.cards)}</div>
                              </div>
                            )) : (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
                              {renderSpines(cs)}
                            </div>
                            )}
                            {ex && (
                              <div style={{ marginTop: 10, background: C.s2, border: `1px solid ${color}`, borderRadius: 10, padding: "12px 13px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                                  <span style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 15, color: C.txt }}>{ex.korean}</span>
                                  {ex.gender && GENDERED_LANGS.has(ex.targetLang || tl) && (
                                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: ex.gender === "m" ? "#EFF6FF" : "#FDF2F8", color: ex.gender === "m" ? "#1D4ED8" : "#BE185D", border: `1px solid ${ex.gender === "m" ? "#BFDBFE" : "#FBCFE8"}` }}>
                                      {ex.gender === "m" ? "masc." : ex.gender === "f" ? "fém." : "n."}
                                    </span>
                                  )}
                                  {tl === "ko" && ex.type === "vocab" && ex.formality && t.formality[ex.formality] && (
                                    <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 10, background: ex.formality === "formal" ? C.stStudiedCard : ex.formality === "casual" ? C.stAcqCard : C.s1, color: ex.formality === "formal" ? C.stStudied : ex.formality === "casual" ? C.stAcq : C.txtM, border: `1px solid ${ex.formality === "formal" ? C.stStudiedB : ex.formality === "casual" ? C.stAcqB : C.border}` }}>
                                      {t.formalityLabel} · {t.formality[ex.formality]}
                                    </span>
                                  )}
                                </div>
                                {showTargetDef[ex.id] && ex.description_target ? (
                                  <div style={{ fontSize: 12.5, color: C.txtM, fontStyle: "italic", fontFamily: tFont, lineHeight: 1.55, marginBottom: ex.example_kr ? 8 : 10, padding: "5px 9px", background: C.s1, borderRadius: 6, border: `1px solid ${C.border}` }}>
                                    {ex.description_target}
                                    <button onClick={() => setShowTargetDef(p => ({ ...p, [ex.id]: false }))} style={{ display: "block", marginTop: 4, padding: 0, border: "none", background: "none", color: C.acc, fontSize: 10, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>{lang === "fr" ? "Voir en langue maternelle" : lang === "ko" ? "모국어로 보기" : "Show in native language"}</button>
                                  </div>
                                ) : (
                                  <div style={{ fontSize: 12.5, color: C.txtS, lineHeight: 1.55, marginBottom: ex.example_kr ? 8 : 10 }}>
                                    {ex.description}
                                    {ex.description_target ? (
                                      <button onClick={() => setShowTargetDef(p => ({ ...p, [ex.id]: true }))} style={{ display: "block", marginTop: 4, padding: 0, border: "none", background: "none", color: C.acc, fontSize: 10, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>{t.genTargetDesc}</button>
                                    ) : (
                                      <button onClick={async (e) => {
                                        e.stopPropagation();
                                        const btn = e.currentTarget; btn.disabled = true; btn.textContent = "...";
                                        try {
                                          const res = await generateTargetDescription(ex, ex.targetLang || tl);
                                          if (res.description_target) {
                                            save({ ...data, cards: data.cards.map(x => x.id === ex.id ? { ...x, description_target: res.description_target } : x) });
                                            btn.textContent = t.genTargetDescDone;
                                          }
                                        } catch (err) { console.error(err); btn.textContent = "Error"; }
                                      }} style={{ display: "block", marginTop: 4, padding: "3px 10px", borderRadius: 6, border: `1px dashed ${C.borderS}`, background: "none", color: C.txtM, fontSize: 11, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>
                                        + {t.genTargetDesc}
                                      </button>
                                    )}
                                  </div>
                                )}
                                {ex.example_kr && (
                                  <div style={{ background: C.s1, borderRadius: 8, padding: "8px 10px", marginBottom: 10 }}>
                                    <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 13, color: C.txt }}>{ex.example_kr}</div>
                                    <div style={{ fontSize: 11.5, color: C.txtM, fontStyle: "italic", marginTop: 2 }}>{ex.example_tr}</div>
                                  </div>
                                )}
                                {/* Tags */}
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8, alignItems: "center" }}>
                                  {(ex.tags || []).map(tag => (
                                    editingTag && editingTag.cardId === ex.id && editingTag.tag === tag ? (
                                      <input key={tag + "_edit"} autoFocus defaultValue={tag}
                                        style={{ width: 80, padding: "2px 6px", borderRadius: 10, border: `1px solid ${C.acc}`, fontSize: 10, fontFamily: "'Plus Jakarta Sans'", color: C.acc, background: C.accBg, outline: "none" }}
                                        onBlur={e => { const v = e.target.value.trim(); if (v && v !== tag) renameTagOnCard(ex.id, tag, v); setEditingTag(null); }}
                                        onKeyDown={e => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setEditingTag(null); }}
                                        onClick={e => e.stopPropagation()} />
                                    ) : (
                                    <span key={tag} onClick={() => tagEditCard === ex.id ? setEditingTag({ cardId: ex.id, tag }) : null} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: 10, background: C.accBg, color: C.acc, fontSize: 10, fontWeight: 500, fontFamily: "'Plus Jakarta Sans'", cursor: tagEditCard === ex.id ? "text" : "default" }}>
                                      #{tag}
                                      {tagEditCard === ex.id && <span onClick={(e) => { e.stopPropagation(); removeTagFromCard(ex.id, tag); }} style={{ cursor: "pointer", opacity: 0.6, marginLeft: 2 }}>x</span>}
                                    </span>
                                    )
                                  ))}
                                  {(ex.tags || []).length < 3 && (
                                    <button onClick={() => setTagEditCard(tagEditCard === ex.id ? null : ex.id)}
                                      style={{ padding: "2px 7px", borderRadius: 10, border: `1px dashed ${C.borderS}`, background: "none", color: C.txtM, fontSize: 10, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>
                                      + {t.addTag}
                                    </button>
                                  )}
                                </div>
                                {tagEditCard === ex.id && (
                                  <TagPicker cardId={ex.id} existingTags={ex.tags || []} allTags={allTags} onAdd={(id, tag) => { addTagToCard(id, tag); }} onClose={() => setTagEditCard(null)} t={t} />
                                )}
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                  <button onClick={() => reviewCard(ex)} style={{ padding: "6px 13px", borderRadius: 6, border: "none", background: C.acc, color: C.onAcc, fontFamily: "'Plus Jakarta Sans'", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>▶ {t.reviewBtn}</button>
                                  <button onClick={() => setConfirmToggle(ex)} style={{ padding: "6px 13px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.s1, color: C.txtS, fontFamily: "'Plus Jakarta Sans'", fontSize: 12, cursor: "pointer" }}>✅ {t.markAcquired}</button>
                                  <button onClick={() => setCardToDelete(ex)} style={{ padding: "6px 13px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.s1, color: C.txtM, fontFamily: "'Plus Jakarta Sans'", fontSize: 12, cursor: "pointer" }}>🗑</button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      };
                      return (
                        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                          {(() => {
                            const todayDate = dayKey();
                            const origSt = data.today?.originalStatus || {};
                            const exercisedToday = c => {
                              const p = c.progress;
                              if (!p) return false;
                              return ["ce","co","pe","po"].some(k => (p[k] || []).includes(todayDate));
                            };
                            const isDone = c => {
                              const s = migrateStatus(c.status);
                              const orig = origSt[c.id] || "new";
                              if (s === "acquired") return true;
                              if (orig === "new") return s === "studied" || s === "acquired";
                              return exercisedToday(c);
                            };
                            const doneCount = today.filter(isDone).length;
                            return (
                            <div style={{ background: "linear-gradient(150deg, rgba(255,214,102,0.22), rgba(255,214,102,0.10))", border: "1px solid rgba(230,180,40,0.35)", borderRadius: 14, padding: 14, display: "flex", alignItems: "stretch", gap: 14, flexWrap: "wrap" }}>
                              {weather && (
                                <div style={{ flexShrink: 0, minWidth: 118, background: "rgba(255,255,255,0.5)", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
                                  <div style={{ fontSize: 34, lineHeight: 1 }}>{weather.emoji}</div>
                                  <div style={{ fontSize: 22, fontWeight: 600, color: C.txt, marginTop: 4 }}>{weather.temp}°</div>
                                  <div style={{ fontSize: 12, color: C.txtS }}>{weather.city}</div>
                                </div>
                              )}
                              <div style={{ flex: 1, minWidth: 200 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "#8a6d00", marginBottom: 11, display: "flex", alignItems: "center", gap: 6 }}>
                                  ☀️ {t.today} {today.length > 0 && <>· {t.todayCards(today.length)}</>}
                                  {doneCount > 0 && <span style={{ fontSize: 11, fontWeight: 500, color: C.stAcq }}>· {doneCount}/{today.length} ✓</span>}
                                </div>
                                {today.length > 0 ? (
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(112px,1fr))", gap: 8 }}>
                                  {today.map(c => { const done = isDone(c); return (
                                    <div key={c.id} onClick={() => reviewCard(c)} title={done ? t.todayDone : ""}
                                      style={{ background: done ? C.stAcqCard : "rgba(255,255,255,0.65)", border: `1px solid ${done ? C.stAcqB : "rgba(230,180,40,0.3)"}`, borderRadius: 10, padding: 10, cursor: "pointer", transition: "transform 0.1s" }}
                                      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; }}
                                      onMouseLeave={e => { e.currentTarget.style.transform = "none"; }}>
                                      {done && <div style={{ fontSize: 10, color: C.stAcq, marginBottom: 6, display: "flex", alignItems: "center", gap: 3 }}>✓ {t.todayDone}</div>}
                                      <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 14, color: C.txt }}>{c.korean}</div>
                                    </div>
                                  ); })}
                                </div>
                                ) : (
                                <div style={{ fontSize: 12, color: "#8a6d00", opacity: 0.8, lineHeight: 1.5 }}>{t.todayEmpty}</div>
                                )}
                              </div>
                            </div>
                            );
                          })()}
                          {shelf("new", C.stNewBg, C.stNew, C.stNewCard, { masked: true })}
                          {shelf("studied", C.stStudiedBg, C.stStudied, C.stStudiedCard, { expandable: true, subgroups: [
                            { label: t.shelfTagged, cards: groups.studied.filter(c => (c.tags || []).length > 0) },
                            { label: t.shelfUntagged, cards: groups.studied.filter(c => !(c.tags || []).length) }
                          ] })}
                          {shelf("acquired", C.stAcqBg, C.stAcq, C.stAcqCard, { compact: true })}
                        </div>
                      );
                    })()
                  : <TreeView cards={filteredCards} t={t} onToggle={(id) => setConfirmToggle(data.cards.find(c => c.id === id))} onReview={(c) => reviewCard(c)} />
            }
            {bulkTagMode && (
              <div style={{ position: "sticky", bottom: 0, background: C.s2, borderTop: `1px solid ${C.border}`, padding: "10px 16px", display: "flex", flexDirection: "column", gap: 8, zIndex: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: C.txt }}>{t.bulkTagTitle}</span>
                  <span style={{ fontSize: 11, color: C.txtM }}>({bulkTagSel.size})</span>
                  <button onClick={() => setBulkTagSel(new Set(filteredCards.map(c => c.id)))}
                    style={{ padding: "2px 8px", borderRadius: 5, border: `1px solid ${C.border}`, background: C.s1, color: C.txtS, fontSize: 10, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>{t.bulkTagSelectAll}</button>
                  <button onClick={() => setBulkTagSel(new Set())}
                    style={{ padding: "2px 8px", borderRadius: 5, border: `1px solid ${C.border}`, background: C.s1, color: C.txtS, fontSize: 10, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>{t.bulkTagNone}</button>
                  {bulkTagSel.size > 0 && !bulkTagPicker && (
                    <button onClick={() => setBulkTagPicker(true)}
                      style={{ padding: "4px 12px", borderRadius: 6, border: "none", background: C.acc, color: C.onAcc, fontSize: 11, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", fontWeight: 500 }}>
                      🏷 {t.bulkTagApply}
                    </button>
                  )}
                </div>
                {bulkTagPicker && bulkTagSel.size > 0 && (
                  <div style={{ background: C.s1, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px" }}>
                    <input autoFocus placeholder={t.tagPlaceholder} value={tagInput} onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && tagInput.trim()) { applyBulkTag(tagInput.trim()); setTagInput(""); } }}
                      style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 8px", fontSize: 12, fontFamily: "'Plus Jakarta Sans'", color: C.txt, background: C.s2, outline: "none", boxSizing: "border-box", marginBottom: 6 }} />
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {tagInput.trim() && !allTags.includes(tagInput.toLowerCase().trim()) && (
                        <button onClick={() => { applyBulkTag(tagInput.trim()); setTagInput(""); }}
                          style={{ padding: "3px 10px", borderRadius: 10, border: `1px solid ${C.acc}`, background: C.accBg, color: C.acc, fontSize: 10, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", fontWeight: 500 }}>
                          + {tagInput.trim().toLowerCase()}
                        </button>
                      )}
                      {allTags.filter(tag => !tagInput.trim() || tag.includes(tagInput.toLowerCase().trim())).slice(0, 15).map(tag => (
                        <button key={tag} onClick={() => { applyBulkTag(tag); setTagInput(""); }}
                          style={{ padding: "3px 10px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.s2, color: C.txtS, fontSize: 10, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="wall-band wall-band-bottom" />
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
              {/* Import from an image / screenshot (OCR) */}
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.s1, color: C.txtS, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>
                📷 {t.importImage}
                <input type="file" accept="image/*" onChange={onImagePick} style={{ display: "none" }} />
              </label>
              {/* Study mode: grammar or vocabulary */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ fontSize: 11.5, color: C.txtM }}>{t.importModeSub}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 2, background: C.s1, borderRadius: 8, padding: 3, border: `1px solid ${C.border}`, justifyContent: "center" }}>
                  {[["grammar", t.importModeGrammar], ["vocab", t.importModeVocab], ["comprehension", t.importModeComprehension], ["bulk", t.importModeBulk]].map(([k, l]) => (
                    <button key={k} onClick={() => setImpMode(k)}
                      style={{ padding: "6px 12px", borderRadius: 6, border: "none", fontSize: 11.5, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", fontWeight: impMode === k ? 600 : 400, background: impMode === k ? C.acc : "transparent", color: impMode === k ? C.onAcc : C.txtS }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={doAnalyze} disabled={!impText.trim()}
                style={{ padding: "8px 22px", borderRadius: 6, border: "none", cursor: impText.trim() ? "pointer" : "default", background: impText.trim() ? C.acc : C.s1, color: impText.trim() ? C.onAcc : C.txtM, fontFamily: "'Plus Jakarta Sans'", fontSize: 13, fontWeight: 500 }}>
                ✨ {t.analyze}
              </button>
            </>)}
            {impStep === "scanning" && <div style={{ fontSize: 36 }}>📄</div>}
            {impStep === "scanning" && <div className="pulse" style={{ fontSize: 13, color: C.txtS }}>{t.analyzing}{bulkProgress ? ` (${bulkProgress.current}/${bulkProgress.total})` : ""}</div>}
            {impStep === "ocr" && <div style={{ fontSize: 36 }}>📷</div>}
            {impStep === "ocr" && <div className="pulse" style={{ fontSize: 13, color: C.txtS }}>{t.ocrLoading}</div>}
            {impStep === "picks" && (
              <div style={{ width: "100%", maxWidth: 520, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.txt }}>{t.pointsFound(found.length)}</div>
                {found.length === 0
                  ? <div style={{ fontSize: 12.5, color: C.txtS, lineHeight: 1.6, padding: "12px 14px", background: C.s2, border: `1px solid ${C.border}`, borderRadius: 10 }}>{t.importAllKnown}</div>
                  : <div style={{ fontSize: 12, color: C.txtM, marginBottom: 8 }}>{t.pickSub}</div>}
                {found.map((p, i) => (
                  <div key={i} onClick={() => setSelPick(i)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, cursor: "pointer", border: `1px solid ${selPick === i ? C.acc : C.border}`, background: selPick === i ? C.accBg : C.s2 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: tFont, fontSize: 15, color: C.txt }}>{p.korean}</div>
                      <div style={{ fontSize: 11.5, color: C.txtS, marginTop: 2 }}>{lang === "fr" ? p.description_fr : (p.description_en || p.description_fr)}</div>
                    </div>
                    <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 3, background: p.type === "grammar" ? C.accBg : C.proBg, color: p.type === "grammar" ? C.acc : C.pro }}>{typeLabel(p.type, t)}</span>
                    <button onClick={e => { e.stopPropagation(); markKnown(i); }}
                      style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10.5, cursor: "pointer", whiteSpace: "nowrap", border: `1px solid ${known.has(i) ? C.okB : C.border}`, background: known.has(i) ? C.okBg : "none", color: known.has(i) ? C.ok : C.txtM, fontFamily: "'Plus Jakarta Sans'" }}>
                      ✓ {known.has(i) ? t.addedAcq : t.iKnow}
                    </button>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <button onClick={() => beginLesson(null, null)} style={{ padding: "8px 18px", borderRadius: 6, background: C.acc, color: C.onAcc, border: "none", fontFamily: "'Plus Jakarta Sans'", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>→ {t.startLesson}</button>
                  <button onClick={async () => { setImpStep("scanning"); try { const m = await analyzeText(impText, [...data.cards, ...found.map(p => ({ korean: p.korean }))], lang, context, tl); const fresh = dedupeExtracted(m, [...data.cards, ...found]); setFound([...found, ...fresh]); } catch (e) { console.error(e); } setImpStep("picks"); }}
                    style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.borderS}`, background: "none", fontFamily: "'Plus Jakarta Sans'", fontSize: 12, color: C.txtS, cursor: "pointer" }}>+ {t.morePoints}</button>
                </div>
              </div>
            )}
            {impStep === "vocabpicks" && (
              <div style={{ width: "100%", maxWidth: 520, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.txt }}>{t.vocabPickTitle}</div>
                {vocabFound.length === 0
                  ? <div style={{ fontSize: 12.5, color: C.txtS, lineHeight: 1.6, padding: "12px 14px", background: C.s2, border: `1px solid ${C.border}`, borderRadius: 10 }}>{t.importAllKnown}</div>
                  : <div style={{ fontSize: 12, color: C.txtM, marginBottom: 6 }}>{t.vocabPickSub}</div>}
                {vocabFound.map((v, i) => {
                  const on = vocabSel.has(i);
                  return (
                    <div key={i} onClick={() => { const s = new Set(vocabSel); if (s.has(i)) s.delete(i); else s.add(i); setVocabSel(s); }}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, cursor: "pointer", border: `1px solid ${on ? C.acc : C.border}`, background: on ? C.accBg : C.s2 }}>
                      <span style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, border: `1px solid ${on ? C.acc : C.borderS}`, background: on ? C.acc : "transparent", color: C.onAcc }}>{on ? "✓" : ""}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: tFont, fontSize: 15, color: C.txt }}>{v.word}{v.reading ? <span style={{ fontSize: 11, color: C.txtM, marginLeft: 6 }}>[{v.reading}]</span> : null}</div>
                        <div style={{ fontSize: 11.5, color: C.txtS, marginTop: 2 }}>{lang === "fr" ? v.meaning_fr : (v.meaning_en || v.meaning_fr)}</div>
                      </div>
                    </div>
                  );
                })}
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <button onClick={startVocabLesson} disabled={vocabSel.size === 0}
                    style={{ padding: "8px 18px", borderRadius: 6, background: vocabSel.size ? C.acc : C.s1, color: vocabSel.size ? C.onAcc : C.txtM, border: "none", fontFamily: "'Plus Jakarta Sans'", fontSize: 13, fontWeight: 500, cursor: vocabSel.size ? "pointer" : "default" }}>
                    → {t.studyTheseWords} ({vocabSel.size})
                  </button>
                </div>
              </div>
            )}
            {impStep === "bulkpicks" && (
              <div style={{ width: "100%", maxWidth: 520, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.txt }}>{t.bulkPickTitle} ({bulkFound.length})</div>
                  <button onClick={() => { setImpStep("input"); setBulkFound([]); setBulkSel(new Set()); }}
                    style={{ fontSize: 11, color: C.txtS, border: `1px solid ${C.border}`, borderRadius: 6, padding: "3px 9px", background: C.s1, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>← {t.back}</button>
                </div>
                {bulkFound.length === 0
                  ? <div style={{ fontSize: 12.5, color: C.txtS, lineHeight: 1.6, padding: "12px 14px", background: C.s2, border: `1px solid ${C.border}`, borderRadius: 10 }}>{t.importAllKnown}</div>
                  : <div style={{ fontSize: 12, color: C.txtM, marginBottom: 6 }}>{t.bulkPickSub}</div>}
                <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                  <button onClick={() => setBulkSel(new Set(bulkFound.map((_, i) => i)))} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 5, border: `1px solid ${C.border}`, background: C.s1, color: C.txtS, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>{t.filterAll || "Tout"}</button>
                  <button onClick={() => setBulkSel(new Set(bulkFound.map((v, i) => v.type === "vocab" ? i : -1).filter(i => i >= 0)))} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 5, border: `1px solid ${C.border}`, background: C.s1, color: C.txtS, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>{t.importModeVocab}</button>
                  <button onClick={() => setBulkSel(new Set(bulkFound.map((v, i) => v.type !== "vocab" ? i : -1).filter(i => i >= 0)))} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 5, border: `1px solid ${C.border}`, background: C.s1, color: C.txtS, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>{t.importModeGrammar}</button>
                  <button onClick={() => setBulkSel(new Set())} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 5, border: `1px solid ${C.border}`, background: C.s1, color: C.txtS, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>0</button>
                </div>
                <div style={{ maxHeight: 400, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                  {bulkFound.map((v, i) => {
                    const on = bulkSel.has(i);
                    const isVocab = v.type === "vocab";
                    return (
                      <div key={i} onClick={() => { const s = new Set(bulkSel); if (s.has(i)) s.delete(i); else s.add(i); setBulkSel(s); }}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, cursor: "pointer", border: `1px solid ${on ? C.acc : C.border}`, background: on ? C.accBg : C.s2 }}>
                        <span style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, border: `1px solid ${on ? C.acc : C.borderS}`, background: on ? C.acc : "transparent", color: C.onAcc }}>{on ? "✓" : ""}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: tFont, fontSize: 14, color: C.txt }}>{v.korean || v.word}{v.reading ? <span style={{ fontSize: 11, color: C.txtM, marginLeft: 6 }}>[{v.reading}]</span> : null}</div>
                          <div style={{ fontSize: 11, color: C.txtS, marginTop: 2 }}>{lang === "fr" ? v.meaning_fr : (v.meaning_en || v.meaning_fr)}</div>
                        </div>
                        <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, flexShrink: 0, background: isVocab ? C.proBg : C.accBg, color: isVocab ? C.pro : C.acc }}>{isVocab ? t.importModeVocab : t.importModeGrammar}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <button onClick={() => {
                    if (bulkSel.size === 0) { alert(t.bulkNone); return; }
                    const items = [...bulkSel].sort((a, b) => a - b).map(i => bulkFound[i]).filter(Boolean);
                    const newCards = items.filter(v => !data.cards.find(c => c.korean === (v.korean || v.word))).map(v => {
                      const isVocab = v.type === "vocab";
                      return isVocab ? makeVocabCard(v, "new") : makeCard({ korean: v.korean || v.word, type: v.type || "grammar", description_fr: v.meaning_fr || v.description_fr || "", description_en: v.meaning_en || v.description_en || "", description_target: v.description_target || "", example_kr: v.example_kr || "", example_fr: v.example_fr || "", example_en: v.example_en || "", category: v.category || "" }, "new");
                    });
                    if (newCards.length) {
                      save({ ...data, cards: [...data.cards, ...newCards] });
                      setBulkImportedIds(newCards.map(c => c.id));
                      setImpStep("bulktag");
                    } else {
                      alert(t.bulkAdded(0));
                      setBulkFound([]); setBulkSel(new Set()); setImpStep("input"); setImpText("");
                    }
                  }} disabled={bulkSel.size === 0}
                    style={{ padding: "8px 18px", borderRadius: 6, background: bulkSel.size ? C.acc : C.s1, color: bulkSel.size ? C.onAcc : C.txtM, border: "none", fontFamily: "'Plus Jakarta Sans'", fontSize: 13, fontWeight: 500, cursor: bulkSel.size ? "pointer" : "default" }}>
                    📥 {t.bulkAddToLib} ({bulkSel.size})
                  </button>
                </div>
              </div>
            )}
            {impStep === "bulktag" && (
              <div style={{ width: "100%", maxWidth: 520, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.txt }}>✓ {t.bulkAdded(bulkImportedIds.length)}</div>
                <div style={{ fontSize: 12.5, color: C.txtM }}>{lang === "fr" ? "Ajouter un tag a ces cartes ?" : lang === "ko" ? "이 카드들에 태그를 추가할까?" : "Add a tag to these cards?"}</div>
                <div style={{ background: C.s1, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px" }}>
                  <input autoFocus placeholder={t.tagPlaceholder} value={tagInput} onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && tagInput.trim()) {
                      const tg = tagInput.trim().toLowerCase();
                      const nd = { ...data, cards: data.cards.map(c => {
                        if (!bulkImportedIds.includes(c.id)) return c;
                        const tags = c.tags || [];
                        if (tags.length >= 3 || tags.includes(tg)) return c;
                        return { ...c, tags: [...tags, tg] };
                      }) };
                      save(nd); setTagInput("");
                      alert((lang === "fr" ? `Tag #${tg} applique !` : lang === "ko" ? `#${tg} 태그 적용됨!` : `Tag #${tg} applied!`));
                      setBulkFound([]); setBulkSel(new Set()); setBulkImportedIds([]); setImpStep("input"); setImpText("");
                    } }}
                    style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 8px", fontSize: 12, fontFamily: "'Plus Jakarta Sans'", color: C.txt, background: C.s2, outline: "none", boxSizing: "border-box", marginBottom: 6 }} />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {tagInput.trim() && !allTags.includes(tagInput.toLowerCase().trim()) && (
                      <button onClick={() => {
                        const tg = tagInput.trim().toLowerCase();
                        const nd = { ...data, cards: data.cards.map(c => {
                          if (!bulkImportedIds.includes(c.id)) return c;
                          const tags = c.tags || [];
                          if (tags.length >= 3 || tags.includes(tg)) return c;
                          return { ...c, tags: [...tags, tg] };
                        }) };
                        save(nd); setTagInput("");
                        alert((lang === "fr" ? `Tag #${tg} applique !` : lang === "ko" ? `#${tg} 태그 적용됨!` : `Tag #${tg} applied!`));
                        setBulkFound([]); setBulkSel(new Set()); setBulkImportedIds([]); setImpStep("input"); setImpText("");
                      }}
                        style={{ padding: "3px 10px", borderRadius: 10, border: `1px solid ${C.acc}`, background: C.accBg, color: C.acc, fontSize: 10, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", fontWeight: 500 }}>
                        + {tagInput.trim().toLowerCase()}
                      </button>
                    )}
                    {allTags.filter(tag => !tagInput.trim() || tag.includes(tagInput.toLowerCase().trim())).slice(0, 15).map(tag => (
                      <button key={tag} onClick={() => {
                        const tg = tag;
                        const nd = { ...data, cards: data.cards.map(c => {
                          if (!bulkImportedIds.includes(c.id)) return c;
                          const tags = c.tags || [];
                          if (tags.length >= 3 || tags.includes(tg)) return c;
                          return { ...c, tags: [...tags, tg] };
                        }) };
                        save(nd); setTagInput("");
                        alert((lang === "fr" ? `Tag #${tg} applique !` : lang === "ko" ? `#${tg} 태그 적용됨!` : `Tag #${tg} applied!`));
                        setBulkFound([]); setBulkSel(new Set()); setBulkImportedIds([]); setImpStep("input"); setImpText("");
                      }}
                        style={{ padding: "3px 10px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.s2, color: C.txtS, fontSize: 10, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => { setBulkFound([]); setBulkSel(new Set()); setBulkImportedIds([]); setImpStep("input"); setImpText(""); }}
                  style={{ alignSelf: "flex-start", padding: "6px 14px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.s1, color: C.txtS, fontSize: 12, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>
                  {lang === "fr" ? "Passer" : lang === "ko" ? "건너뛰기" : "Skip"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* LESSON */}
        {view === "lesson" && (
          vocabSession ? (
            <VocabLesson words={vocabSession.words} startIdx={vocabSession.idx || 0} onIdx={(i) => setVocabSession(s => (s ? { ...s, idx: i } : s))} lang={lang} tl={tl} context={context} tFont={tFont} t={t} onFinish={finishVocab} onExit={exitVocab} />
          ) :
          showRecap && recapCard && recapMode ? (
            // FULL-SCREEN QUICK PRACTICE CHAT
            <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.s1, minHeight: 0, position: "relative" }}>
              {recapDone && !recapSummary && (
                <div style={{ position: "absolute", inset: 0, zIndex: 20, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
                  <div style={{ background: C.s2, borderRadius: 16, padding: "32px 40px", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
                    <div className="pulse" style={{ fontSize: 32, marginBottom: 12 }}>{"📝"}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.txt }}>{t.generating}</div>
                  </div>
                </div>
              )}
              <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, background: C.s2, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <button onClick={() => {
                  const aiTurns = recapConv.filter(m => m.role === "ai").length;
                  const MIN_TURNS = 4;
                  if (recapMode === "examples" && aiTurns >= 2 && aiTurns < MIN_TURNS && !recapDone) {
                    if (!confirm(t.practiceExitWarn(MIN_TURNS - aiTurns))) return;
                  }
                  setRecapMode(null); setRecapConv([]); setRecapInp(""); setRecapDone(false); setRecapSummary(null);
                }}
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
              <div ref={recapR} style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                {recapConv.map((m, i) => (
                  <div key={i} ref={i === recapConv.length - 1 ? lastRecapMsgRef : null}>
                    <Bubble revealAll={revealTr} onResourceClick={awardResourcePoint} imgLabels={{ other: t.otherImages, refine: t.refineImage, choose: t.imgChoose }} onMoreImages={m.images ? (refine) => moreImages("recap", i, refine, m.imageWord || recapCard?.korean) : undefined} onAttachImage={m.images && recapCard?.type === "vocab" ? (im) => attachImage(recapCard.korean, im) : undefined}
                      msg={{ ...m, onSelect: m.role === "ai" && !m.selected && m.options ? (o) => recapPickOpt(i, o) : null }} />
                  </div>
                ))}
                {recapLoad && !recapDone && <div className="pulse" style={{ fontSize: 12, color: C.txtM, padding: 8 }}>{searching ? t.searching : t.thinking}</div>}
                {/* Recap summary display */}
                {recapSummary && (
                  <div ref={summaryRef} style={{ background: C.s2, border: `1px solid ${(recapSummary.error || recapSummary.structuresLearned === "Error generating summary") ? C.warnB : C.okB}`, borderRadius: 10, padding: 16, margin: "4px 0" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.txt, marginBottom: 12 }}>📋 {t.summaryTitle}</div>
                    {(recapSummary.error || recapSummary.structuresLearned === "Error generating summary") ? (
                      <div>
                        <div style={{ fontSize: 12, color: C.warn, lineHeight: 1.6, marginBottom: 8 }}>
                          ⚠️ {lang === "fr" ? "Erreur lors de la génération du résumé" : lang === "ko" ? "요약 생성 중 오류" : "Error generating summary"}
                        </div>
                        {recapSummary.error && (
                          <div style={{ fontSize: 11, color: C.txtM, lineHeight: 1.5, marginBottom: 12, background: C.s1, padding: "6px 10px", borderRadius: 6, fontFamily: "monospace", wordBreak: "break-all" }}>
                            {String(recapSummary.error).substring(0, 200)}
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button onClick={() => { setRecapSummary(null); setRecapDone(false); endRecapPractice(); }}
                            style={{ padding: "6px 16px", borderRadius: 6, background: C.acc, color: C.onAcc, border: "none", fontFamily: "'Plus Jakarta Sans'", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                            🔄 {lang === "fr" ? "Réessayer" : lang === "ko" ? "다시 시도" : "Retry"}
                          </button>
                          <button onClick={() => { setRecapMode(null); setRecapConv([]); setRecapInp(""); setRecapDone(false); setRecapSummary(null); }}
                            style={{ padding: "6px 16px", borderRadius: 6, background: "none", border: `1px solid ${C.borderS}`, color: C.txtS, fontFamily: "'Plus Jakarta Sans'", fontSize: 12, cursor: "pointer" }}>
                            ← {t.backToRecap}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: 12.5, color: C.txt, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                          {renderMarkdown(recapSummary.grammarRecap || recapSummary.structuresLearned, revealTr)}
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                          <button onClick={() => { setRecapMode(null); setRecapConv([]); setRecapInp(""); setRecapDone(false); setRecapSummary(null); }}
                            style={{ padding: "7px 16px", borderRadius: 20, border: "none", background: C.acc, color: C.onAcc, fontFamily: "'Plus Jakarta Sans'", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                            ← {t.backToRecap}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              {/* Wrap-up bar: show "End practice" after 4 AI turns */}
              {recapMode === "examples" && !recapDone && (() => {
                const aiTurns = recapConv.filter(m => m.role === "ai").length;
                if (aiTurns < 4) return null;
                return (
                  <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.okB}`, background: C.okBg }}>
                    <div style={{ fontSize: 12, color: C.txtS, marginBottom: 8, textAlign: "center" }}>🎓 {t.practiceWrapUp}</div>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <button onClick={endRecapPractice} disabled={recapLoad}
                        style={{ padding: "7px 16px", borderRadius: 20, border: "none", background: recapLoad ? C.s1 : C.ok, color: recapLoad ? C.txtM : "#fff", fontFamily: "'Plus Jakarta Sans'", fontSize: 12, fontWeight: 600, cursor: recapLoad ? "default" : "pointer" }}>✓ {t.endPractice}</button>
                    </div>
                  </div>
                );
              })()}
              {/* Images aren't a conversation -- no reply bar in image mode. */}
              {recapMode !== "image" && !recapDone && (
                <div style={{ padding: "8px 10px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 6, background: C.s2, alignItems: "center", flexShrink: 0 }}>
                  <input value={recapInp} onChange={e => setRecapInp(e.target.value)} onKeyDown={e => e.key === "Enter" && !recapLoad && recapSend()} placeholder={recapLoad ? t.thinking : t.askQuestion} disabled={recapLoad}
                    style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif", fontSize: 14, color: C.txt, background: C.s1, outline: "none", opacity: recapLoad ? 0.6 : 1 }} />
                  <button onClick={recapSend} disabled={recapLoad} style={{ width: 30, height: 30, background: recapLoad ? C.s1 : C.acc, color: recapLoad ? C.txtM : C.onAcc, border: "none", borderRadius: 6, cursor: recapLoad ? "default" : "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>↑</button>
                </div>
              )}
            </div>
          ) : showRecap && recapCard ? (
            // RECAP SCREEN
            <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
              <div style={{ width: "100%", maxWidth: 540, margin: "0 auto", padding: "24px 20px 40px", display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Card info */}
                <div style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 7px", borderRadius: 4, background: recapCard.type === "grammar" ? C.accBg : C.proBg, color: recapCard.type === "grammar" ? C.acc : C.pro }}>{typeLabel(recapCard.type, t)}</span>
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
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    {(recapCard.images || [])[0] && <img src={recapCard.images[0].thumb || recapCard.images[0].url} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 8, border: `1px solid ${C.border}`, flexShrink: 0 }} />}
                    <div style={{ fontFamily: tFont, fontSize: 22, color: C.txt }}>{recapCard.korean}</div>
                    {recapCard.gender && GENDERED_LANGS.has(recapCard.targetLang || tl) && (
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: recapCard.gender === "m" ? "#EFF6FF" : "#FDF2F8", color: recapCard.gender === "m" ? "#1D4ED8" : "#BE185D", border: `1px solid ${recapCard.gender === "m" ? "#BFDBFE" : "#FBCFE8"}` }}>
                        {recapCard.gender === "m" ? "masc." : recapCard.gender === "f" ? "fém." : "n."}
                      </span>
                    )}
                  </div>
                  {showTargetDef[recapCard.id] && recapCard.description_target ? (
                    <div style={{ fontSize: 12.5, color: C.txtM, fontStyle: "italic", fontFamily: tFont, lineHeight: 1.6, marginBottom: 10, padding: "5px 9px", background: C.s1, borderRadius: 6, border: `1px solid ${C.border}` }}>
                      {recapCard.description_target}
                      <button onClick={() => setShowTargetDef(p => ({ ...p, [recapCard.id]: false }))} style={{ display: "block", marginTop: 4, padding: 0, border: "none", background: "none", color: C.acc, fontSize: 10, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>{lang === "fr" ? "Voir en langue maternelle" : lang === "ko" ? "모국어로 보기" : "Show in native language"}</button>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12.5, color: C.txtS, lineHeight: 1.6, marginBottom: 10 }}>
                      {recapCard.description}
                      {recapCard.description_target && (
                        <button onClick={() => setShowTargetDef(p => ({ ...p, [recapCard.id]: true }))} style={{ display: "block", marginTop: 4, padding: 0, border: "none", background: "none", color: C.acc, fontSize: 10, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>{t.genTargetDesc}</button>
                      )}
                    </div>
                  )}
                  <div style={{ background: C.s1, borderRadius: 8, padding: "9px 11px" }}>
                    <div style={{ fontFamily: tFont, fontSize: 13, color: C.txt, lineHeight: 1.8 }}>{recapCard.example_kr}</div>
                    <div style={{ fontSize: 11.5, color: C.txtM, fontStyle: "italic", marginTop: 3 }}>{recapCard.example_tr}</div>
                  </div>
                  {/* Tags on recap card */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10, alignItems: "center" }}>
                    {(recapCard.tags || []).map(tag => (
                      editingTag && editingTag.cardId === recapCard.id && editingTag.tag === tag ? (
                        <input key={tag + "_edit"} autoFocus defaultValue={tag}
                          style={{ width: 80, padding: "2px 6px", borderRadius: 10, border: `1px solid ${C.acc}`, fontSize: 10, fontFamily: "'Plus Jakarta Sans'", color: C.acc, background: C.accBg, outline: "none" }}
                          onBlur={e => { const v = e.target.value.trim(); if (v && v !== tag) renameTagOnCard(recapCard.id, tag, v); setEditingTag(null); }}
                          onKeyDown={e => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setEditingTag(null); }}
                          onClick={e => e.stopPropagation()} />
                      ) : (
                      <span key={tag} onClick={() => tagEditCard === recapCard.id ? setEditingTag({ cardId: recapCard.id, tag }) : setTagExplore(tagExplore === tag ? null : tag)} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: 10, background: tagExplore === tag ? C.acc : C.accBg, color: tagExplore === tag ? C.onAcc : C.acc, fontSize: 10, fontWeight: 500, fontFamily: "'Plus Jakarta Sans'", cursor: "pointer", transition: "all 0.15s" }}>
                        #{tag}
                        {tagEditCard === recapCard.id && <span onClick={(e) => { e.stopPropagation(); removeTagFromCard(recapCard.id, tag); }} style={{ cursor: "pointer", opacity: 0.6, marginLeft: 2 }}>x</span>}
                      </span>
                      )
                    ))}
                    {(recapCard.tags || []).length < 3 && (
                      <button onClick={() => setTagEditCard(tagEditCard === recapCard.id ? null : recapCard.id)}
                        style={{ padding: "2px 7px", borderRadius: 10, border: `1px dashed ${C.borderS}`, background: "none", color: C.txtM, fontSize: 10, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>
                        + {t.addTag}
                      </button>
                    )}
                  </div>
                  {tagEditCard === recapCard.id && (
                    <div style={{ marginTop: 6 }}>
                      <TagPicker cardId={recapCard.id} existingTags={recapCard.tags || []} allTags={allTags} onAdd={(id, tag) => { addTagToCard(id, tag); }} onClose={() => setTagEditCard(null)} t={t} />
                    </div>
                  )}
                  {tagExplore && (() => {
                    const related = data.cards.filter(c => c.id !== recapCard.id && (c.tags || []).includes(tagExplore) && (c.targetLang || "ko") === tl);
                    return (
                      <div style={{ marginTop: 8, background: C.s1, borderRadius: 8, padding: "10px 12px", animation: "fadeIn 0.2s" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: C.txt }}>{t.tagRelated} <span style={{ color: C.acc }}>#{tagExplore}</span></span>
                          <span onClick={() => setTagExplore(null)} style={{ fontSize: 11, color: C.txtM, cursor: "pointer" }}>x</span>
                        </div>
                        {related.length === 0 ? (
                          <div style={{ fontSize: 11, color: C.txtM, fontStyle: "italic" }}>{t.tagNoOther}</div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
                            {related.map(c => (
                              <div key={c.id} onClick={() => openCardFresh(c)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, background: C.s2, border: `1px solid ${C.border}`, cursor: "pointer", transition: "border-color 0.15s" }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = C.acc; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
                                <span style={{ fontFamily: tFont, fontSize: 13, color: C.txt, flex: 1 }}>{c.korean}</span>
                                <span style={{ fontSize: 10, color: C.txtM, flexShrink: 0 }}>{c.description ? c.description.slice(0, 30) + (c.description.length > 30 ? "..." : "") : ""}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {tl === "ko" && recapCard.type === "vocab" && (
                    <div style={{ marginTop: 10, padding: "10px 12px", background: C.s1, borderRadius: 8 }}>
                      {(recapCard.formality || recapCard.registerFormal !== undefined) ? (
                        <>
                          <div style={{ fontSize: 11, fontWeight: 600, color: C.txt, marginBottom: 7 }}>🎚 {t.formalityLabel}</div>
                          {recapCard.formality && (
                            <div style={{ marginBottom: 8 }}>
                              <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, background: recapCard.formality === "formal" ? "#e8d5f5" : recapCard.formality === "casual" ? "#d5f0e8" : "#e8eaf0", color: recapCard.formality === "formal" ? "#7b2ea0" : recapCard.formality === "casual" ? "#1a8a5c" : "#5a6070" }}>
                                {t.formality[recapCard.formality] || t.formality.neutral}
                              </span>
                            </div>
                          )}
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                              <span style={{ fontSize: 10, color: C.stStudied, textTransform: "uppercase", letterSpacing: 0.4, minWidth: 50 }}>{t.formality.formal}</span>
                              <span style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 14, color: recapCard.registerFormal ? C.txt : C.txtM }}>{recapCard.registerFormal || t.registerNoFormal}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                              <span style={{ fontSize: 10, color: C.stAcq, textTransform: "uppercase", letterSpacing: 0.4, minWidth: 50 }}>{t.formality.casual}</span>
                              <span style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 14, color: recapCard.registerCasual ? C.txt : C.txtM }}>{recapCard.registerCasual || t.registerNoCasual}</span>
                            </div>
                          </div>
                          {recapCard.registerNote && <div style={{ fontSize: 11.5, color: C.txtS, lineHeight: 1.5, marginTop: 7 }}>{recapCard.registerNote}</div>}
                          {(recapCard.registerFormal || recapCard.registerCasual) && (
                            <button onClick={() => startRecapAction("register")}
                              style={{ marginTop: 9, padding: "5px 12px", borderRadius: 16, border: `1px solid ${C.border}`, background: C.s2, color: C.txtS, fontFamily: "'Plus Jakarta Sans'", fontSize: 11.5, cursor: "pointer" }}>💬 {t.registerExamples}</button>
                          )}
                        </>
                      ) : (
                        <button onClick={loadRegister} disabled={registerLoad}
                          style={{ padding: "6px 12px", borderRadius: 16, border: `1px solid ${C.border}`, background: C.s2, color: registerLoad ? C.txtM : C.txtS, fontFamily: "'Plus Jakarta Sans'", fontSize: 12, cursor: registerLoad ? "default" : "pointer" }} className={registerLoad ? "pulse" : ""}>
                          {registerLoad ? t.registerLoading : `🎚 ${t.registerShow}`}
                        </button>
                      )}
                    </div>
                  )}
                  {recapCard.type === "vocab" && (recapCard.images || []).length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 11, color: C.txtM, marginBottom: 6 }}>{t.cardImages}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {(recapCard.images || []).map((im, i) => (
                          <div key={i} style={{ position: "relative" }}>
                            <img src={im.thumb || im.url} alt="" style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 8, border: `2px solid ${i === 0 ? C.acc : C.border}`, background: C.s1 }} />
                            {i === 0 && <span style={{ position: "absolute", left: 4, top: 4, fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 6, background: C.acc, color: C.onAcc }}>★ {t.imgMain}</span>}
                            <div style={{ position: "absolute", right: 3, bottom: 3, display: "flex", gap: 3 }}>
                              {(recapCard.images || []).length > 1 && i !== 0 && (
                                <button onClick={() => setCardImages(recapCard.korean, [recapCard.images[i], ...recapCard.images.filter((_, j) => j !== i)])} title={t.imgSwap}
                                  style={{ width: 20, height: 20, borderRadius: 5, border: "none", background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 11, cursor: "pointer" }}>★</button>
                              )}
                              <button onClick={() => setCardImages(recapCard.korean, recapCard.images.filter((_, j) => j !== i))} title={t.imgRemove}
                                style={{ width: 20, height: 20, borderRadius: 5, border: "none", background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 10, cursor: "pointer" }}>🗑</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {recapCard.parentKorean && (
                    <div onClick={(e) => {
                      e.stopPropagation();
                      const parent = data.cards.find(c => c.korean === recapCard.parentKorean);
                      if (parent) openCardFresh(parent);
                    }} style={{ fontSize: 10, color: C.acc, marginTop: 8, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                      <span style={{ opacity: 0.6 }}>↳</span> {t.derivedFrom} <span style={{ fontFamily: tFont, fontWeight: 500, textDecoration: "underline", textUnderlineOffset: 2 }}>{recapCard.parentKorean}</span>
                    </div>
                  )}
                  {(() => {
                    const children = data.cards.filter(c => c.parentKorean === recapCard.korean);
                    return children.length > 0 ? (
                      <div style={{ fontSize: 10, color: C.txtM, marginTop: recapCard.parentKorean ? 4 : 8, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                        <span style={{ opacity: 0.6 }}>↴</span> {t.derivedChildren}
                        {children.map((ch, i) => (
                          <span key={ch.id || i}>
                            <span onClick={(e) => { e.stopPropagation(); openCardFresh(ch); }}
                              style={{ fontFamily: tFont, fontWeight: 500, color: C.acc, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2 }}>{ch.korean}</span>
                            {i < children.length - 1 && <span style={{ color: C.txtM }}>, </span>}
                          </span>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* Etymology */}
                {recapCard.etymology ? (
                  <div style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(59,130,246,0.06))", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 12, padding: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "rgb(139,92,246)", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>📖 {t.etymBtn}</div>
                    <div style={{ fontSize: 12.5, color: C.txt, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{recapCard.etymology}</div>
                    <button onClick={() => startRecapAction("rootWords")}
                      style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(139,92,246,0.3)", background: "rgba(139,92,246,0.08)", color: "rgb(139,92,246)", fontFamily: "'Plus Jakarta Sans'", fontSize: 11.5, cursor: "pointer" }}>
                      🌳 {t.rootWordsBtn}
                    </button>
                  </div>
                ) : (
                  <button onClick={async (e) => {
                    const btn = e.currentTarget; btn.disabled = true; btn.textContent = t.etymLoading;
                    try {
                      const TL = getTargetLangName(recapCard.targetLang || tl, "en");
                      const L = lang === "fr" ? "French" : lang === "ko" ? "Korean" : "English";
                      const sys = `${TL} etymology, answer in ${L}, be brief. For the given word: 1) Origin (if Sino-Korean: hanja + meaning of each character). 2) 2-3 related words sharing same roots. Plain text, no JSON, max 4 lines.`;
                      const { text: etym } = await callAI(sys, recapCard.korean, 150, false, true);
                      if (etym && etym.trim()) {
                        save({ ...data, cards: data.cards.map(x => x.korean === recapCard.korean ? { ...x, etymology: etym.trim() } : x) });
                        setRecapCard(prev => prev ? { ...prev, etymology: etym.trim() } : prev);
                      }
                    } catch (err) { console.error(err); btn.textContent = "Error"; btn.disabled = false; }
                  }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderRadius: 10, border: "1px dashed rgba(139,92,246,0.4)", background: "rgba(139,92,246,0.05)", color: "rgb(139,92,246)", fontFamily: "'Plus Jakarta Sans'", fontSize: 12.5, cursor: "pointer", width: "100%", textAlign: "left" }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>📖</span> {t.etymBtn}
                  </button>
                )}

                {/* Spaced repetition progress + exercise shortcuts */}
                {(() => {
                  const cardObj = data.cards.find(x => x.korean === recapCard.korean);
                  const cardForReview = cardObj || recapCard;
                  const reviewCount = getCardReviewCount(cardForReview);
                  const goal = cardObj?.goalId ? (data.goals || []).find(g => g.id === cardObj.goalId) : null;
                  let daysAvailable = Infinity;
                  if (goal && cardForReview.discoveredDate) {
                    daysAvailable = Math.max(1, Math.ceil((new Date(goal.deadline + "T23:59:59") - new Date(cardForReview.discoveredDate + "T00:00:00")) / 86400000));
                  }
                  const schedule = getSpacedSchedule(daysAvailable);
                  const R = schedule.R;
                  const pct = Math.min(100, Math.round((reviewCount / R) * 100));
                  const acquired = reviewCount >= R;
                  const today = new Date().toISOString().slice(0, 10);
                  const nextDate = getCardNextReviewDate(cardForReview, daysAvailable);
                  const practicedToday = cardForReview.reviewDates && cardForReview.reviewDates.includes(today);
                  const justDiscovered = cardForReview.discoveredDate === today && reviewCount === 0;
                  let daysUntilNext = null;
                  if (nextDate && !acquired) {
                    const nd = new Date(nextDate + "T00:00:00");
                    const td = new Date(today + "T00:00:00");
                    daysUntilNext = Math.round((nd - td) / 86400000);
                  }
                  const cats = [
                    { key: "CE", icon: "📖", label: t.exCatCE, color: "#4A90D9" },
                    { key: "CO", icon: "🎧", label: t.exCatCO, color: "#E8A838" },
                    { key: "PE", icon: "✏️", label: t.exCatPE, color: "#7B7FF5" },
                    { key: "PO", icon: "🎤", label: t.exCatPO, color: "#E06B6B" },
                  ];
                  const launchCat = (catKey) => {
                    const cardId = cardObj?.id;
                    exPrimaryWordRef.current = recapCard.korean;
                    const eligible = data.cards.filter(x => (x.status === "studied" || x.status === "acquired") && (x.targetLang || "ko") === tl && x.id !== cardId);
                    const shuffled = eligible.sort(() => Math.random() - 0.5).slice(0, 5);
                    const ids = new Set([cardId, ...shuffled.map(x => x.id)].filter(Boolean));
                    skipExResetRef.current = true;
                    setExSel(ids);
                    setExCategory(catKey);
                    setExStep("exercise");
                    setShowRecap(false); setRecapCard(null);
                    setView("exercise");
                  };
                  return (
                    <div style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: C.txt }}>{t.progressTitle}</span>
                        <span style={{ fontSize: 11, color: acquired ? "#34C759" : C.txtM }}>{t.progressReviews(reviewCount, R)}</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: C.s1, marginBottom: 12, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 3, background: acquired ? "#34C759" : C.acc, width: `${pct}%`, transition: "width 0.3s" }} />
                      </div>
                      {acquired ? (
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#34C759", marginBottom: 14 }}>{t.progressAcquired}</div>
                      ) : (
                        <div style={{ marginBottom: 14 }}>
                          {daysUntilNext !== null && (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontSize: 12, color: C.txtM }}>{t.progressNextReview}</span>
                              <span style={{ fontSize: 12, fontWeight: 600, color: daysUntilNext <= 0 ? C.warn : C.acc }}>{t.progressNextDays(Math.max(0, daysUntilNext))}</span>
                            </div>
                          )}
                          <div style={{ fontSize: 11, color: C.txtS, lineHeight: 1.4, marginTop: daysUntilNext !== null ? 4 : 0 }}>
                            {justDiscovered ? t.progressJustDiscovered : practicedToday ? t.progressAlreadyDone : t.progressCanPractice}
                          </div>
                        </div>
                      )}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {cats.map(c => (
                          <div key={c.key} onClick={() => launchCat(c.key)}
                            style={{ padding: "8px 10px", borderRadius: 8, background: C.s1, cursor: "pointer", transition: "border-color 0.15s", border: "1px solid transparent", display: "flex", alignItems: "center", gap: 6 }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = c.color; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = "transparent"; }}>
                            <span style={{ fontSize: 14 }}>{c.icon}</span>
                            <span style={{ fontSize: 11.5, fontWeight: 600, color: c.color }}>{c.label}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 14, paddingTop: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: C.txtM, marginBottom: 8 }}>{t.quickPractice}</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 6 }}>
                          {[
                            { k: "examples", l: t.moreExamples, i: "💡" },
                            { k: "realExamples", l: t.realExamples, i: "🔍" },
                            { k: "image", l: t.anImage, i: "📷" },
                            { k: "youglish", l: t.youglishBtn, i: "🎬" },
                            { k: "resources", l: t.onlineRes, i: "📚" },
                          ].filter(a => (a.k !== "resources" || recapCard?.type !== "vocab") && (a.k !== "image" || recapCard?.type === "vocab") && (a.k !== "youglish" || recapCard?.type === "vocab")).map(a => (
                            <button key={a.k} onClick={() => {
                              if (a.k === "youglish") {
                                setYouglishWord(recapCard.korean);
                              } else {
                                startRecapAction(a.k);
                              }
                            }}
                              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.s1, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", fontSize: 11.5, color: C.txt, textAlign: "left", transition: "border-color 0.15s" }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = C.acc; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
                              <span style={{ fontSize: 14, flexShrink: 0 }}>{a.i}</span>{a.l}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}

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


                {/* Full lesson (only for new/in_progress cards) */}
                {(migrateStatus(recapCard.status) === "new" || migrateStatus(recapCard.status) === "in_progress") && (
                  <button onClick={() => startLessonFromCard(recapCard)}
                    style={{ padding: "12px 16px", borderRadius: 10, background: C.acc, color: C.onAcc, border: "none", fontFamily: "'Plus Jakarta Sans'", fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "center", flexShrink: 0 }}>
                    🔄 {t.redoLesson}
                  </button>
                )}
              </div>
            </div>
          ) : lCard ? (
            <div style={{ flex: 1, display: "flex", overflow: "hidden", flexDirection: winW < 700 ? "column" : "row" }}>
              <div style={{ width: winW < 700 ? "100%" : "40%", maxHeight: winW < 700 ? "35%" : "none", flexShrink: 0, borderRight: winW >= 700 ? `1px solid ${C.border}` : "none", borderBottom: winW < 700 ? `1px solid ${C.border}` : "none", display: "flex", flexDirection: "column", background: C.s2 }}>
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
              <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.s1, minHeight: 0, position: "relative" }}>
                {lessonDone && !lessonSummary && (
                  <div style={{ position: "absolute", inset: 0, zIndex: 20, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
                    <div style={{ background: C.s2, borderRadius: 16, padding: "32px 40px", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
                      <div className="pulse" style={{ fontSize: 32, marginBottom: 12 }}>{"📝"}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.txt }}>{t.generating}</div>
                    </div>
                  </div>
                )}
                <div ref={msgsR} style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                  {conv.map((m, i) => (
                    <div key={i} ref={i === conv.length - 1 ? lastMsgRef : null}>
                      <Bubble revealAll={revealTr} onResourceClick={awardResourcePoint} imgLabels={{ other: t.otherImages, refine: t.refineImage, choose: t.imgChoose }} onMoreImages={m.images ? (refine) => moreImages("lesson", i, refine, m.imageWord || lCard?.korean) : undefined} onAttachImage={m.images && lCard?.type === "vocab" ? (im) => attachImage(lCard.korean, im) : undefined} msg={{ ...m, onSelect: m.role === "ai" && !m.selected && m.options ? (o) => pickOpt(i, o) : null }} />
                    </div>
                  ))}
                  {lLoad && !lessonDone && <div className="pulse" style={{ fontSize: 12, color: C.txtM, padding: 8 }}>{searching ? t.searching : t.thinking}</div>}
                  {/* LESSON SUMMARY */}
                  {lessonSummary && (
                    <div ref={summaryRef} style={{ background: C.s2, border: `1px solid ${(lessonSummary.error || lessonSummary.structuresLearned === "Error generating summary") ? C.warnB : C.okB}`, borderRadius: 10, padding: 16, margin: "4px 0" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.txt, marginBottom: 12 }}>📋 {t.summaryTitle}</div>
                      {(lessonSummary.error || lessonSummary.structuresLearned === "Error generating summary") ? (
                        <div>
                          <div style={{ fontSize: 12, color: C.warn, lineHeight: 1.6, marginBottom: 8 }}>
                            ⚠️ {lang === "fr" ? "Erreur lors de la génération du résumé" : lang === "ko" ? "요약 생성 중 오류" : "Error generating summary"}
                          </div>
                          {lessonSummary.error && (
                            <div style={{ fontSize: 11, color: C.txtM, lineHeight: 1.5, marginBottom: 12, background: C.s1, padding: "6px 10px", borderRadius: 6, fontFamily: "monospace", wordBreak: "break-all" }}>
                              {String(lessonSummary.error).substring(0, 200)}
                            </div>
                          )}
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button onClick={() => { setLessonSummary(null); setLessonDone(false); endLesson(); }}
                              style={{ padding: "6px 16px", borderRadius: 6, background: C.acc, color: C.onAcc, border: "none", fontFamily: "'Plus Jakarta Sans'", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                              🔄 {lang === "fr" ? "Réessayer" : lang === "ko" ? "다시 시도" : "Retry"}
                            </button>
                            <button onClick={() => { setLCard(null); setConv([]); setLessonDone(false); setLessonSummary(null); setView("library"); }}
                              style={{ padding: "6px 16px", borderRadius: 6, background: "none", border: `1px solid ${C.borderS}`, color: C.txtS, fontFamily: "'Plus Jakarta Sans'", fontSize: 12, cursor: "pointer" }}>
                              ← {lang === "fr" ? "Quitter" : lang === "ko" ? "닫기" : "Close"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize: 12.5, color: C.txt, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                            {renderMarkdown(lessonSummary.grammarRecap || lessonSummary.structuresLearned, revealTr)}
                          </div>
                          {pendingDerived.length > 0 && (
                            <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: C.txt, marginBottom: 3 }}>💡 {t.derivedTitle}</div>
                              <div style={{ fontSize: 11.5, color: C.txtM, marginBottom: 10 }}>{t.derivedSub}</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                                {pendingDerived.map((d, i) => { const on = derivedSel.has(i); return (
                                  <label key={i} style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "9px 11px", borderRadius: 9, cursor: "pointer", background: on ? C.stNewCard : C.s1, border: `1px solid ${on ? C.stNewB : C.border}`, transition: "background 0.12s" }}>
                                    <input type="checkbox" checked={on} onChange={() => { const ns = new Set(derivedSel); on ? ns.delete(i) : ns.add(i); setDerivedSel(ns); }} style={{ marginTop: 2, accentColor: C.acc, cursor: "pointer" }} />
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 14, color: C.txt }}>{d.korean}</div>
                                      {d.description && <div style={{ fontSize: 11.5, color: C.txtS, lineHeight: 1.5, marginTop: 2 }}>{d.description}</div>}
                                    </div>
                                  </label>
                                ); })}
                              </div>
                              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                                <button onClick={addSelectedDerived} disabled={derivedSel.size === 0}
                                  style={{ padding: "6px 15px", borderRadius: 6, border: "none", background: derivedSel.size ? C.acc : C.s1, color: derivedSel.size ? C.onAcc : C.txtM, fontFamily: "'Plus Jakarta Sans'", fontSize: 12, fontWeight: 500, cursor: derivedSel.size ? "pointer" : "default" }}>
                                  ➕ {t.derivedAdd(derivedSel.size)}
                                </button>
                                <button onClick={() => setDerivedSel(derivedSel.size === pendingDerived.length ? new Set() : new Set(pendingDerived.map((_, i) => i)))}
                                  style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.borderS}`, background: "none", color: C.txtS, fontFamily: "'Plus Jakarta Sans'", fontSize: 12, cursor: "pointer" }}>
                                  {derivedSel.size === pendingDerived.length ? t.derivedNone : t.derivedAll}
                                </button>
                                <button onClick={() => { setPendingDerived([]); setDerivedSel(new Set()); }}
                                  style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: "none", color: C.txtM, fontFamily: "'Plus Jakarta Sans'", fontSize: 12, cursor: "pointer" }}>
                                  {t.derivedSkip}
                                </button>
                              </div>
                            </div>
                          )}
                          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                            <button onClick={() => {
                              const cardId = data.cards.find(c => c.korean === lCard.korean)?.id;
                              exPrimaryWordRef.current = lCard.korean;
                              setLCard(null); setConv([]); setLessonDone(false); setLessonSummary(null); setPendingDerived([]); setDerivedSel(new Set());
                              if (cardId) {
                                skipExResetRef.current = true;
                                const eligible = data.cards.filter(x => (x.status === "studied" || x.status === "acquired") && (x.targetLang || "ko") === tl && x.id !== cardId);
                                const shuffled = eligible.sort(() => Math.random() - 0.5).slice(0, 5);
                                setExSel(new Set([cardId, ...shuffled.map(x => x.id)].filter(Boolean)));
                              }
                              setExStep("category"); setExCategory(null);
                              setView("exercise");
                            }}
                              style={{ padding: "6px 16px", borderRadius: 6, background: C.acc, color: C.onAcc, border: "none", fontFamily: "'Plus Jakarta Sans'", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                              ✏️ {t.moreExercises}
                            </button>
                            <button onClick={() => { setLCard(null); setConv([]); setLessonDone(false); setLessonSummary(null); setPendingDerived([]); setDerivedSel(new Set()); setView("import"); }}
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
                    if (aiTurns < 6) return null;
                    const showRes = lCard?.type !== "vocab";
                    const sBtn = { padding: "7px 14px", borderRadius: 20, border: `1px solid ${C.borderS}`, background: C.s2, color: C.txtS, fontFamily: "'Plus Jakarta Sans'", fontSize: 12, cursor: lLoad ? "default" : "pointer", opacity: lLoad ? 0.55 : 1 };
                    return (
                      <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.okB}`, background: C.okBg }}>
                        <div style={{ fontSize: 12, color: C.txtS, marginBottom: 8, textAlign: "center" }}>🎓 {t.wrapUpTitle}</div>
                        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "center" }}>
                          <button onClick={endLesson} disabled={lLoad}
                            style={{ padding: "7px 16px", borderRadius: 20, border: "none", background: lLoad ? C.s1 : C.ok, color: lLoad ? C.txtM : "#fff", fontFamily: "'Plus Jakarta Sans'", fontSize: 12, fontWeight: 600, cursor: lLoad ? "default" : "pointer" }}>✓ {t.endLesson}</button>
                          <button onClick={() => quickAct("examples")} disabled={lLoad} style={sBtn}>💡 {t.moreExamples}</button>
                          <button onClick={() => quickAct("exercise")} disabled={lLoad} style={sBtn}>✏️ {t.anExercise}</button>
                          {!showRes && <button onClick={() => quickAct("image")} disabled={lLoad} style={sBtn}>📷 {t.anImage}</button>}
                          {!showRes && <button onClick={() => setYouglishWord(lCard?.korean)} disabled={lLoad} style={sBtn}>🎬 {t.youglishBtn}</button>}
                          {showRes && <button onClick={() => quickAct("resources")} disabled={lLoad} style={sBtn}>📚 {t.onlineRes}</button>}
                        </div>
                      </div>
                    );
                  })()}
                  {tray && (
                    <div style={{ padding: "6px 10px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 5, flexWrap: "wrap", background: C.s1 }}>
                      {qa.filter(a => (a.k !== "resources" || lCard?.type !== "vocab") && (a.k !== "image" || lCard?.type === "vocab") && (a.k !== "youglish" || lCard?.type === "vocab")).map(a => (
                        <button key={a.k} onClick={() => a.k === "youglish" ? setYouglishWord(lCard?.korean) : quickAct(a.k)} disabled={lLoad}
                          style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", background: C.s2, border: `1px solid ${C.borderS}`, borderRadius: 20, fontFamily: "'Plus Jakarta Sans'", fontSize: 11.5, color: C.txtS, cursor: lLoad ? "default" : "pointer", opacity: lLoad ? 0.55 : 1 }}>
                          {a.i} {a.l}
                        </button>
                      ))}
                    </div>
                  )}
                  <div style={{ padding: "8px 10px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 6, background: C.s2, alignItems: "center", flexShrink: 0 }}>
                    <input value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMsg()} placeholder={lLoad ? t.thinking : t.askQuestion} disabled={lLoad}
                      style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif", fontSize: 14, color: C.txt, background: C.s1, outline: "none", opacity: lLoad ? 0.6 : 1 }} />
                    <button onClick={sendMsg} disabled={lLoad} style={{ width: 30, height: 30, background: lLoad ? C.s1 : C.acc, color: lLoad ? C.txtM : C.onAcc, border: "none", borderRadius: 6, cursor: lLoad ? "default" : "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>↑</button>
                    <button onClick={() => !lLoad && setTray(!tray)} disabled={lLoad} style={{ width: 30, height: 30, border: `1px solid ${C.borderS}`, borderRadius: 6, background: tray ? C.s1 : "none", cursor: lLoad ? "default" : "pointer", color: C.txtM, fontSize: 15, letterSpacing: 1, display: "flex", alignItems: "center", justifyContent: "center", opacity: lLoad ? 0.55 : 1 }}>···</button>
                  </div>
                </>)}
              </div>
            </div>
          ) : <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.txtM, fontSize: 13, flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 32 }}>📖</div>
                <div>{t.emptyLesson}</div>
                <button onClick={() => navTo("import")}
                  style={{ padding: "10px 22px", borderRadius: 10, background: C.acc, color: C.onAcc, border: "none", fontFamily: "'Plus Jakarta Sans'", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                  📝 {t.import}
                </button>
              </div>
        )}

        {/* EXERCISE */}
        {view === "exercise" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>
            {!exOn ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 24px", gap: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", maxWidth: 460, justifyContent: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 500, color: C.txt }}>{t.exerciseTitle}</div>
                  <button onClick={toggleExMusic} title={exMusic ? t.exMusicOn : t.exMusicOff}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 16, border: `1px solid ${exMusic ? C.acc : C.border}`, background: exMusic ? C.accBg : C.s1, color: exMusic ? C.acc : C.txtM, fontFamily: "'Plus Jakarta Sans'", fontSize: 11, cursor: "pointer" }}>
                    {exMusic ? "🎵" : "🔇"} {t.exMusicOn}
                  </button>
                </div>
                {exStep === "category" && (<>
                  <div style={{ fontSize: 12.5, color: C.txtS, textAlign: "center", maxWidth: 420, lineHeight: 1.6 }}>{t.exerciseSub}</div>
                  <div style={{ display: "flex", gap: 12, width: "100%", maxWidth: 460, flexWrap: "wrap" }}>
                    {[
                      { k: "CE", l: t.exCatCE, d: t.exCatCEDesc, i: "📖", clr: "#4A90D9" },
                      { k: "CO", l: t.exCatCO, d: t.exCatCODesc, i: "🎧", clr: "#E8A838" },
                      { k: "PE", l: t.exCatPE, d: t.exCatPEDesc, i: "✏️", clr: "#50B87A" },
                      { k: "PO", l: t.exCatPO, d: t.exCatPODesc, i: "🎤", clr: "#D96A6A" },
                    ].map(cat => (
                      <button key={cat.k} onClick={() => { setExCategory(cat.k); setExStep("exercise"); setExFilter("all"); }}
                        style={{ flex: "1 1 200px", background: C.s2, border: `2px solid ${C.border}`, borderRadius: 14, padding: "22px 16px", cursor: "pointer", textAlign: "center", fontFamily: "'Plus Jakarta Sans'", transition: "border-color 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = cat.clr} onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                        <div style={{ fontSize: 32, marginBottom: 10 }}>{cat.i}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.txt, marginBottom: 4 }}>{cat.l}</div>
                        <div style={{ fontSize: 11, color: C.txtS, lineHeight: 1.5 }}>{cat.d}</div>
                        <div style={{ marginTop: 8, fontSize: 10, color: cat.clr, fontWeight: 600, letterSpacing: 0.5 }}>{cat.k}</div>
                      </button>
                    ))}
                  </div>
                </>)}
                {exStep === "exercise" && (<>
                  <button onClick={() => { setExStep("category"); setExCategory(null); }}
                    style={{ alignSelf: "flex-start", padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.s1, color: C.txtS, fontSize: 11, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>
                    ← {t.exBackToCat}
                  </button>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.txt }}>{exCategory === "CE" ? `📖 ${t.exCatCE}` : exCategory === "CO" ? `🎧 ${t.exCatCO}` : exCategory === "PE" ? `✏️ ${t.exCatPE}` : `🎤 ${t.exCatPO}`}</div>
                  <div style={{ fontSize: 12.5, color: C.txtM }}>{t.exPickExercise}</div>
                  <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 460, flexWrap: "wrap" }}>
                    {(exCategory === "CE" ? [
                      { k: "flash", l: t.exFlash, d: t.exFlashDesc, i: "🃏", vocabOnly: true },
                      { k: "match", l: t.exMatch, d: t.exMatchDesc, i: "🔗", vocabOnly: true },
                      ...(GENDERED_LANGS.has(tl) ? [{ k: "gender", l: t.exGender, d: t.exGenderDesc, i: "🔤", vocabOnly: true }] : []),
                      { k: "qcm", l: t.qcm, d: t.qcmDesc, i: "🔀", ai: true },
                      { k: "fill", l: t.fillBlanks, d: t.fillDesc, i: "🔄", ai: true },
                    ] : exCategory === "CO" ? [
                      { k: "youglish", l: t.exYouglish, d: t.exYouglishDesc, i: "🎬", vocabOnly: true },
                      { k: "dictation", l: t.exDictation, d: t.exDictationDesc, i: "🎧", disabled: true },
                    ] : exCategory === "PE" ? [
                      { k: "imgwrite", l: t.exImgWrite, d: t.exImgWriteDesc, i: "🖼️", vocabOnly: true },
                      { k: "cross", l: t.exCross, d: t.exCrossDesc, i: "🧩", vocabOnly: true },
                      { k: "story", l: t.story, d: t.storyDesc, i: "✍️", ai: true },
                      { k: "dialoguefill", l: t.exDialogueFill, d: t.exDialogueFillDesc, i: "💬", ai: true },
                    ] : [
                    ]).map(m => {
                      const selCards = exPreselectedRef.current ? allCards.filter(c => exSel.has(c.id)) : allCards.filter(c => (c.targetLang || "ko") === tl && (c.status === "studied" || c.status === "acquired"));
                      const noVocab = m.vocabOnly && !selCards.some(c => c.type === "vocab");
                      const off = m.disabled || noVocab;
                      return (
                      <button key={m.k} onClick={() => {
                        if (off) return;
                        setExMode(m.k);
                        if (m.vocabOnly) setExFilter("vocab"); else setExFilter("all");
                        if (m.k === "youglish" && exPrimaryWordRef.current) { setYouglishWord(exPrimaryWordRef.current); }
                        setExStep("cards");
                      }}
                        style={{ flex: "1 1 130px", background: C.s2, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, cursor: off ? "default" : "pointer", textAlign: "center", fontFamily: "'Plus Jakarta Sans'", opacity: off ? 0.45 : 1, position: "relative" }}>
                        {m.ai && <div style={{ position: "absolute", top: 8, right: 8, fontSize: 9, background: "#EDE9FE", color: "#7C3AED", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>IA</div>}
                        <div style={{ fontSize: 24, marginBottom: 8 }}>{m.i}</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: C.txt, marginBottom: 3 }}>{m.l}</div>
                        <div style={{ fontSize: 11, color: C.txtS, lineHeight: 1.5 }}>{m.d}</div>
                        {m.disabled && <div style={{ fontSize: 9, color: C.txtM, marginTop: 6, fontStyle: "italic" }}>bientot</div>}
                        {noVocab && <div style={{ fontSize: 9, color: C.txtM, marginTop: 6, fontStyle: "italic" }}>{t.exVocabOnly}</div>}
                      </button>
                      );
                    })}
                  </div>
                </>)}
                {exStep === "cards" && (<>
                  <div style={{ display: "flex", gap: 8, alignSelf: "flex-start" }}>
                    <button onClick={() => setExStep("exercise")}
                      style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.s1, color: C.txtS, fontSize: 11, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>
                      ← {t.exBackToEx}
                    </button>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.txt }}>{
                    { flash: `🃏 ${t.exFlash}`, match: `🔗 ${t.exMatch}`, gender: `🔤 ${t.exGender}`, qcm: `🔀 ${t.qcm}`, fill: `🔄 ${t.fillBlanks}`, youglish: `🎬 ${t.exYouglish}`, dictation: `🎧 ${t.exDictation}`, imgwrite: `🖼️ ${t.exImgWrite}`, cross: `🧩 ${t.exCross}`, story: `✍️ ${t.story}`, dialoguefill: `💬 ${t.exDialogueFill}` }[exMode] || (exCategory === "CE" ? `📖 ${t.exCatCE}` : exCategory === "CO" ? `🎧 ${t.exCatCO}` : exCategory === "PE" ? `✏️ ${t.exCatPE}` : `🎤 ${t.exCatPO}`)
                  }</div>
                  <div style={{ fontSize: 12.5, color: C.txtM }}>{t.exPickCards}</div>
                  {exMode === "youglish" ? (
                    <div style={{ width: "100%", maxWidth: 460 }}>
                      {exerciseCards.filter(c => c.type === "vocab").length === 0
                        ? <div style={{ fontSize: 12, color: C.txtM, padding: 12, textAlign: "center" }}>{t.noAcquired}</div>
                        : <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {exerciseCards.filter(c => c.type === "vocab").map(c => (
                              <button key={c.id} onClick={() => { setYouglishWord(c.korean); }}
                                style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", border: `1px solid ${C.border}`, borderRadius: 6, background: C.s2, fontFamily: tFont, fontSize: 12.5, color: C.txt, cursor: "pointer" }}>
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.ok }} />{c.korean}
                              </button>
                            ))}
                          </div>
                      }
                    </div>
                  ) : (() => {
                    const visibleCards = exMode === "imgwrite" ? exerciseCards.filter(c => c.images && c.images.length > 0) : exerciseCards;
                    return (<>
                    <div style={{ width: "100%", maxWidth: 460 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: C.txtM }}>{t.availableCards}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          {visibleCards.length > 0 && (
                            <button onClick={() => { const n = Math.min(3 + Math.floor(Math.random() * 3), visibleCards.length); setExSel(new Set(shuffle(visibleCards).slice(0, n).map(c => c.id))); }}
                              style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.s1, color: C.txtS, fontSize: 11, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>
                              🎲 {t.exRandom}
                            </button>
                          )}
                          {!["flash", "imgwrite", "match", "cross"].includes(exMode) && (
                            <div style={{ display: "flex", gap: 2, background: C.s1, borderRadius: 6, padding: 2, border: `1px solid ${C.border}` }}>
                              {[["all", t.filterAll], ["grammar", t.filterGrammar], ["vocab", t.filterVocab]].map(([k, label]) => (
                                <button key={k} onClick={() => setExFilter(k)}
                                  style={{ padding: "3px 10px", borderRadius: 4, border: "none", fontSize: 11, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", background: exFilter === k ? C.s2 : "transparent", color: exFilter === k ? C.acc : C.txtM, fontWeight: exFilter === k ? 500 : 400, boxShadow: exFilter === k ? "0 1px 3px rgba(0,0,0,0.06)" : "none" }}>
                                  {label}
                                </button>
                              ))}
                            </div>
                          )}
                          {allTags.length > 0 && (
                            <select value={exTagFilter || ""} onChange={e => setExTagFilter(e.target.value || null)}
                              style={{ padding: "3px 8px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 11, fontFamily: "'Plus Jakarta Sans'", color: exTagFilter ? C.acc : C.txtM, background: C.s1, cursor: "pointer", outline: "none", appearance: "auto" }}>
                              <option value="">{t.allTags}</option>
                              <option value="__none__">{t.noTags}</option>
                              {allTags.map(tag => <option key={tag} value={tag}>#{tag}</option>)}
                            </select>
                          )}
                        </div>
                      </div>
                      {visibleCards.length === 0
                        ? <div style={{ fontSize: 12, color: C.txtM, padding: 12, textAlign: "center" }}>{exMode === "imgwrite" ? t.exNeedImages : t.noAcquired}</div>
                        : <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {visibleCards.map(c => (
                              <button key={c.id} onClick={() => { const ns = new Set(exSel); ns.has(c.id) ? ns.delete(c.id) : ns.add(c.id); setExSel(ns); }}
                                style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", border: `1px solid ${exSel.has(c.id) ? C.acc : C.border}`, borderRadius: 6, background: exSel.has(c.id) ? C.accBg : C.s2, fontFamily: tFont, fontSize: 12.5, color: C.txt, cursor: "pointer" }}>
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.ok }} />{c.korean}
                              </button>
                            ))}
                          </div>
                      }
                    </div>
                    {visibleCards.length > 0 && (
                      <button onClick={() => {
                        if (exSel.size === 0) return;
                        if (exMode === "fill" || exMode === "dialoguefill" || exMode === "story") { setExTheme(null); setExStep("theme"); }
                        else launchEx();
                      }} disabled={exSel.size === 0}
                        style={{ padding: "8px 22px", borderRadius: 6, border: "none", alignSelf: "flex-end", background: exSel.size > 0 ? C.acc : C.s1, color: exSel.size > 0 ? C.onAcc : C.txtM, fontFamily: "'Plus Jakarta Sans'", fontSize: 13, fontWeight: 500, cursor: exSel.size > 0 ? "pointer" : "default" }}>
                        ▶ {t.launchEx}
                      </button>
                    )}
                  </>); })()}
                </>)}
                {exStep === "theme" && (() => {
                  const allThemes = t.fillThemes || [];
                  const shuffled = [...allThemes].sort(() => Math.random() - 0.5);
                  const picks = shuffled.slice(0, 3);
                  return (<>
                    <button onClick={() => setExStep("cards")}
                      style={{ alignSelf: "flex-start", padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.s1, color: C.txtS, fontSize: 11, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>
                      ← {t.back}
                    </button>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.txt, marginTop: 4 }}>{t.fillThemeLabel}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 340, marginTop: 8 }}>
                      <button onClick={() => launchEx(null)}
                        style={{ padding: "16px 20px", borderRadius: 12, border: `2px solid ${C.acc}`, background: C.accBg, color: C.acc, fontFamily: "'Plus Jakarta Sans'", fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "center" }}>
                        🎲 {t.fillThemeRandom}
                      </button>
                      {picks.map(th => (
                        <button key={th} onClick={() => launchEx(th)}
                          style={{ padding: "16px 20px", borderRadius: 12, border: `1px solid ${C.border}`, background: C.s2, color: C.txt, fontFamily: "'Plus Jakarta Sans'", fontSize: 14, fontWeight: 500, cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = C.acc; e.currentTarget.style.background = C.accBg; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.s2; }}>
                          {th}
                        </button>
                      ))}
                    </div>
                  </>);
                })()}
              </div>
            ) : exMode === "match" ? (
              <MatchExercise cards={exerciseCards.filter(c => exSel.has(c.id))} tFont={tFont} t={t} onComplete={() => completeExercise("match", [...exSel])} onExit={() => { setExOn(false); setExStep("category"); setExCategory(null); }} />
            ) : exMode === "cross" ? (
              <div style={{ flex: 1, position: "relative" }}><CrosswordExercise cards={exerciseCards.filter(c => exSel.has(c.id))} tFont={tFont} t={t} onComplete={() => completeExercise("cross", [...exSel])} onExit={() => { setExOn(false); setExStep("category"); setExCategory(null); }} /></div>
            ) : exMode === "gender" ? (
              <GenderExercise cards={exerciseCards.filter(c => exSel.has(c.id))} tFont={tFont} t={t} lang={lang}
                onComplete={() => completeExercise("gender", [...exSel])}
                onExit={() => { setExOn(false); setExStep("category"); setExCategory(null); }} />
            ) : exMode === "flash" ? (
              <FlashcardExercise cards={exerciseCards.filter(c => exSel.has(c.id))} tFont={tFont} t={t} onComplete={() => completeExercise("flash", [...exSel])} onExit={() => { setExOn(false); setExStep("category"); setExCategory(null); }} />
            ) : exMode === "imgwrite" ? (
              <ImageWriteExercise cards={exerciseCards.filter(c => exSel.has(c.id))} tFont={tFont} t={t} onComplete={() => completeExercise("imgwrite", [...exSel])} onExit={() => { setExOn(false); setExStep("category"); setExCategory(null); }} />
            ) : (exMode === "fill" || exMode === "dialoguefill") && fillData ? (
              <FillStoryExercise data={fillData} cards={exerciseCards.filter(c => exSel.has(c.id))} tFont={tFont} t={t} lang={lang} tl={tl} mode={exMode}
                onComplete={(usedIds) => completeExercise(exMode, usedIds)}
                onExit={() => { setExOn(false); setFillData(null); setExStep("category"); setExCategory(null); }}
                onRestart={() => { setFillData(null); setExOn(false); setExStep("theme"); }}
                onAddVocab={addWordToVocab} />
            ) : (exMode === "fill" || exMode === "dialoguefill") && exLoad ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
                <div className="pulse" style={{ fontSize: 13, color: C.txtM }}>{t.thinking}</div>
                <button onClick={() => { setExOn(false); setExStep("category"); setExCategory(null); }} style={{ fontSize: 11, color: C.txtS, border: `1px solid ${C.border}`, borderRadius: 6, padding: "3px 9px", background: "#fff", cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>{"<-"} {t.back}</button>
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
                    <button onClick={() => { setExOn(false); setExStep("category"); setExCategory(null); }} style={{ fontSize: 11, color: C.txtS, border: `1px solid ${C.border}`, borderRadius: 6, padding: "3px 9px", background: "#fff", cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>← {t.back}</button>
                  </div>
                </div>
                <div ref={exR} style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
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
                        <button onClick={() => { setExOn(false); setExConv([]); setExDone(false); setExStep("category"); setExCategory(null); }}
                          style={{ padding: "8px 18px", borderRadius: 8, background: C.acc, color: C.onAcc, border: "none", fontFamily: "'Plus Jakarta Sans'", fontSize: 12.5, fontWeight: 500, cursor: "pointer" }}>
                          ▶ {t.newExercise}
                        </button>
                        <button onClick={() => { setExOn(false); setExConv([]); setExDone(false); setExStep("category"); setExCategory(null); setView("library"); }}
                          style={{ padding: "8px 18px", borderRadius: 8, background: "none", border: `1px solid ${C.borderS}`, color: C.txtS, fontFamily: "'Plus Jakarta Sans'", fontSize: 12.5, cursor: "pointer" }}>
                          📚 {t.backToLibrary}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {!exDone && <div style={{ padding: "8px 10px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 6, background: C.s2, alignItems: "center", flexShrink: 0 }}>
                  <input value={exInp} onChange={e => setExInp(e.target.value)} onKeyDown={e => e.key === "Enter" && !exLoad && exSend()} placeholder={exLoad ? t.thinking : (exConv.some(m => m.role === "ai" && m.options) ? t.askQuestion : t.yourAnswer)} disabled={exLoad}
                    style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 10px", fontFamily: "'Plus Jakarta Sans'", fontSize: 12, color: C.txt, background: C.s1, outline: "none", opacity: exLoad ? 0.6 : 1 }} />
                  <button onClick={exSend} disabled={exLoad} style={{ width: 30, height: 30, background: exLoad ? C.s1 : C.acc, color: exLoad ? C.txtM : C.onAcc, border: "none", borderRadius: 6, cursor: exLoad ? "default" : "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>↑</button>
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
                  onKeyDown={e => { if (e.key === "Enter" && feedInput.trim()) { setFeedCat("news"); loadFeed(feedInput.trim(), "news"); } }}
                  placeholder={t.feedSearch}
                  style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontFamily: "'Plus Jakarta Sans'", fontSize: 13, color: C.txt, background: C.s1, outline: "none" }} />
                <button onClick={() => { if (feedInput.trim()) { setFeedCat("news"); loadFeed(feedInput.trim(), "news"); } }}
                  style={{ width: 36, height: 36, background: C.acc, color: C.onAcc, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>🔍</button>
              </div>

              {/* Categories (Korean only) */}
              {tl === "ko" && (
                <div style={{ display: "flex", gap: 5, overflowX: "auto" }}>
                  {[["recap", t.feedCatRecap], ["sns", t.feedCatSns], ["masto", t.feedCatMasto], ["news", t.feedCatNews], ["press", t.feedCatPress]].map(([k, l]) => (
                    <button key={k} onClick={() => { setFeedCat(k); if (k === "recap") { if (!newsRecap) loadNewsRecap(); } else { setFeedItems([]); loadFeed(k === "news" ? (feedQuery || "") : "", k); } }}
                      style={{ padding: "4px 11px", borderRadius: 14, fontSize: 11.5, cursor: "pointer", whiteSpace: "nowrap", border: `1px solid ${feedCat === k ? C.acc : C.border}`, background: feedCat === k ? C.accBg : C.s1, color: feedCat === k ? C.acc : C.txtM, fontFamily: "'Plus Jakarta Sans'", flexShrink: 0 }}>
                      {l}
                    </button>
                  ))}
                </div>
              )}

              {/* Auto keywords — only the personalized News category uses them */}
              {feedKeywords.length > 0 && feedCat === "news" && (
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
              {/* Daily news recap (#57) — newspaper layout, Brave-sourced */}
              {feedCat === "recap" && (
                <div>
                  {newsRecapLoad && <div className="pulse" style={{ textAlign: "center", color: C.txtM, fontSize: 13, padding: 30 }}>{t.recapLoading}</div>}
                  {newsRecapErr && !newsRecapLoad && (
                    <div style={{ padding: 14, background: C.warnBg, border: `1px solid ${C.warnB}`, borderRadius: 10, fontSize: 12, color: C.warn, lineHeight: 1.6 }}>⚠️ {newsRecapErr}</div>
                  )}
                  {!newsRecapLoad && newsRecap && (() => {
                    const dateStr = new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : lang === "ko" ? "ko-KR" : "en-US", { weekday: "long", day: "numeric", month: "long" });
                    const serif = "Georgia, 'Times New Roman', 'Nanum Myeongjo', serif";
                    const story = (it, i, lead) => (
                      <div key={i} onClick={() => it.link && window.open(it.link, "_blank", "noopener,noreferrer")}
                        style={{ cursor: "pointer", padding: "12px 0", borderTop: i === 0 ? "none" : `1px solid ${C.border}` }}>
                        <div style={{ fontFamily: serif, fontSize: lead ? 19 : 16, fontWeight: 700, color: C.txt, lineHeight: 1.3, marginBottom: 5 }}>{it.title}</div>
                        {it.snippet && <div style={{ fontFamily: serif, fontSize: 13.5, color: C.txtS, lineHeight: 1.65, marginBottom: 6 }}>{it.snippet}</div>}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: C.txtM, fontFamily: "'Plus Jakarta Sans'" }}>
                          <span style={{ fontWeight: 600, color: C.acc, textTransform: "uppercase", letterSpacing: 0.4 }}>{it.source}</span>
                          {it.date && <span>· {it.date}</span>}
                        </div>
                      </div>
                    );
                    const section = (title, items, hint) => (
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontFamily: serif, fontSize: 12.5, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: C.txt, borderBottom: `2px solid ${C.txt}`, paddingBottom: 4, marginBottom: 2 }}>{title}</div>
                        {items.length ? items.map((it, i) => story(it, i, i === 0)) : <div style={{ fontSize: 12.5, color: C.txtM, padding: "12px 0", fontStyle: "italic" }}>{hint || t.recapEmpty}</div>}
                      </div>
                    );
                    return (
                      <div style={{ maxWidth: 640, margin: "0 auto", background: C.s2, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px" }}>
                        <div style={{ textAlign: "center", borderBottom: `3px double ${C.txt}`, paddingBottom: 10, marginBottom: 6 }}>
                          <div style={{ fontFamily: serif, fontSize: 26, fontWeight: 800, color: C.txt, letterSpacing: 0.5 }}>{t.recapMasthead}</div>
                          <div style={{ fontFamily: serif, fontSize: 11.5, color: C.txtM, marginTop: 3, fontStyle: "italic" }}>{t.recapEdition(dateStr)}</div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                          <button onClick={() => loadNewsRecap(true)} style={{ padding: "3px 10px", borderRadius: 12, border: `1px solid ${C.border}`, background: C.s1, color: C.txtM, fontSize: 11, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>↻ {t.recapRefresh}</button>
                        </div>
                        {!newsRecap.translated && (
                          <div style={{ fontSize: 11, color: C.warn, background: C.warnBg, border: `1px solid ${C.warnB}`, borderRadius: 8, padding: "6px 10px", marginBottom: 10, fontFamily: "'Plus Jakarta Sans'" }}>⚠️ {t.recapRawNote}</div>
                        )}
                        {section(t.recapGeneralTitle, newsRecap.general || [])}
                        {section(t.recapInterestTitle + ((newsRecap.interestLabel || newsRecap.interest) ? " · " + (newsRecap.interestLabel || newsRecap.interest) : ""), newsRecap.interestItems || [], newsRecap.interest ? t.recapEmpty : t.recapInterestHint)}
                      </div>
                    );
                  })()}
                </div>
              )}
              {feedCat !== "recap" && (<>
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
                    <div key={i}
                      onClick={() => { if (it.src) openThread(it); else if (it.link) window.open(it.link, "_blank", "noopener,noreferrer"); }}
                      style={{ display: "flex", gap: 11, background: C.s2, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, textDecoration: "none", transition: "border-color 0.15s", cursor: "pointer" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = C.acc; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
                      {it.image && (
                        <img src={it.image} alt="" loading="lazy"
                          style={{ width: 62, height: 62, borderRadius: 8, objectFit: "cover", flexShrink: 0, border: `1px solid ${C.border}`, background: C.s1 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 9.5, fontWeight: 500, padding: "2px 7px", borderRadius: 4, background: C.accBg, color: C.acc }}>{it.source}</span>
                          {it.author && <span style={{ fontSize: 10.5, color: C.txtM }}>{it.author}</span>}
                          {it.date && <span style={{ fontSize: 10.5, color: C.txtM, marginLeft: "auto" }}>{it.date}</span>}
                        </div>
                        <div style={{ fontFamily: tFont, fontSize: 14.5, fontWeight: 500, color: C.txt, lineHeight: 1.5, marginBottom: 6 }}>
                          {it.title}
                        </div>
                        {it.snippet && (
                          <div style={{ fontFamily: tFont, fontSize: 13, color: C.txtS, lineHeight: 1.9 }}>
                            {it.snippet}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </>)}
            </div>
          </div>
        )}

        {/* COMPREHENSION */}
        {view === "comprehension" && compSession && (
          <TextComprehension
            text={compSession.text}
            lang={lang} tl={tl} context={context} tFont={tFont} t={t}
            existingStudy={compSession.existing}
            onFinish={(result) => {
              const study = {
                id: compSession.existing?.id || (Date.now().toString() + Math.random().toString(36).slice(2, 5)),
                text: compSession.text,
                targetLang: tl || "ko",
                date: new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : lang === "ko" ? "ko-KR" : "en-US", { day: "numeric", month: "short", year: "numeric" }),
                level1Complete: result.level1Complete,
                level2Complete: result.level2Complete,
              };
              const existing = data.textStudies || [];
              const idx = existing.findIndex(s => s.id === study.id);
              const updated = idx >= 0 ? existing.map((s, i) => i === idx ? study : s) : [...existing, study];
              save({ ...data, textStudies: updated });
              setCompSession(null);
              setFlash(t.compSaved); setTimeout(() => setFlash(null), 2000);
              setView("library"); setLibView("sources");
            }}
            onExit={() => { setCompSession(null); setView("import"); }}
          />
        )}

        {/* GOALS */}
        {view === "goals" && (
          <div style={{ flex: 1, overflowY: "auto", display: "flex", justifyContent: "center" }}>
            <div style={{ width: "100%", maxWidth: 560, padding: "24px 20px 40px", display: "flex", flexDirection: "column", gap: 16 }}>

              {/* GOAL CREATE / EDIT */}
              {goalView === "create" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => setGoalView("list")} style={{ padding: "5px 11px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.s1, color: C.txtS, fontSize: 11.5, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>←</button>
                    <div style={{ fontSize: 16, fontWeight: 600, color: C.txt }}>{t.goalCreate}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: C.txtM, marginBottom: 4, display: "block" }}>{t.goalName}</label>
                    <input value={goalForm.name} onChange={e => setGoalForm({ ...goalForm, name: e.target.value })} placeholder={t.goalNamePh}
                      style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif", color: C.txt, background: C.s1, outline: "none" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: C.txtM, marginBottom: 4, display: "block" }}>{t.goalDeadline}</label>
                    <input type="date" value={goalForm.deadline} onChange={e => setGoalForm({ ...goalForm, deadline: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif", color: C.txt, background: C.s1, outline: "none" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: C.txtM, marginBottom: 6, display: "block" }}>{t.goalCards} ({goalPickSel.size})</label>
                    {/* Tag filter */}
                    {(() => {
                      const availCards = data.cards.filter(c => !c.goalId);
                      const allTags = [...new Set(availCards.flatMap(c => c.tags || []))].sort();
                      if (!allTags.length) return null;
                      return (
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
                          <button onClick={() => setGoalPickTag(null)}
                            style={{ padding: "3px 10px", borderRadius: 10, border: `1px solid ${!goalPickTag ? C.acc : C.border}`, background: !goalPickTag ? C.accBg : C.s1, color: !goalPickTag ? C.acc : C.txtM, fontSize: 10.5, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>
                            {t.bulkTagSelectAll}
                          </button>
                          {allTags.map(tag => (
                            <button key={tag} onClick={() => setGoalPickTag(goalPickTag === tag ? null : tag)}
                              style={{ padding: "3px 10px", borderRadius: 10, border: `1px solid ${goalPickTag === tag ? C.acc : C.border}`, background: goalPickTag === tag ? C.accBg : C.s1, color: goalPickTag === tag ? C.acc : C.txtM, fontSize: 10.5, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>
                              #{tag}
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                    <div style={{ maxHeight: 260, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 8, background: C.s1 }}>
                      {(() => {
                        const filtered = data.cards.filter(c => !c.goalId).filter(c => !goalPickTag || (c.tags || []).includes(goalPickTag));
                        if (!filtered.length) return <div style={{ padding: 16, fontSize: 12, color: C.txtM, textAlign: "center" }}>{t.goalNoCards}</div>;
                        return filtered.map(c => (
                          <div key={c.id} onClick={() => { const s = new Set(goalPickSel); s.has(c.id) ? s.delete(c.id) : s.add(c.id); setGoalPickSel(s); }}
                            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer", borderBottom: `1px solid ${C.border}`, background: goalPickSel.has(c.id) ? C.accBg : "transparent" }}>
                            <span style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, border: `1px solid ${goalPickSel.has(c.id) ? C.acc : C.borderS}`, background: goalPickSel.has(c.id) ? C.acc : "transparent", color: C.onAcc }}>{goalPickSel.has(c.id) ? "✓" : ""}</span>
                            <span style={{ fontFamily: tFont, fontSize: 14, color: C.txt }}>{c.korean}</span>
                            {(c.tags || []).length > 0 && <span style={{ fontSize: 9.5, color: C.txtM, marginLeft: "auto", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(c.tags || []).map(tg => "#" + tg).join(" ")}</span>}
                            <span style={{ fontSize: 11, color: C.txtM, flexShrink: 0 }}>{c.type === "grammar" ? "📐" : "📝"}</span>
                          </div>
                        ));
                      })()}
                    </div>
                    {data.cards.filter(c => !c.goalId).length > 0 && (
                      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                        <button onClick={() => { const filtered = data.cards.filter(c => !c.goalId).filter(c => !goalPickTag || (c.tags || []).includes(goalPickTag)); setGoalPickSel(new Set([...goalPickSel, ...filtered.map(c => c.id)])); }}
                          style={{ fontSize: 11, color: C.acc, background: "none", border: "none", cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>{t.bulkTagSelectAll}</button>
                        <button onClick={() => { if (goalPickTag) { const filtered = data.cards.filter(c => !c.goalId && (c.tags || []).includes(goalPickTag)); const s = new Set(goalPickSel); filtered.forEach(c => s.delete(c.id)); setGoalPickSel(s); } else { setGoalPickSel(new Set()); } }}
                          style={{ fontSize: 11, color: C.txtM, background: "none", border: "none", cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>{t.bulkTagNone}</button>
                      </div>
                    )}
                  </div>

                  {/* Screenshot import */}
                  <div style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
                    {!goalImpStep && (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: `2px dashed ${C.borderS}`, background: C.s1, color: C.txtS, fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", width: "100%", justifyContent: "center" }}>
                          📷 {t.goalImportScreenshots}
                          <input type="file" accept="image/*" multiple onChange={onGoalImagePick} style={{ display: "none" }} />
                        </label>
                        <div style={{ fontSize: 11, color: C.txtM }}>{t.goalImportPaste}</div>
                      </div>
                    )}
                    {goalImpStep === "ocr" && (
                      <div style={{ textAlign: "center", padding: "12px 0" }}>
                        <div className="pulse" style={{ fontSize: 13, color: C.txtS }}>📷 {t.goalImportOcr}</div>
                      </div>
                    )}
                    {goalImpStep === "scanning" && (
                      <div style={{ textAlign: "center", padding: "12px 0" }}>
                        <div className="pulse" style={{ fontSize: 13, color: C.txtS }}>✨ {t.goalImportScanning}{goalImpProgress ? ` (${goalImpProgress.current}/${goalImpProgress.total})` : ""}</div>
                      </div>
                    )}
                    {goalImpStep === "picks" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: C.txt }}>{t.bulkPickTitle} ({goalImpFound.length})</div>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button onClick={() => setGoalImpSel(new Set(goalImpFound.map((_, i) => i)))} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, border: `1px solid ${C.border}`, background: C.s1, color: C.txtS, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>{t.filterAll || "Tout"}</button>
                            <button onClick={() => setGoalImpSel(new Set())} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, border: `1px solid ${C.border}`, background: C.s1, color: C.txtS, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>0</button>
                          </div>
                        </div>
                        <div style={{ maxHeight: 260, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 6, background: C.s1 }}>
                          {goalImpFound.map((v, i) => {
                            const on = goalImpSel.has(i);
                            const isVocab = v.type === "vocab";
                            return (
                              <div key={i} onClick={() => { const s = new Set(goalImpSel); s.has(i) ? s.delete(i) : s.add(i); setGoalImpSel(s); }}
                                style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", cursor: "pointer", borderBottom: `1px solid ${C.border}`, background: on ? C.accBg : "transparent" }}>
                                <span style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, border: `1px solid ${on ? C.acc : C.borderS}`, background: on ? C.acc : "transparent", color: C.onAcc }}>{on ? "✓" : ""}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontFamily: tFont, fontSize: 13.5, color: C.txt }}>{v.korean || v.word}</div>
                                  <div style={{ fontSize: 10.5, color: C.txtS, marginTop: 1 }}>{lang === "fr" ? v.meaning_fr : (v.meaning_en || v.meaning_fr)}</div>
                                </div>
                                <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, flexShrink: 0, background: isVocab ? C.proBg : C.accBg, color: isVocab ? C.pro : C.acc }}>{isVocab ? t.importModeVocab : t.importModeGrammar}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={goalImportConfirm} disabled={!goalImpSel.size}
                            style={{ flex: 1, padding: "7px 14px", borderRadius: 6, border: "none", background: goalImpSel.size ? C.acc : C.s1, color: goalImpSel.size ? C.onAcc : C.txtM, fontSize: 12, fontWeight: 500, cursor: goalImpSel.size ? "pointer" : "default", fontFamily: "'Plus Jakarta Sans'" }}>
                            📥 {t.goalImportConfirm} ({goalImpSel.size})
                          </button>
                          <button onClick={() => { setGoalImpStep(null); setGoalImpFound([]); setGoalImpSel(new Set()); }}
                            style={{ padding: "7px 14px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.s1, color: C.txtS, fontSize: 12, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>
                            {t.goalImportCancel}
                          </button>
                        </div>
                        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6, border: `1px dashed ${C.borderS}`, background: "transparent", color: C.txtM, fontSize: 11, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", alignSelf: "flex-start" }}>
                          + 📷
                          <input type="file" accept="image/*" multiple onChange={async (e) => {
                            const files = [...(e.target.files || [])]; e.target.value = "";
                            if (!files.length) return;
                            setGoalImpStep("ocr");
                            try {
                              let combined = "";
                              for (let i = 0; i < files.length; i++) {
                                const { base64, mimeType } = await fileToScaledBase64(files[i], 1600);
                                const text = await extractImageText(base64, mimeType, getTargetLangName(tl, "en"));
                                if (text && text.trim()) combined += (combined ? "\n" : "") + text;
                              }
                              if (!combined.trim()) { setGoalImpStep("picks"); return; }
                              setGoalImpStep("scanning");
                              const items = dedupeExtracted(await analyzeBulk(combined, data.cards, lang, context, tl, (cur, tot) => setGoalImpProgress({ current: cur, total: tot })), data.cards);
                              setGoalImpProgress(null);
                              const merged = [...goalImpFound];
                              for (const it of items) { if (!merged.find(m => (m.korean || m.word) === (it.korean || it.word))) merged.push(it); }
                              setGoalImpFound(merged);
                              setGoalImpSel(new Set(merged.map((_, i) => i)));
                              setGoalImpStep("picks");
                            } catch (err) { console.error(err); alert(err.message); setGoalImpStep("picks"); }
                          }} style={{ display: "none" }} />
                        </label>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button disabled={!goalForm.name.trim() || !goalForm.deadline} onClick={() => createGoal(goalForm.name.trim(), goalForm.deadline, goalPickSel)}
                      style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "none", background: goalForm.name.trim() && goalForm.deadline ? C.acc : C.s1, color: goalForm.name.trim() && goalForm.deadline ? C.onAcc : C.txtM, fontSize: 13, fontWeight: 500, cursor: goalForm.name.trim() && goalForm.deadline ? "pointer" : "default", fontFamily: "'Plus Jakarta Sans'" }}>
                      {t.goalSave}
                    </button>
                    <button onClick={() => setGoalView("list")}
                      style={{ padding: "10px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.s1, color: C.txtS, fontSize: 13, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>
                      {t.goalCancel}
                    </button>
                  </div>
                </div>
              )}

              {/* GOAL DETAIL */}
              {goalView === "detail" && (() => {
                const goal = goals.find(g => g.id === goalEditId);
                if (!goal) return <div style={{ fontSize: 13, color: C.txtM }}>{t.goalEmpty}</div>;
                const prog = goalProgress(goal);
                const daily = goalDailyTarget(goal);
                const dLeft = goalDaysLeft(goal);
                const overdue = dLeft <= 0 && !goal.trophyDate;
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 24 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button onClick={() => window.history.back()} style={{ padding: "5px 11px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.s1, color: C.txtS, fontSize: 11.5, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>←</button>
                      <div style={{ fontSize: 16, fontWeight: 600, color: C.txt, flex: 1 }}>{goal.name}</div>
                      {overdue && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: C.warnBg, color: C.warn, fontWeight: 500 }}>{t.goalOverdue}</span>}
                    </div>

                    {/* Deadline + daily targets */}
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", flex: 1, minWidth: 140 }}>
                        <div style={{ fontSize: 10, color: C.txtM, fontWeight: 500, marginBottom: 4 }}>{t.goalDeadline}</div>
                        {goalEditingDeadline ? (
                          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                            <input type="date" id="goal-edit-date" defaultValue={goal.deadline}
                              style={{ padding: "5px 8px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, fontFamily: "'Plus Jakarta Sans'", color: C.txt, background: C.s1 }} />
                            <button onClick={() => { const v = document.getElementById("goal-edit-date")?.value; if (v) { extendGoalDeadline(goal.id, v); setGoalEditingDeadline(false); } }}
                              style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: C.acc, color: C.onAcc, fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>✓</button>
                            <button onClick={() => setGoalEditingDeadline(false)}
                              style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.s1, color: C.txtM, fontSize: 11, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>✕</button>
                          </div>
                        ) : (
                          <>
                            <div style={{ fontSize: 14, color: overdue ? C.warn : C.txt, fontWeight: 500 }}>{new Date(goal.deadline).toLocaleDateString(lang === "fr" ? "fr-FR" : lang === "ko" ? "ko-KR" : "en-US", { day: "numeric", month: "short", year: "numeric" })}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                              <span style={{ fontSize: 11, color: overdue ? C.warn : C.txtM }}>{t.goalDaysLeft(dLeft)}</span>
                              <button onClick={() => setGoalEditingDeadline(true)}
                                style={{ padding: "1px 6px", borderRadius: 4, border: `1px solid ${C.border}`, background: "none", color: C.txtM, fontSize: 9.5, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>✏️ {t.goalEditDeadline}</button>
                            </div>
                          </>
                        )}
                      </div>
                      <div style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", flex: 1, minWidth: 140 }}>
                        <div style={{ fontSize: 12, color: C.txtM, lineHeight: 1.6 }}>
                          {t.goalDailyTarget}{" "}
                          {daily.discover > 0 && <>{t.goalDiscoverPerDay(daily.discover)}, </>}
                          {daily.practice > 0 && <>{t.goalPracticePerDay(daily.practice)}. </>}
                          {t.goalRecommendR(daily.R)}
                        </div>
                      </div>
                    </div>

                    {/* Overdue: warn */}
                    {overdue && !goalEditingDeadline && (
                      <div style={{ background: C.warnBg, border: `1px solid ${C.warnB}`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: C.warn, fontWeight: 500 }}>⚠️ {t.goalExpired}</span>
                        <button onClick={() => setGoalEditingDeadline(true)}
                          style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: C.acc, color: C.onAcc, fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>{t.goalExtend}</button>
                      </div>
                    )}

                    {/* Today's cards for this goal (frozen daily set) */}
                    {(() => {
                      const todaySet = (data.goalToday || {})[goal.id];
                      if (!todaySet) return null;
                      const toDiscover = (todaySet.discoverIds || []).map(id => data.cards.find(c => c.id === id)).filter(Boolean);
                      const toPractice = (todaySet.practiceIds || []).map(id => data.cards.find(c => c.id === id)).filter(Boolean);
                      if (!toDiscover.length && !toPractice.length) return null;
                      const today = new Date().toISOString().slice(0, 10);
                      const isDone = (c) => {
                        const s = migrateStatus(c.status);
                        if (s === "studied" || s === "acquired") return true;
                        const p = c.progress || {};
                        return ["ce","co","pe","po"].some(k => (p[k] || []).includes(today));
                      };
                      return (
                        <div style={{ background: "linear-gradient(150deg, rgba(255,214,102,0.18), rgba(255,214,102,0.08))", border: "1px solid rgba(230,180,40,0.30)", borderRadius: 12, padding: 14 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#8a6d00", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                            ☀️ {t.goalTodayTitle}
                          </div>
                          {toDiscover.length > 0 && (
                            <div style={{ marginBottom: toPractice.length ? 10 : 0 }}>
                              <div style={{ fontSize: 10.5, fontWeight: 500, color: C.acc, marginBottom: 6 }}>📖 {t.goalTodayDiscover} ({toDiscover.filter(c => isDone(c)).length}/{toDiscover.length})</div>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 6 }}>
                                {toDiscover.map(c => { const done = isDone(c); return (
                                  <div key={c.id} onClick={() => openCardFresh(c)}
                                    style={{ background: done ? "rgba(52,199,89,0.12)" : "rgba(255,255,255,0.65)", border: `1px solid ${done ? "rgba(52,199,89,0.3)" : "rgba(230,180,40,0.25)"}`, borderRadius: 8, padding: "8px 10px", cursor: "pointer", transition: "transform 0.1s" }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = "none"; }}>
                                    <div style={{ fontFamily: tFont, fontSize: 13.5, color: done ? "#34C759" : C.txt }}>{done ? "✓ " : ""}{c.korean}</div>
                                  </div>
                                ); })}
                              </div>
                            </div>
                          )}
                          {toPractice.length > 0 && (
                            <div>
                              <div style={{ fontSize: 10.5, fontWeight: 500, color: C.ok, marginBottom: 6 }}>🔄 {t.goalTodayPractice} ({toPractice.filter(c => { const p = c.progress || {}; return ["ce","co","pe","po"].some(k => (p[k] || []).includes(today)); }).length}/{toPractice.length})</div>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 6 }}>
                                {toPractice.map(c => { const p = c.progress || {}; const done = ["ce","co","pe","po"].some(k => (p[k] || []).includes(today)); return (
                                  <div key={c.id} onClick={() => openCardFresh(c)}
                                    style={{ background: done ? "rgba(52,199,89,0.12)" : "rgba(255,255,255,0.65)", border: `1px solid ${done ? "rgba(52,199,89,0.3)" : "rgba(230,180,40,0.25)"}`, borderRadius: 8, padding: "8px 10px", cursor: "pointer", transition: "transform 0.1s" }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = "none"; }}>
                                    <div style={{ fontFamily: tFont, fontSize: 13.5, color: done ? "#34C759" : C.txt }}>{done ? "✓ " : ""}{c.korean}</div>
                                  </div>
                                ); })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Progress bars */}
                    <div style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: C.txtM, fontWeight: 500 }}>{t.goalProgress1}</span>
                          <span style={{ fontSize: 11, color: C.acc, fontWeight: 600 }}>{prog.discovered} {t.goalOf} {prog.total}</span>
                        </div>
                        <div style={{ height: 8, borderRadius: 4, background: C.s1, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${prog.pct1}%`, background: C.acc, borderRadius: 4, transition: "width 0.3s" }} />
                        </div>
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: C.txtM, fontWeight: 500 }}>{t.goalProgress3}</span>
                          <span style={{ fontSize: 11, color: C.pro, fontWeight: 600 }}>{prog.reviewsDone} {t.goalOf} {prog.reviewsTotal} ({prog.pctReviews}%)</span>
                        </div>
                        <div style={{ height: 8, borderRadius: 4, background: C.s1, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${prog.pctReviews}%`, background: C.pro, borderRadius: 4, transition: "width 0.3s" }} />
                        </div>
                      </div>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: C.txtM, fontWeight: 500 }}>{t.goalProgress2}</span>
                          <span style={{ fontSize: 11, color: C.ok, fontWeight: 600 }}>{prog.acquired} {t.goalOf} {prog.total}</span>
                        </div>
                        <div style={{ height: 8, borderRadius: 4, background: C.s1, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${prog.pct2}%`, background: C.ok, borderRadius: 4, transition: "width 0.3s" }} />
                        </div>
                      </div>
                    </div>


                    {/* Card list */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: C.txt }}>{t.goalCards}</div>
                        <button onClick={() => { setGoalCardPicker(true); setGoalPickSel(new Set()); }}
                          style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.acc}`, background: C.accBg, color: C.acc, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>+ {t.goalAddCards}</button>
                      </div>
                      {(goal.cardIds || []).length === 0 ? (
                        <div style={{ fontSize: 12, color: C.txtM, textAlign: "center", padding: 16 }}>{t.goalNoCards}</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 300, overflowY: "auto" }}>
                          {(goal.cardIds || []).map(id => { const c = data.cards.find(x => x.id === id); if (!c) return null; const si = statusInfo(c.status, t); return (
                            <div key={id} onClick={() => { openCardFresh(c); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.s2, cursor: "pointer" }}>
                              <span style={{ fontFamily: tFont, fontSize: 14, color: C.txt, flex: 1 }}>{c.korean}</span>
                              <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 8, background: si.bg, color: si.color }}>{si.label}</span>
                            </div>
                          ); })}
                        </div>
                      )}
                    </div>

                    {/* Card picker modal */}
                    {goalCardPicker && (
                      <div style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: C.txt, marginBottom: 4 }}>{t.goalPickCards}</div>
                        <div style={{ fontSize: 11, color: C.txtM, marginBottom: 8 }}>{t.goalPickSub}</div>
                        {(() => {
                          const availCards = data.cards.filter(c => !c.goalId || c.goalId === goal.id).filter(c => !(goal.cardIds || []).includes(c.id));
                          const allTags = [...new Set(availCards.flatMap(c => c.tags || []))].sort();
                          const filtered = availCards.filter(c => !goalPickTag || (c.tags || []).includes(goalPickTag));
                          return (<>
                            {allTags.length > 0 && (
                              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
                                <button onClick={() => setGoalPickTag(null)}
                                  style={{ padding: "3px 10px", borderRadius: 10, border: `1px solid ${!goalPickTag ? C.acc : C.border}`, background: !goalPickTag ? C.accBg : C.s1, color: !goalPickTag ? C.acc : C.txtM, fontSize: 10.5, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>
                                  {t.bulkTagSelectAll}
                                </button>
                                {allTags.map(tag => (
                                  <button key={tag} onClick={() => setGoalPickTag(goalPickTag === tag ? null : tag)}
                                    style={{ padding: "3px 10px", borderRadius: 10, border: `1px solid ${goalPickTag === tag ? C.acc : C.border}`, background: goalPickTag === tag ? C.accBg : C.s1, color: goalPickTag === tag ? C.acc : C.txtM, fontSize: 10.5, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>
                                    #{tag}
                                  </button>
                                ))}
                              </div>
                            )}
                            <div style={{ maxHeight: 200, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 6, background: C.s1, marginBottom: 8 }}>
                              {filtered.map(c => (
                                <div key={c.id} onClick={() => { const s = new Set(goalPickSel); s.has(c.id) ? s.delete(c.id) : s.add(c.id); setGoalPickSel(s); }}
                                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", cursor: "pointer", borderBottom: `1px solid ${C.border}`, background: goalPickSel.has(c.id) ? C.accBg : "transparent" }}>
                                  <span style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, border: `1px solid ${goalPickSel.has(c.id) ? C.acc : C.borderS}`, background: goalPickSel.has(c.id) ? C.acc : "transparent", color: C.onAcc }}>{goalPickSel.has(c.id) ? "✓" : ""}</span>
                                  <span style={{ fontFamily: tFont, fontSize: 13, color: C.txt }}>{c.korean}</span>
                                  {(c.tags || []).length > 0 && <span style={{ fontSize: 9.5, color: C.txtM, marginLeft: "auto", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(c.tags || []).map(tg => "#" + tg).join(" ")}</span>}
                                </div>
                              ))}
                            </div>
                            {availCards.length > 0 && (
                              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                                <button onClick={() => setGoalPickSel(new Set([...goalPickSel, ...filtered.map(c => c.id)]))}
                                  style={{ fontSize: 11, color: C.acc, background: "none", border: "none", cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>{t.bulkTagSelectAll}</button>
                                <button onClick={() => { if (goalPickTag) { const s = new Set(goalPickSel); filtered.forEach(c => s.delete(c.id)); setGoalPickSel(s); } else { setGoalPickSel(new Set()); } }}
                                  style={{ fontSize: 11, color: C.txtM, background: "none", border: "none", cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>{t.bulkTagNone}</button>
                              </div>
                            )}
                          </>);
                        })()}
                        <div style={{ display: "flex", gap: 8 }}>
                          <button disabled={!goalPickSel.size} onClick={() => addCardsToGoal(goal.id, goalPickSel)}
                            style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: goalPickSel.size ? C.acc : C.s1, color: goalPickSel.size ? C.onAcc : C.txtM, fontSize: 12, fontWeight: 500, cursor: goalPickSel.size ? "pointer" : "default", fontFamily: "'Plus Jakarta Sans'" }}>
                            + {t.goalAddCards} ({goalPickSel.size})
                          </button>
                          <button onClick={() => { setGoalCardPicker(false); setGoalPickSel(new Set()); setGoalPickTag(null); }}
                            style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.s1, color: C.txtS, fontSize: 12, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>{t.goalCancel}</button>
                        </div>
                      </div>
                    )}

                    {/* Delete */}
                    {goalDeleteConfirm === goal.id ? (
                      <div style={{ background: C.warnBg, border: `1px solid ${C.warnB}`, borderRadius: 10, padding: 14 }}>
                        <div style={{ fontSize: 12, color: C.warn, fontWeight: 500, marginBottom: 8 }}>{t.goalDeleteConfirm}</div>
                        <div style={{ fontSize: 12, color: C.txtM, marginBottom: 10 }}>{t.goalDeleteCards}</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button onClick={() => deleteGoal(goal.id, false)}
                            style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: C.acc, color: C.onAcc, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>{t.goalDeleteKeep}</button>
                          <button onClick={() => deleteGoal(goal.id, true)}
                            style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${C.warnB}`, background: "none", color: C.warn, fontSize: 12, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>{t.goalDeleteRemove}</button>
                          <button onClick={() => setGoalDeleteConfirm(null)}
                            style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: "none", color: C.txtM, fontSize: 12, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>{t.goalCancel}</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setGoalDeleteConfirm(goal.id)}
                        style={{ alignSelf: "flex-start", padding: "6px 14px", borderRadius: 6, border: `1px solid ${C.warnB}`, background: "none", color: C.warn, fontSize: 12, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>🗑 {t.goalDelete}</button>
                    )}

                    {/* Deadline reached popup */}
                    {goalDeadlinePopup && goalDeadlinePopup.goalId === goal.id && (
                      <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", padding: 20 }}>
                        <div style={{ background: C.s2, borderRadius: 16, padding: "28px 24px", maxWidth: 400, width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", fontFamily: "'Plus Jakarta Sans'" }}>
                          {goalDeadlinePopup.step === 1 && (
                            <>
                              <div style={{ fontSize: 32, textAlign: "center", marginBottom: 12 }}>{"🏁"}</div>
                              <div style={{ fontSize: 16, fontWeight: 600, color: C.txt, textAlign: "center", marginBottom: 6 }}>{t.goalDeadlineTitle}</div>
                              <div style={{ fontSize: 13, color: C.txtM, textAlign: "center", marginBottom: 20 }}>{t.goalDeadlineMsg}</div>
                              <div style={{ fontSize: 13, color: C.txt, marginBottom: 12 }}>{t.goalDeadlineTest}</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {[
                                  { key: "great", label: t.goalDeadlineGreat, emoji: "😊" },
                                  { key: "medium", label: t.goalDeadlineMedium, emoji: "😐" },
                                  { key: "bad", label: t.goalDeadlineBad, emoji: "😕" },
                                  { key: "notest", label: t.goalDeadlineNoTest, emoji: "💭" },
                                ].map(opt => (
                                  <button key={opt.key} onClick={() => setGoalDeadlinePopup({ ...goalDeadlinePopup, step: 2, feedback: opt.key })}
                                    style={{ padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.s1, color: C.txt, fontSize: 13, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8, fontFamily: "'Plus Jakarta Sans'" }}>
                                    <span>{opt.emoji}</span> {opt.label}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                          {goalDeadlinePopup.step === 2 && (() => {
                            const p = goalProgress(goal);
                            const replyMsg = goalDeadlinePopup.feedback === "great" ? t.goalDeadlineReplyGreat
                              : (goalDeadlinePopup.feedback === "medium" || goalDeadlinePopup.feedback === "bad") ? t.goalDeadlineReplyMedium
                              : null;
                            return (
                              <>
                                {replyMsg && <div style={{ fontSize: 13, color: C.acc, fontWeight: 500, marginBottom: 14, textAlign: "center" }}>{replyMsg}</div>}
                                <div style={{ fontSize: 13, color: C.txt, marginBottom: 10 }}>{t.goalDeadlineStats}</div>
                                <div style={{ background: C.s1, borderRadius: 10, padding: 14, marginBottom: 16 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                    <span style={{ fontSize: 12, color: C.txtM }}>{t.goalProgress1}</span>
                                    <span style={{ fontSize: 12, color: C.acc, fontWeight: 500 }}>{p.discovered}/{p.total} ({p.pct1}%)</span>
                                  </div>
                                  <div style={{ height: 5, borderRadius: 3, background: C.border, overflow: "hidden", marginBottom: 10 }}>
                                    <div style={{ height: "100%", width: `${p.pct1}%`, background: C.acc, borderRadius: 3 }} />
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                    <span style={{ fontSize: 12, color: C.txtM }}>{t.goalProgress3}</span>
                                    <span style={{ fontSize: 12, color: C.pro, fontWeight: 500 }}>{p.reviewsDone}/{p.reviewsTotal} ({p.pctReviews}%)</span>
                                  </div>
                                  <div style={{ height: 5, borderRadius: 3, background: C.border, overflow: "hidden", marginBottom: 10 }}>
                                    <div style={{ height: "100%", width: `${p.pctReviews}%`, background: C.pro, borderRadius: 3 }} />
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                    <span style={{ fontSize: 12, color: C.txtM }}>{t.goalProgress2}</span>
                                    <span style={{ fontSize: 12, color: C.ok, fontWeight: 500 }}>{p.acquired}/{p.total} ({p.pct2}%)</span>
                                  </div>
                                  <div style={{ height: 5, borderRadius: 3, background: C.border, overflow: "hidden" }}>
                                    <div style={{ height: "100%", width: `${p.pct2}%`, background: C.ok, borderRadius: 3 }} />
                                  </div>
                                </div>
                                <div style={{ fontSize: 13, color: C.txt, marginBottom: 12 }}>{t.goalDeadlineWhat}</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                  <button onClick={() => archiveGoal(goal.id)}
                                    style={{ padding: "10px 14px", borderRadius: 8, border: "none", background: C.acc, color: C.onAcc, fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left", fontFamily: "'Plus Jakarta Sans'" }}>
                                    {"🏆"} {t.goalDeadlineArchive}
                                  </button>
                                  <button onClick={() => { setGoalDeadlinePopup(null); setGoalEditingDeadline(true); }}
                                    style={{ padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.s1, color: C.txt, fontSize: 13, cursor: "pointer", textAlign: "left", fontFamily: "'Plus Jakarta Sans'" }}>
                                    {"📅"} {t.goalDeadlineExtend}
                                  </button>
                                  <button onClick={() => { deleteGoal(goal.id, true); setGoalDeadlinePopup(null); }}
                                    style={{ padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "none", color: C.txtM, fontSize: 13, cursor: "pointer", textAlign: "left", fontFamily: "'Plus Jakarta Sans'" }}>
                                    {"🗑️"} {t.goalDeadlineDelete} <span style={{ fontSize: 11, color: C.warn }}>{t.goalDeadlineDeleteWarn}</span>
                                  </button>
                                </div>
                                <button onClick={() => { setGoalDeadlinePopup(null); save({ ...data, goals: goals.map(g => g.id === goal.id ? { ...g, deadlineDismissed: true } : g) }); }}
                                  style={{ marginTop: 12, width: "100%", padding: "8px", borderRadius: 6, border: "none", background: "none", color: C.txtM, fontSize: 12, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>
                                  {"✕"} {t.goalCancel}
                                </button>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* GOAL LIST */}
              {goalView === "list" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: C.txt }}>🎯 {t.goalsTab}</div>
                    <button onClick={() => { setGoalView("create"); setGoalForm({ name: "", deadline: "" }); setGoalPickSel(new Set()); }}
                      style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: C.acc, color: C.onAcc, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>+ {t.goalCreate}</button>
                  </div>

                  {activeGoals.length === 0 && trophyGoals.length === 0 && (
                    <div style={{ textAlign: "center", padding: "40px 20px", color: C.txtM, fontSize: 13 }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
                      {t.goalEmpty}
                    </div>
                  )}

                  {/* Active goals */}
                  {activeGoals.map(goal => {
                    const prog = goalProgress(goal);
                    const daily = goalDailyTarget(goal);
                    const dLeft = goalDaysLeft(goal);
                    const overdue = dLeft <= 0;
                    return (
                      <div key={goal.id} onClick={() => { setGoalEditId(goal.id); setGoalView("detail"); window.history.pushState({ view: "goals", goalView: "detail", goalEditId: goal.id }, ""); }}
                        style={{ background: C.s2, border: `1px solid ${overdue ? C.warnB : C.border}`, borderRadius: 12, padding: 16, cursor: "pointer", transition: "border-color 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = C.acc; }} onMouseLeave={e => { e.currentTarget.style.borderColor = overdue ? C.warnB : C.border; }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: C.txt }}>{goal.name}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {overdue && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: C.warnBg, color: C.warn, fontWeight: 500 }}>{t.goalOverdue}</span>}
                            <span style={{ fontSize: 10, color: C.txtM }}>{t.goalDaysLeft(dLeft)}</span>
                          </div>
                        </div>
                        {/* Progress bars */}
                        <div style={{ marginBottom: 6 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span style={{ fontSize: 10, color: C.txtM }}>{t.goalProgress1}</span>
                            <span style={{ fontSize: 10, color: C.acc, fontWeight: 500 }}>{prog.pct1}%</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 3, background: C.s1, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${prog.pct1}%`, background: C.acc, borderRadius: 3, transition: "width 0.3s" }} />
                          </div>
                        </div>
                        <div style={{ marginBottom: 6 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span style={{ fontSize: 10, color: C.txtM }}>{t.goalProgress3}</span>
                            <span style={{ fontSize: 10, color: C.pro, fontWeight: 500 }}>{prog.pctReviews}%</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 3, background: C.s1, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${prog.pctReviews}%`, background: C.pro, borderRadius: 3, transition: "width 0.3s" }} />
                          </div>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span style={{ fontSize: 10, color: C.txtM }}>{t.goalProgress2}</span>
                            <span style={{ fontSize: 10, color: C.ok, fontWeight: 500 }}>{prog.pct2}%</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 3, background: C.s1, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${prog.pct2}%`, background: C.ok, borderRadius: 3, transition: "width 0.3s" }} />
                          </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 11, color: C.txtM }}>{t.goalCardCount(prog.total)}</span>
                          <span style={{ fontSize: 12, color: C.acc, fontWeight: 600 }}>{t.goalCardsPerDay(daily.total)}</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Trophy hall */}
                  {trophyGoals.length > 0 && (
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.txt, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>🏆 {t.goalTrophyHall}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {trophyGoals.map(goal => {
                          const prog = goalProgress(goal);
                          return (
                            <div key={goal.id} onClick={() => { setGoalEditId(goal.id); setGoalView("detail"); window.history.pushState({ view: "goals", goalView: "detail", goalEditId: goal.id }, ""); }}
                              style={{ background: C.okBg, border: `1px solid ${C.okB}`, borderRadius: 10, padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontSize: 24 }}>🏆</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: C.txt }}>{goal.name}</div>
                                <div style={{ fontSize: 11, color: C.txtM }}>{t.goalCompleted} {new Date(goal.trophyDate).toLocaleDateString(lang === "fr" ? "fr-FR" : lang === "ko" ? "ko-KR" : "en-US", { day: "numeric", month: "short", year: "numeric" })}</div>
                              </div>
                              <span style={{ fontSize: 11, color: C.ok, fontWeight: 500 }}>{t.goalCardCount(prog.total)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
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
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.s1 }}>
                  <span style={{ flex: 1, fontSize: 12.5, color: C.txtS }}>✓ {t.detailedDone_}</span>
                  <button onClick={() => setShowDetailed(true)}
                    style={{ flexShrink: 0, padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.borderS}`, background: C.s0, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", fontSize: 12, fontWeight: 500, color: C.txtS }}>
                    {t.editAnswers}
                  </button>
                </div>
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
                      {savedTag(key)}
                    </div>
                  ))}
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                    {[
                      ["bestMemory", t.bestMemory, t.bestMemoryPh],
                      ["worstMemory", t.worstMemory, t.worstMemoryPh],
                    ].map(([key, label, ph]) => (
                      <div key={key} style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 12, fontWeight: 500, color: C.txt, display: "block", marginBottom: 5 }}>{label}</label>
                        <textarea value={profileDraft[key] || ""} onChange={e => setProfileDraft({ ...profileDraft, [key]: e.target.value })} placeholder={ph} rows={2} style={fieldStyle} />
                        {savedTag(key)}
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
                  {savedTag("gender")}
                </div>
                <div style={{ flex: "0 0 90px" }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: C.txt, display: "block", marginBottom: 5 }}>{t.ageLabel}</label>
                  <input type="number" min="1" max="120" value={profileDraft.age || ""} onChange={e => setProfileDraft({ ...profileDraft, age: e.target.value })}
                    placeholder={t.agePlaceholder} style={fieldStyle} />
                  {savedTag("age")}
                </div>
                <div style={{ flex: "2 1 200px" }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: C.txt, display: "block", marginBottom: 5 }}>{t.nationalityLabel}</label>
                  <input value={profileDraft.nationality || ""} onChange={e => setProfileDraft({ ...profileDraft, nationality: e.target.value })}
                    placeholder={t.nationalityPlaceholder} style={fieldStyle} />
                  {savedTag("nationality")}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: C.txt, display: "block", marginBottom: 5 }}>{t.spokenLangsLabel}</label>
                <LanguagesTable value={profileDraft.languages} onChange={rows => setProfileDraft({ ...profileDraft, languages: rows })} t={t} />
                {savedTag("languages")}
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: C.txt, display: "block", marginBottom: 5 }}>{t.interestsLabel}</label>
                <textarea value={profileDraft.interests} onChange={e => setProfileDraft({ ...profileDraft, interests: e.target.value })}
                  placeholder={t.interestsPlaceholder} rows={3} style={fieldStyle} />
                {savedTag("interests")}
              </div>

              {/* Per-language profile section */}
              {langProfDraft && (() => {
                const tlPh = TARGET_LANGS[tl]?.placeholders?.[lang] || TARGET_LANGS[tl]?.placeholders?.en || {};
                return <>
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginTop: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.txt, marginBottom: 2 }}>
                      {t.langProfileTitle(TARGET_LANGS[tl]?.flag || "", TARGET_LANGS[tl]?.name?.[lang] || tl)}
                    </div>
                    <div style={{ fontSize: 11.5, color: C.txtS, lineHeight: 1.5, marginBottom: 12 }}>{t.langProfileSub}</div>
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: C.txt, display: "block", marginBottom: 5 }}>{t.langDailyLabel}</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input type="number" min="1" max="20" value={langProfDraft.dailyCount ?? 5}
                        onChange={e => setLangProfDraft({ ...langProfDraft, dailyCount: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
                        style={{ ...fieldStyle, width: 90 }} />
                      <span style={{ fontSize: 12, color: C.txtM }}>{t.today.toLowerCase()}</span>
                    </div>
                    {savedTag("lp_dailyCount")}
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: C.txt, display: "block", marginBottom: 5 }}>{"✨ " + t.langDreamLabel}</label>
                    <textarea value={langProfDraft.dream || ""} onChange={e => setLangProfDraft({ ...langProfDraft, dream: e.target.value })}
                      placeholder={tlPh.dream || t.dreamPlaceholder} rows={2} style={fieldStyle} />
                    {savedTag("lp_dream")}
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: C.txt, display: "block", marginBottom: 5 }}>{t.langLevelLabel}</label>
                    <input value={langProfDraft.level || ""} onChange={e => setLangProfDraft({ ...langProfDraft, level: e.target.value })}
                      placeholder={tlPh.level || t.levelPlaceholder} style={fieldStyle} />
                    {savedTag("lp_level")}
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: C.txt, display: "block", marginBottom: 5 }}>{t.langGoalsLabel}</label>
                    <textarea value={langProfDraft.goals || ""} onChange={e => setLangProfDraft({ ...langProfDraft, goals: e.target.value })}
                      placeholder={tlPh.goals || t.goalsPlaceholder} rows={2} style={fieldStyle} />
                    {savedTag("lp_goals")}
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: C.txt, display: "block", marginBottom: 5 }}>{t.langToolsLabel}</label>
                    <textarea value={langProfDraft.otherTools || ""} onChange={e => setLangProfDraft({ ...langProfDraft, otherTools: e.target.value })}
                      placeholder={t.otherToolsPh} rows={2} style={fieldStyle} />
                    {savedTag("lp_otherTools")}
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: C.txt, display: "block", marginBottom: 5 }}>{t.langNotesLabel}</label>
                    <textarea value={langProfDraft.learnerNotes || ""} onChange={e => setLangProfDraft({ ...langProfDraft, learnerNotes: e.target.value })}
                      placeholder={t.myNotesPlaceholder} rows={2} style={fieldStyle} />
                    {savedTag("lp_learnerNotes")}
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: C.txt, display: "block", marginBottom: 5 }}>{"👩‍🏫 " + t.langTeacherNotesLabel}</label>
                    <div style={{ fontSize: 12.5, color: langProfDraft.notes ? C.txtS : C.txtM, lineHeight: 1.6, whiteSpace: "pre-wrap", background: C.s1, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", minHeight: 40 }}>
                      {langProfDraft.notes || t.teacherNotesEmpty}
                    </div>
                  </div>
                </>;
              })()}

              <div style={{ fontSize: 11, color: C.txtM, lineHeight: 1.5, fontStyle: "italic" }}>
                💡 {t.profileAutoUpdate}
              </div>

              {/* Lesson history (filtered by current target language) */}
              {(() => {
                const tlSummaries = (data.summaries || []).filter(s => {
                  if (s.targetLang) return s.targetLang === tl;
                  const card = data.cards.find(c => c.korean === s.cardKorean);
                  return (card?.targetLang || "ko") === tl;
                });
                return tlSummaries.length > 0 ? (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: C.txt, marginBottom: 10 }}>{t.summaryHistory}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {[...tlSummaries].reverse().map((s, i) => (
                        <SummaryCard key={s.id || i} summary={s} t={t} lang={lang} />
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
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
