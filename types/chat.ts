/**
 * TypeScript types for chat functionality
 */

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'staff';
  timestamp: Date;
  attachments?: ChatAttachment[];
  read?: boolean;
}

export interface ChatAttachment {
  type: 'image' | 'file';
  url: string;
  name?: string;
}

export interface ChatConversation {
  id: string;
  messages: ChatMessage[];
  customerEmail?: string;
  customerName?: string;
  status: 'active' | 'closed' | 'pending';
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatConfig {
  greetingMessage: string;
  colors: {
    background: string;
    text: string;
    buttons: string;
  };
  position: {
    horizontal: 'left' | 'right';
    vertical: 'lowest' | 'higher' | 'highest';
  };
  icon: string;
  label: string;
}
