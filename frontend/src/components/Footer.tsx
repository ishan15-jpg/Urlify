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
            A url shortening service.
          </p>
        </div>

        <div className="mb-6 md:mb-0 text-center md:text-left">
          <span className="block text-headline-md font-bold text-primary mb-2">
            <a
              href="https://github.com/ishan15-jpg/urlify"
              target="_blank"
              rel="noopener noreferrer"
            >
              Github Repository
            </a>
          </span>
        </div>

      </div>
    </footer>
  );
}

export default Footer;
