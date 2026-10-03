import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Loader2,
  MessageCircle,
  Plus,
  Search,
  Send,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import api from "../api";
import { API_BASE_URL } from "../config";
import { useAuth } from "../App";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";

const getErrorMessage = (error, fallback) => error?.response?.data?.detail || fallback;

const formatConversationTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" });
};

const formatMessageTime = (value) =>
  new Date(value).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

function Avatar({ image, name, group = false, size = "md" }) {
  const dimensions = size === "sm" ? "w-9 h-9" : "w-12 h-12";
  return (
    <div className={`${dimensions} shrink-0 rounded-full border-2 border-[#D4AF37]/70 bg-[#FDFBF7] overflow-hidden flex items-center justify-center`}>
      {image ? (
        <img src={image} alt={name} className="w-full h-full object-cover" />
      ) : group ? (
        <Users className="w-5 h-5 text-[#8E44AD]" />
      ) : (
        <span className="font-cinzel font-bold text-[#2C3E50]">
          {(name || "?").slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  );
}

export default function ChatPage() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [chatMode, setChatMode] = useState("direct");
  const [userSearch, setUserSearch] = useState("");
  const [availableUsers, setAvailableUsers] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [creating, setCreating] = useState(false);
  const selectedIdRef = useRef(null);
  const messagesEndRef = useRef(null);
  const skipNextScrollRef = useRef(false);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) || null,
    [conversations, selectedId]
  );

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const loadConversations = useCallback(async (quiet = false) => {
    try {
      const { data } = await api.get("/chat/conversations");
      setConversations(data);
      setSelectedId((current) => {
        if (current && data.some((conversation) => conversation.id === current)) return current;
        return null;
      });
    } catch (error) {
      if (!quiet) toast.error(getErrorMessage(error, "Impossibile caricare le conversazioni"));
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const markAsRead = useCallback(async (conversationId) => {
    try {
      await api.put(`/chat/conversations/${conversationId}/read`);
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId ? { ...conversation, unread_count: 0 } : conversation
        )
      );
    } catch {
      // Reading a conversation remains usable even if the receipt cannot be saved.
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const { data } = await api.get(`/chat/conversations/${selectedId}/messages`, {
          params: { limit: 50 },
        });
        if (!cancelled) {
          setMessages(data);
          setHasOlderMessages(data.length === 50);
          markAsRead(selectedId);
        }
      } catch (error) {
        if (!cancelled) toast.error(getErrorMessage(error, "Impossibile caricare i messaggi"));
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    };
    loadMessages();
    return () => {
      cancelled = true;
    };
  }, [selectedId, markAsRead]);

  useEffect(() => {
    if (skipNextScrollRef.current) {
      skipNextScrollRef.current = false;
      return;
    }
    if (!loadingMessages) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingMessages, selectedId]);

  useEffect(() => {
    if (!token) return undefined;
    let socket;
    let reconnectTimer;
    let heartbeat;
    let cancelled = false;

    const connect = async () => {
      try {
        const { data } = await api.post("/chat/socket-ticket");
        if (cancelled) return;
        const socketBase = API_BASE_URL.replace(/^http/, "ws");
        socket = new WebSocket(`${socketBase}/chat/ws?ticket=${encodeURIComponent(data.ticket)}`);

        socket.onopen = () => {
          heartbeat = window.setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) socket.send("ping");
          }, 25000);
        };
        socket.onmessage = (event) => {
          if (event.data === "pong") return;
          let payload;
          try {
            payload = JSON.parse(event.data);
          } catch {
            return;
          }
          if (payload.type === "message.created") {
            const incoming = payload.message;
            if (incoming.conversation_id === selectedIdRef.current) {
              setMessages((current) =>
                current.some((message) => message.id === incoming.id) ? current : [...current, incoming]
              );
              markAsRead(incoming.conversation_id);
            }
            loadConversations(true);
          } else if (payload.type === "conversation.created" || payload.type === "conversation.updated") {
            loadConversations(true);
          }
        };
        socket.onclose = () => {
          window.clearInterval(heartbeat);
          if (!cancelled) reconnectTimer = window.setTimeout(connect, 2500);
        };
      } catch {
        if (!cancelled) reconnectTimer = window.setTimeout(connect, 5000);
      }
    };

    connect();
    return () => {
      cancelled = true;
      window.clearTimeout(reconnectTimer);
      window.clearInterval(heartbeat);
      socket?.close();
    };
  }, [token, loadConversations, markAsRead]);

  useEffect(() => {
    if (!showNewChat) return undefined;
    const timer = window.setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const { data } = await api.get("/chat/users", {
          params: { search: userSearch, limit: 40 },
        });
        setAvailableUsers(data);
      } catch (error) {
        toast.error(getErrorMessage(error, "Impossibile caricare gli utenti"));
      } finally {
        setSearchingUsers(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [showNewChat, userSearch]);

  const openNewChat = () => {
    setChatMode("direct");
    setUserSearch("");
    setSelectedMembers([]);
    setGroupName("");
    setShowNewChat(true);
  };

  const finishConversationCreation = (conversation) => {
    setConversations((current) => [
      conversation,
      ...current.filter((item) => item.id !== conversation.id),
    ]);
    setSelectedId(conversation.id);
    setShowNewChat(false);
  };

  const createDirectChat = async (targetUser) => {
    setCreating(true);
    try {
      const { data } = await api.post("/chat/conversations/direct", { user_id: targetUser.id });
      finishConversationCreation(data);
    } catch (error) {
      toast.error(getErrorMessage(error, "Impossibile creare la conversazione"));
    } finally {
      setCreating(false);
    }
  };

  const toggleGroupMember = (targetUser) => {
    setSelectedMembers((current) =>
      current.some((member) => member.id === targetUser.id)
        ? current.filter((member) => member.id !== targetUser.id)
        : [...current, targetUser]
    );
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Inserisci un nome per il gruppo");
      return;
    }
    if (selectedMembers.length < 1) {
      toast.error("Seleziona almeno un altro partecipante");
      return;
    }
    setCreating(true);
    try {
      const { data } = await api.post("/chat/conversations/group", {
        name: groupName.trim(),
        member_ids: selectedMembers.map((member) => member.id),
      });
      finishConversationCreation(data);
    } catch (error) {
      toast.error(getErrorMessage(error, "Impossibile creare il gruppo"));
    } finally {
      setCreating(false);
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const content = messageText.trim();
    if (!content || !selectedId || sending) return;
    setSending(true);
    setMessageText("");
    try {
      const { data } = await api.post(`/chat/conversations/${selectedId}/messages`, { content });
      setMessages((current) =>
        current.some((message) => message.id === data.id) ? current : [...current, data]
      );
    } catch (error) {
      setMessageText(content);
      toast.error(getErrorMessage(error, "Messaggio non inviato"));
    } finally {
      setSending(false);
    }
  };

  const loadOlderMessages = async () => {
    if (!selectedId || !messages.length) return;
    try {
      const { data } = await api.get(`/chat/conversations/${selectedId}/messages`, {
        params: { before: messages[0].created_at, limit: 50 },
      });
      skipNextScrollRef.current = true;
      setMessages((current) => [...data, ...current]);
      setHasOlderMessages(data.length === 50);
    } catch (error) {
      toast.error(getErrorMessage(error, "Impossibile caricare i messaggi precedenti"));
    }
  };

  return (
    <div className="h-screen min-h-[600px] bg-[#FDFBF7] flex flex-col overflow-hidden">
      <header className="bg-[#2C3E50] shadow-lg shrink-0">
        <div className="max-w-7xl w-full mx-auto px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-white hover:text-[#D4AF37] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-lato hidden sm:inline">Bacheca</span>
          </button>
          <h1 className="font-cinzel text-lg sm:text-xl text-white flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#D4AF37]" /> Messaggi
          </h1>
          <div className="w-11 sm:w-24" />
        </div>
      </header>

      <main className="flex-1 min-h-0 w-full max-w-7xl mx-auto sm:p-4">
        <div className="h-full bg-white sm:rounded-xl sm:border sm:border-[#D4AF37]/50 sm:shadow-lg overflow-hidden flex">
          <aside className={`${selectedId ? "hidden md:flex" : "flex"} w-full md:w-80 lg:w-96 shrink-0 border-r border-gray-200 flex-col`}>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-cinzel text-lg text-[#2C3E50]">Conversazioni</h2>
                <p className="font-lato text-xs text-gray-500">Ciao, {user?.username}</p>
              </div>
              <Button
                type="button"
                onClick={openNewChat}
                className="rounded-full w-11 h-11 p-0 bg-[#8E44AD] hover:bg-[#71368a]"
                aria-label="Nuova conversazione"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingConversations ? (
                <div className="h-full flex items-center justify-center text-[#8E44AD]">
                  <Loader2 className="w-7 h-7 animate-spin" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="font-cinzel text-[#2C3E50]">Nessuna conversazione</p>
                  <p className="font-lato text-sm text-gray-500 mt-2">Premi + per scrivere a un altro allenatore.</p>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => setSelectedId(conversation.id)}
                    className={`w-full px-4 py-3 flex items-center gap-3 text-left border-b border-gray-100 transition-colors ${
                      selectedId === conversation.id ? "bg-[#D4AF37]/10" : "hover:bg-gray-50"
                    }`}
                  >
                    <Avatar
                      image={conversation.image}
                      name={conversation.display_name}
                      group={conversation.type === "group"}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-cinzel text-sm text-[#2C3E50] truncate">{conversation.display_name}</span>
                        <span className="font-lato text-[11px] text-gray-400 shrink-0">
                          {formatConversationTime(conversation.last_message?.created_at || conversation.updated_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="font-lato text-sm text-gray-500 truncate flex-1">
                          {conversation.last_message
                            ? `${conversation.last_message.sender_id === user?.id ? "Tu: " : ""}${conversation.last_message.content}`
                            : conversation.type === "group"
                              ? `${conversation.members.length} partecipanti`
                              : "Inizia la conversazione"}
                        </p>
                        {conversation.unread_count > 0 && (
                          <span className="min-w-5 h-5 px-1 rounded-full bg-[#C0392B] text-white text-[11px] flex items-center justify-center">
                            {conversation.unread_count > 99 ? "99+" : conversation.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className={`${selectedId ? "flex" : "hidden md:flex"} flex-1 min-w-0 flex-col bg-[#FDFBF7]`}>
            {selectedConversation ? (
              <>
                <div className="h-[73px] px-3 sm:px-5 bg-white border-b border-gray-200 flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="md:hidden text-[#2C3E50]"
                    aria-label="Torna alle conversazioni"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <Avatar
                    image={selectedConversation.image}
                    name={selectedConversation.display_name}
                    group={selectedConversation.type === "group"}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <h2 className="font-cinzel text-[#2C3E50] truncate">{selectedConversation.display_name}</h2>
                    <p className="font-lato text-xs text-gray-500 truncate">
                      {selectedConversation.type === "group"
                        ? `${selectedConversation.members.length} partecipanti · ${selectedConversation.members.map((member) => member.username).join(", ")}`
                        : "Chat privata"}
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-3">
                  {hasOlderMessages && messages.length > 0 && (
                    <div className="text-center">
                      <button type="button" onClick={loadOlderMessages} className="font-lato text-sm text-[#8E44AD] hover:underline">
                        Carica messaggi precedenti
                      </button>
                    </div>
                  )}
                  {loadingMessages ? (
                    <div className="h-full flex items-center justify-center text-[#8E44AD]">
                      <Loader2 className="w-7 h-7 animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-6">
                      <div className="pokeball scale-75 mb-4" />
                      <p className="font-cinzel text-[#2C3E50]">La conversazione comincia qui</p>
                      <p className="font-lato text-sm text-gray-500 mt-2">Invia il primo messaggio.</p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isMine = message.sender_id === user?.id;
                      return (
                        <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[82%] sm:max-w-[70%] px-4 py-2 rounded-2xl shadow-sm ${
                              isMine
                                ? "bg-[#2C3E50] text-white rounded-br-sm"
                                : "bg-white border border-[#D4AF37]/40 text-[#2C3E50] rounded-bl-sm"
                            }`}
                          >
                            {!isMine && selectedConversation.type === "group" && (
                              <p className="font-lato text-xs font-bold text-[#8E44AD] mb-1">{message.sender_username}</p>
                            )}
                            <p className="font-lato text-sm whitespace-pre-wrap break-words selectable">{message.content}</p>
                            <p className={`font-lato text-[10px] text-right mt-1 ${isMine ? "text-gray-300" : "text-gray-400"}`}>
                              {formatMessageTime(message.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={sendMessage} className="p-3 sm:p-4 bg-white border-t border-gray-200 flex items-end gap-2 safe-area-bottom">
                  <textarea
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value.slice(0, 2000))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        sendMessage(event);
                      }
                    }}
                    rows={1}
                    placeholder="Scrivi un messaggio..."
                    className="flex-1 min-h-11 max-h-32 resize-none rounded-xl border border-gray-300 bg-[#FDFBF7] px-4 py-3 font-lato text-sm outline-none focus:border-[#D4AF37]"
                  />
                  <Button
                    type="submit"
                    disabled={!messageText.trim() || sending}
                    className="w-11 h-11 p-0 rounded-full bg-[#C0392B] hover:bg-[#a93226]"
                    aria-label="Invia messaggio"
                  >
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </Button>
                </form>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <MessageCircle className="w-16 h-16 text-[#D4AF37] mb-4" />
                <h2 className="font-cinzel text-xl text-[#2C3E50]">Messaggi dell’Accademia</h2>
                <p className="font-lato text-gray-500 mt-2 max-w-sm">Seleziona una conversazione oppure creane una nuova.</p>
                <Button onClick={openNewChat} className="mt-5 btn-academy">
                  Nuova conversazione
                </Button>
              </div>
            )}
          </section>
        </div>
      </main>

      <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
        <DialogContent className="bg-[#FDFBF7] border-2 border-[#D4AF37] w-[calc(100%-2rem)] sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-cinzel text-[#2C3E50]">Nuova conversazione</DialogTitle>
            <DialogDescription className="font-lato">
              Scegli una chat privata oppure crea un gruppo.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2 bg-white rounded-lg p-1 border border-gray-200">
            <button
              type="button"
              onClick={() => { setChatMode("direct"); setSelectedMembers([]); }}
              className={`rounded-md px-3 py-2 font-lato text-sm flex items-center justify-center gap-2 ${
                chatMode === "direct" ? "bg-[#2C3E50] text-white" : "text-gray-600"
              }`}
            >
              <UserRound className="w-4 h-4" /> Privata
            </button>
            <button
              type="button"
              onClick={() => setChatMode("group")}
              className={`rounded-md px-3 py-2 font-lato text-sm flex items-center justify-center gap-2 ${
                chatMode === "group" ? "bg-[#8E44AD] text-white" : "text-gray-600"
              }`}
            >
              <Users className="w-4 h-4" /> Gruppo
            </button>
          </div>

          {chatMode === "group" && (
            <div>
              <label htmlFor="group-name" className="font-lato text-sm text-[#2C3E50]">Nome del gruppo</label>
              <Input
                id="group-name"
                value={groupName}
                onChange={(event) => setGroupName(event.target.value.slice(0, 80))}
                placeholder="Es. Allenatori di Kanto"
                className="mt-1 bg-white border-[#D4AF37]/60"
              />
              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedMembers.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleGroupMember(member)}
                      className="min-h-8 px-2 py-1 rounded-full bg-[#8E44AD]/10 text-[#8E44AD] font-lato text-xs flex items-center gap-1"
                    >
                      {member.username} <X className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Cerca per username..."
              className="pl-9 bg-white"
            />
          </div>

          <div className="min-h-40 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg">
            {searchingUsers ? (
              <div className="h-40 flex items-center justify-center text-[#8E44AD]">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : availableUsers.length === 0 ? (
              <p className="p-8 text-center font-lato text-sm text-gray-500">Nessun altro utente trovato.</p>
            ) : (
              availableUsers.map((targetUser) => {
                const selected = selectedMembers.some((member) => member.id === targetUser.id);
                return (
                  <button
                    key={targetUser.id}
                    type="button"
                    disabled={creating}
                    onClick={() => chatMode === "direct" ? createDirectChat(targetUser) : toggleGroupMember(targetUser)}
                    className="w-full px-3 py-2 flex items-center gap-3 text-left border-b last:border-b-0 border-gray-100 hover:bg-[#D4AF37]/10"
                  >
                    <Avatar image={targetUser.profile_image} name={targetUser.username} size="sm" />
                    <span className="font-lato text-sm text-[#2C3E50] flex-1">{targetUser.username}</span>
                    {chatMode === "group" && (
                      <span className={`w-6 h-6 rounded-full border flex items-center justify-center ${selected ? "bg-[#8E44AD] border-[#8E44AD] text-white" : "border-gray-300"}`}>
                        {selected && <Check className="w-4 h-4" />}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {chatMode === "group" && (
            <Button
              type="button"
              onClick={createGroup}
              disabled={creating || !groupName.trim() || selectedMembers.length < 1}
              className="bg-[#8E44AD] hover:bg-[#71368a]"
            >
              {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Users className="w-4 h-4 mr-2" />}
              Crea gruppo ({selectedMembers.length + 1})
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
