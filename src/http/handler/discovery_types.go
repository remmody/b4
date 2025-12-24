package handler

type DiscoveryRequest struct {
	CheckURL string `json:"check_url,omitempty"`
}

type DiscoveryResponse struct {
	Id             string `json:"id"`
	Domain         string `json:"domain"`
	CheckURL       string `json:"check_url"`
	EstimatedTests int    `json:"estimated_tests"`
	Message        string `json:"message"`
}
