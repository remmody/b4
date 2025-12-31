package nfq

import (
	"fmt"
	"sync"
	"time"

	"github.com/daniellavrushin/b4/config"
)

type connInfo struct {
	set      *config.SetConfig
	bytesIn  uint64
	lastSeen time.Time
	injected bool
}

type connStateTracker struct {
	mu    sync.RWMutex
	conns map[string]*connInfo
}

var connState = &connStateTracker{
	conns: make(map[string]*connInfo),
}

// RegisterOutgoing called when we process outgoing ClientHello
// connKey format: "clientIP:clientPort->serverIP:443"
func (t *connStateTracker) RegisterOutgoing(connKey string, set *config.SetConfig) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.conns[connKey] = &connInfo{
		set:      set,
		lastSeen: time.Now(),
	}
}

// GetSetForIncoming returns the set for an incoming packet
// incomingKey format: "clientIP:clientPort<-serverIP:443" - need to convert
func (t *connStateTracker) GetSetForIncoming(clientIP string, clientPort uint16, serverIP string, serverPort uint16) *config.SetConfig {
	// Convert to outgoing key format
	outKey := fmt.Sprintf("%s:%d->%s:%d", clientIP, clientPort, serverIP, serverPort)

	t.mu.RLock()
	info, exists := t.conns[outKey]
	t.mu.RUnlock()

	if !exists || info.set == nil {
		return nil
	}

	t.mu.Lock()
	info.lastSeen = time.Now()
	t.mu.Unlock()

	return info.set
}

// TrackIncomingBytes tracks bytes and returns true when threshold crossed
func (t *connStateTracker) TrackIncomingBytes(clientIP string, clientPort uint16, serverIP string, serverPort uint16, bytes uint64, thresholdKB int) bool {
	outKey := fmt.Sprintf("%s:%d->%s:%d", clientIP, clientPort, serverIP, serverPort)
	threshold := uint64(thresholdKB * 1024)

	t.mu.Lock()
	defer t.mu.Unlock()

	info, exists := t.conns[outKey]
	if !exists {
		return false
	}

	prevBytes := info.bytesIn
	info.bytesIn += bytes
	info.lastSeen = time.Now()

	// Trigger when crossing threshold
	if prevBytes < threshold && info.bytesIn >= threshold {
		info.bytesIn = 0 // reset for next threshold
		return true
	}

	return false
}

func (t *connStateTracker) Cleanup() {
	t.mu.Lock()
	defer t.mu.Unlock()
	now := time.Now()
	for k, v := range t.conns {
		if now.Sub(v.lastSeen) > 120*time.Second {
			delete(t.conns, k)
		}
	}
}
