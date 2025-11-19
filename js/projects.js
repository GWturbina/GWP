// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Projects Module - ИСПРАВЛЕННАЯ ВЕРСИЯ
// Проекты: список, детали, доступ, предложения
// Date: 2025-01-19 - FIXED
// ═══════════════════════════════════════════════════════════════════

const projectsModule = {
  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════
  contracts: {},
  
  state: {
    projects: [],
    userLevel: 0,
    stats: {
      total: 0,
      active: 0,
      development: 0,
      coming: 0,
      review: 0
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // СПИСОК ПРОЕКТОВ (из скриншотов)
  // ═══════════════════════════════════════════════════════════════
  defaultProjects: [
    {
      id: 'kardgift',
      name: 'KardGift',
      description: 'Gift card marketplace and exchange platform',
      logo: 'assets/projects/kardgift.png',
      status: 'development',
      statusLabel: 'В РАЗРАБОТКЕ',
      requiredLevel: 1,
      prefix: 'KG'
    },
    {
      id: 'globaltub',
      name: 'GlobalTub',
      description: 'Decentralized video streaming platform',
      logo: 'assets/projects/globaltub.png',
      status: 'development',
      statusLabel: 'В РАЗРАБОТКЕ',
      requiredLevel: 4,
      prefix: 'GT'
    },
    {
      id: 'globalmarket',
      name: 'GlobalMarket',
      description: 'P2P marketplace for goods and services',
      logo: 'assets/projects/globalmarket.png',
      status: 'coming',
      statusLabel: 'СКОРО',
      requiredLevel: 4,
      prefix: 'GM'
    },
    {
      id: 'globalgame',
      name: 'GlobalGame',
      description: 'Play-to-earn gaming ecosystem',
      logo: 'assets/projects/globalgame.png',
      status: 'coming',
      statusLabel: 'СКОРО',
      requiredLevel: 7,
      prefix: 'GG'
    },
    {
      id: 'globalsocial',
      name: 'GlobalSocial',
      description: 'Decentralized social network',
      logo: 'assets/projects/globalsocial.png',
      status: 'planning',
      statusLabel: 'ПЛАНИРУЕТСЯ',
      requiredLevel: 7,
      prefix: 'GS'
    },
    {
      id: 'globalbank',
      name: 'GlobalBank',
      description: 'DeFi banking and lending platform',
      logo: 'assets/projects/globalbank.png',
      status: 'planning',
      statusLabel: 'ПЛАНИРУЕТСЯ',
      requiredLevel: 10,
      prefix: 'GB'
    },
    {
      id: 'globaledu',
      name: 'GlobalEdu',
      description: 'Educational platform and certification',
      logo: 'assets/projects/globaledu.png',
      status: 'planning',
      statusLabel: 'ПЛАНИРУЕТСЯ',
      requiredLevel: 10,
      prefix: 'GE'
    },
    {
      id: 'ecovillages',
      name: 'EcoVillages',
      description: 'Eco-settlements and sustainable living',
      logo: 'assets/projects/ecovillages.png',
      status: 'planning',
      statusLabel: 'ПЛАНИРУЕТСЯ',
      requiredLevel: 12,
      prefix: 'EV'
    }
  ],

  // ═══════════════════════════════════════════════════════════════
  // ИНИЦИАЛИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  async init() {
    console.log('🚀 Initializing Projects...');
    
    try {
      await this.loadContracts();

      // Получаем уровень пользователя
      if (app.state.userAddress) {
        await this.loadUserLevel();
      }

      // Загружаем проекты
      await this.loadProjects();

      // Обновляем статистику
      this.updateStatistics();

      // Инициализируем UI
      this.initUI();

      console.log('✅ Projects loaded');
    } catch (error) {
      console.error('❌ Projects init error:', error);
      app.showNotification('Ошибка загрузки проектов', 'error');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАГРУЗКА КОНТРАКТОВ
  // ═══════════════════════════════════════════════════════════════
  async loadContracts() {
    console.log('📥 Loading contracts for projects...');
    
    this.contracts.globalWay = await app.getContract('GlobalWay');
    this.contracts.matrixRegistry = await app.getContract('MatrixRegistry');
    
    // GlobalWayBridge - опционально (может не существовать)
    try {
      this.contracts.bridge = await app.getContract('GlobalWayBridge');
      console.log('✅ Bridge contract loaded');
    } catch (e) {
      console.log('⚠️ Bridge contract not available');
      this.contracts.bridge = null;
    }
    
    console.log('✅ All project contracts loaded');
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАГРУЗКА УРОВНЯ ПОЛЬЗОВАТЕЛЯ
  // ═══════════════════════════════════════════════════════════════
  async loadUserLevel() {
    try {
      const address = app.state.userAddress;
      
      // Получаем максимальный уровень
      const maxLevel = await this.contracts.globalWay.getUserMaxLevel(address);
      this.state.userLevel = Number(maxLevel);
      
      console.log('✅ User level:', this.state.userLevel);
      
    } catch (error) {
      console.error('❌ Error loading user level:', error);
      this.state.userLevel = 0;
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАГРУЗКА ПРОЕКТОВ
  // ═══════════════════════════════════════════════════════════════
  async loadProjects() {
    try {
      console.log('📊 Loading projects...');

      // Пытаемся загрузить проекты из контракта Bridge (если есть)
      let projectsFromChain = [];
      
      if (this.contracts.bridge) {
        try {
          const projectIDs = await this.contracts.bridge.getAllProjects();
          
          for (const projectID of projectIDs) {
            const [isActive, name, wallet, token, registeredAt] = 
              await this.contracts.bridge.getProject(projectID);

            if (isActive) {
              projectsFromChain.push({
                id: projectID,
                name,
                wallet,
                token,
                registeredAt: Number(registeredAt),
                onChain: true
              });
            }
          }
          
          console.log('✅ Loaded projects from chain:', projectsFromChain.length);
        } catch (e) {
          console.log('⚠️ Could not load projects from chain:', e.message);
        }
      }

      // Объединяем с дефолтными проектами
      if (projectsFromChain.length > 0) {
        this.state.projects = this.defaultProjects.map(project => {
          const onChainProject = projectsFromChain.find(p => p.id === project.id);
          
          return {
            ...project,
            onChain: !!onChainProject,
            wallet: onChainProject?.wallet,
            token: onChainProject?.token
          };
        });
      } else {
        // Используем дефолтные проекты
        this.state.projects = this.defaultProjects;
      }

      console.log('✅ Projects loaded:', this.state.projects.length);
      
      // Отображаем проекты
      this.displayProjects();

    } catch (error) {
      console.error('❌ Error loading projects:', error);
      
      // В случае ошибки используем дефолтные
      this.state.projects = this.defaultProjects;
      this.displayProjects();
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ОТОБРАЖЕНИЕ ПРОЕКТОВ
  // ═══════════════════════════════════════════════════════════════
  displayProjects() {
    const container = document.getElementById('projectsGrid');
    if (!container) return;

    container.innerHTML = this.state.projects.map(project => {
      const canAccess = this.state.userLevel >= project.requiredLevel;
      const statusClass = project.status;

      return `
        <div class="project-card ${statusClass}" data-project-id="${project.id}">
          <div class="project-logo">
            <img src="${project.logo}" alt="${project.name}" 
                 onerror="this.src='assets/icons/default-project.png'">
          </div>
          
          <div class="project-info">
            <h3 class="project-name">${project.name}</h3>
            <p class="project-description">${project.description}</p>
            
            <div class="project-meta">
              <span class="project-status status-${statusClass}">
                ${project.statusLabel}
              </span>
              <span class="project-level">
                Уровень ${project.requiredLevel}+
              </span>
            </div>
          </div>
          
          <button 
            class="project-btn ${canAccess ? '' : 'disabled'}" 
            onclick="projectsModule.openProject('${project.id}')"
            ${canAccess ? '' : 'disabled'}
          >
            ${canAccess ? 'Открыть проект' : 'Требуется уровень ' + project.requiredLevel}
          </button>
        </div>
      `;
    }).join('');
  },

  // ═══════════════════════════════════════════════════════════════
  // ОТКРЫТИЕ ПРОЕКТА
  // ═══════════════════════════════════════════════════════════════
  async openProject(projectId) {
    const project = this.state.projects.find(p => p.id === projectId);
    if (!project) return;

    // Проверяем уровень
    if (this.state.userLevel < project.requiredLevel) {
      app.showNotification(`Требуется уровень ${project.requiredLevel}`, 'error');
      return;
    }

    // Проверяем доступ через контракт Bridge (если есть)
    if (this.contracts.bridge && project.onChain && app.state.userAddress) {
      try {
        const accessStatus = await this.contracts.bridge.checkUserAccess(
          projectId,
          app.state.userAddress
        );

        if (!accessStatus.isRegistered) {
          app.showNotification('Сначала зарегистрируйтесь в системе', 'error');
          return;
        }

        if (accessStatus.maxLevel < project.requiredLevel) {
          app.showNotification(`Требуется уровень ${project.requiredLevel}`, 'error');
          return;
        }

        // Проверяем quarterly
        if (!accessStatus.quarterlyActive) {
          app.showNotification('Оплатите quarterly активность', 'error');
          return;
        }

      } catch (error) {
        console.error('Error checking access:', error);
      }
    }

    // Показываем модальное окно с деталями
    this.showProjectModal(project);
  },

  // ═══════════════════════════════════════════════════════════════
  // МОДАЛЬНОЕ ОКНО ПРОЕКТА
  // ═══════════════════════════════════════════════════════════════
  showProjectModal(project) {
    const modal = document.getElementById('projectModal');
    if (!modal) {
      console.error('Project modal not found');
      return;
    }

    // Заполняем данные
    const titleEl = document.getElementById('projectModalTitle');
    const descEl = document.getElementById('projectModalDescription');
    const statusEl = document.getElementById('projectModalStatus');
    const reqEl = document.getElementById('projectModalRequirements');
    const prefixEl = document.getElementById('projectModalPrefix');
    const logoEl = document.getElementById('projectModalLogo');
    const actionBtn = document.getElementById('projectModalAction');

    if (titleEl) titleEl.textContent = project.name;
    if (descEl) descEl.textContent = project.description;
    
    if (statusEl) {
      statusEl.textContent = project.statusLabel;
      statusEl.className = `project-status status-${project.status}`;
    }
    
    if (reqEl) {
      reqEl.textContent = `Минимальный уровень: ${project.requiredLevel}`;
    }
    
    if (prefixEl) {
      prefixEl.textContent = `${project.prefix}-XXXXXXX`;
    }

    // Логотип
    if (logoEl) {
      logoEl.src = project.logo;
      logoEl.onerror = () => {
        logoEl.src = 'assets/icons/default-project.png';
      };
    }

    // Кнопка действия
    if (actionBtn) {
      if (project.status === 'development') {
        actionBtn.disabled = false;
        actionBtn.textContent = 'Открыть проект';
        actionBtn.onclick = () => {
          app.showNotification('Проект в разработке. Скоро запустим!', 'info');
          this.closeModal();
        };
      } else if (project.status === 'active') {
        actionBtn.disabled = false;
        actionBtn.textContent = 'Открыть проект';
        actionBtn.onclick = () => {
          // TODO: Перенаправление на проект
          window.open(project.url || '#', '_blank');
          this.closeModal();
        };
      } else {
        actionBtn.disabled = true;
        actionBtn.textContent = project.statusLabel;
      }
    }

    // Показываем модалку
    modal.style.display = 'block';
  },

  closeModal() {
    const modal = document.getElementById('projectModal');
    if (modal) {
      modal.style.display = 'none';
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ПРЕДЛОЖЕНИЕ ПРОЕКТА
  // ═══════════════════════════════════════════════════════════════
  async submitProposal(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    const proposal = {
      author: formData.get('author') || 'Аноним',
      contact: formData.get('contact'),
      category: formData.get('category'),
      name: formData.get('projectName'),
      description: formData.get('projectDescription'),
      timestamp: Date.now(),
      status: 'review'
    };

    // Валидация
    if (!proposal.contact || !proposal.category || !proposal.name || !proposal.description) {
      app.showNotification('Заполните все поля', 'error');
      return;
    }

    try {
      // Сохраняем локально
      let proposals = [];
      try {
        const stored = localStorage.getItem('gw_proposals');
        if (stored) {
          proposals = JSON.parse(stored);
        }
      } catch (e) {
        console.error('Error reading proposals:', e);
      }

      proposals.push(proposal);
      
      try {
        localStorage.setItem('gw_proposals', JSON.stringify(proposals));
        localStorage.setItem('gw_proposals_count', proposals.length.toString());
      } catch (e) {
        console.error('Error saving proposals:', e);
      }

      app.showNotification('Предложение сохранено! Администратор свяжется с вами.', 'success');
      
      // Очищаем форму
      form.reset();

      // Обновляем статистику
      this.updateStatistics();

    } catch (error) {
      console.error('Error submitting proposal:', error);
      app.showNotification('Ошибка отправки предложения', 'error');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // СТАТИСТИКА
  // ═══════════════════════════════════════════════════════════════
  updateStatistics() {
    // Подсчет по статусам
    const stats = {
      total: this.state.projects.length,
      active: this.state.projects.filter(p => p.status === 'active').length,
      development: this.state.projects.filter(p => p.status === 'development').length,
      coming: this.state.projects.filter(p => p.status === 'coming').length,
      review: 0
    };

    // Получаем количество предложений
    try {
      const count = localStorage.getItem('gw_proposals_count');
      stats.review = parseInt(count || '0');
    } catch (e) {
      stats.review = 0;
    }

    this.state.stats = stats;

    // Обновляем UI
    const totalEl = document.getElementById('totalProjects');
    const activeEl = document.getElementById('activeProjects');
    const devEl = document.getElementById('devProjects');
    const comingEl = document.getElementById('comingProjects');
    const reviewEl = document.getElementById('reviewProjects');

    if (totalEl) totalEl.textContent = stats.total;
    if (activeEl) activeEl.textContent = stats.active;
    if (devEl) devEl.textContent = stats.development;
    if (comingEl) comingEl.textContent = stats.coming;
    if (reviewEl) reviewEl.textContent = stats.review;

    console.log('✅ Statistics updated:', stats);
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

    // Кнопка "Присоединиться к программе"
    const joinBtn = document.getElementById('joinProgram');
    if (joinBtn) {
      joinBtn.onclick = () => {
        app.showNotification('Программа разработчиков в разработке', 'info');
      };
    }

    // Кнопка "Просмотр документации"
    const docsBtn = document.getElementById('viewDocs');
    if (docsBtn) {
      docsBtn.onclick = () => {
        window.open('https://docs.globalway.com', '_blank');
      };
    }

    // Закрытие модалки
    const closeBtn = document.querySelector('#projectModal .close-modal');
    if (closeBtn) {
      closeBtn.onclick = () => this.closeModal();
    }

    // Клик вне модалки
    const modal = document.getElementById('projectModal');
    if (modal) {
      modal.onclick = (e) => {
        if (e.target === modal) {
          this.closeModal();
        }
      };
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ОБНОВЛЕНИЕ ДАННЫХ
  // ═══════════════════════════════════════════════════════════════
  async refresh() {
    console.log('🔄 Refreshing projects data...');
    
    if (app.state.userAddress) {
      await this.loadUserLevel();
    }
    
    await this.loadProjects();
    this.updateStatistics();
  }
};

// Экспорт в window
window.projectsModule = projectsModule;
