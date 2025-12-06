package nfq

import (
	"encoding/binary"
	"net"
	"time"

	"github.com/daniellavrushin/b4/config"
	"github.com/daniellavrushin/b4/sock"
)

func (w *Worker) sendFirstByteDesyncV6(cfg *config.SetConfig, packet []byte, dst net.IP) {
	const ipv6HdrLen = 40

	if len(packet) < ipv6HdrLen+20 {
		_ = w.sock.SendIPv6(packet, dst)
		return
	}

	tcpHdrLen := int((packet[ipv6HdrLen+12] >> 4) * 4)
	payloadStart := ipv6HdrLen + tcpHdrLen
	payloadLen := len(packet) - payloadStart

	if payloadLen < 2 {
		_ = w.sock.SendIPv6(packet, dst)
		return
	}

	payload := packet[payloadStart:]
	seq0 := binary.BigEndian.Uint32(packet[ipv6HdrLen+4 : ipv6HdrLen+8])

	// Segment 1: Just first byte
	seg1Len := payloadStart + 1
	seg1 := make([]byte, seg1Len)
	copy(seg1[:payloadStart], packet[:payloadStart])
	seg1[payloadStart] = payload[0]

	binary.BigEndian.PutUint16(seg1[4:6], uint16(seg1Len-ipv6HdrLen))
	seg1[ipv6HdrLen+13] &^= 0x08 // Clear PSH
	sock.FixTCPChecksumV6(seg1)

	// Segment 2: Rest
	seg2Len := payloadStart + (payloadLen - 1)
	seg2 := make([]byte, seg2Len)
	copy(seg2[:payloadStart], packet[:payloadStart])
	copy(seg2[payloadStart:], payload[1:])

	binary.BigEndian.PutUint32(seg2[ipv6HdrLen+4:ipv6HdrLen+8], seq0+1)
	binary.BigEndian.PutUint16(seg2[4:6], uint16(seg2Len-ipv6HdrLen))
	sock.FixTCPChecksumV6(seg2)

	_ = w.sock.SendIPv6(seg1, dst)

	delay := cfg.TCP.Seg2Delay
	if delay < 50 {
		delay = 100
	}
	jitter := int(seq0) % (delay/3 + 1)
	time.Sleep(time.Duration(delay+jitter) * time.Millisecond)

	_ = w.sock.SendIPv6(seg2, dst)
}
