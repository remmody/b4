// path: src/config/config.go
package config

import (
	"fmt"

	"github.com/daniellavrushin/b4/geodat"
	"github.com/spf13/cobra"
)

type Config struct {
	QueueStartNum  int
	Mark           uint
	ConnBytesLimit int
	Logging        Logging
	SNIDomains     []string
	Threads        int
	UseGSO         bool
	UseConntrack   bool
	SkipIpTables   bool
	GeoSitePath    string
	GeoIpPath      string
	GeoCategories  []string

	FakeSNI          bool
	FakeSNISeqLength int
	FakeSNIType      int
}

type Logging struct {
	Level      int
	Instaflush bool
	Syslog     bool
}

const (
	FakePayloadRandom = iota
	FakePayloadCustom
	FakePayloadDefault
)

const (
	InfoLevel = iota
	DebugLevel
	TraceLevel
)

var DefaultConfig = Config{
	QueueStartNum:  537,
	Mark:           1 << 15,
	Threads:        4,
	ConnBytesLimit: 19,
	UseConntrack:   false,
	UseGSO:         false,
	SkipIpTables:   false,
	GeoSitePath:    "",
	GeoIpPath:      "",
	GeoCategories:  []string{},

	FakeSNI:          true,
	FakeSNISeqLength: 1,
	FakeSNIType:      FakePayloadDefault,

	Logging: Logging{
		Level:      InfoLevel,
		Instaflush: true,
		Syslog:     false,
	},
}

func (c *Config) BindFlags(cmd *cobra.Command) {
	// Network configuration
	cmd.Flags().IntVar(&c.QueueStartNum, "queue-num", c.QueueStartNum,
		"Netfilter queue number")
	cmd.Flags().IntVar(&c.Threads, "threads", c.Threads,
		"Number of worker threads")
	cmd.Flags().UintVar(&c.Mark, "mark", c.Mark,
		"Packet mark value")
	cmd.Flags().IntVar(&c.ConnBytesLimit, "connbytes-limit", c.ConnBytesLimit,
		"Connection bytes limit")
	cmd.Flags().StringSliceVar(&c.SNIDomains, "sni-domains", c.SNIDomains,
		"List of SNI domains to match")

	// Geodata and site filtering
	cmd.Flags().StringVar(&c.GeoSitePath, "geosite", c.GeoSitePath, "Path to geosite file (e.g., geosite.dat)")
	cmd.Flags().StringVar(&c.GeoIpPath, "geoip", c.GeoIpPath, "Path to geoip file (e.g., geoip.dat)")
	cmd.Flags().StringSliceVar(&c.GeoCategories, "geo-categories", c.GeoCategories, "Geographic categories to process (e.g., youtube,facebook,amazon)")

	// Feature flags
	cmd.Flags().BoolVar(&c.UseGSO, "gso", c.UseGSO,
		"Enable Generic Segmentation Offload")
	cmd.Flags().BoolVar(&c.UseConntrack, "conntrack", c.UseConntrack,
		"Enable connection tracking")
	cmd.Flags().BoolVar(&c.SkipIpTables, "skip-iptables", c.SkipIpTables,
		"Skip iptables rules setup")

	// Logging configuration
	cmd.Flags().BoolVarP(&c.Logging.Instaflush, "instaflush", "i", c.Logging.Instaflush,
		"Flush logs immediately")
	cmd.Flags().BoolVar(&c.Logging.Syslog, "syslog", c.Logging.Syslog,
		"Enable syslog output")
}

func (c *Config) ApplyVerbosityFlags(verbose, trace bool) {
	if trace {
		c.Logging.Level = TraceLevel
	} else if verbose {
		c.Logging.Level = DebugLevel
	}
}

func (c *Config) Validate() error {
	// If sites are specified, geodata path must be provided
	if len(c.GeoCategories) > 0 && c.GeoSitePath == "" {
		return fmt.Errorf("--geosite must be specified when using --geo-categories")
	}

	if c.Threads < 1 {
		return fmt.Errorf("threads must be at least 1")
	}

	if c.QueueStartNum < 0 || c.QueueStartNum > 65535 {
		return fmt.Errorf("queue-num must be between 0 and 65535")
	}

	return nil
}

func (c *Config) LogString() string {
	return ""
}

// LoadDomainsFromGeodata loads domains from geodata file for specified sites
// and returns them as a slice
func (c *Config) LoadDomainsFromGeodata() ([]string, error) {
	return geodat.LoadDomainsFromSites(c.GeoSitePath, c.GeoCategories)
}
