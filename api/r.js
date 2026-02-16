// ═══════════════════════════════════════════════════════════════════
// GlobalWay — Short Link OG Resolver
// Vercel Serverless Function
// 
// Когда мессенджер (Telegram/WhatsApp/Twitter) запрашивает короткую
// ссылку, эта функция возвращает HTML с правильными OG-тегами.
// Браузер пользователя получает тот же HTML + JS-редирект на landing.
//
// Формат короткой ссылки: /r/{dirChar}{base36userId}
//   dirChar: g=GlobalWay, c=CardGift, n=NSS
//   base36userId: userId в base36 (1→"1", 100→"2s", 1000→"rs")
//
// Опциональные query-параметры:
//   ?p=2  — индекс превью-картинки (0..N)
//   ?s=Текст — кастомный слоган для OG description
//   ?n=Имя — имя пригласившего
// ═══════════════════════════════════════════════════════════════════

export default function handler(req, res) {
  const { code, p, s, n } = req.query;

  if (!code || code.length < 2) {
    res.writeHead(302, { Location: '/' });
    res.end();
    return;
  }

  // ═══ ПАРСИНГ КОРОТКОГО КОДА ═══
  // Поддержка 2 форматов:
  // Новый: c5sjfx (1 буква: g/c/n + base36)
  // Старый: CG5SJFX1J (2 буквы: GW/CG/NS + base36)
  const dirMap1 = { g: 'gw', c: 'cg', n: 'nss' };
  const dirMap2 = { gw: 'gw', cg: 'cg', ns: 'nss' };
  
  let direction, userIdBase36;
  const twoChar = code.substring(0, 2).toLowerCase();
  const oneChar = code[0].toLowerCase();
  
  if (dirMap2[twoChar] && code.length > 2) {
    // Старый формат: 2-буквенный префикс
    direction = dirMap2[twoChar];
    userIdBase36 = code.substring(2);
  } else if (dirMap1[oneChar]) {
    // Новый формат: 1-буквенный префикс
    direction = dirMap1[oneChar];
    userIdBase36 = code.substring(1);
  } else {
    res.writeHead(302, { Location: '/' });
    res.end();
    return;
  }

  const userId = parseInt(userIdBase36, 36);

  if (isNaN(userId) || userId < 1) {
    res.writeHead(302, { Location: '/' });
    res.end();
    return;
  }

  // ═══ КОНФИГУРАЦИЯ НАПРАВЛЕНИЙ ═══
  const dirConfig = {
    gw: {
      name: 'GlobalWay',
      desc: 'Децентрализованная экосистема на opBNB. 12 уровней, бинарная матрица, токены GWT.',
      defaultImage: 'gw-default.png'
    },
    cg: {
      name: 'CardGift',
      desc: 'Цифровые открытки с AI-генерацией. Создавай, отправляй, зарабатывай!',
      defaultImage: 'cg-default.png'
    },
    nss: {
      name: 'NSS',
      desc: 'Децентрализованный обменник и P2P. Обмен крипты без посредников.',
      defaultImage: 'nss-default.png'
    }
  };

  const dir = dirConfig[direction];
  const previewIndex = parseInt(p) || 0;
  const slogan = s ? decodeURIComponent(s) : dir.desc;
  const inviterName = n ? decodeURIComponent(n) : '';

  // ═══ ФОРМИРУЕМ URL-ы ═══
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const baseUrl = `${protocol}://${host}`;

  // OG Image: assets/og/{direction}-{previewIndex}.png
  // Если previewIndex=0 → используем default
  const ogImageFile = previewIndex > 0 
    ? `${direction}-${previewIndex}.png` 
    : dir.defaultImage;
  const ogImage = `${baseUrl}/assets/og/${ogImageFile}`;

  // Landing page URL (куда редиректим пользователя)
  let landingUrl = `${baseUrl}/ref/${direction}.html?id=${userId}`;
  if (inviterName) {
    landingUrl += `&name=${encodeURIComponent(inviterName)}`;
  }

  // OG Title
  const ogTitle = inviterName
    ? `${dir.name} — ${inviterName} приглашает вас!`
    : `${dir.name} — Приглашение от ID ${userId}`;

  // ═══ ГЕНЕРИРУЕМ HTML ═══
  // Мессенджеры читают только мета-теги (не выполняют JS)
  // Браузеры выполнят JS и перейдут на landing page
  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<!-- Open Graph -->
<meta property="og:type" content="website">
<meta property="og:site_name" content="GlobalWay Ecosystem">
<meta property="og:title" content="${escapeHtml(ogTitle)}">
<meta property="og:description" content="${escapeHtml(slogan)}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${baseUrl}/r/${code}">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(ogTitle)}">
<meta name="twitter:description" content="${escapeHtml(slogan)}">
<meta name="twitter:image" content="${ogImage}">

<title>${escapeHtml(dir.name)} — Приглашение</title>

<style>
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;background:#000d1a;color:#fff;font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center}
.box{text-align:center;padding:40px}
.spinner{width:36px;height:36px;border:3px solid rgba(255,215,0,0.15);border-top-color:#ffd700;border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 16px}
@keyframes spin{to{transform:rotate(360deg)}}
p{color:rgba(255,255,255,0.5);font-size:14px}
a{color:#ffd700;text-decoration:none}
</style>
</head>
<body>
<div class="box">
<div class="spinner"></div>
<p>Перенаправление в ${escapeHtml(dir.name)}...</p>
<p style="margin-top:8px"><a href="${landingUrl}">Нажмите, если не перенаправило</a></p>
</div>
<script>window.location.replace('${landingUrl}');</script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, max-age=600');
  res.status(200).send(html);
}

// ═══ Утилита: экранирование HTML ═══
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
