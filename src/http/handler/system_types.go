package handler

type VersionInfo struct {
	Version   string `json:"version"`
	Commit    string `json:"commit"`
	BuildDate string `json:"build_date"`
}

type RestartResponse struct {
	Success        bool   `json:"success"`
	Message        string `json:"message"`
	ServiceManager string `json:"service_manager"`
	RestartCommand string `json:"restart_command,omitempty"`
}

type SystemInfo struct {
	ServiceManager string `json:"service_manager"`
	OS             string `json:"os"`
	Arch           string `json:"arch"`
	CanRestart     bool   `json:"can_restart"`
	IsDocker       bool   `json:"is_docker"`
}

type UpdateRequest struct {
	Version string `json:"version,omitempty"`
}

type UpdateResponse struct {
	Success        bool   `json:"success"`
	Message        string `json:"message"`
	ServiceManager string `json:"service_manager"`
	UpdateCommand  string `json:"update_command,omitempty"`
}
