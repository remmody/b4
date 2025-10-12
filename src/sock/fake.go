package sock

import (
	"encoding/binary"

	"github.com/daniellavrushin/b4/log"
)

// Default fake SNI payload from youtubeUnblock
var DefaultFakeSNI = []byte("\026\003\001\002\000\001\000\001\374\003\003\323[\345\201f\362\200:B\356Uq\355X\315i\235*\021\367\331\272\a>\233\254\355\307/\342\372\265 \275\2459l&r\222\313\361\3729\376\256\233\333O\001\373\33050\r\260f,\231\035 \324^\000>\023\002\023\003\023\001\300,\3000\000\237\314\251\314\250\314\252\300+\300/\000\236\300$\300(\000k\300#\300'\000g\300\n\300\024\0009\300\t\300\023\0003\000\235\000\234\000=\000<\0005\000/\000\377\001\000\001u\000\000\000\023\000\021\000\000\016www.google.com\000\v\000\004\003\000\001\002\000\n\000\026\000\024\000\035\000\027\000\036\000\031\000\030\001\000\001\001\001\002\001\003\001\004\000\020\000\016\000\f\002h2\bhttp/1.1\000\026\000\000\000\027\000\000\0001\000\000\000\r\0000\000.\004\003\005\003\006\003\b\a\b\b\b\032\b\033\b\034\b\t\b\n\b\v\b\004\b\005\b\006\004\001\005\001\006\001\003\003\003\001\003\002\004\002\005\002\006\002\000+\000\005\004\003\004\003\003\000-\000\002\001\001\0003\000&\000$\000\035\000 \004\224\206\021\256\f\222\266\3435\216\202\342\2573\341\3503\2107\341\023\016\240r|6\000^K\310s\000\025\000\255\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000")

type FakeStrategy int

const (
	FakeStrategyTTL FakeStrategy = iota
	FakeStrategyRandSeq
	FakeStrategyPastSeq
	FakeStrategyTCPChecksum
)

func BuildFakeTCP(original []byte, ttl uint8, strategy FakeStrategy, seqOffset int32) ([]byte, bool) {
	if len(original) < 40 || original[0]>>4 != 4 {
		return nil, false
	}

	ipHdrLen := int((original[0] & 0x0F) * 4)
	if len(original) < ipHdrLen+20 {
		return nil, false
	}

	// Build fake packet
	fake := make([]byte, ipHdrLen+20+len(DefaultFakeSNI))

	// Copy IP header
	copy(fake, original[:ipHdrLen])

	// Modify IP header
	fake[8] = ttl                                                                   // Set TTL
	binary.BigEndian.PutUint16(fake[2:4], uint16(len(fake)))                        // Total length
	binary.BigEndian.PutUint16(fake[4:6], binary.BigEndian.Uint16(original[4:6])+1) // ID++

	// Copy TCP header
	copy(fake[ipHdrLen:ipHdrLen+20], original[ipHdrLen:ipHdrLen+20])

	// Apply strategy to TCP
	tcpOffset := ipHdrLen
	switch strategy {
	case FakeStrategyRandSeq:
		seq := binary.BigEndian.Uint32(fake[tcpOffset+4 : tcpOffset+8])
		binary.BigEndian.PutUint32(fake[tcpOffset+4:tcpOffset+8], seq-uint32(seqOffset))
	case FakeStrategyPastSeq:
		seq := binary.BigEndian.Uint32(fake[tcpOffset+4 : tcpOffset+8])
		binary.BigEndian.PutUint32(fake[tcpOffset+4:tcpOffset+8], seq-uint32(len(DefaultFakeSNI)))
	}

	// Add fake SNI payload
	copy(fake[ipHdrLen+20:], DefaultFakeSNI)

	// Fix checksums
	FixIPv4Checksum(fake[:ipHdrLen])
	FixTCPChecksum(fake)

	// Break checksum if needed
	if strategy == FakeStrategyTCPChecksum {
		fake[tcpOffset+16] ^= 0xFF
		fake[tcpOffset+17] ^= 0xFF
	}
	log.Tracef("Built fake TCP packet, len=%d, ttl=%d, strategy=%d", len(fake), ttl, strategy)
	return fake, true
}

func FixIPv4Checksum(ip []byte) {
	ip[10], ip[11] = 0, 0
	var sum uint32
	for i := 0; i < 20; i += 2 {
		sum += uint32(binary.BigEndian.Uint16(ip[i : i+2]))
	}
	for sum > 0xffff {
		sum = (sum >> 16) + (sum & 0xffff)
	}
	binary.BigEndian.PutUint16(ip[10:12], ^uint16(sum))
}

func FixTCPChecksum(packet []byte) {
	ipHdrLen := int((packet[0] & 0x0F) * 4)
	tcpOffset := ipHdrLen

	// Clear checksum
	packet[tcpOffset+16] = 0
	packet[tcpOffset+17] = 0

	// Calculate pseudo-header checksum
	totalLen := binary.BigEndian.Uint16(packet[2:4])
	tcpLen := int(totalLen) - ipHdrLen

	pseudo := make([]byte, 12)
	copy(pseudo[0:4], packet[12:16]) // Src IP
	copy(pseudo[4:8], packet[16:20]) // Dst IP
	pseudo[9] = 6                    // TCP protocol
	binary.BigEndian.PutUint16(pseudo[10:12], uint16(tcpLen))

	var sum uint32
	// Pseudo-header
	for i := 0; i < len(pseudo); i += 2 {
		sum += uint32(binary.BigEndian.Uint16(pseudo[i : i+2]))
	}

	// TCP segment
	tcp := packet[tcpOffset : tcpOffset+tcpLen]
	for i := 0; i+1 < len(tcp); i += 2 {
		sum += uint32(binary.BigEndian.Uint16(tcp[i : i+2]))
	}
	if len(tcp)%2 == 1 {
		sum += uint32(tcp[len(tcp)-1]) << 8
	}

	// Fold
	for sum > 0xffff {
		sum = (sum >> 16) + (sum & 0xffff)
	}

	checksum := ^uint16(sum)
	binary.BigEndian.PutUint16(packet[tcpOffset+16:tcpOffset+18], checksum)
}
