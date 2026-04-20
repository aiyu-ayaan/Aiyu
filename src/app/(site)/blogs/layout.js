import BlogsPageHeader from '@/app/components/blogs/BlogsPageHeader';
import '@/app/styles/blogs-simple.css';

export default async function BlogsLayout({ children }) {
    return (
        <div className="blogs-theme min-h-screen" style={{ animation: 'blogs-theme-fade-in 0.5s ease-out' }}>
            <BlogsPageHeader />
            <main>{children}</main>
        </div>
    );
}
