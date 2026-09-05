import type { BotState, RobotsFile, RobotsGroup } from './types';

const EMPTY: RobotsFile = {
  exists: false,
  groups: [],
  sitemaps: [],
  mentionsLlmsTxt: false,
  raw: '',
};

export function emptyRobots(): RobotsFile {
  return { ...EMPTY, groups: [], sitemaps: [] };
}

/**
 * Parser robots.txt podle běžné praxe: po sobě jdoucí `User-agent` řádky tvoří
 * jednu skupinu, kterou uzavře první direktiva (Allow/Disallow).
 */
export function parseRobots(raw: string): RobotsFile {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];

  let current: RobotsGroup | null = null;
  let expectingAgents = false;

  for (const line of raw.split(/\r?\n/)) {
    const withoutComment = line.split('#')[0].trim();
    if (!withoutComment) continue;

    const separator = withoutComment.indexOf(':');
    if (separator === -1) continue;

    const field = withoutComment.slice(0, separator).trim().toLowerCase();
    const value = withoutComment.slice(separator + 1).trim();

    if (field === 'user-agent') {
      if (!current || !expectingAgents) {
        current = { agents: [], disallow: [], allow: [] };
        groups.push(current);
        expectingAgents = true;
      }
      if (value) current.agents.push(value.toLowerCase());
      continue;
    }

    if (field === 'sitemap') {
      if (value) sitemaps.push(value);
      continue;
    }

    if (field === 'disallow' || field === 'allow') {
      if (!current) {
        // Direktiva bez User-agent — chápeme ji jako pravidlo pro `*`.
        current = { agents: ['*'], disallow: [], allow: [] };
        groups.push(current);
      }
      expectingAgents = false;
      if (field === 'disallow') current.disallow.push(value);
      else current.allow.push(value);
    }
  }

  return {
    exists: true,
    groups,
    sitemaps,
    mentionsLlmsTxt: /llms\.txt/i.test(raw),
    raw,
  };
}

function findGroup(robots: RobotsFile, agent: string): RobotsGroup | null {
  const needle = agent.toLowerCase();
  const matches = robots.groups.filter((group) => group.agents.includes(needle));
  if (matches.length === 0) return null;
  // Více skupin pro stejného agenta sloučíme.
  return matches.reduce<RobotsGroup>(
    (acc, group) => ({
      agents: acc.agents,
      disallow: [...acc.disallow, ...group.disallow],
      allow: [...acc.allow, ...group.allow],
    }),
    { agents: [needle], disallow: [], allow: [] },
  );
}

function groupState(group: RobotsGroup): { state: BotState; rule: string } {
  const blocking = group.disallow.filter((value) => value !== '');
  const blocksRoot = blocking.some((value) => value === '/' || value === '/*');

  if (blocksRoot) {
    const rootAllow = group.allow.some((value) => value === '/' || value === '/*');
    if (rootAllow) return { state: 'partial', rule: 'Disallow: / + Allow: /' };
    if (group.allow.length > 0) {
      return { state: 'partial', rule: `Disallow: / s výjimkami (${group.allow.length})` };
    }
    return { state: 'disallowed', rule: 'Disallow: /' };
  }

  if (blocking.length > 0) {
    return { state: 'partial', rule: `Disallow pro ${blocking.length} cest` };
  }

  return { state: 'allowed', rule: group.disallow.length > 0 ? 'Disallow: (prázdné)' : 'bez omezení' };
}

export interface AgentVerdict {
  state: BotState;
  source: 'explicit' | 'wildcard' | 'none';
  rule?: string;
}

/** Stav konkrétního bota: nejdřív explicitní záznam, jinak fallback na `*`. */
export function agentVerdict(robots: RobotsFile, agent: string): AgentVerdict {
  if (!robots.exists) return { state: 'unknown', source: 'none' };

  const explicit = findGroup(robots, agent);
  if (explicit) {
    const { state, rule } = groupState(explicit);
    return { state, source: 'explicit', rule };
  }

  const wildcard = findGroup(robots, '*');
  if (wildcard) {
    const { state, rule } = groupState(wildcard);
    if (state === 'allowed') return { state: 'unmentioned', source: 'wildcard', rule: 'spadá pod * bez omezení' };
    return { state, source: 'wildcard', rule: `přes * — ${rule}` };
  }

  return { state: 'unmentioned', source: 'none' };
}

/** Zakazuje robots.txt celý web všem robotům? */
export function blocksEntireSite(robots: RobotsFile): boolean {
  const wildcard = findGroup(robots, '*');
  if (!wildcard) return false;
  return groupState(wildcard).state === 'disallowed';
}
