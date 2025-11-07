// src/http/handler/config.go
package handler

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/daniellavrushin/b4/config"
	"github.com/daniellavrushin/b4/log"
	"github.com/daniellavrushin/b4/metrics"
)

func (api *API) RegisterConfigApi() {

	if len(api.cfg.Domains.SNIDomains) > 0 {
		api.manualDomains = make([]string, len(api.cfg.Domains.SNIDomains))
		copy(api.manualDomains, api.cfg.Domains.SNIDomains)
	}

	api.mux.HandleFunc("/api/config", api.handleConfig)
	api.mux.HandleFunc("/api/config/reset", api.resetConfig)
}

func (a *API) handleConfig(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		a.getConfig(w)
	case http.MethodPut:
		a.updateConfig(w, r)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (a *API) getConfig(w http.ResponseWriter) {
	setJsonHeader(w)

	categoryBreakdown := make(map[string]int)
	totalGeositeDomains := 0

	if len(a.cfg.Domains.GeoSiteCategories) > 0 {

		counts, _ := a.geodataManager.GetCategoryCounts(a.cfg.Domains.GeoSiteCategories)
		categoryBreakdown = counts
		for _, count := range categoryBreakdown {
			totalGeositeDomains += count
		}
	}

	// Calculate unique total domains
	uniqueDomains := make(map[string]struct{})
	for _, d := range a.manualDomains {
		uniqueDomains[d] = struct{}{}
	}
	// Need to actually load geosite domains to count unique
	if a.cfg.Domains.GeoSitePath != "" && len(a.cfg.Domains.GeoSiteCategories) > 0 {
		geositeDomains, _, _ := a.geodataManager.LoadCategories(a.cfg.Domains.GeoSiteCategories)
		for _, d := range geositeDomains {
			uniqueDomains[d] = struct{}{}
		}
	}

	response := ConfigResponse{
		Config: a.cfg,
		DomainStats: DomainStatistics{
			ManualDomains:     len(a.manualDomains),
			GeositeDomains:    totalGeositeDomains,
			TotalDomains:      len(uniqueDomains),
			GeositeAvailable:  a.geodataManager.IsConfigured(),
			CategoryBreakdown: categoryBreakdown,
		},
	}

	configCopy := *a.cfg
	configCopy.Domains.SNIDomains = a.manualDomains
	response.Config = &configCopy

	enc := json.NewEncoder(w)
	_ = enc.Encode(response)
}

func (a *API) updateConfig(w http.ResponseWriter, r *http.Request) {
	var newConfig config.Config

	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&newConfig); err != nil {
		log.Errorf("Failed to decode config update: %v", err)
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if err := newConfig.Validate(); err != nil {
		log.Errorf("Invalid configuration: %v", err)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	a.manualDomains = make([]string, len(newConfig.Domains.SNIDomains))
	copy(a.manualDomains, newConfig.Domains.SNIDomains)
	log.Infof("Updated manual domains: %d", len(a.manualDomains))

	a.geodataManager.UpdatePaths(newConfig.Domains.GeoSitePath, newConfig.Domains.GeoIpPath)

	var categoryStats map[string]int

	if newConfig.Domains.GeoSitePath != "" && len(newConfig.Domains.GeoSiteCategories) > 0 {
		log.Infof("Loading domains from geodata for categories: %v", newConfig.Domains.GeoSiteCategories)

		var allGeositeDomains []string
		var err error
		allGeositeDomains, categoryStats, err = a.geodataManager.LoadCategories(newConfig.Domains.GeoSiteCategories)
		if err != nil {
			log.Errorf("Failed to load geosite categories: %v", err)
			http.Error(w, fmt.Sprintf("Failed to load geodata: %v", err), http.StatusInternalServerError)
			return
		}

		log.Infof("Loaded %d total geosite domains from %d categories", len(allGeositeDomains), len(categoryStats))
		for category, count := range categoryStats {
			log.Infof("  - %s: %d domains", category, count)
		}

		m := metrics.GetMetricsCollector()
		m.RecordEvent("info", fmt.Sprintf("Loaded %d domains from geodata across %d categories",
			len(allGeositeDomains), len(newConfig.Domains.GeoSiteCategories)))
	} else if len(newConfig.Domains.GeoSiteCategories) == 0 {
		a.geodataManager.ClearCache()
		categoryStats = make(map[string]int)
		log.Infof("Cleared all geosite domains")
	}

	newConfig.Domains.SNIDomains = a.manualDomains

	a.updateMainConfig(&newConfig)

	stats := a.applyDomainChanges()

	response := map[string]interface{}{
		"success": true,
		"message": "Configuration updated successfully",
		"domain_stats": DomainStatistics{
			ManualDomains:     stats.ManualDomains,
			GeositeDomains:    stats.GeositeDomains,
			TotalDomains:      stats.TotalDomains,
			CategoryBreakdown: categoryStats,
		},
	}

	setJsonHeader(w)
	w.WriteHeader(http.StatusOK)
	enc := json.NewEncoder(w)
	_ = enc.Encode(response)
}

func (a *API) resetConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	log.Infof("Config reset requested")

	defaultCfg := config.DefaultConfig
	defaultCfg.Domains = a.cfg.Domains
	defaultCfg.System.Checker = a.cfg.System.Checker
	defaultCfg.ConfigPath = a.cfg.ConfigPath
	defaultCfg.System.WebServer.IsEnabled = a.cfg.System.WebServer.IsEnabled

	a.updateMainConfig(&defaultCfg)

	a.applyDomainChanges()

	setJsonHeader(w)
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Configuration reset to defaults (domains and checker preserved)",
	})
}

func (a *API) updateMainConfig(newCfg *config.Config) {
	newCfg.ConfigPath = a.cfg.ConfigPath
	newCfg.System.WebServer.IsEnabled = a.cfg.System.WebServer.IsEnabled
	a.cfg = newCfg
}

type domainStats struct {
	ManualDomains  int
	GeositeDomains int
	TotalDomains   int
}

func (a *API) applyDomainChanges() domainStats {
	var allGeositeDomains []string
	if a.cfg.Domains.GeoSitePath != "" && len(a.cfg.Domains.GeoSiteCategories) > 0 {
		var err error
		allGeositeDomains, _, err = a.geodataManager.LoadCategories(a.cfg.Domains.GeoSiteCategories)
		if err != nil {
			log.Errorf("Failed to load geosite domains: %v", err)
		}
	}

	allDomainsForMatcher := make([]string, 0, len(a.manualDomains)+len(allGeositeDomains))
	allDomainsForMatcher = append(allDomainsForMatcher, a.manualDomains...)
	allDomainsForMatcher = append(allDomainsForMatcher, allGeositeDomains...)

	// Calculate unique domains
	totalDomainsSet := make(map[string]struct{})
	manualDomainsSet := make(map[string]struct{})
	geositeDomainsSet := make(map[string]struct{})

	for _, d := range a.manualDomains {
		manualDomainsSet[d] = struct{}{}
		totalDomainsSet[d] = struct{}{}
	}

	for _, d := range allGeositeDomains {
		geositeDomainsSet[d] = struct{}{}
		totalDomainsSet[d] = struct{}{}
	}

	if globalPool != nil {
		globalPool.UpdateConfig(a.cfg, allDomainsForMatcher)
		log.Infof("Config pushed to all workers (manual: %d, geosite: %d, total unique: %d domains)",
			len(manualDomainsSet), len(geositeDomainsSet), len(totalDomainsSet))
	}

	if a.cfg.ConfigPath != "" {
		if err := a.cfg.SaveToFile(a.cfg.ConfigPath); err != nil {
			log.Errorf("Failed to save config: %v", err)
		} else {
			log.Infof("Config saved to %s", a.cfg.ConfigPath)
		}
	}

	return domainStats{
		ManualDomains:  len(manualDomainsSet),
		GeositeDomains: len(geositeDomainsSet),
		TotalDomains:   len(totalDomainsSet),
	}
}
