# B4

![GitHub Release](https://img.shields.io/github/v/release/daniellavrushin/b4)
![GitHub Downloads](https://img.shields.io/github/downloads/daniellavrushin/b4/total)

[[русский язык](readme_ru.md)]

Network packet processor that bypasses Deep Packet Inspection (DPI) using netfilter queue manipulation.

![alt text](image.png)

## Quick Install

> [!NOTE]
> In some systems you need to run `sudo b4install.sh`.

```bash
wget -O ~/b4install.sh https://raw.githubusercontent.com/DanielLavrushin/b4/main/install.sh && chmod +x ~/b4install.sh && ~/b4install.sh
```

If something went wrong try to run it with the flag `--sysinfo` - this will diagnose the system

```bash
wget -O ~/b4install.sh https://raw.githubusercontent.com/DanielLavrushin/b4/main/install.sh && chmod +x ~/b4install.sh && ~/b4install.sh --sysinfo
```

Or pass `--help` to get more information about the possible options.

```bash
wget -O ~/b4install.sh https://raw.githubusercontent.com/DanielLavrushin/b4/main/install.sh && chmod +x ~/b4install.sh && ~/b4install.sh --help
```

## Usage

```bash

# Systemd
sudo systemctl start b4
sudo systemctl enable b4

# OpenWRT
/etc/init.d/b4 restart

# Entware/MerlinWRT
/opt/etc/init.d/S99b4 restart
```

### Web UI

```
http://your-device-ip:7000
```

### Command Line

````bash
# Custom config
b4 --config /path/to/config.json

# Basic - manual domains
b4 --sni-domains youtube.com,netflix.com

# With geosite categories
b4 --geosite /etc/b4/geosite.dat --geosite-categories youtube,netflix

# Print help
b4 --help
``
### Building from Source

```bash
git clone https://github.com/daniellavrushin/b4.git
cd b4

# Build UI
cd src/http/ui
pnpm install && pnpm build
cd ../../..

# Build binary
make build

# All architectures
make build-all

# Or build specific
make linux-amd64
````

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

## Contributing

Contributions are accepted through GitHub pull requests.

## Credits

This project incorporates research and techniques from:

- [youtubeUnblock](https://github.com/Waujito/youtubeUnblock) - C-based DPI bypass
- [GoodbyeDPI](https://github.com/ValdikSS/GoodbyeDPI) - Windows DPI circumvention
- [zapret](https://github.com/bol-van/zapret) - Advanced DPI bypass techniques

## License

This project is provided for educational purposes. Users are responsible for compliance with applicable laws and regulations.
The authors are not responsible for misuse of this software.
