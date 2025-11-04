/* jshint esversion: 8 */
/* global CONFIG, web3Manager, contracts, Utils, ethers */

/**
 * Matrix Manager - ПОВНІСТЮ ПЕРЕПИСАНО
 * Використовує getMatrixInfo() та Events для відображення
 */

class MatrixManager {
  constructor() {
    this.currentLevel = 1;
    this.currentUser = null;
    this.matrixData = null;
  }

  async init() {
    console.log('🔷 Initializing Matrix Manager...');
    
    if (!web3Manager.connected) {
      console.log('⚠️ Wallet not connected');
      return;
    }
    
    this.currentUser = web3Manager.address;
    
    this.setupEventListeners();
    await this.loadMatrix(this.currentLevel);
    
    console.log('✅ Matrix Manager initialized');
  }

  setupEventListeners() {
    const levelButtons = document.getElementById('matrixLevels');
    if (levelButtons) {
      levelButtons.innerHTML = '';
      for (let i = 1; i <= 12; i++) {
        const btn = document.createElement('button');
        btn.className = 'level-btn';
        btn.dataset.level = i;
        btn.textContent = `Level ${i}`;
        if (i === this.currentLevel) {
          btn.classList.add('active');
        }
        btn.addEventListener('click', () => this.switchLevel(i));
        levelButtons.appendChild(btn);
      }
    }
    
    const searchBtn = document.getElementById('matrixSearchBtn');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => this.searchByID());
    }
    
    const searchInput = document.getElementById('matrixSearchInput');
    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.searchByID();
        }
      });
    }
  }

  async switchLevel(level) {
    this.currentLevel = level;
    
    document.querySelectorAll('#matrixLevels .level-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.level) === level);
    });
    
    await this.loadMatrix(level);
  }

  async searchByID() {
    const searchInput = document.getElementById('matrixSearchInput');
    if (!searchInput) return;
    
    const searchValue = searchInput.value.trim();
    if (!searchValue) {
      Utils.showNotification('Please enter a User ID', 'warning');
      return;
    }
    
    try {
      Utils.showLoader(true, 'Searching...');
      
      if (ethers.utils.isAddress(searchValue)) {
        this.currentUser = searchValue;
      } else {
        Utils.showNotification('Please enter valid address', 'warning');
        return;
      }
      
      await this.loadMatrix(this.currentLevel);
      
    } catch (error) {
      console.error('Search error:', error);
      Utils.showNotification('User not found', 'error');
    } finally {
      Utils.hideLoader();
    }
  }

  async loadMatrix(level) {
    if (!this.currentUser) return;
    
    Utils.showLoader(true, 'Loading matrix...');
    
    try {
      this.matrixData = await contracts.getMatrixPositions(this.currentUser, level);
      
      this.renderMatrixVisualization();
      this.renderMatrixTable();
      this.updateMatrixStatistics();
      
      console.log('✅ Matrix loaded for level', level);
      
    } catch (error) {
      console.error('❌ Load matrix error:', error);
      Utils.showNotification('Failed to load matrix', 'error');
    } finally {
      Utils.hideLoader();
    }
  }

  renderMatrixVisualization() {
    if (!this.matrixData || !this.matrixData.positions) return;
    
    const topPosition = this.matrixData.positions.find(p => p.position === 0);
    this.renderPosition('topPosition', topPosition);
    
    for (let i = 1; i <= 2; i++) {
      const position = this.matrixData.positions.find(p => p.position === i);
      this.renderPosition(`position${i}`, position);
    }
    
    for (let i = 3; i <= 6; i++) {
      const position = this.matrixData.positions.find(p => p.position === i);
      this.renderPosition(`position${i}`, position);
    }
  }

  renderPosition(elementId, positionData) {
    const positionEl = document.getElementById(elementId);
    if (!positionEl) return;
    
    const avatar = positionEl.querySelector('.position-avatar');
    const idEl = positionEl.querySelector('.position-id');
    const typeEl = positionEl.querySelector('.position-type') || positionEl.querySelector('.position-level');
    
    if (positionData && positionData.isFilled) {
      positionEl.classList.remove('empty');
      positionEl.classList.add('filled');
      
      if (positionData.user.toLowerCase() === CONFIG.WALLETS.CHARITY.toLowerCase()) {
        positionEl.classList.add('charity');
      } else if (positionData.placedBy === ethers.constants.AddressZero) {
        positionEl.classList.add('technical');
      } else {
        positionEl.classList.add('partner');
      }
      
      if (avatar) {
        avatar.textContent = positionData.userId ? positionData.userId.substring(0, 2) : '?';
      }
      
      if (idEl) {
        idEl.textContent = positionData.userId || Utils.formatAddress(positionData.user);
      }
      
      if (typeEl) {
        typeEl.textContent = `Position ${positionData.position}`;
      }
      
      positionEl.style.cursor = 'pointer';
      positionEl.onclick = () => this.showPositionDetails(positionData);
      
    } else {
      positionEl.classList.remove('filled', 'partner', 'charity', 'technical');
      positionEl.classList.add('empty');
      
      if (avatar) {
        avatar.textContent = '?';
      }
      
      if (idEl) {
        idEl.textContent = 'Empty';
      }
      
      if (typeEl) {
        typeEl.textContent = 'Available';
      }
      
      positionEl.style.cursor = 'default';
      positionEl.onclick = null;
    }
  }

  /**
   * Отобразить таблицу матрицы
   * 🔥 ИСПРАВЛЕНО: Показываем ВСЕ позиции (не только заполненные)
   * Убрано ограничение на 20 строк - показываем 2^N позиций
   */
  renderMatrixTable() {
    const tableBody = document.getElementById('matrixTableBody');
    if (!tableBody || !this.matrixData) return;
    
    const allPositions = this.matrixData.positions || [];
    
    if (allPositions.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="no-data">No matrix data available</td>
        </tr>
      `;
      return;
    }
    
    // 🔥 ИСПРАВЛЕНО: Показываем ВСЕ позиции (включая пустые), а не только filled
    // Сортируем по номеру позиции
    const sortedPositions = [...allPositions].sort((a, b) => a.position - b.position);
    
    tableBody.innerHTML = sortedPositions.map((position, index) => {
      // Определяем класс для статуса
      const statusClass = position.isFilled ? 'filled' : 'empty';
      const statusText = position.isFilled ? 'Active' : 'Empty';
      
      return `
        <tr class="${statusClass}">
          <td>${index + 1}</td>
          <td>${position.userId || '-'}</td>
          <td>${position.isFilled ? `<a href="${CONFIG.NETWORK.explorer}/address/${position.user}" target="_blank" rel="noopener">${Utils.formatAddress(position.user)}</a>` : '-'}</td>
          <td>${position.placedBy && position.placedBy !== ethers.constants.AddressZero ? Utils.formatAddress(position.placedBy) : '-'}</td>
          <td>${position.isFilled ? Utils.formatDate(position.timestamp) : '-'}</td>
          <td>${this.currentLevel}</td>
          <td><span class="position-badge position-${position.position} ${statusClass}">${statusText} (Pos ${position.position})</span></td>
        </tr>
      `;
    }).join('');
    
    console.log(`📊 Displayed ${sortedPositions.length} positions in table`);
  }

  /**
   * Обновить статистику матрицы
   * 🔥 ИСПРАВЛЕНО: Правильный подсчёт всех типов позиций
   */
  updateMatrixStatistics() {
    if (!this.matrixData || !this.matrixData.positions) return;
    
    const allPositions = this.matrixData.positions;
    const filled = allPositions.filter(p => p.isFilled);
    
    // Общее количество заполненных позиций
    const totalEl = document.getElementById('totalActivePositions');
    if (totalEl) {
      totalEl.textContent = filled.length;
    }
    
    // Партнёрские позиции (не Charity и не Technical)
    const partnerEl = document.getElementById('partnerPositions');
    if (partnerEl) {
      const partners = filled.filter(p => 
        p.user.toLowerCase() !== CONFIG.WALLETS.CHARITY.toLowerCase() &&
        p.placedBy && p.placedBy !== ethers.constants.AddressZero &&
        p.user !== ethers.constants.AddressZero
      );
      partnerEl.textContent = partners.length;
    }
    
    // Благотворительные позиции
    const charityEl = document.getElementById('charityPositions');
    if (charityEl) {
      const charity = filled.filter(p => 
        p.user.toLowerCase() === CONFIG.WALLETS.CHARITY.toLowerCase()
      );
      charityEl.textContent = charity.length;
    }
    
    // Технические позиции (размещены системой)
    const technicalEl = document.getElementById('technicalPositions');
    if (technicalEl) {
      const technical = filled.filter(p => 
        (!p.placedBy || p.placedBy === ethers.constants.AddressZero) &&
        p.user.toLowerCase() !== CONFIG.WALLETS.CHARITY.toLowerCase() &&
        p.user !== ethers.constants.AddressZero
      );
      technicalEl.textContent = technical.length;
    }
    
    // Обновляем информацию о текущем уровне
    const levelInfoEl = document.getElementById('currentMatrixLevel');
    if (levelInfoEl) {
      levelInfoEl.textContent = `Level ${this.currentLevel}`;
    }
    
    // Максимальное количество позиций для этого уровня
    const maxPositionsEl = document.getElementById('maxMatrixPositions');
    if (maxPositionsEl) {
      const maxPositions = Math.pow(2, this.currentLevel);
      maxPositionsEl.textContent = `${maxPositions} positions`;
    }
  }

  showPositionDetails(positionData) {
    const modal = document.getElementById('positionModal');
    if (!modal) return;
    
    document.getElementById('modalPositionId').textContent = positionData.userId || '-';
    document.getElementById('modalSponsorId').textContent = Utils.formatAddress(positionData.placedBy);
    document.getElementById('modalAddress').textContent = positionData.user;
    document.getElementById('modalLevel').textContent = this.currentLevel;
    document.getElementById('modalStatus').textContent = positionData.isFilled ? 'Active' : 'Empty';
    document.getElementById('modalQualification').textContent = `Position ${positionData.position}`;
    
    modal.style.display = 'block';
    
    const closeBtn = modal.querySelector('.close');
    if (closeBtn) {
      closeBtn.onclick = () => modal.style.display = 'none';
    }
    
    const closeModalBtn = document.getElementById('closeModalBtn');
    if (closeModalBtn) {
      closeModalBtn.onclick = () => modal.style.display = 'none';
    }
    
    const viewMatrixBtn = document.getElementById('viewMatrixBtn');
    if (viewMatrixBtn) {
      viewMatrixBtn.onclick = () => {
        modal.style.display = 'none';
        this.currentUser = positionData.user;
        this.loadMatrix(this.currentLevel);
      };
    }
  }
}

const matrixManager = new MatrixManager();
