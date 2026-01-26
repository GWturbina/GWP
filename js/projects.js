// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Projects Module - REDESIGNED
// Красивые квадратные карточки проектов
// С ПРОВЕРКОЙ РЕГИСТРАЦИИ v2.0
// Date: 2025-01-02
// ═══════════════════════════════════════════════════════════════════

const projectsModule = {
  // ═══════════════════════════════════════════════════════════════
  // СПИСОК ПРОЕКТОВ
  // ═══════════════════════════════════════════════════════════════
  projects: [
    {
      id: 'kardgift',
      name: 'KardGift',
      icon: 'CardGift.png',
      description: 'Платформа подарочных сертификатов',
      url: 'https://cgm-brown.vercel.app/dashboard.html',  // ✅ CardGift Dashboard
      status: 'active',                             // ✅ ИЗМЕНЕНО: development → active
      statusText: 'Активен',                        // ✅ ИЗМЕНЕНО
      releaseDate: 'Q1 2025',
      requiredLevel: 0  // ✅ ДОБАВЛЕНО: минимальный уровень (0 = только регистрация)
    },
    {
      id: 'globaltub',
      name: 'GlobalTub',
      icon: 'GlobalTub.png',
      description: 'Децентрализованная видео платформа',
      url: '#',
      status: 'development',
      statusText: 'В разработке',
      releaseDate: 'Q3 2025',
      requiredLevel: 1
    },
    {
      id: 'globalmarket',
      name: 'GlobalMarket',
      icon: 'GlobalMarket.png',
      description: 'P2P маркетплейс товаров и услуг',
      url: '#',
      status: 'coming',
      statusText: 'Скоро',
      releaseDate: 'Q4 2025',
      requiredLevel: 1
    },
    {
      id: 'globalgame',
      name: 'GlobalGame',
      icon: 'GlobalGame.png',
      description: 'Игровая экосистема Play-to-Earn',
      url: '#',
      status: 'coming',
      statusText: 'Скоро',
      releaseDate: 'Q1 2026',
      requiredLevel: 1
    },
    {
      id: 'globalsocial',
      name: 'GlobalSocial',
      icon: 'GlobalSocial.png',
      description: 'Децентрализованная социальная сеть',
      url: '#',
      status: 'planned',
      statusText: 'Планируется',
      releaseDate: 'Q2 2026',
      requiredLevel: 2
    },
    {
      id: 'globalbank',
      name: 'GlobalBank',
      icon: 'GlobalBank.png',
      description: 'DeFi платформа для банковских операций',
      url: '#',
      status: 'planned',
      statusText: 'Планируется',
      releaseDate: 'Q3 2026',
      requiredLevel: 3
    },
    {
      id: 'globaledu',
      name: 'GlobalEdu',
      icon: 'GlobalEdu.png',
      description: 'Образовательная платформа',
      url: '#',
      status: 'planned',
      statusText: 'Планируется',
      releaseDate: 'Q4 2026',
      requiredLevel: 2
    },
    {
      id: 'globalai',
      name: 'GlobalAI',
      icon: 'GlobalAI.png',
      description: 'Искусственный интеллект для бизнеса',
      url: '#',
      status: 'planned',
      statusText: 'Планируется',
      releaseDate: 'Q1 2027',
      requiredLevel: 4
    },
    {
      id: 'ecovillages',
      name: 'EcoVillages',
      icon: 'EcoVillages.png',
      description: 'Эко-поселения и устойчивое развитие',
      url: '#',
      status: 'planned',
      statusText: 'Планируется',
      releaseDate: 'Q2 2027',
      requiredLevel: 4
    }
  ],

  // ═══════════════════════════════════════════════════════════════
  // СОСТОЯНИЕ ПОЛЬЗОВАТЕЛЯ (для проверки доступа)
  // ═══════════════════════════════════════════════════════════════
  userState: {
    isConnected: false,
    isRegistered: false,
    userLevel: 0,
    userId: null,
    walletAddress: null
  },

  // ═══════════════════════════════════════════════════════════════
  // ИНИЦИАЛИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  async init() {
    console.log('🚀 Initializing Projects...');
    
    try {
      // Добавляем стили
      this.injectStyles();
      
      // ✅ НОВОЕ: Проверяем статус пользователя
      await this.checkUserStatus();
      
      // Отображаем проекты
      this.displayProjects();
      
      // Инициализируем UI
      this.initUI();

      console.log('✅ Projects loaded');
    } catch (error) {
      console.error('❌ Projects init error:', error);
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ✅ НОВОЕ: ПРОВЕРКА СТАТУСА ПОЛЬЗОВАТЕЛЯ
  // ═══════════════════════════════════════════════════════════════
  async checkUserStatus() {
    console.log('🔍 Checking user status for projects access...');
    
    try {
      // Получаем данные из app.state (структура GlobalWay)
      if (typeof app !== 'undefined' && app.state) {
        
        // Адрес кошелька
        if (app.state.userAddress) {
          this.userState.walletAddress = app.state.userAddress;
          this.userState.isConnected = true;
        }
        
        // Проверяем регистрацию
        this.userState.isRegistered = app.state.isRegistered || false;
        
        // Получаем уровень (maxLevel в app.state)
        this.userState.userLevel = app.state.maxLevel || 0;
        
        // Получаем ID (строка вида "9729645")
        if (app.state.userId) {
          this.userState.userId = 'GW' + app.state.userId;
        }
      }
      
      console.log('📊 User state:', this.userState);
      
    } catch (error) {
      console.error('checkUserStatus error:', error);
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // СТИЛИ (добавлены стили для блокировки)
  // ═══════════════════════════════════════════════════════════════
  injectStyles() {
    if (document.getElementById('projects-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'projects-styles';
    styles.textContent = `
      /* Сетка проектов */
      .projects-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 20px;
        padding: 20px;
        max-width: 1400px;
        margin: 0 auto;
      }
      
      /* ✅ НОВОЕ: Сообщение о необходимости регистрации */
      .projects-locked-message {
        grid-column: 1 / -1;
        text-align: center;
        padding: 60px 30px;
        background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
        border: 2px solid #ffd700;
        border-radius: 20px;
        margin: 20px;
      }
      
      .projects-locked-message .lock-icon {
        font-size: 64px;
        margin-bottom: 20px;
      }
      
      .projects-locked-message h2 {
        color: #ffd700;
        font-size: 1.8rem;
        margin-bottom: 15px;
      }
      
      .projects-locked-message p {
        color: #aaa;
        font-size: 1.1rem;
        margin-bottom: 25px;
        max-width: 500px;
        margin-left: auto;
        margin-right: auto;
      }
      
      .projects-locked-message .register-btn {
        background: linear-gradient(135deg, #ffd700, #ffaa00);
        color: #000;
        border: none;
        border-radius: 12px;
        padding: 15px 40px;
        font-size: 1.1rem;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .projects-locked-message .register-btn:hover {
        background: linear-gradient(135deg, #ffaa00, #ff8800);
        transform: scale(1.05);
      }
      
      /* ✅ НОВОЕ: Сообщение о подключении кошелька */
      .projects-connect-message {
        grid-column: 1 / -1;
        text-align: center;
        padding: 60px 30px;
        background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
        border: 2px solid #4a9eff;
        border-radius: 20px;
        margin: 20px;
      }
      
      .projects-connect-message .wallet-icon {
        font-size: 64px;
        margin-bottom: 20px;
      }
      
      .projects-connect-message h2 {
        color: #4a9eff;
        font-size: 1.8rem;
        margin-bottom: 15px;
      }
      
      .projects-connect-message p {
        color: #aaa;
        font-size: 1.1rem;
        margin-bottom: 25px;
      }
      
      .projects-connect-message .connect-btn {
        background: linear-gradient(135deg, #4a9eff, #2d7dd2);
        color: #fff;
        border: none;
        border-radius: 12px;
        padding: 15px 40px;
        font-size: 1.1rem;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .projects-connect-message .connect-btn:hover {
        background: linear-gradient(135deg, #2d7dd2, #1a5fa8);
        transform: scale(1.05);
      }
      
      /* Карточка проекта - квадратная */
      .project-card {
        background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
        border: 2px solid #2a2a4a;
        border-radius: 16px;
        padding: 25px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        transition: all 0.3s ease;
        aspect-ratio: 1 / 1;
        justify-content: space-between;
      }
      
      .project-card:hover {
        border-color: #ffd700;
        transform: translateY(-5px);
        box-shadow: 0 10px 30px rgba(255, 215, 0, 0.2);
      }
      
      /* ✅ НОВОЕ: Заблокированная карточка */
      .project-card.locked {
        opacity: 0.6;
        filter: grayscale(30%);
      }
      
      .project-card.locked:hover {
        transform: none;
        border-color: #2a2a4a;
        box-shadow: none;
      }
      
      .level-required-badge {
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(255, 100, 100, 0.9);
        color: #fff;
        padding: 5px 10px;
        border-radius: 8px;
        font-size: 0.75rem;
        font-weight: bold;
      }
      
      /* Иконка проекта */
      .project-icon {
        width: 100px;
        height: 100px;
        object-fit: contain;
        margin-bottom: 10px;
      }
      
      /* Название проекта */
      .project-name {
        color: #ffd700;
        font-size: 1.4rem;
        font-weight: bold;
        margin: 10px 0;
      }
      
      /* Описание в рамке */
      .project-description {
        color: #ffd700;
        font-size: 1rem;
        line-height: 1.4;
        margin-bottom: 15px;
        padding: 10px 15px;
        border: 2px solid #ffd700;
        border-radius: 8px;
        background: rgba(255, 215, 0, 0.05);
        flex-grow: 0;
      }
      
      /* Контейнер кнопок */
      .project-buttons {
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: 100%;
      }
      
      /* Кнопка открытия - жёлтая */
      .project-btn-open {
        background: linear-gradient(135deg, #ffd700, #ffaa00);
        color: #000;
        border: none;
        border-radius: 8px;
        padding: 12px 20px;
        font-weight: bold;
        font-size: 0.95rem;
        cursor: pointer;
        transition: all 0.3s ease;
        width: 100%;
      }
      
      .project-btn-open:hover:not(:disabled) {
        background: linear-gradient(135deg, #ffaa00, #ff8800);
        transform: scale(1.02);
      }
      
      /* Неактивная кнопка - серая */
      .project-btn-open:disabled {
        background: #444;
        color: #888;
        cursor: not-allowed;
      }
      
      /* Кнопка статуса - жёлтая рамка */
      .project-btn-status {
        background: transparent;
        color: #ffd700;
        border: 2px solid #ffd700;
        border-radius: 8px;
        padding: 10px 20px;
        font-weight: bold;
        font-size: 0.85rem;
        cursor: default;
        width: 100%;
      }
      
      /* ✅ НОВОЕ: Активный проект */
      .project-btn-status.active {
        color: #4ade80;
        border-color: #4ade80;
      }
      
      /* Карточка "Твой проект" - такая же как остальные */
      .project-card.your-project {
        background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
        border-color: #2a2a4a;
      }
      
      .project-card.your-project:hover {
        border-color: #ffd700;
        box-shadow: 0 10px 30px rgba(255, 215, 0, 0.2);
      }
      
      .your-project-title {
        color: #ffd700;
        font-size: 1.2rem;
        font-weight: bold;
        margin: 10px 0;
        padding: 10px 15px;
        border: 2px solid #ffd700;
        border-radius: 8px;
        background: rgba(255, 215, 0, 0.05);
      }
      
      .your-project-btn {
        background: linear-gradient(135deg, #ffd700, #ffaa00);
        color: #000;
      }
      
      .your-project-btn:hover {
        background: linear-gradient(135deg, #ffaa00, #ff8800);
      }
      
      /* Мобильная адаптация */
      @media (max-width: 768px) {
        .projects-grid {
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 15px;
          padding: 15px;
        }
        
        .project-card {
          padding: 20px;
        }
        
        .project-icon {
          width: 80px;
          height: 80px;
        }
        
        .project-name {
          font-size: 1.2rem;
        }
        
        .projects-locked-message,
        .projects-connect-message {
          padding: 40px 20px;
          margin: 10px;
        }
        
        .projects-locked-message h2,
        .projects-connect-message h2 {
          font-size: 1.4rem;
        }
      }
      
      @media (max-width: 480px) {
        .projects-grid {
          grid-template-columns: 1fr;
          gap: 15px;
          padding: 10px;
        }
        
        .project-card {
          aspect-ratio: auto;
          min-height: 320px;
        }
      }
      
      /* Заголовок страницы */
      .projects-header {
        text-align: center;
        padding: 30px 20px;
      }
      
      .projects-header h1 {
        color: #ffd700;
        font-size: 2rem;
        margin-bottom: 10px;
      }
      
      .projects-header p {
        color: #aaa;
        font-size: 1rem;
      }
      
      /* Форма заявки */
      .proposal-section {
        max-width: 600px;
        margin: 40px auto;
        padding: 30px;
        background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
        border: 2px solid #2a2a4a;
        border-radius: 16px;
      }
      
      .proposal-section h2 {
        color: #ffd700;
        text-align: center;
        margin-bottom: 20px;
      }
      
      .proposal-form input,
      .proposal-form textarea,
      .proposal-form select {
        width: 100%;
        padding: 12px 15px;
        margin-bottom: 15px;
        background: #0a0a15;
        border: 1px solid #333;
        border-radius: 8px;
        color: #fff;
        font-size: 1rem;
      }
      
      .proposal-form textarea {
        min-height: 120px;
        resize: vertical;
      }
      
      .proposal-form button {
        width: 100%;
        padding: 15px;
        background: linear-gradient(135deg, #ffd700, #ffaa00);
        color: #000;
        border: none;
        border-radius: 8px;
        font-weight: bold;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .proposal-form button:hover {
        background: linear-gradient(135deg, #ffaa00, #ff8800);
      }
    `;
    
    document.head.appendChild(styles);
  },

  // ═══════════════════════════════════════════════════════════════
  // ОТОБРАЖЕНИЕ ПРОЕКТОВ
  // ═══════════════════════════════════════════════════════════════
  displayProjects() {
    const container = document.getElementById('projectsGrid');
    if (!container) {
      console.error('❌ Projects container not found');
      return;
    }

    // Очищаем контейнер
    container.innerHTML = '';
    container.className = 'projects-grid';

    // ✅ НОВОЕ: Проверяем подключён ли кошелёк
    if (!this.userState.isConnected) {
      container.innerHTML = this.createConnectWalletMessage();
      console.log('⚠️ Wallet not connected - showing connect message');
      return;
    }

    // ✅ НОВОЕ: Проверяем зарегистрирован ли в GlobalWay
    if (!this.userState.isRegistered) {
      container.innerHTML = this.createRegistrationRequiredMessage();
      console.log('⚠️ User not registered - showing registration message');
      return;
    }

    // Добавляем карточки проектов
    this.projects.forEach(project => {
      const card = this.createProjectCard(project);
      container.appendChild(card);
    });

    // Добавляем карточку "Твой проект"
    const yourProjectCard = this.createYourProjectCard();
    container.appendChild(yourProjectCard);

    console.log('✅ Projects displayed:', this.projects.length + 1);
  },

  // ═══════════════════════════════════════════════════════════════
  // ✅ НОВОЕ: СООБЩЕНИЕ О ПОДКЛЮЧЕНИИ КОШЕЛЬКА
  // ═══════════════════════════════════════════════════════════════
  createConnectWalletMessage() {
    return `
      <div class="projects-connect-message">
        <div class="wallet-icon">🔗</div>
        <h2>Подключите кошелёк</h2>
        <p>Для просмотра и использования проектов GlobalWay необходимо подключить кошелёк SafePal</p>
        <button class="connect-btn" onclick="app.connectWallet()">
          Подключить SafePal
        </button>
      </div>
    `;
  },

  // ═══════════════════════════════════════════════════════════════
  // ✅ НОВОЕ: СООБЩЕНИЕ О НЕОБХОДИМОСТИ РЕГИСТРАЦИИ
  // ═══════════════════════════════════════════════════════════════
  createRegistrationRequiredMessage() {
    return `
      <div class="projects-locked-message">
        <div class="lock-icon">🔒</div>
        <h2>Требуется регистрация в GlobalWay</h2>
        <p>Для доступа к проектам экосистемы необходимо зарегистрироваться в GlobalWay. После регистрации вам станут доступны все инструменты.</p>
        <button class="register-btn" onclick="showPage('dashboard')">
          Зарегистрироваться
        </button>
      </div>
    `;
  },

  // ═══════════════════════════════════════════════════════════════
  // СОЗДАНИЕ КАРТОЧКИ ПРОЕКТА
  // ═══════════════════════════════════════════════════════════════
  createProjectCard(project) {
    const card = document.createElement('div');
    
    // ✅ НОВОЕ: Проверяем уровень для доступа
    const hasAccess = this.userState.userLevel >= (project.requiredLevel || 0);
    const isActive = project.status === 'active' && project.url && project.url !== '#';
    const isLocked = !hasAccess && project.requiredLevel > 0;
    
    card.className = `project-card ${isLocked ? 'locked' : ''}`;
    card.id = `project-${project.id}`;
    card.style.position = 'relative';

    // Путь к иконке
    const iconPath = `assets/icons/${project.icon}`;

    // ✅ НОВОЕ: Бейдж уровня для заблокированных
    const levelBadge = isLocked 
      ? `<div class="level-required-badge">🔒 Уровень ${project.requiredLevel}+</div>` 
      : '';

    // ✅ НОВОЕ: Определяем текст и состояние кнопки
    let buttonText = 'Открыть проект';
    let buttonDisabled = true;
    
    if (isActive && hasAccess) {
      buttonDisabled = false;
    } else if (isLocked) {
      buttonText = `🔒 Нужен уровень ${project.requiredLevel}`;
    } else if (project.status !== 'active') {
      buttonText = 'Открыть проект';
    }

    // ✅ НОВОЕ: Статус для активных проектов
    const statusClass = project.status === 'active' ? 'active' : project.status;
    const statusText = project.status === 'active' ? '✅ Активен' : `${project.statusText} • ${project.releaseDate}`;

    card.innerHTML = `
      ${levelBadge}
      <img 
        src="${iconPath}" 
        alt="${project.name}" 
        class="project-icon"
        onerror="this.src='assets/icons/projects.png'"
      >
      <h3 class="project-name">${project.name}</h3>
      <p class="project-description">${project.description}</p>
      <div class="project-buttons">
        <button 
          class="project-btn-open" 
          onclick="projectsModule.openProject('${project.id}')"
          ${buttonDisabled ? 'disabled' : ''}
        >
          ${buttonText}
        </button>
        <button class="project-btn-status ${statusClass}">
          ${statusText}
        </button>
      </div>
    `;

    return card;
  },

  // ═══════════════════════════════════════════════════════════════
  // СОЗДАНИЕ КАРТОЧКИ "ТВОЙ ПРОЕКТ"
  // ═══════════════════════════════════════════════════════════════
  createYourProjectCard() {
    const card = document.createElement('div');
    card.className = 'project-card your-project';

    card.innerHTML = `
      <img 
        src="assets/icons/projects.png" 
        alt="Твой проект" 
        class="project-icon"
      >
      <h3 class="your-project-title">Здесь может появиться<br>твой проект</h3>
      <div class="project-buttons">
        <button 
          class="project-btn-open your-project-btn" 
          onclick="projectsModule.scrollToForm()"
        >
          Оставить заявку
        </button>
      </div>
    `;

    return card;
  },

  // ═══════════════════════════════════════════════════════════════
  // ОТКРЫТИЕ ПРОЕКТА
  // ═══════════════════════════════════════════════════════════════
  openProject(projectId) {
    const project = this.projects.find(p => p.id === projectId);
    if (!project) return;

    // ✅ НОВОЕ: Проверяем уровень
    const requiredLevel = project.requiredLevel || 0;
    if (this.userState.userLevel < requiredLevel) {
      app.showNotification(`Для доступа к ${project.name} нужен уровень ${requiredLevel}. Ваш уровень: ${this.userState.userLevel}`, 'warning');
      return;
    }

    if (project.status !== 'active') {
      app.showNotification(`${project.name} находится в разработке. Запуск: ${project.releaseDate}`, 'info');
      return;
    }

    // ✅ НОВОЕ: Открываем проект с параметрами для автологина в CardGift
    if (project.url && project.url !== '#') {
      let targetUrl = project.url;
      
      // Добавляем параметры для CardGift
      if (project.id === 'kardgift' && this.userState.userId) {
        const params = new URLSearchParams({
          from: 'globalway',
          ref: this.userState.userId,  // Уже в формате GW1234567
          wallet: this.userState.walletAddress || ''
        });
        targetUrl = `${project.url}?${params.toString()}`;
      }
      
      console.log(`🚀 Opening project: ${project.name}`, targetUrl);
      
      // В SafePal открываем в том же окне, иначе в новой вкладке
      if (this.isSafePalBrowser()) {
        window.location.href = targetUrl;
      } else {
        window.open(targetUrl, '_blank');
      }
    } else {
      app.showNotification('Проект скоро будет доступен!', 'info');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ✅ НОВОЕ: ПРОВЕРКА SAFEPAL БРАУЗЕРА
  // ═══════════════════════════════════════════════════════════════
  isSafePalBrowser() {
    const ua = navigator.userAgent || '';
    return ua.includes('SafePal') || 
           ua.includes('safepal') || 
           (typeof window.safepal !== 'undefined');
  },

  // ═══════════════════════════════════════════════════════════════
  // ПРОКРУТКА К ФОРМЕ
  // ═══════════════════════════════════════════════════════════════
  scrollToForm() {
    const form = document.getElementById('proposalSection');
    if (form) {
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ОТПРАВКА ЗАЯВКИ
  // ═══════════════════════════════════════════════════════════════
  async submitProposal(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    const proposal = {
      name: formData.get('name') || 'Аноним',
      contact: formData.get('contact'),
      projectName: formData.get('projectName'),
      description: formData.get('description'),
      timestamp: Date.now()
    };

    // Валидация
    if (!proposal.contact || !proposal.projectName || !proposal.description) {
      app.showNotification('Заполните все обязательные поля', 'error');
      return;
    }

    try {
      // Сохраняем локально
      let proposals = JSON.parse(localStorage.getItem('gw_proposals') || '[]');
      proposals.push(proposal);
      localStorage.setItem('gw_proposals', JSON.stringify(proposals));

      app.showNotification('Заявка отправлена! Мы свяжемся с вами.', 'success');
      form.reset();

    } catch (error) {
      console.error('Error submitting proposal:', error);
      app.showNotification('Ошибка отправки заявки', 'error');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // UI ИНИЦИАЛИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  initUI() {
    console.log('🎨 Initializing Projects UI...');

    // Форма предложения проекта
    const proposalForm = document.getElementById('proposalForm');
    if (proposalForm) {
      proposalForm.onsubmit = (e) => this.submitProposal(e);
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ОБНОВЛЕНИЕ
  // ═══════════════════════════════════════════════════════════════
  async refresh() {
    console.log('🔄 Refreshing projects...');
    await this.checkUserStatus();
    this.displayProjects();
  }
};

// Экспорт в window
window.projectsModule = projectsModule;
