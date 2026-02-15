// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Referral Links Module
// OG Previews, Short Links by Direction, Anti-Ban Domain Rotation
// v2.1 - February 13, 2026
// ═══════════════════════════════════════════════════════════════════

const referralsModule = {
  state: {
    userId: null,
    userAddress: null,
    selectedDirection: 'gw',
    generatedLinks: [],
    currentDomainIndex: 0
  },

  // ═══════════════════════════════════════════════════════════════
  // ИНИЦИАЛИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  async init() {
    console.log('🔗 Referrals module init');
    this.render();
    
    if (app?.state?.userAddress) {
      this.state.userAddress = app.state.userAddress;
      await this.loadUserData();
    }
    
    this.bindEvents();
    if (window.i18n?.translatePage) window.i18n.translatePage();
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
      // Fallback: try getting from state
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
    <h2 data-translate="referrals.pageTitle">🔗 Referral Links</h2>
    <p class="ref-subtitle" data-translate="referrals.pageSubtitle">Create beautiful links for each ecosystem direction</p>
  </div>

  <!-- ВЫБОР НАПРАВЛЕНИЯ -->
  <div class="ref-directions">
    <h3 data-translate="referrals.chooseDirection">📌 Choose direction</h3>
    <div class="direction-cards">
      ${dirKeys.map(key => {
        const d = directions[key];
        return `
        <div class="direction-card ${key === 'gw' ? 'active' : ''}" data-dir="${key}" style="--dir-color: ${d.color}; --dir-gradient: ${d.gradient}">
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
    <h3 data-translate="referrals.linkGenerator">🔧 Link generator</h3>
    
    <div class="ref-user-info" id="refUserInfo">
      <div class="ref-no-wallet" id="refNoWallet">
        <p data-translate="referrals.connectForLinks">⚠️ Connect wallet to generate referral links</p>
      </div>
      <div class="ref-has-wallet" id="refHasWallet" style="display:none;">
        <div class="ref-id-badge">
          <span class="ref-id-label" data-translate="referrals.yourId">Your ID</span>:
          <span class="ref-id-value" id="refUserId">—</span>
        </div>
      </div>
    </div>

    <!-- НАСТРОЙКИ ССЫЛКИ -->
    <div class="ref-link-settings" id="refLinkSettings" style="display:none;">
      <div class="ref-setting-row">
        <label data-translate="referrals.yourName">🏷️ Your name (optional):</label>
        <input type="text" id="refUserName" placeholder="Name" maxlength="30" class="ref-input">
      </div>
      <div class="ref-setting-row">
        <label data-translate="referrals.domain">🌐 Domain:</label>
        <div class="ref-domain-selector" id="refDomainSelector">
          <!-- Заполняется динамически -->
        </div>
      </div>
      <div class="ref-setting-row ref-antiban-row">
        <label>
          <input type="checkbox" id="refAntiBanToggle" checked>
          🛡️ <span data-translate="referrals.antiban">Anti-ban (domain rotation)</span>
        </label>
        <span class="ref-antiban-hint" data-translate="referrals.antibanHint">Each link via different domain</span>
      </div>

      <button class="ref-generate-btn" id="refGenerateBtn">
        ⚡ <span data-translate="referrals.generateLink">Generate link</span>
      </button>
    </div>
  </div>

  <!-- РЕЗУЛЬТАТ: ПРЕВЬЮ + ССЫЛКА -->
  <div class="ref-result" id="refResult" style="display:none;">
    <h3 data-translate="referrals.yourLink">📋 Your referral link</h3>
    
    <!-- OG PREVIEW CANVAS -->
    <div class="ref-preview-container">
      <canvas id="refPreviewCanvas" width="1200" height="630"></canvas>
      <div class="ref-preview-actions">
        <button class="ref-btn ref-btn-download" id="refDownloadPreview">
          📥 <span data-translate="common.download">Download preview</span>
        </button>
      </div>
    </div>

    <!-- ССЫЛКА -->
    <div class="ref-link-box">
      <div class="ref-link-display">
        <span class="ref-link-text" id="refLinkText">—</span>
        <button class="ref-btn ref-btn-copy" id="refCopyLink" data-translate="common.copy">📋 Copy</button>
      </div>
      <div class="ref-link-short">
        <span class="ref-link-short-label" data-translate="referrals.shortLink">Short:</span>
        <span class="ref-link-short-text" id="refShortLink">—</span>
        <button class="ref-btn ref-btn-copy" id="refCopyShort">📋</button>
      </div>
    </div>

    <!-- ШАРИНГ -->
    <div class="ref-share-buttons">
      <button class="ref-share-btn ref-share-telegram" id="refShareTelegram">
        <span class="share-icon">✈️</span> Telegram
      </button>
      <button class="ref-share-btn ref-share-whatsapp" id="refShareWhatsApp">
        <span class="share-icon">💬</span> WhatsApp
      </button>
      <button class="ref-share-btn ref-share-twitter" id="refShareTwitter">
        <span class="share-icon">🐦</span> Twitter
      </button>
      <button class="ref-share-btn ref-share-facebook" id="refShareFacebook">
        <span class="share-icon">📘</span> Facebook
      </button>
    </div>
  </div>

  <!-- ИСТОРИЯ СОЗДАННЫХ ССЫЛОК -->
  <div class="ref-history">
    <h3 data-translate="referrals.history">📊 My Links</h3>
    <div class="ref-history-list" id="refHistoryList">
      <p class="ref-history-empty">No links created yet</p>
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
        this.updatePreviewIfExists();
      });
    });

    // Генерация
    const genBtn = document.getElementById('refGenerateBtn');
    if (genBtn) genBtn.addEventListener('click', () => this.generateLink());

    // Копирование
    const copyLink = document.getElementById('refCopyLink');
    if (copyLink) copyLink.addEventListener('click', () => this.copyToClipboard('refLinkText'));
    
    const copyShort = document.getElementById('refCopyShort');
    if (copyShort) copyShort.addEventListener('click', () => this.copyToClipboard('refShortLink'));

    // Скачать превью
    const downloadBtn = document.getElementById('refDownloadPreview');
    if (downloadBtn) downloadBtn.addEventListener('click', () => this.downloadPreview());

    // Шаринг
    document.getElementById('refShareTelegram')?.addEventListener('click', () => this.shareLink('telegram'));
    document.getElementById('refShareWhatsApp')?.addEventListener('click', () => this.shareLink('whatsapp'));
    document.getElementById('refShareTwitter')?.addEventListener('click', () => this.shareLink('twitter'));
    document.getElementById('refShareFacebook')?.addEventListener('click', () => this.shareLink('facebook'));

    // Имя пользователя → обновление превью
    document.getElementById('refUserName')?.addEventListener('input', () => {
      clearTimeout(this._nameTimer);
      this._nameTimer = setTimeout(() => this.updatePreviewIfExists(), 300);
    });
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
      this.loadHistory();
    }
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
      container.innerHTML = '<span class="ref-no-domains">No active domains</span>';
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
      // Ротация доменов
      const domain = domains[this.state.currentDomainIndex % domains.length];
      this.state.currentDomainIndex++;
      return domain.url;
    }

    // Выбранный домен
    const selected = document.querySelector('input[name="refDomain"]:checked');
    if (selected) return selected.value;

    return CONFIG.REFERRAL?.antiBan?.fallbackDomain || 'https://gwp-navy.vercel.app';
  },

  // ═══════════════════════════════════════════════════════════════
  // ГЕНЕРАЦИЯ ССЫЛКИ
  // ═══════════════════════════════════════════════════════════════
  generateLink() {
    if (!this.state.userId) {
      app?.showNotification?.(_t ? _t('notifications.connectWalletFirst') : 'Connect wallet!', 'error');
      return;
    }

    const dir = this.state.selectedDirection;
    const domain = this.getDomain();
    const userId = this.state.userId;
    const userName = document.getElementById('refUserName')?.value?.trim() || '';

    // Полная ссылка
    const fullLink = `${domain}/ref/${dir}.html?id=${userId}${userName ? '&name=' + encodeURIComponent(userName) : ''}`;
    
    // Короткая ссылка (hash-based)
    const shortCode = this.generateShortCode(userId, dir);
    const shortLink = `${domain}/r/${shortCode}`;

    // Показываем результат
    const result = document.getElementById('refResult');
    if (result) result.style.display = 'block';

    const linkText = document.getElementById('refLinkText');
    if (linkText) linkText.textContent = fullLink;

    const shortText = document.getElementById('refShortLink');
    if (shortText) shortText.textContent = shortLink;

    // Генерируем OG превью
    this.generatePreview(dir, userId, userName);

    // Сохраняем в историю
    this.saveToHistory({
      direction: dir,
      fullLink,
      shortLink,
      shortCode,
      domain,
      userName,
      timestamp: Date.now()
    });

    // Скролл к результату
    result?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  // ═══════════════════════════════════════════════════════════════
  // ГЕНЕРАЦИЯ КОРОТКОГО КОДА
  // ═══════════════════════════════════════════════════════════════
  generateShortCode(userId, direction) {
    // Формат: направление + base36(userId) + случайные 2 символа
    const dirPrefix = direction.toUpperCase();
    const idBase36 = parseInt(userId).toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 4).toUpperCase();
    return `${dirPrefix}${idBase36}${rand}`;
  },

  // ═══════════════════════════════════════════════════════════════
  // ГЕНЕРАЦИЯ OG PREVIEW (Canvas)
  // ═══════════════════════════════════════════════════════════════
  generatePreview(dirKey, userId, userName) {
    const canvas = document.getElementById('refPreviewCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const W = 1200, H = 630;
    canvas.width = W;
    canvas.height = H;

    const dir = CONFIG.REFERRAL?.directions?.[dirKey] || {};
    const colorMain = dir.color || '#00d4ff';

    // ═══ ФОНОВЫЙ ГРАДИЕНТ ═══
    this.drawBackground(ctx, W, H, dirKey, colorMain);

    // ═══ СЕТКА / ПАТТЕРН ═══
    this.drawPattern(ctx, W, H, colorMain);

    // ═══ ЛОГОТИП НАПРАВЛЕНИЯ ═══
    this.drawDirectionBadge(ctx, dirKey, dir);

    // ═══ ЗАГОЛОВОК ═══
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Join ${dir.name || 'GlobalWay'}!`, W / 2, 240);

    // ═══ ОПИСАНИЕ ═══
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '28px "Segoe UI", Arial, sans-serif';
    ctx.fillText(dir.descriptionRu || dir.description || 'Decentralized Ecosystem', W / 2, 290);

    // ═══ ПРИГЛАШЕНИЕ ОТ ПОЛЬЗОВАТЕЛЯ ═══
    if (userName) {
      // Рамка с именем
      const invText = `Invited by: ${userName}`;
      ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
      const textW = ctx.measureText(invText).width;
      
      // Подложка
      const boxW = textW + 60, boxH = 52;
      const boxX = (W - boxW) / 2, boxY = 330;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      this.roundRect(ctx, boxX, boxY, boxW, boxH, 12);
      ctx.fill();
      
      // Бордер
      ctx.strokeStyle = colorMain;
      ctx.lineWidth = 2;
      this.roundRect(ctx, boxX, boxY, boxW, boxH, 12);
      ctx.stroke();

      ctx.fillStyle = colorMain;
      ctx.textAlign = 'center';
      ctx.fillText(invText, W / 2, boxY + 36);
    }

    // ═══ ID BADGE ═══
    const idText = `ID: ${userId}`;
    ctx.font = 'bold 36px "Courier New", monospace';
    const idW = ctx.measureText(idText).width;
    
    const idBoxW = idW + 50, idBoxH = 56;
    const idBoxX = (W - idBoxW) / 2, idBoxY = userName ? 410 : 340;
    
    // Яркий бокс
    ctx.fillStyle = colorMain;
    this.roundRect(ctx, idBoxX, idBoxY, idBoxW, idBoxH, 14);
    ctx.fill();
    
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.fillText(idText, W / 2, idBoxY + 40);

    // ═══ НИЖНЯЯ ПОЛОСА ═══
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, H - 80, W, 80);
    
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '22px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('GlobalWay Ecosystem • opBNB Blockchain • Decentralized', 30, H - 32);
    
    ctx.textAlign = 'right';
    ctx.fillStyle = colorMain;
    ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
    ctx.fillText('🔗 globalway.club', W - 30, H - 32);

    // ═══ ДОПОЛНИТЕЛЬНЫЕ ИКОНКИ НАПРАВЛЕНИЙ ═══
    this.drawDirectionIcons(ctx, dirKey, W, H);
  },

  // ═══ ФОНОВЫЙ РИСУНОК ═══
  drawBackground(ctx, W, H, dirKey, color) {
    const gradients = {
      gw: ['#0a0e27', '#0d1b3e', '#0a2a5c'],
      cg: ['#1a0825', '#2d1045', '#4a1a70'],
      nss: ['#0a1f15', '#0d3525', '#0a5a3a']
    };
    const colors = gradients[dirKey] || gradients.gw;

    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(0.5, colors[1]);
    grad.addColorStop(1, colors[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Радиальное свечение
    const radGrad = ctx.createRadialGradient(W * 0.7, H * 0.3, 0, W * 0.7, H * 0.3, 400);
    radGrad.addColorStop(0, color + '30');
    radGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, W, H);

    // Второе свечение
    const radGrad2 = ctx.createRadialGradient(W * 0.2, H * 0.8, 0, W * 0.2, H * 0.8, 300);
    radGrad2.addColorStop(0, color + '20');
    radGrad2.addColorStop(1, 'transparent');
    ctx.fillStyle = radGrad2;
    ctx.fillRect(0, 0, W, H);
  },

  // ═══ ГЕОМЕТРИЧЕСКИЙ ПАТТЕРН ═══
  drawPattern(ctx, W, H, color) {
    ctx.strokeStyle = color + '12';
    ctx.lineWidth = 1;

    // Гексагональная сетка
    const size = 60;
    for (let y = -size; y < H + size; y += size * 1.5) {
      for (let x = -size; x < W + size; x += size * 1.73) {
        const offsetX = (Math.floor(y / (size * 1.5)) % 2) * (size * 0.865);
        this.drawHexagon(ctx, x + offsetX, y, size * 0.4);
      }
    }

    // Диагональные линии
    ctx.strokeStyle = color + '08';
    ctx.lineWidth = 1;
    for (let i = -H; i < W + H; i += 80) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + H, H);
      ctx.stroke();
    }
  },

  drawHexagon(ctx, cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  },

  // ═══ БЕЙДЖ НАПРАВЛЕНИЯ ═══
  drawDirectionBadge(ctx, dirKey, dir) {
    const icons = { gw: '🌐', cg: '🎴', nss: '💱' };
    const icon = icons[dirKey] || '🌐';
    
    // Круглый бейдж
    ctx.beginPath();
    ctx.arc(600, 100, 55, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fill();
    ctx.strokeStyle = dir.color || '#00d4ff';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = '48px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, 600, 102);
    ctx.textBaseline = 'alphabetic';
  },

  // ═══ МИНИ-ИКОНКИ ДРУГИХ НАПРАВЛЕНИЙ ═══
  drawDirectionIcons(ctx, currentDir, W, H) {
    const directions = CONFIG.REFERRAL?.directions || {};
    const icons = [];
    Object.entries(directions).forEach(([key, d]) => {
      if (key !== currentDir) {
        icons.push({ icon: d.icon, color: d.color });
      }
    });

    icons.forEach((item, i) => {
      const x = 50 + i * 60;
      const y = 30;
      ctx.font = '28px "Segoe UI Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.4;
      ctx.fillText(item.icon, x, y);
      ctx.globalAlpha = 1.0;
    });
  },

  // ═══ УТИЛИТА: СКРУГЛЁННЫЙ ПРЯМОУГОЛЬНИК ═══
  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  },

  // ═══════════════════════════════════════════════════════════════
  // ОБНОВЛЕНИЕ ПРЕВЬЮ (при смене направления или имени)
  // ═══════════════════════════════════════════════════════════════
  updatePreviewIfExists() {
    const result = document.getElementById('refResult');
    if (result && result.style.display !== 'none') {
      this.generateLink();
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // СКАЧАТЬ ПРЕВЬЮ
  // ═══════════════════════════════════════════════════════════════
  downloadPreview() {
    const canvas = document.getElementById('refPreviewCanvas');
    if (!canvas) return;

    const dir = this.state.selectedDirection;
    const link = document.createElement('a');
    link.download = `globalway-${dir}-ref-${this.state.userId}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
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
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = el.textContent;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      app?.showNotification?.('✅ Скопировано!', 'success');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ШАРИНГ В СОЦСЕТИ
  // ═══════════════════════════════════════════════════════════════
  shareLink(platform) {
    const linkEl = document.getElementById('refShortLink');
    const link = linkEl?.textContent || '';
    if (!link || link === '—') return;

    const dir = CONFIG.REFERRAL?.directions?.[this.state.selectedDirection] || {};
    const text = `🚀 Присоединяйтесь к ${dir.name || 'GlobalWay'}!\n${dir.descriptionRu || dir.description || ''}\n\n`;

    const encodedText = encodeURIComponent(text);
    const encodedLink = encodeURIComponent(link);

    const urls = {
      telegram: `https://t.me/share/url?url=${encodedLink}&text=${encodedText}`,
      whatsapp: `https://wa.me/?text=${encodedText}${encodedLink}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedLink}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`
    };

    const url = urls[platform];
    if (url) window.open(url, '_blank', 'width=600,height=400');

    // Антибан: после шаринга — сдвинуть домен
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
      // Максимум 50 записей
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
      container.innerHTML = '<p class="ref-history-empty">No links created yet</p>';
      return;
    }

    const directions = CONFIG.REFERRAL?.directions || {};

    container.innerHTML = history.slice(0, 20).map(item => {
      const dir = directions[item.direction] || {};
      const date = new Date(item.timestamp).toLocaleDateString('ru-RU', { 
        day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' 
      });
      return `
        <div class="ref-history-item" style="--dir-color: ${dir.color || '#00d4ff'}">
          <div class="ref-hist-icon">${dir.icon || '🔗'}</div>
          <div class="ref-hist-info">
            <span class="ref-hist-dir">${dir.name || item.direction}</span>
            <span class="ref-hist-link">${item.shortLink || item.fullLink}</span>
            <span class="ref-hist-date">${date}</span>
          </div>
          <button class="ref-hist-copy" onclick="referralsModule.copyText('${item.shortLink || item.fullLink}')">📋</button>
        </div>
      `;
    }).join('');
  },

  async copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      app?.showNotification?.('✅ Скопировано!', 'success');
    } catch (e) {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      app?.showNotification?.('✅ Скопировано!', 'success');
    }
  },

  // Refresh для app module system
  async refresh() {
    if (app?.state?.userAddress) {
      this.state.userAddress = app.state.userAddress;
      await this.loadUserData();
    }
  }
};

// Экспорт
window.referralsModule = referralsModule;
