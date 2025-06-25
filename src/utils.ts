import path from 'path';

export function isPathRelative(p: string): boolean {
  return path.normalize(p) !== path.resolve(p);
}

/**
 * Splits cmd on space characters unless they are quoted
 * Example: "'google chrome' --incognito" ==> ['google chrome', '--incognito']
 */
export function splitCommandLine(cmd?: string): string[] {
  if (!cmd) {
    return [];
  }

  const matches = cmd.match(/([^\s"']+|["'][^"']*["'])+/g);
  if (!matches) {
    return [];
  }

  return matches.map((s) => s.replace(/["']/g, ''));
}
