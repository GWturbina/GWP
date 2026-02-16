// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Referral Links Module v3.0
// Real Short Links + Server-Side OG Previews + Anti-Ban
//
// Короткие ссылки: domain.com/r/{dirCode}{base36userId}
// Сервер (api/r.js) генерирует HTML с OG-тегами для мессенджеров
// Превью выбирается пользователем из загруженных админом картинок
// ═══════════════════════════════════════════════════════════════════

const referralsModule = {
  state: {
    userId: null,
    userAddress: null,
    selectedDirection: 'gw',
    selectedPreview: 0,
    generatedLinks: [],
    currentDomainIndex: 0
  },

  // ═══════════════════════════════════════════════════════════════
  // ИНИЦИАЛИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  async init() {
    console.log('🔗 Referrals module v3 init');
    this.render();
    
    if (app?.state?.address || app?.state?.userAddress) {
      this.state.userAddress = app.state.userAddress;
      await this.loadUserData();
    }
    
    this.bindEvents();
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ
  // ═══════════════════════════════════════════════════════════════
  async loadUserData() {
    try {
      const matrixRegistry = await app.getContract('MatrixRegistry');
      if (matrixRegistry) {
        const userId = await matrixRegistry.getUserIdByAddress(this.state.userAddress);
        this.state.userId = userId.toString();
        console.log('✅ User ID loaded:', this.state.userId);
        this.updateUI();
      }
    } catch (err) {
      console.error('❌ Error loading user data:', err);
      if (app?.state?.userId) {
        this.state.userId = app.state.userId;
        this.updateUI();
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // РЕНДЕР СТРАНИЦЫ
  // ═══════════════════════════════════════════════════════════════
  render() {
    const container = document.getElementById('referrals');
    if (!container) return;

    const directions = CONFIG.REFERRAL?.directions || {};
    const dirKeys = Object.keys(directions);

    container.innerHTML = `
<div class="referrals-page">
  
  <!-- ЗАГОЛОВОК -->
  <div class="ref-header">
    <h2>🔗 Реферальные ссылки</h2>
    <p class="ref-subtitle">Создавайте короткие ссылки с красивым превью для мессенджеров</p>
  </div>

  <!-- ВЫБОР НАПРАВЛЕНИЯ -->
  <div class="ref-directions">
    <h3>📌 Направление</h3>
    <div class="direction-cards">
      ${dirKeys.map(key => {
        const d = directions[key];
        return `
        <div class="direction-card ${key === 'gw' ? 'active' : ''}" data-dir="${key}">
          <div class="dir-icon">${d.icon}</div>
          <div class="dir-info">
            <span class="dir-name">${d.name}</span>
            <span class="dir-desc">${d.descriptionRu || d.description}</span>
          </div>
          <div class="dir-check">✓</div>
        </div>`;
      }).join('')}
    </div>
  </div>

  <!-- ГЕНЕРАТОР ССЫЛОК -->
  <div class="ref-generator">
    <h3>⚡ Генератор ссылок</h3>
    
    <!-- User Info -->
    <div class="ref-user-info" id="refUserInfo">
      <div class="ref-no-wallet" id="refNoWallet">
        <p>⚠️ Подключите кошелёк для генерации реферальных ссылок</p>
      </div>
      <div class="ref-has-wallet" id="refHasWallet" style="display:none;">
        <div class="ref-id-badge">
          <span class="ref-id-label">Ваш ID:</span>
          <span class="ref-id-value" id="refUserId">—</span>
        </div>
      </div>
    </div>

    <!-- НАСТРОЙКИ ССЫЛКИ -->
    <div class="ref-link-settings" id="refLinkSettings" style="display:none;">
      
      <!-- Превью для мессенджеров -->
      <div class="ref-setting-row">
        <label>🖼️ Превью для мессенджеров:</label>
        <div class="ref-preview-grid" id="refPreviewGrid">
          <!-- Заполняется динамически -->
        </div>
        <span class="ref-setting-hint">Эта картинка покажется в Telegram, WhatsApp при отправке ссылки</span>
      </div>

      <!-- Слоган -->
      <div class="ref-setting-row">
        <label>✍️ Слоган (текст под превью в мессенджере):</label>
        <input type="text" id="refSlogan" placeholder="Присоединяйся к команде! Вместе строим Web3" maxlength="120" class="ref-input">
        <span class="ref-setting-hint">Оставьте пустым — будет стандартное описание</span>
      </div>

      <!-- Имя -->
      <div class="ref-setting-row">
        <label>🏷️ Ваше имя (необязательно):</label>
        <input type="text" id="refUserName" placeholder="Григорий" maxlength="30" class="ref-input">
      </div>

      <!-- Домен -->
      <div class="ref-setting-row">
        <label>🌐 Домен:</label>
        <div class="ref-domain-selector" id="refDomainSelector">
          <!-- Заполняется динамически -->
        </div>
      </div>

      <!-- Антибан -->
      <div class="ref-setting-row ref-antiban-row">
        <label>
          <input type="checkbox" id="refAntiBanToggle" checked>
          🛡️ Антибан (ротация доменов)
        </label>
        <span class="ref-antiban-hint">Каждая ссылка — через разный домен</span>
      </div>

      <button class="ref-generate-btn" id="refGenerateBtn">
        ⚡ Сгенерировать короткую ссылку
      </button>
    </div>
  </div>

  <!-- РЕЗУЛЬТАТ -->
  <div class="ref-result" id="refResult" style="display:none;">
    <h3>📋 Ваша ссылка готова</h3>
    
    <!-- Превью как будет в мессенджере -->
    <div class="ref-messenger-preview" id="refMessengerPreview">
      <!-- Заполняется динамически -->
    </div>

    <!-- КОРОТКАЯ ССЫЛКА (главная) -->
    <div class="ref-link-box">
      <div class="ref-link-short">
        <span class="ref-link-short-label">Короткая ссылка:</span>
        <span class="ref-link-short-text" id="refShortLink">—</span>
        <button class="ref-btn" id="refCopyShort">📋 Копировать</button>
      </div>
    </div>

    <!-- Полная ссылка (запасная) -->
    <div class="ref-link-box">
      <div class="ref-link-display">
        <span class="ref-link-text" id="refLinkText">—</span>
        <button class="ref-btn" id="refCopyLink">📋</button>
      </div>
    </div>

    <!-- ШАРИНГ -->
    <div class="ref-share-buttons">
      <button class="ref-share-btn ref-share-telegram" id="refShareTelegram">
        ✈️ Telegram
      </button>
      <button class="ref-share-btn ref-share-whatsapp" id="refShareWhatsApp">
        💬 WhatsApp
      </button>
      <button class="ref-share-btn ref-share-twitter" id="refShareTwitter">
        🐦 Twitter
      </button>
      <button class="ref-share-btn ref-share-facebook" id="refShareFacebook">
        📘 Facebook
      </button>
    </div>
  </div>

  <!-- ИСТОРИЯ -->
  <div class="ref-history">
    <h3>📊 Мои ссылки</h3>
    <div class="ref-history-list" id="refHistoryList">
      <p class="ref-history-empty">Ещё не создано ни одной ссылки</p>
    </div>
  </div>

</div>`;
  },

  // ═══════════════════════════════════════════════════════════════
  // ПРИВЯЗКА СОБЫТИЙ
  // ═══════════════════════════════════════════════════════════════
  bindEvents() {
    // Выбор направления
    document.querySelectorAll('.direction-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.direction-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.state.selectedDirection = card.dataset.dir;
        this.state.selectedPreview = 0;
        this.renderPreviewGrid();
        this.updateSloganPlaceholder();
      });
    });

    // Генерация
    const genBtn = document.getElementById('refGenerateBtn');
    if (genBtn) genBtn.addEventListener('click', () => this.generateLink());

    // Копирование
    document.getElementById('refCopyLink')?.addEventListener('click', () => this.copyToClipboard('refLinkText'));
    document.getElementById('refCopyShort')?.addEventListener('click', () => this.copyToClipboard('refShortLink'));

    // Шаринг
    document.getElementById('refShareTelegram')?.addEventListener('click', () => this.shareLink('telegram'));
    document.getElementById('refShareWhatsApp')?.addEventListener('click', () => this.shareLink('whatsapp'));
    document.getElementById('refShareTwitter')?.addEventListener('click', () => this.shareLink('twitter'));
    document.getElementById('refShareFacebook')?.addEventListener('click', () => this.shareLink('facebook'));
  },

  // ═══════════════════════════════════════════════════════════════
  // ОБНОВЛЕНИЕ UI
  // ═══════════════════════════════════════════════════════════════
  updateUI() {
    const noWallet = document.getElementById('refNoWallet');
    const hasWallet = document.getElementById('refHasWallet');
    const settings = document.getElementById('refLinkSettings');
    const userIdEl = document.getElementById('refUserId');

    if (this.state.userId) {
      if (noWallet) noWallet.style.display = 'none';
      if (hasWallet) hasWallet.style.display = 'flex';
      if (settings) settings.style.display = 'block';
      if (userIdEl) userIdEl.textContent = this.state.userId;
      this.renderDomainSelector();
      this.renderPreviewGrid();
      this.updateSloganPlaceholder();
      this.loadHistory();
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ПРЕВЬЮ-КАРТИНКИ (сетка для выбора)
  // ═══════════════════════════════════════════════════════════════
  renderPreviewGrid() {
    const container = document.getElementById('refPreviewGrid');
    if (!container) return;

    const dir = this.state.selectedDirection;
    const images = CONFIG.REFERRAL?.previewImages?.[dir] || [];

    if (images.length === 0) {
      container.innerHTML = '<span class="ref-no-previews">Превью ещё не загружены. Используется стандартное.</span>';
      return;
    }

    container.innerHTML = images.map(img => `
      <div class="ref-preview-thumb ${img.index === this.state.selectedPreview ? 'active' : ''}" 
           data-preview="${img.index}" 
           title="${img.name}">
        <img src="assets/og/${img.file}" alt="${img.name}" 
             onerror="this.parentElement.classList.add('no-img'); this.style.display='none';">
        <span class="ref-preview-name">${img.name}</span>
        <div class="ref-preview-check">✓</div>
      </div>
    `).join('');

    // Клики по превью
    container.querySelectorAll('.ref-preview-thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        container.querySelectorAll('.ref-preview-thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
        this.state.selectedPreview = parseInt(thumb.dataset.preview) || 0;
      });
    });
  },

  // ═══════════════════════════════════════════════════════════════
  // ПЛЕЙСХОЛДЕР СЛОГАНА (меняется по направлению)
  // ═══════════════════════════════════════════════════════════════
  updateSloganPlaceholder() {
    const input = document.getElementById('refSlogan');
    if (!input) return;

    const dir = CONFIG.REFERRAL?.directions?.[this.state.selectedDirection];
    const placeholders = {
      gw: 'Присоединяйся к команде! Строим Web3 вместе',
      cg: 'Создавай и дари цифровые открытки с AI!',
      nss: 'Обменивай крипту быстро и без посредников!'
    };
    input.placeholder = placeholders[this.state.selectedDirection] || dir?.descriptionRu || '';
  },

  // ═══════════════════════════════════════════════════════════════
  // СЕЛЕКТОР ДОМЕНОВ
  // ═══════════════════════════════════════════════════════════════
  renderDomainSelector() {
    const container = document.getElementById('refDomainSelector');
    if (!container) return;

    const domains = CONFIG.REFERRAL?.domains || [];
    const activeDomains = domains.filter(d => d.active);

    if (activeDomains.length === 0) {
      container.innerHTML = '<span class="ref-no-domains">Нет активных доменов</span>';
      return;
    }

    container.innerHTML = activeDomains.map((d, i) => `
      <label class="ref-domain-option ${d.primary ? 'primary' : ''}">
        <input type="radio" name="refDomain" value="${d.url}" ${i === 0 ? 'checked' : ''}>
        <span class="ref-domain-url">${d.url.replace('https://', '')}${d.primary ? ' ⭐' : ''}</span>
      </label>
    `).join('');
  },

  // ═══════════════════════════════════════════════════════════════
  // ПОЛУЧЕНИЕ ДОМЕНА (с антибаном)
  // ═══════════════════════════════════════════════════════════════
  getDomain() {
    const antiBan = document.getElementById('refAntiBanToggle');
    const domains = CONFIG.REFERRAL?.domains?.filter(d => d.active) || [];

    if (antiBan?.checked && CONFIG.REFERRAL?.antiBan?.rotateOnShare && domains.length > 1) {
      const domain = domains[this.state.currentDomainIndex % domains.length];
      this.state.currentDomainIndex++;
      return domain.url;
    }

    const selected = document.querySelector('input[name="refDomain"]:checked');
    if (selected) return selected.value;

    return CONFIG.REFERRAL?.antiBan?.fallbackDomain || 'https://gwp-navy.vercel.app';
  },

  // ═══════════════════════════════════════════════════════════════
  // ГЕНЕРАЦИЯ КОРОТКОЙ ССЫЛКИ
  // ═══════════════════════════════════════════════════════════════
  generateLink() {
    if (!this.state.userId) {
      app?.showNotification?.('Подключите кошелёк!', 'error');
      return;
    }

    const dir = this.state.selectedDirection;
    const domain = this.getDomain();
    const userId = this.state.userId;
    const userName = document.getElementById('refUserName')?.value?.trim() || '';
    const slogan = document.getElementById('refSlogan')?.value?.trim() || '';
    const previewIdx = this.state.selectedPreview;

    const dirConfig = CONFIG.REFERRAL?.directions?.[dir] || {};
    const dirCode = dirConfig.dirCode || dir[0];

    // ═══ КОРОТКИЙ КОД: {dirCode}{base36(userId)} ═══
    const shortCode = dirCode + parseInt(userId).toString(36);

    // ═══ Query параметры (только если есть кастомные значения) ═══
    const params = new URLSearchParams();
    if (previewIdx > 0) params.set('p', previewIdx);
    // Слоган НЕ добавляем в URL — он берётся серверно через api/r.js
    if (userName) params.set('n', userName);

    const queryString = params.toString();
    const shortLink = `${domain}/r/${shortCode}${queryString ? '?' + queryString : ''}`;

    // Полная ссылка (fallback)
    const fullLink = `${domain}/ref/${dir}.html?id=${userId}${userName ? '&name=' + encodeURIComponent(userName) : ''}`;

    // Показываем результат
    const result = document.getElementById('refResult');
    if (result) result.style.display = 'block';

    const shortText = document.getElementById('refShortLink');
    if (shortText) shortText.textContent = shortLink;

    const linkText = document.getElementById('refLinkText');
    if (linkText) linkText.textContent = fullLink;

    // Показываем превью как будет в мессенджере
    this.renderMessengerPreview(dir, userId, userName, slogan, previewIdx);

    // Сохраняем в историю
    this.saveToHistory({
      direction: dir,
      fullLink,
      shortLink,
      shortCode,
      domain,
      userName,
      slogan,
      previewIdx,
      timestamp: Date.now()
    });

    // Скролл к результату
    result?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  // ═══════════════════════════════════════════════════════════════
  // ЭМУЛЯЦИЯ ПРЕВЬЮ МЕССЕНДЖЕРА (показ пользователю)
  // ═══════════════════════════════════════════════════════════════
  renderMessengerPreview(dirKey, userId, userName, slogan, previewIdx) {
    const container = document.getElementById('refMessengerPreview');
    if (!container) return;

    const dir = CONFIG.REFERRAL?.directions?.[dirKey] || {};
    const images = CONFIG.REFERRAL?.previewImages?.[dirKey] || [];
    const imgData = images.find(i => i.index === previewIdx) || images[0];
    const imgSrc = imgData ? `assets/og/${imgData.file}` : 'assets/icons/icon-512x512.png';
    
    const title = userName 
      ? `${dir.name} — ${userName} приглашает вас!`
      : `${dir.name} — Приглашение от ID ${userId}`;
    const desc = slogan || dir.descriptionRu || dir.description;

    container.innerHTML = `
      <div class="ref-msg-card">
        <div class="ref-msg-label">Так будет выглядеть в мессенджере:</div>
        <div class="ref-msg-body">
          <div class="ref-msg-image">
            <img src="${imgSrc}" alt="Preview" onerror="this.style.display='none'">
          </div>
          <div class="ref-msg-text">
            <div class="ref-msg-site">GlobalWay Ecosystem</div>
            <div class="ref-msg-title">${this.escapeHtml(title)}</div>
            <div class="ref-msg-desc">${this.escapeHtml(desc)}</div>
          </div>
        </div>
      </div>
    `;
  },

  // ═══════════════════════════════════════════════════════════════
  // КОПИРОВАНИЕ В БУФЕР
  // ═══════════════════════════════════════════════════════════════
  async copyToClipboard(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;

    try {
      await navigator.clipboard.writeText(el.textContent);
      app?.showNotification?.('✅ Скопировано!', 'success');
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = el.textContent;
      textarea.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      app?.showNotification?.('✅ Скопировано!', 'success');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ШАРИНГ В МЕССЕНДЖЕРЫ
  // Отправляем КОРОТКУЮ ссылку — мессенджер сам запросит OG-теги
  // ═══════════════════════════════════════════════════════════════
  shareLink(platform) {
    const linkEl = document.getElementById('refShortLink');
    const link = linkEl?.textContent || '';
    if (!link || link === '—') return;

    const dir = CONFIG.REFERRAL?.directions?.[this.state.selectedDirection] || {};
    const slogan = document.getElementById('refSlogan')?.value?.trim() || '';
    const text = slogan || `🚀 Присоединяйтесь к ${dir.name || 'GlobalWay'}!`;

    const encodedText = encodeURIComponent(text + '\n\n');
    const encodedLink = encodeURIComponent(link);

    const urls = {
      telegram: `https://t.me/share/url?url=${encodedLink}&text=${encodedText}`,
      whatsapp: `https://wa.me/?text=${encodedText}${encodedLink}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedLink}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`
    };

    const url = urls[platform];
    if (url) window.open(url, '_blank', 'width=600,height=400');

    // Антибан: сдвинуть домен для следующей ссылки
    if (CONFIG.REFERRAL?.antiBan?.rotateOnShare) {
      this.state.currentDomainIndex++;
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ИСТОРИЯ ССЫЛОК (localStorage)
  // ═══════════════════════════════════════════════════════════════
  saveToHistory(linkData) {
    try {
      const key = `gw_ref_history_${this.state.userId}`;
      const history = JSON.parse(localStorage.getItem(key) || '[]');
      history.unshift(linkData);
      if (history.length > 50) history.length = 50;
      localStorage.setItem(key, JSON.stringify(history));
      this.state.generatedLinks = history;
      this.renderHistory();
    } catch (e) {
      console.warn('Could not save history:', e);
    }
  },

  loadHistory() {
    try {
      const key = `gw_ref_history_${this.state.userId}`;
      this.state.generatedLinks = JSON.parse(localStorage.getItem(key) || '[]');
      this.renderHistory();
    } catch (e) {
      console.warn('Could not load history:', e);
    }
  },

  renderHistory() {
    const container = document.getElementById('refHistoryList');
    if (!container) return;

    const history = this.state.generatedLinks;
    if (!history.length) {
      container.innerHTML = '<p class="ref-history-empty">Ещё не создано ни одной ссылки</p>';
      return;
    }

    const directions = CONFIG.REFERRAL?.directions || {};

    let html = history.slice(0, 20).map((item, idx) => {
      const dir = directions[item.direction] || {};
      const link = item.shortLink || item.fullLink || '';
      const date = new Date(item.timestamp).toLocaleDateString('ru-RU', { 
        day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' 
      });
      return `
        <div class="ref-history-item">
          <div class="ref-hist-icon">${dir.icon || '🔗'}</div>
          <div class="ref-hist-info">
            <span class="ref-hist-dir">${dir.name || item.direction}</span>
            <span class="ref-hist-link">${link}</span>
            <span class="ref-hist-date">${date}</span>
          </div>
          <div class="ref-hist-actions">
            <button class="ref-hist-btn ref-hist-copy-btn" onclick="referralsModule.copyLink(${idx})">📋</button>
            <button class="ref-hist-btn ref-hist-del-btn" onclick="referralsModule.deleteLink(${idx})">🗑️</button>
          </div>
        </div>
      `;
    }).join('');

    html += '<button class="ref-clear-all-btn" onclick="referralsModule.clearHistory()">🗑️ Очистить историю</button>';
    container.innerHTML = html;
  },

  copyLink(idx) {
    const link = this.state.generatedLinks[idx]?.shortLink || this.state.generatedLinks[idx]?.fullLink || '';
    if (!link) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(link).then(() => {
        app?.showNotification?.('✅ Ссылка скопирована!', 'success');
      }).catch(() => this._fallbackCopy(link));
    } else {
      this._fallbackCopy(link);
    }
  },

  _fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
      app?.showNotification?.('✅ Ссылка скопирована!', 'success');
    } catch (e) {
      prompt('Скопируйте ссылку:', text);
    }
    document.body.removeChild(ta);
  },

  deleteLink(idx) {
    this.state.generatedLinks.splice(idx, 1);
    try {
      const key = `gw_ref_history_${this.state.userId}`;
      localStorage.setItem(key, JSON.stringify(this.state.generatedLinks));
    } catch (e) {}
    this.renderHistory();
  },

  clearHistory() {
    if (!confirm('Очистить всю историю ссылок?')) return;
    this.state.generatedLinks = [];
    try {
      const key = `gw_ref_history_${this.state.userId}`;
      localStorage.removeItem(key);
    } catch (e) {}
    this.renderHistory();
    app?.showNotification?.('История очищена', 'success');
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

// Экспорт
window.referralsModule = referralsModule;
