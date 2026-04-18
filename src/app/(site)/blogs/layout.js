import BlogsPageHeader from '@/app/components/blogs/BlogsPageHeader';
import '@/app/styles/blogs-simple.css';

export default async function BlogsLayout({ children }) {
    return (
        <div className="blogs-theme min-h-screen">
            <BlogsPageHeader />
            <main>{children}</main>
        </div>
    );
}
