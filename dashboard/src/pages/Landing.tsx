import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<
    { type: "customer" | "cs" | "system"; content: string }[]
  >([]);
  const [input, setInput] = useState("");

  const handleStartChat = () => {
    if (!name.trim()) return;
    setStarted(true);
    setMessages([
      {
        type: "system",
        content: "Menghubungkan ke Customer Service...",
      },
    ]);
  };

  const handleSendMessage = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { type: "customer", content: input }]);
    setInput("");
  };

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-colors flex items-center justify-center"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-primary-600 text-white p-4 flex justify-between items-center">
            <div>
              <h3 className="font-semibold">HeraDesk Support</h3>
              <p className="text-sm text-primary-100">
                Kami siap membantu Anda
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-primary-200"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {!started ? (
              <div className="space-y-4">
                <p className="text-gray-600 text-center">
                  Halo! Silakan isi nama Anda untuk memulai chat.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input"
                    placeholder="Nama Anda"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email (opsional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                    placeholder="email@example.com"
                  />
                </div>
                <button onClick={handleStartChat} className="btn btn-primary w-full">
                  Mulai Chat
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${
                      msg.type === "customer" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-2 rounded-lg ${
                        msg.type === "customer"
                          ? "bg-primary-600 text-white"
                          : msg.type === "system"
                          ? "bg-gray-100 text-gray-600 text-sm italic"
                          : "bg-gray-200 text-gray-800"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          {started && (
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  className="input flex-1"
                  placeholder="Ketik pesan..."
                />
                <button onClick={handleSendMessage} className="btn btn-primary">
                  Kirim
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function Landing() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary-600">HeraDesk</h1>
          <a
            href="/login"
            className="text-gray-600 hover:text-primary-600 transition-colors"
          >
            Login CS/Admin
          </a>
        </div>
      </nav>

      {/* Hero */}
      <main className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Customer Service Chat
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Hubungi kami untuk bantuan dan pertanyaan Anda
          </p>
        </div>
      </main>

      {/* Chat Widget */}
      <ChatWidget />
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<Landing />);
