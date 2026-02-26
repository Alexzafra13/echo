import { useState, useCallback, useRef, useEffect } from 'react';
import { Sidebar } from '@features/home/components/Sidebar/Sidebar';
import { HeaderWithSearch } from '@shared/components/layout/Header/HeaderWithSearch';
import { handleAvatarError } from '@shared/utils/avatar.utils';
import { useAuthStore } from '@shared/store';
import {
  useConversations,
  useMessages,
  useSendMessage,
  useStartConversation,
  useMarkAsRead,
} from '../../hooks/useChat';
import { getFriends, Friend } from '@features/social/services/social.service';
import type { Conversation } from '../../services/chat.service';
import styles from './ChatPage.module.css';

export function ChatPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewConv, setShowNewConv] = useState(false);
  const currentUserId = useAuthStore((s) => s.user?.id);

  const { data: conversations = [] } = useConversations();
  const selected = conversations.find((c) => c.id === selectedId) || null;

  const handleSelect = useCallback((conv: Conversation) => {
    setSelectedId(conv.id);
  }, []);

  return (
    <div className={styles.chatPage}>
      <Sidebar />
      <div className={styles.chatPage__main}>
        <HeaderWithSearch />
        <div className={styles.chatPage__content}>
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            onSelect={handleSelect}
            onNewConversation={() => setShowNewConv(true)}
          />
          {selected && currentUserId ? (
            <ChatView
              conversation={selected}
              currentUserId={currentUserId}
              onBack={() => setSelectedId(null)}
            />
          ) : (
            <div className={styles.chatView}>
              <div className={styles.chatView__empty}>Selecciona una conversación</div>
            </div>
          )}
        </div>
      </div>

      {showNewConv && (
        <NewConversationModal
          onClose={() => setShowNewConv(false)}
          onCreated={(convId) => {
            setSelectedId(convId);
            setShowNewConv(false);
          }}
        />
      )}
    </div>
  );
}

// ------ Conversation List ------

function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onNewConversation,
}: {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (c: Conversation) => void;
  onNewConversation: () => void;
}) {
  return (
    <div className={`${styles.sidebar} ${selectedId ? styles['sidebar--hidden'] : ''}`}>
      <div className={styles.sidebar__header}>
        <h2 className={styles.sidebar__title}>Mensajes</h2>
      </div>
      <button className={styles.sidebar__newBtn} onClick={onNewConversation}>
        + Nueva conversación
      </button>
      <div className={styles.sidebar__list}>
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={`${styles.conversationItem} ${selectedId === conv.id ? styles['conversationItem--active'] : ''}`}
            onClick={() => onSelect(conv)}
          >
            <div className={styles.conversationItem__avatar}>
              {conv.otherUser.avatarUrl ? (
                <img
                  src={conv.otherUser.avatarUrl}
                  alt={conv.otherUser.username}
                  onError={handleAvatarError}
                />
              ) : (
                conv.otherUser.username[0].toUpperCase()
              )}
            </div>
            <div className={styles.conversationItem__info}>
              <div className={styles.conversationItem__name}>
                {conv.otherUser.name || conv.otherUser.username}
              </div>
              {conv.lastMessage && (
                <div className={styles.conversationItem__lastMsg}>{conv.lastMessage.content}</div>
              )}
            </div>
            {conv.unreadCount > 0 && (
              <div className={styles.conversationItem__badge}>{conv.unreadCount}</div>
            )}
          </div>
        ))}
        {conversations.length === 0 && (
          <div
            style={{
              padding: '20px',
              textAlign: 'center',
              color: 'var(--color-text-secondary)',
              fontSize: 13,
            }}
          >
            Sin conversaciones
          </div>
        )}
      </div>
    </div>
  );
}

// ------ Chat View ------

function ChatView({
  conversation,
  currentUserId,
  onBack,
}: {
  conversation: Conversation;
  currentUserId: string;
  onBack: () => void;
}) {
  const { data: messages = [] } = useMessages(conversation.id);
  const sendMessage = useSendMessage();
  const markRead = useMarkAsRead();
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Mark as read when opening
  useEffect(() => {
    if (conversation.unreadCount > 0) {
      markRead.mutate(conversation.id);
    }
  }, [conversation.id, conversation.unreadCount]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || sendMessage.isPending) return;
    sendMessage.mutate({ conversationId: conversation.id, content: trimmed });
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return (
      d.toLocaleDateString([], { day: 'numeric', month: 'short' }) +
      ' ' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  };

  return (
    <div className={styles.chatView}>
      <div className={styles.chatView__header}>
        <button className={styles.chatView__back} onClick={onBack}>
          ←
        </button>
        <div className={styles.chatView__headerAvatar}>
          {conversation.otherUser.avatarUrl ? (
            <img
              src={conversation.otherUser.avatarUrl}
              alt={conversation.otherUser.username}
              onError={handleAvatarError}
            />
          ) : (
            conversation.otherUser.username[0].toUpperCase()
          )}
        </div>
        <div className={styles.chatView__headerName}>
          {conversation.otherUser.name || conversation.otherUser.username}
        </div>
      </div>

      <div className={styles.chatView__messages}>
        {messages.map((msg) => {
          const isMine = msg.senderId === currentUserId;
          return (
            <div
              key={msg.id}
              className={`${styles.message} ${isMine ? styles['message--mine'] : styles['message--theirs']}`}
            >
              {msg.content}
              <div className={styles.message__time}>{formatTime(msg.createdAt)}</div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.chatView__input}>
        <textarea
          className={styles.chatView__inputField}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un mensaje..."
          rows={1}
        />
        <button
          className={styles.chatView__sendBtn}
          onClick={handleSend}
          disabled={!text.trim() || sendMessage.isPending}
        >
          ➤
        </button>
      </div>
    </div>
  );
}

// ------ New Conversation Modal ------

function NewConversationModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (conversationId: string) => void;
}) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [search, setSearch] = useState('');
  const startConv = useStartConversation();

  useEffect(() => {
    getFriends()
      .then(setFriends)
      .catch(() => {});
  }, []);

  const filtered = friends.filter(
    (f) =>
      f.username.toLowerCase().includes(search.toLowerCase()) ||
      (f.name && f.name.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSelect = async (friend: Friend) => {
    const result = await startConv.mutateAsync(friend.id);
    onCreated(result.conversationId);
  };

  return (
    <div className={styles.newConvOverlay} onClick={onClose}>
      <div className={styles.newConvModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.newConvModal__header}>
          <h3 className={styles.newConvModal__title}>Nueva conversación</h3>
          <button className={styles.newConvModal__close} onClick={onClose}>
            ×
          </button>
        </div>
        <input
          className={styles.newConvModal__search}
          placeholder="Buscar amigo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        <div className={styles.newConvModal__list}>
          {filtered.map((friend) => (
            <div key={friend.id} className={styles.friendItem} onClick={() => handleSelect(friend)}>
              <div className={styles.friendItem__avatar}>
                {friend.avatarUrl ? (
                  <img src={friend.avatarUrl} alt={friend.username} onError={handleAvatarError} />
                ) : (
                  friend.username[0].toUpperCase()
                )}
              </div>
              <div className={styles.friendItem__name}>{friend.name || friend.username}</div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div
              style={{
                padding: '20px',
                textAlign: 'center',
                color: 'var(--color-text-secondary)',
                fontSize: 13,
              }}
            >
              {friends.length === 0 ? 'No tienes amigos aún' : 'Sin resultados'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
