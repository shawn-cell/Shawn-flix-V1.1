const API_BASE = 'https://api.jikan.moe/v4';

const grid = document.getElementById('animeGrid');
const watchlistGrid = document.getElementById('watchlistGrid');
const top100Grid = document.getElementById('top100Grid');
const recentGrid = document.getElementById('recentGrid');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');

let currentGenre = 'all';

// =============================================
// THEME SWITCHER
// =============================================
document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.body.className = `theme-${this.dataset.theme}`;
        localStorage.setItem('shawnFlixTheme', this.dataset.theme);
    });
});

const savedTheme = localStorage.getItem('shawnFlixTheme') || 'dark';
document.body.className = `theme-${savedTheme}`;

// =============================================
// WATCHLIST (Local Storage)
// =============================================
function getWatchlist() {
    return JSON.parse(localStorage.getItem('shawnFlixWatchlist') || '[]');
}

function saveWatchlist(list) {
    localStorage.setItem('shawnFlixWatchlist', JSON.stringify(list));
}

function isInWatchlist(animeId) {
    return getWatchlist().some(item => item.id === animeId);
}

function getWatchlistItem(animeId) {
    return getWatchlist().find(item => item.id === animeId);
}

function addToWatchlist(anime) {
    const list = getWatchlist();
    if (!list.some(item => item.id === anime.mal_id)) {
        list.push({
            id: anime.mal_id,
            title: anime.title,
            image: anime.images?.jpg?.image_url || '',
            rating: 0,
            watched: false,
            dateAdded: new Date().toISOString()
        });
        saveWatchlist(list);
        renderWatchlist();
        fetchTrending();
    }
}

function removeFromWatchlist(animeId) {
    let list = getWatchlist();
    list = list.filter(item => item.id !== animeId);
    saveWatchlist(list);
    renderWatchlist();
    fetchTrending();
}

function rateAnime(animeId, rating) {
    const list = getWatchlist();
    const item = list.find(i => i.id === animeId);
    if (item) {
        item.rating = rating;
        saveWatchlist(list);
        renderWatchlist();
    }
}

function toggleWatched(animeId) {
    const list = getWatchlist();
    const item = list.find(i => i.id === animeId);
    if (item) {
        item.watched = !item.watched;
        if (item.watched) {
            updateWatchTime(12, 24);
        }
        saveWatchlist(list);
        renderWatchlist();
    }
}

// =============================================
// WATCH TIME TRACKER
// =============================================
function getWatchTime() {
    return JSON.parse(localStorage.getItem('shawnFlixWatchTime') || '{"total":0,"sessions":[]}');
}

function updateWatchTime(episodes = 1, minutes = 24) {
    const data = getWatchTime();
    data.total += minutes;
    data.sessions.push({
        date: new Date().toISOString(),
        episodes: episodes,
        minutes: minutes
    });
    localStorage.setItem('shawnFlixWatchTime', JSON.stringify(data));
}

function getTotalHours() {
    const data = getWatchTime();
    return (data.total / 60).toFixed(1);
}

// =============================================
// RECENTLY VIEWED
// =============================================
function addToRecent(anime) {
    let recent = JSON.parse(localStorage.getItem('shawnFlixRecent') || '[]');
    recent = recent.filter(a => a.id !== anime.mal_id);
    recent.unshift({
        id: anime.mal_id,
        title: anime.title,
        image: anime.images?.jpg?.image_url || '',
        timestamp: Date.now()
    });
    if (recent.length > 10) recent.pop();
    localStorage.setItem('shawnFlixRecent', JSON.stringify(recent));
    renderRecent();
}

function renderRecent() {
    const recent = JSON.parse(localStorage.getItem('shawnFlixRecent') || '[]');
    if (recent.length === 0) {
        recentGrid.innerHTML = `<div class="empty-msg" style="padding:20px;">No recent anime viewed yet.</div>`;
        return;
    }
    recentGrid.innerHTML = recent.map(item => `
        <div class="anime-card" onclick="searchAnime('${encodeURIComponent(item.title)}')" style="cursor:pointer;">
            <img src="${item.image || 'https://via.placeholder.com/200x280/1a1a24/666?text=No+Image'}" 
                 alt="${item.title}" 
                 loading="lazy"
                 onerror="this.src='https://via.placeholder.com/200x280/1a1a24/666?text=No+Image'" />
            <div class="info">
                <h3>${item.title}</h3>
                <div class="meta">
                    <span>🕐 ${new Date(item.timestamp).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// =============================================
// EXPORT / IMPORT / SHARE
// =============================================
function exportWatchlist() {
    const data = JSON.stringify(getWatchlist(), null, 2);
    const blob = new Blob([data], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `shawn-flix-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}

document.getElementById('importFile')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const data = JSON.parse(event.target.result);
                if (Array.isArray(data)) {
                    saveWatchlist(data);
                    renderWatchlist();
                    alert('✅ Watchlist imported successfully!');
                } else {
                    alert('❌ Invalid file format. Please upload a valid backup.');
                }
            } catch {
                alert('❌ Invalid file format.');
            }
        };
        reader.readAsText(file);
    }
});

function shareWatchlist() {
    const list = getWatchlist();
    if (list.length === 0) {
        alert('Add some anime to your watchlist first!');
        return;
    }
    
    const text = `📋 My Shawn-Flix Watchlist:\n\n` +
        list.map((item, i) => 
            `${i+1}. ${item.title} ${item.watched ? '✅' : '👀'} ${item.rating > 0 ? `⭐${item.rating}` : ''}`
        ).join('\n') +
        `\n\n📊 Total: ${list.length} anime | ⭐ Avg: ${(list.reduce((s, a) => s + a.rating, 0) / list.length).toFixed(1)}/5`;
    
    if (navigator.share) {
        navigator.share({
            title: 'My Shawn-Flix Watchlist',
            text: text
        });
    } else {
        navigator.clipboard.writeText(text).then(() => {
            alert('✅ Watchlist copied to clipboard! Share it anywhere!');
        }).catch(() => {
            prompt('Copy this text:', text);
        });
    }
}

// =============================================
// RENDER STARS
// =============================================
function renderStars(rating, animeId) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += `<span class="star" data-rating="${i}" data-id="${animeId}" style="cursor:pointer; ${i <= rating ? 'color:#f1c40f;' : 'color:#555;'}">★</span>`;
    }
    return stars;
}

// =============================================
// ACHIEVEMENTS
// =============================================
function getAchievements() {
    const list = getWatchlist();
    const achievements = [];
    
    if (list.length >= 5) achievements.push('🌟 Beginner Collector');
    if (list.length >= 20) achievements.push('🔥 Anime Enthusiast');
    if (list.length >= 50) achievements.push('👑 Anime Master');
    if (list.filter(a => a.watched).length >= 10) achievements.push('📺 Binge Watcher');
    if (list.some(a => a.rating === 5)) achievements.push('⭐ Perfectionist');
    if (list.length >= 100) achievements.push('🏆 Legendary Otaku');
    
    return achievements;
}

// =============================================
// RENDER WATCHLIST
// =============================================
function renderWatchlist() {
    const list = getWatchlist();
    
    // Update Stats
    document.getElementById('totalAnime').textContent = list.length;
    document.getElementById('watchedAnime').textContent = list.filter(a => a.watched).length;
    const avg = list.length > 0 ? (list.reduce((sum, a) => sum + a.rating, 0) / list.length).toFixed(1) : 0;
    document.getElementById('avgRating').textContent = avg;
    document.getElementById('totalHours').textContent = getTotalHours();
    
    // Achievements
    const badges = getAchievements();
    document.getElementById('badgeCount').textContent = badges.length;
    
    // Show badges
    const existingBadges = document.querySelector('.badges');
    if (badges.length > 0) {
        if (!existingBadges) {
            const badgeContainer = document.createElement('div');
            badgeContainer.className = 'badges';
            document.querySelector('#watchlistTab h2').after(badgeContainer);
        }
        document.querySelector('.badges').innerHTML = badges.map(b => `<span class="badge">🏅 ${b}</span>`).join('');
    } else if (existingBadges) {
        existingBadges.remove();
    }
    
    // Render cards
    if (list.length === 0) {
        watchlistGrid.innerHTML = `<div class="empty-msg">📭 Your watchlist is empty.<br>Browse anime and click "Add to Watchlist" to start tracking!</div>`;
        return;
    }

    watchlistGrid.innerHTML = list.map(item => `
        <div class="anime-card">
            <img src="${item.image || 'https://via.placeholder.com/200x280/1a1a24/666?text=No+Image'}" 
                 alt="${item.title}" 
                 loading="lazy"
                 onerror="this.src='https://via.placeholder.com/200x280/1a1a24/666?text=No+Image'" />
            <div class="info">
                <h3>${item.title}</h3>
                <div class="meta-wrap">
                    <div class="meta">
                        <span>${item.watched ? '✅ Watched' : '👀 Plan to watch'}</span>
                        <span>⭐ ${item.rating || 0}/5</span>
                    </div>
                    <div class="rating-stars">
                        ${renderStars(item.rating, item.id)}
                    </div>
                    <div class="action-buttons">
                        <button class="action-btn rate" onclick="toggleWatched(${item.id})">${item.watched ? '📺 Unmark' : '✅ Mark Watched'}</button>
                        <button class="action-btn remove" onclick="removeFromWatchlist(${item.id})">🗑️ Remove</button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.star').forEach(star => {
        star.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            const rating = parseInt(this.dataset.rating);
            rateAnime(id, rating);
        });
    });
}

// =============================================
// ANIME FACTS
// =============================================
const animeFacts = [
    'Naruto has over 720 episodes!',
    'One Piece has sold over 500 million copies worldwide!',
    'Demon Slayer became the highest-grossing anime film of all time!',
    'Dragon Ball Z started in 1989!',
    'Attack on Titan took 10 years to complete!',
    'Studio Ghibli was founded in 1985!',
    'The first anime film was released in 1917!',
    'Sword Art Online popularized the isekai genre!',
    'Anime makes up over 60% of all global animation!',
    'The most expensive anime ever made cost $30 million!',
    'Death Note was originally a manga in 2003!',
    'Fullmetal Alchemist has two different anime adaptations!'
];

let factIndex = 0;
function rotateFacts() {
    document.getElementById('factText').textContent = animeFacts[factIndex];
    factIndex = (factIndex + 1) % animeFacts.length;
}
rotateFacts();
setInterval(rotateFacts, 8000);

// =============================================
// SEASONAL COUNTDOWN
// =============================================
function updateSeasonCountdown() {
    const now = new Date();
    const nextSeason = new Date(2026, 5, 1);
    const diff = nextSeason - now;
    
    if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        document.getElementById('seasonCountdown').textContent = `⏳ ${days}d ${hours}h until next season!`;
    } else {
        document.getElementById('seasonCountdown').textContent = '🎉 New season is here!';
    }
}

updateSeasonCountdown();
setInterval(updateSeasonCountdown, 3600000);

// =============================================
// CHARACTER OF THE DAY
// =============================================
async function fetchCharacterOfTheDay() {
    const container = document.getElementById('characterDisplay');
    try {
        const res = await fetch(`${API_BASE}/top/anime?limit=50`);
        const data = await res.json();
        const randomAnime = data.data[Math.floor(Math.random() * data.data.length)];
        
        const charRes = await fetch(`${API_BASE}/anime/${randomAnime.mal_id}/characters`);
        const charData = await charRes.json();
        
        if (charData.data && charData.data.length > 0) {
            const char = charData.data[Math.floor(Math.random() * Math.min(charData.data.length, 10))];
            container.innerHTML = `
                <img src="${char.character.images?.jpg?.image_url || 'https://via.placeholder.com/150x150/1a1a24/666?text=No+Image'}" 
                     alt="${char.character.name}" 
                     loading="lazy"
                     onerror="this.src='https://via.placeholder.com/150x150/1a1a24/666?text=No+Image'" />
                <div class="character-info">
                    <h3>${char.character.name}</h3>
                    <div class="char-anime">From: ${randomAnime.title}</div>
                    <div class="char-desc">Role: ${char.role || 'Unknown'}</div>
                </div>
            `;
        } else {
            container.innerHTML = '<div class="error-msg">No character found today.</div>';
        }
    } catch (err) {
        container.innerHTML = '<div class="error-msg">Failed to load character.</div>';
    }
}

fetchCharacterOfTheDay();

// =============================================
// CHAT SYSTEM
// =============================================
const CHAT_KEY = 'shawnFlixChat';

function getChatMessages() {
    return JSON.parse(localStorage.getItem(CHAT_KEY) || '[]');
}

function saveChatMessages(messages) {
    localStorage.setItem(CHAT_KEY, JSON.stringify(messages));
    if (messages.length > 100) {
        messages = messages.slice(-100);
        saveChatMessages(messages);
    }
}

function getUsername() {
    let username = localStorage.getItem('shawnFlixUsername');
    if (!username) {
        username = `AnimeFan${Math.floor(Math.random() * 1000)}`;
        localStorage.setItem('shawnFlixUsername', username);
    }
    return username;
}

function renderChat() {
    const container = document.getElementById('chatMessages');
    const messages = getChatMessages();
    const username = getUsername();
    
    container.innerHTML = messages.map(msg => {
        if (msg.type === 'system') {
            return `<div class="chat-message system">${msg.text}</div>`;
        }
        const isSelf = msg.username === username;
        return `
            <div class="chat-message ${isSelf ? 'self' : 'other'}">
                ${!isSelf ? `<span class="chat-username">${msg.username}</span>` : ''}
                ${msg.text}
                <span class="chat-time">${new Date(msg.timestamp).toLocaleTimeString()}</span>
            </div>
        `;
    }).join('');
    
    container.scrollTop = container.scrollHeight;
    updateOnlineCount();
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;
    
    const messages = getChatMessages();
    messages.push({
        username: getUsername(),
        text: text,
        timestamp: Date.now(),
        type: 'message'
    });
    saveChatMessages(messages);
    input.value = '';
    renderChat();
}

function updateOnlineCount() {
    const messages = getChatMessages();
    const recent = messages.filter(m => Date.now() - m.timestamp < 300000);
    const uniqueUsers = new Set(recent.map(m => m.username));
    document.getElementById('chatOnline').textContent = `🟢 ${Math.max(1, uniqueUsers.size)} online`;
}

document.getElementById('chatSendBtn').addEventListener('click', sendChatMessage);
document.getElementById('chatInput').addEventListener('keyup', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

setInterval(renderChat, 30000);
renderChat();

// =============================================
// MUSIC PLAYER
// =============================================
const animeSongs = [
    '🎵 Unravel - Tokyo Ghoul',
    '🎵 Gurenge - Demon Slayer',
    '🎵 Tank! - Cowboy Bebop',
    '🎵 Fighting Dreamers - Naruto',
    '🎵 We Are! - One Piece',
    '🎵 Crossing Field - SAO',
    '🎵 Again - Fullmetal Alchemist',
    '🎵 Hikaru Nara - Your Lie in April',
    '🎵 Zankyo Sanka - Demon Slayer',
    '🎵 The Rumbling - Attack on Titan'
];

let currentSong = 0;
let isMusicVisible = false;

function toggleMusic() {
    const controls = document.querySelector('.music-controls');
    const toggle = document.querySelector('.music-toggle');
    isMusicVisible = !isMusicVisible;
    controls.style.display = isMusicVisible ? 'flex' : 'none';
    if (!isMusicVisible) {
        toggle.textContent = '🎵';
    }
}

function playMusic() {
    const toggle = document.querySelector('.music-toggle');
    toggle.textContent = '🔊';
    document.getElementById('musicTitle').textContent = `▶️ ${animeSongs[currentSong]}`;
}

function nextMusic() {
    currentSong = (currentSong + 1) % animeSongs.length;
    document.getElementById('musicTitle').textContent = `⏭️ ${animeSongs[currentSong]}`;
    playMusic();
}

// =============================================
// QUIZ
// =============================================
const quizQuestions = [
    {
        question: 'What anime is about a boy who becomes a ninja?',
        options: ['Naruto', 'One Piece', 'Dragon Ball', 'Bleach'],
        answer: 0
    },
    {
        question: 'Which anime features a world of Titans?',
        options: ['Demon Slayer', 'Jujutsu Kaisen', 'Attack on Titan', 'Fullmetal Alchemist'],
        answer: 2
    },
    {
        question: 'What is the name of the protagonist in Demon Slayer?',
        options: ['Goku', 'Naruto', 'Tanjiro', 'Luffy'],
        answer: 2
    },
    {
        question: 'Which anime has a character named "Monkey D. Luffy"?',
        options: ['Naruto', 'One Piece', 'Bleach', 'Hunter x Hunter'],
        answer: 1
    },
    {
        question: 'What is the main character\'s name in Sword Art Online?',
        options: ['Kirito', 'Asuna', 'Yui', 'Klein'],
        answer: 0
    },
    {
        question: 'Which anime is about alchemy and the Elric brothers?',
        options: ['Fairy Tail', 'Fullmetal Alchemist', 'Black Clover', 'Magi'],
        answer: 1
    },
    {
        question: 'What anime features "Soul Reapers" and "Hollows"?',
        options: ['Bleach', 'Naruto', 'One Piece', 'Dragon Ball'],
        answer: 0
    },
    {
        question: 'Which anime is set in a world of magic and wizards?',
        options: ['Fairy Tail', 'Attack on Titan', 'Death Note', 'Tokyo Ghoul'],
        answer: 0
    }
];

let quizIndex = 0;
let quizScore = 0;
let quizAnswered = false;

function startQuiz() {
    quizIndex = 0;
    quizScore = 0;
    quizAnswered = false;
    document.getElementById('quizScore').textContent = 'Score: 0';
    document.getElementById('quizScore').textContent = 'Score: 0';
    document.getElementById('quizStartBtn').textContent = '🔄 Next Question';
    showQuizQuestion();
}

function showQuizQuestion() {
    if (quizIndex >= quizQuestions.length) {
        document.getElementById('quizQuestion').textContent = `🎉 Quiz Complete! You scored ${quizScore}/${quizQuestions.length}`;
        document.getElementById('quizOptions').innerHTML = '';
        document.getElementById('quizStartBtn').textContent = '🔄 Play Again';
        document.getElementById('quizStartBtn').onclick = startQuiz;
        return;
    }
    
    const q = quizQuestions[quizIndex];
    document.getElementById('quizQuestion').textContent = `${quizIndex + 1}. ${q.question}`;
    document.getElementById('quizScore').textContent = `Score: ${quizScore}`;
    
    const optionsContainer = document.getElementById('quizOptions');
    optionsContainer.innerHTML = q.options.map((opt, idx) => `
        <button class="quiz-option" data-idx="${idx}" onclick="checkQuizAnswer(${idx})">${opt}</button>
    `).join('');
    
    quizAnswered = false;
    document.getElementById('quizStartBtn').textContent = '⏭️ Skip Question';
    document.getElementById('quizStartBtn').onclick = () => {
        quizIndex++;
        showQuizQuestion();
    };
}

function checkQuizAnswer(idx) {
    if (quizAnswered) return;
    quizAnswered = true;
    
    const q = quizQuestions[quizIndex];
    const options = document.querySelectorAll('.quiz-option');
    
    options.forEach((btn, i) => {
        btn.disabled = true;
        if (i === q.answer) btn.classList.add('correct');
        if (i === idx && idx !== q.answer) btn.classList.add('wrong');
    });
    
    if (idx === q.answer) {
        quizScore++;
        document.getElementById('quizScore').textContent = `Score: ${quizScore}`;
    }
    
    setTimeout(() => {
        quizIndex++;
        showQuizQuestion();
    }, 1500);
}

document.getElementById('quizStartBtn').addEventListener('click', startQuiz);

// =============================================
// KEYBOARD SHORTCUTS
// =============================================
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        const tabs = document.querySelectorAll('.tab-btn');
        if (e.key === '1') { e.preventDefault(); tabs[0]?.click(); }
        if (e.key === '2') { e.preventDefault(); tabs[1]?.click(); }
        if (e.key === '3') { e.preventDefault(); tabs[2]?.click(); }
        if (e.key === '4') { e.preventDefault(); tabs[3]?.click(); }
        if (e.key === '5') { e.preventDefault(); tabs[4]?.click(); }
        if (e.key === '/') { e.preventDefault(); document.getElementById('searchInput').focus(); }
    }
    if (e.key === 'Escape') {
        document.getElementById('searchInput').value = '';
        fetchTrending();
    }
});

console.log('⌨️ Shawn-Flix Shortcuts:');
console.log('Ctrl+1 → Browse | Ctrl+2 → Watchlist | Ctrl+3 → Top 100');
console.log('Ctrl+4 → Community | Ctrl+5 → Quiz | Ctrl+/ → Search | ESC → Clear');

// =============================================
// BACKGROUND PARTICLES
// =============================================
function initParticles() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);
    
    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.5;
            this.speedY = (Math.random() - 0.5) * 0.5;
            this.opacity = Math.random() * 0.5 + 0.2;
        }
        
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            if (this.x > canvas.width) this.x = 0;
            if (this.x < 0) this.x = canvas.width;
            if (this.y > canvas.height) this.y = 0;
            if (this.y < 0) this.y = canvas.height;
        }
        
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 107, 107, ${this.opacity})`;
            ctx.fill();
        }
    }
    
    for (let i = 0; i < 80; i++) {
        particles.push(new Particle());
    }
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        requestAnimationFrame(animate);
    }
    
    animate();
}

initParticles();

// =============================================
// API FETCHING
// =============================================
async function fetchTrending() {
    showLoading();
    try {
        const res = await fetch(`${API_BASE}/top/anime?limit=24`);
        const data = await res.json();
        renderAnime(data.data);
    } catch (err) {
        showError('Failed to load. Please refresh.');
    }
}

async function searchAnime(query) {
    if (!query.trim()) return fetchTrending();
    showLoading();
    try {
        const res = await fetch(`${API_BASE}/anime?q=${encodeURIComponent(query)}&limit=24`);
        const data = await res.json();
        if (data.data.length === 0) {
            showError('No anime found. Try another search.');
        } else {
            renderAnime(data.data);
        }
    } catch (err) {
        showError('Search failed. Please try again.');
    }
}

async function fetchGenreAnime(genreId) {
    showLoading();
    try {
        const res = await fetch(`${API_BASE}/anime?genres=${genreId}&limit=24`);
        const data = await res.json();
        if (data.data.length === 0) {
            showError('No anime found in this genre.');
        } else {
            renderAnime(data.data);
        }
    } catch (err) {
        showError('Failed to load genre.');
    }
}

async function fetchTop100() {
    top100Grid.innerHTML = `<div class="loading-spinner"></div>`;
    try {
        const res = await fetch(`${API_BASE}/top/anime?limit=100`);
        const data = await res.json();
        top100Grid.innerHTML = data.data.map((anime, index) => `
            <div class="anime-card rank-card">
                <div class="rank-number">#${index + 1}</div>
                <img src="${anime.images?.jpg?.image_url || 'https://via.placeholder.com/200x280/1a1a24/666?text=No+Image'}" 
                     alt="${anime.title}" 
                     loading="lazy"
                     onerror="this.src='https://via.placeholder.com/200x280/1a1a24/666?text=No+Image'" />
                <div class="info">
                    <h3>${anime.title}</h3>
                    <div class="meta">
                        <span>⭐ ${anime.score || 'N/A'}</span>
                        <span>${anime.year || 'TBA'}</span>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        top100Grid.innerHTML = `<div class="error-msg">Failed to load top 100.</div>`;
    }
}

// =============================================
// RENDER ANIME
// =============================================
function renderAnime(animeList) {
    if (!animeList || animeList.length === 0) {
        showError('No anime found.');
        return;
    }

    if (animeList.length > 0) {
        addToRecent(animeList[0]);
    }

    grid.innerHTML = animeList.map(anime => {
        const title = anime.title;
        const encodedTitle = encodeURIComponent(title);
        const inList = isInWatchlist(anime.mal_id);
        const listItem = getWatchlistItem(anime.mal_id);

        const watchLinks = `
            <a href="https://www.youtube.com/results?search_query=${encodedTitle}+anime+episode+1" target="_blank" class="watch-btn youtube">▶️ YouTube</a>
            <a href="https://hianime.to/search?keyword=${encodedTitle}" target="_blank" class="watch-btn hianime">🎬 HiAnime</a>
            <a href="https://anix.to/search?q=${encodedTitle}" target="_blank" class="watch-btn anix">🌀 AniX</a>
            <a href="https://zoro.to/search?keyword=${encodedTitle}" target="_blank" class="watch-btn zoro">⚔️ Zoro</a>
            <a href="https://9anime.to/search?keyword=${encodedTitle}" target="_blank" class="watch-btn nine">9️⃣ 9Anime</a>
            <a href="https://gogoanime.gg/search.html?keyword=${encodedTitle}" target="_blank" class="watch-btn gogo">🎞️ Gogo</a>
            <a href="https://animesuge.to/search?keyword=${encodedTitle}" target="_blank" class="watch-btn suge">🌸 Suge</a>
            <a href="https://kickassanime.am/search?q=${encodedTitle}" target="_blank" class="watch-btn kickass">👊 KickAss</a>
        `;

        const actionButtons = inList ? `
            <button class="action-btn remove" onclick="removeFromWatchlist(${anime.mal_id})">🗑️ Remove</button>
            <span style="color:#2ecc71; font-size:0.75rem;">⭐ ${listItem?.rating || 0}/5</span>
        ` : `
            <button class="action-btn add" onclick="addToWatchlist({mal_id:${anime.mal_id}, title:'${title.replace(/'/g, "\\'")}', images:{jpg:{image_url:'${anime.images?.jpg?.image_url || ''}'}}})">➕ Add to Watchlist</button>
        `;

        return `
            <div class="anime-card">
                <img src="${anime.images?.jpg?.image_url || 'https://via.placeholder.com/200x280/1a1a24/666?text=No+Image'}" 
                     alt="${title}" 
                     loading="lazy"
                     onerror="this.src='https://via.placeholder.com/200x280/1a1a24/666?text=No+Image'" />
                <div class="info">
                    <h3>${title}</h3>
                    <div class="meta-wrap">
                        <div class="meta">
                            <span>⭐ ${anime.score || 'N/A'}</span>
                            <span>${anime.year || 'TBA'}</span>
                        </div>
                        <div class="watch-buttons">
                            ${watchLinks}
                        </div>
                        <div class="action-buttons">
                            ${actionButtons}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// =============================================
// GENRE FILTERS
// =============================================
document.querySelectorAll('.genre-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentGenre = this.dataset.genre;
        if (currentGenre === 'all') {
            fetchTrending();
        } else {
            fetchGenreAnime(currentGenre);
        }
    });
});

// =============================================
// RANDOM BUTTON
// =============================================
document.getElementById('randomBtn').addEventListener('click', async function() {
    showLoading();
    try {
        const res = await fetch(`${API_BASE}/anime?page=${Math.floor(Math.random() * 50) + 1}`);
        const data = await res.json();
        if (data.data && data.data.length > 0) {
            const randomAnime = data.data[Math.floor(Math.random() * data.data.length)];
            renderAnime([randomAnime]);
        } else {
            showError('No anime found. Try again!');
        }
    } catch (err) {
        showError('Oops! Something went wrong.');
    }
});

// =============================================
// MOBILE SWIPE GESTURES
// =============================================
let touchStartX = 0;
let touchStartY = 0;
document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
});
document.addEventListener('touchend', e => {
    const diffX = touchStartX - e.changedTouches[0].screenX;
    const diffY = touchStartY - e.changedTouches[0].screenY;
    
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
        const current = document.querySelector('.tab-btn.active');
        const tabs = document.querySelectorAll('.tab-btn');
        const idx = Array.from(tabs).indexOf(current);
        const newIdx = diffX > 0 ? Math.min(idx + 1, tabs.length - 1) : Math.max(idx - 1, 0);
        if (newIdx !== idx) {
            tabs[newIdx].click();
        }
    }
});

// =============================================
// TAB SWITCHING
// =============================================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        const tabName = this.dataset.tab;
        document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
        
        if (tabName === 'browse') {
            document.getElementById('browseTab').classList.add('active');
        } else if (tabName === 'watchlist') {
            document.getElementById('watchlistTab').classList.add('active');
            renderWatchlist();
        } else if (tabName === 'top100') {
            document.getElementById('top100Tab').classList.add('active');
            fetchTop100();
        } else if (tabName === 'community') {
            document.getElementById('communityTab').classList.add('active');
            renderChat();
        } else if (tabName === 'quiz') {
            document.getElementById('quizTab').classList.add('active');
        }
    });
});

// =============================================
// EVENT LISTENERS
// =============================================
searchBtn.addEventListener('click', () => searchAnime(searchInput.value));
searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') searchAnime(searchInput.value);
});

// =============================================
// INIT
// =============================================
fetchTrending();
renderRecent();
renderWatchlist();
```
