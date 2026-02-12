import React, { useState, useRef, useEffect } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Type,
  Link,
  Paperclip,
  Image as ImageIcon,
  Smile,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Undo,
  Redo,
} from "lucide-react";

export const TextEditor = ({ value, onChange, placeholder }) => {
  const editorRef = useRef(null);
  const [textAlign, setTextAlign] = useState("left");
  const fileInputRef = useRef(null);

  // Initialize editor content only once
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML && value) {
      editorRef.current.innerHTML = value;
    }
  }, []);

  const applyFormat = (command, val = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, val);
    updateContent();
  };

  const updateContent = () => {
    if (onChange && editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleAlign = (align) => {
    setTextAlign(align);
    const alignCommand = {
      left: "justifyLeft",
      center: "justifyCenter",
      right: "justifyRight",
      justify: "justifyFull",
    };
    applyFormat(alignCommand[align]);
  };

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = `<img src="${event.target.result}" style="max-width: 100%; height: auto;" />`;
        editorRef.current?.focus();
        document.execCommand("insertHTML", false, img);
        updateContent();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLinkInsert = () => {
    const selection = window.getSelection();
    const selectedText = selection?.toString();
    
    if (!selectedText) {
      alert("Please select some text first to create a link");
      return;
    }

    const url = prompt("Enter URL:", "https://");
    if (url) {
      applyFormat("createLink", url);
    }
  };

  const handleInput = () => {
    updateContent();
  };

  const toolbarButtons = [
    { icon: Bold, command: "bold", title: "Bold (Ctrl+B)" },
    { icon: Italic, command: "italic", title: "Italic (Ctrl+I)" },
    { icon: Underline, command: "underline", title: "Underline (Ctrl+U)" },
    { icon: Strikethrough, command: "strikeThrough", title: "Strikethrough" },
  ];

  const alignmentButtons = [
    { icon: AlignLeft, align: "left", title: "Align Left" },
    { icon: AlignCenter, align: "center", title: "Align Center" },
    { icon: AlignRight, align: "right", title: "Align Right" },
    { icon: AlignJustify, align: "justify", title: "Justify" },
  ];

  const listButtons = [
    { icon: List, command: "insertUnorderedList", title: "Bullet List" },
    { icon: ListOrdered, command: "insertOrderedList", title: "Numbered List" },
  ];

  return (
    <div className="bg-[#0E0E10] border border-white/10 rounded-lg overflow-hidden">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 p-3 border-b border-white/10">
        {/* Text Formatting */}
        {toolbarButtons.map((btn, idx) => {
          const Icon = btn.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => applyFormat(btn.command)}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
              title={btn.title}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}

        <div className="w-px h-6 bg-white/10 mx-1"></div>

        {/* Font Size */}
        <select
          onChange={(e) => applyFormat("fontSize", e.target.value)}
          className="px-2 py-1 bg-transparent border border-white/10 text-gray-400 rounded text-sm hover:text-white hover:bg-white/10 transition-colors"
          title="Font Size"
          defaultValue="3"
        >
          <option value="1" className="bg-[#1A1A1E]">Small</option>
          <option value="3" className="bg-[#1A1A1E]">Normal</option>
          <option value="5" className="bg-[#1A1A1E]">Large</option>
          <option value="7" className="bg-[#1A1A1E]">Huge</option>
        </select>

        <div className="w-px h-6 bg-white/10 mx-1"></div>

        {/* Link and Attachments */}
        <button
          type="button"
          onClick={handleLinkInsert}
          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Insert Link"
        >
          <Link className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleImageUpload}
          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Insert Image"
        >
          <ImageIcon className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-white/10 mx-1"></div>

        {/* Alignment */}
        {alignmentButtons.map((btn, idx) => {
          const Icon = btn.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleAlign(btn.align)}
              className={`p-2 rounded transition-colors ${
                textAlign === btn.align
                  ? "text-blue-500 bg-blue-500/10"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
              title={btn.title}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}

        <div className="w-px h-6 bg-white/10 mx-1"></div>

        {/* Lists */}
        {listButtons.map((btn, idx) => {
          const Icon = btn.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => applyFormat(btn.command)}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
              title={btn.title}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}

        <div className="w-px h-6 bg-white/10 mx-1"></div>

        {/* Undo/Redo */}
        <button
          type="button"
          onClick={() => applyFormat("undo")}
          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat("redo")}
          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <Redo className="w-4 h-4" />
        </button>
      </div>

      {/* Content Editable Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="w-full min-h-[120px] p-4 text-white focus:outline-none"
        style={{ 
          textAlign,
          direction: "ltr", // Fix text direction
          unicodeBidi: "plaintext"
        }}
        suppressContentEditableWarning
        data-placeholder={placeholder || "Start typing..."}
      />

      <style jsx>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #6B7280;
          pointer-events: none;
          position: absolute;
        }
        
        [contenteditable] {
          outline: none;
        }

        [contenteditable] img {
          max-width: 100%;
          height: auto;
          border-radius: 0.375rem;
          margin: 0.5rem 0;
        }

        [contenteditable] a {
          color: #3B82F6;
          text-decoration: underline;
        }

        [contenteditable] ul,
        [contenteditable] ol {
          padding-left: 2rem;
          margin: 0.5rem 0;
        }

        [contenteditable] li {
          margin: 0.25rem 0;
        }

        [contenteditable]:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
};

export default TextEditor;