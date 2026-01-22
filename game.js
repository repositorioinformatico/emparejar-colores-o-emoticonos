// ============================================
// JUEGO DE EMPAREJAR
// ============================================

// Configuracion del juego
const STORAGE_KEYS = {
    LEADERBOARD: 'memoryGame_leaderboard',
    SETTINGS: 'memoryGame_settings',
    CURRENT_PLAYER: 'memoryGame_currentPlayer'
};

// Lista de emoticonos disponibles para el juego
const EMOJI_LIST = [
    '😀', '😎', '🥳', '😍', '🤩', '😇', '🤠', '🥸',
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
    '🦁', '🐯', '🐨', '🐸', '🐵', '🐔', '🐧', '🐦',
    '🦄', '🐝', '🦋', '🐌', '🐞', '🐢', '🐙', '🦀',
    '🍎', '🍊', '🍋', '🍇', '🍓', '🍒', '🥝', '🍑',
    '🌸', '🌺', '🌻', '🌹', '🌷', '💐', '🌵', '🎄',
    '⭐', '🌙', '☀️', '🌈', '⚡', '❄️', '🔥', '💧',
    '🎈', '🎁', '🎀', '🎉', '🎊', '🎭', '🎨', '🎪',
    '⚽', '🏀', '🎾', '🎱', '🎯', '🎮', '🎲', '🧩',
    '🚗', '🚕', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒',
    '✈️', '🚀', '🛸', '🚁', '⛵', '🚢', '🎡', '🗼',
    '💎', '💰', '🏆', '🥇', '🎖️', '👑', '💍', '🔮'
];

// Configuracion de dificultades
const DIFFICULTY_CONFIG = {
    easy: {
        name: 'Facil',
        timeMultiplier: 1.5,
        baseTimePerPair: 8,
        description: 'Tiempo generoso para completar cada nivel'
    },
    medium: {
        name: 'Medio',
        timeMultiplier: 1.0,
        baseTimePerPair: 6,
        description: 'Tiempo moderado para completar cada nivel'
    },
    hard: {
        name: 'Dificil',
        timeMultiplier: 0.6,
        baseTimePerPair: 4,
        description: 'Poco tiempo! Solo para expertos'
    }
};

// Estado del juego
let gameState = {
    currentPlayer: null,
    level: 1,
    difficulty: 'medium',
    cards: [],
    flippedCards: [],
    matchedPairs: 0,
    totalPairs: 0,
    isLocked: false,
    matchedItems: [],  // Puede ser colores o emojis
    // Timer
    timeRemaining: 0,
    totalTime: 0,
    timerInterval: null,
    isGameOver: false
};

// Configuracion
let settings = {
    showLeaderboard: true,
    emojiMode: false
};

// ============================================
// UTILIDADES DE ALMACENAMIENTO
// ============================================

function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error('Error guardando en localStorage:', e);
    }
}

function loadFromStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
        console.error('Error cargando de localStorage:', e);
        return defaultValue;
    }
}

// ============================================
// GESTION DE JUGADORES Y LEADERBOARD
// ============================================

function getLeaderboard() {
    return loadFromStorage(STORAGE_KEYS.LEADERBOARD, []);
}

function saveLeaderboard(leaderboard) {
    saveToStorage(STORAGE_KEYS.LEADERBOARD, leaderboard);
}

function findPlayer(name) {
    const leaderboard = getLeaderboard();
    return leaderboard.find(p => p.name.toLowerCase() === name.toLowerCase());
}

function updatePlayerStats(playerName, wins, bestLevel) {
    const leaderboard = getLeaderboard();
    const existingIndex = leaderboard.findIndex(p => p.name.toLowerCase() === playerName.toLowerCase());

    if (existingIndex !== -1) {
        leaderboard[existingIndex].wins = wins;
        leaderboard[existingIndex].bestLevel = Math.max(leaderboard[existingIndex].bestLevel, bestLevel);
    } else {
        leaderboard.push({
            name: playerName,
            wins: wins,
            bestLevel: bestLevel
        });
    }

    leaderboard.sort((a, b) => b.wins - a.wins);
    saveLeaderboard(leaderboard);
}

function clearHistory() {
    localStorage.removeItem(STORAGE_KEYS.LEADERBOARD);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_PLAYER);
    renderLeaderboard();
}

// ============================================
// CONFIGURACION
// ============================================

function loadSettings() {
    settings = loadFromStorage(STORAGE_KEYS.SETTINGS, {
        showLeaderboard: true,
        emojiMode: false
    });
    document.getElementById('leaderboardToggle').checked = settings.showLeaderboard;
    document.getElementById('emojiModeToggle').checked = settings.emojiMode;
    toggleLeaderboardVisibility();
    updateGameTitle();
}

function saveSettings() {
    saveToStorage(STORAGE_KEYS.SETTINGS, settings);
}

function toggleLeaderboardVisibility() {
    const leaderboardSection = document.getElementById('leaderboardSection');
    if (settings.showLeaderboard) {
        leaderboardSection.classList.remove('hidden');
    } else {
        leaderboardSection.classList.add('hidden');
    }
}

function updateGameTitle() {
    const title = document.getElementById('gameTitle');
    if (settings.emojiMode) {
        title.textContent = 'Juego de Emparejar Emoticonos para guardias';
    } else {
        title.textContent = 'Juego de Emparejar Colores para guardias';
    }
}

function toggleEmojiMode(enabled) {
    settings.emojiMode = enabled;
    saveSettings();
    updateGameTitle();

    // Si hay un juego en curso, reiniciar el nivel
    if (gameState.currentPlayer && !document.getElementById('playerModal').classList.contains('hidden') === false) {
        restartLevel();
    }
}

// ============================================
// GENERACION DE COLORES Y EMOJIS
// ============================================

function generateRandomColor() {
    const r = Math.floor(Math.random() * 200) + 30;
    const g = Math.floor(Math.random() * 200) + 30;
    const b = Math.floor(Math.random() * 200) + 30;
    return `rgb(${r}, ${g}, ${b})`;
}

function generateColors(numPairs) {
    const colors = [];
    for (let i = 0; i < numPairs; i++) {
        const color = generateRandomColor();
        colors.push(color, color);
    }
    return shuffleArray(colors);
}

function generateEmojis(numPairs) {
    // Seleccionar emojis aleatorios sin repetir
    const shuffledEmojis = shuffleArray([...EMOJI_LIST]);
    const selectedEmojis = shuffledEmojis.slice(0, numPairs);

    // Duplicar cada emoji para formar parejas
    const emojiPairs = [];
    selectedEmojis.forEach(emoji => {
        emojiPairs.push(emoji, emoji);
    });

    return shuffleArray(emojiPairs);
}

function generateItems(numPairs) {
    if (settings.emojiMode) {
        return generateEmojis(numPairs);
    } else {
        return generateColors(numPairs);
    }
}

function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// ============================================
// CONFIGURACION DE NIVELES
// ============================================

function getLevelConfig(level) {
    const configs = [
        { cols: 2, pairs: 2 },   // Nivel 1
        { cols: 3, pairs: 3 },   // Nivel 2
        { cols: 3, pairs: 6 },   // Nivel 3
        { cols: 4, pairs: 8 },   // Nivel 4
        { cols: 5, pairs: 10 },  // Nivel 5
        { cols: 6, pairs: 15 }   // Nivel 6+
    ];

    const index = Math.min(level - 1, configs.length - 1);
    return configs[index];
}

// ============================================
// TEMPORIZADOR
// ============================================

function calculateLevelTime(level, difficulty) {
    const config = getLevelConfig(level);
    const difficultyConfig = DIFFICULTY_CONFIG[difficulty];

    const baseTime = config.pairs * difficultyConfig.baseTimePerPair * difficultyConfig.timeMultiplier;

    return Math.max(15, Math.min(180, Math.round(baseTime)));
}

function startTimer() {
    stopTimer();

    const totalTime = calculateLevelTime(gameState.level, gameState.difficulty);
    gameState.totalTime = totalTime;
    gameState.timeRemaining = totalTime;
    gameState.isGameOver = false;

    updateTimerDisplay();

    gameState.timerInterval = setInterval(() => {
        gameState.timeRemaining--;

        if (gameState.timeRemaining <= 0) {
            stopTimer();
            handleTimeUp();
        } else {
            updateTimerDisplay();
        }
    }, 1000);
}

function stopTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
}

function updateTimerDisplay() {
    const timerDisplay = document.getElementById('timerDisplay');
    const timerBarFill = document.getElementById('timerBarFill');

    const minutes = Math.floor(gameState.timeRemaining / 60);
    const seconds = gameState.timeRemaining % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    const percentage = (gameState.timeRemaining / gameState.totalTime) * 100;
    timerBarFill.style.width = `${percentage}%`;

    timerDisplay.classList.remove('warning', 'danger');
    timerBarFill.classList.remove('warning', 'danger');

    if (percentage <= 20) {
        timerDisplay.classList.add('danger');
        timerBarFill.classList.add('danger');
    } else if (percentage <= 40) {
        timerDisplay.classList.add('warning');
        timerBarFill.classList.add('warning');
    }
}

function handleTimeUp() {
    gameState.isGameOver = true;
    gameState.isLocked = true;

    showGameOverModal();
}

// ============================================
// RENDERIZADO DEL JUEGO
// ============================================

function createCard(item, index) {
    const card = document.createElement('div');
    card.className = 'memory-box';
    card.dataset.index = index;
    card.dataset.item = item;

    if (settings.emojiMode) {
        // Modo emoji
        card.innerHTML = `
            <div class="content">
                <div class="front"></div>
                <div class="back emoji-back">${item}</div>
            </div>
        `;
    } else {
        // Modo colores
        card.innerHTML = `
            <div class="content">
                <div class="front"></div>
                <div class="back" style="background-color: ${item};"></div>
            </div>
        `;
    }

    card.addEventListener('click', () => handleCardClick(card));
    return card;
}

function renderGame() {
    const grid = document.getElementById('gameGrid');
    const config = getLevelConfig(gameState.level);

    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${config.cols}, 80px)`;

    const items = generateItems(config.pairs);
    gameState.cards = [];
    gameState.totalPairs = config.pairs;
    gameState.matchedPairs = 0;
    gameState.flippedCards = [];
    gameState.isLocked = false;
    gameState.matchedItems = [];
    gameState.isGameOver = false;

    items.forEach((item, index) => {
        const card = createCard(item, index);
        grid.appendChild(card);
        gameState.cards.push(card);
    });

    updateGameInfo();
    renderMatchedItems();
    startTimer();
}

function updateGameInfo() {
    document.getElementById('playerName').textContent = gameState.currentPlayer?.name || '-';
    document.getElementById('levelDisplay').textContent = gameState.level;
    document.getElementById('winsDisplay').textContent = gameState.currentPlayer?.wins || 0;
    document.getElementById('difficultyDisplay').textContent = DIFFICULTY_CONFIG[gameState.difficulty].name;

    const progress = gameState.totalPairs > 0
        ? Math.round((gameState.matchedPairs / gameState.totalPairs) * 100)
        : 0;
    document.getElementById('progressDisplay').textContent = `${progress}%`;
}

function renderMatchedItems() {
    const container = document.getElementById('matchedColors');
    container.innerHTML = '';

    if (gameState.matchedItems.length === 0) {
        const itemType = settings.emojiMode ? 'Emoticonos' : 'Colores';
        container.innerHTML = `<span style="color: #666;">${itemType} emparejados apareceran aqui</span>`;
        return;
    }

    gameState.matchedItems.forEach(item => {
        const itemBox = document.createElement('div');
        itemBox.className = 'matched-item';

        if (settings.emojiMode) {
            itemBox.classList.add('emoji');
            itemBox.textContent = item;
        } else {
            itemBox.style.backgroundColor = item;
        }

        container.appendChild(itemBox);
    });
}

function renderLeaderboard() {
    const leaderboard = getLeaderboard();
    const tbody = document.getElementById('leaderboardBody');
    const emptyMsg = document.getElementById('leaderboardEmpty');

    tbody.innerHTML = '';

    if (leaderboard.length === 0) {
        emptyMsg.classList.remove('hidden');
        return;
    }

    emptyMsg.classList.add('hidden');

    leaderboard.slice(0, 10).forEach((player, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${escapeHtml(player.name)}</td>
            <td>${player.wins}</td>
            <td>${player.bestLevel}</td>
        `;

        if (gameState.currentPlayer && player.name.toLowerCase() === gameState.currentPlayer.name.toLowerCase()) {
            row.style.backgroundColor = '#e8f4fd';
            row.style.fontWeight = 'bold';
        }

        tbody.appendChild(row);
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// LOGICA DEL JUEGO
// ============================================

function handleCardClick(card) {
    if (gameState.isLocked) return;
    if (gameState.isGameOver) return;
    if (card.classList.contains('active')) return;
    if (card.classList.contains('disabled')) return;

    card.classList.add('active');
    gameState.flippedCards.push(card);

    if (gameState.flippedCards.length === 2) {
        gameState.isLocked = true;
        checkMatch();
    }
}

function checkMatch() {
    const [card1, card2] = gameState.flippedCards;
    const item1 = card1.dataset.item;
    const item2 = card2.dataset.item;

    if (item1 === item2) {
        setTimeout(() => {
            card1.classList.add('disabled');
            card2.classList.add('disabled');
            card1.classList.remove('active');
            card2.classList.remove('active');

            gameState.matchedPairs++;
            gameState.matchedItems.push(item1);
            gameState.flippedCards = [];
            gameState.isLocked = false;

            updateGameInfo();
            renderMatchedItems();

            if (gameState.matchedPairs === gameState.totalPairs) {
                handleLevelComplete();
            }
        }, 500);
    } else {
        setTimeout(() => {
            card1.classList.remove('active');
            card2.classList.remove('active');
            gameState.flippedCards = [];
            gameState.isLocked = false;
        }, 1000);
    }
}

function handleLevelComplete() {
    stopTimer();

    if (gameState.currentPlayer) {
        gameState.currentPlayer.wins++;
        updatePlayerStats(
            gameState.currentPlayer.name,
            gameState.currentPlayer.wins,
            gameState.level
        );
        saveToStorage(STORAGE_KEYS.CURRENT_PLAYER, gameState.currentPlayer);
    }

    updateGameInfo();
    renderLeaderboard();

    setTimeout(() => {
        showWinModal();
    }, 600);
}

function showWinModal() {
    const modal = document.getElementById('winModal');
    const title = document.getElementById('winTitle');
    const message = document.getElementById('winMessage');

    const timeUsed = gameState.totalTime - gameState.timeRemaining;
    const minutes = Math.floor(timeUsed / 60);
    const seconds = timeUsed % 60;
    const timeString = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    title.textContent = 'Nivel ' + gameState.level + ' Completado!';
    message.textContent = `Felicidades ${gameState.currentPlayer?.name || 'Jugador'}! Has completado el nivel ${gameState.level} en ${timeString}. Llevas ${gameState.currentPlayer?.wins || 1} victorias.`;

    title.classList.add('celebrate');
    setTimeout(() => title.classList.remove('celebrate'), 1500);

    modal.classList.remove('hidden');
}

function hideWinModal() {
    document.getElementById('winModal').classList.add('hidden');
}

function showGameOverModal() {
    const modal = document.getElementById('gameOverModal');
    const message = document.getElementById('gameOverMessage');

    const pairsLeft = gameState.totalPairs - gameState.matchedPairs;
    message.textContent = `Se acabo el tiempo, ${gameState.currentPlayer?.name || 'Jugador'}! Te faltaban ${pairsLeft} pareja${pairsLeft !== 1 ? 's' : ''} por encontrar en el nivel ${gameState.level}.`;

    modal.classList.remove('hidden');
}

function hideGameOverModal() {
    document.getElementById('gameOverModal').classList.add('hidden');
}

function nextLevel() {
    hideWinModal();
    gameState.level++;
    renderGame();
}

function restartLevel() {
    stopTimer();
    renderGame();
}

function retryLevel() {
    hideGameOverModal();
    renderGame();
}

// ============================================
// GESTION DE JUGADORES
// ============================================

function showPlayerModal() {
    const modal = document.getElementById('playerModal');
    const input = document.getElementById('playerInput');
    const returningMsg = document.getElementById('returningPlayerMsg');

    stopTimer();

    const savedPlayer = loadFromStorage(STORAGE_KEYS.CURRENT_PLAYER);
    if (savedPlayer) {
        input.value = savedPlayer.name;
        const existingPlayer = findPlayer(savedPlayer.name);
        if (existingPlayer) {
            returningMsg.textContent = `Bienvenido de nuevo! Tienes ${existingPlayer.wins} victorias y tu mejor nivel es ${existingPlayer.bestLevel}.`;
            returningMsg.classList.remove('hidden');
        }
    } else {
        input.value = '';
        returningMsg.classList.add('hidden');
    }

    selectDifficulty('medium');

    modal.classList.remove('hidden');
    input.focus();
}

function hidePlayerModal() {
    document.getElementById('playerModal').classList.add('hidden');
}

function selectDifficulty(difficulty) {
    gameState.difficulty = difficulty;

    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.difficulty === difficulty) {
            btn.classList.add('selected');
        }
    });

    document.getElementById('difficultyInfo').textContent = DIFFICULTY_CONFIG[difficulty].description;
}

function startGame() {
    const input = document.getElementById('playerInput');
    const playerName = input.value.trim();

    if (!playerName) {
        input.style.borderColor = '#dc3545';
        input.placeholder = 'Por favor, introduce un nombre';
        return;
    }

    input.style.borderColor = '#ddd';

    const existingPlayer = findPlayer(playerName);

    if (existingPlayer) {
        gameState.currentPlayer = {
            name: existingPlayer.name,
            wins: existingPlayer.wins,
            bestLevel: existingPlayer.bestLevel
        };
    } else {
        gameState.currentPlayer = {
            name: playerName,
            wins: 0,
            bestLevel: 0
        };
        updatePlayerStats(playerName, 0, 0);
    }

    saveToStorage(STORAGE_KEYS.CURRENT_PLAYER, gameState.currentPlayer);

    gameState.level = 1;
    hidePlayerModal();
    renderGame();
    renderLeaderboard();
}

function changePlayer() {
    stopTimer();
    showPlayerModal();
}

function continueWithPlayer() {
    hideWinModal();
    gameState.level++;
    renderGame();
}

function startWithNewPlayer() {
    hideWinModal();
    stopTimer();
    gameState.level = 1;
    gameState.currentPlayer = null;
    localStorage.removeItem(STORAGE_KEYS.CURRENT_PLAYER);
    showPlayerModal();
}

function gameOverNewPlayer() {
    hideGameOverModal();
    stopTimer();
    gameState.level = 1;
    gameState.currentPlayer = null;
    localStorage.removeItem(STORAGE_KEYS.CURRENT_PLAYER);
    showPlayerModal();
}

// ============================================
// PANEL DE ADMINISTRACION
// ============================================

function showAdminModal() {
    document.getElementById('adminModal').classList.remove('hidden');
}

function hideAdminModal() {
    document.getElementById('adminModal').classList.add('hidden');
}

function showConfirmModal() {
    document.getElementById('confirmModal').classList.remove('hidden');
}

function hideConfirmModal() {
    document.getElementById('confirmModal').classList.add('hidden');
}

function confirmClearHistory() {
    clearHistory();
    hideConfirmModal();
    stopTimer();
    gameState.currentPlayer = null;
    gameState.level = 1;
    showPlayerModal();
}

// ============================================
// EVENT LISTENERS
// ============================================

function initEventListeners() {
    // Boton de configuracion
    document.getElementById('settingsBtn').addEventListener('click', showAdminModal);

    // Botones del juego
    document.getElementById('restartBtn').addEventListener('click', restartLevel);
    document.getElementById('changePlayerBtn').addEventListener('click', changePlayer);

    // Modal de jugador
    document.getElementById('startGameBtn').addEventListener('click', startGame);
    document.getElementById('playerInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') startGame();
    });

    // Botones de dificultad
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            selectDifficulty(btn.dataset.difficulty);
        });
    });

    // Al escribir nombre, verificar si existe
    document.getElementById('playerInput').addEventListener('input', (e) => {
        const name = e.target.value.trim();
        const returningMsg = document.getElementById('returningPlayerMsg');

        if (name) {
            const existingPlayer = findPlayer(name);
            if (existingPlayer) {
                returningMsg.textContent = `Jugador encontrado! Tienes ${existingPlayer.wins} victorias y tu mejor nivel es ${existingPlayer.bestLevel}.`;
                returningMsg.classList.remove('hidden');
            } else {
                returningMsg.classList.add('hidden');
            }
        } else {
            returningMsg.classList.add('hidden');
        }
    });

    // Modal de victoria
    document.getElementById('nextLevelBtn').addEventListener('click', nextLevel);
    document.getElementById('continuePlayerBtn').addEventListener('click', continueWithPlayer);
    document.getElementById('newPlayerBtn').addEventListener('click', startWithNewPlayer);

    // Modal de tiempo agotado
    document.getElementById('retryLevelBtn').addEventListener('click', retryLevel);
    document.getElementById('gameOverNewPlayerBtn').addEventListener('click', gameOverNewPlayer);

    // Panel de administracion
    document.getElementById('closeAdminBtn').addEventListener('click', hideAdminModal);

    // Toggle de leaderboard
    document.getElementById('leaderboardToggle').addEventListener('change', (e) => {
        settings.showLeaderboard = e.target.checked;
        saveSettings();
        toggleLeaderboardVisibility();
    });

    // Toggle de modo emoji
    document.getElementById('emojiModeToggle').addEventListener('change', (e) => {
        toggleEmojiMode(e.target.checked);
    });

    document.getElementById('clearHistoryBtn').addEventListener('click', () => {
        hideAdminModal();
        showConfirmModal();
    });

    // Modal de confirmacion
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmClearHistory);
    document.getElementById('cancelDeleteBtn').addEventListener('click', hideConfirmModal);

    // Cerrar modales con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideAdminModal();
            hideConfirmModal();
        }
    });
}

// ============================================
// INICIALIZACION
// ============================================

function init() {
    loadSettings();
    initEventListeners();
    renderLeaderboard();
    showPlayerModal();
}

// Iniciar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', init);
