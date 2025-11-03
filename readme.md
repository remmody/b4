# B4

![GitHub Release](https://img.shields.io/github/v/release/daniellavrushin/b4)
![GitHub Downloads](https://img.shields.io/github/downloads/daniellavrushin/b4/total)

Network packet processor for circumventing Deep Packet Inspection (DPI) systems.

![alt text](image.png)

## Overview

B4 uses Linux netfilter to intercept and modify network packets in real-time, applying various techniques to bypass DPI systems used by ISPs and network administrators.

## Prerequisites

- Linux-based system (desktop, server, or router)
- Root access (sudo)

That's it. The installer handles everything else.

## Installation

### Automated Installation

> [!NOTE]
> In some systems you need to run `sudo b4install.sh`.

```bash
wget -O ~/b4install.sh https://raw.githubusercontent.com/DanielLavrushin/b4/main/install.sh && chmod +x ~/b4install.sh && ./b4install.sh
```

If something went wrong try to run - this will diagnose the system

```bash
wget -O ~/b4install.sh https://raw.githubusercontent.com/DanielLavrushin/b4/main/install.sh && chmod +x ~/b4install.sh && ./b4install.sh --sysinfo
```

### Installer Options

```bash

./b4install.sh -h # print help

# Show system information
./b4install.sh --sysinfo

# Install specific version
./b4install.sh v1.10.0

# Quiet mode
./b4install.sh --quiet

# Specify geosite source
./b4install.sh --geosite-src=https://example.com/geosite.dat --geosite-dst=/opt/etc/b4

# Update existing installation
./b4install.sh --update

# Uninstall
./b4install.sh --remove


```

## Basic Usage

### Starting B4

```bash
# Standard Linux (systemd)
sudo systemctl start b4
sudo systemctl enable b4  # Start on boot

# OpenWRT
/etc/init.d/b4 start # restart | stop

# Entware/MerlinWRT
/opt/etc/init.d/S99b4 start # restart | stop
```

### Access Web Interface

Open your browser and navigate to:

```cmd
http://your-device-ip:7000
```

### Building from Source

```bash
# Clone repository
git clone https://github.com/daniellavrushin/b4.git
cd b4

# Build binary
make build

# Build for all architectures
make build-all

# Build for specific architecture
make linux-amd64
make linux-arm64
make linux-armv7
```

## Command-Line Usage

```bash

# get help
b4  --help

# Basic usage with manual domains
sudo b4 --sni-domains youtube.com,netflix.com

# Using geosite categories
sudo b4 --geosite /etc/b4/geosite.dat --geosite-categories youtube,netflix

# Custom configuration
sudo b4 --queue-num 100 --threads 4 --web-port 8080
```

### Configuration File

Create `/etc/b4/b4.json`
(the file can be redefined by passing the `--config=` argument):

```json
{
  "queue_start_num": 537,
  "mark": 32768,
  "threads": 4,
  "conn_bytes_limit": 19,
  "seg2delay": 0,
  "ipv4": true,
  "ipv6": false,

  "domains": {
    "geosite_path": "/etc/b4/geosite.dat",
    "geoip_path": "",
    "sni_domains": [],
    "geosite_categories": ["youtube", "netflix"],
    "geoip_categories": []
  },

  "fragmentation": {
    "strategy": "tcp",
    "sni_reverse": true,
    "middle_sni": true,
    "sni_position": 1
  },

  "faking": {
    "sni": true,
    "ttl": 8,
    "strategy": "pastseq",
    "seq_offset": 10000,
    "sni_seq_length": 1,
    "sni_type": 2,
    "custom_payload": ""
  },

  "udp": {
    "mode": "fake",
    "fake_seq_length": 6,
    "fake_len": 64,
    "faking_strategy": "none",
    "dport_min": 0,
    "dport_max": 0,
    "filter_quic": "parse",
    "filter_stun": true,
    "conn_bytes_limit": 8
  },

  "web_server": {
    "port": 7000
  },

  "logging": {
    "level": "info",
    "instaflush": true,
    "syslog": false
  },

  "tables": {
    "monitor_interval": 10,
    "skip_setup": false
  }
}
```

Load with custom configuration:

```bash
sudo b4 --config /home/username/b4custom.json
```

### Configuration Options

#### Network Configuration

| Flag                | Default | Description                 |
| ------------------- | ------- | --------------------------- |
| `--queue-num`       | 537     | Netfilter queue number      |
| `--threads`         | 4       | Number of worker threads    |
| `--mark`            | 32768   | Packet mark value           |
| `--connbytes-limit` | 19      | TCP connection bytes limit  |
| `--seg2delay`       | 0       | Delay between segments (ms) |
| `--ipv4`            | true    | Enable IPv4 processing      |
| `--ipv6`            | false   | Enable IPv6 processing      |

#### Domain Filtering

| Flag                   | Default | Description                     |
| ---------------------- | ------- | ------------------------------- |
| `--sni-domains`        | []      | Comma-separated list of domains |
| `--geosite`            | ""      | Path to geosite.dat file        |
| `--geosite-categories` | []      | Categories to process           |
| `--geoip`              | ""      | Path to geoip.dat file          |
| `--geoip-categories`   | []      | IP categories to process        |

#### TCP Fragmentation

| Flag                 | Default | Description                         |
| -------------------- | ------- | ----------------------------------- |
| `--frag`             | tcp     | Fragmentation strategy: tcp/ip/none |
| `--frag-sni-reverse` | true    | Reverse fragment order              |
| `--frag-middle-sni`  | true    | Fragment in middle of SNI           |
| `--frag-sni-pos`     | 1       | SNI fragment position               |

#### Fake SNI Configuration

| Flag                | Default | Description                                    |
| ------------------- | ------- | ---------------------------------------------- |
| `--fake-sni`        | true    | Enable fake SNI packets                        |
| `--fake-ttl`        | 8       | TTL for fake packets                           |
| `--fake-strategy`   | pastseq | Strategy: ttl/randseq/pastseq/tcp_check/md5sum |
| `--fake-seq-offset` | 10000   | Sequence offset for fake packets               |
| `--fake-sni-len`    | 1       | Length of fake SNI sequence                    |
| `--fake-sni-type`   | 2       | Payload type: 0=random, 1=custom, 2=default    |

#### UDP/QUIC Configuration

| Flag                     | Default | Description                        |
| ------------------------ | ------- | ---------------------------------- |
| `--udp-mode`             | fake    | UDP handling: drop/fake            |
| `--udp-fake-seq-len`     | 6       | UDP fake packet sequence length    |
| `--udp-fake-len`         | 64      | UDP fake packet size (bytes)       |
| `--udp-faking-strategy`  | none    | Strategy: none/ttl/checksum        |
| `--udp-dport-min`        | 0       | Minimum UDP destination port       |
| `--udp-dport-max`        | 0       | Maximum UDP destination port       |
| `--udp-filter-quic`      | parse   | QUIC filtering: disabled/all/parse |
| `--udp-filter-stun`      | true    | Enable STUN filtering              |
| `--udp-conn-bytes-limit` | 8       | UDP connection bytes limit         |

#### System Configuration

| Flag                        | Default | Description                                   |
| --------------------------- | ------- | --------------------------------------------- |
| `--skip-tables`             | false   | Skip iptables/nftables setup                  |
| `--tables-monitor-interval` | 10      | Tables monitor interval (seconds, 0=disabled) |
| `--web-port`                | 7000    | Web interface port (0=disabled)               |
| `--verbose`                 | info    | Log level: debug/trace/info/error/silent      |
| `--instaflush`              | true    | Flush logs immediately                        |
| `--syslog`                  | false   | Enable syslog output                          |

## Web Interface

The web interface is accessible at `http://device-ip:7000` (default port, can be changed in the `config` file).

**Features:**

- Real-time metrics (connections, packets, bandwidth)
- Live log streaming with filtering
- Connection history with protocol and SNI information
- Domain management (add/remove domains on-the-fly)
- Configuration management
- System health monitoring

## Geosite Integration

B4 supports [v2ray/xray `geosite.dat`](https://github.com/v2fly/domain-list-community) files from various sources:

```bash
# Loyalsoldier
wget https://github.com/Loyalsoldier/v2ray-rules-dat/releases/latest/download/geosite.dat

# RUNET Freedom
wget https://raw.githubusercontent.com/runetfreedom/russia-v2ray-rules-dat/release/geosite.dat

# Nidelon
wget https://github.com/Nidelon/ru-block-v2ray-rules/releases/latest/download/geosite.dat
```

Place the file in `/etc/b4/geosite.dat` and configure categories:

```bash
sudo b4 --geosite /etc/b4/geosite.dat --geosite-categories youtube,netflix,facebook
```

> [!TIP]
> All these settings can be configured via the web interface.

## Building and Development

### Build Requirements

- Go 1.25 or later
- Node.js 22+ and pnpm (for web UI)
- Make

### Build Commands

```bash
# Build for current platform
make build

# Build for all platforms
make build-all

# Build for specific platform
make linux-amd64
make linux-arm64
make linux-armv7

# Clean build artifacts
make clean

# Run with sudo (development)
make run

# Install to /usr/local/bin
make install
```

## Contributing

Contributions are accepted through GitHub pull requests.

### Development Setup

```bash
# Clone repository
git clone https://github.com/daniellavrushin/b4.git
cd b4

# Install dependencies
cd ui && pnpm install

# Build and run
make build
sudo ./out/b4 --verbose debug
```

## Credits

This project incorporates research and techniques from:

- [youtubeUnblock](https://github.com/Waujito/youtubeUnblock) - C-based DPI bypass
- [GoodbyeDPI](https://github.com/ValdikSS/GoodbyeDPI) - Windows DPI circumvention
- [zapret](https://github.com/bol-van/zapret) - Advanced DPI bypass techniques

## License

This project is provided for educational purposes. Users are responsible for compliance with applicable laws and regulations.

**Use Cases:**

- Bypassing internet censorship in restricted regions
- Protecting privacy from network surveillance
- Research and education on network protocols

**Not Intended For:**

- Illegal activities
- Unauthorized network access
- Violation of terms of service

The authors are not responsible for misuse of this software.
