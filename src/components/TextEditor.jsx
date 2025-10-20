import React, { useState, useRef } from "react";
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
  const textareaRef = useRef(null);
  const [textAlign, setTextAlign] = useState("left");

  const applyFormat = (command, value = null) => {
    document.execCommand(command, false, value);
  };

  const handleAlign = (align) => {
    setTextAlign(align);
    applyFormat(`justify${align.charAt(0).toUpperCase() + align.slice(1)}`);
  };

  const handleImageUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          applyFormat("insertImage", event.target.result);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleLinkInsert = () => {
    const url = prompt("Enter URL:");
    if (url) {
      applyFormat("createLink", url);
    }
  };

  const toolbarButtons = [
    { icon: Bold, command: "bold", title: "Bold" },
    { icon: Italic, command: "italic", title: "Italic" },
    { icon: Underline, command: "underline", title: "Underline" },
    { icon: Strikethrough, command: "strikeThrough", title: "Strikethrough" },
    { icon: Type, command: "fontSize", value: "4", title: "Text Size" },
  ];

  const alignmentButtons = [
    { icon: AlignLeft, align: "left", title: "Align Left" },
    { icon: AlignCenter, align: "center", title: "Align Center" },
    { icon: AlignRight, align: "right", title: "Align Right" },
    { icon: AlignJustify, align: "justify", title: "Justify" },
    { icon: List, command: "insertUnorderedList", title: "Bullet List" },
    { icon: ListOrdered, command: "insertOrderedList", title: "Numbered List" },
  ];

  return (
    <div className="bg-[#0E0E10] border border-white/10 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 p-3 border-b border-white/10">
        {/* Text Formatting */}
        {toolbarButtons.map((btn, idx) => {
          const Icon = btn.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => applyFormat(btn.command, btn.value)}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
              title={btn.title}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}

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
          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Attach File"
        >
          <Paperclip className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleImageUpload}
          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Insert Image"
        >
          <ImageIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Insert Emoji"
        >
          <Smile className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-white/10 mx-1"></div>

        {/* Alignment */}
        {alignmentButtons.map((btn, idx) => {
          const Icon = btn.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() =>
                btn.align ? handleAlign(btn.align) : applyFormat(btn.command)
              }
              className={`p-2 rounded transition-colors ${
                btn.align && textAlign === btn.align
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

        {/* Undo/Redo */}
        <button
          type="button"
          onClick={() => applyFormat("undo")}
          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat("redo")}
          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </button>
      </div>

      {/* Content Editable Area */}
      <div
        ref={textareaRef}
        contentEditable
        onInput={(e) => onChange && onChange(e.target.innerHTML)}
        dangerouslySetInnerHTML={{ __html: value }}
        className="w-full min-h-[120px] p-4 text-white focus:outline-none"
        style={{ textAlign }}
      />
    </div>
  );
};

export default TextEditor;
