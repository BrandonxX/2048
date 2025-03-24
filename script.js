// Инициализация переменных
const gridSize = 4;
const grid = document.querySelector('.grid');
const scoreElement = document.getElementById('score');
const bestElement = document.getElementById('best');
const restartButton = document.getElementById('restart');
const menuButton = document.getElementById('menu-button');
const playButton = document.getElementById('play-button');
const speedrunButton = document.getElementById('speedrun-button');
const bestResultsButton = document.getElementById('best-results-button');
const mainMenu = document.getElementById('main-menu');
const gameInterface = document.getElementById('game-interface');
const menuButtons = document.getElementById('menu-buttons');
const timerElement = document.getElementById('timer');
const timeElement = document.getElementById('time');
const bestResultsModal = document.getElementById('best-results-modal');
const bestResultsList = document.getElementById('best-results-list');
const closeModalButton = document.getElementById('close-modal');
const form = document.querySelector('.form');
const logoutButton = document.getElementById('logout-button');

let currentUser = null; // Переменная для хранения данных пользователя
let best = 0; // Лучший счёт пользователя
let score = 0;
let isFirstMove = false; // Флаг для отслеживания первого нажатия клавиши
let speedrunBest = parseInt(localStorage.getItem('speedrunBest')) || 'N/A';
let isSpeedrunMode = localStorage.getItem('gameMode') === 'speedrun';
let timerInterval;
let startTime;
let blockTimes = {};
let bestBlockTimes;

try {
    bestBlockTimes = JSON.parse(localStorage.getItem('bestBlockTimes')) || {};
} catch (e) {
    bestBlockTimes = {};
}

bestElement.textContent = best;

// Логика формы регистрации и входа
$(document).ready(function() {
    // Функция для обновления высоты формы
    function updateFormHeight() {
        const activePanel = $('.form-panel.one').hasClass('hidden') ? $('.form-panel.two') : $('.form-panel.one');
        const newHeight = activePanel.outerHeight(true); // Учитываем padding и margin
        $('.form').css('height', newHeight);
    }

    // Переключение на панель регистрации
    $('#switch-to-register').on('click', function(e) {
        e.preventDefault(); // Предотвращаем стандартное поведение кнопки
        $('.form-panel.one').addClass('hidden'); // Скрываем панель входа
        $('.form-panel.two').addClass('active'); // Показываем панель регистрации
        updateFormHeight(); // Обновляем высоту формы
    });

    // Переключение на панель входа
    $('.form-toggle').on('click', function(e) {
        e.preventDefault();
        $(this).removeClass('visible'); // Скрываем элемент переключения
        $('.form-panel.one').removeClass('hidden'); // Показываем панель входа
        $('.form-panel.two').removeClass('active'); // Скрываем панель регистрации
        updateFormHeight(); // Обновляем высоту формы
    });

    $('#switch-to-login').on('click', function(e) {
        e.preventDefault();
        $('.form-panel.two').removeClass('active');
        $('.form-panel.one').removeClass('hidden');
        updateFormHeight();
    });
});

// Функция для загрузки лучшего счёта
function loadBestScore(userId) {
    $.ajax({
        url: `http://localhost:5000/best-score/${userId}`,
        method: 'GET',
        success: function(response) {
            if (response.success) {
                best = response.bestScore;
                bestElement.textContent = best;
            } else {
                console.error('Ошибка при загрузке лучшего счёта');
            }
        },
        error: function(xhr, status, error) {
            console.error('Ошибка:', error);
        }
    });
}

// Обработка отправки формы входа
$('#login-form').on('submit', function(e) {
    e.preventDefault();
    const username = $('#login-form input[name="username"]').val().trim();
    const password = $('#login-form input[name="password"]').val().trim();

    // Скрываем сообщение об ошибке при новой попытке входа
    $('#login-error').hide();

    // Базовая проверка данных
    if (!username || !password) {
        $('#login-error').text('Пожалуйста, заполните все поля.').show();
        return;
    }

    // Отправка данных на сервер
    $.ajax({
        url: 'http://localhost:5000/login',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ username, password }),
        success: function(response) {
            if (response.success) {
                currentUser = response.user; // Сохраняем данные пользователя
                loadBestScore(currentUser.id);
                // Успешный вход: скрываем форму и показываем главное меню
                form.classList.add('hidden');
                mainMenu.classList.remove('hidden');
            } else {
                // Ошибка входа: показываем сообщение об ошибке
                $('#login-error').text(response.message || 'Неверное имя пользователя или пароль').show();
            }
        },
        error: function(xhr, status, error) {
            console.error('Ошибка:', error);
            $('#login-error').text('Ошибка при отправке данных на сервер').show();
        }
    });
});

// Обработка отправки формы регистрации
$('#register-form').on('submit', function(e) {
    e.preventDefault();

    // Получаем данные из формы
    const username = $('#register-username').val().trim();
    const password = $('#register-password').val().trim();
    const cpassword = $('#register-cpassword').val().trim();
    const email = $('#register-email').val().trim();

    // Сброс предыдущих ошибок
    $('#register-error').hide();

    // Валидация данных
    if (!username || !password || !cpassword || !email) {
        $('#register-error').text('Пожалуйста, заполните все поля.').show();
        return;
    }

    if (password !== cpassword) {
        $('#register-error').text('Пароли не совпадают.').show();
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        $('#register-error').text('Пожалуйста, введите корректный email.').show();
        return;
    }

    // Если валидация прошла успешно, отправляем данные на сервер
    $.ajax({
        url: 'http://localhost:5000/register',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ username, password, email }),
        success: function(response) {
            if (response.success) {
                alert('Регистрация прошла успешно!');
                // Переключаемся на панель входа
                $('.form-panel.two').removeClass('active'); // Скрываем панель регистрации
                $('.form-panel.one').removeClass('hidden'); // Показываем панель входа
            } else {
                $('#register-error').text(response.message || 'Ошибка при регистрации').show();
            }
        },
        error: function(xhr, status, error) {
            console.error('Ошибка:', error);
            $('#register-error').text('Ошибка при отправке данных на сервер').show();
        }
    });
});

// Переключение между меню и игрой
menuButton.addEventListener('click', () => {
    resetGame();
    gameInterface.classList.add('hidden');
    mainMenu.classList.remove('hidden');
    menuButtons.classList.remove('hidden');
});

playButton.addEventListener('click', () => {
    localStorage.setItem('gameMode', 'classic');
    startGame(false);
});

speedrunButton.addEventListener('click', () => {
    localStorage.setItem('gameMode', 'speedrun');
    startGame(true);
});

bestResultsButton.addEventListener('click', () => {
    showBestResults();
});

closeModalButton.addEventListener('click', () => {
    bestResultsModal.classList.add('hidden');
});

// Обработка нажатия кнопки Restart
restartButton.addEventListener('click', () => {
    resetGame();
});

logoutButton.addEventListener('click', () => {
    // Сбрасываем данные пользователя
    currentUser = null;

    // Скрываем главное меню
    mainMenu.classList.add('hidden');

    // Показываем форму входа
    form.classList.remove('hidden');

    // Сбрасываем игру
    resetGame();
});

// Запуск игры
function startGame(isSpeedrun) {
    clearInterval(timerInterval);
    isSpeedrunMode = isSpeedrun;
    mainMenu.classList.add('hidden');
    gameInterface.classList.remove('hidden');
    menuButtons.classList.add('hidden');
    timerElement.classList.toggle('hidden', !isSpeedrun);
    document.getElementById('block-times').classList.toggle('hidden', !isSpeedrun);

    // Управление видимостью блока Best
    const bestElement = document.querySelector('.best');
    if (isSpeedrun) {
        bestElement.classList.add('hidden'); // Скрываем Best в режиме Speedrun
        blockTimes = {}; // Сброс времени появления блоков

    } else {
        bestElement.classList.remove('hidden'); // Показываем Best в режиме Classic
        if (currentUser) {
            loadBestScore(currentUser.id); // Загружаем лучший счет из базы данных
        } else {
            best = parseInt(localStorage.getItem('best')) || 0;
            document.getElementById('best').textContent = best;
        }
        best = parseInt(localStorage.getItem('best')) || 0;
        document.getElementById('best').textContent = best; // Обновляем Best
    }

    score = 0;
    scoreElement.textContent = score;
    initializeGrid();
}

// Сброс игры
function resetGame() {
    clearInterval(timerInterval);
    isSpeedrunMode = localStorage.getItem('gameMode') === 'speedrun';
    isFirstMove = false; // Сбрасываем флаг первого нажатия

    // Управление видимостью блока Best
    const bestElement = document.querySelector('.best');
    if (isSpeedrunMode) {
        bestElement.classList.add('hidden'); // Скрываем Best в режиме Speedrun
    } else {
        bestElement.classList.remove('hidden'); // Показываем Best в режиме Classic
    }

    // Управление видимостью блока Time
    timerElement.classList.toggle('hidden', !isSpeedrunMode); // Показываем Time только в режиме Speedrun

    score = 0;
    scoreElement.textContent = score;
    timeElement.textContent = '00:00.000';

    // Сброс времени блоков и очистка отображения
    blockTimes = {};
    updateBlockTimes(); // Очищаем список времени блоков

    initializeGrid();
}

// Инициализация сетки
function initializeGrid() {
    grid.innerHTML = '';
    for (let i = 0; i < gridSize * gridSize; i++) {
        const cell = document.createElement('div');
        grid.appendChild(cell);
    }
    addRandomTile();
    addRandomTile();
    updateGrid();
}

// Добавление случайной плитки
function addRandomTile() {
    const emptyCells = [];
    grid.childNodes.forEach((cell, index) => {
        if (cell.textContent === '') {
            emptyCells.push(index);
        }
    });
    if (emptyCells.length > 0) {
        const randomIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        grid.childNodes[randomIndex].textContent = Math.random() < 0.9 ? 2 : 4;
    }
}

// Обновление сетки
function updateGrid() {
    grid.childNodes.forEach(cell => {
        const value = cell.textContent;
        cell.style.backgroundColor = getTileColor(value);
        cell.style.color = value > 4 ? '#f9f6f2' : '#776e65';
    });

    const has2048 = Array.from(grid.childNodes).some(cell => cell.textContent === '2048');
    if (isSpeedrunMode && has2048) {
        endGame(true);
    }
}

// Получение цвета плитки
function getTileColor(value) {
    const colors = {
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
        2048: '#edc22e',
    };
    return colors[value] || '#cdc1b4';
}

// Обработка нажатий клавиш
document.addEventListener('keydown', (event) => {
    if (event.key && event.key.startsWith('Arrow')) {
        const direction = event.key.replace('Arrow', '').toLowerCase();

        // Если это первое нажатие и режим Speedrun, запускаем таймер
        if (isSpeedrunMode && !isFirstMove) {
            isFirstMove = true; // Устанавливаем флаг, что первое нажатие произошло
            startTime = Date.now(); // Инициализация startTime
            startTimer(); // Запуск таймера
        }

        moveTiles(direction);
    }
});

// Движение плиток
function moveTiles(direction) {
    let moved = false;
    const cells = Array.from(grid.childNodes).map(cell => cell.textContent || 0);
    const newCells = Array(gridSize * gridSize).fill(0);

    if (direction === 'left') {
        for (let row = 0; row < gridSize; row++) {
            const rowCells = cells.slice(row * gridSize, (row + 1) * gridSize);
            const mergedRow = mergeRow(rowCells);
            for (let col = 0; col < gridSize; col++) {
                newCells[row * gridSize + col] = mergedRow[col];
            }
        }
    } else if (direction === 'right') {
        for (let row = 0; row < gridSize; row++) {
            const rowCells = cells.slice(row * gridSize, (row + 1) * gridSize).reverse();
            const mergedRow = mergeRow(rowCells).reverse();
            for (let col = 0; col < gridSize; col++) {
                newCells[row * gridSize + col] = mergedRow[col];
            }
        }
    } else if (direction === 'up') {
        for (let col = 0; col < gridSize; col++) {
            const columnCells = [];
            for (let row = 0; row < gridSize; row++) {
                columnCells.push(cells[row * gridSize + col]);
            }
            const mergedColumn = mergeRow(columnCells);
            for (let row = 0; row < gridSize; row++) {
                newCells[row * gridSize + col] = mergedColumn[row];
            }
        }
    } else if (direction === 'down') {
        for (let col = 0; col < gridSize; col++) {
            const columnCells = [];
            for (let row = 0; row < gridSize; row++) {
                columnCells.push(cells[row * gridSize + col]);
            }
            const mergedColumn = mergeRow(columnCells.reverse()).reverse();
            for (let row = 0; row < gridSize; row++) {
                newCells[row * gridSize + col] = mergedColumn[row];
            }
        }
    }

    if (cells.toString() !== newCells.toString()) {
        moved = true;
        grid.childNodes.forEach((cell, index) => {
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
            score += newRow[i];
            scoreElement.textContent = score;
            newRow[i + 1] = 0;

            if (isSpeedrunMode) {
                const blockValue = newRow[i];
                if ([8, 16, 32, 64, 128, 256, 512, 1024, 2048].includes(blockValue)) {
                    const currentTime = Date.now() - startTime;
                    if (!blockTimes[blockValue]) {
                        blockTimes[blockValue] = currentTime;
                        updateBlockTimes(); // Обновляем отображение времени блоков
                    }
                }
            }
        }
    }
    newRow = newRow.filter(x => x !== 0);
    while (newRow.length < gridSize) {
        newRow.push(0);
    }
    return newRow;
}

// Проверка завершения игры
function checkGameOver() {
    const cells = Array.from(grid.childNodes).map(cell => cell.textContent || 0);
    if (!cells.includes(0) && !canMerge(cells)) {
        endGame(false);
    }
}

// Проверка возможности слияния
function canMerge(cells) {
    for (let i = 0; i < cells.length; i++) {
        if (i % gridSize !== gridSize - 1 && cells[i] === cells[i + 1]) {
            return true;
        }
        if (i < cells.length - gridSize && cells[i] === cells[i + gridSize]) {
            return true;
        }
    }
    return false;
}

// Завершение игры
function endGame(isWin) {
    clearInterval(timerInterval); // Останавливаем таймер

    if (isSpeedrunMode) {
        const endTime = Date.now();
        const timeTaken = endTime - startTime; // Время, затраченное на игру

        // Отправляем данные на сервер для сравнения и обновления
        if (currentUser) {
            $.ajax({
                url: 'http://localhost:5000/save-speedrun-result',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    userId: currentUser.id,
                    bestTime: timeTaken,
                    bestBlockTimes: blockTimes
                }),
                success: function(response) {
                    if (response.success) {
                        console.log('Данные успешно сохранены');
                    } else {
                        console.error('Время не лучше предыдущего');
                    }
                },
                error: function(xhr, status, error) {
                    console.error('Ошибка:', error);
                }
            });
        }

        // Показываем сообщение о результате игры
        if (isWin) {
            alert(`You won in ${formatTime(timeTaken)}!`);
        } else {
            alert(`Game Over! You didn't reach 2048 in time. Try again!`);
        }

        // Показываем время появления блоков
        showBlockTimes();
    } else {
        // Логика для режима Classic
        if (score > best) {
            best = score; // Обновляем лучший счёт
            localStorage.setItem('best', best); // Сохраняем лучший счёт в localStorage
            document.getElementById('best').textContent = best; // Обновляем блок Best

            // Сохраняем счёт на сервере, если пользователь авторизован
            if (currentUser) {
                $.ajax({
                    url: 'http://localhost:5000/save-score',
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({ userId: currentUser.id, score: score }),
                    success: function(response) {
                        if (response.success) {
                            console.log('Счёт успешно сохранён');
                        } else {
                            console.error('Счёт не лучше предыдущего');
                        }
                    },
                    error: function(xhr, status, error) {
                        console.error('Ошибка:', error);
                    }
                });
            }
        }

        // Показываем сообщение о завершении игры
        alert('Game Over!');
    }
}

// Обновление времени появления блоков
function updateBlockTimes() {
    const blockTimesList = document.getElementById('block-times-list');
    blockTimesList.innerHTML = ''; // Очищаем список

    for (const [block, time] of Object.entries(blockTimes)) {
        const blockTimeDiv = document.createElement('div');
        blockTimeDiv.textContent = `${block}: ${formatTime(time)}`;
        blockTimesList.appendChild(blockTimeDiv);
    }
}

// Показать лучшие результаты
function showBestResults() {
    bestResultsList.innerHTML = ''; // Очищаем список

    if (currentUser) {
        // Загружаем данные с сервера
        $.ajax({
            url: `http://localhost:5000/user-results/${currentUser.id}`,
            method: 'GET',
            success: function(response) {
                if (response.success) {
                    const { best_score, best_speedrun_time, best_block_times } = response.data;

                    // Всегда показываем все три блока
                    const classicBestDiv = document.createElement('div');
                    classicBestDiv.classList.add('best-results-block');
                    classicBestDiv.innerHTML = `
                        <h3>Classic Mode Best Score</h3>
                        <p>${best_score || 'N/A'}</p>
                    `;
                    bestResultsList.appendChild(classicBestDiv);

                    const speedrunBestDiv = document.createElement('div');
                    speedrunBestDiv.classList.add('best-results-block');
                    speedrunBestDiv.innerHTML = `
                        <h3>Speedrun Mode Best Time</h3>
                        <p>${best_speedrun_time !== null ? formatTime(best_speedrun_time) : 'N/A'}</p>
                    `;
                    bestResultsList.appendChild(speedrunBestDiv);

                    const blockTimesDiv = document.createElement('div');
                    blockTimesDiv.classList.add('best-results-block');
                    blockTimesDiv.innerHTML = `
                        <h3>Best Block Times</h3>
                    `;

                    const blockTimes = best_block_times ? JSON.parse(best_block_times) : {};
                    if (Object.keys(blockTimes).length > 0) {
                        Object.entries(blockTimes).forEach(([block, time]) => {
                            const blockTimeDiv = document.createElement('div');
                            blockTimeDiv.textContent = `${block}: ${formatTime(time)}`;
                            blockTimesDiv.appendChild(blockTimeDiv);
                        });
                    } else {
                        const noDataDiv = document.createElement('div');
                        noDataDiv.textContent = 'N/A';
                        blockTimesDiv.appendChild(noDataDiv);
                    }

                    bestResultsList.appendChild(blockTimesDiv);
                } else {
                    console.error('Ошибка при загрузке данных');
                }
            },
            error: function(xhr, status, error) {
                console.error('Ошибка:', error);
            }
        });
    } else {
        // Показываем блоки с N/A для неавторизованных пользователей
        const classicBestDiv = document.createElement('div');
        classicBestDiv.classList.add('best-results-block');
        classicBestDiv.innerHTML = `
            <h3>Classic Mode Best Score</h3>
            <p>N/A</p>
        `;
        bestResultsList.appendChild(classicBestDiv);

        const speedrunBestDiv = document.createElement('div');
        speedrunBestDiv.classList.add('best-results-block');
        speedrunBestDiv.innerHTML = `
            <h3>Speedrun Mode Best Time</h3>
            <p>N/A</p>
        `;
        bestResultsList.appendChild(speedrunBestDiv);

        const blockTimesDiv = document.createElement('div');
        blockTimesDiv.classList.add('best-results-block');
        blockTimesDiv.innerHTML = `
            <h3>Best Block Times</h3>
            <div>N/A</div>
        `;
        bestResultsList.appendChild(blockTimesDiv);
    }

    bestResultsModal.classList.remove('hidden');
}

// Форматирование времени
function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const ms = milliseconds % 1000;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

// Запуск таймера
function startTimer() {
    console.log("Таймер запущен"); // Отладочный вывод
    let lastTime = Date.now();
    const timeTextNode = document.createTextNode(""); // Создаем текстовый узел
    timeElement.textContent = ""; // Очищаем содержимое
    timeElement.appendChild(timeTextNode); // Добавляем текстовый узел

    function updateTimer() {
        const currentTime = Date.now() - startTime;
        timeTextNode.nodeValue = formatTime(currentTime); // Обновляем только текстовый узел
        requestAnimationFrame(updateTimer);
    }
    updateTimer(); // Запуск таймера
}

// Инициализация игры
initializeGrid();