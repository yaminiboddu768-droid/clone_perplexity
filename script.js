document.addEventListener('DOMContentLoaded', () => {
    // Lucide Icons initialization
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Theme Toggle Logic
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');

    const savedTheme = localStorage.getItem('theme') || 'light-mode';
    body.className = savedTheme;
    updateThemeIcons(savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = body.className;
        const newTheme = currentTheme === 'light-mode' ? 'dark-mode' : 'light-mode';
        body.className = newTheme;
        localStorage.setItem('theme', newTheme);
        updateThemeIcons(newTheme);
    });

    function updateThemeIcons(theme) {
        if (theme === 'dark-mode') {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        } else {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        }
    }

    // Chat Session Management
    const chatMessages = document.getElementById('chat-messages');
    const suggestionsArea = document.getElementById('suggestions-area');
    const heroSection = document.querySelector('.hero');
    const searchInput = document.getElementById('main-search');
    const sendBtn = document.querySelector('.send-btn');
    const newThreadBtn = document.getElementById('new-thread-btn');
    const recentThreadsList = document.querySelector('.recent-threads');

    let currentChatId = null;
    let chats = JSON.parse(localStorage.getItem('synapse_chats')) || {};

    // Initial render of history in sidebar
    renderRecentSidebar();

    function renderRecentSidebar() {
        const list = recentThreadsList.querySelector('.recent-label').nextElementSibling;
        const chatIds = Object.keys(chats).sort((a,b) => chats[b].timestamp - chats[a].timestamp);
        
        if (chatIds.length === 0) {
            list.innerHTML = '<p class="empty-state">Recent and active threads will appear here.</p>';
        } else {
            list.innerHTML = '';
            chatIds.slice(0, 5).forEach(id => {
                const item = document.createElement('div');
                item.className = 'nav-item history-item';
                item.style.fontSize = '12px';
                item.style.padding = '8px 12px';
                item.innerHTML = `<i data-lucide="message-square" style="width:14px;height:14px"></i> <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${chats[id].title}</span>`;
                item.onclick = () => loadChat(id);
                list.appendChild(item);
            });
            lucide.createIcons();
        }
    }

    function createNewChat(firstQuery) {
        const id = Date.now().toString();
        chats[id] = {
            id: id,
            title: firstQuery.substring(0, 30) + (firstQuery.length > 30 ? '...' : ''),
            messages: [],
            timestamp: Date.now()
        };
        currentChatId = id;
        return id;
    }

    function loadChat(id) {
        currentChatId = id;
        const chat = chats[id];
        chatMessages.innerHTML = '';
        if (heroSection) heroSection.style.justifyContent = 'flex-start';
        if (suggestionsArea) suggestionsArea.style.display = 'none';
        
        chat.messages.forEach(msg => {
            appendMessageToUI(msg.role, msg.content, false);
        });
    }

    function resetChat() {
        currentChatId = null;
        chatMessages.innerHTML = '';
        if (heroSection) heroSection.style.justifyContent = 'center';
        if (suggestionsArea) suggestionsArea.style.display = 'block';
        searchInput.value = '';
        searchInput.style.height = 'auto';
        sendBtn.classList.remove('active');
        sendBtn.disabled = true;
    }

    newThreadBtn.addEventListener('click', resetChat);

    function saveCurrentChat() {
        if (currentChatId) {
            chats[currentChatId].timestamp = Date.now();
            localStorage.setItem('synapse_chats', JSON.stringify(chats));
            renderRecentSidebar();
        }
    }

    function appendMessageToUI(role, content, isNew = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        const label = role === 'user' ? 'You' : 'SynapseAI';
        const icon = role === 'user' ? 'user' : 'sparkle';
        
        messageDiv.innerHTML = `
            <div class="message-label"><i data-lucide="${icon}"></i> ${label}</div>
            <div class="message-content">${content}</div>
        `;
        chatMessages.appendChild(messageDiv);
        if (window.lucide) lucide.createIcons();
        chatMessages.scrollTop = chatMessages.scrollHeight;

        if (isNew && currentChatId) {
            chats[currentChatId].messages.push({ role, content });
            saveCurrentChat();
        }
    }

    // Dropdown Logic
    const dropdowns = {
        'focus-btn': 'focus-dropdown',
        'computer-btn': 'computer-dropdown',
        'model-btn': 'model-dropdown'
    };

    Object.keys(dropdowns).forEach(btnId => {
        const btn = document.getElementById(btnId);
        const menu = document.getElementById(dropdowns[btnId]);

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close all other dropdowns
            Object.values(dropdowns).forEach(mId => {
                if (mId !== dropdowns[btnId]) document.getElementById(mId).classList.remove('show');
            });
            menu.classList.toggle('show');
        });

        menu.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                const val = item.getAttribute('data-value');
                const btnText = btn.querySelector('.btn-text');
                btnText.textContent = val;
                
                menu.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                menu.classList.remove('show');
            });
        });
    });

    document.addEventListener('click', () => {
        Object.values(dropdowns).forEach(mId => document.getElementById(mId).classList.remove('show'));
    });

    // Voice Input Logic (Microphone)
    const micBtn = document.getElementById('mic-btn');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;

        recognition.onstart = () => {
            micBtn.classList.add('listening');
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            searchInput.value += (searchInput.value ? ' ' : '') + transcript;
            searchInput.dispatchEvent(new Event('input'));
        };

        recognition.onend = () => {
            micBtn.classList.remove('listening');
        };

        recognition.onerror = () => {
            micBtn.classList.remove('listening');
        };

        micBtn.addEventListener('click', () => {
            if (micBtn.classList.contains('listening')) {
                recognition.stop();
            } else {
                recognition.start();
            }
        });
    } else {
        micBtn.title = "Speech Recognition not supported in this browser";
        micBtn.style.opacity = '0.5';
        micBtn.style.cursor = 'not-allowed';
    }

    // Search & Chat Logic
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            searchInput.style.height = 'auto';
            searchInput.style.height = (searchInput.scrollHeight) + 'px';
            if (searchInput.value.trim().length > 0) {
                sendBtn.classList.add('active');
                sendBtn.disabled = false;
            } else {
                sendBtn.classList.remove('active');
                sendBtn.disabled = true;
            }
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleChat();
            }
        });
    }

    if (sendBtn) {
        sendBtn.addEventListener('click', handleChat);
    }

    // File Upload Logic
    const fileInput = document.getElementById('file-input');
    const attachBtn = document.getElementById('attach-btn');
    const fileBadge = document.getElementById('file-badge');
    const fileNameSpan = document.getElementById('file-name');
    const removeFileBtn = document.getElementById('remove-file');
    let currentFileId = null;

    if (attachBtn) {
        attachBtn.addEventListener('click', () => fileInput.click());
    }

    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);

            try {
                attachBtn.style.opacity = '0.5';
                const response = await fetch('http://localhost:5000/api/upload', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();

                if (data.file_id) {
                    currentFileId = data.file_id;
                    fileNameSpan.textContent = file.name;
                    fileBadge.style.display = 'flex';
                    
                    // Update icon based on file type
                    const iconElement = fileBadge.querySelector('i');
                    if (file.type.startsWith('image/')) {
                        iconElement.setAttribute('data-lucide', 'image');
                    } else if (file.type.startsWith('video/')) {
                        iconElement.setAttribute('data-lucide', 'video');
                    } else if (file.name.endsWith('.csv')) {
                        iconElement.setAttribute('data-lucide', 'table');
                    } else {
                        iconElement.setAttribute('data-lucide', 'file-text');
                    }
                    if (window.lucide) lucide.createIcons();
                } else {
                    alert(data.error || 'Upload failed');
                }
            } catch (err) {
                alert('Connection error with backend.');
            } finally {
                attachBtn.style.opacity = '1';
                fileInput.value = '';
            }
        });
    }

    if (removeFileBtn) {
        removeFileBtn.addEventListener('click', () => {
            currentFileId = null;
            fileBadge.style.display = 'none';
        });
    }

    async function handleChat() {
        const query = searchInput.value.trim();
        if (!query) return;

        if (!currentChatId) {
            createNewChat(query);
            renderRecentSidebar();
        }

        searchInput.value = '';
        searchInput.style.height = 'auto';
        sendBtn.classList.remove('active');
        sendBtn.disabled = true;
        
        if (suggestionsArea) suggestionsArea.style.display = 'none';
        if (heroSection) heroSection.style.justifyContent = 'flex-start';

        appendMessageToUI('user', query);

        const aiMessageDiv = document.createElement('div');
        aiMessageDiv.className = 'message ai';
        aiMessageDiv.innerHTML = `
            <div class="message-label"><i data-lucide="sparkles"></i> SynapseAI</div>
            <div class="message-content"></div>
        `;
        chatMessages.appendChild(aiMessageDiv);
        const aiContentDiv = aiMessageDiv.querySelector('.message-content');
        if (window.lucide) lucide.createIcons();

        try {
            const response = await fetch('http://localhost:5000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    messages: chats[currentChatId].messages,
                    file_id: currentFileId // Send the attached file ID
                })
            });

            if (!response.ok) throw new Error('API Error');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let aiResponse = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                aiResponse += chunk;
                aiContentDiv.textContent = aiResponse;
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
            // Save final AI response to history
            chats[currentChatId].messages.push({ role: 'assistant', content: aiResponse });
            saveCurrentChat();
        } catch (err) {
            aiContentDiv.textContent = 'Error: Make sure the Flask server is running on http://localhost:5000';
            aiContentDiv.style.color = '#ff4444';
        }
    }

    // Suggestion Tabs & Category Prompts
    const categoryPrompts = {
        'Organize my life': [
            'Create a budget tracker from my spending',
            'Sort my tasks and prioritize this week',
            'Build a personal CRM to track my network',
            'Triage my inbox and draft responses',
            'Prepare me for an upcoming meeting'
        ],
        'Help me learn': [
            'Explain quantum computing in simple terms',
            'Outline a 30-day plan to learn Spanish',
            'Summarize the key events of the Industrial Revolution',
            'Explain the concept of neural networks',
            'Teach me how to play chess'
        ],
        'Create a prototype': [
            'Write a simple todo app in React',
            'Create a Python script for web scraping',
            'Design a login page with Tailwind CSS',
            'Build a basic weather app with an API',
            'Generate a shell script to automate backups'
        ],
        'Build a business': [
            'Write a one-page business plan for a cafe',
            'Analyze market trends for sustainable clothing',
            'Develop a social media strategy for a startup',
             'Compare different e-commerce platforms',
            'Outline steps for a successful product launch'
        ],
        'Compare': [
            'Compare iPhone 15 Pro vs Samsung S24 Ultra',
            'Compare React vs Vue for a small project',
            'Compare electric vs hybrid cars for long commutes',
            'Compare remote work vs office work productivity',
            'Compare different investment options for beginners'
        ],
        'Summarize': [
            'Summarize the latest news on climate change',
            'Summarize the plot of the latest blockbuster movie',
            'Summarize a long article about artificial intelligence',
            'Summarize the key points of a business proposal',
            'Summarize the benefits of a mediterranean diet'
        ]
    };

    const tabs = document.querySelectorAll('.tab');
    const suggestionList = document.querySelector('.suggestion-list');

    function updateSuggestions(category) {
        const prompts = categoryPrompts[category];
        if (!prompts) return;

        suggestionList.innerHTML = '';
        prompts.forEach(prompt => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = '#';
            a.textContent = prompt;
            a.onclick = (e) => {
                e.preventDefault();
                searchInput.value = prompt;
                searchInput.dispatchEvent(new Event('input'));
            };
            li.appendChild(a);
            suggestionList.appendChild(li);
        });
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const category = tab.textContent.trim();
            updateSuggestions(category);
        });
    });

    // View Switching Logic
    const viewSections = document.querySelectorAll('.view-section');
    const navItems = document.querySelectorAll('.nav-item[data-view]');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetViewId = item.getAttribute('data-view');
            
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            viewSections.forEach(section => {
                section.style.display = section.id === targetViewId ? 'block' : 'none';
            });

            // Special handling for Discover and Finance
            if (targetViewId === 'discover-view') populateDiscover();
            if (targetViewId === 'finance-view') populateFinance();
        });
    });

    function populateDiscover() {
        const feed = document.getElementById('discover-feed');
        if (!feed || feed.children.length > 0) return;

        const articles = [
            { title: 'Jet fuel costs set to surge as India aligns prices...', meta: 'Published 25 minutes ago • 26 sources' },
            { title: 'APSEZ crosses 500 million tonnes cargo milestone', meta: '2 hours ago • 26 sources' },
            { title: 'China and Pakistan propose ceasefire as Chinese ships transit...', meta: '3 hours ago • 30 sources' },
            { title: 'India\'s top VCs shift to mid-stage deals as war clouds dim IPO exits', meta: '5 hours ago • 60 sources' }
        ];

        articles.forEach(art => {
            const card = document.createElement('div');
            card.className = 'article-card';
            card.innerHTML = `
                <div class="article-image"></div>
                <div class="article-content">
                    <div class="article-title">${art.title}</div>
                    <div class="article-meta">${art.meta}</div>
                </div>
            `;
            feed.appendChild(card);
        });
    }

    function populateFinance() {
        const list = document.getElementById('finance-news-list');
        if (!list || list.children.length > 0) return;

        const news = [
            { title: 'Indian Markets Open Higher on Iran-War De-escalation Hopes', time: 'Updated 7 seconds ago' },
            { title: 'Sensex Suffers Worst Monthly Loss in Years — Down 11.5% Since War Outbreak', time: '1 hour ago' },
            { title: 'Record FII Outflows of Rs 1.8 Lakh Crore in FY24', time: '3 hours ago' },
            { title: 'Financials and Rate-Sensitive Stocks Among Top Losers on NSE', time: '5 hours ago' }
        ];

        news.forEach(item => {
            const newsItem = document.createElement('div');
            newsItem.className = 'news-item';
            newsItem.innerHTML = `
                <div class="news-title">${item.title}</div>
                <div class="news-time">${item.time}</div>
            `;
            list.appendChild(newsItem);
        });
    }

    // Sidebar Category Clicks (Mockup for Finance, Health, etc)
    const sidebarItems = document.querySelectorAll('.sidebar .nav-item');
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            const label = item.querySelector('span')?.textContent;
            if (label && label !== 'Search' && label !== 'History' && label !== 'Discover') {
                searchInput.value = `@${label.toLowerCase()} `;
                searchInput.focus();
                searchInput.dispatchEvent(new Event('input'));
            }
        });
    });

    // Quick Actions (Compare, Summarize, Categories)
    const quickActionArea = document.getElementById('quick-actions-area');
    if (quickActionArea) {
        const actionChips = quickActionArea.querySelectorAll('.action-chip');
        actionChips.forEach(chip => {
            chip.addEventListener('click', () => {
                const action = chip.getAttribute('data-action');
                const category = chip.getAttribute('data-category');
                const isMore = chip.classList.contains('more-btn');

                if (action) {
                    if (action === 'compare') {
                        searchInput.value = 'Compare: ';
                    } else if (action === 'summarize') {
                        searchInput.value = 'Summarize: ';
                    }
                    searchInput.focus();
                    searchInput.dispatchEvent(new Event('input'));
                } else if (category) {
                    if (category === 'history') {
                        // Special handling for history
                        const historyNav = document.querySelector('.nav-item i[data-lucide="history"]').parentElement;
                        historyNav.click();
                        // For demonstration, also pre-fill search
                        searchInput.value = 'Search history for ';
                    } else {
                        searchInput.value = `@${category} `;
                    }
                    searchInput.focus();
                    searchInput.dispatchEvent(new Event('input'));
                } else if (isMore) {
                    // Toggle a mockup of more options
                    alert('More options: Personalization, Labs, API, Help & Support');
                }
            });
        });
    }

    // Auth Card Logic
    const closeCard = document.querySelector('.close-card');
    const authCard = document.querySelector('.auth-card');
    if (closeCard && authCard) {
        closeCard.addEventListener('click', () => {
            authCard.style.display = 'none';
        });
    }
});
