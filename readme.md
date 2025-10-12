build local:

```bash
make build_local linux arm64 ~/router/opt/share/b4
```

watch iptables:

```bash
watch -n1 'cat /proc/net/netfilter/nfnetlink_queue; iptables -t mangle -vnL'
```
