// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Projects Module - REDESIGNED
// Красивые квадратные карточки проектов
// Date: 2025-12-10
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
      url: '#',
      status: 'development',
      statusText: 'В разработке',
      releaseDate: 'Q2 2025'
    },
    {
      id: 'globaltub',
      name: 'GlobalTub',
      icon: 'GlobalTub.png',
      description: 'Децентрализованная видео платформа',
      url: '#',
      status: 'development',
      statusText: 'В разработке',
      releaseDate: 'Q3 2025'
    },
    {
      id: 'globalmarket',
      name: 'GlobalMarket',
      icon: 'GlobalMarket.png',
      description: 'P2P маркетплейс товаров и услуг',
      url: '#',
      status: 'coming',
      statusText: 'Скоро',
      releaseDate: 'Q4 2025'
    },
    {
      id: 'globalgame',
      name: 'GlobalGame',
      icon: 'GlobalGame.png',
      description: 'Игровая экосистема Play-to-Earn',
      url: '#',
      status: 'coming',
      statusText: 'Скоро',
      releaseDate: 'Q1 2026'
    },
    {
      id: 'globalsocial',
      name: 'GlobalSocial',
      icon: 'GlobalSocial.png',
      description: 'Децентрализованная социальная сеть',
      url: '#',
      status: 'planned',
      statusText: 'Планируется',
      releaseDate: 'Q2 2026'
    },
    {
      id: 'globalbank',
      name: 'GlobalBank',
      icon: 'GlobalBank.png',
      description: 'DeFi платформа для банковских операций',
      url: '#',
      status: 'planned',
      statusText: 'Планируется',
      releaseDate: 'Q3 2026'
    },
    {
      id: 'globaledu',
      name: 'GlobalEdu',
      icon: 'GlobalEdu.png',
      description: 'Образовательная платформа',
      url: '#',
      status: 'planned',
      statusText: 'Планируется',
      releaseDate: 'Q4 2026'
    },
    {
      id: 'globalai',
      name: 'GlobalAI',
      icon: 'GlobalAI.png',
      description: 'Искусственный интеллект для бизнеса',
      url: '#',
      status: 'planned',
      statusText: 'Планируется',
      releaseDate: 'Q1 2027'
    },
    {
      id: 'ecovillages',
      name: 'EcoVillages',
      icon: 'EcoVillages.png',
      description: 'Эко-поселения и устойчивое развитие',
      url: '#',
      status: 'planned',
      statusText: 'Планируется',
      releaseDate: 'Q2 2027'
    }
  ],

  // ═══════════════════════════════════════════════════════════════
  // ИНИЦИАЛИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  async init() {
    console.log('🚀 Initializing Projects...');
    
    try {
      // Добавляем стили
      this.injectStyles();
      
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
  // СТИЛИ
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
      
      /* Иконка проекта */
      .project-icon {
        width: 100px;
        height: 100px;
        object-fit: contain;
        margin-bottom: 15px;
      }
      
      /* Название проекта */
      .project-name {
        color: #ffd700;
        font-size: 1.4rem;
        font-weight: bold;
        margin: 10px 0;
      }
      
      /* Описание */
      .project-description {
        color: #aaa;
        font-size: 0.9rem;
        line-height: 1.4;
        margin-bottom: 15px;
        flex-grow: 1;
        display: flex;
        align-items: center;
      }
      
      /* Контейнер кнопок */
      .project-buttons {
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: 100%;
      }
      
      /* Кнопка открытия */
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
      
      .project-btn-open:hover {
        background: linear-gradient(135deg, #ffaa00, #ff8800);
        transform: scale(1.02);
      }
      
      .project-btn-open:disabled {
        background: #444;
        color: #888;
        cursor: not-allowed;
      }
      
      /* Кнопка статуса */
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
      
      .project-btn-status.development {
        border-color: #00bfff;
        color: #00bfff;
      }
      
      .project-btn-status.coming {
        border-color: #ff9500;
        color: #ff9500;
      }
      
      .project-btn-status.planned {
        border-color: #888;
        color: #888;
      }
      
      .project-btn-status.active {
        border-color: #00ff00;
        color: #00ff00;
      }
      
      /* Карточка "Твой проект" */
      .project-card.your-project {
        background: linear-gradient(145deg, #1a2a1e 0%, #162e1e 100%);
        border-color: #2a4a3a;
      }
      
      .project-card.your-project:hover {
        border-color: #00ff88;
        box-shadow: 0 10px 30px rgba(0, 255, 136, 0.2);
      }
      
      .your-project-title {
        color: #00ff88;
        font-size: 1.2rem;
        font-weight: bold;
        margin: 15px 0;
      }
      
      .your-project-btn {
        background: linear-gradient(135deg, #00ff88, #00cc66);
        color: #000;
      }
      
      .your-project-btn:hover {
        background: linear-gradient(135deg, #00cc66, #00aa55);
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
  // СОЗДАНИЕ КАРТОЧКИ ПРОЕКТА
  // ═══════════════════════════════════════════════════════════════
  createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.id = `project-${project.id}`;

    // Путь к иконке
    const iconPath = `assets/icons/${project.icon}`;

    card.innerHTML = `
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
          ${project.status === 'active' ? '' : 'disabled'}
        >
          Открыть проект
        </button>
        <button class="project-btn-status ${project.status}">
          ${project.statusText} • ${project.releaseDate}
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
      <h3 class="your-project-title">Здесь может появиться твой проект</h3>
      <p class="project-description">Предложи свою идею и стань частью экосистемы GlobalWay</p>
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

    if (project.status !== 'active') {
      app.showNotification(`${project.name} находится в разработке. Запуск: ${project.releaseDate}`, 'info');
      return;
    }

    // Открываем проект
    if (project.url && project.url !== '#') {
      window.open(project.url, '_blank');
    } else {
      app.showNotification('Проект скоро будет доступен!', 'info');
    }
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
    this.displayProjects();
  }
};

// Экспорт в window
window.projectsModule = projectsModule;
