import { useState, useRef } from 'react';

export default function ShortenUrlForm() {
  const [urlValue, setUrlValue] = useState('');
  const [hasError, setHasError] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [expirationMode, setExpirationMode] = useState('never');
  const [customDays, setCustomDays] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleShorten = () => {
    if (urlValue.trim().length === 0) {
      setHasError(true);
      setTimeout(() => setHasError(false), 1000);
      return;
    }

    let expiresAt: string | undefined;
    
    if (expirationMode !== 'never') {
      const days = expirationMode === 'custom' ? parseInt(customDays, 10) : parseInt(expirationMode, 10);
      if (!isNaN(days) && days > 0) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        expiresAt = date.toISOString();
      }
    }

    // TODO: integrate with API. payload will contain { originalUrl: urlValue, expiresAt }
    console.log('Shorten request payload:', { originalUrl: urlValue, expiresAt });
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

        {/* Advanced Options Panel */}
        <div 
          className={`grid transition-all duration-1000 ease-in-out ${
            isAdvancedOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <div className="border-t border-outline-variant pt-4 mt-4 pb-2 px-2 md:px-6">
              <div className="flex flex-col gap-2">
                <label htmlFor="expiration" className="text-label-sm font-bold text-on-surface">Link Expiration</label>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <select
                    id="expiration"
                    value={expirationMode}
                    onChange={(e) => setExpirationMode(e.target.value)}
                    className="bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full sm:w-auto cursor-pointer"
                  >
                    <option value="never">Never (Permanent)</option>
                    <option value="7">7 Days</option>
                    <option value="30">30 Days</option>
                    <option value="custom">Custom duration</option>
                  </select>

                  {expirationMode === 'custom' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={customDays}
                        onChange={(e) => setCustomDays(e.target.value)}
                        placeholder="e.g. 14"
                        className="bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-24"
                      />
                      <span className="text-body-md text-on-surface-variant">days</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-outline-variant pt-4 mt-4">
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              className="flex items-center gap-2 px-2 sm:px-4 text-outline hover:text-primary transition-colors cursor-pointer"
              onClick={handlePaste}
              title="Paste from clipboard"
            >
              <span className="material-symbols-outlined text-[20px]">
                content_paste
              </span>
              <span className="text-label-sm font-semibold hidden md:inline">
                Paste
              </span>
            </button>

            <div className="w-px h-6 bg-outline-variant hidden sm:block"></div>

            <button
              className={`flex items-center gap-2 px-2 sm:px-4 transition-colors cursor-pointer ${isAdvancedOpen ? 'text-primary' : 'text-outline hover:text-primary'}`}
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              title="Advanced Options"
            >
              <span className="material-symbols-outlined text-[20px]">settings</span>
              <span className="text-label-sm font-semibold hidden md:inline">Advanced</span>
              <span className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${isAdvancedOpen ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>
          </div>

          <button
            className="bg-primary-container hover:bg-primary-container/90 text-on-primary-container font-bold px-8 py-4 rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
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
