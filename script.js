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

// Настройка обработчиков событий
function setupEventListeners() {
    // Кнопки меню
    elements.playButton.addEventListener('click', () => startGame(false));
    elements.speedrunButton.addEventListener('click', () => startGame(true));
    elements.menuButton.addEventListener('click', returnToMenu);
    elements.restartButton.addEventListener('click', resetGame);
    elements.ratingButton.addEventListener('click', showRating);
    elements.bestResultsButton.addEventListener('click', showBestResults);
    elements.logoutButton.addEventListener('click', logout);


    // Модальные окна
    document.getElementById('close-modal').addEventListener('click', () => {
        elements.bestResultsModal.classList.add('hidden');
    });
    document.getElementById('close-rating-modal').addEventListener('click', () => {
        elements.ratingModal.classList.add('hidden');
    });

    // Пагинация рейтинга
    document.getElementById('prev-page').addEventListener('click', () => {
        if (state.currentRatingPage > 1) {
            state.currentRatingPage--;
            loadRatingData();
        }
    });
    document.getElementById('next-page').addEventListener('click', () => {
        state.currentRatingPage++;
        loadRatingData();
    });

    // Вкладки рейтинга
    document.querySelectorAll('.rating-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.rating-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.currentRatingMode = tab.dataset.mode;
            state.currentRatingPage = 1;
            loadRatingData();
        });
    });

    // Формы авторизации
    elements.loginForm.addEventListener('submit', handleLogin);
    elements.registerForm.addEventListener('submit', handleRegister);

    // Управление с клавиатуры
    document.addEventListener('keydown', handleKeyPress);
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
            state.currentUser = data.user;
            document.querySelector('.form').classList.add('hidden');
            elements.mainMenu.classList.remove('hidden');
            loadUserStats();
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
    state.currentUser = null;
    elements.mainMenu.classList.add('hidden');
    document.querySelector('.form').classList.remove('hidden');
    resetGame();
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
    
    initializeGrid();
}

// Возврат в меню
function returnToMenu() {
    resetGame();
    elements.gameInterface.classList.add('hidden');
    elements.mainMenu.classList.remove('hidden');
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
        elements.grid.childNodes[randomIndex].textContent = Math.random() < 0.9 ? 2 : 4;
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

// Движение плиток
function moveTiles(direction) {
    const cells = Array.from(elements.grid.childNodes).map(cell => cell.textContent || 0);
    const newCells = Array(GRID_SIZE * GRID_SIZE).fill(0);
    let moved = false;

    // Логика движения для каждого направления
    if (direction === 'left') {
        for (let row = 0; row < GRID_SIZE; row++) {
            const rowCells = cells.slice(row * GRID_SIZE, (row + 1) * GRID_SIZE);
            const mergedRow = mergeRow(rowCells);
            for (let col = 0; col < GRID_SIZE; col++) {
                newCells[row * GRID_SIZE + col] = mergedRow[col];
            }
        }
    } else if (direction === 'right') {
        for (let row = 0; row < GRID_SIZE; row++) {
            const rowCells = cells.slice(row * GRID_SIZE, (row + 1) * GRID_SIZE).reverse();
            const mergedRow = mergeRow(rowCells).reverse();
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
            const mergedColumn = mergeRow(columnCells);
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
            const mergedColumn = mergeRow(columnCells.reverse()).reverse();
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
        
        addRandomTile();
        updateGrid();
        checkGameOver();
    }
}

// Слияние строки
function mergeRow(row) {
    let newRow = row.filter(x => x !== 0);
    
    for (let i = 0; i < newRow.length - 1; i++) {
        if (newRow[i] === newRow[i + 1]) {
            newRow[i] *= 2;
            state.score += newRow[i];
            elements.score.textContent = state.score;
            newRow[i + 1] = 0;

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
    clearInterval(state.timerInterval);
    
    if (state.isSpeedrunMode) {
        const endTime = Date.now();
        const timeTaken = endTime - state.startTime;
        
        if (isWin) {
            alert(`You won in ${formatTime(timeTaken)}!`);
        } else {
            alert('Game Over! You didn\'t reach 2048 in time.');
        }
        
        // Сохранение результатов speedrun
        if (state.currentUser) {
            try {
                await fetch(`${API_BASE_URL}/save-speedrun`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        userId: state.currentUser.id,
                        time: timeTaken,
                        blockTimes: state.blockTimes
                    })
                });
            } catch (error) {
                console.error('Failed to save speedrun results:', error);
            }
        }
    } else {
        // Логика для классического режима
        if (state.score > state.bestScore) {
            state.bestScore = state.score;
            elements.best.textContent = state.bestScore;
            
            // Сохранение счета на сервере
            if (state.currentUser) {
                try {
                    await fetch(`${API_BASE_URL}/save-score`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            userId: state.currentUser.id,
                            score: state.score
                        })
                    });
                } catch (error) {
                    console.error('Failed to save score:', error);
                }
            }
        }
        
        alert('Game Over!');
    }
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
function renderBestResults(stats) {
    elements.bestResultsList.innerHTML = '';
    
    // Classic Mode
    const classicDiv = document.createElement('div');
    classicDiv.className = 'best-results-block';
    classicDiv.innerHTML = `
        <h3>Classic Mode</h3>
        <p>${stats?.bestScore || 'N/A'}</p>
    `;
    elements.bestResultsList.appendChild(classicDiv);
    
    // Speedrun Mode
    const speedrunDiv = document.createElement('div');
    speedrunDiv.className = 'best-results-block';
    speedrunDiv.innerHTML = `
        <h3>Speedrun Mode</h3>
        <p>${stats?.bestSpeedrunTime ? formatTime(stats.bestSpeedrunTime) : 'N/A'}</p>
    `;
    elements.bestResultsList.appendChild(speedrunDiv);
    
    // Block Times
    const blocksDiv = document.createElement('div');
    blocksDiv.className = 'best-results-block';
    blocksDiv.innerHTML = '<h3>Best Block Times</h3>';
    
    if (stats?.bestBlockTimes && Object.keys(stats.bestBlockTimes).length > 0) {
        for (const [block, time] of Object.entries(stats.bestBlockTimes)) {
            const div = document.createElement('div');
            div.textContent = `${block}: ${formatTime(time)}`;
            blocksDiv.appendChild(div);
        }
    } else {
        blocksDiv.innerHTML += '<div>N/A</div>';
    }
    
    elements.bestResultsList.appendChild(blocksDiv);
}

// Показать рейтинг
function showRating() {
    state.currentRatingPage = 1;
    state.currentRatingMode = 'classic';
    elements.ratingModal.classList.remove('hidden');
    loadRatingData();
}

// Загрузка данных рейтинга
async function loadRatingData() {
    elements.ratingContent.innerHTML = '<div class="loading">Loading...</div>';
    
    try {
        const response = await fetch(
            `${API_BASE_URL}/leaderboard/${state.currentRatingMode}?page=${state.currentRatingPage}&limit=${state.ratingPerPage}`
        );
        const data = await response.json();
        
        if (data.success) {
            renderRatingData(data);
        } else {
            elements.ratingContent.innerHTML = '<div class="error">Failed to load data</div>';
        }
    } catch (error) {
        elements.ratingContent.innerHTML = '<div class="error">Network error</div>';
    }
}

// Отрисовка данных рейтинга
function renderRatingData(data) {
    document.getElementById('page-info').textContent = `Page ${state.currentRatingPage} of ${Math.ceil(data.meta.total / state.ratingPerPage)}`;
    
    let html = '<table class="rating-table"><thead><tr>';
    
    // Заголовки таблицы
    if (state.currentRatingMode === 'classic') {
        html += '<th>Rank</th><th>Player</th><th>Score</th>';
    } else if (state.currentRatingMode === 'speedrun') {
        html += '<th>Rank</th><th>Player</th><th>Time</th>';
    } else {
        html += '<th>Rank</th><th>Player</th><th>Block</th><th>Time</th>';
    }
    
    html += '</tr></thead><tbody>';
    
    // Данные таблицы
    data.data.forEach((item, index) => {
        const isCurrentUser = state.currentUser && item.user_id === state.currentUser.id;
        let rowClass = '';
        
        if (isCurrentUser) rowClass = 'current-user';
        else if (index < 3) rowClass = `medal-${index + 1}`;
        
        html += `<tr class="${rowClass}">`;
        html += `<td>${(state.currentRatingPage - 1) * state.ratingPerPage + index + 1}</td>`;
        html += `<td>${item.username}</td>`;
        
        if (state.currentRatingMode === 'classic') {
            html += `<td>${item.score}</td>`;
        } else if (state.currentRatingMode === 'speedrun') {
            html += `<td>${formatTime(item.time)}</td>`;
        } else {
            html += `<td>${item.block_value}</td><td>${formatTime(item.block_time)}</td>`;
        }
        
        html += '</tr>';
    });
    
    html += '</tbody></table>';
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

// Инициализация игры при загрузке страницы
document.addEventListener('DOMContentLoaded', initGame);