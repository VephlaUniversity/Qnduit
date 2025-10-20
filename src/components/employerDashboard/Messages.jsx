import React, { useState } from "react";
import { Search, Send, Paperclip, Smile, MoreVertical } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export const Messages = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChat, setSelectedChat] = useState(1);
  const [messageInput, setMessageInput] = useState("");

  // Use user messages or fallback to default
  const chats =
    user?.messages?.length > 0
      ? user.messages.map((msg, idx) => ({
          id: msg.id || idx + 1,
          name: msg.name,
          avatar: msg.name.charAt(0),
          lastMessage: msg.lastMessage,
          time: msg.time,
          unread: msg.unread || 0,
          online: msg.online || false,
          color:
            idx % 3 === 0
              ? "bg-blue-500"
              : idx % 3 === 1
              ? "bg-green-500"
              : "bg-orange-500",
        }))
      : [
          {
            id: 1,
            name: "Initech",
            avatar: "I",
            lastMessage: "Hey! there I'm available",
            time: "05 min",
            unread: 0,
            online: true,
            color: "bg-green-500",
          },
          {
            id: 2,
            name: "Avitex Agency",
            avatar: "A",
            lastMessage: "Hey! there I'm available",
            time: "07 min",
            unread: 0,
            online: true,
            color: "bg-blue-500",
          },
          {
            id: 3,
            name: "Plexzap",
            avatar: "P",
            lastMessage: "Hey! there I'm available",
            time: "08 min",
            unread: 0,
            online: true,
            color: "bg-orange-500",
          },
        ];

  const messages = [
    { id: 1, sender: "them", text: "How are you?", time: "Today, 5:02 Am" },
    { id: 2, sender: "me", text: "Hello", time: "Today, 5:02 Am" },
    {
      id: 3,
      sender: "me",
      text: "I'm good and you?",
      time: "Today, 5:02 Am",
      date: "August 22",
    },
    {
      id: 4,
      sender: "them",
      text: "Tell me about yourself",
      time: "Today, 1:02 Pm",
    },
    {
      id: 5,
      sender: "them",
      text: "What are your strengths?",
      time: "Today, 1:30 Pm",
    },
    {
      id: 6,
      sender: "me",
      text: "I'm a punctual person. I always arrive early and complete my work on time. My previous job had a lot of deadlines, and when you must finish something by and I made sure that I was organized and adhered to (respected) all my jobs",
      time: "Today, 5:02 Am",
    },
  ];

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (messageInput.trim()) {
      console.log("Sending message:", messageInput);
      setMessageInput("");
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
                key={chat.id}
                onClick={() => setSelectedChat(chat.id)}
                className={`w-full p-4 border-b border-white/5 hover:bg-white/5 transition-colors text-left ${
                  selectedChat === chat.id ? "bg-[#2A2A2E]" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <div
                      className={`w-12 h-12 rounded-full ${chat.color} flex items-center justify-center text-white font-semibold`}
                    >
                      {chat.avatar}
                    </div>
                    {chat.online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1A1A1E]"></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-white font-medium truncate">
                        {chat.name}
                      </p>
                      <span className="text-xs text-gray-500">{chat.time}</span>
                    </div>
                    <p className="text-sm text-gray-400 truncate">
                      {chat.lastMessage}
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
                <p className="text-white font-medium">Avitex Agency</p>
                <p className="text-sm text-gray-400">
                  Las Vegas, NV 89107, USA
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
