import { getCollection } from 'astro:content';
import { flags } from '../config/flags';

export async function getProfile() {
  const [p] = await getCollection('profile');
  return p.data;
}

export async function getApprovedProjects() {
  const all = await getCollection('projects');
  return all.filter((p) => p.data.approved).sort((a, b) => a.data.order - b.data.order);
}

export async function getExpertise() {
  return (await getCollection('expertise')).sort((a, b) => a.data.order - b.data.order);
}

export async function getArchitecture() {
  return (await getCollection('architecture')).sort((a, b) => a.data.order - b.data.order);
}

export interface NavItem { href: string; label: string }

/** Nav is generated from the routes that exist. Flags gate optional routes. */
export async function getNav(): Promise<NavItem[]> {
  const nav: NavItem[] = [
    { href: '/', label: 'Home' },
    { href: '/about/', label: 'About' },
    { href: '/projects/', label: 'Projects' },
    { href: '/architecture/', label: 'Architecture' },
  ];
  if (flags.experience && (await getCollection('experience')).length > 0) nav.push({ href: '/experience/', label: 'Experience' });
  if (flags.insights && (await getCollection('insights')).length > 0) nav.push({ href: '/insights/', label: 'Insights' });
  nav.push({ href: '/contact/', label: 'Contact' });
  return nav;
}
