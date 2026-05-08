import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getAccessToken,
  getConversation,
  listConversations,
  sendConversationMessage,
  startConversation,
} from "../../services/api";
import { useAuth } from "./AuthContext";

const getPresenceLabel = (profile) => {
  if (profile?.is_online) {
    return "Online";
  }

  if (profile?.last_seen) {
    return `Last seen ${new Date(profile.last_seen).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }

  if (profile?.activity_status === "recently_active") {
    return "Recently active";
  }

  return "Offline";
};

const getDisplayName = (profile) => {
  const fullName = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim();
  return fullName || profile?.username || profile?.email || "Rehomer";
};

const formatConversationTime = (value) => {
  if (!value) {
    return "";
  }

  const timestamp = new Date(value);
  const now = new Date();
  const sameDay = timestamp.toDateString() === now.toDateString();

  if (sameDay) {
    return timestamp.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  return timestamp.toLocaleDateString([], { month: "short", day: "numeric" });
};

const formatBubbleTime = (value) => {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const formatDayDivider = (value) => {
  if (!value) {
    return "";
  }

  const timestamp = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (timestamp.toDateString() === today.toDateString()) {
    return "Today";
  }

  if (timestamp.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return timestamp.toLocaleDateString([], { month: "short", day: "numeric" });
};

const groupMessagesByDay = (messages) => {
  const groups = [];

  messages.forEach((message) => {
    const dayLabel = formatDayDivider(message.created_at);
    const currentGroup = groups[groups.length - 1];

    if (!currentGroup || currentGroup.label !== dayLabel) {
      groups.push({ label: dayLabel, messages: [message] });
      return;
    }

    currentGroup.messages.push(message);
  });

  return groups;
};

const getAvatarLabel = (profile) => {
  return getDisplayName(profile).charAt(0).toUpperCase();
};

const styles = `
  .chat-shell {
    min-height: 100vh;
    background:
      radial-gradient(circle at top right, rgba(255, 207, 128, 0.35), transparent 26%),
      linear-gradient(180deg, #fff9ef 0%, #fffdf9 100%);
  }

  .chat-page {
    max-width: 430px;
    min-height: 100vh;
    margin: 0 auto;
    background: #f8efe0;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }

  .chat-page::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image:
      radial-gradient(rgba(217, 119, 6, 0.07) 1px, transparent 1px),
      radial-gradient(rgba(245, 158, 11, 0.06) 1px, transparent 1px);
    background-position: 0 0, 14px 14px;
    background-size: 28px 28px;
    pointer-events: none;
  }

  .chat-page > * {
    position: relative;
    z-index: 1;
  }

  .chat-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 16px 14px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 247, 234, 0.95));
    border-bottom: 1px solid rgba(217, 119, 6, 0.12);
  }

  .chat-back {
    border: none;
    background: rgba(255, 255, 255, 0.9);
    color: #a55b00;
    width: 38px;
    height: 38px;
    border-radius: 999px;
    font-size: 22px;
    display: grid;
    place-items: center;
    box-shadow: 0 10px 20px rgba(163, 91, 0, 0.12);
    cursor: pointer;
  }

  .chat-avatar {
    width: 46px;
    height: 46px;
    border-radius: 16px;
    overflow: hidden;
    background: linear-gradient(135deg, #ffd27a 0%, #ff9800 100%);
    color: #fff;
    display: grid;
    place-items: center;
    font-size: 18px;
    font-weight: 800;
    flex-shrink: 0;
  }

  .chat-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .chat-header__meta {
    min-width: 0;
    flex: 1;
  }

  .chat-header__meta h1 {
    margin: 0;
    font-size: 17px;
    line-height: 1.2;
    color: #2d1800;
  }

  .chat-header__meta p {
    margin: 4px 0 0;
    font-size: 12px;
    color: #7f5f2e;
  }

  .chat-header__meta .chat-presence {
    color: #1a7a48;
    font-weight: 700;
  }

  .chat-list {
    display: grid;
    gap: 10px;
    padding: 14px 16px 120px;
    overflow-y: auto;
  }

  .chat-pill {
    width: 100%;
    border: 1px solid rgba(217, 119, 6, 0.14);
    background: rgba(255, 255, 255, 0.95);
    border-radius: 20px;
    padding: 14px 14px 12px;
    text-align: left;
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    box-shadow: 0 10px 18px rgba(163, 91, 0, 0.05);
  }

  .chat-pill.is-active {
    border-color: rgba(217, 119, 6, 0.28);
    background: linear-gradient(180deg, #fff7e8 0%, #ffffff 100%);
  }

  .chat-pill__meta {
    min-width: 0;
    flex: 1;
    display: grid;
    gap: 4px;
  }

  .chat-pill strong,
  .chat-pill span,
  .chat-pill small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chat-pill strong {
    font-size: 13px;
    color: #2d1800;
  }

  .chat-pill span {
    font-size: 11px;
    color: #9b7337;
  }

  .chat-pill small {
    font-size: 11px;
    color: #7f5f2e;
  }

  .chat-pill__time {
    align-self: flex-start;
    font-size: 10px;
    color: #a77a3e;
    font-weight: 700;
    white-space: nowrap;
  }

  .chat-list-empty {
    padding: 22px 18px;
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.94);
    border: 1px solid rgba(217, 119, 6, 0.12);
    color: #6a4b19;
    box-shadow: 0 18px 32px rgba(84, 52, 8, 0.06);
  }

  .chat-list-empty h2 {
    margin: 0 0 8px;
    font-size: 18px;
    color: #2d1800;
  }

  .chat-list-empty p {
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
  }

  .chat-thread {
    flex: 1;
    overflow-y: auto;
    padding: 18px 14px 92px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .chat-day-note {
    align-self: center;
    background: rgba(255, 255, 255, 0.72);
    color: #8b6732;
    border-radius: 999px;
    padding: 6px 12px;
    font-size: 11px;
    font-weight: 700;
  }

  .chat-date-divider {
    align-self: center;
    margin: 6px 0 2px;
    padding: 5px 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.82);
    color: #8b6732;
    font-size: 11px;
    font-weight: 800;
    box-shadow: 0 8px 18px rgba(84, 52, 8, 0.05);
  }

  .chat-bubble {
    max-width: 82%;
    display: grid;
    gap: 6px;
    padding: 12px 14px 10px;
    border-radius: 18px;
    box-shadow: 0 10px 20px rgba(84, 52, 8, 0.08);
  }

  .chat-bubble--mine {
    align-self: flex-end;
    background: linear-gradient(180deg, #ffb12f 0%, #ff9800 100%);
    color: #fff;
    border-bottom-right-radius: 6px;
  }

  .chat-bubble--theirs {
    align-self: flex-start;
    background: rgba(255, 255, 255, 0.96);
    color: #341f00;
    border: 1px solid rgba(217, 119, 6, 0.1);
    border-bottom-left-radius: 6px;
  }

  .chat-bubble p {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 14px;
    line-height: 1.5;
  }

  .chat-bubble__time {
    justify-self: end;
    font-size: 11px;
    opacity: 0.82;
  }

  .chat-empty,
  .chat-loading {
    padding: 22px 18px;
    margin: 18px 16px 0;
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.94);
    border: 1px solid rgba(217, 119, 6, 0.12);
    color: #6a4b19;
    box-shadow: 0 18px 32px rgba(84, 52, 8, 0.06);
  }

  .chat-empty h2,
  .chat-loading h2 {
    margin: 0 0 8px;
    font-size: 18px;
    color: #2d1800;
  }

  .chat-empty p,
  .chat-loading p {
    margin: 0;
    line-height: 1.6;
    font-size: 14px;
  }

  .chat-composer {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0px));
    background: linear-gradient(180deg, rgba(248, 239, 224, 0) 0%, rgba(255, 250, 243, 0.82) 36%);
  }

  .chat-composer__card {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    padding: 8px 8px 8px 12px;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.94);
    border: 1px solid rgba(217, 119, 6, 0.14);
    box-shadow: 0 10px 18px rgba(84, 52, 8, 0.07);
  }

  .chat-composer textarea {
    flex: 1;
    border: none;
    resize: none;
    outline: none;
    background: transparent;
    min-height: 24px;
    max-height: 120px;
    padding: 8px 4px 6px;
    font: inherit;
    color: #341f00;
  }

  .chat-send {
    border: none;
    background: linear-gradient(180deg, #ffb12f 0%, #ff9800 100%);
    color: #fff;
    width: 40px;
    height: 40px;
    border-radius: 14px;
    display: grid;
    place-items: center;
    font-size: 18px;
    cursor: pointer;
    box-shadow: 0 14px 24px rgba(255, 152, 0, 0.28);
  }

  .chat-send:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    box-shadow: none;
  }

  .chat-error {
    margin: 8px 16px 0;
    padding: 12px 14px;
    border-radius: 16px;
    background: #fff2dc;
    border: 1px solid rgba(217, 119, 6, 0.18);
    color: #a55b00;
    font-size: 13px;
    font-weight: 700;
  }
`;

const ChatThread = () => {
  const { conversationId, petId } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [composer, setComposer] = useState("");
  const threadRef = useRef(null);

  const isRehomerView = userData?.role === "rehomer" || userData?.role === "shelter_admin";

  const backTarget = useMemo(() => {
    if (conversationId) {
      return "/chats";
    }

    if (isRehomerView) {
      return "/rehomer-dashboard";
    }

    return "/pets";
  }, [conversationId, isRehomerView]);

  const loadConversations = async () => {
    const response = await listConversations();
    const items = Array.isArray(response) ? response : response?.results || [];
    setConversations(items);
    return items;
  };

  const loadConversationDetail = async (targetConversationId) => {
    if (!targetConversationId) {
      setConversation(null);
      return;
    }

    setLoadingThread(true);

    try {
      const response = await getConversation(targetConversationId);
      setConversation(response);
      setConversations((currentConversations) =>
        currentConversations.map((item) => (String(item.id) === String(response.id) ? response : item)),
      );
    } finally {
      setLoadingThread(false);
    }
  };

  useEffect(() => {
    if (!getAccessToken()) {
      navigate("/login/user", { replace: true });
      return;
    }

    let isMounted = true;

    const initialize = async () => {
      try {
        setLoading(true);
        setError("");

        if (petId) {
          const startedConversation = await startConversation(petId);
          if (isMounted) {
            navigate(`/chats/${startedConversation.id}`, { replace: true });
          }
          return;
        }

        await loadConversations();

        if (!isMounted) {
          return;
        }

        if (conversationId) {
          await loadConversationDetail(conversationId);
        } else {
          setConversation(null);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || "Could not open your chat right now.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, [conversationId, navigate, petId]);

  useEffect(() => {
    if (!conversationId) {
      return undefined;
    }

    const interval = setInterval(async () => {
      try {
        await loadConversationDetail(conversationId);
        await loadConversations();
      } catch (pollError) {
        console.error("Error refreshing chat:", pollError);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [conversationId]);

  useEffect(() => {
    if (!threadRef.current) {
      return;
    }

    threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [conversation?.messages?.length]);

  const handleOpenConversation = async (nextConversationId) => {
    navigate(`/chats/${nextConversationId}`);
  };

  const handleSend = async () => {
    if (!conversation?.id || !composer.trim()) {
      return;
    }

    try {
      setSending(true);
      setError("");
      const updatedConversation = await sendConversationMessage(conversation.id, composer.trim());
      setConversation(updatedConversation);
      setConversations((currentConversations) => {
        const withoutCurrent = currentConversations.filter(
          (item) => String(item.id) !== String(updatedConversation.id),
        );

        return [updatedConversation, ...withoutCurrent];
      });
      setComposer("");
    } catch (sendError) {
      setError(sendError.message || "Could not send your message.");
    } finally {
      setSending(false);
    }
  };

  const handleComposerKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const otherParticipant = conversation?.other_participant || null;
  const messages = conversation?.messages || [];
  const groupedMessages = useMemo(() => groupMessagesByDay(messages), [messages]);
  const showInboxOnly = !conversationId;
  const headerTitle = showInboxOnly
    ? isRehomerView
      ? "Chats"
      : "Messages"
    : otherParticipant
      ? getDisplayName(otherParticipant)
      : "Chat";
  const headerSubtitle = showInboxOnly
    ? isRehomerView
      ? "All adopter conversations"
      : "Your pet conversations"
    : otherParticipant
      ? getPresenceLabel(otherParticipant)
      : "Opening chat...";

  return (
    <div className="chat-shell">
      <style>{styles}</style>
      <div className="chat-page">
        <header className="chat-header">
          <button type="button" className="chat-back" onClick={() => navigate(backTarget)}>
            ‹
          </button>
          <div className="chat-avatar">
            {!showInboxOnly && otherParticipant?.profile_photo_url ? (
              <img src={otherParticipant.profile_photo_url} alt={getDisplayName(otherParticipant)} />
            ) : (
              <span>{showInboxOnly ? "C" : getAvatarLabel(otherParticipant)}</span>
            )}
          </div>
          <div className="chat-header__meta">
            <h1>{headerTitle}</h1>
            <p className="chat-presence">{headerSubtitle}</p>
            {!showInboxOnly && conversation?.pet?.name ? <p>Talking about {conversation.pet.name}</p> : null}
          </div>
        </header>

        {error ? <div className="chat-error">{error}</div> : null}

        {loading ? (
          <div className="chat-loading">
            <h2>Opening chat...</h2>
            <p>Getting your conversation ready.</p>
          </div>
        ) : (
          <>
            {showInboxOnly ? (
              <div className="chat-list">
                {conversations.length === 0 ? (
                  <div className="chat-list-empty">
                    <h2>No chats yet</h2>
                    <p>
                      When adopters message you about one of your pets, their conversation will appear here.
                    </p>
                  </div>
                ) : (
                  conversations.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="chat-pill"
                      onClick={() => handleOpenConversation(item.id)}
                    >
                      <div className="chat-avatar">
                        {item.other_participant?.profile_photo_url ? (
                          <img
                            src={item.other_participant.profile_photo_url}
                            alt={getDisplayName(item.other_participant)}
                          />
                        ) : (
                          <span>{getAvatarLabel(item.other_participant)}</span>
                        )}
                      </div>
                      <div className="chat-pill__meta">
                        <strong>{getDisplayName(item.other_participant)}</strong>
                        <span>About {item.pet?.name || "this pet"}</span>
                        <small>{item.last_message?.body || "Open chat"}</small>
                      </div>
                      <div className="chat-pill__time">
                        {item.last_message?.created_at
                          ? formatConversationTime(item.last_message.created_at)
                          : ""}
                      </div>
                    </button>
                  ))
                )}
              </div>
            ) : conversation ? (
              <>
                <div className="chat-thread" ref={threadRef}>
                  <div className="chat-day-note">Keep chatting here about {conversation.pet?.name || "this pet"}</div>
                  {loadingThread && messages.length === 0 ? (
                    <div className="chat-loading">
                      <p>Loading messages...</p>
                    </div>
                  ) : null}
                  {groupedMessages.map((group) => (
                    <React.Fragment key={group.label}>
                      <div className="chat-date-divider">{group.label}</div>
                      {group.messages.map((message) => (
                        <article
                          key={message.id}
                          className={`chat-bubble ${message.is_mine ? "chat-bubble--mine" : "chat-bubble--theirs"}`}
                        >
                          <p>{message.body}</p>
                          <span className="chat-bubble__time">{formatBubbleTime(message.created_at)}</span>
                        </article>
                      ))}
                    </React.Fragment>
                  ))}
                </div>

                <div className="chat-composer">
                  <div className="chat-composer__card">
                    <textarea
                      value={composer}
                      onChange={(event) => setComposer(event.target.value)}
                      onKeyDown={handleComposerKeyDown}
                      placeholder={`Message ${otherParticipant ? getDisplayName(otherParticipant) : "the rehomer"}`}
                      rows={1}
                    />
                    <button
                      type="button"
                      className="chat-send"
                      onClick={handleSend}
                      disabled={sending || !composer.trim()}
                      aria-label="Send message"
                    >
                      {sending ? "…" : "➤"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="chat-empty">
                <h2>No chats yet</h2>
                <p>
                  Open a pet and tap <strong>Chat with rehomer</strong> to begin a flowing conversation here.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ChatThread;
