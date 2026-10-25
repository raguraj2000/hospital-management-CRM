// Network lock: a branch can allow its pages only from the hospital's own network (its Wi-Fi / LAN addresses).
// Written as IPv4 addresses or ranges: "192.168.1.0/24", "10.0.0.5", one per line or comma-separated.

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function ipv4ToInt(ip: string): number | null {
  const m = IPV4.exec(ip);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  if (parts.some((p) => p > 255)) return null;
  return ((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0;
}

/** "::ffff:192.168.1.5" (how Node shows IPv4 on a dual-stack socket) -> "192.168.1.5". */
export function plainIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

/** One entry is valid: an IPv4 address, or an IPv4 range with /0 to /32. */
function validEntry(entry: string): boolean {
  const [addr, bits, ...rest] = entry.split('/');
  if (rest.length || ipv4ToInt(addr ?? '') == null) return false;
  return bits == null || (/^\d{1,2}$/.test(bits) && Number(bits) <= 32);
}

/** The typed text as a list, and the entries that are not valid. */
export function parseNetworks(text: string | null | undefined): { list: string[]; bad: string[] } {
  const list = (text ?? '').split(/[\s,]+/).map((x) => x.trim()).filter(Boolean);
  return { list, bad: list.filter((x) => !validEntry(x)) };
}

/** Is this address inside one of the networks? The hospital PC itself (loopback) always is. */
export function ipAllowed(ip: string | null | undefined, networks: string[]): boolean {
  const plain = plainIp(ip);
  if (!plain) return false;
  if (plain === '::1' || plain.startsWith('127.')) return true;
  const n = ipv4ToInt(plain);
  if (n == null) return false;
  return networks.some((entry) => {
    const [addr, bits = '32'] = entry.split('/');
    const base = ipv4ToInt(addr ?? '');
    if (base == null) return false;
    const mask = Number(bits) === 0 ? 0 : (~0 << (32 - Number(bits))) >>> 0;
    return (n & mask) === (base & mask);
  });
}

/** What to suggest for the computer the owner is on: its /24 ("192.168.1.0/24"); null when unknown. */
export function suggestNetwork(ip: string | null | undefined): string | null {
  const plain = plainIp(ip);
  const n = plain ? ipv4ToInt(plain) : null;
  if (n == null || plain!.startsWith('127.')) return null;
  return `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.0/24`;
}
