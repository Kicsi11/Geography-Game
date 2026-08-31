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

// Local Storage Keys
const LOCAL_STORAGE_KEY_LEADERBOARD = 'glotle_leaderboard';
const LOCAL_STORAGE_KEY_USERNAME = 'glotle_username';
const LOCAL_STORAGE_KEY_USER_ID = 'glotle_user_id';

// Unique Player Identifier (prevents hijacking/overwriting scores)
let userId = localStorage.getItem(LOCAL_STORAGE_KEY_USER_ID);
if (!userId) {
  userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem(LOCAL_STORAGE_KEY_USER_ID, userId);
}

// Game State
let database = [];
let currentRound = null;
let streak = 0;
let bestStreak = parseInt(localStorage.getItem("glotle_best")) || 0;
let selectedSuggestionIndex = -1;
let currentRegion = "Europe";
let playerUsername = localStorage.getItem(LOCAL_STORAGE_KEY_USERNAME) || '';

let userStats = JSON.parse(localStorage.getItem("glotle_user_stats")) || {
  guesses: 0,
  correctGuesses: 0,
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
const shareBtn = document.getElementById("share-btn");
const regionSelect = document.getElementById("region-select");
const logoBtn = document.getElementById("logo-btn");

// Account & Leaderboard DOM Elements
const usernameInput = document.getElementById('username-input');
const saveUsernameBtn = document.getElementById('save-username-btn');
const leaderboardList = document.getElementById('leaderboard-list');
const userRankDisplay = document.getElementById('user-rank-display');

// Modal & Settings Controls
const settingsOpenBtn = document.getElementById("settings-open-btn");
const settingsModal = document.getElementById("settings-modal");
const closeModalBtn = document.getElementById("close-modal-btn");
const backToGameBtn = document.getElementById("back-to-game-btn");
const infoLinkBtns = document.querySelectorAll(".info-link-btn");

bestStreakEl.textContent = bestStreak;

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
    loadNextRound();
  } catch (err) {
    sentenceEl.textContent = "Error loading sentence database.";
    console.error(err);
  }
}

initDatabase();

// Region Selection
if (regionSelect) {
  regionSelect.addEventListener("change", (e) => {
    currentRegion = e.target.value;
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

  userStats.guesses++;

  if (userGuess.toLowerCase() === currentRound.language.toLowerCase()) {
    triggerFlash("correct-flash");
    streak++;
    userStats.correctGuesses++;

    if (streak % 5 === 0 && typeof confetti === "function") {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    }

    if (streak > bestStreak) {
      bestStreak = streak;
      localStorage.setItem("glotle_best", bestStreak);
      bestStreakEl.textContent = bestStreak;
      updateLeaderboardScore(bestStreak);
    }

    if (streak > userStats.bestStreak) {
      userStats.bestStreak = streak;
    }

    feedbackEl.style.color = "#10b981";
    feedbackEl.textContent = "Correct!";
    setTimeout(loadNextRound, 400);

  } else {
    triggerFlash("wrong-flash");
    streak = 0;
    feedbackEl.style.color = "#ef4444";
    feedbackEl.textContent = `Incorrect. The answer was ${currentRound.language}.`;
    setTimeout(loadNextRound, 1000);
  }

  saveStats();
  streakEl.textContent = streak;
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

function saveStats() {
  localStorage.setItem("glotle_user_stats", JSON.stringify(userStats));
}

// Leaderboard & Account Storage Logic
function getLeaderboard() {
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY_LEADERBOARD);
  if (stored) {
    return JSON.parse(stored);
  }
  
  const defaultBoard = [
    { id: "def_1", name: "LinguistPro", streak: 42 },
    { id: "def_2", name: "PolyglotMaster", streak: 35 },
    { id: "def_3", name: "WordSmith", streak: 28 },
    { id: "def_4", name: "AtlasMapper", streak: 21 },
    { id: "def_5", name: "GlobalGuesser", streak: 18 }
  ];
  localStorage.setItem(LOCAL_STORAGE_KEY_LEADERBOARD, JSON.stringify(defaultBoard));
  return defaultBoard;
}

function updateLeaderboardScore(newStreak) {
  let leaderboard = getLeaderboard();
  const nameToUse = playerUsername.trim() || 'Anonymous Player';

  // Search by unique player ID instead of name
  const existingIndex = leaderboard.findIndex(entry => entry.id === userId);

  if (existingIndex !== -1) {
    leaderboard[existingIndex].name = nameToUse;
    if (newStreak > leaderboard[existingIndex].streak) {
      leaderboard[existingIndex].streak = newStreak;
    }
  } else if (newStreak > 0) {
    leaderboard.push({ id: userId, name: nameToUse, streak: newStreak });
  }

  // Sort descending and cap at top 1000
  leaderboard.sort((a, b) => b.streak - a.streak);
  leaderboard = leaderboard.slice(0, 1000);

  localStorage.setItem(LOCAL_STORAGE_KEY_LEADERBOARD, JSON.stringify(leaderboard));
  renderLeaderboard();
}

function renderLeaderboard() {
  if (!leaderboardList) return;

  const leaderboard = getLeaderboard();
  leaderboardList.innerHTML = '';
  let userRank = -1;

  leaderboard.forEach((entry, index) => {
    const rank = index + 1;
    const isCurrentUser = entry.id === userId;
    if (isCurrentUser) userRank = rank;

    let rankClass = '';
    if (rank === 1) rankClass = 'gold';
    else if (rank === 2) rankClass = 'silver';
    else if (rank === 3) rankClass = 'bronze';

    const li = document.createElement('li');
    li.className = `leaderboard-item ${rankClass} ${isCurrentUser ? 'current-player' : ''}`;
    li.innerHTML = `
      <span class="rank">#${rank}</span>
      <span class="player-name">${escapeHTML(entry.name)} ${isCurrentUser ? '<span class="you-tag">(You)</span>' : ''}</span>
      <span class="score-val">${entry.streak} Streak</span>
    `;
    leaderboardList.appendChild(li);
  });

  if (userRankDisplay) {
    if (userRank !== -1) {
      userRankDisplay.textContent = `Your Rank: #${userRank} of ${leaderboard.length}`;
    } else if (bestStreak > 0) {
      userRankDisplay.textContent = `Your Rank: Unranked (Cutoff is ${leaderboard[leaderboard.length - 1]?.streak || 1})`;
    } else {
      userRankDisplay.textContent = `Your Rank: Unranked`;
    }
  }
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// Save Username Event Listener (with name protection)
if (usernameInput && saveUsernameBtn) {
  usernameInput.value = playerUsername;

  saveUsernameBtn.addEventListener('click', () => {
    const newName = usernameInput.value.trim();

    if (!newName) return;

    const leaderboard = getLeaderboard();

    // Check if the requested name is taken by another player ID
    const isNameTaken = leaderboard.some(
      entry => entry.name.toLowerCase() === newName.toLowerCase() && entry.id !== userId
    );

    if (isNameTaken) {
      alert(`The name "${newName}" is already taken by another player on the leaderboard!`);
      return;
    }

    playerUsername = newName;
    localStorage.setItem(LOCAL_STORAGE_KEY_USERNAME, playerUsername);

    updateLeaderboardScore(bestStreak);

    saveUsernameBtn.textContent = 'Saved!';
    setTimeout(() => saveUsernameBtn.textContent = 'Save', 1500);
  });
}

// Navigation & Modal Controls
settingsOpenBtn.addEventListener("click", () => {
  document.getElementById("stat-guesses").textContent = userStats.guesses;
  const accuracy = userStats.guesses > 0 ? Math.round((userStats.correctGuesses / userStats.guesses) * 100) : 0;
  document.getElementById("stat-accuracy").textContent = `${accuracy}%`;
  document.getElementById("stat-best-streak").textContent = bestStreak;
  
  renderLeaderboard();
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

shareBtn.addEventListener("click", () => {
  const shareText = `Glotle (${currentRegion})\nCurrent Streak: ${streak}\nBest Streak: ${bestStreak}`;
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(shareText).then(() => alert("Score copied to clipboard!"));
  } else {
    alert(shareText);
  }
});

submitBtn.addEventListener("click", makeGuess);

// Initial Leaderboard Load
renderLeaderboard();
