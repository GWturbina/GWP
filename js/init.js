// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Initialization
// Вынесено из inline <script> для CSP безопасности (без unsafe-inline)
// ═══════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
    await app.init();

    // Floating connect button
    const connectBtn = document.getElementById('floatingConnectBtn');
    if (connectBtn) {
        connectBtn.addEventListener('click', () => app.connectWallet());
    }

    // data-navigate buttons (заменяют inline onclick="showPage(...)")
    document.querySelectorAll('[data-navigate]').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.getAttribute('data-navigate');
            if (page) app.showPage(page);
        });
    });
});
