package sock

import (
	"net"
	"syscall"

	"golang.org/x/sys/unix"
)

const PacketMark = 0x8000

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
	addr := syscall.SockaddrInet4{}
	copy(addr.Addr[:], destIP.To4())
	return syscall.Sendto(s.fd4, packet, 0, &addr)
}

func (s *Sender) SendIPv6(packet []byte, destIP net.IP) error {
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
