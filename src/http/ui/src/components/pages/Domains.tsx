import { useState, useRef, useEffect, useCallback } from "react";
import { Container, Paper, Snackbar, Alert } from "@mui/material";
import { DomainsControlBar } from "@molecules/domains/ControlBar";
import { DomainAddModal } from "@organisms/domains/AddModal";
import { DomainsTable, SortColumn } from "@organisms/domains/Table";
import { SortDirection } from "@atoms/common/SortableTableCell";
import {
  useDomainActions,
  useParsedLogs,
  useFilteredLogs,
  useSortedLogs,
} from "@hooks/useDomainActions";
import { generateDomainVariants } from "@utils";
import { colors } from "@design";
import { useWebSocket } from "@/ctx/B4WsProvider";

export default function Domains() {
  const { domains, pauseDomains, setPauseDomains, clearDomains } =
    useWebSocket();

  const [filter, setFilter] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const tableRef = useRef<HTMLDivElement | null>(null);

  const {
    modalState,
    snackbar,
    openModal,
    closeModal,
    selectVariant,
    addDomain,
    closeSnackbar,
  } = useDomainActions();

  useEffect(() => {
    const el = tableRef.current;
    if (el && autoScroll) {
      el.scrollTop = el.scrollHeight;
    }
  }, [domains, autoScroll]);

  const parsedLogs = useParsedLogs(domains);
  const filteredLogs = useFilteredLogs(parsedLogs, filter);
  const sortedData = useSortedLogs(filteredLogs, sortColumn, sortDirection);

  const handleScroll = () => {
    const el = tableRef.current;
    if (el) {
      const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
      setAutoScroll(isAtBottom);
    }
  };

  const handleSort = (column: SortColumn) => {
    setAutoScroll(false);

    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortColumn(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleClearSort = () => {
    setSortColumn(null);
    setSortDirection(null);
    setAutoScroll(true);
  };

  const handleDomainClick = (domain: string) => {
    const variants = generateDomainVariants(domain);
    openModal(domain, variants);
  };

  const handleHotkeysDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if ((e.ctrlKey && e.key === "x") || e.key === "Delete") {
        e.preventDefault();
        clearDomains();
      } else if (e.key === "p" || e.key === "Pause") {
        e.preventDefault();
        setPauseDomains(!pauseDomains);
      }
    },
    [clearDomains, pauseDomains, setPauseDomains]
  );

  useEffect(() => {
    globalThis.window.addEventListener("keydown", handleHotkeysDown);
    return () => {
      globalThis.window.removeEventListener("keydown", handleHotkeysDown);
    };
  }, [handleHotkeysDown]);

  return (
    <Container
      maxWidth={false}
      sx={{
        flex: 1,
        py: 3,
        px: 3,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Paper
        elevation={0}
        variant="outlined"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid",
          borderColor: pauseDomains
            ? colors.border.strong
            : colors.border.default,
          transition: "border-color 0.3s",
        }}
      >
        <DomainsControlBar
          filter={filter}
          onFilterChange={setFilter}
          totalCount={parsedLogs.length}
          filteredCount={filteredLogs.length}
          sortColumn={sortColumn}
          paused={pauseDomains}
          onPauseChange={setPauseDomains}
          onClearSort={handleClearSort}
          onReset={clearDomains}
        />

        <DomainsTable
          data={sortedData}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
          onDomainClick={handleDomainClick}
          tableRef={tableRef}
          onScroll={handleScroll}
        />
      </Paper>

      <DomainAddModal
        open={modalState.open}
        domain={modalState.domain}
        variants={modalState.variants}
        selected={modalState.selected}
        onClose={closeModal}
        onSelectVariant={selectVariant}
        onAdd={(...args) => {
          void addDomain(...args);
        }}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
