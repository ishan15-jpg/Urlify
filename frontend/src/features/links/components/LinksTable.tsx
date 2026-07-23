import { type ShortUrl, type Pagination } from '../../../types';

interface LinksTableProps {
  links: ShortUrl[];
  pagination: Pagination;
  onPageChange: (page: number) => void;
}

export default function LinksTable({ links, pagination, onPageChange }: LinksTableProps) {
  const formatExpiration = (expiresAt?: string) => {
    if (!expiresAt) return { text: 'Never', isExpired: false };
    
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    
    if (expiryDate <= now) {
      return { text: 'Expired', isExpired: true };
    }
    
    return { 
      text: expiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), 
      isExpired: false 
    };
  };

  const handleCopy = (shortUrl: string) => {
    navigator.clipboard.writeText(shortUrl);
  };

  return (
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
            {links.map((link) => {
              const { text: expirationText, isExpired } = formatExpiration(link.expiresAt);
              // Create shortUrl for copy display - remove protocol
              const displayUrl = link.shortUrl.replace(/^https?:\/\//, '');

              return (
                <tr key={link.id} className="hover:bg-surface-container transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-label-md text-primary font-bold">{displayUrl}</span>
                      <button 
                        onClick={() => handleCopy(link.shortUrl)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-secondary-container rounded text-on-surface-variant cursor-pointer" 
                        title="Copy"
                      >
                        <span className="material-symbols-outlined text-[18px]">content_copy</span>
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-on-surface-variant text-body-md truncate max-w-[200px] md:max-w-xs" title={link.originalUrl}>
                      {link.originalUrl}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`flex items-center gap-2 text-label-md ${isExpired ? 'text-error' : 'text-on-surface-variant'}`}>
                      <span className="material-symbols-outlined text-[18px]">
                        {expirationText === 'Never' ? 'all_inclusive' : isExpired ? 'timer' : 'calendar_today'}
                      </span>
                      <span>{expirationText}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Table Footer/Pagination */}
      {pagination.totalPages > 1 && (
        <div className="px-6 py-4 bg-surface-container-lowest flex items-center justify-between border-t border-outline-variant">
          <span className="text-label-sm text-on-surface-variant">
            Showing {(pagination.currentPage - 1) * pagination.limit + 1} to {Math.min(pagination.currentPage * pagination.limit, pagination.totalItems)} of {pagination.totalItems} links
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => onPageChange(Math.max(1, pagination.currentPage - 1))}
              disabled={pagination.currentPage === 1}
              className="p-2 border border-outline-variant rounded hover:bg-surface-container-high disabled:opacity-50 text-on-surface-variant cursor-pointer transition-colors flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button 
              onClick={() => onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= pagination.totalPages}
              className="p-2 border border-outline-variant rounded hover:bg-surface-container-high disabled:opacity-50 text-on-surface-variant cursor-pointer transition-colors flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>
      )}
      
      {pagination.totalPages <= 1 && (
        <div className="px-6 py-4 bg-surface-container-lowest flex items-center justify-between border-t border-outline-variant">
          <span className="text-label-sm text-on-surface-variant">Showing {pagination.totalItems} of {pagination.totalItems} links</span>
        </div>
      )}
    </div>
  );
}
