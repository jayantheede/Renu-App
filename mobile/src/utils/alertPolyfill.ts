import { Platform, Alert } from 'react-native';

export function setupAlertPolyfill() {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const showCustomModal = (title: string, message?: string, buttons?: any[]) => {
    const existing = document.getElementById('renubiome-custom-alert-overlay');
    if (existing) {
      existing.remove();
    }

    const overlay = document.createElement('div');
    overlay.id = 'renubiome-custom-alert-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(8, 30, 26, 0.65);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999999;
      padding: 16px;
      animation: rbFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: #FFFFFF;
      border-radius: 20px;
      max-width: 460px;
      width: 100%;
      padding: 24px;
      box-shadow: 0 24px 60px rgba(12, 96, 84, 0.25);
      border: 1px solid rgba(12, 96, 84, 0.15);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      animation: rbScaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      box-sizing: border-box;
    `;

    // Header with ReNu icon accent
    const headerRow = document.createElement('div');
    headerRow.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    `;

    const iconBadge = document.createElement('div');
    iconBadge.style.cssText = `
      width: 32px;
      height: 32px;
      border-radius: 10px;
      background: #E6F4F1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #0C6054;
      font-weight: 800;
      font-size: 16px;
      flex-shrink: 0;
    `;
    iconBadge.textContent = '🌱';
    headerRow.appendChild(iconBadge);

    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    titleEl.style.cssText = `
      margin: 0;
      color: #0C6054;
      font-size: 17px;
      font-weight: 700;
      letter-spacing: -0.01em;
      flex: 1;
    `;
    headerRow.appendChild(titleEl);
    dialog.appendChild(headerRow);

    if (message) {
      const msgEl = document.createElement('div');
      msgEl.textContent = message;
      msgEl.style.cssText = `
        margin: 0 0 20px 0;
        color: #475569;
        font-size: 13.5px;
        line-height: 1.55;
        white-space: pre-wrap;
        word-break: break-word;
      `;
      dialog.appendChild(msgEl);
    }

    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = `
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      flex-wrap: wrap;
      margin-top: 16px;
    `;

    const btnList = (!buttons || buttons.length === 0) ? [{ text: 'OK', style: 'default' }] : buttons;

    const cleanup = () => {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.15s ease';
      setTimeout(() => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 150);
    };

    btnList.forEach((btn: any) => {
      const buttonEl = document.createElement('button');
      buttonEl.textContent = btn.text || 'OK';
      const isCancel = btn.style === 'cancel' || btn.text?.toLowerCase() === 'cancel';
      const isDestructive = btn.style === 'destructive';

      buttonEl.style.cssText = `
        padding: 9px 18px;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
        outline: none;
        border: ${isCancel ? '1px solid #CBD5E1' : 'none'};
        background: ${isCancel ? '#F1F5F9' : (isDestructive ? '#EF4444' : '#0C6054')};
        color: ${isCancel ? '#334155' : '#FFFFFF'};
      `;

      buttonEl.onmouseover = () => {
        buttonEl.style.opacity = '0.9';
        buttonEl.style.transform = 'translateY(-1px)';
      };
      buttonEl.onmouseout = () => {
        buttonEl.style.opacity = '1';
        buttonEl.style.transform = 'none';
      };

      buttonEl.onclick = () => {
        cleanup();
        if (typeof btn.onPress === 'function') {
          btn.onPress();
        }
      };

      btnContainer.appendChild(buttonEl);
    });

    dialog.appendChild(btnContainer);
    overlay.appendChild(dialog);

    overlay.onclick = (e) => {
      if (e.target === overlay) {
        const cancelBtn = btnList.find((b: any) => b.style === 'cancel' || b.text?.toLowerCase() === 'cancel') || (btnList.length === 1 ? btnList[0] : null);
        cleanup();
        if (cancelBtn && typeof cancelBtn.onPress === 'function') {
          cancelBtn.onPress();
        }
      }
    };

    document.body.appendChild(overlay);
  };

  // Polyfill React Native Alert.alert
  Alert.alert = showCustomModal;

  // Polyfill window.alert
  window.alert = (msg?: any) => {
    showCustomModal('ReNu-Biome Notice', String(msg || ''));
  };
}

// Automatically execute on import
setupAlertPolyfill();

