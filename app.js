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

const database = [
  { text: "Acesta este un test în limba română.", language: "Romanian" },
  { text: "Cai si si ek testo andi Romani chib.", language: "Romani" },
  { text: "Cquest ais un schatg da la lingua rumantscha.", language: "Romansh" },
  { text: "El rápido zorro marrón salta sobre el perro perezoso.", language: "Spanish" },
  { text: "Le rapide renard brun saute par-dessus le chien paresseux.", language: "French" },
  { text: "Der schnelle braune Fuchs springt über den faulen Hund.", language: "German" },
  { text: "素早い茶色のキツネがのろまな犬を飛び越えます。", language: "Japanese" },
  { text: "빠른 갈색 여우가 게으른 개를 뛰어넘습니다.", language: "Korean" },
  { text: "Быстрая коричневая лиса прыгает через ленивую собаку.", language: "Russian" }
];

let gameMode = "endless"; // "endless" or "daily"
let currentRound = null;
let streak = 0;
let bestStreak = parseInt(localStorage.getItem("glotle_best")) || 0;
let selectedSuggestionIndex = -1;

// Daily Challenge State
let dailyRoundIndex = 0;
let dailyScore = 0;
const todayKey = new Date().toISOString().slice(0, 10);
let dailyCompleted = localStorage.getItem(`glotle_daily_${todayKey}`) === "true";

// Stats Tracking
let userStats = JSON.parse(localStorage.getItem("glotle_user_stats")) || {
  played: 0,
  wins: 0,
  currStreak: 0,
  bestStreak: 0
};

// DOM Elements
const sentenceEl = document.getElementById("sentence-prompt");
const inputEl = document.getElementById("language-input");
const suggestionsEl = document.getElementById("suggestions-list");
const submitBtn = document.getElementById("submit-btn");
const feedbackEl = document.getElementById("feedback-msg");
const streakEl = document.getElementById("streak-count");
const bestStreakEl = document.getElementById("best-streak");
const flashOverlay = document.getElementById("flash-overlay");
const themeToggleBtn = document.getElementById("theme-toggle");
const shareBtn = document.getElementById("share-btn");
const roundBadge = document.getElementById("round-badge");
const modeLabel = document.getElementById("mode-label");

// Stats Modal Elements
const statsModalBtn = document.getElementById("stats-modal-btn");
const statsModal = document.getElementById("stats-modal");
const closeModalBtn = document.getElementById("close-modal-btn");

// Initialize Game
bestStreakEl.innerHTML = `${bestStreak} <span class="trophy-icon">🏆</span>`;
loadNextRound();

// Autocomplete Input Handling
inputEl.addEventListener("input", () => {
  const query = inputEl.value.trim().toLowerCase();
  suggestionsEl.innerHTML = "";
  selectedSuggestionIndex = -1;
  
  if (!query) return;

  const matches = allLanguages.filter(lang => lang.toLowerCase().startsWith(query));
  matches.forEach((match, index) => {
    const li = document.createElement("li");
    li.textContent = match;
    li.dataset.index = index;
    
    li.addEventListener("click", () => {
      inputEl.value = match;
      suggestionsEl.innerHTML = "";
      inputEl.focus();
    });
    
    suggestionsEl.appendChild(li);
  });
});

// Keyboard Navigation
inputEl.addEventListener("keydown", (e) => {
  const items = suggestionsEl.querySelectorAll("li");
  
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (items.length > 0) {
      selectedSuggestionIndex = (selectedSuggestionIndex + 1) % items.length;
      updateSuggestionSelection(items);
    }
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (items.length > 0) {
      selectedSuggestionIndex = (selectedSuggestionIndex - 1 + items.length) % items.length;
      updateSuggestionSelection(items);
    }
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (selectedSuggestionIndex >= 0 && items[selectedSuggestionIndex]) {
      inputEl.value = items[selectedSuggestionIndex].textContent;
      suggestionsEl.innerHTML = "";
    }
    makeGuess();
  }
});

function updateSuggestionSelection(items) {
  items.forEach((item, index) => {
    if (index === selectedSuggestionIndex) {
      item.classList.add("selected");
      item.scrollIntoView({ block: "nearest" });
    } else {
      item.classList.remove("selected");
    }
  });
}

document.addEventListener("click", (e) => {
  if (e.target !== inputEl) suggestionsEl.innerHTML = "";
});

// Handle Guesses
function makeGuess() {
  const userGuess = inputEl.value.trim();
  if (!userGuess) return;

  userStats.played++;

  if (userGuess.toLowerCase() === currentRound.language.toLowerCase()) {
    triggerFlash("correct-flash");
    userStats.wins++;
    userStats.currStreak++;

    if (gameMode === "endless") {
      streak++;
      if (streak % 5 === 0 && typeof confetti === "function") {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
      if (streak > bestStreak) {
        bestStreak = streak;
        localStorage.setItem("glotle_best", bestStreak);
        bestStreakEl.innerHTML = `${bestStreak} <span class="trophy-icon">🏆</span>`;
      }
    } else {
      dailyScore++;
    }

    if (userStats.currStreak > userStats.bestStreak) {
      userStats.bestStreak = userStats.currStreak;
    }

    feedbackEl.style.color = "var(--accent-green)";
    feedbackEl.textContent = "Correct!";
    setTimeout(loadNextRound, 400);

  } else {
    triggerFlash("wrong-flash");
    userStats.currStreak = 0;

    if (gameMode === "endless") {
      streak = 0;
    }

    feedbackEl.style.color = "var(--accent-red)";
    feedbackEl.textContent = `Wrong! That was ${currentRound.language}.`;
    setTimeout(loadNextRound, 1000);
  }

  saveStats();
  if (gameMode === "endless") {
    streakEl.innerHTML = `${streak} <span class="fire-icon">🔥</span>`;
  }
  inputEl.value = "";
  suggestionsEl.innerHTML = "";
}

function loadNextRound() {
  if (gameMode === "daily") {
    if (dailyCompleted) {
      sentenceEl.textContent = "You completed today's Daily Challenge! Come back tomorrow.";
      inputEl.disabled = true;
      submitBtn.disabled = true;
      roundBadge.textContent = "Daily Finished";
      return;
    }

    if (dailyRoundIndex >= 5) {
      dailyCompleted = true;
      localStorage.setItem(`glotle_daily_${todayKey}`, "true");
      sentenceEl.textContent = `Daily Challenge Complete! Your Score: ${dailyScore}/5`;
      inputEl.disabled = true;
      submitBtn.disabled = true;
      roundBadge.textContent = "Daily Complete 🎉";
      
      if (typeof confetti === "function") {
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
      }
      return;
    }

    // Daily Deterministic Order
    currentRound = database[dailyRoundIndex % database.length];
    roundBadge.textContent = `Daily Challenge (${dailyRoundIndex + 1}/5)`;
    dailyRoundIndex++;
  } else {
    inputEl.disabled = false;
    submitBtn.disabled = false;
    roundBadge.textContent = "Endless Language Challenge";
    const randomIndex = Math.floor(Math.random() * database.length);
    currentRound = database[randomIndex];
  }

  sentenceEl.textContent = `"${currentRound.text}"`;
  feedbackEl.textContent = "";
}

function triggerFlash(className) {
  flashOverlay.className = className;
  setTimeout(() => { flashOverlay.className = ""; }, 200);
}

function saveStats() {
  localStorage.setItem("glotle_user_stats", JSON.stringify(userStats));
}

// Modal View Controls
statsModalBtn.addEventListener("click", () => {
  document.getElementById("stat-played").textContent = userStats.played;
  const winPercent = userStats.played > 0 ? Math.round((userStats.wins / userStats.played) * 100) : 0;
  document.getElementById("stat-winrate").textContent = `${winPercent}%`;
  document.getElementById("stat-curr-streak").textContent = userStats.currStreak;
  document.getElementById("stat-best-streak").textContent = userStats.bestStreak;
  
  statsModal.classList.remove("hidden");
});

closeModalBtn.addEventListener("click", () => {
  statsModal.classList.add("hidden");
});

// Share Button
shareBtn.addEventListener("click", () => {
  const gameUrl = "https://kicsi11.github.io/Geography-Game/";
  let shareText = "";

  if (gameMode === "daily") {
    shareText = `🌐 Glotle Daily Challenge (${todayKey})\nScore: ${dailyScore}/5 🎯\nPlay here: ${gameUrl}`;
  } else {
    shareText = `🌐 Glotle Score\nStreak: ${streak} 🔥\nBest Streak: ${bestStreak} 🏆\nPlay here: ${gameUrl}`;
  }

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(shareText).then(() => {
      alert("Score copied to clipboard!");
    });
  } else {
    const tempInput = document.createElement("textarea");
    tempInput.value = shareText;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);
    alert("Score copied to clipboard!");
  }
});

submitBtn.addEventListener("click", makeGuess);

// Nav & Mode Switching
document.getElementById("nav-game-btn").addEventListener("click", (e) => {
  gameMode = "endless";
  modeLabel.textContent = "Endless Streak";
  streakEl.innerHTML = `${streak} <span class="fire-icon">🔥</span>`;
  showView("game-view");
  setActiveNav(e.target);
  loadNextRound();
});

document.getElementById("nav-daily-btn").addEventListener("click", (e) => {
  gameMode = "daily";
  dailyRoundIndex = 0;
  dailyScore = 0;
  modeLabel.textContent = "Daily Progress";
  streakEl.innerHTML = `${dailyScore}/5 🎯`;
  showView("game-view");
  setActiveNav(e.target);
  loadNextRound();
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
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}

// Dark Mode Toggle
themeToggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark-theme");
  const isDark = document.body.classList.contains("dark-theme");
  themeToggleBtn.textContent = isDark ? "☀️" : "🌙";
});
