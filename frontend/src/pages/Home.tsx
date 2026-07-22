import { Link } from 'react-router-dom';
import HomeLayout from '../layouts/HomeLayout';
import ShortenUrlForm from '../features/links/components/ShortenUrlForm';

function Home() {
  return (
    <HomeLayout>
      <main className="grow pt-32 pb-16 px-[var(--spacing-gutter)] max-w-[var(--spacing-container-max)] mx-auto w-full relative">
        {/* Hero Section */}
        <section className="max-w-4xl mx-auto flex flex-col items-center text-center">
          {/* Header Section */}
          <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-[32px] leading-[40px] md:text-headline-xl font-bold text-on-surface tracking-tight">Shorten everything.</h1>
              <p className="text-on-surface-variant text-body-md mt-2">The modern standard for URL management. Professional, tech-forward,
            and built for speed.</p>
            </div>
          </div>

          {/* URL Input Area */}
          <ShortenUrlForm />

          {/* Created Links Action */}
          <div className="mt-16">
            <Link to="/links" className="group flex items-center gap-2 text-label-md tracking-[0.01em] font-medium text-secondary border border-outline-variant px-16 py-6 rounded-full bg-surface-container-low hover:text-primary hover:border-primary hover:bg-surface-container-high transition-all cursor-pointer">
              <span className="material-symbols-outlined">history</span>
              <span>Created Links</span>
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>
    </HomeLayout>
  );
}

export default Home;
