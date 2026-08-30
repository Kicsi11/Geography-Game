// Master list of available languages for search autocomplete
const allLanguages = [
  "Afrikaans", "Albanian", "Arabic", "Armenian", "Azerbaijani", "Basque", "Belarusian", 
  "Bengali", "Bosnian", "Bulgarian", "Catalan", "Chinese", "Croatian", "Czech", 
  "Danish", "Dutch", "English", "Estonian", "Finnish", "French", "Georgian", 
  "German", "Greek", "Hebrew", "Hindi", "Hungarian", "Icelandic", "Indonesian", 
  "Irish", "Italian", "Japanese", "Korean", "Latvian", "Lithuanian", "Macedonian", 
  "Malay", "Maltese", "Mongolian", "Nepali", "Norwegian", "Persian", "Polish", 
  "Portuguese", "Punjabi", "Romani", "Romanian", "Romansh", "Russian", "Serbian", 
  "Slovak", "Slovenian", "Spanish", "Swahili", "Swedish", "Tagalog", "Thai", 
  "Turkish", "Ukrainian", "Urdu", "Vietnamese", "Welsh"
];

// Sample dataset of rounds
const database = [
  { text: "Acesta este un test în limba română.", language: "Romanian" },
  { text: "Cai si si ek testo andi Romani chib.", language: "Romani" },
  { text: "Cquest ais un schatg da la lingua rumantscha.", language: "Romansh" },
  { text: "El rápido zorro marrón salta sobre el perro perezoso.", language: "Spanish" },
  { text: "Le rapide renard brun saute par-dessus le chien paresseux.", language: "French" },
  { text: "Der schnelle braune Fuchs springt über den faulen Hund.", language: "German" },
  { text: "素早い茶色のキツネがのろまな犬を飛び越えます。", language: "Japanese" }
];

// State
let currentRound = null;
let streak = 0;
let bestStreak = parseInt(localStorage.getItem("glotle_best")) || 0;
let isHardMode = false;

// Elements
const sentenceEl = document.getElementById("sentence-prompt");
const inputEl = document.getElementById("language-input");
const suggestionsEl = document.getElementById("suggestions-list");
const submitBtn = document.getElementById("submit-btn");
const feedbackEl = document.getElementById("feedback-msg");
const streakEl = document.getElementById("streak-count");
const bestStreakEl = document.getElementById("best-streak");
const flashOverlay = document.getElementById("flash-overlay");
const historyList = document.getElementById("history-list");

// Init
bestStreakEl.textContent = bestStreak;
loadNextRound();

// Autocomplete logic
inputEl.addEventListener("input", () => {
  const query = inputEl.value.trim().toLowerCase();
  suggestionsEl.innerHTML = "";
  
  if (!query || isHardMode) return;

  const matches = allLanguages.filter(lang => lang.toLowerCase().startsWith(query));
  matches.forEach(match => {
    const li = document.createElement("li");
    li.textContent = match;
    li.addEventListener("click", () => {
      inputEl.value = match;
      suggestionsEl.innerHTML = "";
    });
    suggestionsEl.appendChild(li);
  });
});

// Close autocomplete when clicking outside
document.addEventListener("click", (e) => {
  if (e.target !== inputEl) suggestionsEl.innerHTML = "";
});

// Handle guess
function makeGuess() {
  const userGuess = inputEl.value.trim();
  if (!userGuess) return;

  if (userGuess.toLowerCase() === currentRound.language.toLowerCase()) {
    // Correct Answer
    triggerFlash("correct-flash");
    streak++;
    if (streak > bestStreak) {
      bestStreak = streak;
      localStorage.setItem("glotle_best", bestStreak);
      bestStreakEl.textContent = bestStreak;
    }
    feedbackEl.style.color = "#27ae60";
    feedbackEl.textContent = "Correct!";
    
    setTimeout(() => {
      loadNextRound();
    }, 600); // Quick transition for continuous play

  } else {
    // Incorrect Answer
    triggerFlash("wrong-flash");
    streak = 0;
    feedbackEl.style.color = "#e74c3c";
    feedbackEl.textContent = `Wrong! That was ${currentRound.language}.`;
    
    const li = document.createElement("li");
    li.textContent = `❌ ${userGuess} (Answer: ${currentRound.language})`;
    historyList.prepend(li);
    
    setTimeout(() => {
      loadNextRound();
    }, 1200);
  }

  streakEl.textContent = streak;
  inputEl.value = "";
  suggestionsEl.innerHTML = "";
}

function loadNextRound() {
  const randomIndex = Math.floor(Math.random() * database.length);
  currentRound = database[randomIndex];
  sentenceEl.textContent = `"${currentRound.text}"`;
  feedbackEl.textContent = "";
}

function triggerFlash(className) {
  flashOverlay.className = className;
  setTimeout(() => { flashOverlay.className = ""; }, 200);
}

submitBtn.addEventListener("click", makeGuess);
inputEl.addEventListener("keypress", (e) => {
  if (e.key === "Enter") makeGuess();
});

// Navigation Views
document.getElementById("nav-game-btn").addEventListener("click", (e) => {
  showView("game-view");
  setActiveNav(e.target);
});
document.getElementById("nav-about-btn").addEventListener("click", (e) => {
  showView("about-view");
  setActiveNav(e.target);
});

function showView(viewId) {
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  document.getElementById(viewId).classList.remove("hidden");
}

function setActiveNav(btn) {
  document.querySelectorAll("nav button").forEach(b => b.classList.remove("active-nav"));
  btn.classList.add("active-nav");
}

// Settings Modal
const modal = document.getElementById("settings-modal");
document.getElementById("settings-btn").addEventListener("click", () => modal.classList.remove("hidden"));
document.getElementById("close-modal").addEventListener("click", () => modal.classList.add("hidden"));

document.getElementById("dark-mode").addEventListener("change", (e) => {
  document.body.classList.toggle("dark-theme", e.target.checked);
});

document.getElementById("hard-mode").addEventListener("change", (e) => {
  isHardMode = e.target.checked;
});
