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
let textDatabase = [];
let audioDatabase = [];
let currentRound = null;
let selectedSuggestionIndex = -1;
let currentRegion = "Europe";
let currentMode = "text";
let activeAudioObject = null;

let modeRegionalStreaks = JSON.parse(localStorage.getItem("glotle_mode_regional_streaks")) || {};

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
const regionSelectContainer = document.getElementById("region-select-container");
const modeSelect = document.getElementById("mode-select");
const logoBtn = document.getElementById("logo-btn");

// Modal Controls
const settingsOpenBtn = document.getElementById("settings-open-btn");
const settingsModal = document.getElementById("settings-modal");
const closeModalBtn = document.getElementById("close-modal-btn");
const backToGameBtn = document.getElementById("back-to-game-btn");
const infoLinkBtns = document.querySelectorAll(".info-link-btn");

function getStreakKey() {
  if (currentMode === "audio") {
    return "audio_global";
  }
  return `${currentMode}_${currentRegion}`;
}

function ensureStreakKeyExists() {
  const key = getStreakKey();
  if (!modeRegionalStreaks[key]) {
    modeRegionalStreaks[key] = { current: 0, best: 0 };
  }
  return key;
}

function updateStreakDisplay() {
  const key = ensureStreakKeyExists();
  streakEl.textContent = modeRegionalStreaks[key].current;
  bestStreakEl.textContent = modeRegionalStreaks[key].best;
}

function stopCurrentAudio() {
  if (activeAudioObject) {
    activeAudioObject.pause();
    activeAudioObject.currentTime = 0;
    activeAudioObject = null;
  }
  const playBtn = document.getElementById("play-audio-btn");
  if (playBtn) {
    playBtn.classList.remove("playing");
  }
}

function playAudioFile(fileName, buttonElement) {
  stopCurrentAudio();

  if (!fileName) {
    alert("Audio file missing for this item.");
    return;
  }

  const audioPath = `audio/${fileName}`;
  activeAudioObject = new Audio(audioPath);

  if (buttonElement) {
    buttonElement.classList.add("playing");
  }

  activeAudioObject.play().catch(err => {
    console.error("Playback failed:", err);
    alert("Could not load or play audio file: " + fileName);
    if (buttonElement) buttonElement.classList.remove("playing");
  });

  activeAudioObject.onended = () => {
    if (buttonElement) buttonElement.classList.remove("playing");
    activeAudioObject = null;
  };

  activeAudioObject.onerror = () => {
    if (buttonElement) buttonElement.classList.remove("playing");
    activeAudioObject = null;
  };
}

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

async function initDatabase() {
  try {
    const response = await fetch("database.json");
    const data = await response.json();
    textDatabase = data.textDatabase || [];
    audioDatabase = data.audioDatabase || [];
    
    updateStreakDisplay();
    loadNextRound();
  } catch (err) {
    sentenceEl.textContent = "Error loading database file.";
    console.error(err);
  }
}

initDatabase();

if (modeSelect) {
  currentMode = modeSelect.value;
  modeSelect.addEventListener("change", (e) => {
    currentMode = e.target.value;
    stopCurrentAudio();

    if (currentMode === "audio") {
      regionSelectContainer.style.display = "none";
    } else {
      regionSelectContainer.style.display = "block";
    }

    updateStreakDisplay();
    loadNextRound();
  });
}

if (regionSelect) {
  currentRegion = regionSelect.value;
  regionSelect.addEventListener("change", (e) => {
    currentRegion = e.target.value;
    stopCurrentAudio();
    updateStreakDisplay();
    loadNextRound();
  });
}

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
  
  if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey && items.length > 0)) {
    e.preventDefault();
    if (items.length > 0) {
      selectedSuggestionIndex = (selectedSuggestionIndex + 1) % items.length;
      updateSuggestionSelection(items);
    }
  } else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey && items.length > 0)) {
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
  } else if (e.key === "Escape") {
    suggestionsEl.innerHTML = "";
  }
});

function updateSuggestionSelection(items) {
  items.forEach((item, index) => {
    if (index === selectedSuggestionIndex) {
      item.classList.add("selected");
      item.scrollIntoView({ block: "nearest" });
      inputEl.value = item.textContent;
    } else {
      item.classList.remove("selected");
    }
  });
}

document.addEventListener("click", (e) => {
  if (e.target !== inputEl) suggestionsEl.innerHTML = "";
});

function makeGuess() {
  const userGuess = inputEl.value.trim();
  if (!userGuess || !currentRound) return;

  const key = ensureStreakKeyExists();
  const activeData = modeRegionalStreaks[key];

  userStats.guesses++;

  if (userGuess.toLowerCase() === currentRound.language.toLowerCase()) {
    triggerFlash("correct-flash");
    
    activeData.current++;
    userStats.correctGuesses++;

    if (activeData.current % 5 === 0 && typeof confetti === "function") {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    }

    if (activeData.current > activeData.best) {
      activeData.best = activeData.current;
    }

    if (activeData.best > userStats.overallBestStreak) {
      userStats.overallBestStreak = activeData.best;
    }

    feedbackEl.style.color = "#10b981";
    feedbackEl.textContent = "Correct!";
    setTimeout(loadNextRound, 400);

  } else {
    triggerFlash("wrong-flash");
    
    activeData.current = 0;
    
    feedbackEl.style.color = "#ef4444";
    feedbackEl.textContent = `Incorrect. The answer was ${currentRound.language}.`;
    setTimeout(loadNextRound, 1000);
  }

  saveData();
  updateStreakDisplay();
  suggestionsEl.innerHTML = "";
}

function loadNextRound() {
  stopCurrentAudio();
  inputEl.value = "";
  feedbackEl.textContent = "";

  if (currentMode === "audio") {
    if (!audioDatabase.length) {
      sentenceEl.textContent = "No audio clips available in database.";
      return;
    }

    const randomIndex = Math.floor(Math.random() * audioDatabase.length);
    currentRound = audioDatabase[randomIndex];

    sentenceEl.innerHTML = `
      <button id="play-audio-btn" class="audio-play-button" aria-label="Listen to audio prompt">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="speaker-icon">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
        </svg>
      </button>
    `;
    
    const playBtn = document.getElementById("play-audio-btn");
    playBtn.addEventListener("click", () => {
      playAudioFile(currentRound.audioFile, playBtn);
    });

  } else {
    if (!textDatabase.length) {
      sentenceEl.textContent = "No text prompts available in database.";
      return;
    }

    let activePool = currentRegion === "World" 
      ? textDatabase 
      : textDatabase.filter(item => item.region === currentRegion);

    if (activePool.length === 0) activePool = textDatabase;

    const randomIndex = Math.floor(Math.random() * activePool.length);
    currentRound = activePool[randomIndex];
    sentenceEl.textContent = `"${currentRound.text}"`;
  }
}

function triggerFlash(className) {
  flashOverlay.className = className;
  setTimeout(() => { flashOverlay.className = ""; }, 200);
}

function saveData() {
  localStorage.setItem("glotle_mode_regional_streaks", JSON.stringify(modeRegionalStreaks));
  localStorage.setItem("glotle_user_stats", JSON.stringify(userStats));
}

settingsOpenBtn.addEventListener("click", () => {
  document.getElementById("stat-guesses").textContent = userStats.guesses;
  const accuracy = userStats.guesses > 0 ? Math.round((userStats.correctGuesses / userStats.guesses) * 100) : 0;
  document.getElementById("stat-accuracy").textContent = `${accuracy}%`;
  
  const comboBests = Object.values(modeRegionalStreaks).map(item => item.best || 0);
  const maxStreak = Math.max(0, userStats.overallBestStreak || 0, ...comboBests);
  
  document.getElementById("stat-best-streak").textContent = maxStreak;
  
  settingsModal.classList.remove("hidden");
});

closeModalBtn.addEventListener("click", () => settingsModal.classList.add("hidden"));

window.addEventListener("click", (e) => {
  if (e.target === settingsModal) {
    settingsModal.classList.add("hidden");
  }
});

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
