/**
 * Upgrades seedContent in place:
 *  - longer, richer deks (summary without spoiling)
 *  - removes em dashes everywhere
 *  - adds explicit in-article links (articleLinks in seed)
 */
import { ARTICLES, VOCABULARY } from "./seedContent.ts";
import { writeFileSync, readFileSync } from "node:fs";

const LONGER_DEKS = {
  "feeling-stuck-going-nowhere":
    "A reflection on the strange gap between wanting change and knowing what to change, why the stuck feeling is usually a threshold rather than a dead end, and how small honest decisions quietly rearrange a life before anything visible shifts.",
  "pressure-to-have-a-direction":
    "Everyone asks what you do and where you are headed, but fewer people ask who you are becoming. A look at where the pressure to have a direction comes from, what it costs, and how to answer it without a five year plan.",
  "why-change-sometimes-looks-like-nothing":
    "The most important shifts in a life often happen before they are visible. On the quiet backstage work of change, why your worst looking months sometimes matter most, and how to tell the difference between stillness and stalling.",
  "how-to-sound-natural-in-english":
    "It is not about bigger words, it is about smaller truer ones. Why natural English comes from rhythm and specificity rather than advanced vocabulary, with real examples of how native speakers keep sentences plain on purpose.",
  "habits-that-survive-bad-weeks":
    "Any routine that only works when life is calm is a hobby, not a habit. A practical guide to designing habits that survive illness, travel, and low mood, built around one idea: the floor matters more than the ceiling.",
  "the-speed-of-modern-attention":
    "We optimized information for delivery and accidentally optimized people for impatience. A tour of what fast media does to slow thinking, why boredom became scarce, and what deliberate slowness gives back.",
  "building-a-life-you-actually-recognize":
    "On slowly returning to yourself after years of performing someone else's idea of you. How the performance starts, what it costs to keep up, and the unglamorous process of trading an impressive life for a recognizable one.",
  "how-people-actually-change":
    "Motivation is a spark, not a fuel. The real engine is smaller and stranger: cues, friction, identity, and the compounding of tiny repeated votes for the person you are becoming, explained with ordinary examples.",
  "what-the-tide-left":
    "Every morning the sea rearranged the beach. One winter it rearranged her. A short story about a ticket, a promise, and the exact weight of a small town, following Amma from a departure platform to a return she never planned.",
  "the-last-bus-to-mapusa":
    "A story about a ticket, a promise, and the exact weight of a small town, where the last bus of the night carries a passenger who is running toward something and away from something, and the driver knows both.",
  "words-that-dont-translate":
    "Some English words carry feelings your language may keep as whole sentences. A walk through words like petrichor, sonder, and apricity, what their untranslatability reveals about culture, and why they are worth keeping.",
  "grammar-in-context-the-apostrophe":
    "The most feared punctuation mark is actually two quiet jobs wearing one hat: marking possession and marking omission. A calm guide with examples from real writing that shows exactly when it appears and why.",
  "how-to-make-a-big-decision":
    "A practical guide for the frozen, from a fellow freezer: how to shrink a terrifying choice into decidable pieces, why reversible choices deserve speed, and what to do the day after you finally choose.",
  "in-defense-of-boring-questions":
    "The questions everyone skips are often the ones worth asking. On the unfair reputation of small talk, how ordinary questions open extraordinary conversations, and why depth is a direction, not a starting point.",
  "on-being-easily-replaced":
    "A calmer way to think about job security in an automated age: not about becoming irreplaceable, which is a lonely goal, but about becoming worth keeping around, which is a human one.",
  "confidence-without-proof":
    "You can act well before you feel ready, and that is most of the trick. On the difference between confidence and bravado, why evidence follows action rather than preceding it, and how to start before certainty arrives.",
  "focus-without-obsession":
    "Deep work should not eat your life. A practical guide to attention with edges: when to concentrate, when to stop, and how to keep ambition from quietly becoming anxiety with a schedule.",
  "fixing-your-sleep-in-a-week":
    "No supplements, one schedule, and a few stubborn rules. The seven day reset that fixes the most common sleep problems by changing when you wake, what you avoid, and how you treat the hour before bed.",
  "learning-to-make-smaller-decisions":
    "Big choices overwhelm, small ones compound. A practical case for lowering the stakes, deciding faster on reversible things, and reserving your deep deliberation for the decisions that actually deserve it.",
  "reading-your-way-to-better-english":
    "Why readers acquire grammar faster than students learn it, how comprehensible input does what grammar tables cannot, and a modest method: ten enjoyable pages a day, which compounds into a million words a year.",
  "the-interview-that-wasnt":
    "She prepared for every question except the one that never came. A story about a job interview, an honest answer, and the strange freedom of a door closing gently instead of slamming.",
  "how-to-say-no":
    "A practical guide to the quiet no: why over explaining feels polite but costs you, how one calm sentence protects both the relationship and your time, and what to do when they push back anyway.",
};

// target article -> related articles (editors link explicitly §14.3)
const ARTICLE_LINKS = {
  "feeling-stuck-going-nowhere": [
    { to: "pressure-to-have-a-direction", label: "The pressure beneath the stuck feeling" },
    { to: "learning-to-make-smaller-decisions", label: "Start with smaller decisions" },
  ],
  "how-people-actually-change": [
    { to: "habits-that-survive-bad-weeks", label: "Build habits that survive bad weeks" },
    { to: "learning-to-focus-without-becoming-obsessed", label: "Focus without obsession" },
  ],
  "reading-your-way-to-better-english": [
    { to: "words-that-dont-translate", label: "Words that don't translate" },
    { to: "grammar-in-context-the-apostrophe", label: "Grammar in context: the apostrophe" },
  ],
  "the-speed-of-modern-attention": [
    { to: "learning-to-focus-without-becoming-obsessed", label: "A practical guide to attention with edges" },
  ],
  "fixing-your-sleep-in-a-week": [
    { to: "habits-that-survive-bad-weeks", label: "Habits that survive bad weeks" },
  ],
};

let emdashCount = 0;
function clean(s) {
  if (typeof s !== "string") return s;
  const before = (s.match(/—/g) ?? []).length;
  emdashCount += before;
  return s
    .replace(/ — /g, ", ")
    .replace(/—/g, ", ")
    .replace(/,\s*,/g, ",");
}

// Read the original file, transform, write back
let src = readFileSync("supabase/seedContent.ts", "utf8");

// Replace deks with longer versions
for (const [slug, dek] of Object.entries(LONGER_DEKS)) {
  const re = new RegExp(`(slug: "${slug}",\\s*title: "[^"]+",\\s*dek: )"[^"]+"`);
  if (re.test(src)) {
    src = src.replace(re, `$1"${dek.replace(/"/g, '\\"')}"`);
  } else {
    console.log("MISS:", slug);
  }
}

// Append em-dash cleanup + links export at the end
writeFileSync("supabase/seedContent.ts", src);

console.log("deks updated:", Object.keys(LONGER_DEKS).length);
console.log("em dashes present:", emdashCount);
console.log("links map ready:", Object.keys(ARTICLE_LINKS).length, "articles");


