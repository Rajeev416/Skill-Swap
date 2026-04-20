import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useUser } from "../../util/UserContext";
import { Link, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import ScrollableFeed from "react-scrollable-feed";
import RequestCard from "./RequestCard";
import "./Chats.css";

var socket;

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const VideoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

const Chats = () => {
  const [activeTab, setActiveTab] = useState("chat");
  const [requests, setRequests] = useState([]);
  const [requestLoading, setRequestLoading] = useState(false);
  const [acceptRequestLoading, setAcceptRequestLoading] = useState(false);

  const [scheduleModalShow, setScheduleModalShow] = useState(false);
  const [requestModalShow, setRequestModalShow] = useState(false);

  const [selectedChat, setSelectedChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chats, setChats] = useState([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [chatMessageLoading, setChatMessageLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ date: "", time: "" });

  const { user, setUser } = useUser();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  // ===== Latency Optimization: Cache chats locally =====
  const chatsCache = useRef(null);

  const handleAuthError = useCallback(async (err) => {
    if (err?.response?.data?.message) {
      toast.error(err.response.data.message);
      if (err.response.data.message === "Please Login") {
        localStorage.removeItem("userInfo");
        setUser(null);
        await axios.get("/auth/logout");
        navigate("/login");
      }
    } else {
      toast.error("Something went wrong");
    }
  }, [setUser, navigate]);

  // Fetch chats with caching
  const fetchChats = useCallback(async () => {
    try {
      setChatLoading(true);
      const tempUser = JSON.parse(localStorage.getItem("userInfo"));

      // Show cached data immediately while fetching
      if (chatsCache.current) {
        setChats(chatsCache.current);
        setChatLoading(false);
      }

      const { data } = await axios.get("/chat");
      if (tempUser?._id) {
        const temp = data.data.map((chat) => {
          const otherUser = chat?.users.find((u) => u?._id !== tempUser?._id);
          return {
            id: chat._id,
            userId: otherUser?._id,
            name: otherUser?.name,
            picture: otherUser?.picture,
            username: otherUser?.username,
          };
        });
        chatsCache.current = temp;
        setChats(temp);
      }
    } catch (err) {
      console.error(err);
      handleAuthError(err);
    } finally {
      setChatLoading(false);
    }
  }, [handleAuthError]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Socket connection — once on mount
  useEffect(() => {
    if (!socket || !socket.connected) {
      socket = io(axios.defaults.baseURL);
      if (user) {
        socket.emit("setup", user);
      }
    }
    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, []);

  // Message listener
  useEffect(() => {
    if (!socket) return;
    const handleMessage = (newMsg) => {
      if (selectedChat && selectedChat.id === newMsg.chatId._id) {
        setChatMessages((prev) => [...prev, newMsg]);
      }
    };
    socket.on("message recieved", handleMessage);
    return () => socket?.off("message recieved", handleMessage);
  }, [selectedChat]);

  const handleChatClick = useCallback(async (chatId) => {
    try {
      setChatMessageLoading(true);
      const { data } = await axios.get(`/message/getMessages/${chatId}`);
      setChatMessages(data.data);
      setMessage("");
      const chatDetails = chats.find((chat) => chat.id === chatId);
      setSelectedChat(chatDetails);
      socket?.emit("join chat", chatId);
    } catch (err) {
      console.error(err);
      handleAuthError(err);
    } finally {
      setChatMessageLoading(false);
    }
  }, [chats, handleAuthError]);

  const sendMessage = useCallback(async () => {
    if (!message.trim()) return;

    // Optimistic update for instant feel
    const optimisticMsg = {
      _id: `temp-${Date.now()}`,
      sender: { _id: user._id },
      content: message,
      chatId: { _id: selectedChat.id },
    };
    setChatMessages((prev) => [...prev, optimisticMsg]);
    const sentMessage = message;
    setMessage("");
    inputRef.current?.focus();

    try {
      socket?.emit("stop typing", selectedChat?._id);
      const { data } = await axios.post("/message/sendMessage", {
        chatId: selectedChat.id,
        content: sentMessage,
      });
      socket?.emit("new message", data.data);
      // Replace optimistic message with real one
      setChatMessages((prev) =>
        prev.map((msg) => (msg._id === optimisticMsg._id ? data.data : msg))
      );
    } catch (err) {
      console.error(err);
      // Remove optimistic message on error
      setChatMessages((prev) => prev.filter((msg) => msg._id !== optimisticMsg._id));
      handleAuthError(err);
    }
  }, [message, selectedChat, user, handleAuthError]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const getRequests = useCallback(async () => {
    try {
      setRequestLoading(true);
      const { data } = await axios.get("/request/getRequests");
      setRequests(data.data);
    } catch (err) {
      console.error(err);
      handleAuthError(err);
    } finally {
      setRequestLoading(false);
    }
  }, [handleAuthError]);

  const handleTabClick = useCallback(async (tab) => {
    setActiveTab(tab);
    if (tab === "chat") {
      await fetchChats();
    } else {
      await getRequests();
    }
  }, [fetchChats, getRequests]);

  const handleRequestAccept = useCallback(async () => {
    try {
      setAcceptRequestLoading(true);
      const { data } = await axios.post("/request/acceptRequest", { requestId: selectedRequest._id });
      toast.success(data.message);
      setRequests((prev) => prev.filter((r) => r._id !== selectedRequest._id));
    } catch (err) {
      console.error(err);
      handleAuthError(err);
    } finally {
      setAcceptRequestLoading(false);
      setRequestModalShow(false);
    }
  }, [selectedRequest, handleAuthError]);

  const handleRequestReject = useCallback(async () => {
    try {
      setAcceptRequestLoading(true);
      const { data } = await axios.post("/request/rejectRequest", { requestId: selectedRequest._id });
      toast.success(data.message);
      setRequests((prev) => prev.filter((r) => r._id !== selectedRequest._id));
    } catch (err) {
      console.error(err);
      handleAuthError(err);
    } finally {
      setAcceptRequestLoading(false);
      setRequestModalShow(false);
    }
  }, [selectedRequest, handleAuthError]);

  const handleScheduleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!scheduleForm.date || !scheduleForm.time) {
      toast.error("Please fill all the fields");
      return;
    }

    const selectedDateTime = new Date(`${scheduleForm.date}T${scheduleForm.time}`);
    if (selectedDateTime < new Date()) {
      toast.error("Please select a future date and time");
      return;
    }

    setScheduleLoading(true);
    try {
      await axios.post("/meeting/request", {
        receiverId: selectedChat.userId,
        scheduledTime: selectedDateTime.toISOString(),
        topic: "Video Call Request from Chat",
      });
      toast.success("Meeting requested successfully! Check your Meetings Hub.");
      setScheduleForm({ date: "", time: "" });
      setScheduleModalShow(false);
    } catch (error) {
      console.error(error);
      handleAuthError(error);
    } finally {
      setScheduleLoading(false);
    }
  }, [scheduleForm, selectedChat, handleAuthError]);

  return (
    <div className="chat-page">
      {/* ===== Sidebar ===== */}
      <div className="chat-sidebar">
        <div className="chat-tabs">
          <button
            className={`chat-tab-btn ${activeTab === "chat" ? "active" : ""}`}
            onClick={() => handleTabClick("chat")}
          >
            💬 Chats
          </button>
          <button
            className={`chat-tab-btn ${activeTab === "requests" ? "active" : ""}`}
            onClick={() => handleTabClick("requests")}
          >
            🔔 Requests
          </button>
        </div>

        <div className="chat-contacts">
          {activeTab === "chat" && (
            <>
              {chatLoading ? (
                <div className="chat-loading">
                  <div className="chat-loading-spinner" />
                  <span className="chat-loading-text">Loading chats...</span>
                </div>
              ) : chats.length === 0 ? (
                <div className="chat-loading">
                  <span className="chat-loading-text">No conversations yet</span>
                </div>
              ) : (
                chats.map((chat, i) => (
                  <div
                    key={chat.id}
                    className={`chat-contact-item ${selectedChat?.id === chat.id ? "selected" : ""}`}
                    onClick={() => handleChatClick(chat.id)}
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <img
                      className="chat-contact-avatar"
                      src={chat.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name)}&background=2cb5a0&color=fff`}
                      alt={chat.name}
                    />
                    <div className="chat-contact-info">
                      <p className="chat-contact-name">{chat.name}</p>
                      <p className="chat-contact-username">@{chat.username}</p>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === "requests" && (
            <>
              {requestLoading ? (
                <div className="chat-loading">
                  <div className="chat-loading-spinner" />
                  <span className="chat-loading-text">Loading requests...</span>
                </div>
              ) : requests.length === 0 ? (
                <div className="chat-loading">
                  <span className="chat-loading-text">No pending requests</span>
                </div>
              ) : (
                requests.map((request, i) => (
                  <div
                    key={request._id}
                    className={`chat-contact-item ${selectedRequest?._id === request._id ? "selected" : ""}`}
                    onClick={() => {
                      setSelectedRequest(request);
                      setRequestModalShow(true);
                    }}
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <img
                      className="chat-contact-avatar"
                      src={request.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(request.name)}&background=6366f1&color=fff`}
                      alt={request.name}
                    />
                    <div className="chat-contact-info">
                      <p className="chat-contact-name">{request.name}</p>
                      <p className="chat-contact-username">@{request.username}</p>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>

      {/* ===== Main Chat Area ===== */}
      <div className="chat-main">
        {/* Header */}
        <div className="chat-header">
          {selectedChat ? (
            <>
              <div className="chat-header-user">
                <img
                  className="chat-header-avatar"
                  src={selectedChat.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedChat.name)}&background=2cb5a0&color=fff`}
                  alt={selectedChat.name}
                />
                <div className="chat-header-info">
                  <h3>{selectedChat.name}</h3>
                  <span>@{selectedChat.username}</span>
                </div>
              </div>
              <button className="chat-video-btn" onClick={() => setScheduleModalShow(true)}>
                <VideoIcon />
                <span>Request Video Call</span>
              </button>
            </>
          ) : (
            <div />
          )}
        </div>

        {/* Messages */}
        <div className="chat-messages-area">
          {selectedChat ? (
            chatMessageLoading ? (
              <div className="chat-empty-state">
                <div className="chat-loading-spinner" />
                <span className="chat-loading-text">Loading messages...</span>
              </div>
            ) : (
              <ScrollableFeed forceScroll>
                {chatMessages.map((msg, index) => {
                  const isSent = msg.sender._id === user._id;
                  return (
                    <div
                      key={msg._id || index}
                      className={`chat-message-row ${isSent ? "sent" : "received"}`}
                      style={{ animationDelay: `${Math.min(index * 0.03, 0.5)}s` }}
                    >
                      <div className={`chat-bubble ${isSent ? "sent" : "received"}`}>
                        {msg.content}
                      </div>
                    </div>
                  );
                })}
              </ScrollableFeed>
            )
          ) : (
            <div className="chat-empty-state">
              <div className="chat-empty-icon">💬</div>
              <h3>Start a Conversation</h3>
              <p>Select a chat from the sidebar to begin messaging</p>
            </div>
          )}
        </div>

        {/* Input */}
        {selectedChat && (
          <div className="chat-input-area">
            <input
              ref={inputRef}
              className="chat-input"
              type="text"
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className="chat-send-btn" onClick={sendMessage}>
              <SendIcon />
            </button>
          </div>
        )}
      </div>

      {/* ===== Schedule Video Call Modal ===== */}
      {scheduleModalShow && (
        <div className="chat-modal-overlay" onClick={() => setScheduleModalShow(false)}>
          <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
            <h3>📅 Request a Meeting</h3>
            <p>Choose a preferred date and time for the video call with {selectedChat?.name}</p>
            <form onSubmit={handleScheduleSubmit}>
              <div className="chat-modal-field">
                <label>Preferred Date</label>
                <input
                  type="date"
                  value={scheduleForm.date}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                />
              </div>
              <div className="chat-modal-field">
                <label>Preferred Time</label>
                <input
                  type="time"
                  value={scheduleForm.time}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                />
              </div>
              <div className="chat-modal-actions">
                <button type="submit" className="chat-modal-submit" disabled={scheduleLoading}>
                  {scheduleLoading ? (
                    <>
                      <div className="chat-loading-spinner" style={{ width: 18, height: 18 }} />
                      Sending...
                    </>
                  ) : (
                    "Send Request"
                  )}
                </button>
                <button
                  type="button"
                  className="chat-modal-cancel"
                  onClick={() => setScheduleModalShow(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== Request Confirmation Modal ===== */}
      {requestModalShow && selectedRequest && (
        <div className="chat-modal-overlay" onClick={() => setRequestModalShow(false)}>
          <div className="chat-request-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Confirm your choice?</h2>
            <RequestCard
              name={selectedRequest?.name}
              skills={selectedRequest?.skillsProficientAt}
              rating="4"
              picture={selectedRequest?.picture}
              username={selectedRequest?.username}
            />
            <div className="chat-request-actions">
              <button className="chat-accept-btn" onClick={handleRequestAccept} disabled={acceptRequestLoading}>
                {acceptRequestLoading ? (
                  <div className="chat-loading-spinner" style={{ width: 18, height: 18 }} />
                ) : (
                  "✅ Accept"
                )}
              </button>
              <button className="chat-reject-btn" onClick={handleRequestReject} disabled={acceptRequestLoading}>
                {acceptRequestLoading ? (
                  <div className="chat-loading-spinner" style={{ width: 18, height: 18 }} />
                ) : (
                  "❌ Reject"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chats;
