// Standard Stdio Model Context Protocol (MCP) server for Aiyu portfolio data.
// Usage: node --env-file=.env scripts/mcp-server.mjs

import { PrismaClient } from '@prisma/client';
import readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

rl.on('line', async (line) => {
    if (!line.trim()) return;
    try {
        const request = JSON.parse(line);
        const response = await handleRequest(request);
        if (response) {
            process.stdout.write(JSON.stringify(response) + '\n');
        }
    } catch (e) {
        process.stdout.write(JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32700, message: "Parse error" }
        }) + '\n');
    }
});

async function handleRequest(req) {
    const { id, method, params } = req;
    
    // Notifications do not require a response
    if (id === undefined || id === null) return null;

    try {
        switch (method) {
            case 'initialize':
                return {
                    jsonrpc: "2.0",
                    id,
                    result: {
                        protocolVersion: "2024-11-05",
                        capabilities: {
                            tools: {},
                            resources: {}
                        },
                        serverInfo: {
                            name: "aiyu-portfolio-stdio",
                            version: "1.0.0"
                        }
                    }
                };

            case 'tools/list':
                return {
                    jsonrpc: "2.0",
                    id,
                    result: {
                        tools: [
                            {
                                name: "aiyu.getResume",
                                description: "Retrieve the developer resume, biography, skills, and work history.",
                                inputSchema: {
                                    type: "object",
                                    properties: {},
                                    additionalProperties: false
                                }
                            },
                            {
                                name: "aiyu.search",
                                description: "Search portfolio projects, blogs, and deployments.",
                                inputSchema: {
                                    type: "object",
                                    properties: {
                                        query: { type: "string", description: "Search term to match projects/blogs" }
                                    },
                                    required: ["query"],
                                    additionalProperties: false
                                }
                            },
                            {
                                name: "aiyu.getAiHub",
                                description: "Get the AI Hub (/ai) page content: skills grouped by category, recommended stack cards, free credits, and prompt library.",
                                inputSchema: {
                                    type: "object",
                                    properties: {},
                                    additionalProperties: false
                                }
                            }
                        ]
                    }
                };

            case 'tools/call': {
                const name = params?.name;
                const args = params?.arguments || {};
                
                if (name === 'aiyu.getResume') {
                    const about = await prisma.about.findFirst();
                    // In serializing, the data column holds the nested JSON document
                    const data = about?.data || {};
                    return {
                        jsonrpc: "2.0",
                        id,
                        result: {
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify(data, null, 2)
                                }
                            ]
                        }
                    };
                }
                
                if (name === 'aiyu.search') {
                    const query = args.query || '';
                    const blogs = await prisma.blog.findMany({
                        where: {
                            OR: [
                                { title: { contains: query, mode: 'insensitive' } },
                                { content: { contains: query, mode: 'insensitive' } }
                            ],
                            published: true
                        },
                        take: 3
                    });
                    
                    const projects = await prisma.project.findMany({
                        where: {
                            OR: [
                                { name: { contains: query, mode: 'insensitive' } },
                                { description: { contains: query, mode: 'insensitive' } }
                            ]
                        },
                        take: 3
                    });

                    const results = {
                        projects: projects.map(p => ({ name: p.name, desc: p.description, stack: p.techStack, year: p.year })),
                        blogs: blogs.map(b => ({ title: b.title, excerpt: b.excerpt, date: b.date }))
                    };

                    return {
                        jsonrpc: "2.0",
                        id,
                        result: {
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify(results, null, 2)
                                }
                            ]
                        }
                    };
                }

                if (name === 'aiyu.getAiHub') {
                    const [categories, recommendations, credits, prompts] = await Promise.all([
                        prisma.aiSkillCategory.findMany({
                            orderBy: { displayOrder: 'asc' },
                            include: { skills: { orderBy: { displayOrder: 'asc' } } }
                        }),
                        prisma.aiRecommendation.findMany({ orderBy: { displayOrder: 'asc' } }),
                        prisma.aiCredit.findMany({ orderBy: { displayOrder: 'asc' } }),
                        prisma.aiPrompt.findMany({ orderBy: { displayOrder: 'asc' } })
                    ]);

                    const payload = {
                        skills: {
                            categories: categories.map(c => ({
                                label: c.label,
                                items: c.skills.map(s => ({
                                    name: s.name,
                                    description: s.description || '',
                                    ...(s.url ? { url: s.url } : {})
                                }))
                            }))
                        },
                        recommendations: recommendations.map(r => ({
                            name: r.name, url: r.url, rating: r.rating, blurb: r.blurb, tags: r.tags
                        })),
                        credits: credits.map(c => ({
                            name: c.name, offer: c.offer, url: c.url, noCard: c.noCard, freeApi: c.freeApi, note: c.note
                        })),
                        prompts: prompts.map(p => ({ title: p.title, role: p.role, prompt: p.prompt }))
                    };

                    return {
                        jsonrpc: "2.0",
                        id,
                        result: {
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify(payload, null, 2)
                                }
                            ]
                        }
                    };
                }

                return {
                    jsonrpc: "2.0",
                    id,
                    error: { code: -32601, message: `Tool not found: ${name}` }
                };
            }

            case 'resources/list':
                return {
                    jsonrpc: "2.0",
                    id,
                    result: {
                        resources: [
                            {
                                uri: "about://resume",
                                name: "resume",
                                mimeType: "application/json",
                                description: "Full developer resume, profile, and biography."
                            }
                        ]
                    }
                };

            case 'resources/read': {
                const uri = params?.uri;
                if (uri === 'about://resume') {
                    const about = await prisma.about.findFirst();
                    const data = about?.data || {};
                    return {
                        jsonrpc: "2.0",
                        id,
                        result: {
                            contents: [
                                {
                                    uri: "about://resume",
                                    mimeType: "application/json",
                                    text: JSON.stringify(data, null, 2)
                                }
                            ]
                        }
                    };
                }
                return {
                    jsonrpc: "2.0",
                    id,
                    error: { code: -32602, message: `Resource not found: ${uri}` }
                };
            }

            default:
                return {
                    jsonrpc: "2.0",
                    id,
                    error: { code: -32601, message: `Method not found: ${method}` }
                };
        }
    } catch (err) {
        return {
            jsonrpc: "2.0",
            id,
            error: { code: -32603, message: err.message }
        };
    }
}
