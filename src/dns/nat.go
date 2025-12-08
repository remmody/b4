package dns

import (
	"fmt"
	"net"
	"sync"
	"time"
)

type dnsNATEntry struct {
	originalDst net.IP
	timestamp   time.Time
}

var (
	dnsNATTable = make(map[string]dnsNATEntry)
	dnsNATMu    sync.RWMutex
)

func dnsNATKey(ip net.IP, port uint16) string {
	return fmt.Sprintf("%s:%d", ip.String(), port)
}

func DnsNATSet(clientIP net.IP, clientPort uint16, originalDst net.IP) {
	dnsNATMu.Lock()
	dnsNATTable[dnsNATKey(clientIP, clientPort)] = dnsNATEntry{
		originalDst: originalDst,
		timestamp:   time.Now(),
	}
	dnsNATMu.Unlock()
}

func DnsNATGet(clientIP net.IP, clientPort uint16) (net.IP, bool) {
	dnsNATMu.RLock()
	entry, ok := dnsNATTable[dnsNATKey(clientIP, clientPort)]
	dnsNATMu.RUnlock()
	if !ok || time.Since(entry.timestamp) > 10*time.Second {
		return nil, false
	}
	return entry.originalDst, true
}

func DnsNATDelete(clientIP net.IP, clientPort uint16) {
	dnsNATMu.Lock()
	delete(dnsNATTable, dnsNATKey(clientIP, clientPort))
	dnsNATMu.Unlock()
}
