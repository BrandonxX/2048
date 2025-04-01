// Конфигурация
const API_BASE_URL = 'http://localhost:5000/api';
const GRID_SIZE = 4;
const TILE_COLORS = {
    2: '#eee4da',
    4: '#ede0c8',
    8: '#f2b179',
    16: '#f59563',
    32: '#f67c5f',
    64: '#f65e3b',
    128: '#edcf72',
    256: '#edcc61',
    512: '#edc850',
    1024: '#edc53f',
    2048: '#edc22e'
};

// DOM элементы
const elements = {
    grid: document.querySelector('.grid'),
    score: document.getElementById('score'),
    best: document.getElementById('best'),
    time: document.getElementById('time'),
    playButton: document.getElementById('play-button'),
    speedrunButton: document.getElementById('speedrun-button'),
    menuButton: document.getElementById('menu-button'),
    restartButton: document.getElementById('restart'),
    ratingButton: document.getElementById('rating-button'),
    bestResultsButton: document.getElementById('best-results-button'),
    logoutButton: document.getElementById('logout-button'),
    mainMenu: document.getElementById('main-menu'),
    gameInterface: document.getElementById('game-interface'),
    timerElement: document.getElementById('timer'),
    blockTimesList: document.getElementById('block-times-list'),
    bestResultsModal: document.getElementById('best-results-modal'),
    bestResultsList: document.getElementById('best-results-list'),
    ratingModal: document.getElementById('rating-modal'),
    ratingContent: document.getElementById('rating-content'),
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form')
};

// Состояние игры
const state = {
    currentUser: null,
    score: 0,
    bestScore: 0,
    isSpeedrunMode: false,
    isFirstMove: false,
    startTime: null,
    timerInterval: null,
    blockTimes: {},
    bestBlockTimes: {},
    currentRatingPage: 1,
    ratingPerPage: 10,
    currentRatingMode: 'classic'
};

// Инициализация игры
function initGame() {
    setupEventListeners();
    checkAuthStatus();
    initializeGrid();
}

// В функции setupEventListeners() заменяем текущие обработчики на:
document.getElementById('switch-to-register').addEventListener('click', function(e) {
    e.preventDefault();
    document.querySelector('.form-panel.one').classList.add('hidden');
    document.querySelector('.form-panel.two').classList.remove('hidden');
    document.querySelector('.form-panel.two').classList.add('active');
    
    // Обновляем высоту формы
    updateFormHeight();
});

document.getElementById('switch-to-login').addEventListener('click', function(e) {
    e.preventDefault();
    document.querySelector('.form-panel.two').classList.add('hidden');
    document.querySelector('.form-panel.two').classList.remove('active');
    document.querySelector('.form-panel.one').classList.remove('hidden');
    
    // Обновляем высоту формы
    updateFormHeight();
});

// Добавляем новую функцию для обновления высоты формы
function updateFormHeight() {
    const form = document.querySelector('.form');
    const activePanel = document.querySelector('.form-panel.one').classList.contains('hidden') 
        ? document.querySelector('.form-panel.two')
        : document.querySelector('.form-panel.one');
    
    form.style.height = activePanel.offsetHeight + 'px';
}

// Функция для воспроизведения музыки главного меню
function playMenuMusic() {
    if (soundState.isMusicEnabled) {
        const menuMusic = document.getElementById('menu-music');
        if (menuMusic) {
            menuMusic.currentTime = 0; // Сброс времени воспроизведения
            menuMusic.play();
        }
    }
}

// Состояние звука и музыки
const soundState = {
    isSoundEnabled: true,
    isMusicEnabled: true
};

// Функция для переключения звука
function toggleSound() {
    soundState.isSoundEnabled = !soundState.isSoundEnabled;
    document.getElementById('toggle-sound').textContent = soundState.isSoundEnabled ? 'Sound On' : 'Sound Off';
}

// Функция для переключения музыки
function toggleMusic() {
    soundState.isMusicEnabled = !soundState.isMusicEnabled;
    document.getElementById('toggle-music').textContent = soundState.isMusicEnabled ? 'Music On' : 'Music Off';

    if (soundState.isMusicEnabled) {
        if (!elements.gameInterface.classList.contains('hidden')) {
            playGameMusic();
        } else {
            playMenuMusic();
        }
    } else {
        stopGameMusic();
        stopMenuMusic();
    }
}

// Функция для остановки музыки главного меню
function stopMenuMusic() {
    const menuMusic = document.getElementById('menu-music');
    if (menuMusic) {
        menuMusic.pause();
        menuMusic.currentTime = 0;
    }
}

// Функция для воспроизведения музыки игры
function playGameMusic() {
    if (soundState.isMusicEnabled) {
        const gameMusic = document.getElementById('game-music');
        if (gameMusic) {
            gameMusic.currentTime = 0; // Сброс времени воспроизведения
            gameMusic.play();
        }
    }
}

// Функция для остановки музыки игры
function stopGameMusic() {
    const gameMusic = document.getElementById('game-music');
    if (gameMusic) {
        gameMusic.pause();
        gameMusic.currentTime = 0;
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Кнопки меню
    elements.playButton.addEventListener('click', () => {
        playClickSound();
        startGame(false);
    });
    elements.speedrunButton.addEventListener('click', () => {
        playClickSound();
        startGame(true);
    });
    elements.menuButton.addEventListener('click', () => {
        playClickSound();
        returnToMenu();
    });
    elements.restartButton.addEventListener('click', () => {
        playClickSound();
        resetGame();
    });
    elements.ratingButton.addEventListener('click', () => {
        playClickSound();
        showRating();
    });
    elements.bestResultsButton.addEventListener('click', () => {
        playClickSound();
        showBestResults();
    });
    elements.logoutButton.addEventListener('click', () => {
        playClickSound();
        logout();
    });

    // Модальные окна
    document.getElementById('close-modal').addEventListener('click', () => {
        playClickSound();
        elements.bestResultsModal.classList.add('hidden');
    });
    document.getElementById('close-rating-modal').addEventListener('click', () => {
        playClickSound();
        // Сброс вкладки на Classic перед закрытием
        document.querySelectorAll('.rating-tab').forEach(t => t.classList.remove('active'));
        document.querySelector('.rating-tab[data-mode="classic"]').classList.add('active');
        state.currentRatingMode = 'classic';
        state.currentRatingPage = 1;
        elements.ratingModal.classList.add('hidden');
    });

    // Пагинация рейтинга
    document.getElementById('prev-page').addEventListener('click', async () => {
        playClickSound();
        if (state.currentRatingPage > 1) {
            state.currentRatingPage--;
            await loadRatingData();
        }
    });
    
    document.getElementById('next-page').addEventListener('click', async () => {
        playClickSound();
        state.currentRatingPage++;
        await loadRatingData();
    });

    // Вкладки рейтинга
    // В функции setupEventListeners()
    document.querySelectorAll('.rating-tab').forEach(tab => {
        tab.addEventListener('click', async () => {
            playClickSound();
            
            // Блокируем повторные нажатия во время загрузки
            if (state.isLoading) return;
            state.isLoading = true;
            
            // Показываем индикатор загрузки
            elements.ratingContent.innerHTML = `
                <div class="loading-spinner">
                    <div class="loading-text">Loading ${tab.textContent} data...</div>
                    <div class="loading-progress">Please wait</div>
                </div>
            `;
            
            // Обновляем активную вкладку
            document.querySelectorAll('.rating-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Сбрасываем на первую страницу
            state.currentRatingMode = tab.dataset.mode;
            state.currentRatingPage = 1;
            
            // Загружаем данные с задержкой
            await loadRatingData();
            state.isLoading = false;
        });
    });

    // Формы авторизации
    elements.loginForm.addEventListener('submit', handleLogin);
    elements.registerForm.addEventListener('submit', handleRegister);

    // Управление с клавиатуры
    document.addEventListener('keydown', handleKeyPress);

    // Кнопки управления звуком и музыкой
    document.getElementById('toggle-sound').addEventListener('click', toggleSound);
    document.getElementById('toggle-music').addEventListener('click', toggleMusic);
}

// Проверка статуса авторизации
function checkAuthStatus() {
    // В реальном приложении здесь должна быть проверка токена/сессии
    elements.mainMenu.classList.add('hidden');
    document.querySelector('.form').classList.remove('hidden');
}

// Обработка входа
async function handleLogin(e) {
    e.preventDefault();
    const username = elements.loginForm.querySelector('input[name="username"]').value.trim();
    const password = elements.loginForm.querySelector('input[name="password"]').value.trim();

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            // Полный сброс перед установкой нового пользователя
            state.currentUser = null;
            state.bestScore = 0;
            state.bestBlockTimes = {};
            
            // Установка нового пользователя
            state.currentUser = data.user;
            elements.best.textContent = '0'; // Сброс перед загрузкой
            
            document.querySelector('.form').classList.add('hidden');
            elements.mainMenu.classList.remove('hidden');
            
            // Загрузка актуальных данных пользователя
            await loadUserStats();
        } else {
            showError('login-error', data.message || 'Login failed');
        }
    } catch (error) {
        showError('login-error', 'Network error. Please try again.');
    }
}

// Обработка регистрации
async function handleRegister(e) {
    e.preventDefault();
    const formData = {
        username: elements.registerForm.querySelector('#register-username').value.trim(),
        password: elements.registerForm.querySelector('#register-password').value.trim(),
        cpassword: elements.registerForm.querySelector('#register-cpassword').value.trim(),
        email: elements.registerForm.querySelector('#register-email').value.trim()
    };

    // Валидация
    if (!formData.username || !formData.password || !formData.cpassword || !formData.email) {
        return showError('register-error', 'All fields are required');
    }

    if (formData.password !== formData.cpassword) {
        return showError('register-error', 'Passwords do not match');
    }

    if (formData.password.length < 8) {
        return showError('register-error', 'Password must be at least 8 characters');
    }

    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: formData.username,
                password: formData.password,
                email: formData.email
            })
        });

        const data = await response.json();

        if (data.success) {
            alert('Registration successful! Please login.');
            document.querySelector('.form-panel.two').removeClass('active');
            document.querySelector('.form-panel.one').removeClass('hidden');
            elements.registerForm.reset();
        } else {
            showError('register-error', data.message || 'Registration failed');
        }
    } catch (error) {
        showError('register-error', 'Network error. Please try again.');
    }
}

// Выход из системы
function logout() {
    // Полный сброс состояния
    state.currentUser = null;
    state.bestScore = 0;
    state.bestBlockTimes = {};
    state.score = 0;
    
    // Сброс UI
    elements.best.textContent = '0';
    elements.score.textContent = '0';
    
    // Переключение интерфейсов
    elements.mainMenu.classList.add('hidden');
    document.querySelector('.form').classList.remove('hidden');
    
    // Сброс игры
    resetGame();
    
    // Остановка музыки игры
    stopGameMusic();
}

// Загрузка статистики пользователя
async function loadUserStats() {
    if (!state.currentUser) return;

    try {
        const response = await fetch(`${API_BASE_URL}/user/${state.currentUser.id}/stats`);
        const data = await response.json();

        if (data.success) {
            state.bestScore = data.stats.bestScore || 0;
            elements.best.textContent = state.bestScore;
            
            if (data.stats.bestBlockTimes) {
                state.bestBlockTimes = data.stats.bestBlockTimes;
            }
        }
    } catch (error) {
        console.error('Failed to load user stats:', error);
    }
}

// Функция для воспроизведения звука нажатия
function playClickSound() {
    if (soundState.isSoundEnabled) {
        const clickSound = document.getElementById('click-sound');
        if (clickSound) {
            clickSound.currentTime = 0; // Сброс времени воспроизведения
            clickSound.play();
        }
    }
}

// Запуск игры
function startGame(isSpeedrunMode) {
    state.isSpeedrunMode = isSpeedrunMode;
    state.score = 0;
    state.isFirstMove = false;
    state.blockTimes = {};

    elements.score.textContent = state.score;
    elements.mainMenu.classList.add('hidden');
    elements.gameInterface.classList.remove('hidden');

    // Настройка интерфейса для режима
    elements.timerElement.classList.toggle('hidden', !isSpeedrunMode);
    document.getElementById('block-times').classList.toggle('hidden', !isSpeedrunMode);
    document.querySelector('.best').classList.toggle('hidden', isSpeedrunMode);

    // Обновление Best Score
    if (!isSpeedrunMode && state.currentUser) {
        loadUserStats();
    }

    initializeGrid();
    stopMenuMusic();
    if (soundState.isMusicEnabled) {
        playGameMusic();
    }
}


// Возврат в меню
function returnToMenu() {
    resetGame();
    elements.gameInterface.classList.add('hidden');
    elements.mainMenu.classList.remove('hidden');

    // Остановка музыки игры и запуск музыки главного меню, если музыка включена
    stopGameMusic();
    if (soundState.isMusicEnabled) {
        playMenuMusic();
    }
}
// Сброс игры
function resetGame() {
    clearInterval(state.timerInterval);
    state.score = 0;
    state.isFirstMove = false;
    state.blockTimes = {};
    
    elements.score.textContent = state.score;
    elements.time.textContent = '00:00.000';
    updateBlockTimesDisplay();
    
    // Обновление Best Score
    if (state.currentUser) {
        loadUserStats(); // Загружаем актуальные данные с сервера
    } else {
        elements.best.textContent = state.bestScore; // Используем локальное значение
    }
    
    initializeGrid();
}

// Инициализация сетки
function initializeGrid() {
    elements.grid.innerHTML = '';
    
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
        const cell = document.createElement('div');
        elements.grid.appendChild(cell);
    }
    
    addRandomTile();
    addRandomTile();
    updateGrid();
}

// Добавление случайной плитки
function addRandomTile() {
    const emptyCells = [];
    elements.grid.childNodes.forEach((cell, index) => {
        if (cell.textContent === '') {
            emptyCells.push(index);
        }
    });

    if (emptyCells.length > 0) {
        const randomIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const newTile = elements.grid.childNodes[randomIndex];
        newTile.textContent = Math.random() < 0.9 ? 2 : 4;

        // Добавление класса для анимации
        newTile.classList.add('new-tile');

        // Удаление класса после завершения анимации
        setTimeout(() => {
            newTile.classList.remove('new-tile');
        }, 300); // Время должно совпадать с длительностью анимации
    }
}

// Обновление сетки
function updateGrid() {
    elements.grid.childNodes.forEach(cell => {
        const value = cell.textContent;
        cell.style.backgroundColor = TILE_COLORS[value] || '#cdc1b4';
        cell.style.color = value > 4 ? '#f9f6f2' : '#776e65';
    });
    
    // Проверка победы в speedrun режиме
    if (state.isSpeedrunMode && Array.from(elements.grid.childNodes).some(cell => cell.textContent === '2048')) {
        endGame(true);
    }
}

// Обработка нажатия клавиш
function handleKeyPress(event) {
    if (event.key.startsWith('Arrow')) {
        const direction = event.key.replace('Arrow', '').toLowerCase();
        
        // Запуск таймера при первом ходе в speedrun режиме
        if (state.isSpeedrunMode && !state.isFirstMove) {
            state.isFirstMove = true;
            state.startTime = Date.now();
            startTimer();
        }
        
        moveTiles(direction);
    }
}

/// Функция для воспроизведения звука перемещения
function playMoveSound() {
    if (soundState.isSoundEnabled && isGameActive()) {
        const moveSound = document.getElementById('move-sound');
        if (moveSound) {
            moveSound.currentTime = 0; // Сброс времени воспроизведения
            moveSound.play();
        }
    }
}

// Проверка, активна ли игра
function isGameActive() {
    return !elements.gameInterface.classList.contains('hidden');
}

// Движение плиток
function moveTiles(direction) {
    const cells = Array.from(elements.grid.childNodes).map(cell => cell.textContent || 0);
    const newCells = Array(GRID_SIZE * GRID_SIZE).fill(0);
    let moved = false;

    // Логика движения для каждого направления
    if (direction === 'left') {
        for (let row = 0; row < GRID_SIZE; row++) {
            const rowCells = cells.slice(row * GRID_SIZE, (row + 1) * GRID_SIZE);
            const mergedRow = mergeRow(rowCells, row, false);
            for (let col = 0; col < GRID_SIZE; col++) {
                newCells[row * GRID_SIZE + col] = mergedRow[col];
            }
        }
    } else if (direction === 'right') {
        for (let row = 0; row < GRID_SIZE; row++) {
            const rowCells = cells.slice(row * GRID_SIZE, (row + 1) * GRID_SIZE).reverse();
            const mergedRow = mergeRow(rowCells, row, false).reverse();
            for (let col = 0; col < GRID_SIZE; col++) {
                newCells[row * GRID_SIZE + col] = mergedRow[col];
            }
        }
    } else if (direction === 'up') {
        for (let col = 0; col < GRID_SIZE; col++) {
            const columnCells = [];
            for (let row = 0; row < GRID_SIZE; row++) {
                columnCells.push(cells[row * GRID_SIZE + col]);
            }
            const mergedColumn = mergeRow(columnCells, col, true);
            for (let row = 0; row < GRID_SIZE; row++) {
                newCells[row * GRID_SIZE + col] = mergedColumn[row];
            }
        }
    } else if (direction === 'down') {
        for (let col = 0; col < GRID_SIZE; col++) {
            const columnCells = [];
            for (let row = 0; row < GRID_SIZE; row++) {
                columnCells.push(cells[row * GRID_SIZE + col]);
            }
            const mergedColumn = mergeRow(columnCells.reverse(), col, true).reverse();
            for (let row = 0; row < GRID_SIZE; row++) {
                newCells[row * GRID_SIZE + col] = mergedColumn[row];
            }
        }
    }

    // Если состояние изменилось - обновляем сетку
    if (cells.toString() !== newCells.toString()) {
        elements.grid.childNodes.forEach((cell, index) => {
            cell.textContent = newCells[index] || '';
        });

        playMoveSound(); // Воспроизведение звука перемещения
        addRandomTile();
        updateGrid();
        checkGameOver();
    }
}

// Слияние строки
function mergeRow(row, rowIndex, isVertical) {
    let newRow = row.filter(x => x !== 0);

    for (let i = 0; i < newRow.length - 1; i++) {
        if (newRow[i] === newRow[i + 1]) {
            newRow[i] *= 2;
            state.score += newRow[i];
            elements.score.textContent = state.score;
            
            // Автоматическое обновление Best Score
            if (state.score > state.bestScore) {
                state.bestScore = state.score;
                elements.best.textContent = state.bestScore;
            }
            
            newRow[i + 1] = 0;

            // Определение индекса ячейки в сетке
            let cellIndex;
            if (isVertical) {
                cellIndex = rowIndex + i * GRID_SIZE;
            } else {
                cellIndex = rowIndex * GRID_SIZE + i;
            }

            // Анимация слияния
            if (newRow[i] !== 0) {
                elements.grid.childNodes[cellIndex].classList.add('merging');
                setTimeout(() => {
                    elements.grid.childNodes[cellIndex].classList.remove('merging');
                }, 200);
            }

            // Запись времени появления блока в speedrun режиме
            if (state.isSpeedrunMode) {
                const blockValue = newRow[i];
                if ([8, 16, 32, 64, 128, 256, 512, 1024, 2048].includes(blockValue)) {
                    const currentTime = Date.now() - state.startTime;
                    if (!state.blockTimes[blockValue]) {
                        state.blockTimes[blockValue] = currentTime;
                        updateBlockTimesDisplay();
                    }
                }
            }
        }
    }

    newRow = newRow.filter(x => x !== 0);
    while (newRow.length < GRID_SIZE) {
        newRow.push(0);
    }

    return newRow;
}

// Проверка завершения игры
function checkGameOver() {
    const cells = Array.from(elements.grid.childNodes).map(cell => cell.textContent || 0);
    
    if (!cells.includes(0) && !canMerge(cells)) {
        endGame(false);
    }
}

// Проверка возможности слияния
function canMerge(cells) {
    for (let i = 0; i < cells.length; i++) {
        if (i % GRID_SIZE !== GRID_SIZE - 1 && cells[i] === cells[i + 1]) {
            return true;
        }
        if (i < cells.length - GRID_SIZE && cells[i] === cells[i + GRID_SIZE]) {
            return true;
        }
    }
    return false;
}

// Завершение игры
async function endGame(isWin) {
    // Останавливаем таймер
    clearInterval(state.timerInterval);

    // Воспроизводим звук победы/поражения
    if (soundState.isSoundEnabled) {
        const sound = document.getElementById(isWin ? 'win-sound' : 'lose-sound');
        if (sound) {
            sound.currentTime = 0;
            sound.play();
        }
    }

    if (state.isSpeedrunMode) {
        const endTime = Date.now();
        const timeTaken = endTime - state.startTime;
        const formattedTime = formatTime(timeTaken);

        // Сохраняем результаты Speedrun
        if (state.currentUser) {
            try {
                // Сохраняем время Speedrun (если это победа)
                if (isWin) {
                    await fetch(`${API_BASE_URL}/save-speedrun-time`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            userId: state.currentUser.id,
                            time: timeTaken
                        })
                    });
                }

                // Сохраняем время блоков
                await fetch(`${API_BASE_URL}/save-block-times`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        userId: state.currentUser.id,
                        blockTimes: state.blockTimes
                    })
                });

            } catch (error) {
                console.error('Error saving speedrun results:', error);
            }
        }

        // Показываем модальное окно с результатами Speedrun
        showSpeedrunResultModal(isWin, formattedTime);
    } else {
        // Логика для классического режима
        if (state.currentUser) {
            try {
                const response = await fetch(`${API_BASE_URL}/save-classic-score`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        userId: state.currentUser.id, 
                        score: state.score 
                    })
                });

                const data = await response.json();
                
                if (data.success) {
                    // Обновляем локальное состояние
                    state.bestScore = data.newBest;
                    elements.best.textContent = state.bestScore;
                }
            } catch (error) {
                console.error('Error saving score:', error);
            }
        } else {
            // Для гостей - просто обновляем локальное хранилище
            if (state.score > state.bestScore) {
                state.bestScore = state.score;
                localStorage.setItem('bestScore', state.bestScore);
                elements.best.textContent = state.bestScore;
            }
        }

        // Показываем модальное окно с результатами Classic
        showGameOverModal(isWin, state.score);
    }

    // Обновляем статистику пользователя
    await loadUserStats();
}

// Сохранение результатов Speedrun
async function saveSpeedrunResult(timeTaken, isWin) {
    try {
        const response = await fetch(`${API_BASE_URL}/save-speedrun-result`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: state.currentUser.id,
                time: timeTaken,
                isWin: isWin,
                blockTimes: state.blockTimes
            })
        });

        const data = await response.json();
        if (!data.success) {
            console.error('Failed to save speedrun result:', data.message);
        }
    } catch (error) {
        console.error('Error saving speedrun result:', error);
    }
}

// Новая функция для шаринга результатов
function shareResult(time, isWin) {
    const text = isWin 
        ? `I completed 2048 speedrun in ${time}! Can you beat my time?` 
        : `I played 2048 speedrun and got ${time}. Try to beat it!`;
    
    if (navigator.share) {
        navigator.share({
            title: 'My 2048 Speedrun Result',
            text: text,
            url: window.location.href
        }).catch(err => {
            console.log('Error sharing:', err);
            copyToClipboard(text);
        });
    } else {
        copyToClipboard(text);
        alert('Result copied to clipboard!');
    }
}

// Вспомогательная функция для копирования в буфер обмена
function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}

// Функция для загрузки статистики пользователя (обновленная)
async function loadUserStats() {
    if (!state.currentUser) return;

    try {
        const response = await fetch(`${API_BASE_URL}/user/${state.currentUser.id}/stats`);
        const data = await response.json();

        if (data.success) {
            // Обновляем только если серверное значение больше текущего
            if (data.stats.bestScore > state.bestScore) {
                state.bestScore = data.stats.bestScore;
                elements.best.textContent = state.bestScore;
            }
            
            if (data.stats.bestBlockTimes) {
                state.bestBlockTimes = data.stats.bestBlockTimes;
            }
        }
    } catch (error) {
        console.error('Failed to load user stats:', error);
    }
}

// Функция сброса игры (обновленная)
function resetGame() {
    clearInterval(state.timerInterval);
    state.score = 0;
    state.isFirstMove = false;
    state.blockTimes = {};
    
    elements.score.textContent = state.score;
    elements.time.textContent = '00:00.000';
    updateBlockTimesDisplay();
    
    // Для авторизованных пользователей загружаем актуальные данные
    if (state.currentUser) {
        loadUserStats();
    } else {
        // Для гостей просто обновляем отображение
        elements.best.textContent = state.bestScore;
    }
    
    initializeGrid();
}

// Запуск таймера
function startTimer() {
    clearInterval(state.timerInterval);
    
    state.timerInterval = setInterval(() => {
        const currentTime = Date.now() - state.startTime;
        elements.time.textContent = formatTime(currentTime);
    }, 10);
}

// Форматирование времени
function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const ms = milliseconds % 1000;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

// Обновление отображения времени блоков
function updateBlockTimesDisplay() {
    elements.blockTimesList.innerHTML = '';
    
    for (const [block, time] of Object.entries(state.blockTimes)) {
        const div = document.createElement('div');
        div.textContent = `${block}: ${formatTime(time)}`;
        elements.blockTimesList.appendChild(div);
    }
}

// Показать лучшие результаты
async function showBestResults() {
    elements.bestResultsList.innerHTML = '<div class="loading">Loading...</div>';
    elements.bestResultsModal.classList.remove('hidden');
    
    if (state.currentUser) {
        try {
            const response = await fetch(`${API_BASE_URL}/user/${state.currentUser.id}/stats`);
            const data = await response.json();
            
            if (data.success) {
                renderBestResults(data.stats);
            } else {
                elements.bestResultsList.innerHTML = '<div class="error">Failed to load data</div>';
            }
        } catch (error) {
            elements.bestResultsList.innerHTML = '<div class="error">Network error</div>';
        }
    } else {
        renderBestResults(null);
    }
}

// Отрисовка лучших результатов
function renderBestResults() {
    elements.bestResultsList.innerHTML = '';
    
    // Всегда используем актуальные данные из state
    const bestScore = state.bestScore;
    const bestSpeedrunTime = state.bestBlockTimes['2048']?.time;
    const bestBlockTimes = state.bestBlockTimes;

    // Classic Mode
    const classicDiv = document.createElement('div');
    classicDiv.className = 'best-results-block';
    classicDiv.innerHTML = `
        <h3>Classic Mode</h3>
        <p>Best Score: ${bestScore ?? 'N/A'}</p>
    `;
    elements.bestResultsList.appendChild(classicDiv);
    
    // Speedrun Mode
    const speedrunDiv = document.createElement('div');
    speedrunDiv.className = 'best-results-block';
    speedrunDiv.innerHTML = `
        <h3>Speedrun Mode</h3>
        <p>Best Time: ${bestSpeedrunTime ? formatTime(bestSpeedrunTime) : 'N/A'}</p>
    `;
    elements.bestResultsList.appendChild(speedrunDiv);
    
    // Block Times
    const blocksDiv = document.createElement('div');
    blocksDiv.className = 'best-results-block';
    blocksDiv.innerHTML = '<h3>Best Block Times</h3>';
    
    if (bestBlockTimes && Object.keys(bestBlockTimes).length > 0) {
        const sortedBlocks = Object.entries(bestBlockTimes)
            .filter(([block]) => block !== '2048') // Исключаем 2048, так как он уже в Speedrun Mode
            .sort(([a], [b]) => parseInt(a) - parseInt(b));
        
        sortedBlocks.forEach(([block, timeData]) => {
            const div = document.createElement('div');
            const time = timeData.time || timeData;
            const formatted = timeData.formatted || formatTime(time);
            div.textContent = `${block}: ${formatted}`;
            blocksDiv.appendChild(div);
        });
    } else {
        blocksDiv.innerHTML += '<div>N/A</div>';
    }
    
    elements.bestResultsList.appendChild(blocksDiv);
}

// Обновленная функция loadUserStats
async function loadUserStats() {
    if (!state.currentUser) {
        // Для гостей берем данные из localStorage
        const localBest = localStorage.getItem('bestScore');
        if (localBest) {
            state.bestScore = parseInt(localBest);
            elements.best.textContent = state.bestScore;
        }
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/user/${state.currentUser.id}/stats`);
        const data = await response.json();

        if (data.success) {
            // Обновляем только если серверное значение больше текущего
            if (data.stats.bestScore > state.bestScore) {
                state.bestScore = data.stats.bestScore;
                elements.best.textContent = state.bestScore;
            }
            
            // Обновляем bestBlockTimes
            if (data.stats.bestBlockTimes) {
                state.bestBlockTimes = data.stats.bestBlockTimes;
            }
            
            // Принудительно обновляем Best Results
            renderBestResults();
        }
    } catch (error) {
        console.error('Failed to load user stats:', error);
    }
}


// Обновленная функция loadUserStats
async function loadUserStats() {
    if (!state.currentUser) {
        // Для гостей берем данные из localStorage
        const localBest = localStorage.getItem('bestScore');
        if (localBest) {
            state.bestScore = parseInt(localBest);
            elements.best.textContent = state.bestScore;
        }
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/user/${state.currentUser.id}/stats`);
        const data = await response.json();

        if (data.success) {
            // Обновляем bestScore независимо от текущего значения
            if (data.stats.bestScore !== undefined) {
                state.bestScore = data.stats.bestScore;
                elements.best.textContent = state.bestScore;
            }
            
            if (data.stats.bestBlockTimes) {
                state.bestBlockTimes = data.stats.bestBlockTimes;
            }
        }
    } catch (error) {
        console.error('Failed to load user stats:', error);
    }
}
// Показать рейтинг
function showRating() {
    // Сброс состояния перед открытием
    state.currentRatingPage = 1;
    state.currentRatingMode = 'classic';
    
    // Сброс активной вкладки
    document.querySelectorAll('.rating-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.rating-tab[data-mode="classic"]').classList.add('active');
    
    elements.ratingModal.classList.remove('hidden');
    loadRatingData();
}

// Загрузка данных рейтинга
async function loadRatingData() {
    // Показываем индикатор загрузки
    elements.ratingContent.innerHTML = `
        <div class="loading-spinner">
            <div class="loading-text">Loading ${state.currentRatingMode} data...</div>
            <div class="loading-progress">Please wait</div>
        </div>
    `;

    const loadingDelay = 500;
    await new Promise(resolve => setTimeout(resolve, loadingDelay));
    
    try {
        let endpoint = `${API_BASE_URL}/leaderboard/${state.currentRatingMode}`;
        let queryParams = `page=${state.currentRatingPage}&limit=${state.ratingPerPage}`;
        
        // Для Block Times добавляем параметр блока
        if (state.currentRatingMode === 'blocks') {
            // Сохраняем выбранный блок между запросами
            const selectedBlock = state.currentBlock || 8;
            endpoint += `?block=${selectedBlock}&${queryParams}`;
        } else {
            endpoint += `?${queryParams}`;
        }
        
        const response = await fetch(endpoint);
        const data = await response.json();
        
        if (data.success) {
            if (data.data.length === 0 && state.currentRatingPage > 1) {
                state.currentRatingPage--;
                await loadRatingData();
                return;
            }
            
            renderRatingData(data);
            updatePaginationButtons(data.meta);
            
            // Всегда показываем селектор для Block Times, даже если нет данных
            if (state.currentRatingMode === 'blocks') {
                const currentBlock = data.meta?.current_block || state.currentBlock || 8;
                addBlockSelector(currentBlock);
            }
        } else {
            elements.ratingContent.innerHTML = '<div class="error">Failed to load data</div>';
        }
    } catch (error) {
        elements.ratingContent.innerHTML = `
            <div class="error">
                Network error. Please try again.
            </div>
        `;
        console.error('Error loading rating data:', error);
    }
}

function addBlockSelector(currentBlock = 8) {
    const blockValues = [8, 16, 32, 64, 128, 256, 512, 1024, 2048];
    const selectorHtml = `
        <div class="block-selector-container">
            <div class="block-selector">
                <label for="block-select">Show times for block:</label>
                <select id="block-select" onchange="changeBlock(this.value)">
                    ${blockValues.map(block => `
                        <option value="${block}" ${block === currentBlock ? 'selected' : ''}>
                            ${block}
                        </option>
                    `).join('')}
                </select>
            </div>
        </div>
    `;
    
    // Удаляем старый селектор, если есть
    const oldSelector = elements.ratingContent.querySelector('.block-selector-container');
    if (oldSelector) {
        oldSelector.remove();
    }
    
    // Вставляем селектор в начало контента
    elements.ratingContent.insertAdjacentHTML('afterbegin', selectorHtml);
}

// Глобальная функция для изменения блока
window.changeBlock = async function(blockValue) {
    // Сохраняем выбранный блок в состоянии
    state.currentBlock = parseInt(blockValue);
    state.currentRatingPage = 1;
    
    const endpoint = `${API_BASE_URL}/leaderboard/blocks?block=${blockValue}&page=1&limit=${state.ratingPerPage}`;
    
    try {
        const response = await fetch(endpoint);
        const data = await response.json();
        
        if (data.success) {
            renderRatingData(data);
            updatePaginationButtons(data.meta);
            
            // Обновляем селектор с сохранением выбранного блока
            addBlockSelector(state.currentBlock);
        }
    } catch (error) {
        console.error('Error changing block:', error);
    }
};

function updatePaginationButtons(meta) {
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');
    
    // Обновляем информацию о странице
    pageInfo.textContent = `Page ${state.currentRatingPage} of ${Math.ceil(meta.total / state.ratingPerPage)}`;
    
    // Обновляем состояние кнопок
    prevBtn.disabled = state.currentRatingPage <= 1;
    nextBtn.disabled = state.currentRatingPage >= Math.ceil(meta.total / state.ratingPerPage);

    if (prevBtn.disabled) {
        prevBtn.classList.add('disabled');
    } else {
        prevBtn.classList.remove('disabled');
    }
    
    if (nextBtn.disabled) {
        nextBtn.classList.add('disabled');
    } else {
        nextBtn.classList.remove('disabled');
    }
}

// Отрисовка данных рейтинга
function renderRatingData(data) {
    let html = '';
    
    if (state.currentRatingMode === 'blocks') {
        // Специальный рендеринг для Block Times
        html = `
            <div class="blocks-table-container">
                <table class="blocks-table">
                    <thead>
                        <tr>
                            <th width="15%">Rank</th>
                            <th width="35%">Player</th>
                            <th width="20%">Block</th>
                            <th width="30%">Time</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        if (data.data.length === 0) {
            html += `
                <tr>
                    <td colspan="4" class="no-data">No block times recorded yet</td>
                </tr>
            `;
        } else {
            data.data.forEach((item, index) => {
                const globalIndex = (state.currentRatingPage - 1) * state.ratingPerPage + index + 1;
                const isCurrentUser = state.currentUser && item.user_id === state.currentUser.id;
                let rowClass = isCurrentUser ? 'current-user' : '';
                rowClass += ` block-${item.block_value}`;
                
                html += `
                    <tr class="${rowClass.trim()}">
                        <td>${globalIndex}</td>
                        <td class="player-name" title="${item.username}">
                            ${item.username}
                            ${isCurrentUser ? ' (You)' : ''}
                        </td>
                        <td class="block-value">${item.block_value}</td>
                        <td class="block-time" title="${item.block_time} ms">
                            ${formatTime(item.block_time)}
                            ${state.currentRatingPage === 1 && index < 3 ? 
                                `<span class="medal-icon">${['🥇','🥈','🥉'][index]}</span>` : ''}
                        </td>
                    </tr>
                `;
            });
        }
        
        html += `
                    </tbody>
                </table>
                <div class="table-footer">
                    Showing ${data.data.length} of ${data.meta.total} records
                </div>
            </div>
        `;
    } else {
        // Рендеринг для Classic и Speedrun режимов
        html = `
            <div class="rating-table-container">
                <table class="rating-table">
                    <thead>
                        <tr>
                            <th width="15%">Rank</th>
                            <th width="35%">Player</th>
                            <th width="${state.currentRatingMode === 'classic' ? '50%' : '50%'}">
                                ${state.currentRatingMode === 'classic' ? 'Score' : 'Time'}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        if (data.data.length === 0) {
            html += `
                <tr>
                    <td colspan="3" class="no-data">No records found</td>
                </tr>
            `;
        } else {
            data.data.forEach((item, index) => {
                const globalIndex = (state.currentRatingPage - 1) * state.ratingPerPage + index + 1;
                const isCurrentUser = state.currentUser && item.user_id === state.currentUser.id;
                let rowClass = '';
                
                // Медали только для топ-3 на первой странице
                if (state.currentRatingPage === 1 && index < 3) {
                    rowClass = `medal-${index + 1}`;
                }
                if (isCurrentUser) {
                    rowClass = 'current-user';
                }
                
                html += `<tr class="${rowClass}">`;
                html += `<td>${globalIndex}</td>`;
                html += `<td class="player-name" title="${item.username}">
                    ${item.username}
                    ${isCurrentUser ? ' (You)' : ''}
                </td>`;
                
                if (state.currentRatingMode === 'classic') {
                    html += `<td class="score-value">${item.score.toLocaleString()}</td>`;
                } else {
                    html += `<td class="time-value">${formatTime(item.time)}</td>`;
                }
                
                html += '</tr>';
            });
        }
        
        html += `
                    </tbody>
                </table>
                <div class="table-footer">
                    Showing ${data.data.length} of ${data.meta.total} records
                </div>
            </div>
        `;
    }
    
    elements.ratingContent.innerHTML = html;
}

// Показать ошибку
function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    }
}

// Функция для Пароля
function togglePassword(inputId, toggleIcon) {
    const passwordInput = document.getElementById(inputId);

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.textContent = '🙈'; // Изменяем иконку на закрытый глаз
    } else {
        passwordInput.type = 'password';
        toggleIcon.textContent = '👁️'; // Возвращаем иконку на открытый глаз
    }
}

function showGameOverModal(isWin, score) {
    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.className = 'game-over-modal';

    // Определяем текст для лучшего счета
    const bestScoreText = state.currentUser 
        ? `Best score: ${state.bestScore || 'N/A'}`
        : `Local best: ${state.bestScore || 'N/A'}`;
    
    modal.innerHTML = `
        <div class="modal-content">
            <h2>${isWin ? 'You Won!' : 'Game Over!'}</h2>
            <p>Your score: ${score}</p>
            <p>${bestScoreText}</p>
            <div class="modal-buttons">
                <button id="restart-game">Restart</button>
                <button id="return-to-menu">Menu</button>
                ${state.currentUser ? '<button id="view-best-results">Best Results</button>' : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Обработчики для кнопок
    document.getElementById('restart-game').addEventListener('click', () => {
        modal.remove();
        resetGame();
    });
    
    document.getElementById('return-to-menu').addEventListener('click', () => {
        modal.remove();
        returnToMenu();
    });
    
    if (state.currentUser) {
        document.getElementById('view-best-results').addEventListener('click', () => {
            modal.remove();
            showBestResults();
        });
    }
}

// Функция для отображения результатов Speedrun
function showSpeedrunResultModal(isWin, time) {
    const modal = document.createElement('div');
    modal.className = 'game-over-modal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <h2>${isWin ? 'You Won!' : 'Time Over!'}</h2>
            <p>Your time: ${time}</p>
            ${state.currentUser ? `<p>Best time: ${state.bestBlockTimes['2048']?.formatted || 'N/A'}</p>` : ''}
            <div class="block-times-summary">
                ${generateBlockTimesHTML()}
            </div>
            <div class="modal-buttons">
                <button id="restart-game">Restart</button>
                <button id="return-to-menu">Menu</button>
                ${state.currentUser ? '<button id="view-best-results">Best Results</button>' : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Обработчики событий для кнопок
    document.getElementById('restart-game').addEventListener('click', () => {
        modal.remove();
        resetGame();
    });
    
    document.getElementById('return-to-menu').addEventListener('click', () => {
        modal.remove();
        returnToMenu();
    });
    
    if (state.currentUser) {
        document.getElementById('view-best-results').addEventListener('click', () => {
            modal.remove();
            showBestResults();
        });
    }
}

// Вспомогательная функция для генерации HTML с временем блоков
function generateBlockTimesHTML() {
    if (!state.blockTimes || Object.keys(state.blockTimes).length === 0) {
        return '<p>No blocks reached</p>';
    }

    let html = '<h3>Block Times:</h3><ul class="block-times-list">';
    const sortedBlocks = Object.entries(state.blockTimes)
        .sort(([a], [b]) => parseInt(a) - parseInt(b));

    sortedBlocks.forEach(([block, time]) => {
        html += `<li>${block}: ${formatTime(time)}</li>`;
    });

    html += '</ul>';
    return html;
}

// Инициализация игры при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    initGame();
    if (soundState.isMusicEnabled) {
        playMenuMusic(); // Запуск музыки главного меню при загрузке
    }
});