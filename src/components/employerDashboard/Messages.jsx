import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { Search, Send, Paperclip, Smile, MoreVertical } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import axios from "axios";
import { useSearchParams } from "react-router-dom";
import { startMessagePolling, messagePages } from "../utils/messagePolling";
import { messageRecipient } from "../utils/messageRecipient";
import { API_BASE_URL } from "../utils/api";

const mergeMessages = (older, newer) => [...new Map([...older, ...newer].map(message => [message.id, message])).values()]
  .sort((a, b) => {
    const difference = (messageDate(a.createdAt)?.getTime() ?? -Infinity) - (messageDate(b.createdAt)?.getTime() ?? -Infinity);
    return difference && !Number.isNaN(difference) ? difference : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
const chatKey = chat => `${chat.role}:${chat._id}`;
const compareChats = (a, b) => {
  const timestamp = value => messageDate(value)?.getTime() ?? -Infinity;
  const difference = timestamp(b.lastMessageAt) - timestamp(a.lastMessageAt);
  if (difference && !Number.isNaN(difference)) return difference;
  return chatKey(a) < chatKey(b) ? -1 : chatKey(a) > chatKey(b) ? 1 : 0;
};
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
  const { user } = useAuth();
  const sessionToken = localStorage.getItem("token");
  const accountKey = user ? `${user.userType}:${user._id || user.id || user.email}` : "";
  const [authExpired, setAuthExpired] = useState(false);
  const [pollError, setPollError] = useState("");
  const poll = useRef(null);
  const pollRequest = useRef(null);
  const latestTranscript = useRef(null);
  const receiveCutoff = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [params, setParams] = useSearchParams();
  const recipient = messageRecipient(params);
  const [resolvedRecipient, setResolvedRecipient] = useState(null);
  const [recipientVersion, setRecipientVersion] = useState(0);
  const selectedChat = resolvedRecipient?.key === recipient.key && resolvedRecipient.status === "ready" ? resolvedRecipient.chat : null;
  const recipientLoading = recipient.status === "valid" && (!resolvedRecipient || resolvedRecipient.key !== recipient.key || resolvedRecipient.status === "loading");
  const recipientError = recipient.status === "invalid" ? "Invalid recipient link. Select someone from search."
    : resolvedRecipient?.key === recipient.key && resolvedRecipient.status === "error" ? resolvedRecipient.error : "";
  const [drafts, setDrafts] = useState({});
  const messageInput = drafts[recipient.key] || "";
  const setMessageInput = value => setDrafts(previous => ({ ...previous,
    [recipient.key]: typeof value === "function" ? value(previous[recipient.key] || "") : value }));
  const [chats, setChats] = useState([]);
  const [listReload, setListReload] = useState(0);
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
  const chatRequest = useRef(null);
  const olderRequest = useRef(null);
  const activeConversation = useRef({ key: "", version: 0 });
  const pendingScroll = useRef(null);
  const sendPending = useRef(false);
  const sendAttempts = useRef(new Map());
  const draftRevisions = useRef(new Map());
  const previews = useRef(new Map());
  const selectedKey = selectedChat ? chatKey(selectedChat) : "";
  const currentTranscript = transcript.key === selectedKey && transcript.version === conversationVersion;
  const transcriptLoading = Boolean(selectedChat) && (!currentTranscript || transcript.status === "loading");
  const listLoading = listState.query !== searchQuery || listState.status === "loading";

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; transcriptRequest.current?.abort(); olderRequest.current?.abort(); };
  }, []);

  const rememberPreview = useCallback((chat, preview) => {
    const key = chatKey(chat);
    previews.current.set(key, preview);
    setChats(previous => previous.map(item => chatKey(item) === key ? { ...item, ...preview } : item));
  }, []);

  useLayoutEffect(() => {
    latestTranscript.current = transcript;
  }, [transcript]);

  useLayoutEffect(() => {
    poll.current?.stop();
    transcriptRequest.current?.abort();
    olderRequest.current?.abort();
    activeConversation.current = { key: "", version: activeConversation.current.version + 1 };
    setResolvedRecipient(null);
    setChats([]);
    setDrafts({});
    previews.current.clear();
    sendAttempts.current.clear();
    draftRevisions.current.clear();
    setAuthExpired(false);
    setPollError("");
  }, [accountKey, sessionToken]);

  useEffect(() => {
    const invalidate = event => {
      if (event.key !== null && event.key !== "token" && event.key !== "user") return;
      if (event.key === "token" && event.newValue === sessionToken) return;
      if (event.key === "user" && event.newValue) {
        try {
          const stored = JSON.parse(event.newValue);
          if (`${stored.userType}:${stored._id || stored.id || stored.email}` === accountKey) return;
        } catch { /* Invalid session storage is treated as logout. */ }
      }
      poll.current?.stop();
      transcriptRequest.current?.abort();
      olderRequest.current?.abort();
      activeConversation.current = { key: "", version: activeConversation.current.version + 1 };
      setAuthExpired(true);
      setResolvedRecipient(null);
      setChats([]);
      setDrafts({});
      previews.current.clear();
      sendAttempts.current.clear();
    };
    window.addEventListener("storage", invalidate);
    return () => window.removeEventListener("storage", invalidate);
  }, [accountKey, sessionToken]);

  const selectChat = chat => {
    const type = chat.role === "Talent" ? "talent" : chat.role === "Employer" ? "employer" : "invalid";
    const next = new URLSearchParams(params);
    next.set("recipientId", chat._id);
    next.set("recipientType", type);
    if (messageRecipient(next).key === recipient.key) setRecipientVersion(value => value + 1);
    else setParams(next);
  };

  useLayoutEffect(() => {
    transcriptRequest.current?.abort();
    olderRequest.current?.abort();
    olderRequest.current = null;
    activeConversation.current = { key: "", version: activeConversation.current.version + 1 };
    pendingScroll.current = null;
    composing.current = false;
    setSendError("");
    receiveCutoff.current = null;
  }, [recipient.key, recipientVersion]);

  useEffect(() => {
    if (recipient.status !== "valid" || !accountKey || authExpired) return;
    const controller = new AbortController();
    const key = recipient.key;
    setResolvedRecipient({ key, status: "loading" });
    async function resolve() {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/messages/search`, {
          params: { recipientId: recipient.id, recipientModel: recipient.model }, signal: controller.signal,
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (controller.signal.aborted) return;
        const chat = data.results?.length === 1 ? data.results[0] : null;
        if (!chat || chat._id !== recipient.id || chat.role !== recipient.model) throw new Error();
        const version = activeConversation.current.version + 1;
        activeConversation.current = { key, version };
        setConversationVersion(version);
        setResolvedRecipient({ key, status: "ready", chat });
      } catch (error) {
        if (!controller.signal.aborted && error.response?.status === 401) setAuthExpired(true);
        if (!controller.signal.aborted) setResolvedRecipient({ key, status: "error", error: [400, 404].includes(error.response?.status)
          ? "Recipient unavailable. Select someone from search." : "Unable to load recipient. Select them again to retry." });
      }
    }
    resolve();
    return () => controller.abort();
  }, [recipient.key, recipient.status, recipient.id, recipient.model, recipientVersion, accountKey, authExpired, sessionToken]);

  useEffect(() => {
    if (!accountKey || authExpired) return;
    const controller = new AbortController();
    chatRequest.current = controller;
    async function loadChats() {
      setListState({ query: searchQuery, status: "loading" });
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error();
        const headers = { Authorization: `Bearer ${token}` };
        const results = searchQuery ? (await axios.get(`${API_BASE_URL}/api/messages/search`, {
          params: { query: searchQuery }, headers, signal: controller.signal,
        })).data.results : await messagePages(async before => (await axios.get(`${API_BASE_URL}/api/messages/chats`, {
          params: { limit: 100, ...(before ? { before } : {}) }, headers, signal: controller.signal, timeout: 15000,
        })).data, { chats: true });
        if (controller.signal.aborted) return;
        if (!Array.isArray(results)) throw new Error();
        setChats(results.map(chat => {
          const cached = previews.current.get(chatKey(chat));
          return cached && (!chat.lastMessageAt || new Date(cached.lastMessageAt) > new Date(chat.lastMessageAt))
            ? { ...chat, ...cached } : chat;
        }));
        setListState({ query: searchQuery, status: "ready" });
      } catch (error) {
        if (!controller.signal.aborted && error.response?.status === 401) setAuthExpired(true);
        if (!controller.signal.aborted) setListState({ query: searchQuery, status: "error" });
      } finally {
        if (chatRequest.current === controller) chatRequest.current = null;
      }
    }
    loadChats();
    return () => controller.abort();
  }, [searchQuery, listReload, accountKey, authExpired, sessionToken]);

  useEffect(() => {
    if (!selectedChat || !accountKey || authExpired) return;
    const controller = new AbortController();
    transcriptRequest.current = controller;
    const key = selectedKey, version = conversationVersion;
    const current = () => !controller.signal.aborted && activeConversation.current.key === key && activeConversation.current.version === version;
    setTranscript({ key, version, status: "loading", messages: [] });
    async function loadMessages() {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/messages`, {
          params: { withUserId: selectedChat._id, partnerModel: selectedChat.role, limit: 50 }, signal: controller.signal,
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (!current()) return;
        if (!Array.isArray(data.messages)) throw new Error();
        receiveCutoff.current = { key, date: messageDate(data.messages.at(-1)?.createdAt)?.getTime() ?? null };
        pendingScroll.current = { version, initial: true };
        setTranscript({ key, version, status: "ready", messages: data.messages, pagination: data.pagination });
        const latest = data.messages.at(-1);
        rememberPreview(selectedChat, { lastMessage: latest?.text ?? null, lastMessageAt: latest?.createdAt ?? null });
      } catch (error) {
        if (current() && error.response?.status === 401) setAuthExpired(true);
        if (current()) setTranscript({ key, version, status: "error", messages: [] });
      }
    }
    loadMessages();
    return () => {
      controller.abort();
      if (activeConversation.current.version === version) transcriptRequest.current?.abort();
    };
  }, [selectedChat, selectedKey, conversationVersion, rememberPreview, accountKey, authExpired, sessionToken]);

  useEffect(() => {
    if (!accountKey || authExpired) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const key = selectedKey, version = conversationVersion;
    const sessionCurrent = signal => !signal.aborted && localStorage.getItem("token") === token;
    const conversationCurrent = signal => sessionCurrent(signal) && activeConversation.current.key === key && activeConversation.current.version === version;
    const getPage = async (path, params, signal) => (await axios.get(`${API_BASE_URL}/api/messages${path}`, {
      params, signal, timeout: 15000, headers: { Authorization: `Bearer ${token}` },
    })).data;
    const loop = startMessagePolling({
      async run(signal) {
        if (localStorage.getItem("token") !== token) { loop.stop(); return false; }
        pollRequest.current = { abort: () => loop.cancel() };
        const snapshot = latestTranscript.current;
        // Initial loads, older-page loads and sends already perform their own reads.
        if (sendPending.current || olderRequest.current || chatRequest.current || selectedChat && snapshot?.status === "loading") return false;
        const results = await messagePages(before => getPage("/chats", { limit: 100, ...(before ? { before } : {}) }, signal), { chats: true });
        if (!sessionCurrent(signal)) return;
        for (const chat of results) {
          const cached = previews.current.get(chatKey(chat));
          if (!cached || !cached.lastMessageAt || new Date(chat.lastMessageAt) >= new Date(cached.lastMessageAt)) {
            previews.current.set(chatKey(chat), { lastMessage: chat.lastMessage, lastMessageAt: chat.lastMessageAt });
          }
        }
        setChats(previous => searchQuery ? previous.map(chat => ({ ...chat, ...previews.current.get(chatKey(chat)) }))
          : results.map(chat => ({ ...chat, ...previews.current.get(chatKey(chat)) })));
        if (!searchQuery) setListState({ query: "", status: "ready" });
        if (!selectedChat || !conversationCurrent(signal)) return;
        const cutoff = receiveCutoff.current?.key === key ? receiveCutoff.current.date : undefined;
        const messages = await messagePages(before => getPage("", {
          withUserId: selectedChat._id, partnerModel: selectedChat.role, limit: 100, ...(before ? { before } : {}),
        }, signal), { cutoff });
        if (!conversationCurrent(signal) || sendPending.current) return;
        const newest = mergeMessages([], messages).at(-1);
        receiveCutoff.current = { key, date: messageDate(newest?.createdAt)?.getTime() ?? null };
        const existing = latestTranscript.current;
        if (existing?.status === "ready" && messages.every(message => existing.messages.some(row => row.id === message.id))) return;
        const target = pane.current;
        const nearBottom = target && target.scrollHeight - target.scrollTop - target.clientHeight <= 80;
        const rect = target?.getBoundingClientRect();
        const anchor = target && [...target.querySelectorAll("[data-message-id]")].find(row => row.getBoundingClientRect().bottom > rect.top);
        pendingScroll.current = { version, incoming: true, nearBottom,
          top: target?.scrollTop || 0, anchor: anchor?.dataset.messageId, offset: anchor ? anchor.getBoundingClientRect().top - rect.top : 0 };
        setTranscript(previous => {
          if (previous.key !== key || previous.version !== version) return previous;
          return { ...previous, status: "ready", messages: mergeMessages(previous.messages, messages),
            // A retry of an initially failed load scanned the whole bounded history.
            pagination: previous.pagination || { hasMore: false, nextCursor: null } };
        });
      },
      onSuccess: () => setPollError(""),
      onError: () => setPollError("Unable to refresh messages. Retrying automatically."),
      onUnauthorized: () => setAuthExpired(true),
    });
    poll.current = loop;
    return () => { loop.stop(); if (poll.current === loop) poll.current = null; };
  }, [accountKey, authExpired, selectedChat, selectedKey, conversationVersion, searchQuery, listReload, sessionToken]);

  const loadOlder = useCallback(async () => {
    if (!accountKey || authExpired || !selectedChat || !currentTranscript || transcript.status !== "ready" || !transcript.pagination?.hasMore || olderRequest.current) return;
    const controller = new AbortController();
    olderRequest.current = controller;
    pollRequest.current?.abort();
    const key = selectedKey, version = conversationVersion;
    const current = () => !controller.signal.aborted && activeConversation.current.key === key && activeConversation.current.version === version;
    setTranscript(previous => ({ ...previous, olderLoading: true, olderError: "" }));
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/messages`, {
        params: { withUserId: selectedChat._id, partnerModel: selectedChat.role, limit: 50, before: transcript.pagination.nextCursor },
        signal: controller.signal, headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!current()) return;
      if (!Array.isArray(data.messages) || !data.pagination) throw new Error();
      const target = pane.current;
      pendingScroll.current = { version, prepend: true, height: target.scrollHeight, top: target.scrollTop };
      setTranscript(previous => ({ ...previous, messages: mergeMessages(data.messages, previous.messages), pagination: data.pagination, olderLoading: false }));
    } catch (error) {
      if (current() && error.response?.status === 401) setAuthExpired(true);
      if (current()) setTranscript(previous => ({ ...previous, olderLoading: false, olderError: "Unable to load older messages. Scroll up to retry, or reselect the conversation." }));
    } finally {
      if (olderRequest.current === controller) olderRequest.current = null;
    }
  }, [selectedChat, currentTranscript, transcript.status, transcript.pagination, selectedKey, conversationVersion, accountKey, authExpired]);

  useEffect(() => {
    const target = pane.current;
    if (target && target.scrollHeight <= target.clientHeight && !transcript.olderError) loadOlder();
  }, [transcript, loadOlder]);

  useLayoutEffect(() => {
    if (currentTranscript && transcript.status === "ready" && pendingScroll.current?.version === conversationVersion && pane.current) {
      // Change only the transcript scroll offset; unrelated renders never request a scroll.
      const target = pane.current;
      const previousBehavior = target.style.scrollBehavior;
      // Global smooth scrolling must not animate the initial pre-paint position.
      if (pendingScroll.current.initial || pendingScroll.current.prepend) target.style.scrollBehavior = "auto";
      const position = pendingScroll.current;
      if (position.incoming && !position.nearBottom) {
        const anchor = position.anchor && [...target.querySelectorAll("[data-message-id]")].find(row => row.dataset.messageId === position.anchor);
        target.style.scrollBehavior = "auto";
        target.scrollTop = anchor ? target.scrollTop + anchor.getBoundingClientRect().top - target.getBoundingClientRect().top - position.offset : position.top;
      } else {
        target.scrollTop = position.prepend ? position.top + target.scrollHeight - position.height : target.scrollHeight;
      }
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
    if (!accountKey || authExpired || composing.current || sendPending.current || !messageInput.trim() || !selectedChat || transcriptLoading) return;
    pollRequest.current?.abort();
    sendPending.current = true;
    setSending(true);
    setSendError("");
    const chat = selectedChat, text = messageInput, key = selectedKey, version = conversationVersion;
    const revision = draftRevisions.current.get(key) || 0;
    let attempt = sendAttempts.current.get(key);
    if (!attempt || attempt.text !== text) {
      attempt = { text, revision, clientMessageId: crypto.randomUUID() };
      sendAttempts.current.set(key, attempt);
    }
    const current = () => mounted.current && activeConversation.current.key === key && activeConversation.current.version === version;
    let saved = false;
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.post(`${API_BASE_URL}/api/messages/send`, {
        recipientId: chat._id, recipientModel: chat.role, text, clientMessageId: attempt.clientMessageId,
      }, { headers: { Authorization: `Bearer ${token}` } });
      if (!data.success) throw new Error();
      saved = true;
      if (sendAttempts.current.get(key) === attempt) sendAttempts.current.delete(key);
      if (!mounted.current) return;
      if ((draftRevisions.current.get(key) || 0) === revision) setMessageInput(value => value === text ? "" : value);
      const message = data.message;
      if (!message?._id || typeof message.text !== "string" || !message.createdAt || !Number.isFinite(new Date(message.createdAt).getTime())) throw new Error();
      rememberPreview(chat, { lastMessage: message.text, lastMessageAt: message.createdAt });
      setListReload(value => value + 1);
      if (!current()) return;
      transcriptRequest.current?.abort();
      const controller = new AbortController();
      transcriptRequest.current = controller;
      pendingScroll.current = { version, initial: false };
      const sent = { id: message._id, text: message.text, createdAt: message.createdAt,
        sender: "me", time: messageTime(message.createdAt), date: new Date(message.createdAt).toDateString() };
      setTranscript(previous => ({ ...previous, key, version, status: "ready",
        messages: previous.messages.some(item => item.id === sent.id) ? previous.messages : [...previous.messages, sent] }));
      const response = await axios.get(`${API_BASE_URL}/api/messages`, {
        params: { withUserId: chat._id, partnerModel: chat.role, limit: 50 }, signal: controller.signal,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (current() && !controller.signal.aborted) {
        if (!Array.isArray(response.data.messages)) throw new Error();
        // Catch up without scrolling a user who moved up after the save.
        setTranscript(previous => {
          const overlaps = response.data.messages.some(message => message.id !== sent.id && previous.messages.some(existing => existing.id === message.id));
          return { ...previous, key, version, status: "ready", messages: mergeMessages(previous.messages, response.data.messages),
            // If more than a page arrived meanwhile, retain a route through the gap.
            pagination: overlaps ? previous.pagination : response.data.pagination };
        });
      }
    } catch (error) {
      if (current() && error.response?.status === 401) setAuthExpired(true);
      if (current()) setSendError(error.response?.status === 409 ? "This send conflicts with an earlier request. Your draft has been kept." : saved
        ? "Message saved, but the transcript could not be refreshed. Reselect the conversation to reload."
        : "Send not confirmed. Your text has been kept; Send retries the same unchanged draft safely.");
    } finally {
      sendPending.current = false;
      if (mounted.current) { setSending(false); poll.current?.wake(); }
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
            {!listLoading && listState.status === "ready" && (searchQuery ? chats : [...chats].sort(compareChats)).map((chat) => (
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
          <div ref={pane} onScroll={() => { if (pane.current.scrollTop <= 80) loadOlder(); }} className="min-w-0 min-h-0 flex-1 overflow-y-auto p-6 space-y-4">
            {(authExpired || pollError) && <p className="text-sm text-red-400" role="alert">{authExpired ? "Your session has expired. Sign in again to receive messages." : pollError}</p>}
            {currentTranscript && transcript.olderLoading && <p className="text-sm text-gray-400" role="status">Loading older messages…</p>}
            {currentTranscript && transcript.olderError && <p className="text-sm text-red-400" role="alert">{transcript.olderError}</p>}
            {recipientLoading ? <p className="text-sm text-gray-400" role="status">Loading recipient…</p>
              : recipientError ? <p className="text-sm text-red-400" role="alert">{recipientError}</p>
              : !selectedChat ? <p className="text-sm text-gray-400">Select a conversation.</p>
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
                  data-message-id={message.id}
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
                disabled={authExpired || !selectedChat || recipientLoading || Boolean(recipientError)}
                placeholder="Enter Message..."
                value={messageInput}
                onChange={(e) => {
                  draftRevisions.current.set(recipient.key, (draftRevisions.current.get(recipient.key) || 0) + 1);
                  setMessageInput(e.target.value);
                }}
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
                disabled={authExpired || !accountKey || sending || transcriptLoading || !selectedChat || !messageInput.trim()}
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