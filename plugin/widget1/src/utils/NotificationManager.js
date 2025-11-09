/**
 * Simple notification manager for user feedback about server issues
 */

class NotificationManager {
  constructor() {
    this.notifications = new Set();
    this.container = null;
    this.initContainer();
  }

  initContainer() {
    if (typeof window === 'undefined') return;
    
    // Create notification container if it doesn't exist
    this.container = document.getElementById('notification-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'notification-container';
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
        pointer-events: none;
      `;
      document.body.appendChild(this.container);
    }
  }

  show(message, type = 'info', duration = 5000) {
    if (typeof window === 'undefined') return;
    
    const notificationId = `${type}-${Date.now()}`;
    if (this.notifications.has(notificationId)) return;

    this.notifications.add(notificationId);

    const notification = document.createElement('div');
    notification.id = notificationId;
    notification.style.cssText = `
      background: ${this.getBackgroundColor(type)};
      color: white;
      padding: 12px 16px;
      margin-bottom: 8px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      line-height: 1.4;
      pointer-events: auto;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
      cursor: pointer;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px;">${this.getIcon(type)}</span>
        <span>${message}</span>
      </div>
    `;

    // Click to dismiss
    notification.addEventListener('click', () => {
      this.dismiss(notificationId);
    });

    this.container.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    }, 10);

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(notificationId);
      }, duration);
    }

    return notificationId;
  }

  dismiss(notificationId) {
    const notification = document.getElementById(notificationId);
    if (notification) {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
        this.notifications.delete(notificationId);
      }, 300);
    }
  }

  getBackgroundColor(type) {
    switch (type) {
      case 'success': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'error': return '#ef4444';
      case 'info': 
      default: return '#3b82f6';
    }
  }

  getIcon(type) {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'info': 
      default: return 'ℹ️';
    }
  }
}

// Global instance
const notificationManager = new NotificationManager();

// Global function for easy access
if (typeof window !== 'undefined') {
  window.showNotification = (message, type, duration) => {
    return notificationManager.show(message, type, duration);
  };
}

export default notificationManager;