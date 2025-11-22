package capture

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/daniellavrushin/b4/config"
	"github.com/daniellavrushin/b4/log"
)

var (
	instance *Manager
	once     sync.Once
)

type Manager struct {
	mu           sync.RWMutex
	metadata     map[string]map[string]*CaptureMetadata
	outputPath   string
	metadataFile string
	activeProbes map[string]time.Time
}

type CaptureMetadata struct {
	Timestamp time.Time `json:"timestamp"`
	Size      int       `json:"size"`
	Filepath  string    `json:"filepath"`
}

// API response structure
type Capture struct {
	Protocol  string    `json:"protocol"`
	Domain    string    `json:"domain"`
	Timestamp time.Time `json:"timestamp"`
	Size      int       `json:"size"`
	Filepath  string    `json:"filepath"`
	HexData   string    `json:"hex_data"`
}

func GetManager(cfg *config.Config) *Manager {
	once.Do(func() {
		baseDirPath := filepath.Dir(cfg.ConfigPath)
		outputPath := filepath.Join(baseDirPath, "captures")

		instance = &Manager{
			metadata:     make(map[string]map[string]*CaptureMetadata),
			outputPath:   outputPath,
			metadataFile: filepath.Join(outputPath, "payloads.json"),
			activeProbes: make(map[string]time.Time),
		}

		os.MkdirAll(instance.outputPath, 0755)

		instance.loadMetadata()
		go instance.cleanupExpiredProbes()
	})
	return instance
}

func (m *Manager) GetOutputPath() string {
	return m.outputPath
}

func (m *Manager) cleanupExpiredProbes() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		m.mu.Lock()
		now := time.Now()
		for key, expiry := range m.activeProbes {
			if now.After(expiry) {
				delete(m.activeProbes, key)
				log.Tracef("Probe expired for %s", key)
			}
		}
		m.mu.Unlock()
	}
}

func (m *Manager) loadMetadata() {
	data, err := os.ReadFile(m.metadataFile)
	if err != nil {
		if !os.IsNotExist(err) {
			log.Errorf("Failed to read metadata: %v", err)
		}
		return
	}

	if err := json.Unmarshal(data, &m.metadata); err != nil {
		log.Errorf("Failed to parse metadata: %v", err)
	}
}

func (m *Manager) saveMetadata() error {
	if m.metadata == nil {
		m.metadata = make(map[string]map[string]*CaptureMetadata)
	}
	data, err := json.MarshalIndent(m.metadata, "", "  ")
	if err != nil {
		return err
	}
	file, err := os.OpenFile(m.metadataFile, os.O_RDWR|os.O_CREATE|os.O_TRUNC, 0666)
	if err != nil {
		return log.Errorf("failed to create config file: %v", err)
	}
	defer file.Close()

	_, err = file.Write(data)
	if err != nil {
		return log.Errorf("failed to write config file: %v", err)
	}
	return nil
}

// CapturePayload called from nfq when packet matches
func (m *Manager) CapturePayload(domain, protocol string, payload []byte) bool {
	if domain == "" {
		return false
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	// Check if we're actively probing
	var matchedKey string
	now := time.Now()

	exactKey := fmt.Sprintf("%s:%s", protocol, domain)
	if expiry, exists := m.activeProbes[exactKey]; exists && now.Before(expiry) {
		matchedKey = exactKey
	} else {
		// Try flexible matching
		for key, expiry := range m.activeProbes {
			if now.After(expiry) {
				continue
			}
			parts := strings.SplitN(key, ":", 2)
			if len(parts) != 2 {
				continue
			}
			probeProtocol := parts[0]
			probeDomain := parts[1]

			if probeProtocol == protocol &&
				(probeDomain == domain ||
					strings.HasSuffix(domain, probeDomain) ||
					strings.HasSuffix(probeDomain, domain)) {
				matchedKey = key
				break
			}
		}
	}

	if matchedKey == "" {
		return false
	}

	// Check if already captured
	if m.metadata[domain] != nil && m.metadata[domain][protocol] != nil {
		delete(m.activeProbes, matchedKey)
		return false
	}

	// Simple filename: protocol_domain.bin
	filename := fmt.Sprintf("%s_%s.bin", protocol, sanitizeDomain(domain))
	filepath := filepath.Join(m.outputPath, filename)

	// Save binary only
	if err := os.WriteFile(filepath, payload, 0644); err != nil {
		log.Errorf("Failed to save capture: %v", err)
		return false
	}

	// Update metadata
	if m.metadata[domain] == nil {
		m.metadata[domain] = make(map[string]*CaptureMetadata)
	}

	m.metadata[domain][protocol] = &CaptureMetadata{
		Timestamp: time.Now(),
		Size:      len(payload),
		Filepath:  filename,
	}

	// Save metadata to JSON
	if err := m.saveMetadata(); err != nil {
		log.Errorf("Failed to save metadata: %v", err)
	}

	delete(m.activeProbes, matchedKey)
	log.Infof("✓ Captured %s payload for %s (%d bytes)", protocol, domain, len(payload))
	return true
}

// ProbeCapture triggers traffic to capture payload
func (m *Manager) ProbeCapture(domain, protocol string) error {
	key := fmt.Sprintf("%s:%s", protocol, domain)

	m.mu.Lock()
	// Check if already captured
	if m.metadata[domain] != nil && m.metadata[domain][protocol] != nil {
		m.mu.Unlock()
		return fmt.Errorf("already captured")
	}

	m.activeProbes[key] = time.Now().Add(10 * time.Second)
	log.Infof("Enabled capture for %s (expires in 10s)", key)
	m.mu.Unlock()

	url := fmt.Sprintf("https://%s", domain)
	cmd := exec.Command("curl", "-k", "--connect-timeout", "3", "-m", "5", url)
	cmd.Stdout = nil
	cmd.Stderr = nil

	log.Infof("Probing %s to capture %s payload...", domain, protocol)
	go cmd.Run()

	return nil
}

// ListCaptures returns all captured payloads for API
func (m *Manager) ListCaptures() []*Capture {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var captures []*Capture

	for domain, protocols := range m.metadata {
		for protocol, meta := range protocols {
			// Read hex data on demand
			filepath := filepath.Join(m.outputPath, meta.Filepath)
			data, err := os.ReadFile(filepath)
			var hexData string
			if err == nil {
				hexData = hex.EncodeToString(data)
			}

			captures = append(captures, &Capture{
				Protocol:  protocol,
				Domain:    domain,
				Timestamp: meta.Timestamp,
				Size:      meta.Size,
				Filepath:  filepath,
				HexData:   hexData,
			})
		}
	}

	return captures
}

// GetCapture returns specific capture
func (m *Manager) GetCapture(protocol, domain string) (*Capture, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.metadata[domain] == nil || m.metadata[domain][protocol] == nil {
		return nil, false
	}

	meta := m.metadata[domain][protocol]
	filepath := filepath.Join(m.outputPath, meta.Filepath)
	data, err := os.ReadFile(filepath)
	var hexData string
	if err == nil {
		hexData = hex.EncodeToString(data)
	}

	capture := &Capture{
		Protocol:  protocol,
		Domain:    domain,
		Timestamp: meta.Timestamp,
		Size:      meta.Size,
		Filepath:  filepath,
		HexData:   hexData,
	}

	return capture, true
}

// DeleteCapture removes a capture
func (m *Manager) DeleteCapture(protocol, domain string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.metadata[domain] == nil || m.metadata[domain][protocol] == nil {
		return fmt.Errorf("capture not found")
	}

	// Delete file
	meta := m.metadata[domain][protocol]
	filepath := filepath.Join(m.outputPath, meta.Filepath)
	os.Remove(filepath)

	// Update metadata
	delete(m.metadata[domain], protocol)
	if len(m.metadata[domain]) == 0 {
		delete(m.metadata, domain)
	}

	// Save updated metadata
	if err := m.saveMetadata(); err != nil {
		log.Errorf("Failed to save metadata: %v", err)
	}

	log.Infof("Deleted capture for %s:%s", protocol, domain)
	return nil
}

// ClearAll removes all captures
func (m *Manager) ClearAll() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Delete all binary files
	for _, protocols := range m.metadata {
		for _, meta := range protocols {
			filepath := filepath.Join(m.outputPath, meta.Filepath)
			os.Remove(filepath)
		}
	}

	// Clear metadata
	m.metadata = make(map[string]map[string]*CaptureMetadata)

	// Save empty metadata
	if err := m.saveMetadata(); err != nil {
		log.Errorf("Failed to save metadata: %v", err)
	}

	log.Infof("Cleared all captures")
	return nil
}

func sanitizeDomain(domain string) string {
	result := ""
	for _, ch := range domain {
		if (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') ||
			(ch >= '0' && ch <= '9') || ch == '-' {
			result += string(ch)
		} else if ch == '.' {
			result += "_"
		}
	}
	return result
}
