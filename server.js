const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
const port = 5000;

// Middleware
app.use(bodyParser.json());
app.use(cors({
    origin: 'http://127.0.0.1:5500', // Укажите домен клиента
    methods: ['GET', 'POST'], // Разрешенные методы
    credentials: true // Если используются куки или авторизация
}));

// Подключение к базе данных MySQL
const db = mysql.createConnection({
    host: 'localhost', // Хост базы данных
    user: 'root', // Имя пользователя MySQL
    password: 'root', // Пароль MySQL
    database: 'mydatabase' // Название базы данных
});

db.connect((err) => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err);
    } else {
        console.log('Подключение к базе данных успешно установлено');
    }
});

// API для регистрации пользователя
app.post('/register', (req, res) => {
    const { username, password, email } = req.body;

    // Базовая проверка данных
    if (!username || !password || !email) {
        return res.status(400).json({ success: false, message: 'Все поля обязательны для заполнения' });
    }

    // Проверка email (базовая валидация)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: 'Некорректный email' });
    }

    // Проверка, существует ли пользователь с таким email или username
    const checkUserQuery = 'SELECT * FROM users WHERE email = ? OR username = ?';
    db.query(checkUserQuery, [email, username], (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Ошибка при проверке пользователя' });
        }

        if (results.length > 0) {
            return res.status(400).json({ success: false, message: 'Пользователь с таким email или username уже существует' });
        }

        // Хеширование пароля
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Ошибка при хешировании пароля' });
            }

            // Сохранение пользователя в базу данных
            const insertUserQuery = 'INSERT INTO users (username, password, email) VALUES (?, ?, ?)';
            db.query(insertUserQuery, [username, hash, email], (err, results) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Ошибка при регистрации пользователя' });
                }

                res.status(201).json({ success: true, message: 'Пользователь успешно зарегистрирован' });
            });
        });
    });
});

// API для входа пользователя
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Проверка данных пользователя
    const checkUserQuery = 'SELECT * FROM users WHERE username = ?';
    db.query(checkUserQuery, [username], async (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Ошибка при проверке пользователя' });
        }

        if (results.length === 0) {
            return res.status(401).json({ success: false, message: 'Неверное имя пользователя или пароль' });
        }

        const user = results[0];

        // Сравнение пароля с хешем из базы данных
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Неверное имя пользователя или пароль' });
        }

        // Успешная аутентификация
        res.status(200).json({ success: true, message: 'Вход выполнен успешно', user: { id: user.id, username: user.username } });
    });
});

// API для сохранения лучшего счёта
app.post('/save-score', (req, res) => {
    const { userId, score } = req.body;

    // Проверяем, является ли счёт лучше предыдущего
    const checkBestScoreQuery = 'SELECT best_score FROM users WHERE id = ?';
    db.query(checkBestScoreQuery, [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Ошибка при проверке счёта' });
        }

        const bestScore = results[0].best_score || 0;

        // Если текущий счёт лучше, обновляем его
        if (score > bestScore) {
            const updateScoreQuery = 'UPDATE users SET best_score = ? WHERE id = ?';
            db.query(updateScoreQuery, [score, userId], (err, results) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Ошибка при обновлении счёта' });
                }

                res.status(200).json({ success: true, message: 'Счёт успешно обновлён', bestScore: score });
            });
        } else {
            res.status(200).json({ success: true, message: 'Счёт не лучше предыдущего', bestScore });
        }
    });
});

// API для получения лучшего счёта
app.get('/best-score/:userId', (req, res) => {
    const userId = req.params.userId;

    const getBestScoreQuery = 'SELECT best_score FROM users WHERE id = ?';
    db.query(getBestScoreQuery, [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Ошибка при получении лучшего счёта' });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }

        const bestScore = results[0].best_score || 0;
        res.status(200).json({ success: true, bestScore });
    });
});

// API для сохранения лучшего времени и времени появления блоков в режиме Speedrun
// API для сохранения лучшего времени и времени появления блоков в режиме Speedrun
app.post('/save-speedrun-result', (req, res) => {
    const { userId, bestTime, bestBlockTimes } = req.body;

    // Проверяем, является ли время лучше предыдущего
    const checkBestTimeQuery = 'SELECT best_speedrun_time, best_block_times FROM users WHERE id = ?';
    db.query(checkBestTimeQuery, [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Ошибка при проверке лучшего времени' });
        }

        const currentBestTime = results[0].best_speedrun_time;
        const currentBlockTimes = JSON.parse(results[0].best_block_times || '{}');

        // Сравниваем время появления блоков
        const updatedBlockTimes = { ...currentBlockTimes };

        for (const [block, time] of Object.entries(bestBlockTimes)) {
            if (!currentBlockTimes[block] || time < currentBlockTimes[block]) {
                updatedBlockTimes[block] = time; // Обновляем время, если оно лучше
            }
        }

        // Если текущее время лучше или есть обновления в Block Times, обновляем данные
        if (currentBestTime === null || bestTime < currentBestTime || JSON.stringify(updatedBlockTimes) !== JSON.stringify(currentBlockTimes)) {
            const updateQuery = 'UPDATE users SET best_speedrun_time = ?, best_block_times = ? WHERE id = ?';
            db.query(updateQuery, [bestTime, JSON.stringify(updatedBlockTimes), userId], (err, results) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Ошибка при обновлении данных' });
                }

                res.status(200).json({ success: true, message: 'Данные успешно обновлены' });
            });
        } else {
            res.status(200).json({ success: true, message: 'Время не лучше предыдущего' });
        }
    });
});

// API для загрузки данных пользователя (лучший счёт, лучшее время и время появления блоков)
app.get('/user-results/:userId', (req, res) => {
    const userId = req.params.userId;

    const getUserResultsQuery = 'SELECT best_score, best_speedrun_time, best_block_times FROM users WHERE id = ?';
    db.query(getUserResultsQuery, [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Ошибка при загрузке данных пользователя' });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }

        const userData = results[0];
        res.status(200).json({ 
            success: true, 
            data: {
                best_score: userData.best_score || 0,
                best_speedrun_time: userData.best_speedrun_time !== null ? userData.best_speedrun_time : null,
                best_block_times: userData.best_block_times || '{}'
            }
        });
    });
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});