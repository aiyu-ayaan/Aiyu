import BlogsPageHeader from '@/app/components/blogs/BlogsPageHeader';
import { getConfigData } from '@/lib/dataFetchers';
import '@/app/styles/blogs-simple.css';

export default async function BlogsLayout({ children }) {
    const config = await getConfigData();

    return (
        <div
            className="blogs-theme min-h-screen overflow-x-clip"
            style={{ animation: 'blogs-theme-fade-in 0.5s ease-out' }}
        >
            <BlogsPageHeader config={config} />
            <main className="overflow-x-clip">{children}</main>
        </div>
    );
}
