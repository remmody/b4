package dhcp

import (
	"context"
	"strings"
	"sync"
	"time"

	"github.com/daniellavrushin/b4/log"
)

type Manager struct {
	source    LeaseSource
	ipToMAC   map[string]string
	macToIP   map[string]string
	hostnames map[string]string // MAC → hostname
	mu        sync.RWMutex
	callbacks []LeaseUpdateCallback
	ctx       context.Context
	cancel    context.CancelFunc
	refreshCh chan struct{}
}

type DetectionResult struct {
	Available bool
	Source    string
	Path      string
}

func Detect() DetectionResult {
	for _, src := range AllSources {
		if src.Detect() {
			if leases, err := src.Parse(); err == nil && len(leases) > 0 {
				log.Infof("DHCP Server: detected %s at %s", src.Name(), src.Path())
				return DetectionResult{
					Available: true,
					Source:    src.Name(),
					Path:      src.Path(),
				}
			}
		}
	}
	return DetectionResult{Available: false}
}

func NewManager() *Manager {
	ctx, cancel := context.WithCancel(context.Background())

	m := &Manager{
		ipToMAC:   make(map[string]string),
		macToIP:   make(map[string]string),
		hostnames: make(map[string]string),
		ctx:       ctx,
		cancel:    cancel,
		refreshCh: make(chan struct{}, 1),
	}

	m.detectSource()
	return m
}

func (m *Manager) detectSource() {
	for _, src := range AllSources {
		if src.Detect() {
			if leases, err := src.Parse(); err == nil && len(leases) > 0 {
				m.source = src
				log.Infof("DHCP: detected %s at %s", src.Name(), src.Path())
				return
			}
		}
	}
	log.Tracef("DHCP: no lease source detected")
}

func (m *Manager) Start() {
	if m.source == nil {
		return
	}

	m.refresh()

	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-m.ctx.Done():
				return
			case <-ticker.C:
				m.refresh()
			case <-m.refreshCh:
				m.refresh()
			}
		}
	}()

	log.Infof("DHCP manager started (source: %s)", m.source.Name())
}

func (m *Manager) Stop() {
	m.cancel()
}

func (m *Manager) refresh() {
	if m.source == nil {
		return
	}

	leases, err := m.source.Parse()
	if err != nil {
		log.Tracef("DHCP: parse error: %v", err)
		return
	}

	if len(leases) == 0 {
		log.Tracef("DHCP: no leases found")
		return
	}

	m.mu.Lock()
	m.ipToMAC = make(map[string]string)
	m.macToIP = make(map[string]string)
	m.hostnames = make(map[string]string)

	for _, lease := range leases {
		mac := normalizeMAC(lease.MAC)
		m.ipToMAC[lease.IP] = mac
		m.macToIP[mac] = lease.IP
		if lease.Hostname != "" {
			m.hostnames[mac] = lease.Hostname
		}
		log.Tracef("DHCP: %s -> %s (%s)", lease.IP, mac, lease.Hostname)
	}
	count := len(m.ipToMAC)
	m.mu.Unlock()

	log.Infof("DHCP: loaded %d leases", count)
	m.notifyCallbacks()
}
func (m *Manager) TriggerRefresh() {
	select {
	case m.refreshCh <- struct{}{}:
	default:
	}
}

func (m *Manager) OnUpdate(cb LeaseUpdateCallback) {
	m.callbacks = append(m.callbacks, cb)
}

func (m *Manager) notifyCallbacks() {
	m.mu.RLock()
	snapshot := make(map[string]string, len(m.ipToMAC))
	for k, v := range m.ipToMAC {
		snapshot[k] = v
	}
	m.mu.RUnlock()

	for _, cb := range m.callbacks {
		cb(snapshot)
	}
}

func (m *Manager) GetMACForIP(ip string) string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.ipToMAC[ip]
}

func (m *Manager) GetIPForMAC(mac string) string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	normalized := normalizeMAC(mac)
	return m.macToIP[normalized]
}

func (m *Manager) GetAllMappings() map[string]string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	result := make(map[string]string, len(m.ipToMAC))
	for k, v := range m.ipToMAC {
		result[k] = v
	}
	return result
}

func (m *Manager) IsAvailable() bool {
	return m.source != nil
}

func (m *Manager) SourceInfo() (name, path string) {
	if m.source == nil {
		return "", ""
	}
	return m.source.Name(), m.source.Path()
}

func (m *Manager) GetHostnameForMAC(mac string) string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.hostnames[normalizeMAC(mac)]
}

func (m *Manager) GetAllHostnames() map[string]string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	result := make(map[string]string, len(m.hostnames))
	for k, v := range m.hostnames {
		result[k] = v
	}
	return result
}

func normalizeMAC(mac string) string {
	mac = strings.ToUpper(mac)
	mac = strings.ReplaceAll(mac, "-", ":")
	return mac
}
