import React, { useState, useRef, useEffect, ReactNode } from "react";
import { 
  Bold, 
  Italic, 
  Heading3, 
  List, 
  CheckSquare, 
  Code,
  Eye,
  Edit2,
  CheckCircle2,
  Sparkles,
  RefreshCcw,
  BookOpen
} from "lucide-react";
import { cn } from "../lib/utils";

interface TaskNotesEditorProps {
  taskId: string;
  initialValue: string;
  onSave: (value: string) => void;
}

export default function TaskNotesEditor({ taskId, initialValue, onSave }: TaskNotesEditorProps) {
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [text, setText] = useState(initialValue || "");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync state if initialValue changes for another task
  useEffect(() => {
    setText(initialValue || "");
    setActiveTab("write");
    setSaveStatus("saved");
  }, [taskId, initialValue]);

  // Auto-save debouncer
  useEffect(() => {
    if (text === initialValue) {
      setSaveStatus("saved");
      return;
    }

    setSaveStatus("saving");
    const timer = setTimeout(() => {
      onSave(text);
      setSaveStatus("saved");
    }, 600); // Save automatic 600ms after user pauses typing

    return () => clearTimeout(timer);
  }, [text, onSave, initialValue]);

  // Rich-text insertion helper
  const insertFormat = (prefix: string, suffix: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const originalText = textarea.value;

    const selectedText = originalText.substring(start, end);
    const replacement = prefix + selectedText + suffix;

    const newText = originalText.substring(0, start) + replacement + originalText.substring(end);
    setText(newText);

    // Re-focus and set selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 0);
  };

  // Helper Custom Markdown-like Parser
  const parseNotesToJSX = (markdownText: string) => {
    if (!markdownText?.trim()) {
      return (
        <div className="text-gray-400 dark:text-gray-500 italic text-xs py-4 flex flex-col items-center justify-center gap-2">
          <BookOpen className="w-5 h-5 text-gray-300 dark:text-gray-600" />
          No detailed notes added yet. Expand the edit tab to organize workflows.
        </div>
      );
    }

    const lines = markdownText.split("\n");
    let resultJSX: ReactNode[] = [];
    let bulletListItems: ReactNode[] = [];
    let listKey = 0;

    const flushList = () => {
      if (bulletListItems.length > 0) {
        resultJSX.push(
          <ul key={`ul-${listKey++}`} className="list-none pl-4 space-y-1.5 my-2.5">
            {bulletListItems}
          </ul>
        );
        bulletListItems = [];
      }
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Ensure lists are grouped and rendered nested, flushes previous formats if line is not a list item
      const isListItem = trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ");
      if (!isListItem) {
        flushList();
      }

      // 1. Headings (### Heading or ## Heading)
      if (trimmed.startsWith("### ")) {
        resultJSX.push(
          <h4 key={index} className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 mt-4 mb-2 first:mt-1">
            {parseInlineStyles(trimmed.substring(4))}
          </h4>
        );
      } else if (trimmed.startsWith("## ")) {
        resultJSX.push(
          <h3 key={index} className="text-base font-black text-gray-800 dark:text-white mt-5 mb-2 first:mt-1">
            {parseInlineStyles(trimmed.substring(3))}
          </h3>
        );
      } else if (trimmed.startsWith("# ")) {
        resultJSX.push(
          <h2 key={index} className="text-lg font-black text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-1 mt-6 mb-3 first:mt-1">
            {parseInlineStyles(trimmed.substring(2))}
          </h2>
        );
      }
      // 2. Checklist Items (- [ ] or - [x])
      else if (trimmed.startsWith("- [ ] ") || trimmed.startsWith("- [x] ") || trimmed.startsWith("- [X] ")) {
        const isCompleted = trimmed.toLowerCase().startsWith("- [x] ");
        const content = trimmed.substring(6);
        resultJSX.push(
          <div key={index} className="flex items-center gap-2 py-1.5 px-1">
            <input 
              type="checkbox" 
              checked={isCompleted} 
              readOnly
              className="w-3.5 h-3.5 accent-indigo-600 pointer-events-none rounded min-w-3.5"
            />
            <span className={cn(
              "text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300",
              isCompleted && "line-through text-gray-400 dark:text-gray-600 font-normal"
            )}>
              {parseInlineStyles(content)}
            </span>
          </div>
        );
      }
      // 3. Bullet list items
      else if (isListItem) {
        const cleanContent = trimmed.replace(/^[-*•]\s+/, "");
        bulletListItems.push(
          <li key={index} className="flex items-start gap-2 text-xs md:text-sm text-gray-700 dark:text-gray-300">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0"></span>
            <span className="font-semibold">{parseInlineStyles(cleanContent)}</span>
          </li>
        );
      }
      // 4. Horizontal Rule
      else if (trimmed === "---" || trimmed === "===") {
        resultJSX.push(<hr key={index} className="my-4 border-gray-200 dark:border-gray-800" />);
      }
      // 5. Normal paragraphs or empty line
      else {
        if (trimmed === "") {
          resultJSX.push(<div key={index} className="h-2" />);
        } else {
          resultJSX.push(
            <p key={index} className="text-xs md:text-sm leading-relaxed text-gray-700 dark:text-gray-300 my-1 font-medium select-text">
              {parseInlineStyles(trimmed)}
            </p>
          );
        }
      }
    });

    flushList(); // Flush any remaining bullets at the end
    return <div className="space-y-1">{resultJSX}</div>;
  };

  // Helper to parse bold, italic, code inside inline content
  const parseInlineStyles = (txt: string): ReactNode[] => {
    let parts: ReactNode[] = [];
    let currentText = txt;
    let keyIdx = 0;

    // Use simple regex match replacement sequence tags
    // We parse standard Bold (**text**), Italic (*text*), Highlight (==text==), and Code (`text`)
    const regex = /(\*\*.*?\*\*|\*.*?\*|==.*?==|`.*?`)/;

    while (currentText.length > 0) {
      const match = currentText.match(regex);
      if (!match) {
        parts.push(<span key={`txt-${keyIdx++}`}>{currentText}</span>);
        break;
      }

      const matchIdx = match.index || 0;
      if (matchIdx > 0) {
        parts.push(<span key={`txt-${keyIdx++}`}>{currentText.substring(0, matchIdx)}</span>);
      }

      const fullMatch = match[0];
      if (fullMatch.startsWith("**") && fullMatch.endsWith("**")) {
        parts.push(
          <strong key={`b-${keyIdx++}`} className="font-extrabold text-gray-900 dark:text-white">
            {fullMatch.substring(2, fullMatch.length - 2)}
          </strong>
        );
      } else if (fullMatch.startsWith("*") && fullMatch.endsWith("*")) {
        parts.push(
          <em key={`i-${keyIdx++}`} className="italic text-gray-800 dark:text-gray-200">
            {fullMatch.substring(1, fullMatch.length - 1)}
          </em>
        );
      } else if (fullMatch.startsWith("==") && fullMatch.endsWith("==")) {
        parts.push(
          <mark key={`m-${keyIdx++}`} className="bg-yellow-200/90 dark:bg-yellow-900/40 text-black dark:text-yellow-250 px-1 py-0.5 rounded-md font-semibold font-sans">
            {fullMatch.substring(2, fullMatch.length - 2)}
          </mark>
        );
      } else if (fullMatch.startsWith("`") && fullMatch.endsWith("`")) {
        parts.push(
          <code key={`c-${keyIdx++}`} className="font-mono text-xs dark:text-pink-400 text-pink-650 bg-pink-50 dark:bg-pink-950/20 px-1.5 py-0.5 rounded-md">
            {fullMatch.substring(1, fullMatch.length - 1)}
          </code>
        );
      }

      currentText = currentText.substring(matchIdx + fullMatch.length);
    }

    return parts;
  };

  return (
    <div className="mt-3 border border-gray-100 dark:border-gray-800/80 bg-gray-50/20 dark:bg-gray-950/20 rounded-2xl p-4 space-y-4 shadow-inner">
      {/* Tab select and save state indication */}
      <div className="flex justify-between items-center bg-gray-100/65 dark:bg-gray-850/40 p-1 rounded-xl">
        <div className="flex gap-1.5">
          <button
            onClick={() => setActiveTab("write")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all",
              activeTab === "write"
                ? "bg-white dark:bg-gray-800 text-gray-800 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
            )}
          >
            <Edit2 className="w-3.5 h-3.5" /> Write Notes
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all",
              activeTab === "preview"
                ? "bg-white dark:bg-gray-800 text-gray-800 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
            )}
          >
            <Eye className="w-3.5 h-3.5" /> preview notes
          </button>
        </div>

        {/* Sync loading flag */}
        <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 flex items-center gap-1.5 pr-2 uppercase select-none">
          {saveStatus === "saving" && (
            <>
              <RefreshCcw className="w-3 h-3 animate-spin text-indigo-500" />
              <span>Saving...</span>
            </>
          )}
          {saveStatus === "saved" && (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>Auto-saved</span>
            </>
          )}
        </div>
      </div>

      {activeTab === "write" ? (
        <div className="space-y-3 animate-fade-in">
          {/* Format control utility bar */}
          <div className="flex flex-wrap gap-1 p-1 background-amber rounded-xl bg-gray-100/40 dark:bg-gray-900/40 border border-gray-100/20">
            <button
              onClick={() => insertFormat("**", "**")}
              type="button"
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              title="Bold text"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertFormat("*", "*")}
              type="button"
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              title="Italic text"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertFormat("### ")}
              type="button"
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              title="Heading Level 3"
            >
              <Heading3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertFormat("- ")}
              type="button"
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              title="Bullet list item"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertFormat("- [ ] ")}
              type="button"
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              title="Checklist item"
            >
              <CheckSquare className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertFormat("`", "`")}
              type="button"
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              title="Code format"
            >
              <Code className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertFormat("==", "==")}
              type="button"
              className="px-2 py-0.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg text-xs font-bold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors flex items-center justify-center leading-none"
              title="Highlight text"
            >
              Highlight
            </button>
          </div>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type notes for this task (Markdown format and shortcuts supported... e.g., **Bold**, *Italic*, ### Headers, - lists, - [ ] checklist items)"
            className="w-full min-h-[140px] text-xs md:text-sm font-semibold tracking-tight p-3 rounded-xl border border-gray-150 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-800 dark:text-gray-150 outline-none focus:ring-1 focus:ring-indigo-500 resize-y leading-relaxed"
          />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-950 p-4 border border-gray-150/40 dark:border-gray-800 rounded-xl max-h-[280px] overflow-y-auto custom-scrollbar animate-fade-in select-text">
          {parseNotesToJSX(text)}
        </div>
      )}
    </div>
  );
}
