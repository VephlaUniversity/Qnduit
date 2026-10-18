import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { Search, Send, Paperclip, Smile, MoreVertical } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";

const chatKey = chat => `${chat.role}:${chat._id}`;
// Only absolute timestamps are trustworthy across server/viewer timezones.
const messageDate = value => {
  if (typeof value !== "string") return null;
  const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i);
  if (!parts) return null;
  const [, year, month, day, hour, minute, second] = parts.map(Number);
  const monthEnd = new Date(0);
  monthEnd.setUTCFullYear(year, month, 0);
  if (month < 1 || month > 12 || day < 1 || day > monthEnd.getUTCDate() || hour > 23 || minute > 59 || second > 59) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
};
const localDay = value => {
  const date = messageDate(value);
  return date ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` : null;
};
const messageTime = value => {
  const date = messageDate(value);
  if (!date) return "";
  const hour = date.getHours();
  return `${String(hour % 12 || 12).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}${hour < 12 ? "am" : "pm"}`;
};
const messageDayLabel = value => messageDate(value)?.toDateString() || "Date unavailable";

export const Messages = () => {
  useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChat, setSelectedChat] = useState(null);
  const [messageInput, setMessageInput] = useState("");
  const [chats, setChats] = useState([]);
  const [listState, setListState] = useState({ query: "", status: "loading" });
  const [transcript, setTranscript] = useState({ key: "", version: 0, status: "idle", messages: [] });
  const [conversationVersion, setConversationVersion] = useState(0);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const pane = useRef(null);
  const composer = useRef(null);
  const composing = useRef(false);
  const mounted = useRef(true);
  const transcriptRequest = useRef(null);
  const activeConversation = useRef({ key: "", version: 0 });
  const pendingScroll = useRef(null);
  const sendPending = useRef(false);
  const previews = useRef(new Map());
  const selectedKey = selectedChat ? chatKey(selectedChat) : "";
  const currentTranscript = transcript.key === selectedKey && transcript.version === conversationVersion;
  const transcriptLoading = Boolean(selectedChat) && (!currentTranscript || transcript.status === "loading");
  const listLoading = listState.query !== searchQuery || listState.status === "loading";

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; transcriptRequest.current?.abort(); };
  }, []);

  const rememberPreview = useCallback((chat, preview) => {
    const key = chatKey(chat);
    previews.current.set(key, preview);
    setChats(previous => previous.map(item => chatKey(item) === key ? { ...item, ...preview } : item));
  }, []);

  const selectChat = chat => {
    transcriptRequest.current?.abort();
    const version = activeConversation.current.version + 1;
    activeConversation.current = { key: chatKey(chat), version };
    pendingScroll.current = null;
    setSelectedChat(chat);
    setConversationVersion(version);
    setSendError("");
  };

  useEffect(() => {
    const controller = new AbortController();
    async function loadChats() {
      setListState({ query: searchQuery, status: "loading" });
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error();
        const { data } = await axios.get(`${API_BASE_URL}/api/messages/${searchQuery ? "search" : "chats"}`, {
          ...(searchQuery ? { params: { query: searchQuery } } : {}),
          headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (!Array.isArray(data.results)) throw new Error();
        setChats(data.results.map(chat => {
          const cached = previews.current.get(chatKey(chat));
          return cached && (!chat.lastMessageAt || new Date(cached.lastMessageAt) > new Date(chat.lastMessageAt))
            ? { ...chat, ...cached } : chat;
        }));
        setListState({ query: searchQuery, status: "ready" });
      } catch {
        if (!controller.signal.aborted) setListState({ query: searchQuery, status: "error" });
      }
    }
    loadChats();
    return () => controller.abort();
  }, [searchQuery]);

  useEffect(() => {
    if (!selectedChat) return;
    const controller = new AbortController();
    transcriptRequest.current = controller;
    const key = selectedKey, version = conversationVersion;
    const current = () => !controller.signal.aborted && activeConversation.current.key === key && activeConversation.current.version === version;
    setTranscript({ key, version, status: "loading", messages: [] });
    async function loadMessages() {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/messages`, {
          params: { withUserId: selectedChat._id }, signal: controller.signal,
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (!current()) return;
        if (!Array.isArray(data.messages)) throw new Error();
        pendingScroll.current = { version, initial: true };
        setTranscript({ key, version, status: "ready", messages: data.messages });
        const latest = data.messages.at(-1);
        rememberPreview(selectedChat, { lastMessage: latest?.text ?? null, lastMessageAt: latest?.createdAt ?? null });
      } catch {
        if (current()) setTranscript({ key, version, status: "error", messages: [] });
      }
    }
    loadMessages();
    return () => {
      controller.abort();
      if (activeConversation.current.version === version) transcriptRequest.current?.abort();
    };
  }, [selectedChat, selectedKey, conversationVersion, rememberPreview]);

  useLayoutEffect(() => {
    if (currentTranscript && transcript.status === "ready" && pendingScroll.current?.version === conversationVersion && pane.current) {
      // Change only the transcript scroll offset; unrelated renders never request a scroll.
      const target = pane.current;
      const previousBehavior = target.style.scrollBehavior;
      // Global smooth scrolling must not animate the initial pre-paint position.
      if (pendingScroll.current.initial) target.style.scrollBehavior = "auto";
      target.scrollTop = target.scrollHeight;
      target.style.scrollBehavior = previousBehavior;
      pendingScroll.current = null;
    }
  }, [transcript, currentTranscript, conversationVersion]);

  useLayoutEffect(() => {
    const resizeComposer = () => {
      const field = composer.current;
      if (!field) return;
      const scrollTop = field.scrollTop;
      const cap = Math.max(32, Math.min(160, window.innerHeight / 4));
      field.style.maxHeight = `${cap}px`;
      field.style.height = "auto";
      field.style.height = `${Math.max(32, Math.min(field.scrollHeight, cap))}px`;
      field.scrollTop = scrollTop;
    };
    resizeComposer();
    window.addEventListener("resize", resizeComposer);
    return () => window.removeEventListener("resize", resizeComposer);
  }, [messageInput]);

  const handleSendMessage = async event => {
    event.preventDefault();
    if (composing.current || sendPending.current || !messageInput.trim() || !selectedChat || transcriptLoading) return;
    sendPending.current = true;
    setSending(true);
    setSendError("");
    const chat = selectedChat, text = messageInput, key = selectedKey, version = conversationVersion;
    const current = () => mounted.current && activeConversation.current.key === key && activeConversation.current.version === version;
    let saved = false;
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.post(`${API_BASE_URL}/api/messages/send`, {
        recipientId: chat._id, recipientModel: chat.role, text,
      }, { headers: { Authorization: `Bearer ${token}` } });
      if (!data.success) throw new Error();
      saved = true;
      if (!mounted.current) return;
      const message = data.message;
      if (!message?._id || typeof message.text !== "string" || !message.createdAt || !Number.isFinite(new Date(message.createdAt).getTime())) throw new Error();
      rememberPreview(chat, { lastMessage: message.text, lastMessageAt: message.createdAt });
      if (!current()) return;
      setMessageInput(value => value === text ? "" : value);
      transcriptRequest.current?.abort();
      const controller = new AbortController();
      transcriptRequest.current = controller;
      pendingScroll.current = { version, initial: false };
      const sent = { id: message._id, text: message.text, createdAt: message.createdAt,
        sender: "me", time: messageTime(message.createdAt), date: new Date(message.createdAt).toDateString() };
      setTranscript(previous => ({ key, version, status: "ready",
        messages: previous.messages.some(item => item.id === sent.id) ? previous.messages : [...previous.messages, sent] }));
      const response = await axios.get(`${API_BASE_URL}/api/messages`, {
        params: { withUserId: chat._id }, signal: controller.signal,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (current() && !controller.signal.aborted) {
        if (!Array.isArray(response.data.messages)) throw new Error();
        // Catch up without scrolling a user who moved up after the save.
        setTranscript({ key, version, status: "ready", messages: response.data.messages });
      }
    } catch {
      if (current()) setSendError(saved
        ? "Message saved, but the transcript could not be refreshed. Reselect the conversation to reload."
        : "Unable to send message. Your text has been kept.");
    } finally {
      sendPending.current = false;
      if (mounted.current) setSending(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          Messages
        </h1>
      </div>

      <div className="grid min-w-0 min-h-0 grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-200px)]">
        {/* Chat List */}
        <div className="min-w-0 min-h-0 bg-[#1A1A1E] rounded-lg border border-white/5 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#0E0E10] border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
          </div>
          <div className="min-w-0 min-h-0 flex-1 overflow-y-auto">
            {listLoading ? <p className="p-4 text-sm text-gray-400" role="status">Loading conversations…</p>
              : listState.status === "error" ? <p className="p-4 text-sm text-red-400" role="alert">Unable to load conversations. Try searching again.</p>
              : chats.length === 0 ? <p className="p-4 text-sm text-gray-400">{searchQuery ? "No matching users." : "No conversations yet."}</p> : null}
            {!listLoading && listState.status === "ready" && chats.map((chat) => (
              <button
                key={chatKey(chat)}
                onClick={() => selectChat(chat)}
                className={`w-full p-4 border-b border-white/5 hover:bg-white/5 transition-colors text-left ${
                  selectedChat?._id === chat._id ? "bg-[#2A2A2E]" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <div
                      className={`w-12 h-12 rounded-full ${chat.color || "bg-gray-500"} flex items-center justify-center text-white font-semibold`}
                    >
                      {typeof chat.avatar === "string" && chat.avatar
                        ? chat.avatar
                        : chat.name ? chat.name.charAt(0) : "?"}
                    </div>
                    {chat.online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1A1A1E]"></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-white font-medium truncate">
                        {chat.name || "Unknown"}
                      </p>
                      <span className="text-xs text-gray-500">{messageTime(chat.lastMessageAt)}</span>
                    </div>
                    {typeof chat.lastMessage === "string" && <p className="text-sm text-gray-400 truncate">{chat.lastMessage}</p>}
                  </div>
                  {chat.unread > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full w-2 h-2 flex-shrink-0"></span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Window */}
        <div className="min-w-0 min-h-0 lg:col-span-2 bg-[#1A1A1E] rounded-lg border border-white/5 overflow-hidden flex flex-col">
          {/* Chat Header */}
          <div className="min-w-0 shrink-0 p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                  A
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1A1A1E]"></span>
              </div>
              <div>
                <p className="text-white font-medium">
                  {selectedChat ? selectedChat.name : "Select a chat"}
                </p>
                <p className="text-sm text-gray-400">
                  {selectedChat ? selectedChat.location || "No location" : ""}
                </p>
              </div>
            </div>
            <button className="text-gray-400 hover:text-white">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={pane} className="min-w-0 min-h-0 flex-1 overflow-y-auto p-6 space-y-4">
            {!selectedChat ? <p className="text-sm text-gray-400">Select a conversation.</p>
              : transcriptLoading ? <p className="text-sm text-gray-400" role="status">Loading messages…</p>
              : transcript.status === "error" ? <p className="text-sm text-red-400" role="alert">Unable to load messages. Reselect the conversation to try again.</p>
              : transcript.messages.length === 0 ? <p className="text-sm text-gray-400">No messages yet.</p> : null}
            {currentTranscript && transcript.status === "ready" && transcript.messages.map((message, index) => (
              <React.Fragment key={message.id}>
                {(index === 0 || localDay(message.createdAt) !== localDay(transcript.messages[index - 1].createdAt)) && (
                  <div className="flex items-center justify-center my-4">
                    <div className="flex-1 h-px bg-white/10"></div>
                    <span className="px-4 text-xs text-gray-500">
                      {messageDayLabel(message.createdAt)}
                    </span>
                    <div className="flex-1 h-px bg-white/10"></div>
                  </div>
                )}
                <div
                  className={`flex min-w-0 ${
                    message.sender === "me" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`min-w-0 max-w-[70%] ${
                      message.sender === "me" ? "order-2" : "order-1"
                    }`}
                  >
                    <div
                      className={`rounded-2xl px-4 py-2.5 ${
                        message.sender === "me"
                          ? "bg-blue-600 text-white rounded-br-md"
                          : "bg-[#2A2A2E] text-white rounded-bl-md"
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">{message.text}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 px-2">
                      {messageTime(message.createdAt) || "Time unavailable"}
                    </p>
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* Message Input */}
          <form
            onSubmit={handleSendMessage}
            className="min-w-0 shrink-0 p-4 border-t border-white/10"
          >
            {sendError && <p className="mb-2 text-sm text-red-400" role="alert">{sendError}</p>}
            <div className="min-w-0 flex items-end gap-2 bg-[#0E0E10] rounded-lg px-4 py-2 border border-white/10">
              <textarea
                ref={composer}
                rows={1}
                wrap="soft"
                aria-label="Message"
                placeholder="Enter Message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onCompositionStart={() => { composing.current = true; }}
                onCompositionEnd={() => { composing.current = false; }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || event.shiftKey || composing.current
                    || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }}
                className="min-w-0 min-h-8 flex-1 resize-none overflow-x-hidden overflow-y-auto whitespace-pre-wrap [overflow-wrap:anywhere] py-1.5 leading-5 bg-transparent text-white placeholder:text-gray-500 focus:outline-none text-sm"
              />
              <button
                type="button"
                className="mb-2 shrink-0 text-gray-400 hover:text-white transition-colors"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <button
                type="button"
                className="mb-2 shrink-0 text-gray-400 hover:text-white transition-colors"
              >
                <Smile className="w-5 h-5" />
              </button>
              <button
                type="submit"
                disabled={sending || transcriptLoading || !selectedChat || !messageInput.trim()}
                className="disabled:opacity-50 shrink-0 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Messages;