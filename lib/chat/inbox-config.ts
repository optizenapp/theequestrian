/**
 * Shopify Inbox Configuration
 * 
 * These settings match the Shopify Inbox app embed settings.
 * You can override these in code, or we can try to read them
 * from the existing widget's configuration.
 */

export interface InboxConfig {
  // Brand Customization
  colors: {
    background: string; // e.g., "#00B2A9"
    text: string; // e.g., "#FFFFFF"
    buttons: string; // e.g., "#6A6A6A"
  };
  
  // Icon & Label
  icon: 'chat-bubble' | 'email' | 'question-mark' | 'smiley-face' | 'team' | 'hand-wave' | 'none';
  label: 'Chat' | 'Assistance' | 'Contact' | 'Help' | 'Support' | 'Live chat' | 'Message us' | 'Need help?' | 'none';
  
  // Position
  horizontalPosition: 'left' | 'right';
  verticalPosition: 'lowest' | 'higher' | 'highest';
  
  // Greeting Message
  greetingMessage: string;
}

/**
 * Default configuration matching your current Shopify Inbox settings
 */
export const defaultInboxConfig: InboxConfig = {
  colors: {
    background: '#00B2A9', // Teal
    text: '#FFFFFF',
    buttons: '#6A6A6A',
  },
  icon: 'chat-bubble',
  label: 'none',
  horizontalPosition: 'right',
  verticalPosition: 'lowest',
  greetingMessage: '👋 Hey. Welcome to The Equestrian. If you have a question, just ask. We\'ll reply shortly.',
};

/**
 * Get configuration from environment variables or use defaults
 */
export function getInboxConfig(): InboxConfig {
  // Allow override via environment variables
  return {
    colors: {
      background: process.env.NEXT_PUBLIC_CHAT_BACKGROUND_COLOR || defaultInboxConfig.colors.background,
      text: process.env.NEXT_PUBLIC_CHAT_TEXT_COLOR || defaultInboxConfig.colors.text,
      buttons: process.env.NEXT_PUBLIC_CHAT_BUTTON_COLOR || defaultInboxConfig.colors.buttons,
    },
    icon: (process.env.NEXT_PUBLIC_CHAT_ICON as InboxConfig['icon']) || defaultInboxConfig.icon,
    label: (process.env.NEXT_PUBLIC_CHAT_LABEL as InboxConfig['label']) || defaultInboxConfig.label,
    horizontalPosition: (process.env.NEXT_PUBLIC_CHAT_HORIZONTAL_POSITION as 'left' | 'right') || defaultInboxConfig.horizontalPosition,
    verticalPosition: (process.env.NEXT_PUBLIC_CHAT_VERTICAL_POSITION as 'lowest' | 'higher' | 'highest') || defaultInboxConfig.verticalPosition,
    greetingMessage: process.env.NEXT_PUBLIC_CHAT_GREETING_MESSAGE || defaultInboxConfig.greetingMessage,
  };
}

/**
 * Try to read configuration from existing Shopify Inbox widget
 * This attempts to extract settings from the widget's DOM/configuration
 */
export function readConfigFromWidget(): Partial<InboxConfig> | null {
  if (typeof window === 'undefined') return null;
  
  try {
    // Try to find the Shopify Chat widget
    const chatWidget = document.querySelector('[data-shopify-chat]') || 
                      document.querySelector('#shopify-chat') ||
                      document.querySelector('.shopify-chat');
    
    if (!chatWidget) return null;
    
    // Try to read styles from the widget
    const computedStyle = window.getComputedStyle(chatWidget);
    const backgroundColor = computedStyle.backgroundColor;
    
    // Try to find greeting message in the widget
    const greetingElement = chatWidget.querySelector('[data-greeting]') ||
                           chatWidget.querySelector('.greeting-message');
    const greetingMessage = greetingElement?.textContent?.trim() || null;
    
    return {
      colors: {
        background: backgroundColor || defaultInboxConfig.colors.background,
        text: defaultInboxConfig.colors.text,
        buttons: defaultInboxConfig.colors.buttons,
      },
      greetingMessage: greetingMessage || undefined,
    };
  } catch (error) {
    console.warn('Failed to read config from widget:', error);
    return null;
  }
}

/**
 * Merge widget config with defaults
 */
export function getMergedConfig(): InboxConfig {
  const defaultConfig = getInboxConfig();
  const widgetConfig = readConfigFromWidget();
  
  if (!widgetConfig) return defaultConfig;
  
  return {
    ...defaultConfig,
    ...widgetConfig,
    colors: {
      ...defaultConfig.colors,
      ...widgetConfig.colors,
    },
  };
}
