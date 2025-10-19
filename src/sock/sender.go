package sock

import (
	"crypto/rand"
	"encoding/binary"
	"errors"
	"net"
	"syscall"

	"github.com/daniellavrushin/b4/log"
	"golang.org/x/sys/unix"
)

const (
	PacketMark    = 0x8000
	AVAILABLE_MTU = 1400
)

type Sender struct {
	fd4 int
	fd6 int
}

func NewSenderWithMark(mark int) (*Sender, error) {
	fd4, err := syscall.Socket(syscall.AF_INET, syscall.SOCK_RAW, syscall.IPPROTO_RAW)
	if err != nil {
		return nil, err
	}
	if err := syscall.SetsockoptInt(fd4, syscall.IPPROTO_IP, syscall.IP_HDRINCL, 1); err != nil {
		syscall.Close(fd4)
		return nil, err
	}
	if err := syscall.SetsockoptInt(fd4, syscall.SOL_SOCKET, unix.SO_MARK, mark); err != nil {
		syscall.Close(fd4)
		return nil, err
	}
	fd6, err := syscall.Socket(syscall.AF_INET6, syscall.SOCK_RAW, syscall.IPPROTO_RAW)
	if err != nil {
		syscall.Close(fd4)
		return nil, err
	}
	_ = syscall.SetsockoptInt(fd6, syscall.SOL_SOCKET, unix.SO_MARK, mark)
	return &Sender{fd4: fd4, fd6: fd6}, nil
}

func NewSender() (*Sender, error) {
	return NewSenderWithMark(PacketMark)
}

func (s *Sender) SendIPv4(packet []byte, destIP net.IP) error {
	// Handle MTU splitting like youtubeUnblock
	if len(packet) > AVAILABLE_MTU {
		log.Tracef("Split packet! len=%d", len(packet))

		// Use tcp_frag equivalent - split at AVAILABLE_MTU-128
		splitPos := AVAILABLE_MTU - 128

		// Need to implement TCP fragmentation
		frag1, frag2, err := tcpFragment(packet, splitPos)
		if err != nil {
			// If fragmentation fails, try sending as-is
			return s.sendIPv4Raw(packet, destIP)
		}

		// Send first fragment
		if err := s.sendIPv4Raw(frag1, destIP); err != nil {
			return err
		}

		// Send second fragment
		return s.sendIPv4Raw(frag2, destIP)
	}

	return s.sendIPv4Raw(packet, destIP)
}

func (s *Sender) sendIPv4Raw(packet []byte, destIP net.IP) error {
	log.Tracef("Sending IPv4 packet to %s, len=%d", destIP.String(), len(packet))
	addr := syscall.SockaddrInet4{}
	copy(addr.Addr[:], destIP.To4())
	return syscall.Sendto(s.fd4, packet, 0, &addr)
}

func (s *Sender) SendIPv6(packet []byte, destIP net.IP) error {
	log.Tracef("Sending IPv6 packet to %s, len=%d", destIP.String(), len(packet))
	addr := syscall.SockaddrInet6{}
	copy(addr.Addr[:], destIP.To16())
	return syscall.Sendto(s.fd6, packet, 0, &addr)
}

func (s *Sender) Close() {
	if s.fd4 != 0 {
		_ = syscall.Close(s.fd4)
	}
	if s.fd6 != 0 {
		_ = syscall.Close(s.fd6)
	}
}

func tcpFragment(packet []byte, splitPos int) ([]byte, []byte, error) {
	// Validate packet
	if len(packet) < 20 {
		return nil, nil, errors.New("packet too small for IPv4 header")
	}

	// Parse IPv4 header
	if packet[0]>>4 != 4 {
		return nil, nil, errors.New("not an IPv4 packet")
	}

	ipHdrLen := int((packet[0] & 0x0F) * 4)
	if len(packet) < ipHdrLen+20 { // Need TCP header too
		return nil, nil, errors.New("packet too small for TCP")
	}

	// Check it's TCP
	if packet[9] != 6 { // Protocol field
		return nil, nil, errors.New("not a TCP packet")
	}

	// Check for fragmentation flags
	fragFlags := binary.BigEndian.Uint16(packet[6:8])
	if fragFlags&0x3FFF != 0 { // MF flag or fragment offset
		return nil, nil, errors.New("IP fragmentation already set")
	}

	// Parse TCP header
	tcpHdrLen := int((packet[ipHdrLen+12] >> 4) * 4)
	totalLen := len(packet)
	payloadStart := ipHdrLen + tcpHdrLen
	payloadLen := totalLen - payloadStart

	if payloadLen <= 0 {
		return nil, nil, errors.New("no TCP payload")
	}

	if splitPos <= 0 || splitPos >= payloadLen {
		return nil, nil, errors.New("invalid split position")
	}

	// Create first segment
	seg1Len := payloadStart + splitPos
	seg1 := make([]byte, seg1Len)
	copy(seg1, packet[:seg1Len])

	// Create second segment
	seg2Len := payloadStart + (payloadLen - splitPos)
	seg2 := make([]byte, seg2Len)
	copy(seg2[:payloadStart], packet[:payloadStart])          // Copy headers
	copy(seg2[payloadStart:], packet[payloadStart+splitPos:]) // Copy remaining payload

	// Fix first segment IP header
	binary.BigEndian.PutUint16(seg1[2:4], uint16(seg1Len)) // Total length
	// Generate new IP ID
	id1 := uint16(randomInt() & 0xFFFF)
	binary.BigEndian.PutUint16(seg1[4:6], id1)

	// Fix second segment headers
	binary.BigEndian.PutUint16(seg2[2:4], uint16(seg2Len)) // Total length
	id2 := uint16(randomInt() & 0xFFFF)
	binary.BigEndian.PutUint16(seg2[4:6], id2)

	// Adjust TCP sequence number for second segment
	seq := binary.BigEndian.Uint32(seg2[ipHdrLen+4 : ipHdrLen+8])
	binary.BigEndian.PutUint32(seg2[ipHdrLen+4:ipHdrLen+8], seq+uint32(splitPos))

	// Recalculate checksums
	FixIPv4Checksum(seg1[:ipHdrLen])
	FixTCPChecksum(seg1)

	FixIPv4Checksum(seg2[:ipHdrLen])
	FixTCPChecksum(seg2)

	return seg1, seg2, nil
}

// Helper function for random number generation
func randomInt() int {
	// Use crypto/rand for better randomness
	var b [4]byte
	_, _ = rand.Read(b[:])
	return int(binary.BigEndian.Uint32(b[:]))
}
