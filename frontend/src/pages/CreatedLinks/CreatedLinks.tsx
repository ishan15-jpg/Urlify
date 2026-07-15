import { useState } from 'react';
import { Link } from 'react-router-dom';

function CreatedLinks() {
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  // Mock data
  const mockLinks = [
    {
      id: '1',
      shortLink: 'urlify.io/x7b2k',
      originalUrl: 'https://github.com/developer-tools/super-long-repo-name-example/settings',
      expiration: 'Oct 24, 2024',
      isExpired: false
    },
    {
      id: '2',
      shortLink: 'urlify.io/summer24',
      originalUrl: 'https://marketing.agency/campaigns/summer-promotion-2024-landing-page',
      expiration: 'Expires in 2h',
      isExpired: true // used to color text red
    },
    {
      id: '3',
      shortLink: 'urlify.io/docs-ref',
      originalUrl: 'https://docs.api.internal/v2/reference/authentication-methods',
      expiration: 'Never',
      isExpired: false
    }
  ];

  if (!isAuthenticated) {
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

  return (
    <main className="grow pt-24 pb-16 px-[var(--spacing-gutter)] max-w-[var(--spacing-container-max)] mx-auto w-full">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 mb-8 text-label-md"
          aria-label="Breadcrumb"
        >
          <Link to="/" className="text-primary-container hover:underline font-semibold">Home</Link>
          <span className="text-outline-variant">/</span>
          <span className="text-on-surface font-bold">Created Links</span>
        </nav>

        {/* Header Section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-[32px] leading-[40px] md:text-headline-xl font-bold text-on-surface tracking-tight">Your Shortcuts</h1>
            <p className="text-on-surface-variant text-body-md mt-2">Manage and monitor all your active shortened URLs.</p>
          </div>
          <button className="bg-primary text-white hover:bg-primary/90 px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 whitespace-nowrap cursor-pointer">
            <span className="material-symbols-outlined">add</span>
            Create New Link
          </button>
        </div>

        {mockLinks.length > 0 ? (
          <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant/50">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="px-6 py-4 text-label-sm text-secondary uppercase tracking-wider font-bold">Short Link</th>
                    <th className="px-6 py-4 text-label-sm text-secondary uppercase tracking-wider font-bold">Original URL</th>
                    <th className="px-6 py-4 text-label-sm text-secondary uppercase tracking-wider font-bold">Expiration Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {mockLinks.map((link) => (
                    <tr key={link.id} className="hover:bg-surface-container transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-label-md text-primary font-bold">{link.shortLink}</span>
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-secondary-container rounded text-on-surface-variant cursor-pointer" title="Copy">
                            <span className="material-symbols-outlined text-[18px]">content_copy</span>
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-on-surface-variant text-body-md truncate max-w-[200px] md:max-w-xs">{link.originalUrl}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`flex items-center gap-2 text-label-md ${link.isExpired ? 'text-error' : 'text-on-surface-variant'}`}>
                          <span className="material-symbols-outlined text-[18px]">
                            {link.expiration === 'Never' ? 'all_inclusive' : link.isExpired ? 'timer' : 'calendar_today'}
                          </span>
                          {link.expiration}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Table Footer/Pagination */}
            <div className="px-6 py-4 bg-surface-container-lowest flex items-center justify-between border-t border-outline-variant">
              <span className="text-label-sm text-on-surface-variant">Showing {mockLinks.length} of 12 links</span>
              <div className="flex gap-2">
                <button className="p-2 border border-outline-variant rounded hover:bg-surface-container-high disabled:opacity-50 text-on-surface-variant cursor-pointer transition-colors flex items-center justify-center" disabled>
                  <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                </button>
                <button className="p-2 border border-outline-variant rounded hover:bg-surface-container-high text-on-surface-variant cursor-pointer transition-colors flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 bg-surface-container-lowest border-2 border-dashed border-outline-variant rounded-xl gap-6">
            <div className="w-16 h-16 bg-secondary-container rounded-full flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[40px]">link_off</span>
            </div>
            <div className="text-center">
              <h3 className="text-headline-md font-bold text-on-surface mb-2">No links created yet</h3>
              <p className="text-on-surface-variant text-body-md max-w-md mx-auto">Shorten your first URL to start tracking analytics and performance.</p>
            </div>
            <button className="bg-primary text-white px-8 py-3 rounded-lg font-bold shadow-sm active:scale-95 transition-transform hover:bg-primary/90 cursor-pointer">
              Get Started
            </button>
          </div>
        )}
    </main>
  );
}

export default CreatedLinks;
