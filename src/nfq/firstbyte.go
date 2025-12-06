package nfq

import (
	"encoding/binary"
	"net"
	"time"

	"github.com/daniellavrushin/b4/config"
	"github.com/daniellavrushin/b4/sock"
)

// In nfq/firstbyte.go
func (w *Worker) sendFirstByteDesync(cfg *config.SetConfig, packet []byte, dst net.IP) {
	ipHdrLen := int((packet[0] & 0x0F) * 4)
	tcpHdrLen := int((packet[ipHdrLen+12] >> 4) * 4)
	payloadStart := ipHdrLen + tcpHdrLen
	payloadLen := len(packet) - payloadStart

	if payloadLen < 2 {
		_ = w.sock.SendIPv4(packet, dst)
		return
	}

	payload := packet[payloadStart:]
	seq0 := binary.BigEndian.Uint32(packet[ipHdrLen+4 : ipHdrLen+8])
	id0 := binary.BigEndian.Uint16(packet[4:6])

	// Segment 1: Just first byte
	seg1Len := payloadStart + 1
	seg1 := make([]byte, seg1Len)
	copy(seg1[:payloadStart], packet[:payloadStart])
	seg1[payloadStart] = payload[0]

	binary.BigEndian.PutUint16(seg1[2:4], uint16(seg1Len))
	seg1[ipHdrLen+13] &^= 0x08
	sock.FixIPv4Checksum(seg1[:ipHdrLen])
	sock.FixTCPChecksum(seg1)

	// Segment 2: Rest
	seg2Len := payloadStart + (payloadLen - 1)
	seg2 := make([]byte, seg2Len)
	copy(seg2[:payloadStart], packet[:payloadStart])
	copy(seg2[payloadStart:], payload[1:])

	binary.BigEndian.PutUint32(seg2[ipHdrLen+4:ipHdrLen+8], seq0+1)
	binary.BigEndian.PutUint16(seg2[4:6], id0+1)
	binary.BigEndian.PutUint16(seg2[2:4], uint16(seg2Len))
	sock.FixIPv4Checksum(seg2[:ipHdrLen])
	sock.FixTCPChecksum(seg2)

	_ = w.sock.SendIPv4(seg1, dst)

	delay := cfg.TCP.Seg2Delay
	if delay < 50 {
		delay = 100
	}
	jitter := int(id0) % (delay/3 + 1)
	time.Sleep(time.Duration(delay+jitter) * time.Millisecond)

	_ = w.sock.SendIPv4(seg2, dst)
}
