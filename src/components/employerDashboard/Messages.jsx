import React, { useState, useEffect } from "react";
import { Search, Send, Paperclip, Smile, MoreVertical } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";

export const Messages = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChat, setSelectedChat] = useState(null);
  const [messageInput, setMessageInput] = useState("");
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);

  // Fetch chats (previous chats or search results)
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        let res;
        if (!searchQuery) {
          // Only previous chats
          res = await axios.get(`${API_BASE_URL}/api/messages/chats`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        } else {
          // Search users
          res = await axios.get(`${API_BASE_URL}/api/messages/search`, {
            params: { query: searchQuery },
            headers: { Authorization: `Bearer ${token}` },
          });
        }

        setChats(res.data.results || []);
      } catch (err) {
        console.error("Fetch chats error:", err);
      }
    };

    fetchChats();
  }, [searchQuery]);

  // Fetch messages when a chat is selected
  useEffect(() => {
    if (!selectedChat) return;

    const fetchMessages = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await axios.get(`${API_BASE_URL}/api/messages`, {
          params: { withUserId: selectedChat._id },
          headers: { Authorization: `Bearer ${token}` },
        });

        setMessages(res.data.messages);
      } catch (err) {
        console.error("Fetch messages error:", err);
      }
    };

    fetchMessages();
  }, [selectedChat]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedChat) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      await axios.post(
        `${API_BASE_URL}/api/messages/send`,
        {
          recipientId: selectedChat._id,
          recipientModel: selectedChat.role,
          text: messageInput,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refetch messages to update chat window
      const res = await axios.get(`${API_BASE_URL}/api/messages`, {
        params: { withUserId: selectedChat._id },
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessages(res.data.messages);
      setMessageInput("");
    } catch (err) {
      console.error(err);
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-200px)]">
        {/* Chat List */}
        <div className="bg-[#1A1A1E] rounded-lg border border-white/5 overflow-hidden flex flex-col">
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
          <div className="flex-1 overflow-y-auto">
            {chats.map((chat) => (
              <button
                key={chat._id}
                onClick={() => setSelectedChat(chat)}
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
                      <span className="text-xs text-gray-500">{chat.time}</span>
                    </div>
                    <p className="text-sm text-gray-400 truncate">
                      {chat.lastMessage || "No message"}
                    </p>
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
        <div className="lg:col-span-2 bg-[#1A1A1E] rounded-lg border border-white/5 overflow-hidden flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
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
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <React.Fragment key={message.id}>
                {message.date && (
                  <div className="flex items-center justify-center my-4">
                    <div className="flex-1 h-px bg-white/10"></div>
                    <span className="px-4 text-xs text-gray-500">
                      {message.date}
                    </span>
                    <div className="flex-1 h-px bg-white/10"></div>
                  </div>
                )}
                <div
                  className={`flex ${
                    message.sender === "me" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[70%] ${
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
                      <p className="text-sm leading-relaxed">{message.text}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 px-2">
                      {message.time}
                    </p>
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* Message Input */}
          <form
            onSubmit={handleSendMessage}
            className="p-4 border-t border-white/10"
          >
            <div className="flex items-center gap-2 bg-[#0E0E10] rounded-lg px-4 py-2 border border-white/10">
              <input
                type="text"
                placeholder="Enter Message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                className="flex-1 bg-transparent text-white placeholder:text-gray-500 focus:outline-none text-sm"
              />
              <button
                type="button"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <button
                type="button"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Smile className="w-5 h-5" />
              </button>
              <button
                type="submit"
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
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