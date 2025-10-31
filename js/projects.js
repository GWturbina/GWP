/* jshint esversion: 8 */
/* global web3Manager, contracts, Utils, CONFIG */

/**
 * Projects Manager - Управління проектами GlobalWay
 */
class ProjectsManager {
  constructor() {
    this.projects = [];
    this.selectedProject = null;
  }

  /**
   * Ініціалізація
   */
  async init() {
    console.log('🚀 Initializing Projects Manager...');
    
    this.setupEventListeners();
    await this.loadProjects();
    
    console.log('✅ Projects Manager initialized');
  }

  /**
   * Налаштування обробників подій
   */
  setupEventListeners() {
    // Filter buttons
    const filterBtns = document.querySelectorAll('.project-filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        this.filterProjects(filter);
        
        // Update active state
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Refresh button
    const refreshBtn = document.getElementById('refreshProjectsBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadProjects());
    }
  }

  /**
   * Завантаження проектів
   */
  async loadProjects() {
    Utils.showLoader(true, 'Loading projects...');

    try {
      console.log('🚀 Loading projects...');

      // Завантажити з Bridge контракту
      const allProjects = await contracts.getAllProjects();

      // Створити список проектів з іконками
      this.projects = this.createProjectsList(allProjects);

      console.log(`✅ Loaded ${this.projects.length} projects`);

      this.renderProjects();

    } catch (error) {
      console.error('❌ Load projects error:', error);
      
      // Якщо помилка - показати статичний список проектів
      this.loadStaticProjects();
      
      Utils.showNotification('Loaded static projects list', 'info');
    } finally {
      Utils.hideLoader();
    }
  }

  /**
   * Створення списку проектів з контракту
   */
  createProjectsList(contractProjects) {
    const projects = [];

    contractProjects.forEach(project => {
      projects.push({
        id: project.id || project.address,
        name: project.name || 'Unknown Project',
        description: project.description || 'No description',
        address: project.address,
        isActive: project.isActive,
        raised: project.raised || '0',
        icon: this.getProjectIcon(project.name),
        category: this.getProjectCategory(project.name),
        status: project.isActive ? 'Active' : 'Inactive',
        website: project.website || '#',
        whitepaper: project.whitepaper || '#'
      });
    });

    return projects;
  }

  /**
   * Завантаження статичного списку проектів
   */
  loadStaticProjects() {
    this.projects = [
      {
        id: 1,
        name: 'Global Bank',
        description: 'Decentralized banking platform for global financial services',
        icon: CONFIG.ASSETS.icons.globalBank,
        category: 'DeFi',
        status: 'Coming Soon',
        website: '#',
        whitepaper: '#',
        isActive: false
      },
      {
        id: 2,
        name: 'Global Market',
        description: 'Decentralized marketplace for goods and services',
        icon: CONFIG.ASSETS.icons.globalMarket,
        category: 'Marketplace',
        status: 'In Development',
        website: '#',
        whitepaper: '#',
        isActive: false
      },
      {
        id: 3,
        name: 'Global AI',
        description: 'AI-powered tools and services for the community',
        icon: CONFIG.ASSETS.icons.globalAI,
        category: 'AI',
        status: 'Coming Soon',
        website: '#',
        whitepaper: '#',
        isActive: false
      },
      {
        id: 4,
        name: 'Global Education',
        description: 'Online education platform with blockchain certificates',
        icon: CONFIG.ASSETS.icons.globalEdu,
        category: 'Education',
        status: 'Coming Soon',
        website: '#',
        whitepaper: '#',
        isActive: false
      },
      {
        id: 5,
        name: 'Global Social',
        description: 'Decentralized social network with rewards',
        icon: CONFIG.ASSETS.icons.globalSocial,
        category: 'Social',
        status: 'In Development',
        website: '#',
        whitepaper: '#',
        isActive: false
      },
      {
        id: 6,
        name: 'Global Game',
        description: 'Play-to-earn gaming platform',
        icon: CONFIG.ASSETS.icons.globalGame,
        category: 'Gaming',
        status: 'Coming Soon',
        website: '#',
        whitepaper: '#',
        isActive: false
      },
      {
        id: 7,
        name: 'Global Tube',
        description: 'Decentralized video platform with creator rewards',
        icon: CONFIG.ASSETS.icons.globalTub,
        category: 'Media',
        status: 'Coming Soon',
        website: '#',
        whitepaper: '#',
        isActive: false
      },
      {
        id: 8,
        name: 'Eco Villages',
        description: 'Sustainable eco-village development projects',
        icon: CONFIG.ASSETS.icons.ecoVillages,
        category: 'Real Estate',
        status: 'Active',
        website: '#',
        whitepaper: '#',
        isActive: true
      },
      {
        id: 9,
        name: 'Card Gift',
        description: 'Digital gift cards and loyalty program',
        icon: CONFIG.ASSETS.icons.cardGift,
        category: 'Retail',
        status: 'Coming Soon',
        website: '#',
        whitepaper: '#',
        isActive: false
      }
    ];

    this.renderProjects();
  }

  /**
   * Отримати іконку проекту
   */
  getProjectIcon(name) {
    const icons = {
      'Global Bank': CONFIG.ASSETS.icons.globalBank,
      'Global Market': CONFIG.ASSETS.icons.globalMarket,
      'Global AI': CONFIG.ASSETS.icons.globalAI,
      'Global Education': CONFIG.ASSETS.icons.globalEdu,
      'Global Social': CONFIG.ASSETS.icons.globalSocial,
      'Global Game': CONFIG.ASSETS.icons.globalGame,
      'Global Tube': CONFIG.ASSETS.icons.globalTub,
      'Eco Villages': CONFIG.ASSETS.icons.ecoVillages,
      'Card Gift': CONFIG.ASSETS.icons.cardGift
    };

    return icons[name] || CONFIG.ASSETS.icons.logo;
  }

  /**
   * Отримати категорію проекту
   */
  getProjectCategory(name) {
    const categories = {
      'Global Bank': 'DeFi',
      'Global Market': 'Marketplace',
      'Global AI': 'AI',
      'Global Education': 'Education',
      'Global Social': 'Social',
      'Global Game': 'Gaming',
      'Global Tube': 'Media',
      'Eco Villages': 'Real Estate',
      'Card Gift': 'Retail'
    };

    return categories[name] || 'Other';
  }

  /**
   * Рендеринг проектів
   */
  renderProjects(filteredProjects = null) {
    const container = document.getElementById('projectsGrid');
    if (!container) return;

    const projectsToRender = filteredProjects || this.projects;

    if (projectsToRender.length === 0) {
      container.innerHTML = `
        <div class="empty-state-large">
          <div class="empty-icon">🚀</div>
          <h3>No Projects Found</h3>
          <p>Check back soon for new projects!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = projectsToRender.map(project => `
      <div class="project-card" data-id="${project.id}">
        <div class="project-card-header">
          <img src="${project.icon}" 
               alt="${project.name}" 
               class="project-icon"
               onerror="this.src='${CONFIG.ASSETS.icons.logo}'">
          <span class="project-status status-${project.status.toLowerCase().replace(' ', '-')}">
            ${project.status}
          </span>
        </div>
        
        <div class="project-card-body">
          <h3 class="project-title">${project.name}</h3>
          <p class="project-description">${project.description}</p>
          
          <div class="project-meta">
            <span class="project-category">
              <i class="icon-tag"></i>
              ${project.category}
            </span>
            ${project.raised && project.raised !== '0' ? `
              <span class="project-raised">
                <i class="icon-chart"></i>
                ${Utils.formatBNB(ethers.utils.formatEther(project.raised))} BNB
              </span>
            ` : ''}
          </div>
        </div>
        
        <div class="project-card-footer">
          <button class="btn btn-primary btn-sm" 
                  onclick="projectsManager.viewProject(${project.id})">
            View Details
          </button>
          ${project.website !== '#' ? `
            <a href="${project.website}" 
               target="_blank" 
               class="btn btn-secondary btn-sm">
              Website
            </a>
          ` : ''}
        </div>
      </div>
    `).join('');
  }

  /**
   * Фільтрація проектів
   */
  filterProjects(filter) {
    let filtered;

    if (filter === 'all') {
      filtered = this.projects;
    } else if (filter === 'active') {
      filtered = this.projects.filter(p => p.isActive || p.status === 'Active');
    } else if (filter === 'coming') {
      filtered = this.projects.filter(p => 
        p.status === 'Coming Soon' || p.status === 'In Development'
      );
    } else {
      // Фільтр по категорії
      filtered = this.projects.filter(p => 
        p.category.toLowerCase() === filter.toLowerCase()
      );
    }

    this.renderProjects(filtered);
  }

  /**
   * Переглянути проект
   */
  viewProject(projectId) {
    const project = this.projects.find(p => p.id === projectId);
    if (!project) return;

    this.selectedProject = project;

    const modalContent = `
      <div class="project-details">
        <div class="project-details-header">
          <img src="${project.icon}" 
               alt="${project.name}" 
               class="project-details-icon"
               onerror="this.src='${CONFIG.ASSETS.icons.logo}'">
          <div class="project-details-info">
            <h2>${project.name}</h2>
            <span class="project-status status-${project.status.toLowerCase().replace(' ', '-')}">
              ${project.status}
            </span>
          </div>
        </div>

        <div class="project-details-body">
          <div class="detail-section">
            <h4>Description</h4>
            <p>${project.description}</p>
          </div>

          <div class="detail-section">
            <h4>Category</h4>
            <p>${project.category}</p>
          </div>

          ${project.address ? `
            <div class="detail-section">
              <h4>Contract Address</h4>
              <p>
                <a href="${Utils.getExplorerLink(project.address)}" 
                   target="_blank" 
                   rel="noopener">
                  ${project.address}
                </a>
              </p>
            </div>
          ` : ''}

          ${project.raised && project.raised !== '0' ? `
            <div class="detail-section">
              <h4>Funds Raised</h4>
              <p>${Utils.formatBNB(ethers.utils.formatEther(project.raised))} BNB</p>
            </div>
          ` : ''}

          <div class="detail-section">
            <h4>Links</h4>
            <div class="project-links">
              ${project.website !== '#' ? `
                <a href="${project.website}" 
                   target="_blank" 
                   class="btn btn-primary">
                  Visit Website
                </a>
              ` : ''}
              ${project.whitepaper !== '#' ? `
                <a href="${project.whitepaper}" 
                   target="_blank" 
                   class="btn btn-secondary">
                  Whitepaper
                </a>
              ` : ''}
            </div>
          </div>

          ${project.isActive ? `
            <div class="detail-section">
              <h4>Investment</h4>
              <p>This project is currently accepting investments through the Investment Pool.</p>
              <button class="btn btn-success" 
                      onclick="projectsManager.investInProject('${project.address}')">
                Invest Now
              </button>
            </div>
          ` : `
            <div class="detail-section">
              <div class="info-box">
                <i class="icon-info"></i>
                <p>This project is ${project.status.toLowerCase()}. Stay tuned for updates!</p>
              </div>
            </div>
          `}
        </div>
      </div>
    `;

    Utils.showModal('Project Details', modalContent, [
      {
        text: 'Close',
        class: 'btn-secondary',
        action: 'close'
      }
    ]);
  }

  /**
   * Інвестувати в проект
   */
  async investInProject(projectAddress) {
    if (!projectAddress || projectAddress === '#') {
      Utils.showNotification('Project not available for investment', 'warning');
      return;
    }

    // Закрити модальне вікно деталей
    Utils.hideModal();

    const modalContent = `
      <div class="invest-form">
        <p>Enter the amount of BNB you want to invest in this project:</p>
        
        <div class="form-group">
          <label for="investAmount">Amount (BNB)</label>
          <input type="number" 
                 id="investAmount" 
                 class="form-control" 
                 placeholder="0.0" 
                 step="0.01" 
                 min="0.01">
          <small>Minimum: 0.01 BNB</small>
        </div>

        <div class="info-box">
          <i class="icon-info"></i>
          <p>Your investment will be processed through the Investment Pool contract.</p>
        </div>
      </div>
    `;

    Utils.showModal(
      'Invest in Project',
      modalContent,
      [
        {
          text: 'Cancel',
          class: 'btn-secondary',
          action: 'cancel',
          callback: () => Utils.hideModal()
        },
        {
          text: 'Invest',
          class: 'btn-primary',
          action: 'invest',
          callback: () => this.executeInvestment(projectAddress)
        }
      ]
    );
  }

  /**
   * Виконати інвестицію
   */
  async executeInvestment(projectAddress) {
    const input = document.getElementById('investAmount');
    if (!input || !input.value) {
      Utils.showNotification('Please enter investment amount', 'warning');
      return;
    }

    const amount = input.value;

    if (!Utils.isValidBNBAmount(amount, 0.01)) {
      Utils.showNotification('Invalid amount (minimum 0.01 BNB)', 'error');
      return;
    }

    Utils.hideModal();
    Utils.showLoader(true, 'Processing investment...');

    try {
      // TODO: Реалізувати виклик контракту для інвестиції
      // Поки що показуємо повідомлення
      await Utils.sleep(2000);

      Utils.showNotification(
        `Investment of ${amount} BNB successfully processed!`,
        'success'
      );

      // Оновити проекти
      await this.loadProjects();

    } catch (error) {
      console.error('❌ Investment error:', error);
      Utils.showNotification(Utils.formatError(error), 'error');
    } finally {
      Utils.hideLoader();
    }
  }

  /**
   * Пошук проектів
   */
  searchProjects(query) {
    if (!query) {
      this.renderProjects();
      return;
    }

    query = query.toLowerCase();

    const filtered = this.projects.filter(project => {
      return (
        project.name.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query) ||
        project.category.toLowerCase().includes(query)
      );
    });

    this.renderProjects(filtered);
  }
}

// Створити глобальний екземпляр
const projectsManager = new ProjectsManager();
