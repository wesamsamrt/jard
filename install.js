(() => {
  const button = document.getElementById('installBtn');
  const dialog = document.getElementById('installDialog');
  const help = document.getElementById('installHelp');
  const display = window.matchMedia('(display-mode: standalone)');
  let pending = null;
  let installed = false;
  const update = () => { button.hidden = installed || display.matches || navigator.standalone === true; };
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    pending = event;
    update();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    pending = null;
    update();
    if (dialog.open) dialog.close();
  });
  display.addEventListener?.('change', update);
  document.getElementById('closeInstall').onclick = () => dialog.close();
  function instructions() {
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    help.textContent = ios
      ? 'افتح رابط الموقع في Safari، ثم اضغط «مشاركة» واختر «إضافة إلى الشاشة الرئيسية»، ثم «إضافة». فعّل «فتح كتطبيق ويب» إذا ظهر الخيار.'
      : 'افتح رابط الموقع في Chrome أو Edge، ثم اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية» من قائمة المتصفح. على Mac يمكنك استخدام Safari واختيار «ملف» ثم «إضافة إلى Dock». إذا كان الموقع مفتوحًا داخل تطبيق آخر، افتح رابطه في المتصفح أولًا. قد تختلف أسماء الخيارات حسب جهازك.';
    dialog.showModal();
  }
  button.onclick = async () => {
    if (!pending) { instructions(); return; }
    const prompt = pending;
    pending = null;
    button.disabled = true;
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch { instructions(); }
    finally { button.disabled = false; update(); }
  };
  update();
  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('./sw.js', {scope: './', updateViaCache: 'none'}).catch(() => {
      // Manual browser installation remains available when registration is unsupported.
    });
  }
})();
