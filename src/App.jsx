import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { loadData, saveData, syncData, isSupabaseConfigured, DEFAULT_DATA, DEFAULT_PROFILE } from "./storage.js";

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
    moreExamples: "Plus d'exemples", onlineRes: "Ressources en ligne",
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
    welcomeSub: "Entre un code pour synchroniser tes données entre tous tes appareils. Utilise le même code partout.",
    welcomeNew: "Première fois ? Choisis n'importe quel mot ou phrase comme code.",
    welcomeReturning: "Tu as déjà un code ? Entre-le pour retrouver tes données.",
    welcomeStart: "Commencer",
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
    moreExamples: "More examples", onlineRes: "Online resources",
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
    welcomeSub: "Enter a code to sync your data across all your devices. Use the same code everywhere.",
    welcomeNew: "First time? Pick any word or phrase as your code.",
    welcomeReturning: "Already have a code? Enter it to get your data back.",
    welcomeStart: "Start",
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

// =============================================
// AI CALL (via serverless proxy)
// =============================================
async function callAI(systemPrompt, userMessage, maxTokens) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system: systemPrompt, messages: [{ role: "user", content: userMessage }], max_tokens: maxTokens || 1200 }),
  });
  const rawText = await res.text();
  if (!res.ok) throw new Error(rawText);
  let data;
  try { data = JSON.parse(rawText); } catch { throw new Error("Server response is not JSON: " + rawText.substring(0, 200)); }
  const text = (data.content || []).map((b) => b.text || "").join("\n");
  if (!text) throw new Error("Empty AI response. Raw: " + rawText.substring(0, 200));
  return text;
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
  const hasProfile = p.gender || p.age || p.nationality || p.level || p.interests || p.goals || p.notes;
  if (hasProfile) {
    ctx += "=== LEARNER PROFILE ===\n";
    if (p.gender) ctx += `Gender: ${p.gender}\n`;
    if (p.age) ctx += `Age: ${p.age}\n`;
    if (p.nationality) ctx += `Nationality / native language: ${p.nationality}\n`;
    if (p.level) ctx += `Level: ${p.level}\n`;
    if (p.interests) ctx += `Interests (use these for examples when possible): ${p.interests}\n`;
    if (p.goals) ctx += `Goals: ${p.goals}\n`;
    if (p.notes) ctx += `Additional notes: ${p.notes}\n`;
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
    const revCards = data.cards.filter(c => c.status === "review");
    const acqCards = data.cards.filter(c => c.status === "acquired");
    ctx += `=== CARD INVENTORY ===\n`;
    if (acqCards.length > 0) ctx += `Acquired (${acqCards.length}): ${acqCards.map(c => c.korean).join(", ")}\n`;
    if (revCards.length > 0) ctx += `Needs review (${revCards.length}): ${revCards.map(c => c.korean).join(", ")}\n`;
    ctx += "\n";
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
  return parseJSON(await callAI(sys, text));
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
- After each ${TL} example, add the ${L} translation in parentheses on the next line

IMPORTANT RULES:
- Do NOT name the grammar rule or give its official name yet
- Do NOT immediately explain what the structure means. Let the student figure it out first.
- The wrong MCQ options should be plausible but clearly distinguishable from the right answer
- Use "label" as the key name for each option's text

Return JSON: {"message": "your teaching text", "options": [{"label": "a) ...", "correct": false}, {"label": "b) ...", "correct": true}, {"label": "c) ...", "correct": false}]}`;
  return parseJSON(await callAI(sys, `Structure to teach: ${card.korean}
Meaning (do NOT reveal this to the student): ${d}
Example from the article: ${card.example_kr}
Article context:\n${(article || "").substring(0, 800)}`));
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
    examples: `The student wants more examples. Give 2-3 NEW example sentences using the structure "${card.korean}" in varied, real-life contexts (blog posts, conversations, social media). If you know their interests from the conversation or profile, tailor examples to those topics. For each example, write the Korean sentence, then the ${L} translation on the next line. After the examples, ask a new question to check understanding. Include MCQ options if appropriate.`,
    
    resources: `The student wants to find more examples online. Suggest 2-3 specific, actionable ways to find real Korean content using this structure. For example: specific search terms to use on Naver Blog (e.g. searching "${card.korean}" in quotes), YouTube channels, or web resources. Be specific, not generic. Then continue the lesson with a follow-up question.`,
    
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

  const sys = `You are a Socratic Korean teacher having an ongoing lesson about the structure "${card.korean}". Speak in ${L}. Be warm, patient, and encouraging. Write Korean on its own lines followed by translations.
${phaseGuide}

${instruction}

Return JSON: {"message": "your response"} or {"message": "your response", "options": [{"label": "a) ...", "correct": false}, ...]} if you include a question. Always use "label" (not "text") as the key for option text.`;
  
  return parseJSON(await callAI(sys, `Conversation so far:\n${hist}`));
}

async function genExercise(cards, mode, lang, context, tlCode) {
  const L = lang === "fr" ? "French" : "English";
  const TL = getTargetLangName(tlCode, "en");
  const structs = cards.map((c) => `- ${c.korean}: ${lang === "fr" ? c.description_fr : c.description_en} (example: ${c.example_kr})`).join("\n");
  
  const modes = {
    story: `STORY MODE: Create a creative writing prompt in ${L} that requires using ALL the listed structures naturally in a short paragraph (3-5 sentences). 
If you know the student's interests (see LEARNER PROFILE), set the scenario in a context they care about (e.g. writing a fan letter, a food blog, a travel diary).
Give the student:
1. A scenario/context personalized to their interests if possible
2. A starter sentence in Korean to help them begin
3. Clear instructions about which structures to incorporate and where they would fit naturally
The goal is for the student to write a coherent mini-text, not isolated sentences.`,

    qcm: `QUIZ MODE: Create 3 multiple-choice questions testing these structures. For EACH question:
1. Write a new Korean sentence (not from the original article) that uses one of the structures. Prefer contexts related to the student's interests when possible.
2. Ask what the sentence means or what nuance the structure adds
3. Provide 3 options where only one is correct
4. Make wrong options plausible but clearly different in meaning
Format all 3 questions in a single message. Use "label" as the key for option text. Only include options for the FIRST question (the student will answer one at a time).`,

    fill: `FILL-IN-THE-BLANK MODE: Create 3 sentences with blanks where the student must fill in the correct structure. For each:
1. Give a ${L} translation of the full sentence
2. Give the Korean sentence with a blank (use ______) where the structure should go
3. Provide the words around the blank so the student knows what form to use
Start with the easiest structure and increase difficulty. Present all 3 in your message.`
  };

  const sys = `You are a ${TL} language exercise designer. Speak in ${L}. Be clear and encouraging.

${context}
${modes[mode]}

Structures to practice:
${structs}

Return JSON: {"message": "your exercise content"} or {"message": "your exercise", "options": [{"label": "...", "correct": true/false}, ...]} if the exercise format includes MCQ. Always use "label" as the key for option text, and use boolean true/false for "correct".`;
  
  return parseJSON(await callAI(sys, `Generate the exercise now.`));
}

async function generateSummary(card, conv, lang) {
  const L = lang === "fr" ? "French" : "English";
  const hist = conv.map((m) => `${m.role === "ai" ? "Teacher" : "Student"}: ${m.content}${m.selected ? ` [chose: ${m.selected}]` : ""}`).join("\n");

  const sys = `You are an expert at analyzing language learning conversations. Read the full conversation between a Korean teacher and a student, then produce a structured summary of the lesson.

Be specific and concrete. Do not use vague statements like "the student understood well." Instead, describe exactly what they understood, what confused them, and what to work on next.

ALSO: carefully read the student's messages for any personal information they may have shared about themselves (hobbies, job, age, why they learn Korean, favorite artists, what they struggle with, etc.). Extract these as profile insights so we can remember them for future lessons.

Respond in ${L}.

Return JSON with these exact fields:
{
  "structuresLearned": "A specific summary of what the student demonstrated understanding of (mention the structure, the nuances they grasped, any connections they made)",
  "mistakesMade": "Specific errors, confusions, or hesitations the student showed. If none, write 'Aucune erreur notable' / 'No notable errors'",
  "nextSteps": "Concrete suggestions for what to study or practice next, based on what happened in this lesson",
  "profileInsights": {
    "interests": "Any new interests, hobbies, or preferences the student mentioned. Empty string if nothing new.",
    "level": "Any observation about the student's actual level based on their performance. Empty string if nothing.",
    "notes": "Any other personal info shared. Empty string if nothing."
  },
  "derivedStructures": [
    {
      "korean": "pattern name (e.g. 오도 가도 못하다)",
      "type": "grammar or expression",
      "description_fr": "one sentence in French",
      "description_en": "one sentence in English",
      "example_kr": "Korean example sentence from the conversation",
      "example_fr": "French translation",
      "example_en": "English translation"
    }
  ]
}

For "derivedStructures": include any related expressions, idioms, or derived patterns the TEACHER introduced during the lesson (variants, derived idioms, closely related structures). If none were introduced, return an empty array [].`;

  return parseJSON(await callAI(sys, `Structure studied: ${card.korean}\n\nFull conversation:\n${hist}`, 1000));
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
function renderMarkdown(text) {
  if (!text) return text;
  // Split by line to preserve pre-wrap behavior, then process each line
  const parts = [];
  // Regex handles: **bold**, *italic*, `code`, ~~strike~~
  // Order matters: ** before *, ~~ is independent
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|~~(.+?)~~)/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2] !== undefined) {
      // **bold**
      parts.push(<strong key={match.index} style={{ fontWeight: 600 }}>{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      // *italic*
      parts.push(<em key={match.index}>{match[3]}</em>);
    } else if (match[4] !== undefined) {
      // `code`
      parts.push(<code key={match.index} style={{ background: "rgba(0,0,0,0.06)", padding: "1px 4px", borderRadius: 3, fontSize: "0.9em", fontFamily: "monospace" }}>{match[4]}</code>);
    } else if (match[5] !== undefined) {
      // ~~strike~~
      parts.push(<del key={match.index} style={{ opacity: 0.6 }}>{match[5]}</del>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : text;
}

function Bubble({ msg }) {
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
        {ai ? renderMarkdown(msg.content) : msg.content}
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
                  {oLabel}
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
      <div style={{ position: "absolute", bottom: -12, right: -3, fontFamily: "'Noto Sans KR'", fontSize: 72, fontWeight: 500, color: C.acc, opacity: 0.07, lineHeight: 1, pointerEvents: "none", userSelect: "none" }}>
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
      <div style={{ fontFamily: "'Noto Sans KR'", fontSize: 17, color: C.txt, marginBottom: 3 }}>{card.korean}</div>
      <div style={{ fontSize: 11.5, color: C.txtS, lineHeight: 1.5, marginBottom: 8 }}>{card.description}</div>
      <div style={{ background: C.s1, borderRadius: 6, padding: "7px 9px", marginBottom: 8 }}>
        <div style={{ fontFamily: "'Noto Sans KR'", fontSize: 12.5, color: C.txt }}>{card.example_kr}</div>
        <div style={{ fontSize: 11, color: C.txtM, fontStyle: "italic", marginTop: 2 }}>{card.example_tr}</div>
      </div>
      {card.parentKorean && (
        <div style={{ fontSize: 10, color: C.acc, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ opacity: 0.6 }}>↳</span> {t.derivedFrom} <span style={{ fontFamily: "'Noto Sans KR'", fontWeight: 500 }}>{card.parentKorean}</span>
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
  return (
    <div style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", textAlign: "left" }}>
        <span style={{ fontFamily: "'Noto Sans KR'", fontSize: 14, color: C.txt, fontWeight: 500 }}>{summary.cardKorean}</span>
        <span style={{ fontSize: 11, color: C.txtM, marginLeft: "auto", flexShrink: 0 }}>{summary.date}</span>
        <span style={{ fontSize: 10, color: C.txtM, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: "0 14px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.ok, textTransform: "uppercase", marginBottom: 3 }}>{t.summaryLearned}</div>
            <div style={{ fontSize: 12, color: C.txt, lineHeight: 1.6 }}>{summary.structuresLearned}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.warn, textTransform: "uppercase", marginBottom: 3 }}>{t.summaryMistakes}</div>
            <div style={{ fontSize: 12, color: C.txt, lineHeight: 1.6 }}>{summary.mistakesMade}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.acc, textTransform: "uppercase", marginBottom: 3 }}>{t.summaryNext}</div>
            <div style={{ fontSize: 12, color: C.txt, lineHeight: 1.6 }}>{summary.nextSteps}</div>
          </div>
          {summary.conversationLength && (
            <div style={{ fontSize: 10, color: C.txtM }}>{summary.conversationLength} messages</div>
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
            <span style={{ fontFamily: "'Noto Sans KR'", fontSize: 14, color: C.txt, fontWeight: 500 }}>{card.korean}</span>
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
export default function App() {
  const [data, setData] = useState(DEFAULT_DATA);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("library");
  const [libView, setLibView] = useState("grid");
  const [langOpen, setLangOpen] = useState(false);
  const [targetLang, setTargetLang] = useState(null); // "ko", "de", etc.
  const [tlOpen, setTlOpen] = useState(false);
  const [syncId, setSyncId] = useState(() => localStorage.getItem("moa-sync-id") || "");
  const [syncInput, setSyncInput] = useState("");
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
  const [inp, setInp] = useState("");
  const [tray, setTray] = useState(false);
  const [lessonDone, setLessonDone] = useState(false);
  const [lessonSummary, setLessonSummary] = useState(null);
  const [lessonRestored, setLessonRestored] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const [recapCard, setRecapCard] = useState(null);

  // Exercise
  const [exMode, setExMode] = useState("story");
  const [exSel, setExSel] = useState(new Set());
  const [exConv, setExConv] = useState([]);
  const [exLoad, setExLoad] = useState(false);
  const [exInp, setExInp] = useState("");
  const [exOn, setExOn] = useState(false);

  // Profile
  const [profileDraft, setProfileDraft] = useState(null);
  const [profileSavedMsg, setProfileSavedMsg] = useState(false);

  const msgsR = useRef(null);
  const exR = useRef(null);
  const lastMsgRef = useRef(null);
  const lastExMsgRef = useRef(null);

  const lang = data.lang || "fr";
  const t = T[lang];
  const enabledTLs = data.targetLangs || [];
  const tl = targetLang || data.lastTargetLang || enabledTLs[0] || null;
  const tlConf = tl ? TARGET_LANGS[tl] : null;
  const tFont = tl ? getTargetFont(tl) : "'Plus Jakarta Sans'";
  const TLName = tl ? getTargetLangName(tl, lang) : "";

  // Filter cards by current target language
  const allCards = data.cards || [];
  const filteredCards = tl ? allCards.filter(c => (c.targetLang || "ko") === tl) : allCards;
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
        setLessonSummary(saved.lessonSummary || null);
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
          conv: conv.map(m => ({ role: m.role, content: m.content, options: m.options || null, selected: m.selected || null })),
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

  // Reset exercise
  useEffect(() => {
    if (view === "exercise") { setExSel(new Set(exerciseCards.map(c => c.id))); setExOn(false); setExConv([]); }
  }, [view, exerciseCards]);

  const save = useCallback((nd) => { setData(nd); saveData(nd, syncId); }, [syncId]);

  const handleSync = async () => {
    const id = syncInput.trim();
    if (!id) return;
    setSyncStatus("loading");
    try {
      const result = await syncData(id, null);
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
    catch { setConv([{ role: "ai", content: `Observons :\n\n${card.korean}\n\n${card.example_kr}\n\nQu'en penses-tu ?` }]); }
    setLLoad(false);
  };

  const reviewCard = (c) => {
    // Check if this card has any past summaries
    const cardSummaries = (data.summaries || []).filter(s => s.cardKorean === c.korean);
    if (cardSummaries.length > 0 && c.status !== "new" && c.status !== "review") {
      // Show recap screen instead of starting lesson directly
      setRecapCard(c);
      setShowRecap(true);
      setLCard(null); setConv([]); setLessonDone(false); setLessonSummary(null);
      setView("lesson");
      return;
    }
    // No summaries: start lesson directly
    startLessonFromCard(c);
  };

  const startLessonFromCard = (c) => {
    setShowRecap(false); setRecapCard(null);
    beginLesson({
      korean: c.korean, type: c.type, description_fr: c.description_fr || c.description, description_en: c.description_en || c.description,
      example_kr: c.example_kr, example_fr: c.example_tr, example_en: c.example_tr,
    }, c.articleText || "");
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
      const updatedCards = data.cards.map(c => {
        if (c.korean !== lCard.korean) return c;
        const rc = (c.reviewCount || 0) + 1;
        if (c.status === "acquired") return { ...c, reviewCount: rc };
        return { ...c, status: "studied", reviewCount: rc };
      });
      save({ ...data, cards: [...updatedCards, ...newDerivedCards], summaries: [...(data.summaries || []), summary], profile: currentProfile });
    } catch (e) {
      console.error(e);
      setLessonSummary({ cardKorean: lCard.korean, structuresLearned: "Error generating summary", mistakesMade: "", nextSteps: "", date: "", conversationLength: conv.length });
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
    const u = [...conv, { role: "user", content: a }]; setConv(u);
    try { const r = await continueChat(lCard, u, a, lang); setConv([...u, { role: "ai", content: r.message, options: r.options || null, selected: null }]); }
    catch (e) { console.error("quickAct error:", e); setConv([...u, aiError(e, () => quickAct(a))]); }
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
    setExOn(true); setExLoad(true);
    try { const r = await genExercise(sel, exMode, lang, context, tl); setExConv([{ role: "ai", content: r.message, options: r.options || null, selected: null }]); }
    catch (e) { setExConv([{ role: "ai", content: "Error: " + e.message }]); }
    setExLoad(false);
  };

  const exOpt = async (i, opt) => {
    const isRight = (opt.correct === true || opt.correct === "true");
    const nc = [...exConv]; nc[i] = { ...nc[i], selected: opt.label };
    const u = [...nc, { role: "user", content: opt.label }]; setExConv(u); setExLoad(true);
    try { const r = await continueChat(exerciseCards[0], u, isRight ? "correct" : "incorrect, explain", lang); setExConv([...u, { role: "ai", content: r.message, options: r.options || null, selected: null }]); }
    catch (e) { console.error("exOpt error:", e); setExConv([...u, aiError(e)]); }
    setExLoad(false);
  };

  const exSend = async () => {
    if (!exInp.trim()) return; const m = exInp.trim(); setExInp(""); setExLoad(true);
    const u = [...exConv, { role: "user", content: m }]; setExConv(u);
    try {
      const sel = exerciseCards.filter(c => exSel.has(c.id));
      const r = await continueChat({ korean: sel.map(c => c.korean).join(", "), description_fr: "Multiple", description_en: "Multiple" }, u, m, lang);
      setExConv([...u, { role: "ai", content: r.message, options: r.options || null, selected: null }]);
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
    { k: "examples", l: t.moreExamples, i: "💡" }, { k: "resources", l: t.onlineRes, i: "🌐" },
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
          <div style={{ fontSize: 16, fontWeight: 500, color: C.txt, textAlign: "center" }}>{t.welcomeTitle}</div>
          <div style={{ fontSize: 13, color: C.txtS, textAlign: "center", lineHeight: 1.7 }}>{t.welcomeSub}</div>
          <input
            value={syncInput} onChange={e => setSyncInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSync()}
            placeholder={t.syncPlaceholder}
            disabled={syncStatus === "loading"}
            style={{ width: "100%", border: `2px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", fontSize: 14, fontFamily: "'Plus Jakarta Sans'", color: C.txt, background: C.s1, outline: "none", textAlign: "center" }}
            onFocus={e => { e.target.style.borderColor = C.acc; }}
            onBlur={e => { e.target.style.borderColor = C.border; }}
          />
          <button onClick={handleSync} disabled={syncStatus === "loading" || !syncInput.trim()}
            style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: syncInput.trim() && syncStatus !== "loading" ? C.acc : C.s1, color: syncInput.trim() && syncStatus !== "loading" ? C.onAcc : C.txtM, fontFamily: "'Plus Jakarta Sans'", fontSize: 14, fontWeight: 500, cursor: syncInput.trim() && syncStatus !== "loading" ? "pointer" : "default" }}>
            {syncStatus === "loading" ? t.syncLoading : t.welcomeStart}
          </button>
          {syncStatus === "error" && <div style={{ fontSize: 12, color: C.warn, textAlign: "center", lineHeight: 1.5 }}>{t.syncError}</div>}
          <div style={{ fontSize: 11.5, color: C.txtM, textAlign: "center", lineHeight: 1.6, marginTop: 8 }}>
            <div>{t.welcomeNew}</div>
            <div style={{ marginTop: 4 }}>{t.welcomeReturning}</div>
          </div>
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

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans'", display: "flex", flexDirection: "column", height: "100%", background: C.s0 }}>
      <style>{`@keyframes p{0%,100%{opacity:1}50%{opacity:.3}}.pulse{animation:p 1.5s infinite}`}</style>

      {/* NAV */}
      <header style={{ display: "flex", alignItems: "stretch", padding: "0 12px", height: 46, background: C.s2, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <span style={{ fontSize: 18, fontWeight: 600, color: C.txt, letterSpacing: -0.5, marginRight: 8, display: "flex", alignItems: "center", flexShrink: 0 }}>
          모<span style={{ color: C.acc }}>아</span>
        </span>
        {/* Target language selector */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", marginRight: 8, flexShrink: 0 }}>
          <button onClick={e => { e.stopPropagation(); setTlOpen(!tlOpen); setLangOpen(false); }}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.s1, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", fontSize: 12, color: C.txt }}>
            {tlConf?.flag} <span style={{ fontSize: 9, color: C.txtM }}>▾</span>
          </button>
          {tlOpen && (
            <div onClick={e => e.stopPropagation()} style={{ position: "fixed", marginTop: 4, background: C.s2, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", zIndex: 999, minWidth: 180, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", top: 46, left: 12 }}>
              {enabledTLs.map(code => (
                <button key={code} onClick={() => switchTargetLang(code)}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", fontSize: 13, color: tl === code ? C.acc : C.txt, fontWeight: tl === code ? 600 : 400, cursor: "pointer", border: "none", background: tl === code ? C.accBg : "none", width: "100%", fontFamily: "'Plus Jakarta Sans'", textAlign: "left" }}>
                  {TARGET_LANGS[code]?.flag} {getTargetLangName(code, lang)}
                  {tl === code && <span style={{ marginLeft: "auto", fontSize: 11 }}>✓</span>}
                </button>
              ))}
              {Object.keys(TARGET_LANGS).filter(code => !enabledTLs.includes(code)).length > 0 && (
                <div style={{ borderTop: `1px solid ${C.border}` }}>
                  {Object.keys(TARGET_LANGS).filter(code => !enabledTLs.includes(code)).map(code => (
                    <button key={code} onClick={() => addTargetLang(code)}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", fontSize: 13, color: C.txtM, cursor: "pointer", border: "none", background: "none", width: "100%", fontFamily: "'Plus Jakarta Sans'", textAlign: "left" }}>
                      + {TARGET_LANGS[code]?.flag} {getTargetLangName(code, lang)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {/* Scrollable tabs */}
        <div style={{ display: "flex", alignItems: "stretch", flex: 1, overflowX: "auto", minWidth: 0 }}>
        <button style={tabS(view === "library")} onClick={() => setView("library")}>{t.library}</button>
        <button style={tabS(view === "lesson")} onClick={() => setView("lesson")}>{t.lesson}</button>
        <button style={tabS(view === "import")} onClick={() => { setView("import"); setImpStep("input"); }}>{t.import}</button>
        <button style={tabS(view === "exercise")} onClick={() => setView("exercise")}>{t.exercise}</button>
        <button style={tabS(view === "profile")} onClick={() => setView("profile")}>{t.profile}</button>
        </div>{/* end scrollable tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {/* Sync indicator */}
          <button onClick={() => setShowSync(!showSync)}
            style={{ fontSize: 10, padding: "3px 8px", borderRadius: 10, border: `1px solid ${C.okB}`, background: C.okBg, color: C.ok, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", whiteSpace: "nowrap" }}>
            🔗 {t.syncOn}
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
                      <div style={{ fontFamily: "'Noto Sans KR'", fontSize: 15, color: C.txt }}>{p.korean}</div>
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
          showRecap && recapCard ? (
            // RECAP SCREEN
            <div style={{ flex: 1, overflowY: "auto", display: "flex", justifyContent: "center" }}>
              <div style={{ width: "100%", maxWidth: 540, padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Card info */}
                <div style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 7px", borderRadius: 4, background: recapCard.type === "grammar" ? C.accBg : C.proBg, color: recapCard.type === "grammar" ? C.acc : C.pro }}>{recapCard.type === "grammar" ? t.grammar : t.expression}</span>
                    {(() => { const si = statusInfo(recapCard.status, t); return (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, padding: "2px 7px", borderRadius: 10, background: si.bg, color: si.color }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: si.color }} />{si.label}
                      </span>
                    ); })()}
                    {(recapCard.reviewCount || 0) > 0 && <span style={{ fontSize: 10, color: C.txtM }}>{t.reviewCount(recapCard.reviewCount)}</span>}
                  </div>
                  <div style={{ fontFamily: "'Noto Sans KR'", fontSize: 22, color: C.txt, marginBottom: 4 }}>{recapCard.korean}</div>
                  <div style={{ fontSize: 12.5, color: C.txtS, lineHeight: 1.6, marginBottom: 10 }}>{recapCard.description}</div>
                  <div style={{ background: C.s1, borderRadius: 8, padding: "9px 11px" }}>
                    <div style={{ fontFamily: "'Noto Sans KR'", fontSize: 13, color: C.txt, lineHeight: 1.8 }}>{recapCard.example_kr}</div>
                    <div style={{ fontSize: 11.5, color: C.txtM, fontStyle: "italic", marginTop: 3 }}>{recapCard.example_tr}</div>
                  </div>
                  {recapCard.parentKorean && (
                    <div style={{ fontSize: 10, color: C.acc, marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ opacity: 0.6 }}>↳</span> {t.derivedFrom} <span style={{ fontFamily: "'Noto Sans KR'", fontWeight: 500 }}>{recapCard.parentKorean}</span>
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

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                  <button onClick={() => startLessonFromCard(recapCard)}
                    style={{ flex: "1 1 140px", padding: "12px 16px", borderRadius: 10, background: C.acc, color: C.onAcc, border: "none", fontFamily: "'Plus Jakarta Sans'", fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "center" }}>
                    🔄 {t.redoLesson}
                  </button>
                  <button onClick={() => {
                    const cardId = recapCard.id;
                    setShowRecap(false); setRecapCard(null);
                    if (cardId) setExSel(new Set([cardId]));
                    setView("exercise");
                  }}
                    style={{ flex: "1 1 140px", padding: "12px 16px", borderRadius: 10, background: C.s2, border: `1px solid ${C.borderS}`, color: C.txtS, fontFamily: "'Plus Jakarta Sans'", fontSize: 13, cursor: "pointer", textAlign: "center" }}>
                    ✏️ {t.doExercises}
                  </button>
                </div>
              </div>
            </div>
          ) : lCard ? (
            <div style={{ flex: 1, display: "flex", overflow: "hidden", flexDirection: window.innerWidth < 700 ? "column" : "row" }}>
              <div style={{ width: window.innerWidth < 700 ? "100%" : "40%", maxHeight: window.innerWidth < 700 ? "35%" : "none", flexShrink: 0, borderRight: window.innerWidth >= 700 ? `1px solid ${C.border}` : "none", borderBottom: window.innerWidth < 700 ? `1px solid ${C.border}` : "none", display: "flex", flexDirection: "column", background: C.s2 }}>
                <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: C.txt, marginBottom: 5 }}>📄 Article</div>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, padding: "2px 7px", borderRadius: 4, background: C.warnBg, border: `1px solid ${C.warnB}`, color: C.warn }}>🎯 {lCard.korean}</span>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
                  {lArticle ? lArticle.split("\n").filter(Boolean).map((p, i) => (
                    <p key={i} style={{ fontFamily: "'Noto Sans KR'", fontSize: 13, lineHeight: 2.1, color: C.txt, marginBottom: 10 }}>{p}</p>
                  )) : null}
                </div>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.s1, minHeight: 0 }}>
                <div ref={msgsR} style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                  {conv.map((m, i) => (
                    <div key={i} ref={i === conv.length - 1 ? lastMsgRef : null}>
                      <Bubble msg={{ ...m, onSelect: m.role === "ai" && !m.selected && m.options ? (o) => pickOpt(i, o) : null }} />
                    </div>
                  ))}
                  {lLoad && <div className="pulse" style={{ fontSize: 12, color: C.txtM, padding: 8 }}>{lessonDone ? t.generating : t.thinking}</div>}
                  {/* LESSON SUMMARY */}
                  {lessonSummary && (
                    <div style={{ background: C.s2, border: `1px solid ${C.okB}`, borderRadius: 10, padding: 16, margin: "4px 0" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.txt, marginBottom: 12 }}>📋 {t.summaryTitle}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: C.ok, textTransform: "uppercase", marginBottom: 3 }}>{t.summaryLearned}</div>
                          <div style={{ fontSize: 12, color: C.txt, lineHeight: 1.6 }}>{lessonSummary.structuresLearned}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: C.warn, textTransform: "uppercase", marginBottom: 3 }}>{t.summaryMistakes}</div>
                          <div style={{ fontSize: 12, color: C.txt, lineHeight: 1.6 }}>{lessonSummary.mistakesMade}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: C.acc, textTransform: "uppercase", marginBottom: 3 }}>{t.summaryNext}</div>
                          <div style={{ fontSize: 12, color: C.txt, lineHeight: 1.6 }}>{lessonSummary.nextSteps}</div>
                        </div>
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
                            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", border: `1px solid ${exSel.has(c.id) ? C.acc : C.border}`, borderRadius: 6, background: exSel.has(c.id) ? C.accBg : C.s2, fontFamily: "'Noto Sans KR'", fontSize: 12.5, color: C.txt, cursor: "pointer" }}>
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
                  <button onClick={() => setExOn(false)} style={{ fontSize: 11, color: C.txtS, border: `1px solid ${C.border}`, borderRadius: 6, padding: "3px 9px", background: "#fff", cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>← {t.back}</button>
                </div>
                <div ref={exR} style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                  {exConv.map((m, i) => (
                    <div key={i} ref={i === exConv.length - 1 ? lastExMsgRef : null}>
                      <Bubble msg={{ ...m, onSelect: m.role === "ai" && !m.selected && m.options ? (o) => exOpt(i, o) : null }} />
                    </div>
                  ))}
                  {exLoad && <div className="pulse" style={{ fontSize: 12, color: C.txtM, padding: 8 }}>{t.thinking}</div>}
                </div>
                <div style={{ padding: "8px 10px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 6, background: C.s2, alignItems: "center", flexShrink: 0 }}>
                  <input value={exInp} onChange={e => setExInp(e.target.value)} onKeyDown={e => e.key === "Enter" && exSend()} placeholder={t.yourAnswer}
                    style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 10px", fontFamily: "'Plus Jakarta Sans'", fontSize: 12, color: C.txt, background: C.s1, outline: "none" }} />
                  <button onClick={exSend} style={{ width: 30, height: 30, background: C.acc, color: C.onAcc, border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>↑</button>
                </div>
              </div>
            )}
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
