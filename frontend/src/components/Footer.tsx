function Footer() {
  return (
    <footer className="bg-surface-container-low border-t border-outline-variant mt-16">
      <div className="w-full max-w-[var(--spacing-container-max)] mx-auto py-8 px-[var(--spacing-gutter)] flex flex-col md:flex-row justify-between items-center">
        {/* Left: Brand + Copyright */}
        <div className="mb-6 md:mb-0 text-center md:text-left">
          <span className="block text-headline-md font-bold text-primary mb-2">
            Urlify
          </span>
          <p className="text-label-sm font-semibold text-on-surface-variant">
            © 2026 Urlify. All rights reserved.
          </p>
        </div>

        {/* Right: Nav Links */}
        <nav className="flex flex-wrap justify-center gap-6">
          <a
            className="text-label-sm text-on-surface-variant hover:text-primary transition-colors"
            href="#"
          >
            Privacy Policy
          </a>
          <a
            className="text-label-sm text-on-surface-variant hover:text-primary transition-colors"
            href="#"
          >
            Terms of Service
          </a>
          <a
            className="text-label-sm text-on-surface-variant hover:text-primary transition-colors"
            href="#"
          >
            API Docs
          </a>
          <a
            className="text-label-sm text-on-surface-variant hover:text-primary transition-colors"
            href="#"
          >
            Support
          </a>
        </nav>
      </div>
    </footer>
  );
}

export default Footer;
