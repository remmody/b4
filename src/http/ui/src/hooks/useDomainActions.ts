import { useState, useCallback, useMemo, useRef } from "react";
import { SortDirection } from "@common/SortableTableCell";
import { asnStorage } from "@utils";
import { useSnackbar } from "@context/SnackbarProvider";

// Types
export type SortColumn =
  | "timestamp"
  | "set"
  | "protocol"
  | "domain"
  | "source"
  | "destination";

export interface ParsedLog {
  timestamp: string;
  protocol: "TCP" | "UDP";
  hostSet: string;
  ipSet: string;
  domain: string;
  source: string;
  destination: string;
  raw: string;
  sourceAlias: string;
}

interface DomainModalState {
  open: boolean;
  domain: string;
  variants: string[];
  selected: string;
}

// Simple LRU Cache for parsed logs
class ParseCache {
  private cache = new Map<string, ParsedLog | null>();
  private maxSize = 5000;

  get(key: string): ParsedLog | null | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: string, value: ParsedLog | null): void {
    if (this.cache.size >= this.maxSize) {
      // Delete oldest (first) entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

const parseCache = new ParseCache();

// ASN Lookup cache
const asnLookupCache = new Map<string, string | null>();

export function getAsnForIp(destination: string): string | null {
  if (!destination) return null;

  const cached = asnLookupCache.get(destination);
  if (cached !== undefined) return cached;

  const asn = asnStorage.findAsnForIp(destination);
  const result = asn?.name || null;

  asnLookupCache.set(destination, result);

  // Limit cache size
  if (asnLookupCache.size > 2000) {
    const entries = Array.from(asnLookupCache.entries());
    asnLookupCache.clear();
    entries.slice(-1000).forEach(([k, v]) => asnLookupCache.set(k, v));
  }

  return result;
}

export function clearAsnLookupCache(): void {
  asnLookupCache.clear();
}

// Parse a single log line with caching
function parseSniLogLine(line: string): ParsedLog | null {
  // Check cache first
  const cached = parseCache.get(line);
  if (cached !== undefined) return cached;

  const tokens = line.trim().split(",");
  if (tokens.length < 7) {
    parseCache.set(line, null);
    return null;
  }

  const [
    timestamp,
    protocol,
    hostSet,
    domain,
    source,
    ipSet,
    destination,
    sourceAlias,
  ] = tokens;

  const result: ParsedLog = {
    timestamp: timestamp.replaceAll(" [INFO]", "").trim().split(".")[0],
    protocol: protocol as "TCP" | "UDP",
    hostSet,
    domain,
    source,
    ipSet,
    destination,
    raw: line,
    sourceAlias,
  };

  parseCache.set(line, result);
  return result;
}

// Domain actions hook
export function useDomainActions() {
  const { showSuccess, showError } = useSnackbar();
  const [modalState, setModalState] = useState<DomainModalState>({
    open: false,
    domain: "",
    variants: [],
    selected: "",
  });

  const openModal = useCallback((domain: string, variants: string[]) => {
    setModalState({
      open: true,
      domain,
      variants,
      selected: variants[0] || domain,
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalState({
      open: false,
      domain: "",
      variants: [],
      selected: "",
    });
  }, []);

  const selectVariant = useCallback((variant: string) => {
    setModalState((prev) => ({ ...prev, selected: variant }));
  }, []);

  const addDomain = useCallback(
    async (setId: string, setName?: string) => {
      if (!modalState.selected) return;

      try {
        const response = await fetch("/api/geosite/domain", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: modalState.selected,
            set_id: setId,
            set_name: setName,
          }),
        });

        if (response.ok) {
          showSuccess(`Domain ${modalState.selected} added successfully`);
          closeModal();
        } else {
          const error = (await response.json()) as { message: string };
          showError(`Failed to add domain: ${error.message}`);
        }
      } catch (error) {
        showError(`Failed to add domain: ${String(error)}`);
      }
    },
    [modalState.selected, closeModal, showError, showSuccess]
  );

  return {
    modalState,
    openModal,
    closeModal,
    selectVariant,
    addDomain,
  };
}

// Optimized hook to parse logs - uses stable reference tracking
export function useParsedLogs(lines: string[], showAll: boolean): ParsedLog[] {
  const prevLinesRef = useRef<string[]>([]);
  const prevResultRef = useRef<ParsedLog[]>([]);
  const prevShowAllRef = useRef<boolean>(showAll);

  return useMemo(() => {
    const prevLines = prevLinesRef.current;
    const prevResult = prevResultRef.current;

    // If showAll changed, refilter from cached parsed results
    if (prevShowAllRef.current !== showAll && prevLines === lines) {
      prevShowAllRef.current = showAll;
      const filtered = showAll
        ? prevResult
        : prevResult.filter((log) => log.domain !== "");
      return filtered;
    }

    prevShowAllRef.current = showAll;

    // Check if we can do incremental update
    if (prevLines.length > 0 && lines.length > prevLines.length) {
      // Check if this is an append operation
      let isAppend = true;
      const checkLength = Math.min(prevLines.length, 100); // Check last 100 items
      for (let i = 0; i < checkLength; i++) {
        const prevIdx = prevLines.length - checkLength + i;
        const currIdx =
          lines.length - (lines.length - prevLines.length) - checkLength + i;
        if (
          currIdx >= 0 &&
          prevIdx >= 0 &&
          lines[currIdx] !== prevLines[prevIdx]
        ) {
          isAppend = false;
          break;
        }
      }

      if (isAppend) {
        // Only parse new lines
        const newLines = lines.slice(prevLines.length);
        const newParsed = newLines
          .map(parseSniLogLine)
          .filter((log): log is ParsedLog => log !== null);

        const allParsed = [...prevResult, ...newParsed];
        prevLinesRef.current = lines;
        prevResultRef.current = allParsed;

        return showAll
          ? allParsed
          : allParsed.filter((log) => log.domain !== "");
      }
    }

    // Full parse needed
    const parsed = lines
      .map(parseSniLogLine)
      .filter((log): log is ParsedLog => log !== null);

    prevLinesRef.current = lines;
    prevResultRef.current = parsed;

    return showAll ? parsed : parsed.filter((log) => log.domain !== "");
  }, [lines, showAll]);
}

// Optimized filtering with memoization
export function useFilteredLogs(
  parsedLogs: ParsedLog[],
  filter: string
): ParsedLog[] {
  return useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return parsedLogs;

    const filters = f
      .split("+")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (filters.length === 0) return parsedLogs;

    const fieldFilters: Record<string, string[]> = {};
    const globalFilters: string[] = [];

    for (const filterTerm of filters) {
      const colonIndex = filterTerm.indexOf(":");
      if (colonIndex > 0) {
        const field = filterTerm.substring(0, colonIndex);
        const value = filterTerm.substring(colonIndex + 1);
        if (!fieldFilters[field]) fieldFilters[field] = [];
        fieldFilters[field].push(value);
      } else {
        globalFilters.push(filterTerm);
      }
    }

    return parsedLogs.filter((log: ParsedLog) => {
      for (const [field, values] of Object.entries(fieldFilters)) {
        let fieldValue: string;
        if (field === "asn") {
          fieldValue = getAsnForIp(log.destination)?.toLowerCase() || "";
        } else {
          fieldValue =
            log[field as keyof typeof log]?.toString().toLowerCase() || "";
        }
        if (!values.some((value) => fieldValue.includes(value))) return false;
      }

      for (const filterTerm of globalFilters) {
        const asnName = getAsnForIp(log.destination);
        const matches = [
          log.hostSet,
          log.ipSet,
          log.domain,
          log.source,
          log.protocol,
          log.destination,
          asnName,
        ].some((value) => value?.toLowerCase().includes(filterTerm));
        if (!matches) return false;
      }

      return true;
    });
  }, [parsedLogs, filter]);
}

// Optimized sorting
export function useSortedLogs(
  filteredLogs: ParsedLog[],
  sortColumn: SortColumn | null,
  sortDirection: SortDirection
): ParsedLog[] {
  return useMemo(() => {
    if (!sortColumn || !sortDirection) {
      return filteredLogs;
    }

    const sorted = [...filteredLogs].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      if (sortColumn === "timestamp") {
        aValue = new Date(a.timestamp.replaceAll(/\/+/g, "-")).getTime() || 0;
        bValue = new Date(b.timestamp.replaceAll(/\/+/g, "-")).getTime() || 0;
      } else {
        aValue = (a[sortColumn as keyof ParsedLog] || "")
          .toString()
          .toLowerCase();
        bValue = (b[sortColumn as keyof ParsedLog] || "")
          .toString()
          .toLowerCase();
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredLogs, sortColumn, sortDirection]);
}
