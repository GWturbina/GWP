/* jshint esversion: 8 */
/* global web3Manager, contracts, Utils, CONFIG, ethers */

/**
 * Matrix Manager - Візуалізація матриці 1-2-4
 * GlobalWay DApp v2.1
 */
class MatrixManager {
  constructor() {
    this.currentLevel = 1;
    this.matrixData = null;
    this.userInfo = null;
  }

  /**
   * Ініціалізація Matrix Manager
   */
  async init() {
    console.log('🌳 Initializing Matrix Manager...');
    
    try {
      this.setupEventListeners();
      this.setupLevelSelector();
      await this.loadMatrix(this.currentLevel);
      
      console.log('✅ Matrix Manager initialized');
    } catch (error) {
      console.error('❌ Matrix init error:', error);
    }
  }

  /**
   * Налаштування обробників подій
   */
  setupEventListeners() {
    // Level buttons
    const levelBtns = document.querySelectorAll('.matrix-level-btn');
    levelBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const level = parseInt(btn.dataset.level);
        this.switchLevel(level);
      });
    });

    // Level selector dropdown
    const levelSelector = document.getElementById('matrixLevelSelect');
    if (levelSelector) {
      levelSelector.addEventListener('change', (e) => {
        this.switchLevel(parseInt(e.target.value));
      });
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshMatrixBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.loadMatrix(this.currentLevel);
      });
    }

    // Previous/Next level buttons
    const prevBtn = document.getElementById('matrixPrevLevel');
    const nextBtn = document.getElementById('matrixNextLevel');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.currentLevel > 1) {
          this.switchLevel(this.currentLevel - 1);
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (this.currentLevel < 12) {
          this.switchLevel(this.currentLevel + 1);
        }
      });
    }
  }

  /**
   * Налаштування селектора рівнів
   */
  setupLevelSelector() {
    const selector = document.getElementById('matrixLevelSelect');
    if (!selector) return;

    // Створити options для всіх 12 рівнів
    selector.innerHTML = '';
    for (let i = 1; i <= 12; i++) {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = `Level ${i}`;
      if (i === this.currentLevel) {
        option.selected = true;
      }
      selector.appendChild(option);
    }
  }

  /**
   * Перемикання рівня
   */
  async switchLevel(level) {
    if (level < 1 || level > 12) {
      console.warn('Invalid level:', level);
      return;
    }

    if (level === this.currentLevel) {
      return; // Вже на цьому рівні
    }

    this.currentLevel = level;
    
    // Оновити селектор
    const selector = document.getElementById('matrixLevelSelect');
    if (selector) {
      selector.value = level;
    }

    // Оновити активну кнопку
    document.querySelectorAll('.matrix-level-btn').forEach(btn => {
      if (parseInt(btn.dataset.level) === level) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    await this.loadMatrix(level);
  }

  /**
   * Завантаження даних матриці
   */
  async loadMatrix(level) {
    if (!web3Manager || !web3Manager.connected) {
      this.showNotConnected();
      return;
    }

    const address = web3Manager.address;
    Utils.showLoader(true, `Loading Matrix Level ${level}...`);

    try {
      console.log(`🌳 Loading matrix for level ${level}`);

      // Завантажити інформацію користувача (якщо ще не завантажена)
      if (!this.userInfo) {
        this.userInfo = await contracts.getUserInfo(address);
      }

      // Отримати інформацію про рівень
      const levelInfo = await contracts.getUserLevel(address, level);

      // Перевірити чи рівень активований
      if (!levelInfo || !levelInfo.isActive) {
        this.showInactiveLevel(level);
        return;
      }

      // Отримати партнерів на цьому рівні
      const partners = await contracts.getUserPartners(address, level);

      // Структура матриці
      this.matrixData = {
        level: level,
        isActive: true,
        userAddress: address,
        userId: this.userInfo.id,
        partnersCount: partners.length,
        maxPartners: 6, // Структура 1-2-4 = 6 позицій
        cyclesCount: levelInfo.cyclesCount || 0,
        partners: []
      };

      // Завантажити детальну інформацію про партнерів
      for (const partnerAddress of partners) {
        try {
          const partnerInfo = await contracts.getUserInfo(partnerAddress);
          this.matrixData.partners.push({
            address: partnerAddress,
            id: partnerInfo.id,
            activeLevel: partnerInfo.activeLevel,
            rankLevel: partnerInfo.rankLevel,
            isActive: true
          });
        } catch (error) {
          console.error('Error loading partner info:', partnerAddress, error);
          // Додати з мінімальною інформацією
          this.matrixData.partners.push({
            address: partnerAddress,
            id: '0',
            activeLevel: 0,
            rankLevel: 0,
            isActive: false
          });
        }
      }

      console.log(`✅ Matrix data loaded:`, this.matrixData);

      // Відобразити матрицю
      this.renderMatrix();
      this.updateMatrixStats();

    } catch (error) {
      console.error('❌ Load matrix error:', error);
      Utils.showNotification('Failed to load matrix', 'error');
      this.showError(error);
    } finally {
      Utils.hideLoader();
    }
  }

  /**
   * Рендеринг матриці
   */
  renderMatrix() {
    const container = document.getElementById('matrixTree');
    if (!container) {
      console.error('Matrix container not found');
      return;
    }

    if (!this.matrixData || !this.matrixData.isActive) {
      return;
    }

    // Отримати позиції для відображення
    const positions = this.getMatrixPositions();

    // Створити HTML структуру матриці
    container.innerHTML = `
      <div class="matrix-structure">
        <!-- Level 1: Root (You) -->
        <div class="matrix-tier matrix-tier-1">
          <div class="matrix-position">
            ${this.renderNode(positions[0], 0, true)}
          </div>
        </div>

        <!-- Connector -->
        <div class="matrix-connector"></div>

        <!-- Level 2: 2 partners -->
        <div class="matrix-tier matrix-tier-2">
          <div class="matrix-position">
            ${this.renderNode(positions[1], 1)}
          </div>
          <div class="matrix-position">
            ${this.renderNode(positions[2], 2)}
          </div>
        </div>

        <!-- Connector -->
        <div class="matrix-connector"></div>

        <!-- Level 3: 4 partners -->
        <div class="matrix-tier matrix-tier-3">
          <div class="matrix-position">
            ${this.renderNode(positions[3], 3)}
          </div>
          <div class="matrix-position">
            ${this.renderNode(positions[4], 4)}
          </div>
          <div class="matrix-position">
            ${this.renderNode(positions[5], 5)}
          </div>
          <div class="matrix-position">
            ${this.renderNode(positions[6], 6)}
          </div>
        </div>
      </div>
    `;

    // Додати обробники для кліків на вузли
    this.attachNodeClickHandlers();
  }

  /**
   * Отримати позиції в матриці
   */
  getMatrixPositions() {
    // Масив для 7 позицій (0 = root, 1-6 = partners)
    const positions = new Array(7).fill(null);

    // Позиція 0 - це ми (root)
    if (this.matrixData) {
      positions[0] = {
        address: this.matrixData.userAddress,
        id: this.matrixData.userId,
        isRoot: true,
        isActive: true
      };

      // Розподілити партнерів по позиціях
      // Структура: позиція 1-2 на другому рівні, 3-6 на третьому
      this.matrixData.partners.forEach((partner, index) => {
        if (index < 6) {
          positions[index + 1] = partner;
        }
      });
    }

    return positions;
  }

  /**
   * Рендеринг окремого вузла (партнера)
   */
  renderNode(partner, position, isRoot = false) {
    if (!partner) {
      // Пуста позиція
      return `
        <div class="matrix-node matrix-node-empty" data-position="${position}">
          <div class="node-avatar">
            <span class="node-avatar-placeholder">?</span>
          </div>
          <div class="node-info">
            <div class="node-label">Empty</div>
            <div class="node-position">Position ${position}</div>
          </div>
        </div>
      `;
    }

    // Заповнена позиція
    const nodeClass = isRoot ? 'matrix-node matrix-node-root' : 'matrix-node matrix-node-filled';
    const label = isRoot ? 'You' : Utils.formatUserId(partner.id);

    return `
      <div class="${nodeClass}" data-position="${position}" data-address="${partner.address}">
        <div class="node-avatar">
          <span class="node-avatar-icon">✓</span>
        </div>
        <div class="node-info">
          <div class="node-label">${label}</div>
          <div class="node-address">${Utils.formatAddress(partner.address)}</div>
          ${!isRoot ? `<div class="node-level">Level ${partner.activeLevel}</div>` : ''}
        </div>
        ${!isRoot ? '<div class="node-actions"><button class="btn-view-partner">View</button></div>' : ''}
      </div>
    `;
  }

  /**
   * Додати обробники кліків на вузли
   */
  attachNodeClickHandlers() {
    const nodes = document.querySelectorAll('.matrix-node-filled');
    nodes.forEach(node => {
      const viewBtn = node.querySelector('.btn-view-partner');
      if (viewBtn) {
        viewBtn.addEventListener('click', () => {
          const address = node.dataset.address;
          if (address) {
            this.viewPartnerDetails(address);
          }
        });
      }
    });
  }

  /**
   * Показати деталі партнера
   */
  async viewPartnerDetails(address) {
    Utils.showLoader(true, 'Loading partner details...');

    try {
      const partnerInfo = await contracts.getUserInfo(address);
      const teamStats = await contracts.getTeamStats(address);

      const modalContent = `
        <div class="partner-details">
          <div class="detail-header">
            <div class="detail-avatar">
              <span class="avatar-icon">👤</span>
            </div>
            <div class="detail-header-info">
              <h4>${Utils.formatUserId(partnerInfo.id)}</h4>
              <a href="${Utils.getExplorerLink(address)}" target="_blank" rel="noopener">
                ${Utils.formatAddress(address)}
              </a>
            </div>
          </div>

          <div class="detail-body">
            <div class="detail-section">
              <h5>Profile Information</h5>
              <div class="detail-row">
                <span class="detail-label">Rank:</span>
                <span class="detail-value">
                  <span class="rank-badge rank-${partnerInfo.rankLevel}">
                    ${Utils.getRankName(partnerInfo.rankLevel)}
                  </span>
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Active Level:</span>
                <span class="detail-value">${partnerInfo.activeLevel}/12</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Partners:</span>
                <span class="detail-value">${partnerInfo.partnersCount}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Team Size:</span>
                <span class="detail-value">${teamStats.totalTeamSize || 0}</span>
              </div>
            </div>

            <div class="detail-section">
              <h5>Registration</h5>
              <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span class="detail-value">${Utils.formatDate(partnerInfo.registrationTime)}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Sponsor ID:</span>
                <span class="detail-value">${Utils.formatUserId(partnerInfo.sponsorId)}</span>
              </div>
            </div>
          </div>
        </div>
      `;

      Utils.showModal('Partner Details', modalContent);

    } catch (error) {
      console.error('View partner details error:', error);
      Utils.showNotification('Failed to load partner details', 'error');
    } finally {
      Utils.hideLoader();
    }
  }

  /**
   * Оновити статистику матриці
   */
  updateMatrixStats() {
    if (!this.matrixData) return;

    // Оновити current level
    const currentLevelEl = document.getElementById('matrixCurrentLevel');
    if (currentLevelEl) {
      currentLevelEl.textContent = this.matrixData.level;
    }

    // Оновити partners count
    const partnersCountEl = document.getElementById('matrixPartnersCount');
    if (partnersCountEl) {
      partnersCountEl.textContent = `${this.matrixData.partnersCount}/${this.matrixData.maxPartners}`;
    }

    // Оновити cycles
    const cyclesEl = document.getElementById('matrixCycles');
    if (cyclesEl) {
      cyclesEl.textContent = this.matrixData.cyclesCount;
    }

    // Прогрес заповнення
    const progress = (this.matrixData.partnersCount / this.matrixData.maxPartners) * 100;
    const progressEl = document.getElementById('matrixProgress');
    if (progressEl) {
      progressEl.textContent = `${progress.toFixed(0)}%`;
    }

    const progressBarEl = document.getElementById('matrixProgressBar');
    if (progressBarEl) {
      progressBarEl.style.width = `${progress}%`;
    }

    // Level price
    const priceEl = document.getElementById('matrixLevelPrice');
    if (priceEl && CONFIG.LEVEL_PRICES) {
      const price = CONFIG.LEVEL_PRICES[this.matrixData.level - 1];
      priceEl.textContent = `${price} BNB`;
    }
  }

  /**
   * Показати неактивний рівень
   */
  showInactiveLevel(level) {
    const container = document.getElementById('matrixTree');
    if (!container) return;

    const price = CONFIG.LEVEL_PRICES ? CONFIG.LEVEL_PRICES[level - 1] : '0';

    container.innerHTML = `
      <div class="matrix-inactive">
        <div class="inactive-icon">🔒</div>
        <h3>Level ${level} Not Active</h3>
        <p>Activate this level to see your matrix structure and start earning.</p>
        <div class="inactive-info">
          <div class="info-item">
            <span class="info-label">Activation Price:</span>
            <span class="info-value">${price} BNB</span>
          </div>
          <div class="info-item">
            <span class="info-label">Matrix Structure:</span>
            <span class="info-value">1-2-4 (6 partners)</span>
          </div>
        </div>
        <button class="btn btn-primary btn-lg" onclick="app.buyLevel(${level})">
          Activate Level ${level}
        </button>
      </div>
    `;

    // Оновити статистику
    this.updateInactiveStats(level);
  }

  /**
   * Оновити статистику для неактивного рівня
   */
  updateInactiveStats(level) {
    const currentLevelEl = document.getElementById('matrixCurrentLevel');
    if (currentLevelEl) {
      currentLevelEl.textContent = level;
    }

    const partnersCountEl = document.getElementById('matrixPartnersCount');
    if (partnersCountEl) {
      partnersCountEl.textContent = '0/6';
    }

    const cyclesEl = document.getElementById('matrixCycles');
    if (cyclesEl) {
      cyclesEl.textContent = '0';
    }

    const progressEl = document.getElementById('matrixProgress');
    if (progressEl) {
      progressEl.textContent = '0%';
    }

    const progressBarEl = document.getElementById('matrixProgressBar');
    if (progressBarEl) {
      progressBarEl.style.width = '0%';
    }

    const priceEl = document.getElementById('matrixLevelPrice');
    if (priceEl && CONFIG.LEVEL_PRICES) {
      const price = CONFIG.LEVEL_PRICES[level - 1];
      priceEl.textContent = `${price} BNB`;
    }
  }

  /**
   * Показати що не підключено
   */
  showNotConnected() {
    const container = document.getElementById('matrixTree');
    if (!container) return;

    container.innerHTML = `
      <div class="matrix-not-connected">
        <div class="not-connected-icon">🔌</div>
        <h3>Wallet Not Connected</h3>
        <p>Please connect your wallet to view the matrix structure.</p>
        <button class="btn btn-primary" onclick="web3Manager.connect()">
          Connect Wallet
        </button>
      </div>
    `;
  }

  /**
   * Показати помилку
   */
  showError(error) {
    const container = document.getElementById('matrixTree');
    if (!container) return;

    const errorMessage = Utils.formatError(error);

    container.innerHTML = `
      <div class="matrix-error">
        <div class="error-icon">⚠️</div>
        <h3>Error Loading Matrix</h3>
        <p>${errorMessage}</p>
        <button class="btn btn-secondary" onclick="matrixManager.loadMatrix(matrixManager.currentLevel)">
          Try Again
        </button>
      </div>
    `;
  }

  /**
   * Очистити дані
   */
  clear() {
    this.matrixData = null;
    this.userInfo = null;
    const container = document.getElementById('matrixTree');
    if (container) {
      container.innerHTML = '';
    }
  }
}

// Створити глобальний екземпляр
const matrixManager = new MatrixManager();
