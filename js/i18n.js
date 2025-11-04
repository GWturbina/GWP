// Глобальные переменные для переводов
let translations = {};
let currentLang = 'ru';

// Получаем сохраненный язык
const savedLang = localStorage.getItem('globalway_lang') || 'ru';

// Функция загрузки переводов из JSON файлов
const langSelectors = ['langSelect', 'langSelectHeader'];

// Функция загрузки переводов из файлов
async function loadTranslations() {
  const languages = ['en', 'ru', 'uk'];
  
  for (const lang of languages) {
    try {
      const response = await fetch(`./translations/${lang}.json`);
      if (response.ok) {
        translations[lang] = await response.json();
        console.log(`Loaded ${lang} translations`);
      } else {
        console.warn(`Failed to load ${lang} translations`);
      }
    } catch (error) {
      console.error(`Error loading ${lang} translations:`, error);
    }
  }
  
  // Если переводы не загрузились, используем fallback
  if (Object.keys(translations).length === 0) {
    loadFallbackTranslations();
  }
}

// Встроенные переводы как fallback (минимальный набор)
function loadFallbackTranslations() {
  translations = {
    en: {
      nav: {
        dashboard: "Dashboard",
        partners: "Partners",
        matrix: "Matrix",
        tokens: "Tokens",
        projects: "Projects",
        admin: "Admin"
      },
      wallet: {
        connect: "Connect Wallet",
        connecting: "Connecting...",
        connected: "Connected"
      },
      landing: {
        enterDapp: "Enter DApp"
      },
      planets: {
        club: "GlobalWay Club",
        mission: "Our Mission", 
        goals: "Club Goals",
        roadmap: "Roadmap",
        projects: "Our Projects",
        clubText: "GlobalWay is a decentralized club that brings together technology enthusiasts from around the world.",
        missionText: "Our mission is to create innovative Web3 solutions that make decentralized technologies accessible to everyone.",
        goalsText: "We aim to build a sustainable ecosystem of projects that benefit our community and advance blockchain adoption.",
        roadmapText: "Our roadmap includes launching 8 major projects, token listing, and building eco-villages by 2028.",
        projectsText: "We are developing CardGift, GlobalTub, GlobalMarket, GlobalGame, GlobalEdu, GlobalBank, GlobalAI, and EcoVillages."
      }
    },
    ru: {
      nav: {
        dashboard: "Дашборд",
        partners: "Партнеры",
        matrix: "Матрица",
        tokens: "Токены",
        projects: "Проекты",
        admin: "Админ"
      },
      wallet: {
        connect: "Подключить кошелек",
        connecting: "Подключение...",
        connected: "Подключен"
      },
      landing: {
        enterDapp: "Вход в DApp"
      },
      planets: {
        club: "Клуб GlobalWay",
        mission: "Наша Миссия",
        goals: "Цели Клуба", 
        roadmap: "Дорожная карта",
        projects: "Наши Проекты",
        clubText: "GlobalWay - это децентрализованный клуб, объединяющий энтузиастов технологий со всего мира.",
        missionText: "Наша миссия - создание инновационных Web3 решений, делающих децентрализованные технологии доступными для всех.",
        goalsText: "Мы стремимся построить устойчивую экосистему проектов, которые приносят пользу нашему сообществу.",
        roadmapText: "Наша дорожная карта включает запуск 8 крупных проектов, листинг токена и строительство эко-поселений к 2028 году.",
        projectsText: "Мы разрабатываем CardGift, GlobalTub, GlobalMarket, GlobalGame, GlobalEdu, GlobalBank, GlobalAI и EcoVillages."
      }
    },
    uk: {
      nav: {
        dashboard: "Дашборд",
        partners: "Партнери",
        matrix: "Матриця",
        tokens: "Токени",
        projects: "Проекти",
        admin: "Адмін"
      },
      wallet: {
        connect: "Підключити гаманець",
        connecting: "Підключення...",
        connected: "Підключено"
      },
      landing: {
        enterDapp: "Вхід в DApp"
      },
      planets: {
        club: "Клуб GlobalWay",
        mission: "Наша Місія",
        goals: "Цілі Клубу",
        roadmap: "Дорожня карта", 
        projects: "Наші Проекти",
        clubText: "GlobalWay - це децентралізований клуб, що об'єднує ентузіастів технологій з усього світу.",
        missionText: "Наша місія - створення інноваційних Web3 рішень, що роблять децентралізовані технології доступними для всіх.",
        goalsText: "Ми прагнемо побудувати стійку екосистему проектів, які приносять користь нашій спільноті.",
        roadmapText: "Наша дорожня карта включає запуск 8 великих проектів, лістинг токена та будівництво еко-поселень до 2028 року.",
        projectsText: "Ми розробляємо CardGift, GlobalTub, GlobalMarket, GlobalGame, GlobalEdu, GlobalBank, GlobalAI та EcoVillages."
      }
    }
  };
}

function setLanguage(lang) {
  if (translations[lang]) {
    currentLang = lang;
    localStorage.setItem('globalway_lang', lang);
    translatePage();
    
    // Синхронизируем селекторы
    langSelectors.forEach(id => {
      const select = document.getElementById(id);
      if (select) {
        select.value = lang;
      }
    });
  } else {
    console.warn(`Language ${lang} not available`);
  }
}

function translatePage() {
  const elements = document.querySelectorAll('[data-translate]');
  elements.forEach(el => {
    const key = el.getAttribute('data-translate');
    const translation = getTranslation(key);
    if (translation && translation !== key) {
      if (el.tagName.toLowerCase() === 'input' && el.hasAttribute('placeholder')) {
        el.placeholder = translation;
      } else if (el.tagName.toLowerCase() === 'textarea' && el.hasAttribute('placeholder')) {
        el.placeholder = translation;
      } else {
        el.textContent = translation;
      }
    }
  });
}

function getTranslation(key) {
  if (!key || typeof key !== 'string') return key;
  
  const keys = key.split('.');
  let value = translations[currentLang];
  
  // Проходим по всем ключам
  for (const k of keys) {
    if (value && typeof value === 'object' && value.hasOwnProperty(k)) {
      value = value[k];
    } else {
      value = undefined;
      break;
    }
  }
  
  // Если перевод найден и это строка, возвращаем его
  if (typeof value === 'string') {
    return value;
  }
  
  // Fallback на английский если перевод не найден
  if (value === undefined && currentLang !== 'en') {
    let fallbackValue = translations['en'];
    for (const k of keys) {
      if (fallbackValue && typeof fallbackValue === 'object' && fallbackValue.hasOwnProperty(k)) {
        fallbackValue = fallbackValue[k];
      } else {
        fallbackValue = undefined;
        break;
      }
    }
    if (typeof fallbackValue === 'string') {
      return fallbackValue;
    }
  }
  
  // Если ничего не найдено, возвращаем исходный ключ
  return key;
}

async function initI18n() {
  // Загружаем переводы из файлов
  await loadTranslations();
  
  // Устанавливаем сохраненный язык или язык по умолчанию
  setLanguage(savedLang);
  
  // 🔥 ИСПРАВЛЕНО: Переводим страницу после загрузки
  translatePage();
  console.log('✅ Initial page translated');
  
  // Настраиваем селектор языка
  langSelectors.forEach(id => {
    const langSelect = document.getElementById(id);
    if (langSelect) {
      langSelect.value = savedLang;
      langSelect.addEventListener('change', (e) => {
        setLanguage(e.target.value);
      });
    }
  });
  
  // Добавляем обработчик для динамически добавляемых элементов
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const elements = node.querySelectorAll ? node.querySelectorAll('[data-translate]') : [];
          elements.forEach(el => {
            const key = el.getAttribute('data-translate');
            const translation = getTranslation(key);
            if (translation && translation !== key) {
              if (el.tagName.toLowerCase() === 'input' && el.hasAttribute('placeholder')) {
                el.placeholder = translation;
              } else if (el.tagName.toLowerCase() === 'textarea' && el.hasAttribute('placeholder')) {
                el.placeholder = translation;
              } else {
                el.textContent = translation;
              }
            }
          });
          
          if (node.hasAttribute && node.hasAttribute('data-translate')) {
            const key = node.getAttribute('data-translate');
            const translation = getTranslation(key);
            if (translation && translation !== key) {
              if (node.tagName.toLowerCase() === 'input' && node.hasAttribute('placeholder')) {
                node.placeholder = translation;
              } else if (node.tagName.toLowerCase() === 'textarea' && node.hasAttribute('placeholder')) {
                node.placeholder = translation;
              } else {
                node.textContent = translation;
              }
            }
          }
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Экспортируем функции в window
window.i18n = {
  setLanguage,
  getTranslation,
  translatePage,
  initI18n
};

// 🔥 ИСПРАВЛЕНО: Прямой экспорт для обратной совместимости
window.translatePage = translatePage;
window.getTranslation = getTranslation;
window.setLanguage = setLanguage;

// Инициализация при загрузке
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initI18n);
} else {
  initI18n();
}
