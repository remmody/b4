// src/http/handler/geosite.go
package handler

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/daniellavrushin/b4/geodat"
	"github.com/daniellavrushin/b4/log"
)

func (api *API) RegisterGeositeApi() {
	api.mux.HandleFunc("/api/geosite", api.handleGeoSite)
	api.mux.HandleFunc("/api/geosite/category", api.previewGeoCategory)
	api.mux.HandleFunc("/api/geosite/domain", api.addGeositeDomain)
}

func (a *API) handleGeoSite(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		a.getGeositeTags(w)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (a *API) addGeositeDomain(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req AddDomainRequest
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&req); err != nil {
		log.Errorf("Failed to decode add domain request: %v", err)
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if req.Domain == "" {
		http.Error(w, "Domain cannot be empty", http.StatusBadRequest)
		return
	}

	for _, existingDomain := range a.manualDomains {
		if existingDomain == req.Domain {
			response := AddDomainResponse{
				Success:      false,
				Message:      fmt.Sprintf("Domain '%s' already exists in manual domains", req.Domain),
				Domain:       req.Domain,
				TotalDomains: len(a.manualDomains),
			}
			setJsonHeader(w)
			w.WriteHeader(http.StatusConflict)
			json.NewEncoder(w).Encode(response)
			return
		}
	}

	a.manualDomains = append(a.manualDomains, req.Domain)
	log.Infof("Added domain '%s' to manual domains list", req.Domain)

	a.cfg.Domains.SNIDomains = make([]string, len(a.manualDomains))
	copy(a.cfg.Domains.SNIDomains, a.manualDomains)

	stats := a.applyDomainChanges()

	response := AddDomainResponse{
		Success:       true,
		Message:       fmt.Sprintf("Successfully added domain '%s'", req.Domain),
		Domain:        req.Domain,
		TotalDomains:  stats.TotalDomains,
		ManualDomains: a.manualDomains,
	}

	setJsonHeader(w)
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (a *API) getGeositeTags(w http.ResponseWriter) {
	setJsonHeader(w)
	enc := json.NewEncoder(w)

	if !a.geodataManager.IsConfigured() {
		log.Tracef("Geosite path is not configured")
		_ = enc.Encode(GeositeResponse{Tags: []string{}})
		return
	}

	tags, err := geodat.ListGeoSiteTags(a.geodataManager.GetGeositePath())
	if err != nil {
		http.Error(w, "Failed to load geosite tags: "+err.Error(), http.StatusInternalServerError)
		return
	}

	response := GeositeResponse{
		Tags: tags,
	}

	_ = enc.Encode(response)
}

func (a *API) previewGeoCategory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	category := r.URL.Query().Get("tag")
	if category == "" {
		http.Error(w, "Tag category parameter required", http.StatusBadRequest)
		return
	}

	if !a.geodataManager.IsConfigured() {
		http.Error(w, "Geosite path not configured", http.StatusBadRequest)
		return
	}

	domains, err := a.geodataManager.LoadCategory(category)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to load category: %v", err), http.StatusInternalServerError)
		return
	}

	previewLimit := 100
	preview := domains
	if len(domains) > previewLimit {
		preview = domains[:previewLimit]
	}

	response := map[string]interface{}{
		"category":      category,
		"total_domains": len(domains),
		"preview_count": len(preview),
		"preview":       preview,
	}

	setJsonHeader(w)
	enc := json.NewEncoder(w)
	_ = enc.Encode(response)
}
