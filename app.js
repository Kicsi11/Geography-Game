const allLanguages = [
  "Afrikaans", "Albanian", "Arabic", "Armenian", "Azerbaijani", "Basque", "Belarusian", 
  "Bengali", "Bosnian", "Bulgarian", "Catalan", "Chinese", "Croatian", "Czech", 
  "Danish", "Dutch", "English", "Estonian", "Finnish", "French", "Georgian", 
  "German", "Greek", "Hebrew", "Hindi", "Hungarian", "Icelandic", "Indonesian", 
  "Irish", "Italian", "Japanese", "Korean", "Latvian", "Lithuanian", "Macedonian", 
  "Malay", "Maori", "Maltese", "Mongolian", "Nepali", "Norwegian", "Persian", "Polish", 
  "Portuguese", "Punjabi", "Romani", "Romanian", "Romansh", "Russian", "Serbian", 
  "Slovak", "Slovenian", "Spanish", "Swahili", "Swedish", "Tagalog", "Thai", 
  "Turkish", "Ukrainian", "Urdu", "Vietnamese", "Welsh"
];

// Game State & Local Storage Initialization
let database = [];
let currentRound = null;
let selectedSuggestionIndex = -1;
let currentRegion = "Europe";

// Per-region streak tracking
let regionalStreaks = JSON.parse(localStorage.getItem("glotle_regional_streaks")) || {
  "Europe": { current: 0, best: 0 },
  "Africa": { current: 0, best: 0 },
  "Asia": { current: 0, best: 0 },
  "Americas and Pacific": { current: 0, best: 0 },
  "World": { current: 0, best: 0 }
};

let userStats = JSON.parse(localStorage.getItem("glotle_user_stats")) || {
  guesses: 0,
  correctGuesses: 0,
  overallBestStreak: 0
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
const shareBtn = document.getElementById("share-btn");
const regionSelect = document.getElementById("region-select");
const logoBtn = document.getElementById("logo-btn");

// Modal Controls
const settingsOpenBtn = document.getElementById("settings-open-btn");
const settingsModal = document.getElementById("settings-modal");
const closeModalBtn = document.getElementById("close-modal-btn");
const backToGameBtn = document.getElementById("back-to-game-btn");
const infoLinkBtns = document.querySelectorAll(".info-link-btn");

// Ensure selected region structure exists
function ensureRegionExists(region) {
  if (!regionalStreaks[region]) {
    regionalStreaks[region] = { current: 0, best: 0 };
  }
}

// Update streak UI numbers for the current region
function updateStreakDisplay() {
  ensureRegionExists(currentRegion);
  streakEl.textContent = regionalStreaks[currentRegion].current;
  bestStreakEl.textContent = regionalStreaks[currentRegion].best;
}

// Fast Spin Logo Effect
if (logoBtn) {
  logoBtn.addEventListener("click", () => {
    const globe = logoBtn.querySelector(".globe-icon");
    if (globe && !globe.classList.contains("fast-spin")) {
      globe.classList.add("fast-spin");
      setTimeout(() => {
        globe.classList.remove("fast-spin");
      }, 1000);
    }
  });
}

// Fetch Sentence Database
async function initDatabase() {
  try {
    const response = await fetch("database.json");
    database = await response.json();
    updateStreakDisplay();
    loadNextRound();
  } catch (err) {
    sentenceEl.textContent = "Error loading sentence database.";
    console.error(err);
  }
}

initDatabase();

// Region Selection Event
if (regionSelect) {
  currentRegion = regionSelect.value;
  regionSelect.addEventListener("change", (e) => {
    currentRegion = e.target.value;
    updateStreakDisplay();
    loadNextRound();
  });
}

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

// Game Core Logic
function makeGuess() {
  const userGuess = inputEl.value.trim();
  if (!userGuess || !currentRound) return;

  ensureRegionExists(currentRegion);
  const activeData = regionalStreaks[currentRegion];

  userStats.guesses++;

  if (userGuess.toLowerCase() === currentRound.language.toLowerCase()) {
    triggerFlash("correct-flash");
    
    // Increment active region streak
    activeData.current++;
    userStats.correctGuesses++;

    if (activeData.current % 5 === 0 && typeof confetti === "function") {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    }

    // Update Best Streak for Current Region
    if (activeData.current > activeData.best) {
      activeData.best = activeData.current;
    }

    // Update Overall Best Streak across all regions
    if (activeData.best > userStats.overallBestStreak) {
      userStats.overallBestStreak = activeData.best;
    }

    feedbackEl.style.color = "#10b981";
    feedbackEl.textContent = "Correct!";
    setTimeout(loadNextRound, 400);

  } else {
    triggerFlash("wrong-flash");
    
    // Reset active region streak only
    activeData.current = 0;
    
    feedbackEl.style.color = "#ef4444";
    feedbackEl.textContent = `Incorrect. The answer was ${currentRound.language}.`;
    setTimeout(loadNextRound, 1000);
  }

  saveData();
  updateStreakDisplay();
  inputEl.value = "";
  suggestionsEl.innerHTML = "";
}

function loadNextRound() {
  if (!database.length) return;

  const filteredPool = currentRegion === "World" 
    ? database 
    : database.filter(item => item.region === currentRegion);

  const activePool = filteredPool.length > 0 ? filteredPool : database;
  const randomIndex = Math.floor(Math.random() * activePool.length);
  
  currentRound = activePool[randomIndex];
  sentenceEl.textContent = `"${currentRound.text}"`;
  feedbackEl.textContent = "";
}

function triggerFlash(className) {
  flashOverlay.className = className;
  setTimeout(() => { flashOverlay.className = ""; }, 200);
}

function saveData() {
  localStorage.setItem("glotle_regional_streaks", JSON.stringify(regionalStreaks));
  localStorage.setItem("glotle_user_stats", JSON.stringify(userStats));
}

// Navigation & Modal Controls
settingsOpenBtn.addEventListener("click", () => {
  document.getElementById("stat-guesses").textContent = userStats.guesses;
  const accuracy = userStats.guesses > 0 ? Math.round((userStats.correctGuesses / userStats.guesses) * 100) : 0;
  document.getElementById("stat-accuracy").textContent = `${accuracy}%`;
  
  // Dynamically calculate the highest streak across all saved region data
  const regionBests = Object.values(regionalStreaks).map(region => region.best || 0);
  const maxStreak = Math.max(0, userStats.overallBestStreak || 0, ...regionBests);
  
  document.getElementById("stat-best-streak").textContent = maxStreak;
  
  settingsModal.classList.remove("hidden");
});

closeModalBtn.addEventListener("click", () => settingsModal.classList.add("hidden"));

infoLinkBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const targetId = btn.dataset.target;
    settingsModal.classList.add("hidden");
    showView("info-view");
    
    document.querySelectorAll(".info-card").forEach(card => card.classList.add("hidden"));
    document.getElementById(targetId).classList.remove("hidden");
  });
});

backToGameBtn.addEventListener("click", () => showView("game-view"));

function showView(viewId) {
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  document.getElementById(viewId).classList.remove("hidden");
}

shareBtn.addEventListener("click", async () => {
  const shareData = {
    title: 'Glotle',
    text: 'Test out your language skills with Glotle!',
    url: 'https://kicsi11.github.io/Geography-Game/'
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
    } catch (err) {
      // User canceled share
    }
  } else {
    const fullMessage = `${shareData.text} ${shareData.url}`;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(fullMessage).then(() => alert("Link copied to clipboard!"));
    } else {
      alert(fullMessage);
    }
  }
});

submitBtn.addEventListener("click", makeGuess);
