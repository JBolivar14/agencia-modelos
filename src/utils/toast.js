// Sistema de notificaciones Toast para React

export const toast = {
  success: (message, duration = 3000) => {
    showToast(message, 'success', duration);
  },
  error: (message, duration = 3000) => {
    showToast(message, 'error', duration);
  },
  warning: (message, duration = 3000) => {
    showToast(message, 'warning', duration);
  },
  info: (message, duration = 3000) => {
    showToast(message, 'info', duration);
  },
};

function showToast(message, type = 'info', duration = 3000) {
  // Crear contenedor si no existe
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;
    document.body.appendChild(container);
  }

  // Crear toast
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.style.cssText = `
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    padding: 1rem 1.5rem;
    border-radius: 0.5rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 300px;
    animation: slideInRight 0.3s ease-out;
    border-left: 4px solid ${getColor(type)};
  `;

  const icon = getIcon(type);
  toast.innerHTML = `
    <span style="font-size: 1.5rem;">${icon}</span>
    <span style="flex: 1; color: #1f2937; font-weight: 500;">${escapeHtml(message)}</span>
    <button onclick="this.parentElement.remove()" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: #6b7280;">✕</button>
  `;

  container.appendChild(toast);

  // Auto-remover después de duration
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease-out';
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 300);
  }, duration);
}

function getColor(type) {
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
  };
  return colors[type] || colors.info;
}

function getIcon(type) {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };
  return icons[type] || icons.info;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Agregar estilos de animación si no existen
if (!document.getElementById('toast-styles')) {
  const style = document.createElement('style');
  style.id = 'toast-styles';
  style.textContent = `
    @keyframes slideInRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOutRight {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}
