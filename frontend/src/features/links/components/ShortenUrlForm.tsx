import { useState, useRef } from 'react';

export default function ShortenUrlForm() {
  const [urlValue, setUrlValue] = useState('');
  const [hasError, setHasError] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleShorten = () => {
    if (urlValue.trim().length === 0) {
      setHasError(true);
      setTimeout(() => setHasError(false), 1000);
      return;
    }
    // TODO: integrate with API
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrlValue(text);
      textareaRef.current?.focus();
    } catch {
      console.log('Clipboard access denied');
    }
  };

  return (
    <div className="w-full max-w-sm sm:max-w-2xl mx-auto relative group">
      {/* Glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary opacity-20 group-focus-within:opacity-40 blur-lg transition-opacity duration-500 rounded-xl pointer-events-none" />

      <div
        className={`relative flex flex-col items-stretch bg-surface-container-lowest border rounded-xl p-4 shadow-sm transition-all
          ${hasError
            ? 'border-error ring-2 ring-error/20'
            : 'border-outline-variant focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15'
          }`}
      >
        <textarea
          ref={textareaRef}
          id="urlInput"
          className="w-full h-40 md:h-56 bg-transparent border-none focus:ring-0 focus:outline-none resize-none text-body-lg p-6 text-on-surface placeholder:text-outline-variant"
          placeholder="Paste your long link here..."
          value={urlValue}
          onChange={(e) => setUrlValue(e.target.value)}
        />

        <div className="flex items-center justify-between border-t border-outline-variant pt-4 mt-4">
          <button
            className="flex items-center gap-2 px-4 text-outline hover:text-primary transition-colors cursor-pointer"
            onClick={handlePaste}
          >
            <span className="material-symbols-outlined text-[20px]">
              content_paste
            </span>
            <span className="text-label-sm font-semibold hidden md:inline">
              Paste from clipboard
            </span>
          </button>

          <button
            className="bg-primary-container hover:bg-primary-container/90 text-on-primary-container font-bold px-8 py-4 rounded-lg transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            onClick={handleShorten}
          >
            <span>Shorten</span>
            <span className="material-symbols-outlined">auto_fix_high</span>
          </button>
        </div>
      </div>
    </div>
  );
}
