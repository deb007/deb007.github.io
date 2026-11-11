import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const b64Shards = z
  .array(z.string().regex(/^[A-Za-z0-9+/]+={0,2}$/, 'shard must be base64'))
  .min(2, 'contact values must be split into at least 2 shards');

const profile = defineCollection({
  loader: glob({ pattern: '*.json', base: './content/profile' }),
  schema: z.object({
    name: z.string().min(1),
    positioning: z.string().min(1),
    headline: z.string().min(1),
    credentialLine: z.string().min(1),
    builderSignal: z
      .string()
      .refine((s) => !/\d/.test(s), 'builderSignal must not contain a number'),
    githubProfile: z.literal('https://github.com/deb007'),
    contact: z.object({ email: b64Shards, linkedin: b64Shards }),
  }),
});

const WORK_TYPES = ['Professional experience', 'Personal project', 'Prototype', 'Research'] as const;
const CATEGORIES = [
  'Enterprise AI & GenAI',
  'Agentic AI & MCP',
  'Cloud-native & architecture',
  'Developer tools & automation',
  'Other explorations',
] as const;

const projects = defineCollection({
  loader: glob({ pattern: '*.json', base: './content/projects' }),
  schema: z
    .object({
      name: z.string().min(1),
      slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
      oneLine: z.string().min(1),
      visibility: z.enum(['private', 'public']),
      workType: z.enum(WORK_TYPES),
      category: z.enum(CATEGORIES),
      status: z.enum(['active', 'wip', 'prototype', 'dormant']),
      approved: z.boolean().default(false),
      listed: z.boolean().default(false),
      order: z.number().int().positive(),
      aiAssisted: z.boolean().default(false),
      problem: z.string().min(1),
      built: z.string().min(1),
      decisions: z.array(z.string().min(1)).min(1).max(3),
      stack: z.array(z.string().min(1)).min(1),
      diagramRef: z.string().min(1),
      repoPublic: z.string().url().optional(),
    })
    .superRefine((p, ctx) => {
      if (p.repoPublic && p.visibility !== 'public') {
        ctx.addIssue({ code: 'custom', message: 'repoPublic is only allowed on public projects', path: ['repoPublic'] });
      }
      const text = JSON.stringify(p);
      if (p.visibility === 'private' && /github\.com\/deb007\//i.test(text)) {
        ctx.addIssue({ code: 'custom', message: 'private project contains a github.com/deb007/ URL' });
      }
    }),
});

const expertise = defineCollection({
  loader: glob({ pattern: '*.json', base: './content/expertise' }),
  schema: z.object({
    title: z.string().min(1),
    order: z.number().int().positive(),
    summary: z.string().min(1),
    topics: z.array(z.string().min(1)).min(1),
    exercisedIn: z.array(z.string()).default([]),
  }),
});

const architecture = defineCollection({
  loader: glob({ pattern: '*.json', base: './content/architecture' }),
  schema: z.object({
    title: z.string().min(1),
    order: z.number().int().positive(),
    label: z.literal('Reference architecture: how I approach this'),
    summary: z.string().min(1),
    layers: z.array(z.object({ name: z.string().min(1), note: z.string().min(1) })).min(2),
    textAlternative: z.string().min(1),
  }),
});

const experience = defineCollection({
  loader: glob({ pattern: '*.json', base: './content/experience' }),
  schema: z.object({
    organisation: z.string().min(1),
    role: z.string().min(1),
    start: z.string().min(4),
    end: z.string().min(4).optional(),
    summary: z.string().min(1),
  }),
});

const insights = defineCollection({
  loader: glob({ pattern: '*.json', base: './content/insights' }),
  schema: z.object({
    title: z.string().min(1),
    slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    published: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    summary: z.string().min(1),
    verified: z.literal(true),
  }),
});

export const collections = { profile, projects, expertise, architecture, experience, insights };
