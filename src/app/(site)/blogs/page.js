
import React from 'react';
import BlogList from '../../components/blogs/BlogList';

export const metadata = {
    title: 'Blogs | Portfolio',
    description: 'Read my latest blogs and articles on web development and technology.',
};

export default function BlogsPage() {
    return (
        <div className="min-h-screen pt-20" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <BlogList />
        </div>
    );
}
