import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLinks } from '../hooks/useLinks';
import LinksTable from './LinksTable';

export default function AuthenticatedLinks() {
  const [page, setPage] = useState(1);
  const { data: linksResponse, isLoading, isError } = useLinks(page, 20);

  return (
    <main className="grow pt-24 pb-16 px-[var(--spacing-gutter)] max-w-[var(--spacing-container-max)] mx-auto w-full">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 mb-8 text-label-md" aria-label="Breadcrumb">
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
          <Link to="/" className="bg-primary text-white hover:bg-primary/90 px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 whitespace-nowrap cursor-pointer">
            <span className="material-symbols-outlined">add</span>
            Create New Link
          </Link>
        </div>

        {isLoading ? (
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
                   {[...Array(5)].map((_, i) => (
                     <tr key={i} className="animate-pulse">
                       <td className="px-6 py-6">
                         <div className="h-4 bg-surface-container-high rounded w-32"></div>
                       </td>
                       <td className="px-6 py-6">
                         <div className="h-4 bg-surface-container-high rounded w-48"></div>
                       </td>
                       <td className="px-6 py-6">
                         <div className="h-4 bg-surface-container-high rounded w-24"></div>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-24 bg-surface-container-lowest border-2 border-dashed border-error rounded-xl gap-6">
             <div className="w-16 h-16 bg-error-container rounded-full flex items-center justify-center text-error">
               <span className="material-symbols-outlined text-[40px]">error</span>
             </div>
             <div className="text-center">
               <h3 className="text-headline-md font-bold text-on-surface mb-2">Error loading links</h3>
               <p className="text-on-surface-variant text-body-md max-w-md mx-auto">There was a problem fetching your links. Please try again later.</p>
             </div>
          </div>
        ) : linksResponse?.shortUrls && linksResponse.shortUrls.length > 0 ? (
          <LinksTable 
            links={linksResponse.shortUrls} 
            pagination={linksResponse.pagination} 
            onPageChange={setPage} 
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-24 bg-surface-container-lowest border-2 border-dashed border-outline-variant rounded-xl gap-6">
            <div className="w-16 h-16 bg-secondary-container rounded-full flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[40px]">link_off</span>
            </div>
            <div className="text-center">
              <h3 className="text-headline-md font-bold text-on-surface mb-2">No links created yet</h3>
              <p className="text-on-surface-variant text-body-md max-w-md mx-auto">Shorten your first URL to start tracking analytics and performance.</p>
            </div>
            <Link to="/" className="bg-primary text-white px-8 py-3 rounded-lg font-bold shadow-sm active:scale-95 transition-transform hover:bg-primary/90 cursor-pointer">
              Get Started
            </Link>
          </div>
        )}
    </main>
  );
}
