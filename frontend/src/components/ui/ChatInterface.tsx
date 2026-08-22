import { useState, useRef, useEffect } from "react";
import type { ChatMessage, PolicyReference } from "@/types";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Send, Bot, User, FileText, Loader2, Sparkles, ChevronDown } from "lucide-react";


const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "msg-001",
    role: "assistant",
    content:
      "Hello! I'm your Policy Companion powered by Gemini AI. I have access to all clinical policies, coverage guidelines, and medical necessity criteria. Ask me anything about prior authorization requirements, coverage criteria, or clinical guidelines.",
    timestamp: new Date(Date.now() - 120000).toISOString(),
    sources: [],
  },
];

const CANNED_RESPONSES: Record<string, { content: string; sources: PolicyReference[] }> = {
  default: {
    content:
      "Based on the relevant policies in our database, I found the following information. Total knee replacement (TKA) requires documentation of: (1) Kellgren-Lawrence Grade 3 or 4 osteoarthritis on X-ray, (2) Failure of at least 3 months of conservative therapy including physical therapy and NSAIDs, (3) Functional limitation documented by validated scale (KOOS, WOMAC, or Oxford Knee Score), and (4) BMI under 40 for most plans. Would you like me to pull the full policy text or check if any specific member criteria apply?",
    sources: [
      {
        id: "pol-001",
        title: "Total Knee Replacement Policy v4.2",
        section: "Section 3.2 - Medical Necessity Criteria",
        relevanceScore: 96,
        excerpt:
          "Coverage is medically necessary when patient has documented failure of at least 3 months of conservative therapy and radiographic evidence of severe osteoarthritis.",
      },
      {
        id: "pol-002",
        title: "Orthopedic Surgery Clinical Criteria",
        section: "Section 1.4 - Preoperative Requirements",
        relevanceScore: 82,
        excerpt:
          "For patients with diabetes mellitus, HbA1c must be ≤8.0% within 90 days of planned surgery date.",
      },
    ],
  },
};

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  const toggleSources = (id: string) => {
    setExpandedSources((prev) => ({ ...prev, [id]: !prev[id] }));
  };


  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    await new Promise((r) => setTimeout(r, 1500));

    const response = CANNED_RESPONSES.default;
    const aiMsg: ChatMessage = {
      id: `msg-${Date.now() + 1}`,
      role: "assistant",
      content: response.content,
      timestamp: new Date().toISOString(),
      sources: response.sources,
    };
    setMessages((prev) => [...prev, aiMsg]);
    setIsLoading(false);
  };

  const suggestedQuestions = [
    "What are the criteria for TKR approval?",
    "Does alemtuzumab require REMS enrollment?",
    "What biologics are covered for psoriasis?",
    "Show me the oncology step therapy policy",
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 px-1 scrollbar-thin">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-3",
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            {/* Avatar */}
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                msg.role === "assistant"
                  ? "bg-teal-100 text-teal-600"
                  : "bg-slate-200 text-slate-600"
              )}
            >
              {msg.role === "assistant" ? (
                <Bot className="h-4 w-4" />
              ) : (
                <User className="h-4 w-4" />
              )}
            </div>

            {/* Bubble */}
            <div className={cn("flex max-w-[82%] flex-col gap-2", msg.role === "user" && "items-end")}>
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed",
                  msg.role === "assistant"
                    ? "bg-white border border-slate-200 text-slate-700 shadow-sm rounded-tl-md"
                    : "bg-teal-600 text-white rounded-tr-md"
                )}
              >
                {msg.content}
              </div>

              {/* Sources — Collapsible with toggle button */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="space-y-1.5 w-full">
                  <button
                    type="button"
                    onClick={() => toggleSources(msg.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-teal-700 font-semibold text-[11px] transition-all cursor-pointer shadow-2xs"
                  >
                    <FileText className="h-3.5 w-3.5 text-teal-600" />
                    <span>
                      {expandedSources[msg.id]
                        ? "Hide Policy Sources"
                        : `View Policy Citations (${msg.sources.length})`}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform duration-200",
                        expandedSources[msg.id] ? "rotate-180" : ""
                      )}
                    />
                  </button>

                  {expandedSources[msg.id] && (
                    <div className="space-y-1.5 pt-1 animate-in fade-in duration-200">
                      <p className="text-[11px] font-semibold text-slate-500 px-1">Retrieved Sources:</p>
                      {msg.sources.map((src) => (
                        <div
                          key={src.id}
                          className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 text-left"
                        >
                          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" />
                          <div>
                            <p className="text-[12px] font-semibold text-slate-800">{src.title}</p>
                            <p className="text-[11px] text-slate-600">{src.section}</p>
                            <span className="mt-1 inline-block rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800">
                              {src.relevanceScore}% match
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}


              <time className="px-1 text-[11px] text-slate-400">
                {formatRelativeTime(msg.timestamp)}
              </time>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-600">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-teal-500" />
              <span className="text-[13px] text-slate-500">Searching policy database...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggested questions */}
      {messages.length <= 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {suggestedQuestions.map((q) => (
            <button
              key={q}
              onClick={() => setInput(q)}
              className="flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-[12px] font-medium text-teal-700 transition-colors hover:bg-teal-100"
            >
              <Sparkles className="h-3 w-3" />
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="mt-4 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={1}
          placeholder="Ask about coverage criteria, policies, clinical guidelines..."
          className="flex-1 resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13.5px] text-slate-900 placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100 transition-all"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm transition-all hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send className="h-4.5 w-4.5 h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  );
}
