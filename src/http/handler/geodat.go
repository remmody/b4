package handler

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/daniellavrushin/b4/log"
)

type GeodatDownloadRequest struct {
	GeositeURL      string `json:"geosite_url"`
	GeoipURL        string `json:"geoip_url"`
	DestinationPath string `json:"destination_path"`
}

type GeodatDownloadResponse struct {
	Success     bool   `json:"success"`
	Message     string `json:"message"`
	GeositePath string `json:"geosite_path"`
	GeoipPath   string `json:"geoip_path"`
	GeositeSize int64  `json:"geosite_size"`
	GeoipSize   int64  `json:"geoip_size"`
}

type GeodatSource struct {
	Name       string `json:"name"`
	GeositeURL string `json:"geosite_url"`
	GeoipURL   string `json:"geoip_url"`
}

func (api *API) RegisterGeodatApi() {
	api.mux.HandleFunc("/api/geodat/download", api.handleGeodatDownload)
	api.mux.HandleFunc("/api/geodat/sources", api.handleGeodatSources)
	api.mux.HandleFunc("/api/geodat/info", api.handleFileInfo)
}

//go:embed geodat.json
var geodatJSON []byte

var (
	geodatSources []GeodatSource
	geodatOnce    sync.Once
)

func loadGeodatSources() {
	geodatOnce.Do(func() {
		if err := json.Unmarshal(geodatJSON, &geodatSources); err != nil {
			log.Errorf("Failed to parse embedded geodat.json: %v", err)
			geodatSources = []GeodatSource{}
		}
	})
}

func (api *API) handleGeodatSources(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	loadGeodatSources()
	setJsonHeader(w)
	json.NewEncoder(w).Encode(geodatSources)
}

func (api *API) handleGeodatDownload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req GeodatDownloadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.DestinationPath == "" {
		http.Error(w, "Destination path required", http.StatusBadRequest)
		return
	}
	if req.GeositeURL == "" && req.GeoipURL == "" {
		http.Error(w, "At least one of geosite_url or geoip_url is required", http.StatusBadRequest)
		return
	}

	if err := os.MkdirAll(req.DestinationPath, 0755); err != nil {
		log.Errorf("Failed to create directory: %v", err)
		http.Error(w, fmt.Sprintf("Failed to create directory: %v", err), http.StatusInternalServerError)
		return
	}

	var geositeSize, geoipSize int64

	if req.GeositeURL != "" {
		geositePath := filepath.Join(req.DestinationPath, "geosite.dat")
		var err error
		geositeSize, err = downloadFile(req.GeositeURL, geositePath)
		if err != nil {
			log.Errorf("Failed to download geosite.dat: %v", err)
			http.Error(w, fmt.Sprintf("Failed to download geosite.dat: %v", err), http.StatusInternalServerError)
			return
		}
		api.cfg.System.Geo.GeoSitePath = geositePath
		api.cfg.System.Geo.GeoSiteURL = req.GeositeURL
	}

	if req.GeoipURL != "" {
		geoipPath := filepath.Join(req.DestinationPath, "geoip.dat")
		var err error
		geoipSize, err = downloadFile(req.GeoipURL, geoipPath)
		if err != nil {
			log.Errorf("Failed to download geoip.dat: %v", err)
			http.Error(w, fmt.Sprintf("Failed to download geoip.dat: %v", err), http.StatusInternalServerError)
			return
		}
		api.cfg.System.Geo.GeoIpPath = geoipPath
		api.cfg.System.Geo.GeoIpURL = req.GeoipURL
	}

	if err := api.saveAndPushConfig(api.cfg); err != nil {
		log.Errorf("Failed to save config: %v", err)
		http.Error(w, "Failed to save configuration", http.StatusInternalServerError)
		return
	}

	api.geodataManager.UpdatePaths(api.cfg.System.Geo.GeoSitePath, api.cfg.System.Geo.GeoIpPath)
	api.geodataManager.ClearCache()

	for _, set := range api.cfg.Sets {
		log.Infof("Reloading geo targets for set: %s", set.Name)
		api.loadTargetsForSetCached(set)
	}

	parts := []string{}
	if req.GeositeURL != "" {
		parts = append(parts, fmt.Sprintf("geosite.dat (%d bytes)", geositeSize))
	}
	if req.GeoipURL != "" {
		parts = append(parts, fmt.Sprintf("geoip.dat (%d bytes)", geoipSize))
	}
	log.Infof("Downloaded geodat files: %s", strings.Join(parts, ", "))

	response := GeodatDownloadResponse{
		Success:     true,
		Message:     "Downloaded: " + strings.Join(parts, ", "),
		GeositePath: api.cfg.System.Geo.GeoSitePath,
		GeoipPath:   api.cfg.System.Geo.GeoIpPath,
		GeositeSize: geositeSize,
		GeoipSize:   geoipSize,
	}

	setJsonHeader(w)
	json.NewEncoder(w).Encode(response)
}

func downloadFile(url, filepath string) (int64, error) {
	resp, err := http.Get(url)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("bad status: %s", resp.Status)
	}

	out, err := os.Create(filepath)
	if err != nil {
		return 0, err
	}
	defer out.Close()

	size, err := io.Copy(out, resp.Body)
	return size, err
}

func (api *API) handleFileInfo(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	path := r.URL.Query().Get("path")
	if path == "" {
		http.Error(w, "Path parameter required", http.StatusBadRequest)
		return
	}

	info, err := os.Stat(path)
	if err != nil {
		if os.IsNotExist(err) {
			setJsonHeader(w)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"exists": false,
			})
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	setJsonHeader(w)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"exists":        true,
		"size":          info.Size(),
		"last_modified": info.ModTime().Format(time.RFC3339),
	})
}
