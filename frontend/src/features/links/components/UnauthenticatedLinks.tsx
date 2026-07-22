import { Link } from 'react-router-dom';

export default function UnauthenticatedLinks() {
  return (
    <main className="grow pt-24 pb-16 px-[var(--spacing-gutter)] max-w-[var(--spacing-container-max)] mx-auto w-full">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 mb-8 text-label-md">
        <Link to="/" className="text-primary-container hover:underline font-semibold">Home</Link>
        <span className="text-outline-variant">/</span>
        <span className="text-on-surface font-bold">Created Links</span>
      </nav>
      <div className="m-auto bg-surface-container-lowest border border-outline-variant rounded-xl p-8 max-w-md w-full text-center shadow-sm">
        <div className="w-16 h-16 bg-secondary-container rounded-full flex items-center justify-center text-primary mx-auto mb-6">
          <span className="material-symbols-outlined text-[40px]">lock</span>
        </div>
        <h2 className="text-headline-md font-bold text-on-surface mb-2">Authentication Required</h2>
        <p className="text-body-md text-on-surface-variant mb-8">Please log in to view and manage your created links.</p>
        <Link to="/login" className="bg-primary hover:bg-primary/90 text-white w-full py-3 rounded-lg font-bold transition-colors inline-block text-center active:scale-[0.98]">
          Sign In
        </Link>
      </div>
    </main>
  );
}
