console.log('script.js loaded');

window.addEventListener('DOMContentLoaded', () => {
    // Add event listener for 2FA verify button
    const verifyBtn = document.getElementById('two-factor-setup-verify-btn');
    const cancelBtn = document.getElementById('two-factor-setup-cancel-btn');
    if (verifyBtn) {
        verifyBtn.addEventListener('click', () => {
            const modal = document.getElementById('two-factor-setup-modal');
            const codeInput = document.getElementById('two-factor-setup-code-input');
            const errorDiv = document.getElementById('two-factor-setup-error');
            const username = modal.dataset.username;
            const code = codeInput.value.trim();
        
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
        
            if (!code.match(/^\d{6}$/)) {
                errorDiv.textContent = 'Please enter a valid 6-digit code.';
                errorDiv.style.display = 'block';
                return;
            }
        
            // Fetch userId by username before verification
            fetch(`${API_BASE_URL}/user/by-username?username=${encodeURIComponent(username)}`)
            .then(res => res.json())
            .then(data => {
                if (!data.success) {
                    throw new Error(data.message || 'User not found');
                }
                const userId = data.userId;
                // Verify 2FA code
                return fetch(`${API_BASE_URL}/2fa/verify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, token: code })
                });
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert('Two-factor authentication enabled successfully.');
                    modal.classList.add('hidden');
                    codeInput.value = '';
                } else {
                    errorDiv.textContent = data.message || 'Invalid code. Please try again.';
                    errorDiv.style.display = 'block';
                }
            })
            .catch(err => {
                errorDiv.textContent = err.message || 'Error verifying code.';
                errorDiv.style.display = 'block';
            });
        });
    }
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            const modal = document.getElementById('two-factor-setup-modal');
            const codeInput = document.getElementById('two-factor-setup-code-input');
            const errorDiv = document.getElementById('two-factor-setup-error');
            modal.classList.add('hidden');
            codeInput.value = '';
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
        });
    }
});


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

function openTwoFactorSetupModal() {
    const modal = document.getElementById('two-factor-setup-modal');
    const qrCodeContainer = document.getElementById('two-factor-qr-code');
    const codeInput = document.getElementById('two-factor-setup-code-input');
    const errorDiv = document.getElementById('two-factor-setup-error');

    if (!modal) return;

    if (!state.currentUser || !state.currentUser.id) {
        alert('Please log in first to setup 2FA.');
        return;
    }

    // Clear previous error and input
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';
    codeInput.value = '';
    qrCodeContainer.innerHTML = '';

    // Show modal
    modal.classList.remove('hidden');

    console.log('Fetching 2FA setup QR code for userId:', state.currentUser.id);

    // Fetch QR code and secret from backend using userId
    fetch(`${API_BASE_URL}/2fa/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: state.currentUser.id })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            console.log('Received QR code data:', data.qrCodeDataUrl);
            qrCodeContainer.innerHTML = `<img src="${data.qrCodeDataUrl}" alt="QR Code" />`;
            modal.dataset.secret = data.secret;
        } else {
            console.error('Failed to get 2FA setup data:', data.message);
            errorDiv.textContent = data.message || 'Failed to get 2FA setup data';
            errorDiv.style.display = 'block';
        }
    })
    .catch((err) => {
        console.error('Network error while fetching 2FA setup data:', err);
        errorDiv.textContent = 'Network error while fetching 2FA setup data';
        errorDiv.style.display = 'block';
    });
}

// Verify 2FA setup code from modal
document.getElementById('two-factor-setup-verify-btn').addEventListener('click', async () => {
    const modal = document.getElementById('two-factor-setup-modal');
    const codeInput = document.getElementById('two-factor-setup-code-input');
    const errorDiv = document.getElementById('two-factor-setup-error');
    const token = codeInput.value.trim();

    if (!/^\d{6}$/.test(token)) {
        errorDiv.textContent = 'Please enter a valid 6-digit code.';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        const userId = state.currentUser ? state.currentUser.id : null;
        if (!userId) {
            errorDiv.textContent = 'User not logged in.';
            errorDiv.style.display = 'block';
            return;
        }

        const response = await fetch(`${API_BASE_URL}/2fa/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, token })
        });

        const data = await response.json();

        if (data.success) {
            alert('Two-Factor Authentication enabled successfully!');
            modal.classList.add('hidden');
        } else {
            errorDiv.textContent = data.message || 'Invalid 2FA code.';
            errorDiv.style.display = 'block';
        }
    } catch {
        errorDiv.textContent = 'Network error. Please try again.';
        errorDiv.style.display = 'block';
    }
});

window.addEventListener('DOMContentLoaded', () => {
    // Removed call to undefined function addManualTwoFactorTrigger

    // Global click logger for debugging
    document.addEventListener('click', (event) => {
        console.log('Document click:', event.target);
    });

    // Delegated event listener for 2FA setup button click
    document.addEventListener('click', (event) => {
        const target = event.target;
        if (target && target.id === 'open-2fa-setup-from-login') {
            console.log('Setup 2FA button clicked (delegated)'); // Debug log to confirm click
            const username = prompt('Enter your username to setup 2FA:');
            if (!username) {
                alert('Username is required to setup 2FA.');
                return;
            }
            openTwoFactorSetupModalForUsername(username);
        }
    });
});

function addTwoFactorSetupButton() {
    if (!state.currentUser) return;

    let btn = document.getElementById('two-factor-setup-button');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'two-factor-setup-button';
        btn.textContent = 'Setup 2FA';
        btn.classList.add('menu-button'); // Add class for styling consistent with other buttons
        btn.style.marginLeft = '10px';
        btn.addEventListener('click', () => {
            openTwoFactorSetupModal();
        });
        const menuButtons = document.getElementById('menu-buttons');
        if (menuButtons) {
            menuButtons.appendChild(btn);
        } else {
            elements.mainMenu.appendChild(btn);
        }
    }
}

function createTwoFactorSetupModal() {
    if (document.getElementById('two-factor-setup-modal')) {
        return; // Modal already exists
    }

    const modal = document.createElement('div');
    modal.id = 'two-factor-setup-modal';
    modal.className = 'modal hidden';
    modal.style.cssText = `
        width: 100%;
        height: 100%;
        display: none;
        justify-content: center;
        align-items: center;
        position: fixed;
        top: 0; left: 0;
        background-color: rgba(0,0,0,0.5);
        z-index: 99999;
    `;

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.cssText = `
        width: 350px;
        background: #fff;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;

    modalContent.innerHTML = `
        <h2>Two-Factor Authentication Setup</h2>
        <p>Scan the QR code below with your authenticator app, then enter the 6-digit code to enable 2FA.</p>
        <div id="two-factor-qr-code" style="margin: 10px 0; text-align: center;">
            <img id="two-factor-qr-image" src="" alt="QR Code" style="max-width: 100%; height: auto;"/>
        </div>
        <input type="text" id="two-factor-setup-code-input" maxlength="6" pattern="\\d{6}" placeholder="123456" style="width: 100%; padding: 10px; font-size: 16px; box-sizing: border-box;"/>
        <div id="two-factor-setup-error" class="error-message" style="display:none; margin-top: 10px; color: red;"></div>
        <div class="modal-buttons" style="display: flex; justify-content: space-between; margin-top: 15px;">
            <button id="two-factor-setup-verify-btn" style="padding: 10px 15px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Verify</button>
            <button id="two-factor-setup-cancel-btn" style="padding: 10px 15px; background-color: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
        </div>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Add event listeners for verify and cancel buttons
    document.getElementById('two-factor-setup-verify-btn').addEventListener('click', () => {
        verifyTwoFactorCode();
    });

    document.getElementById('two-factor-setup-cancel-btn').addEventListener('click', () => {
        closeTwoFactorSetupModal();
    });
}

function openTwoFactorSetupModalForUsername(username) {
    createTwoFactorSetupModal();

    const modal = document.getElementById('two-factor-setup-modal');
    const qrCodeContainer = document.getElementById('two-factor-qr-code');
    const codeInput = document.getElementById('two-factor-setup-code-input');
    const errorDiv = document.getElementById('two-factor-setup-error');

    if (!modal) {
        console.error('Modal element not found');
        return;
    }

    // Clear previous error and input
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';
    codeInput.value = '';

    // Show modal
    modal.classList.remove('hidden');
    // Removed inline style display to avoid conflict with CSS opacity/visibility
    // modal.style.display = 'flex';
    console.log('Modal shown');

    // Fetch userId by username first
    fetch(`${API_BASE_URL}/user/by-username?username=${encodeURIComponent(username)}`)
.then(res => {
    console.log('Fetch /user/by-username response status:', res.status);
    return res.json();
})
.then(data => {
    console.log('Fetch /user/by-username data:', data);
    if (data.success) {
        const userId = data.userId;
        return fetch(`${API_BASE_URL}/2fa/setup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });
    } else {
        throw new Error(data.message || 'User not found');
    }
})
.then(res => {
    console.log('Fetch /2fa/setup response status:', res.status);
    return res.json();
})
    .then(data => {
        console.log('Fetch /2fa/setup data:', data);
        if (data.success) {
            const qrImage = document.getElementById('two-factor-qr-image');
            if (qrImage) {
                qrImage.src = data.qrCodeDataUrl;
                console.log('QR code image src set to:', qrImage.src);
            }
            modal.dataset.secret = data.secret;
            modal.dataset.username = username;
        } else {
            errorDiv.textContent = data.message || 'Failed to get 2FA setup data';
            errorDiv.style.display = 'block';
        }
    })
.catch((err) => {
    console.error('Error in openTwoFactorSetupModalForUsername:', err);
    errorDiv.textContent = err.message || 'Network error while fetching 2FA setup data';
    errorDiv.style.display = 'block';
});

}

function closeTwoFactorSetupModal() {
    const modal = document.getElementById('two-factor-setup-modal');
    if (modal) {
        modal.classList.add('hidden');
        // Removed inline style display to avoid conflict with CSS opacity/visibility
        // modal.style.display = 'none';
    }
}

function verifyTwoFactorCode() {
    const modal = document.getElementById('two-factor-setup-modal');
    const codeInput = document.getElementById('two-factor-setup-code-input');
    const errorDiv = document.getElementById('two-factor-setup-error');

    const code = codeInput.value.trim();
    if (!/^\d{6}$/.test(code)) {
        errorDiv.textContent = 'Please enter a valid 6-digit code.';
        errorDiv.style.display = 'block';
        return;
    }

    const userId = modal.dataset.userId;
    const username = modal.dataset.username;
    const secret = modal.dataset.secret;

    fetch(`${API_BASE_URL}/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, username, secret, code })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('Two-Factor Authentication enabled successfully.');
            closeTwoFactorSetupModal();
        } else {
            errorDiv.textContent = data.message || 'Failed to verify 2FA code.';
            errorDiv.style.display = 'block';
        }
    })
    .catch(err => {
        console.error('Error verifying 2FA code:', err);
        errorDiv.textContent = 'Network error while verifying 2FA code.';
        errorDiv.style.display = 'block';
    });
}

// Close 2FA setup modal
document.getElementById('two-factor-setup-cancel-btn').addEventListener('click', () => {
    const modal = document.getElementById('two-factor-setup-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
});

// Verify 2FA setup code from modal
document.getElementById('two-factor-setup-verify-btn').addEventListener('click', async () => {
    const modal = document.getElementById('two-factor-setup-modal');
    const codeInput = document.getElementById('two-factor-setup-code-input');
    const errorDiv = document.getElementById('two-factor-setup-error');
    const token = codeInput.value.trim();

    if (!/^\d{6}$/.test(token)) {
        errorDiv.textContent = 'Please enter a valid 6-digit code.';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/2fa/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: state.currentUser.id, token })
        });

        const data = await response.json();

        if (data.success) {
            alert('Two-Factor Authentication enabled successfully!');
            modal.classList.add('hidden');
        } else {
            errorDiv.textContent = data.message || 'Invalid 2FA code.';
            errorDiv.style.display = 'block';
        }
    } catch {
        errorDiv.textContent = 'Network error. Please try again.';
        errorDiv.style.display = 'block';
    }
});

// Modify loadUserStats to add 2FA setup button after user is set
async function loadUserStats() {
    if (!state.currentUser) {
        // For guests, get best score from localStorage
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
            if (data.stats.bestScore !== undefined) {
                state.bestScore = data.stats.bestScore;
                elements.best.textContent = state.bestScore;
            }
            
            if (data.stats.bestBlockTimes) {
                state.bestBlockTimes = data.stats.bestBlockTimes;
            }

            // Add 2FA setup button
            addTwoFactorSetupButton();
        }
    } catch (error) {
        console.error('Failed to load user stats:', error);
    }
}

// Show 2FA setup UI
function showTwoFactorSetup() {
    // Create container if not exists
    let setupContainer = document.getElementById('two-factor-setup-container');
    if (!setupContainer) {
        setupContainer = document.createElement('div');
        setupContainer.id = 'two-factor-setup-container';
        setupContainer.innerHTML = `
            <h3>Two-Factor Authentication Setup</h3>
            <p>Scan the QR code below with your authenticator app, then enter the 6-digit code to enable 2FA.</p>
            <div id="qr-code-container" style="margin: 10px 0;"></div>
            <input type="text" id="two-factor-setup-code" maxlength="6" pattern="\\d{6}" placeholder="123456" />
            <button id="two-factor-setup-verify">Verify & Enable 2FA</button>
            <button id="two-factor-setup-cancel">Cancel</button>
            <div id="two-factor-setup-error" class="error-message" style="display:none;color:red;margin-top:10px;"></div>
        `;
        document.body.appendChild(setupContainer);

        document.getElementById('two-factor-setup-verify').addEventListener('click', () => {
            verifyTwoFactorSetupCode();
        });

        document.getElementById('two-factor-setup-cancel').addEventListener('click', () => {
            setupContainer.remove();
        });
    } else {
        setupContainer.style.display = 'block';
    }

    // Fetch QR code and secret from backend
    fetch(`${API_BASE_URL}/2fa/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: state.currentUser.id })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const qrContainer = document.getElementById('qr-code-container');
            qrContainer.innerHTML = `<img src="${data.qrCodeDataUrl}" alt="QR Code" />`;
            setupContainer.dataset.secret = data.secret;
        } else {
            showError('two-factor-setup-error', data.message || 'Failed to get 2FA setup data');
        }
    })
    .catch(() => {
        showError('two-factor-setup-error', 'Network error while fetching 2FA setup data');
    });
}

// Verify 2FA setup code
async function verifyTwoFactorSetupCode() {
    const setupContainer = document.getElementById('two-factor-setup-container');
    const codeInput = document.getElementById('two-factor-setup-code');
    const errorDiv = document.getElementById('two-factor-setup-error');
    const token = codeInput.value.trim();

    if (!/^\d{6}$/.test(token)) {
        errorDiv.textContent = 'Please enter a valid 6-digit code.';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/2fa/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: state.currentUser.id, token })
        });

        const data = await response.json();

        if (data.success) {
            alert('Two-Factor Authentication enabled successfully!');
            setupContainer.remove();
        } else {
            errorDiv.textContent = data.message || 'Invalid 2FA code.';
            errorDiv.style.display = 'block';
        }
    } catch {
        errorDiv.textContent = 'Network error. Please try again.';
        errorDiv.style.display = 'block';
    }
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
    const activePanel = document.querySelector('.form-panel.one:not(.hidden), .form-panel.two.active');
    
    if (activePanel) {
        form.style.height = activePanel.offsetHeight + 'px';
    }
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
    isMusicEnabled: true,
    musicVolume: 1,
    soundVolume: 1
};

function setVolume(audioElement, volume) {
    if (audioElement) {
        audioElement.volume = volume;
    }
}

function handleMusicVolumeChange(event) {
    const newVolume = event.target.value;
    soundState.musicVolume = event.target.value;
    setVolume(document.getElementById('menu-music'), soundState.musicVolume);
    setVolume(document.getElementById('game-music'), soundState.musicVolume);

    //Синхронизация
    const otherMusicVolumeSlider = document.getElementById('music-volume' + (event.target.id === 'music-volume' ? '2' : ''));
    if (otherMusicVolumeSlider) {
        otherMusicVolumeSlider.value = newVolume;
    }
}

// Function to handle sound volume change
function handleSoundVolumeChange(event) {
    const newVolume = event.target.value;
    soundState.soundVolume = event.target.value;
    setVolume(document.getElementById('click-sound'), soundState.soundVolume);
    setVolume(document.getElementById('move-sound'), soundState.soundVolume);
    setVolume(document.getElementById('win-sound'), soundState.soundVolume);
    setVolume(document.getElementById('lose-sound'), soundState.soundVolume);

    //Синхронизация
    const otherSoundVolumeSlider = document.getElementById('sound-volume' + (event.target.id === 'sound-volume' ? '2' : ''));
    if (otherSoundVolumeSlider) {
        otherSoundVolumeSlider.value = newVolume;
    }
}

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
        menuMusic.currentTime = 0; //0 не играет, 1 играет
    }
}

// Функция для воспроизведения музыки игры
function playGameMusic() {
    if (soundState.isMusicEnabled) {
        const gameMusic = document.getElementById('game-music');
        if (gameMusic) {
            gameMusic.currentTime = 0; // сбрасывает
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

    document.getElementById('close-rating-modal').addEventListener('click', () => {
    // Сбрасываем текущий блок при закрытии
    state.currentBlock = null;
    elements.ratingModal.classList.add('hidden');
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
    document.getElementById('music-volume').addEventListener('input', handleMusicVolumeChange);
    document.getElementById('sound-volume').addEventListener('input', handleSoundVolumeChange);
    document.getElementById('music-volume2').addEventListener('input', handleMusicVolumeChange);
    document.getElementById('sound-volume2').addEventListener('input', handleSoundVolumeChange);
}

// Найдите элемент кнопки
const toggleStyleButton = document.getElementById('toggle-style-button');

// Функция для переключения стилей
function toggleStyles() {
    // Найдите текущий элемент <link>, который подключает CSS
    const styleLink = document.getElementById('dynamic-style');

    // Определите текущий файл стилей
    const currentStyle = styleLink.getAttribute('href');

    // Переключите на другой файл стилей
    if (currentStyle.includes('style1.css')) {
        styleLink.setAttribute('href', 'style2.css');
    } else {
        styleLink.setAttribute('href', 'style1.css');
    }
    playClickSound()
}

// Добавьте обработчик событий для кнопки
toggleStyleButton.addEventListener('click', toggleStyles);

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

    if (username.length > 30){
        return showError('register-error', "Username must be less than 30 characters.");
    }

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        if (response.status === 429) {
            return showError('login-error','Слишком много попыток. Попробуйте позже.');
        }

        const data = await response.json();

        if (data.success) {
            if (data.twoFactorRequired) {
                // Show 2FA input form
                showTwoFactorForm(data.userId);
            } else if (data.twoFactorSetupRequired) {
                // Show 2FA setup modal for users who need to set up 2FA
                state.currentUser = data.user;
                openTwoFactorSetupModal();
            } else {
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
            }
        } else {
            showError('login-error', 'Неправильный логин или пароль');
        }
    } catch (error) {
        showError('login-error', 'Network error. Please try again.');
    }
}

// Show 2FA input form
function showTwoFactorForm(userId) {
    // Hide login form
    elements.loginForm.classList.add('hidden');

    // Hide "CREATE ACCOUNT" button
    const createAccountBtn = document.getElementById('switch-to-register');
    if (createAccountBtn) {
        createAccountBtn.style.display = 'none';
    }

    // Create 2FA form container if not exists
    let twoFactorContainer = document.getElementById('two-factor-container');
    if (!twoFactorContainer) {
        twoFactorContainer = document.createElement('div');
        twoFactorContainer.id = 'two-factor-container';
        twoFactorContainer.innerHTML = `
            <h3>Two-Factor Authentication</h3>
            <p>Please enter the 6-digit code from Google Authenticator.</p>
            <input type="text" id="two-factor-code" maxlength="6" pattern="\\d{6}" placeholder="123456" />
            <br></br>
            <button id="two-factor-submit" style="padding: 10px 15px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; width:45%">Verify</button>
            <button id="two-factor-cancel" style="padding: 10px 15px; background-color: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; width:45%">Cancel</button>
            <div id="two-factor-error" class="error-message" style="display:none;color:red;margin-top:10px;"></div>
        `;
        elements.loginForm.parentNode.insertBefore(twoFactorContainer, elements.loginForm.nextSibling);

        document.getElementById('two-factor-submit').addEventListener('click', () => {
            verifyTwoFactorCode(userId);
        });

        document.getElementById('two-factor-cancel').addEventListener('click', () => {
            twoFactorContainer.remove();
            elements.loginForm.classList.remove('hidden');

            // Show "CREATE ACCOUNT" button again
            if (createAccountBtn) {
                createAccountBtn.style.display = 'block';
            }
        });
    } else {
        twoFactorContainer.style.display = 'block';
    }
}

// Verify 2FA code
async function verifyTwoFactorCode(userId) {
    const codeInput = document.getElementById('two-factor-code');
    const errorDiv = document.getElementById('two-factor-error');
    const token = codeInput.value.trim();

    if (!/^\d{6}$/.test(token)) {
        errorDiv.textContent = 'Please enter a valid 6-digit code.';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/2fa/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId, token })
        });

        const data = await response.json();

        if (data.success) {
            // Hide 2FA form
            const twoFactorContainer = document.getElementById('two-factor-container');
            if (twoFactorContainer) {
                twoFactorContainer.remove();
            }

            // Set current user and show main menu
            state.currentUser = data.user;
            elements.best.textContent = '0'; // Reset before loading
            document.querySelector('.form').classList.add('hidden');
            elements.mainMenu.classList.remove('hidden');

            // Load user stats
            await loadUserStats();
        } else {
            errorDiv.textContent = data.message || 'Invalid 2FA code.';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'Network error. Please try again.';
        errorDiv.style.display = 'block';
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

    if (formData.username.length > 30){
        return showError('register-error', "Username must be less than 30 characters.");
    }

    if (formData.password !== formData.cpassword) {
        return showError('register-error', 'Passwords do not match');
    }

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
        return showError('register-error', 'Password does not meet all requirements');
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

        if (!response.ok) { // Проверяем статус ответа
            throw new Error(data.message || 'Registration failed');
        }

        if (data.success) {
            alert('Registration successful! Please set up Two-Factor Authentication.');
            document.querySelector('.form-panel.two').classList.remove('active');
            document.querySelector('.form-panel.one').classList.remove('hidden');
            elements.registerForm.reset();

            // Automatically open 2FA setup modal after registration
            // Simulate user login state for 2FA setup
            state.currentUser = data.user || { id: data.userId || null };
            if (state.currentUser && state.currentUser.id) {
                openTwoFactorSetupModal();
            }
        } else {
            showError('register-error', data.message || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showError('register-error', error.message || 'Network error. Please try again.');
    }
}

function logout() {
    location.reload();
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
        const endpoint = `${API_BASE_URL}/leaderboard/${state.currentRatingMode}`;
        let queryParams = `page=${state.currentRatingPage}&limit=${state.ratingPerPage}`;
        
        if (state.currentRatingMode === 'blocks') {
            const selectedBlock = state.currentBlock || 8;
            queryParams = `block=${selectedBlock}&${queryParams}`;
        }

        const response = await fetch(`${endpoint}?${queryParams}`);
        const data = await response.json();

        if (data.success) {
            // Проверка на пустые данные
            if (data.data.length === 0) {
                // Сброс на первую страницу, если нет данных
                state.currentRatingPage = 1;
                
                // Показываем сообщение об отсутствии данных
                elements.ratingContent.innerHTML = `
                    <div class="no-results">
                        <p>No ${state.currentRatingMode} records found yet</p>
                        ${state.currentRatingMode === 'blocks' ? 
                           '<p>Be the first to complete blocks in speedrun mode!</p>' : ''}
                    </div>
                `;
                
                // Обновляем пагинацию с учетом отсутствия данных
                updatePaginationButtons({ total: 0 });
                return;
            }

            renderRatingData(data);
            updatePaginationButtons(data.meta);
            
            if (state.currentRatingMode === 'blocks') {
                addBlockSelector(data.meta?.current_block || state.currentBlock || 8);
            }
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
    
    // Проверка на отсутствие данных
    if (meta.total === 0) {
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        prevBtn.classList.add('disabled');
        nextBtn.classList.add('disabled');
        pageInfo.textContent = 'No records';
        return;
    }
    
    const totalPages = Math.ceil(meta.total / state.ratingPerPage);
    pageInfo.textContent = `Page ${state.currentRatingPage} of ${totalPages}`;
    
    prevBtn.disabled = state.currentRatingPage <= 1;
    nextBtn.disabled = state.currentRatingPage >= totalPages;

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
    elements.ratingContent.innerHTML = '';

    // Проверяем наличие данных
    const hasData = data.data && 
                   (Array.isArray(data.data) ? data.data.length > 0 : 
                   Object.keys(data.data).length > 0);

    if (!hasData) {
        // Для режима Block Times всегда показываем селектор, даже если нет данных
        if (state.currentRatingMode === 'blocks') {
            addBlockSelector(state.currentBlock || 8);
            
            elements.ratingContent.innerHTML += `
                <div class="no-results">
                    <p>No records found for block ${state.currentBlock || 8}</p>
                    <p>Be the first to complete this block in speedrun mode!</p>
                </div>
            `;
        } else {
            elements.ratingContent.innerHTML = `
                <div class="no-results">
                    <p>No ${state.currentRatingMode} records found yet</p>
                </div>
            `;
        }
        return;
    }

    let html = '';
    const isBlocksMode = state.currentRatingMode === 'blocks';
    
    if (isBlocksMode) {
        // Добавляем селектор блоков в начало
        addBlockSelector(state.currentBlock || data.meta?.current_block || 8);
        
        const blocksData = Array.isArray(data.data) ? data.data : Object.values(data.data);
        
        html = `
            <div class="rating-table-container">
                <table class="rating-table blocks-table">
                    <thead>
                        <tr>
                            <th width="15%">RANK</th>
                            <th width="35%">PLAYER</th>
                            <th width="20%">BLOCK</th>
                            <th width="30%">TIME</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        blocksData.forEach((item, index) => {
            const globalIndex = (state.currentRatingPage - 1) * state.ratingPerPage + index + 1;
            const isCurrentUser = state.currentUser && item.user_id === state.currentUser.id;
            const medal = state.currentRatingPage === 1 && index < 3 ? 
                ['🥇','🥈','🥉'][index] : '';
            
            html += `
                <tr class="block-${item.block_value}">
                    <td>${medal} ${globalIndex}</td>
                    <td class="player-name">
                        ${item.username}
                        ${isCurrentUser ? '<span class="you-badge"></span>' : ''}
                    </td>
                    <td>${item.block_value}</td>
                    <td>${formatTime(item.block_time)}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;
    } else {
        // Для Classic и Speedrun
        const columnTitle = state.currentRatingMode === 'classic' ? 'SCORE' : 'TIME';
        const tableData = Array.isArray(data.data) ? data.data : Object.values(data.data);
        
        html = `
            <div class="rating-table-container">
                <table class="rating-table">
                    <thead>
                        <tr>
                            <th width="15%">RANK</th>
                            <th width="40%">PLAYER</th>
                            <th width="45%">${columnTitle}</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        tableData.forEach((item, index) => {
            const globalIndex = (state.currentRatingPage - 1) * state.ratingPerPage + index + 1;
            const isCurrentUser = state.currentUser && item.user_id === state.currentUser.id;
            const medal = state.currentRatingPage === 1 && index < 3 ? 
                ['🥇','🥈','🥉'][index] : '';
            
            html += `
                <tr>
                    <td>${medal} ${globalIndex}</td>
                    <td>${item.username}${isCurrentUser ? ' <span class="you-badge">(YOU)</span>' : ''}</td>
                    <td>
                        ${state.currentRatingMode === 'classic' 
                            ? item.score.toLocaleString() 
                            : formatTime(item.time)}
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;
    }

    html += `
        <div class="table-footer">
            Showing ${Array.isArray(data.data) ? data.data.length : Object.keys(data.data).length} 
            of ${data.meta?.total || 'unknown'} records
            ${isBlocksMode ? `for block ${state.currentBlock || 8}` : ''}
        </div>
    `;

    elements.ratingContent.innerHTML = html;

    // Принудительное применение стилей для текущего пользователя
    setTimeout(() => {
        if (state.currentUser) {
            document.querySelectorAll('.rating-table tr').forEach(row => {
                if (row.textContent.includes(state.currentUser.username)) {
                    // Применяем стили к строке
                    row.style.backgroundColor = '#edc22e';
                    row.style.color = '#776e65';
                    row.style.fontWeight = 'bold';
                    
                    // Применяем стили ко всем ячейкам в строке
                    Array.from(row.cells).forEach(cell => {
                        cell.style.backgroundColor = '#edc22e';
                        cell.style.color = '#776e65';
                        cell.style.fontWeight = 'bold';
                    });

                    // Стили для бейджа (YOU)
                    const youBadge = row.querySelector('.you-badge');
                    if (youBadge) {
                        youBadge.style.color = '#776e65';
                        youBadge.style.fontWeight = 'bold';
                    }
                }
            });
        }
    }, 100);
}

// Показать ошибку

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        
        // Автоматическое скрытие через 5 секунд
        setTimeout(() => {
            element.style.display = 'none';
        }, 10000);
    }
}

// Функция для Пароля

function togglePassword(inputId, icon) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        icon.textContent = '🙈';
        icon.style.color = '#FFFFFF';
    } else {
        input.type = 'password';
        icon.textContent = '👁️';
        icon.style.color = 'rgba(255, 255, 255, 0.7)';
    }
}

function showGameOverModal(isWin, score) {
    const modal = document.createElement('div');
    modal.className = `game-over-modal classic-result ${isWin ? 'win' : 'lose'}`;
    
    const isNewRecord = state.currentUser ? score === state.bestScore : score === parseInt(localStorage.getItem('bestScore'));
    
    modal.innerHTML = `
        <div class="modal-content">
            <h2>${isWin ? 'You Won! 🎉' : 'Game Over!'}</h2>
            
            <div class="score-display your-score ${isNewRecord ? 'new-record' : ''}">
                <span class="score-label">Your Score</span>
                <span class="score-value">${score.toLocaleString()}</span>
                <div class="score-decoration top-left"></div>
                <div class="score-decoration bottom-right"></div>
                ${isNewRecord ? '<div class="record-badge">New Record!</div>' : ''}
            </div>
            
            <div class="score-display best-score">
                <span class="score-label">${state.currentUser ? 'Best Score' : 'Local Best'}</span>
                <span class="score-value">${state.bestScore ? state.bestScore.toLocaleString() : 'N/A'}</span>
            </div>
            
            ${isWin ? '<div class="celebration-emoji">🏆</div>' : ''}
            
            <div class="modal-buttons">
                <button id="restart-game">Play Again</button>
                <button id="return-to-menu">Main Menu</button>
                ${state.currentUser ? '<button id="view-best-results">My Stats</button>' : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Обработчики событий
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

function showSpeedrunResultModal(isWin, time) {
    const modal = document.createElement('div');
    modal.className = `game-over-modal speedrun-result ${isWin ? 'win' : 'lose'}`;
    
    const bestTime = state.currentUser ? (state.bestBlockTimes['2048']?.formatted || 'N/A') : 'N/A';
    const isNewRecord = isWin && state.currentUser && (!state.bestBlockTimes['2048'] || 
        (Date.now() - state.startTime) < (state.bestBlockTimes['2048']?.time || Infinity));
    
    modal.innerHTML = `
        <div class="modal-content">
            <h2>${isWin ? 'Victory! ⚡' : 'Time Over!'}</h2>
            
            <div class="score-display your-score ${isNewRecord ? 'new-record' : ''}">
                <span class="score-label">Your Time</span>
                <span class="score-value">${time}</span>
                <div class="score-decoration top-left"></div>
                <div class="score-decoration bottom-right"></div>
                ${isNewRecord ? '<div class="record-badge">New Best Time!</div>' : ''}
            </div>
            
            ${state.currentUser ? `
            <div class="score-display best-score">
                <span class="score-label">Best Time</span>
                <span class="score-value">${bestTime}</span>
            </div>
            ` : ''}
            
            <div class="progress-section">
            <h3>Your Progress</h3>
            ${generateBlockTimesHTML()}
        </div>
            
            ${isWin ? '<div class="celebration-emoji">🚀</div>' : ''}
            
            <div class="modal-buttons">
                <button id="restart-game">Try Again</button>
                <button id="return-to-menu">Main Menu</button>
                ${state.currentUser ? '<button id="view-best-results">My Stats</button>' : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Обработчики событий
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
        return '<div class="no-blocks">No blocks reached yet</div>';
    }

    const blocks = [8, 16, 32, 64, 128, 256, 512, 1024, 2048];
    let html = '<div class="progress-grid">';
    
    blocks.forEach(block => {
        if (state.blockTimes[block]) {
            const time = formatTime(state.blockTimes[block]);
            const isMilestone = block === 2048;
            
            html += `
                <div class="progress-block ${isMilestone ? 'milestone' : ''} tile-color-${block}">
                    <div class="block-value">${block}</div>
                    <div class="block-time">${time}</div>
                    ${isMilestone ? '<div class="milestone-badge">★</div>' : ''}
                </div>
            `;
        }
    });
    
    return html + '</div>';
}

function validatePassword(password) {
    const validations = {
        length: password.length >= 8,
        upperCase: /[A-Z]/.test(password),
        lowerCase: /[a-z]/.test(password),
        specialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        noSequences: !/(abc|123|qwerty|asdf|password)/i.test(password),
        noRepeatingChars: !/(.)\1{2,}/.test(password), // Проверка на 3+ повторяющихся символов
        noKeyboardSequences: !/(qwerty|asdfgh|zxcvbn|123456|987654)/i.test(password),
        noConsecutiveChars: !/([a-zA-Z0-9])\1{2,}/.test(password), // Проверка на 3+ одинаковых подряд символов
        noSimpleSequences: !/(0123|1234|2345|3456|4567|5678|6789|7890|abcd|bcde|cdef|defg|efgh|fghi|ghij|hijk|ijkl|jklm|klmn|lmno|mnop|nopq|opqr|pqrs|qrst|rstu|stuv|tuvw|uvwx|vwxy|wxyz)/i.test(password)
    };

    return {
        isValid: Object.values(validations).every(v => v),
        details: validations // Можно вернуть детали проверок для отображения пользователю
    };
}

// Инициализация игры при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    initGame();
    if (soundState.isMusicEnabled) {
        playMenuMusic(); // Запуск музыки главного меню при загрузке
    }
});

class FallingTiles {
  constructor() {
    this.container = document.getElementById('falling-tiles-container');
    this.tiles = [];
    this.mergeQueue = [];
    this.colors = {
      2: '#eee4da', 4: '#ede0c8', 8: '#f2b179',
      16: '#f59563', 32: '#f67c5f', 64: '#f65e3b',
      128: '#edcf72', 256: '#edcc61', 512: '#edc850',
      1024: '#edc53f', 2048: '#edc22e',
      'win': '#9c27b0', // Фиолетовый для победы
      'lose': '#00bcd4'  // Голубой для поражения
    };
    
    // Вероятности появления (увеличена вероятность крупных плиток)
    this.probabilities = {
      2: 0.25, 4: 0.2, 8: 0.15, 16: 0.12, 32: 0.1,
      64: 0.08, 128: 0.05, 256: 0.03, 512: 0.02,
      1024: 0.01, 2048: 0.005,
      'win': 0.02, 'lose': 0.02
    };
    
    this.init();
    this.startAnimation();
    this.setupCollisionDetection();
  }

  init() {
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
      overflow: hidden;
      pointer-events: none;
      opacity: 0.2;
    `;
  }

  getRandomTileType() {
    const random = Math.random();
    let cumulative = 0;
    
    for (const [type, prob] of Object.entries(this.probabilities)) {
      cumulative += prob;
      if (random <= cumulative) return type;
    }
    
    return '2'; // fallback
  }

  createTile() {
    const type = this.getRandomTileType();
    // Увеличенные размеры плиток
    const size = type === 'win' ? 120 : 
                type === 'lose' ? 140 : 
                60 + (parseInt(type) || 0) / 10; // Базовый размер увеличен
    
    const tile = document.createElement('div');
    tile.className = 'falling-tile';
    tile.dataset.type = type;
    tile.dataset.value = type;
    tile.innerHTML = type;
    
    const animationDuration = 6 + Math.random() * 10; // Более быстрое падение
    
    tile.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      background: ${this.colors[type]};
      color: ${type === 'win' ? '#fff' : 
              type === 'lose' ? '#fff' : 
              parseInt(type) > 4 ? '#f9f6f2' : '#776e65'};
      font-size: ${size/2}px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      left: ${Math.random() * 100}%;
      top: -${size}px;
      animation: fall ${animationDuration}s linear forwards;
      transform: rotate(${Math.random() * 20 - 10}deg);
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
      will-change: transform;
      z-index: ${type === 'win' ? 10 : 
                type === 'lose' ? 11 : 
                parseInt(type) || 1};
    `;

    this.container.appendChild(tile);
    const tileObj = {
      element: tile,
      type: type,
      x: parseFloat(tile.style.left),
      y: -size,
      width: size,
      height: size,
      merged: false,
      animationDuration: animationDuration
    };
    
    tile.addEventListener('animationend', () => {
      this.handleTileLanded(tileObj);
    });
    
    this.tiles.push(tileObj);
    return tileObj;
  }

  handleTileLanded(tile) {
    tile.element.remove();
    this.tiles = this.tiles.filter(t => t !== tile);
    this.createTile();
  }

  setupCollisionDetection() {
    setInterval(() => {
      this.checkCollisions();
      this.processMergeQueue();
    }, 100);
  }

  checkCollisions() {
    for (let i = 0; i < this.tiles.length; i++) {
      for (let j = i + 1; j < this.tiles.length; j++) {
        const tile1 = this.tiles[i];
        const tile2 = this.tiles[j];
        
        if (tile1.merged || tile2.merged) continue;
        
        if (this.isColliding(tile1, tile2)) {
          this.handleCollision(tile1, tile2);
        }
      }
    }
  }

  isColliding(tile1, tile2) {
    const rect1 = tile1.element.getBoundingClientRect();
    const rect2 = tile2.element.getBoundingClientRect();
    
    return !(
      rect1.right < rect2.left || 
      rect1.left > rect2.right || 
      rect1.bottom < rect2.top || 
      rect1.top > rect2.bottom
    );
  }

  handleCollision(tile1, tile2) {
    if (tile1.type === 'win' || tile1.type === 'lose' ||
        tile2.type === 'win' || tile2.type === 'lose') {
      return;
    }
    
    if (tile1.type === tile2.type) {
      tile1.merged = true;
      tile2.merged = true;
      this.mergeQueue.push({ tile1, tile2 });
    }
  }

  processMergeQueue() {
    while (this.mergeQueue.length > 0) {
      const { tile1, tile2 } = this.mergeQueue.pop();
      
      tile1.element.style.transition = 'all 0.3s ease-out';
      tile2.element.style.transition = 'all 0.3s ease-out';
      
      const centerX = (tile1.x + tile2.x) / 2;
      const centerY = (tile1.y + tile2.y) / 2;
      
      tile1.element.style.left = `${centerX}%`;
      tile1.element.style.top = `${centerY}px`;
      tile2.element.style.left = `${centerX}%`;
      tile2.element.style.top = `${centerY}px`;
      
      setTimeout(() => {
        this.mergeTiles(tile1, tile2);
      }, 300);
    }
  }

  mergeTiles(tile1, tile2) {
    const newValue = parseInt(tile1.type) * 2;
    
    tile1.element.remove();
    tile2.element.remove();
    this.tiles = this.tiles.filter(t => t !== tile1 && t !== tile2);
    
    if (newValue <= 2048) {
      const newTile = document.createElement('div');
      newTile.className = 'falling-tile merged-tile';
      newTile.dataset.type = newValue;
      newTile.dataset.value = newValue;
      newTile.innerHTML = newValue;
      
      const size = 60 + newValue / 10; // Увеличенный размер
      const centerX = (tile1.x + tile2.x) / 2;
      const animationDuration = 6 + Math.random() * 10;
      
      newTile.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: ${this.colors[newValue]};
        color: ${newValue > 4 ? '#f9f6f2' : '#776e65'};
        font-size: ${size/2}px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        left: ${centerX}%;
        top: ${tile1.y}px;
        animation: fall ${animationDuration}s linear forwards;
        transform: scale(0);
        box-shadow: 0 0 25px rgba(0,0,0,0.3);
        z-index: ${newValue};
      `;
      
      setTimeout(() => {
        newTile.style.transform = 'scale(1) rotate(0deg)';
      }, 10);
      
      this.container.appendChild(newTile);
      const tileObj = {
        element: newTile,
        type: newValue.toString(),
        x: centerX,
        y: tile1.y,
        width: size,
        height: size,
        merged: false,
        animationDuration: animationDuration
      };
      
      newTile.addEventListener('animationend', () => {
        this.handleTileLanded(tileObj);
      });
      
      this.tiles.push(tileObj);
    }
  }

  startAnimation() {
    // Создаем больше плиток при старте
    for (let i = 0; i < 15; i++) { // Было 10, стало 25
      setTimeout(() => this.createTile(), i * 200); // Уменьшена задержка
    }
        
    // Чаще создаем новые плитки
    this.interval = setInterval(() => {
      if (this.tiles.length < 35) { // Было 20, стало 50
        this.createTile();
      }
    }, 600); // Было 1000, стало 400
  }
}

// Инициализация
window.addEventListener('load', () => {
  if (window.innerWidth > 768) {
    new FallingTiles();
  }
});