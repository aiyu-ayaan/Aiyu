import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { evaluateBlogForReview } from '../blogReviewEngine.js';

describe('Blog Review Engine Unit Tests', () => {
    test('should pass a legitimate production blog post without flagging', () => {
        const payload = {
            title: 'Building Modern Web Applications with Next.js 16 and Prisma',
            content: 'In this article, we explore architectural patterns for scaling Next.js applications backed by PostgreSQL and Prisma ORM...',
            excerpt: 'A deep dive into Next.js 16 and Prisma ORM.',
            slug: 'building-modern-web-applications-nextjs-prisma',
            tags: ['Next.js', 'React', 'Prisma'],
            keywords: ['webdev', 'fullstack'],
        };

        const result = evaluateBlogForReview(payload);
        assert.equal(result.isFlagged, false);
        assert.equal(result.flagReason, '');
        assert.equal(result.reviewStatus, 'CLEAN');
    });

    test('should flag post with "test blog" in title', () => {
        const payload = {
            title: 'My First Test Blog Post',
            content: 'This is a detailed post explaining how testing works in web development systems.',
            excerpt: 'Testing post',
        };

        const result = evaluateBlogForReview(payload);
        assert.equal(result.isFlagged, true);
        assert.equal(result.reviewStatus, 'FLAGGED');
        assert.match(result.flagReason, /test/i);
    });

    test('should flag post with "lorem ipsum" in content', () => {
        const payload = {
            title: 'Designing Beautiful User Interfaces',
            content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
            excerpt: 'Design post',
        };

        const result = evaluateBlogForReview(payload);
        assert.equal(result.isFlagged, true);
        assert.equal(result.reviewStatus, 'FLAGGED');
        assert.match(result.flagReason, /lorem ipsum/i);
    });

    test('should flag post with content shorter than threshold', () => {
        const payload = {
            title: 'Short Update',
            content: 'Hello world',
        };

        const result = evaluateBlogForReview(payload);
        assert.equal(result.isFlagged, true);
        assert.equal(result.reviewStatus, 'FLAGGED');
        assert.match(result.flagReason, /below minimum quality threshold/i);
    });

    test('should flag post matching custom keywords from config', () => {
        const payload = {
            title: 'Secret Internal Preview Feature',
            content: 'This post discusses internal staging features for engineering teams.',
        };

        const config = {
            customTestKeywords: 'internal preview, staging test',
        };

        const result = evaluateBlogForReview(payload, config);
        assert.equal(result.isFlagged, true);
        assert.equal(result.reviewStatus, 'FLAGGED');
        assert.match(result.flagReason, /custom test keyword/i);
    });

    test('should skip evaluation if engine is disabled in config', () => {
        const payload = {
            title: 'Test Post',
            content: 'Short',
        };

        const config = {
            enableBlogReviewEngine: false,
        };

        const result = evaluateBlogForReview(payload, config);
        assert.equal(result.isFlagged, false);
        assert.equal(result.reviewStatus, 'CLEAN');
    });
});
