// Shared theme + language handling across FOTO pages
(function () {
    const THEME_KEY = 'foto_theme';
    const LANG_KEY = 'foto_lang';

    function applyThemeFromStorage() {
        const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }

        const sun = document.querySelector('.sun-path');
        const moon = document.querySelector('.moon-path');
        if (sun && moon) {
            const isDark = document.body.classList.contains('dark-mode');
            sun.classList.toggle('hidden', isDark);
            moon.classList.toggle('hidden', !isDark);
        }
    }

    function toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');

        const sun = document.querySelector('.sun-path');
        const moon = document.querySelector('.moon-path');
        if (sun && moon) {
            sun.classList.toggle('hidden', isDark);
            moon.classList.toggle('hidden', !isDark);
        }
    }

    function updateLangButtons(activeLang) {
        document.querySelectorAll('.lang-toggle button').forEach((b) => {
            if (!b.id) return;
            const idLang = b.id.endsWith('-kh') ? 'kh' : 'en';
            b.classList.toggle('active', idLang === activeLang);
        });
    }

    // Lightweight per-page language setter (doesn't touch main app copy)
    window.setPageLang = function (lang) {
        const l = lang === 'kh' ? 'kh' : 'en';
        localStorage.setItem(LANG_KEY, l);
        updateLangButtons(l);
        // notify other scripts that language changed
        window.dispatchEvent(new CustomEvent('fotoLangChange', { detail: l }));
    };

    document.addEventListener('DOMContentLoaded', () => {
        // Apply stored theme immediately
        applyThemeFromStorage();

        // Hook theme toggle if present
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', toggleTheme);
        }

        // Initialize language buttons if present
        const savedLang = localStorage.getItem(LANG_KEY) || 'en';
        updateLangButtons(savedLang);
        // fire event so pages can apply initial translations
        window.dispatchEvent(new CustomEvent('fotoLangChange', { detail: savedLang }));

        const btnEn = document.getElementById('btn-en');
        const btnKh = document.getElementById('btn-kh');
        if (btnEn) btnEn.addEventListener('click', () => setPageLang('en'));
        if (btnKh) btnKh.addEventListener('click', () => setPageLang('kh'));
    });
})();

