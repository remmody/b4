package nfq

import (
	"encoding/binary"
	"net"

	"github.com/daniellavrushin/b4/config"
	"github.com/daniellavrushin/b4/log"
	"github.com/daniellavrushin/b4/sock"
)

// sendFakeSyn sends a fake SYN packet with payload to confuse DPI systems
func (w *Worker) sendFakeSyn(set *config.SetConfig, raw []byte, ipHdrLen, tcpHdrLen int) {
	// Determine fake payload length
	fakePayloadLen := len(sock.FakeSNI)
	if set.TCP.SynFakeLen > 0 && set.TCP.SynFakeLen < fakePayloadLen {
		fakePayloadLen = set.TCP.SynFakeLen
	}

	// Build fake SYN packet
	totalLen := ipHdrLen + tcpHdrLen + fakePayloadLen
	fakePkt := make([]byte, totalLen)

	// Copy IP and TCP headers from original SYN
	copy(fakePkt[:ipHdrLen+tcpHdrLen], raw[:ipHdrLen+tcpHdrLen])

	// Add fake payload (truncated if SynFakeLen is set)
	copy(fakePkt[ipHdrLen+tcpHdrLen:], sock.FakeSNI[:fakePayloadLen])

	// Update IP total length
	binary.BigEndian.PutUint16(fakePkt[2:4], uint16(totalLen))

	// Apply faking strategy to make the fake packet invalid
	w.applySynFakingStrategy(fakePkt, ipHdrLen, tcpHdrLen, set)

	// Recalculate checksums
	sock.FixIPv4Checksum(fakePkt[:ipHdrLen])
	sock.FixTCPChecksum(fakePkt)

	// If tcp_check strategy, corrupt checksum AFTER calculation
	if set.Faking.Strategy == "tcp_check" {
		fakePkt[ipHdrLen+16] ^= 0xFF // Flip checksum byte
	}

	// Extract destination IP for sending
	dst := net.IP(fakePkt[16:20])

	// Send fake SYN
	if err := w.sock.SendIPv4(fakePkt, dst); err != nil {
		log.Errorf("Failed to send fake SYN: %v", err)
	}
}

// sendFakeSynV6 sends a fake SYN packet for IPv6
func (w *Worker) sendFakeSynV6(set *config.SetConfig, raw []byte, ipHdrLen, tcpHdrLen int) {
	// Determine fake payload length
	fakePayloadLen := len(sock.FakeSNI)
	if set.TCP.SynFakeLen > 0 && set.TCP.SynFakeLen < fakePayloadLen {
		fakePayloadLen = set.TCP.SynFakeLen
	}

	// Build fake SYN packet
	totalLen := ipHdrLen + tcpHdrLen + fakePayloadLen
	fakePkt := make([]byte, totalLen)

	// Copy IP and TCP headers from original SYN
	copy(fakePkt[:ipHdrLen+tcpHdrLen], raw[:ipHdrLen+tcpHdrLen])

	// Add fake payload
	copy(fakePkt[ipHdrLen+tcpHdrLen:], sock.FakeSNI[:fakePayloadLen])

	// Update IPv6 payload length (bytes 4-5)
	payloadLen := tcpHdrLen + fakePayloadLen
	binary.BigEndian.PutUint16(fakePkt[4:6], uint16(payloadLen))

	// Apply faking strategy
	w.applySynFakingStrategyV6(fakePkt, ipHdrLen, tcpHdrLen, set)

	// Recalculate TCP checksum for IPv6
	sock.FixTCPChecksumV6(fakePkt)

	// If tcp_check strategy, corrupt checksum AFTER calculation
	if set.Faking.Strategy == "tcp_check" {
		fakePkt[ipHdrLen+16] ^= 0xFF
	}

	// Extract destination IP for sending
	dst := net.IP(fakePkt[24:40])

	// Send fake SYN
	if err := w.sock.SendIPv6(fakePkt, dst); err != nil {
		log.Errorf("Failed to send fake SYN v6: %v", err)
	}
}

// applySynFakingStrategy modifies the fake SYN packet according to configured strategy
func (w *Worker) applySynFakingStrategy(pkt []byte, ipHdrLen, tcpHdrLen int, set *config.SetConfig) {
	switch set.Faking.Strategy {
	case "ttl":
		// Set low TTL so fake packet dies before reaching server
		pkt[8] = set.Faking.TTL

	case "randseq":
		// Randomize TCP sequence number
		seq := binary.BigEndian.Uint32(pkt[ipHdrLen+4 : ipHdrLen+8])
		seq += uint32(set.Faking.SeqOffset)
		if set.Faking.SeqOffset == 0 {
			seq += 100000 // Default random offset
		}
		binary.BigEndian.PutUint32(pkt[ipHdrLen+4:ipHdrLen+8], seq)

	case "pastseq":
		// Use past sequence number
		seq := binary.BigEndian.Uint32(pkt[ipHdrLen+4 : ipHdrLen+8])
		offset := uint32(set.Faking.SeqOffset)
		if offset == 0 {
			offset = 10000 // Default offset
		}
		if seq > offset {
			seq -= offset
		}
		binary.BigEndian.PutUint32(pkt[ipHdrLen+4:ipHdrLen+8], seq)

	case "tcp_check":
		// Checksum will be corrupted after calculation in the caller
		// Do nothing here

	case "md5sum":
		// TODO: Implement TCP MD5 signature option
		log.Warnf("md5sum strategy not yet implemented for SYN fake")
	}
}

// applySynFakingStrategyV6 modifies the fake SYN packet for IPv6
func (w *Worker) applySynFakingStrategyV6(pkt []byte, ipHdrLen, tcpHdrLen int, set *config.SetConfig) {
	switch set.Faking.Strategy {
	case "ttl":
		// IPv6 uses Hop Limit (byte 7) instead of TTL
		pkt[7] = set.Faking.TTL

	case "randseq":
		seq := binary.BigEndian.Uint32(pkt[ipHdrLen+4 : ipHdrLen+8])
		seq += uint32(set.Faking.SeqOffset)
		if set.Faking.SeqOffset == 0 {
			seq += 100000
		}
		binary.BigEndian.PutUint32(pkt[ipHdrLen+4:ipHdrLen+8], seq)

	case "pastseq":
		seq := binary.BigEndian.Uint32(pkt[ipHdrLen+4 : ipHdrLen+8])
		offset := uint32(set.Faking.SeqOffset)
		if offset == 0 {
			offset = 10000
		}
		if seq > offset {
			seq -= offset
		}
		binary.BigEndian.PutUint32(pkt[ipHdrLen+4:ipHdrLen+8], seq)

	case "tcp_check":
		// Will be corrupted after checksum calculation

	case "md5sum":
		log.Warnf("md5sum strategy not yet implemented for SYN fake")
	}
}
