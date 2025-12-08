package nfq

import (
	"net"

	"github.com/daniellavrushin/b4/dns"
	"github.com/daniellavrushin/b4/log"
	"github.com/daniellavrushin/b4/sock"
	"github.com/florianl/go-nfqueue"
)

func (w *Worker) processDnsPacket(sport uint16, dport uint16, payload []byte, raw []byte, ihl int, id uint32) int {

	if dport == 53 {
		domain, ok := dns.ParseQueryDomain(payload)
		if ok {
			matcher := w.getMatcher()
			if matchedSet, set := matcher.MatchSNI(domain); matchedSet && set.DNS.Enabled && set.DNS.TargetDNS != "" {
				targetDNS := net.ParseIP(set.DNS.TargetDNS).To4()
				originalDst := make(net.IP, 4)
				copy(originalDst, raw[16:20])
				if targetDNS != nil {
					// Save NAT mapping for response rewrite
					dns.DnsNATSet(net.IP(raw[12:16]), sport, originalDst)

					copy(raw[16:20], targetDNS)
					sock.FixIPv4Checksum(raw[:ihl])
					sock.FixUDPChecksum(raw, ihl) // Also fix UDP checksum!
					_ = w.sock.SendIPv4(raw, targetDNS)
					_ = w.q.SetVerdict(id, nfqueue.NfDrop)
					log.Infof("DNS redirect: %s -> %s (set: %s)", domain, set.DNS.TargetDNS, set.Name)
					return 0
				}
			}
		}
	}

	if sport == 53 {
		// Check if this is a response to a redirected query
		if originalDst, ok := dns.DnsNATGet(net.IP(raw[16:20]), dport); ok {

			// Rewrite source IP back to original destination
			copy(raw[12:16], originalDst.To4())
			sock.FixIPv4Checksum(raw[:ihl])
			sock.FixUDPChecksum(raw, ihl)

			// Delete NAT entry
			dns.DnsNATDelete(net.IP(raw[16:20]), dport)

			// Send modified packet
			_ = w.sock.SendIPv4(raw, net.IP(raw[16:20]))
			_ = w.q.SetVerdict(id, nfqueue.NfDrop)
			return 0
		}

	}

	_ = w.q.SetVerdict(id, nfqueue.NfAccept)
	return 0
}
