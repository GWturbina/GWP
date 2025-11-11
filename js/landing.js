// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Landing Module
// Обработка Landing Page: планеты, модальные окна, переход в DApp
// ═══════════════════════════════════════════════════════════════════

const landingModule = {
  // Инициализация
  init() {
    console.log('🌍 Initializing Landing...');
    
    // Обработчики планет
    this.initPlanets();
    
    // Обработчик монеты
    this.initEnterButton();
    
    console.log('✅ Landing initialized');
  },

  // Инициализация планет
  initPlanets() {
    const planets = document.querySelectorAll('.planet');
    
    planets.forEach(planet => {
      planet.addEventListener('click', () => {
        const planetType = planet.getAttribute('data-planet');
        this.showPlanetModal(planetType);
      });
    });
  },

  // Инициализация кнопки входа
  initEnterButton() {
    const enterBtn = document.getElementById('openDapp');
    
    if (enterBtn) {
      enterBtn.addEventListener('click', () => {
        this.enterDApp();
      });
    }
  },

  // Показать модальное окно планеты
  showPlanetModal(planetType) {
    // Получаем переводы для этой планеты
    const title = window.i18n.getTranslation(`planets.${planetType}`);
    const text = window.i18n.getTranslation(`planets.${planetType}Text`);

    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.className = 'planet-modal';
    modal.innerHTML = `
      <div class="planet-modal-overlay" onclick="this.parentElement.remove()">
        <div class="planet-modal-content" onclick="event.stopPropagation()">
          <button class="planet-modal-close" onclick="this.closest('.planet-modal').remove()">×</button>
          <h2>${title}</h2>
          <p>${text}</p>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Анимация появления
    setTimeout(() => {
      modal.classList.add('active');
    }, 10);
  },

  // ✅ ИСПРАВЛЕНО: Вход в DApp с правильной инициализацией навигации
  async enterDApp() {
    console.log('🚀 Entering DApp...');
    
    // Скрываем Landing
    const landing = document.getElementById('landing');
    if (landing) {
      landing.classList.remove('active');
    }

    // Показываем DApp
    const dapp = document.getElementById('dapp');
    if (dapp) {
      dapp.classList.add('active');
    }

    // ✅ ИСПРАВЛЕНО: Устанавливаем hash в URL
    window.location.hash = 'dashboard';

    // ✅ ИСПРАВЛЕНО: Если app загружен - инициализируем навигацию и показываем Dashboard
    if (window.app) {
      console.log('📊 Loading Dashboard page...');
      window.app.state.isLandingSkipped = true;
      
      // ✅ КРИТИЧНО: ВСЕГДА инициализируем навигацию при входе в DApp
      if (!window.app.state.navigationInitialized) {
        console.log('🔧 Initializing navigation from landing...');
        window.app.initNavigation();
      }
      
      // Показываем страницу Dashboard
      await window.app.showPage('dashboard');
    }
  }
};

// Автоматическая инициализация
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    landingModule.init();
  });
} else {
  landingModule.init();
}

// Экспорт
window.landingModule = landingModule;
