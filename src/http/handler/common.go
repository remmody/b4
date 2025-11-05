package handler

import (
	"encoding/json"
	"net/http"

	"github.com/daniellavrushin/b4/config"
	"github.com/daniellavrushin/b4/geodat"
	"github.com/daniellavrushin/b4/log"
	"github.com/daniellavrushin/b4/nfq"
)

// These variables are set at build time via ldflags
var (
	Version = "dev"
	Commit  = "unknown"
	Date    = "unknown"
)

var (
	globalPool *nfq.Pool
)

func setJsonHeader(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
}

func SetNFQPool(pool *nfq.Pool) {
	globalPool = pool
}

func NewAPIHandler(cfg *config.Config) *API {
	// Initialize geodata manager
	geodataManager := geodat.NewGeodataManager(cfg.Domains.GeoSitePath, cfg.Domains.GeoIpPath)

	// Preload categories if configured
	if cfg.Domains.GeoSitePath != "" && len(cfg.Domains.GeoSiteCategories) > 0 {
		_, err := geodataManager.PreloadCategories(cfg.Domains.GeoSiteCategories)
		if err != nil {
			log.Errorf("Failed to preload categories: %v", err)
		}
	}

	return &API{
		cfg:            cfg,
		manualDomains:  append([]string{}, cfg.Domains.SNIDomains...), // Copy manual domains
		geodataManager: geodataManager,
	}
}
func (api *API) RegisterEndpoints(mux *http.ServeMux, cfg *config.Config) {

	api.cfg = cfg
	api.mux = mux

	api.geodataManager.UpdatePaths(cfg.Domains.GeoSitePath, cfg.Domains.GeoIpPath)

	api.RegisterConfigApi()
	api.RegisterMetricsApi()
	api.RegisterGeositeApi()
	api.RegisterSystemApi()
	api.RegisterCheckApi()
}

func sendResponse(w http.ResponseWriter, response interface{}) {
	setJsonHeader(w)
	json.NewEncoder(w).Encode(response)
	if f, ok := w.(http.Flusher); ok {
		f.Flush()
	}
}
