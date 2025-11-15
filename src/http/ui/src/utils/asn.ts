import * as ipaddr from "ipaddr.js";

interface AsnInfo {
  id: string;
  name: string;
  prefixes: string[];
}

const ASN_STORAGE_KEY = "b4_asn_cache";

export const asnStorage = {
  addAsn: (asnId: string, name: string, prefixes: string[]) => {
    const cache = asnStorage.getAll();
    cache[asnId] = { id: asnId, name, prefixes };
    localStorage.setItem(ASN_STORAGE_KEY, JSON.stringify(cache));
  },

  getAll: (): Record<string, AsnInfo> => {
    const data = localStorage.getItem(ASN_STORAGE_KEY);
    return data ? (JSON.parse(data) as Record<string, AsnInfo>) : {};
  },

  findAsnForIp: (ip: string): AsnInfo | null => {
    const cache = asnStorage.getAll();
    const cleanIp = ip.split(":")[0].replace(/[[\]]/g, "");

    for (const asn of Object.values(cache)) {
      for (const prefix of asn.prefixes) {
        if (ipInCidr(cleanIp, prefix)) {
          return asn;
        }
      }
    }
    return null;
  },

  clear: () => localStorage.removeItem(ASN_STORAGE_KEY),
};

function ipInCidr(ip: string, cidr: string): boolean {
  try {
    const addr = ipaddr.process(ip);
    const range = ipaddr.parseCIDR(cidr);
    return addr.match(range);
  } catch {
    return false;
  }
}
