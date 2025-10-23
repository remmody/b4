package handler

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/daniellavrushin/b4/config"
	"github.com/daniellavrushin/b4/log"
	"github.com/daniellavrushin/b4/metrics"
)

func RegisterConfigApi(mux *http.ServeMux, cfg *config.Config) {
	api := &API{cfg: cfg}
	mux.HandleFunc("/api/config", api.handleConfig)
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
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	enc := json.NewEncoder(w)
	_ = enc.Encode(a.cfg)
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

	geositeChanged := needsGeositeReload(a.cfg, &newConfig)

	manualSNIDomains := make([]string, len(newConfig.Domains.SNIDomains))
	copy(manualSNIDomains, newConfig.Domains.SNIDomains)

	if newConfig.Domains.GeoSitePath != "" && len(newConfig.Domains.GeoSiteCategories) > 0 {
		log.Infof("Loading domains from geodata for categories: %v", newConfig.Domains.GeoSiteCategories)
		domains, err := newConfig.LoadDomainsFromGeodata()
		if err != nil {
			log.Errorf("Failed to load geodata: %v", err)
			m := metrics.GetMetricsCollector()
			m.RecordEvent("error", fmt.Sprintf("Failed to load geodata: %v", err))
			http.Error(w, fmt.Sprintf("Failed to load geodata: %v", err), http.StatusBadRequest)
			return
		}
		log.Infof("Loaded %d domains from geodata", len(domains))

		newConfig.Domains.SNIDomains = mergeDomains(manualSNIDomains, domains)

		m := metrics.GetMetricsCollector()
		m.RecordEvent("info", fmt.Sprintf("Loaded %d domains from geodata, total %d domains", len(domains), len(newConfig.Domains.SNIDomains)))
	}

	if len(newConfig.Domains.SNIDomains) > 0 {
		log.Infof("Total SNI domains to match: %d", len(newConfig.Domains.SNIDomains))
	}

	*a.cfg = newConfig

	if globalPool != nil {
		globalPool.UpdateConfig(&newConfig)
		log.Infof("Config pushed to all workers (geosite reload: %v)", geositeChanged)
	}

	log.Infof("Configuration updated via API (geosite changed: %v)", geositeChanged)
	m := metrics.GetMetricsCollector()
	m.RecordEvent("info", "Configuration updated")

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	enc := json.NewEncoder(w)
	_ = enc.Encode(map[string]interface{}{
		"success":       true,
		"message":       "Configuration updated successfully",
		"domains_count": len(newConfig.Domains.SNIDomains),
	})
}

func needsGeositeReload(oldCfg, newCfg *config.Config) bool {
	if oldCfg.Domains.GeoSitePath != newCfg.Domains.GeoSitePath {
		return true
	}

	if !equalStringSlices(oldCfg.Domains.GeoSiteCategories, newCfg.Domains.GeoSiteCategories) {
		return true
	}

	return false
}

func equalStringSlices(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func mergeDomains(manual, geodata []string) []string {
	seen := make(map[string]bool)
	result := make([]string, 0, len(manual)+len(geodata))

	for _, domain := range manual {
		if !seen[domain] {
			seen[domain] = true
			result = append(result, domain)
		}
	}

	for _, domain := range geodata {
		if !seen[domain] {
			seen[domain] = true
			result = append(result, domain)
		}
	}

	return result
}
