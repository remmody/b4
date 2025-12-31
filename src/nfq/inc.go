package nfq

import (
	"encoding/binary"
	"net"
	"time"

	"github.com/daniellavrushin/b4/config"
	"github.com/daniellavrushin/b4/log"
	"github.com/daniellavrushin/b4/sock"
)

func (w *Worker) InjectFakeIncoming(cfg *config.SetConfig, raw []byte, ihl int, serverIP net.IP) {
	inc := &cfg.TCP.Incoming
	tcp := raw[ihl:]
	tcpHdrLen := int((tcp[12] >> 4) * 4)

	for i := 0; i < inc.FakeCount; i++ {
		fake := make([]byte, len(raw))
		copy(fake, raw)

		fake[8] = inc.FakeTTL

		// Corrupt TCP checksum
		if len(fake) > ihl+tcpHdrLen {
			fake[ihl+16] ^= 0xFF
			fake[ihl+17] ^= 0xFF
		}

		sock.FixIPv4Checksum(fake[:ihl])
		_ = w.sock.SendIPv4(fake, serverIP)
	}

	log.Tracef("Incoming: injected %d fake packets", inc.FakeCount)
}

func (w *Worker) InjectResetIncoming(cfg *config.SetConfig, raw []byte, ihl int, serverIP net.IP) {
	inc := &cfg.TCP.Incoming
	tcp := raw[ihl:]

	sport := binary.BigEndian.Uint16(tcp[0:2]) // 443
	dport := binary.BigEndian.Uint16(tcp[2:4]) // our port
	ack := binary.BigEndian.Uint32(tcp[8:12])

	for i := 0; i < inc.FakeCount; i++ {
		rst := make([]byte, 40)

		rst[0] = 0x45
		binary.BigEndian.PutUint16(rst[2:4], 40)
		binary.BigEndian.PutUint16(rst[4:6], uint16(time.Now().UnixNano()&0xFFFF)+uint16(i))
		rst[8] = inc.FakeTTL
		rst[9] = 6
		copy(rst[12:16], raw[16:20]) // our IP
		copy(rst[16:20], raw[12:16]) // server IP

		binary.BigEndian.PutUint16(rst[20:22], dport)
		binary.BigEndian.PutUint16(rst[22:24], sport)
		binary.BigEndian.PutUint32(rst[24:28], ack)
		rst[32] = 0x50
		rst[33] = 0x04 // RST

		sock.FixIPv4Checksum(rst[:20])
		sock.FixTCPChecksum(rst)

		_ = w.sock.SendIPv4(rst, serverIP)
	}

	log.Infof("Incoming: injected %d RST packets to %s:%d", inc.FakeCount, serverIP, sport)
}
