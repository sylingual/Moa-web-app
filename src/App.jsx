import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { loadData, saveData, isSupabaseConfigured, DEFAULT_DATA } from "./storage.js";

// =============================================
// TRANSLATIONS
// =============================================
const T = {
  fr: {
    library: "Bibliothèque", lesson: "Leçon", import: "Importer", exercise: "Exercice",
    review: "À revoir", acquired: "Acquis", reviewBtn: "Revoir",
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
    noAcquired: "Aucune carte acquise.",
    emptyLesson: "Importe un texte et choisis un point pour commencer.",
    syncLabel: "Code de synchro",
    syncPlaceholder: "un mot de passe simple...",
    syncInfo: "Ce code synchronise tes données entre appareils. Utilise le même partout.",
    syncOn: "Synchro activée",
    syncOff: "Local uniquement",
    connect: "Connecter",
  },
  en: {
    library: "Library", lesson: "Lesson", import: "Import", exercise: "Exercise",
    review: "To review", acquired: "Acquired", reviewBtn: "Review",
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
    noAcquired: "No acquired cards yet.",
    emptyLesson: "Import a text and pick a point to start.",
    syncLabel: "Sync code",
    syncPlaceholder: "a simple passphrase...",
    syncInfo: "This code syncs your data across devices. Use the same one everywhere.",
    syncOn: "Sync enabled",
    syncOff: "Local only",
    connect: "Connect",
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
};

// =============================================
// AI CALL (via serverless proxy)
// =============================================
async function callAI(systemPrompt, userMessage) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system: systemPrompt, messages: [{ role: "user", content: userMessage }], max_tokens: 1200 }),
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
  // Try direct parse first
  try { return JSON.parse(raw); } catch {}
  // Strip markdown fences
  let cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  try { return JSON.parse(cleaned); } catch {}
  // Extract JSON from surrounding text
  const start = cleaned.search(/[\[{]/);
  const lastBracket = cleaned.lastIndexOf(']');
  const lastBrace = cleaned.lastIndexOf('}');
  const end = Math.max(lastBracket, lastBrace);
  if (start >= 0 && end > start) {
    try { return JSON.parse(cleaned.substring(start, end + 1)); } catch {}
  }
  throw new Error("Could not parse AI response as JSON: " + raw.substring(0, 200));
}

async function analyzeText(text, existing, lang) {
  const known = existing.map((c) => c.korean).join(", ");
  const L = lang === "fr" ? "French" : "English";
  const sys = `You are an expert Korean language analyst specializing in identifying teachable grammar and expressions for French-speaking intermediate learners (TOPIK 3-4 level).

TASK: Analyze the provided Korean text and extract exactly 3 interesting grammatical structures or expressions worth studying.

SELECTION CRITERIA (in order of priority):
- Prefer structures that are emotionally expressive, subjective, or commonly found (e.g. 어찌나...는지, ~아/어 가다, ~하는 모습)
- Prefer structures that reveal a nuance hard to guess from textbook definitions alone
- Avoid basic structures the learner likely already knows (e.g. ~고 싶다, ~수 있다)
- Avoid overly advanced or literary structures that would overwhelm an intermediate learner
- Each structure must appear clearly in the provided text with a real example sentence

ALREADY KNOWN (skip these): ${known || "none"}

For each structure, provide:
- "korean": the structure pattern (e.g. "~아/어 가다", "어찌나 ~(은/는)지")
- "type": "grammar" or "expression"
- "description_fr": one clear sentence in French explaining what it means and when to use it
- "description_en": same in English
- "example_kr": the exact sentence from the text where this structure appears
- "example_fr": natural French translation of that sentence
- "example_en": natural English translation of that sentence

Return a JSON array of exactly 3 items.`;
  return parseJSON(await callAI(sys, text));
}

async function startSocratic(card, article, lang) {
  const L = lang === "fr" ? "French" : "English";
  const d = lang === "fr" ? card.description_fr : card.description_en;
  const sys = `You are a warm, encouraging Korean language teacher who uses the Socratic method. You NEVER explain a rule directly. Instead, you guide the student to discover it themselves through observation and intuition.

METHODOLOGY:
1. First, show the target structure highlighted in a sentence from the article
2. Then show 2 NEW example sentences (not from the article) that use the same structure in different contexts. Choose examples where the meaning of the structure becomes obvious from context.
3. Ask ONE multiple-choice question that tests whether the student has grasped the core meaning or nuance. The question should be about what the structure conveys emotionally or functionally, not about grammar terminology.

TONE:
- Speak in ${L}
- Be warm and conversational, like a patient tutor
- Use short paragraphs with line breaks for readability
- Write Korean examples on their own lines
- After each Korean example, add the ${L} translation in parentheses on the next line

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
  
  const acts = {
    examples: `The student wants more examples. Give 2-3 NEW example sentences using the structure "${card.korean}" in varied, real-life contexts (blog posts, conversations, social media), ideally based on the student's. For each example, write the Korean sentence, then the ${L} translation on the next line. After the examples, ask a new question to check understanding. Include MCQ options if appropriate.`,
    
    resources: `The student wants to find more examples online. Suggest 2-3 specific, actionable ways to find real Korean content using this structure. For example: specific search terms to use on Naver Blog (e.g. searching "${card.korean}" in quotes), YouTube channels, or web resources. Be specific, not generic. Then continue the lesson with a follow-up question.`,
    
    exercise: `The student wants a practice exercise. Create a fill-in-the-blank or sentence-building exercise that requires using "${card.korean}". Give a context sentence in ${L}, then ask the student to complete or translate it into Korean using the structure. If you include MCQ options, use "label" as the key name.`,
    
    explain: `The student is struggling. Explain the structure "${card.korean}" differently. Use an analogy with ${L} or compare it to a simpler Korean structure the student likely knows. Use concrete, visual examples rather than abstract grammar explanations. Then give one more example and ask a simpler question to rebuild confidence.`,
    
    correct: `The student answered correctly! Briefly confirm they are right (1 sentence). Then either: reveal the official grammar name if not done yet, or go deeper into a nuance, or show an edge case, or move to a slightly harder usage of the same structure. Include a new question if appropriate.`,
    
    "incorrect, explain": `The student answered incorrectly. Do NOT just say "wrong." Instead: gently say it is not quite right, then give a helpful hint by showing the structure in a very obvious context where the meaning is unmistakable. Ask a simpler version of the same question or rephrase it. Be encouraging. Use "label" as the key name for MCQ options.`
  };

  const instruction = acts[action] || `The student said: "${action}". Respond naturally as a Socratic Korean teacher. Stay focused on the structure "${card.korean}". If they ask a question, answer it helpfully. If they attempt Korean, gently correct any mistakes. Always try to keep the lesson moving forward.`;

  const sys = `You are a Socratic Korean teacher having an ongoing lesson about the structure "${card.korean}". Speak in ${L}. Be warm, patient, and encouraging. Write Korean on its own lines followed by translations.

${instruction}

Return JSON: {"message": "your response"} or {"message": "your response", "options": [{"label": "a) ...", "correct": false}, ...]} if you include a question. Always use "label" (not "text") as the key for option text.`;
  
  return parseJSON(await callAI(sys, `Conversation so far:\n${hist}`));
}

async function genExercise(cards, mode, lang) {
  const L = lang === "fr" ? "French" : "English";
  const structs = cards.map((c) => `- ${c.korean}: ${lang === "fr" ? c.description_fr : c.description_en} (example: ${c.example_kr})`).join("\n");
  
  const modes = {
    story: `STORY MODE: Create a creative writing prompt in ${L} that requires using ALL the listed structures naturally in a short paragraph (3-5 sentences). 
Give the student:
1. A scenario/context (e.g. "You are writing a blog post about your weekend trip to Busan")
2. A starter sentence in Korean to help them begin
3. Clear instructions about which structures to incorporate and where they would fit naturally
The goal is for the student to write a coherent mini-text, not isolated sentences.`,

    qcm: `QUIZ MODE: Create 3 multiple-choice questions testing these structures. For EACH question:
1. Write a new Korean sentence (not from the original article) that uses one of the structures
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

  const sys = `You are a Korean language exercise designer for intermediate learners. Speak in ${L}. Be clear and encouraging.

${modes[mode]}

Structures to practice:
${structs}

Return JSON: {"message": "your exercise content"} or {"message": "your exercise", "options": [{"label": "...", "correct": true/false}, ...]} if the exercise format includes MCQ. Always use "label" as the key for option text, and use boolean true/false for "correct".`;
  
  return parseJSON(await callAI(sys, `Generate the exercise now.`));
}

// =============================================
// COMPONENTS
// =============================================
function Bubble({ msg }) {
  const ai = msg.role === "ai";
  return (
    <div style={{ display: "flex", gap: 7, alignSelf: ai ? "flex-start" : "flex-end", flexDirection: ai ? "row" : "row-reverse", maxWidth: ai ? "92%" : "80%" }}>
      <div style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0, background: C.s1, border: `1px solid ${C.border}`, color: C.txtM }}>
        {ai ? "✦" : "🧑"}
      </div>
      <div style={{ padding: "9px 12px", borderRadius: ai ? "2px 12px 12px 12px" : "12px 2px 12px 12px", fontSize: 12.5, lineHeight: 1.7, whiteSpace: "pre-wrap", background: ai ? C.s2 : C.acc, border: ai ? `1px solid ${C.border}` : "none", color: ai ? C.txt : C.onAcc }}>
        {msg.content}
        {msg.options && (
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 8 }}>
            {msg.options.map((o, i) => {
              const oLabel = o.label || o.text || String(o);
              const oCorrect = (o.correct === true || o.correct === "true");
              const sel = msg.selected === oLabel, showOk = msg.selected && oCorrect, bad = sel && !oCorrect;
              return (
                <button key={i} onClick={() => msg.onSelect?.({...o, label: oLabel, correct: oCorrect})} disabled={!!msg.selected}
                  style={{ background: showOk ? C.okBg : bad ? C.warnBg : C.s1, border: `1px solid ${showOk ? C.okB : bad ? C.warnB : C.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 12, color: showOk ? C.ok : bad ? C.warn : C.txt, cursor: msg.selected ? "default" : "pointer", fontFamily: "'Plus Jakarta Sans'", textAlign: "left", opacity: msg.selected && !sel && !showOk ? 0.4 : 1 }}>
                  {oLabel}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function GrammarCard({ card, t, onToggle, onReview }) {
  const rev = card.status === "review";
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
        <button onClick={e => { e.stopPropagation(); onToggle(); }}
          style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 7px", borderRadius: 10, fontSize: 10, cursor: "pointer", border: "none", background: rev ? C.warnBg : C.okBg, color: rev ? C.warn : C.ok, fontFamily: "'Plus Jakarta Sans'" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: rev ? C.warn : C.ok }} />
          {rev ? t.review : t.acquired}
        </button>
        <span style={{ fontSize: 11, color: C.txtM, marginLeft: "auto" }}>{card.date}</span>
      </div>
      <div style={{ fontFamily: "'Noto Sans KR'", fontSize: 17, color: C.txt, marginBottom: 3 }}>{card.korean}</div>
      <div style={{ fontSize: 11.5, color: C.txtS, lineHeight: 1.5, marginBottom: 8 }}>{card.description}</div>
      <div style={{ background: C.s1, borderRadius: 6, padding: "7px 9px", marginBottom: 8 }}>
        <div style={{ fontFamily: "'Noto Sans KR'", fontSize: 12.5, color: C.txt }}>{card.example_kr}</div>
        <div style={{ fontSize: 11, color: C.txtM, fontStyle: "italic", marginTop: 2 }}>{card.example_tr}</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: C.txtM }}>{card.source || ""}</span>
        {rev && (
          <button onClick={e => { e.stopPropagation(); onReview(); }}
            style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, fontFamily: "'Plus Jakarta Sans'", fontSize: 11, cursor: "pointer", border: `1px solid ${C.warnB}`, background: "#ffffff", color: C.warn }}>
            {t.reviewBtn}
          </button>
        )}
      </div>
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
  const [langOpen, setLangOpen] = useState(false);
  const [syncId, setSyncId] = useState(() => localStorage.getItem("moa-sync-id") || "");
  const [syncInput, setSyncInput] = useState("");
  const [showSync, setShowSync] = useState(false);

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

  // Exercise
  const [exMode, setExMode] = useState("story");
  const [exSel, setExSel] = useState(new Set());
  const [exConv, setExConv] = useState([]);
  const [exLoad, setExLoad] = useState(false);
  const [exInp, setExInp] = useState("");
  const [exOn, setExOn] = useState(false);

  const msgsR = useRef(null);
  const exR = useRef(null);

  const lang = data.lang || "fr";
  const t = T[lang];
  const revCount = data.cards.filter(c => c.status === "review").length;
  const acqCount = data.cards.filter(c => c.status === "acquired").length;
  const acqCards = useMemo(() => data.cards.filter(c => c.status === "acquired"), [data.cards]);

  // Load
  useEffect(() => {
    loadData(syncId).then(d => { setData(d || DEFAULT_DATA); setLoaded(true); });
  }, [syncId]);

  // Scroll
  useEffect(() => { msgsR.current && (msgsR.current.scrollTop = msgsR.current.scrollHeight); }, [conv]);
  useEffect(() => { exR.current && (exR.current.scrollTop = exR.current.scrollHeight); }, [exConv]);

  // Reset exercise
  useEffect(() => {
    if (view === "exercise") { setExSel(new Set(acqCards.map(c => c.id))); setExOn(false); setExConv([]); }
  }, [view, acqCards]);

  const save = useCallback((nd) => { setData(nd); saveData(nd, syncId); }, [syncId]);

  const handleSync = () => {
    const id = syncInput.trim();
    if (!id) return;
    localStorage.setItem("moa-sync-id", id);
    setSyncId(id);
    setShowSync(false);
  };

  // ---- IMPORT ----
  const doAnalyze = async () => {
    if (!impText.trim()) return;
    setImpStep("scanning");
    try {
      setFound(await analyzeText(impText, data.cards, lang));
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
    status, source: "Import", articleText: impText,
    date: new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { day: "numeric", month: "short" }),
  });

  // ---- LESSON ----
  const beginLesson = async (point, art) => {
    const p = point || found[selPick]; const text = art || impText;
    if (!p) return;
    const card = makeCard(p, "review");
    if (!data.cards.find(c => c.korean === p.korean)) save({ ...data, cards: [...data.cards, card] });
    setLCard(card); setLArticle(text); setConv([]); setLLoad(true); setView("lesson");
    try { const r = await startSocratic(card, text, lang); setConv([{ role: "ai", content: r.message, options: r.options, selected: null }]); }
    catch { setConv([{ role: "ai", content: `Observons :\n\n${card.korean}\n\n${card.example_kr}\n\nQu'en penses-tu ?` }]); }
    setLLoad(false);
  };

  const reviewCard = (c) => beginLesson({
    korean: c.korean, type: c.type, description_fr: c.description_fr || c.description, description_en: c.description_en || c.description,
    example_kr: c.example_kr, example_fr: c.example_tr, example_en: c.example_tr,
  }, c.articleText || "");

  const pickOpt = async (i, opt) => {
    const isRight = (opt.correct === true || opt.correct === "true");
    const nc = [...conv]; nc[i] = { ...nc[i], selected: opt.label };
    const u = [...nc, { role: "user", content: opt.label }]; setConv(u); setLLoad(true);
    try { const r = await continueChat(lCard, u, isRight ? "correct" : "incorrect, explain", lang); setConv([...u, { role: "ai", content: r.message, options: r.options || null, selected: null }]); }
    catch { setConv([...u, { role: "ai", content: isRight ? "Exact ! 👏" : "Pas tout à fait..." }]); }
    setLLoad(false);
  };

  const quickAct = async (a) => {
    setTray(false); setLLoad(true);
    const u = [...conv, { role: "user", content: a }]; setConv(u);
    try { const r = await continueChat(lCard, u, a, lang); setConv([...u, { role: "ai", content: r.message, options: r.options || null, selected: null }]); }
    catch { setConv([...u, { role: "ai", content: "..." }]); }
    setLLoad(false);
  };

  const sendMsg = async () => {
    if (!inp.trim()) return; const m = inp.trim(); setInp(""); setLLoad(true);
    const u = [...conv, { role: "user", content: m }]; setConv(u);
    try { const r = await continueChat(lCard, u, m, lang); setConv([...u, { role: "ai", content: r.message, options: r.options || null, selected: null }]); }
    catch { setConv([...u, { role: "ai", content: "..." }]); }
    setLLoad(false);
  };

  const toggleSt = (id) => save({ ...data, cards: data.cards.map(c => c.id === id ? { ...c, status: c.status === "review" ? "acquired" : "review" } : c) });

  // ---- EXERCISE ----
  const launchEx = async () => {
    const sel = acqCards.filter(c => exSel.has(c.id)); if (!sel.length) return;
    setExOn(true); setExLoad(true);
    try { const r = await genExercise(sel, exMode, lang); setExConv([{ role: "ai", content: r.message, options: r.options || null, selected: null }]); }
    catch (e) { setExConv([{ role: "ai", content: "Error: " + e.message }]); }
    setExLoad(false);
  };

  const exOpt = async (i, opt) => {
    const isRight = (opt.correct === true || opt.correct === "true");
    const nc = [...exConv]; nc[i] = { ...nc[i], selected: opt.label };
    const u = [...nc, { role: "user", content: opt.label }]; setExConv(u); setExLoad(true);
    try { const r = await continueChat(acqCards[0], u, isRight ? "correct" : "incorrect, explain", lang); setExConv([...u, { role: "ai", content: r.message, options: r.options || null, selected: null }]); }
    catch { setExConv([...u, { role: "ai", content: isRight ? "Correct ! 👏" : "Pas tout à fait..." }]); }
    setExLoad(false);
  };

  const exSend = async () => {
    if (!exInp.trim()) return; const m = exInp.trim(); setExInp(""); setExLoad(true);
    const u = [...exConv, { role: "user", content: m }]; setExConv(u);
    try {
      const sel = acqCards.filter(c => exSel.has(c.id));
      const r = await continueChat({ korean: sel.map(c => c.korean).join(", "), description_fr: "Multiple", description_en: "Multiple" }, u, m, lang);
      setExConv([...u, { role: "ai", content: r.message, options: r.options || null, selected: null }]);
    } catch { setExConv([...u, { role: "ai", content: "..." }]); }
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

  if (!loaded) return <div style={{ padding: 40, textAlign: "center", color: C.txtM }}>Loading...</div>;

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans'", display: "flex", flexDirection: "column", height: "100%", background: C.s0 }}>
      <style>{`@keyframes p{0%,100%{opacity:1}50%{opacity:.3}}.pulse{animation:p 1.5s infinite}`}</style>

      {/* NAV */}
      <header style={{ display: "flex", alignItems: "stretch", padding: "0 12px", height: 46, background: C.s2, borderBottom: `1px solid ${C.border}`, flexShrink: 0, overflowX: "auto" }}>
        <span style={{ fontSize: 18, fontWeight: 600, color: C.txt, letterSpacing: -0.5, marginRight: 20, display: "flex", alignItems: "center", flexShrink: 0 }}>
          모<span style={{ color: C.acc }}>아</span>
        </span>
        <button style={tabS(view === "library")} onClick={() => setView("library")}>{t.library}</button>
        <button style={tabS(view === "lesson")} onClick={() => setView("lesson")}>{t.lesson}</button>
        <button style={tabS(view === "import")} onClick={() => { setView("import"); setImpStep("input"); }}>{t.import}</button>
        <button style={tabS(view === "exercise")} onClick={() => setView("exercise")}>{t.exercise}</button>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {/* Sync indicator */}
          <button onClick={() => setShowSync(!showSync)}
            style={{ fontSize: 10, padding: "3px 8px", borderRadius: 10, border: `1px solid ${syncId ? C.okB : C.border}`, background: syncId ? C.okBg : "none", color: syncId ? C.ok : C.txtM, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'", whiteSpace: "nowrap" }}>
            {syncId ? `🔗 ${t.syncOn}` : t.syncOff}
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
          <span style={{ fontSize: 12, color: C.txtS, fontWeight: 500 }}>{t.syncLabel} :</span>
          <input value={syncInput} onChange={e => setSyncInput(e.target.value)} placeholder={t.syncPlaceholder}
            onKeyDown={e => e.key === "Enter" && handleSync()}
            style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 10px", fontSize: 12, fontFamily: "'Plus Jakarta Sans'", color: C.txt, background: C.s0, outline: "none", width: 200 }} />
          <button onClick={handleSync}
            style={{ padding: "5px 12px", borderRadius: 6, background: C.acc, color: C.onAcc, border: "none", fontSize: 12, fontFamily: "'Plus Jakarta Sans'", cursor: "pointer" }}>
            {t.connect}
          </button>
          <span style={{ fontSize: 11, color: C.txtM, flex: 1 }}>{t.syncInfo}</span>
        </div>
      )}

      {/* VIEWS */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex" }} onClick={() => { setLangOpen(false); }}>

        {/* LIBRARY */}
        {view === "library" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>
            <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 12, color: C.txtM }}>{data.cards.length} {t.points} · {revCount} {t.toReview} · {acqCount} {t.acq}</span>
            </div>
            {data.cards.length === 0
              ? <div style={{ padding: 40, textAlign: "center", color: C.txtM, fontSize: 13 }}>{t.noCards}</div>
              : <div style={{ padding: "14px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 12 }}>
                  {data.cards.map(c => <GrammarCard key={c.id} card={c} t={t} onToggle={() => toggleSt(c.id)} onReview={() => reviewCard(c)} />)}
                </div>
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
              <textarea value={impText} onChange={e => setImpText(e.target.value)} placeholder={t.placeholder}
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
                  <button onClick={async () => { setImpStep("scanning"); try { const m = await analyzeText(impText, [...data.cards, ...found.map(p => ({ korean: p.korean }))], lang); setFound([...found, ...m]); } catch (e) { console.error(e); } setImpStep("picks"); }}
                    style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.borderS}`, background: "none", fontFamily: "'Plus Jakarta Sans'", fontSize: 12, color: C.txtS, cursor: "pointer" }}>+ {t.morePoints}</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* LESSON */}
        {view === "lesson" && (
          lCard ? (
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
                  {conv.map((m, i) => <Bubble key={i} msg={{ ...m, onSelect: m.role === "ai" && !m.selected && m.options ? (o) => pickOpt(i, o) : null }} />)}
                  {lLoad && <div className="pulse" style={{ fontSize: 12, color: C.txtM, padding: 8 }}>{t.thinking}</div>}
                </div>
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
                  {acqCards.length === 0
                    ? <div style={{ fontSize: 12, color: C.txtM, padding: 12, textAlign: "center" }}>{t.noAcquired}</div>
                    : <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {acqCards.map(c => (
                          <button key={c.id} onClick={() => { const ns = new Set(exSel); ns.has(c.id) ? ns.delete(c.id) : ns.add(c.id); setExSel(ns); }}
                            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", border: `1px solid ${exSel.has(c.id) ? C.acc : C.border}`, borderRadius: 6, background: exSel.has(c.id) ? C.accBg : C.s2, fontFamily: "'Noto Sans KR'", fontSize: 12.5, color: C.txt, cursor: "pointer" }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.ok }} />{c.korean}
                          </button>
                        ))}
                      </div>
                  }
                </div>
                {acqCards.length > 0 && (
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
                  {exConv.map((m, i) => <Bubble key={i} msg={{ ...m, onSelect: m.role === "ai" && !m.selected && m.options ? (o) => exOpt(i, o) : null }} />)}
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
      </div>
    </div>
  );
}
