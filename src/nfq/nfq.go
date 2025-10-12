package nfq

import (
	"encoding/binary"
	"errors"
	"fmt"
	"net"
	"os"
	"time"

	"github.com/daniellavrushin/b4/log"
	"github.com/daniellavrushin/b4/sni"
	"github.com/daniellavrushin/b4/sock"
	"github.com/florianl/go-nfqueue"
)

func (w *Worker) Start() error {
	s, err := sock.NewSenderWithMark(int(w.cfg.Mark))
	if err != nil {
		return err
	}
	w.sock = s
	w.frag = &sock.Fragmenter{}

	c := nfqueue.Config{
		NfQueue:      w.qnum,
		MaxPacketLen: 0xffff,
		MaxQueueLen:  4096,
		Copymode:     nfqueue.NfQnlCopyPacket,
	}
	q, err := nfqueue.Open(&c)
	if err != nil {
		return err
	}
	w.q = q

	w.wg.Add(1)
	go w.gc()

	go func() {
		pid := os.Getpid()
		log.Infof("NFQ bound pid=%d queue=%d", pid, w.qnum)
		_ = q.RegisterWithErrorFunc(w.ctx, func(a nfqueue.Attribute) int {
			if a.PacketID == nil || a.Payload == nil || len(*a.Payload) == 0 {
				return 0
			}
			id := *a.PacketID
			raw := *a.Payload

			v := raw[0] >> 4
			if v != 4 && v != 6 {
				_ = q.SetVerdict(id, nfqueue.NfAccept)
				return 0
			}
			var proto uint8
			var src, dst net.IP
			var ihl int
			if v == 4 {
				if len(raw) < 20 {
					_ = q.SetVerdict(id, nfqueue.NfAccept)
					return 0
				}
				ihl = int(raw[0]&0x0f) * 4
				if len(raw) < ihl {
					_ = q.SetVerdict(id, nfqueue.NfAccept)
					return 0
				}
				proto = raw[9]
				src = net.IP(raw[12:16])
				dst = net.IP(raw[16:20])
			} else {
				if len(raw) < 40 {
					_ = q.SetVerdict(id, nfqueue.NfAccept)
					return 0
				}
				ihl = 40
				proto = raw[6]
				src = net.IP(raw[8:24])
				dst = net.IP(raw[24:40])
			}

			if proto == 6 && len(raw) >= ihl+20 {
				tcp := raw[ihl:]
				if len(tcp) < 20 {
					_ = q.SetVerdict(id, nfqueue.NfAccept)
					return 0
				}
				datOff := int((tcp[12]>>4)&0x0f) * 4
				if len(tcp) < datOff {
					_ = q.SetVerdict(id, nfqueue.NfAccept)
					return 0
				}
				payload := tcp[datOff:]
				sport := binary.BigEndian.Uint16(tcp[0:2])
				dport := binary.BigEndian.Uint16(tcp[2:4])
				if dport == 443 && len(payload) > 0 {
					k := fmt.Sprintf("%s:%d>%s:%d", src.String(), sport, dst.String(), dport)
					host, ok := w.feed(k, payload)
					if ok && w.matcher.Match(host) {
						log.Infof("TCP: %s %s:%d -> %s:%d", host, src.String(), sport, dst.String(), dport)
						go w.dropAndInjectTCP(raw, dst)
						_ = q.SetVerdict(id, nfqueue.NfDrop)
						return 0
					}
				}
			}

			if proto == 17 && len(raw) >= ihl+8 {
				udp := raw[ihl:]
				if len(udp) >= 8 {
					payload := udp[8:]
					sport := binary.BigEndian.Uint16(udp[0:2])
					dport := binary.BigEndian.Uint16(udp[2:4])
					if dport == 443 {
						if host, ok := sni.ParseQUICClientHelloSNI(payload); ok && w.matcher.Match(host) {
							log.Infof("UDP: %s %s:%d -> %s:%d", host, src.String(), sport, dst.String(), dport)
							go w.dropAndInjectQUIC(raw, dst)
							_ = q.SetVerdict(id, nfqueue.NfDrop)
							return 0
						}
					}
				}
			}

			_ = q.SetVerdict(id, nfqueue.NfAccept)
			return 0
		}, func(err error) int {
			log.Errorf("nfq: %v", err)
			return 0
		})
	}()

	return nil
}

func (w *Worker) dropAndInjectQUIC(raw []byte, dst net.IP) {
	fake, ok := sock.BuildFakeUDPFromOriginal(raw, 1200, 8)
	if ok {
		_ = w.sock.SendIPv4(fake, dst)
		time.Sleep(10 * time.Millisecond)
	}
	frags, ok := sock.IPv4FragmentUDP(raw, 24)
	if !ok {
		return
	}
	for i, f := range frags {
		_ = w.sock.SendIPv4(f, dst)
		if i == 0 {
			time.Sleep(5 * time.Millisecond)
		}
	}
}

func (w *Worker) dropAndInjectTCP(raw []byte, dst net.IP) {
	if len(raw) < 40 || raw[0]>>4 != 4 {
		_ = w.sock.SendIPv4(raw, dst)
		return
	}

	ipHdrLen := int((raw[0] & 0x0F) * 4)
	if len(raw) < ipHdrLen+20 {
		_ = w.sock.SendIPv4(raw, dst)
		return
	}

	tcpHdrLen := int((raw[ipHdrLen+12] >> 4) * 4)
	payloadStart := ipHdrLen + tcpHdrLen

	if len(raw) <= payloadStart {
		_ = w.sock.SendIPv4(raw, dst)
		return
	}

	// Send fake SNI packets first if configured
	if w.cfg.FakeSNI {
		for i := 0; i < w.cfg.FakeSNISeqLength; i++ {
			fake := w.buildFakeSNI(raw)
			if fake != nil {
				_ = w.sock.SendIPv4(fake, dst)
				time.Sleep(5 * time.Millisecond)
			}
		}
	}

	// Find SNI position in the TLS payload
	sniOffset := w.findSNIOffsetInPayload(raw[payloadStart:])
	if sniOffset < 0 {
		sniOffset = w.cfg.FragSNIPosition
		if sniOffset <= 0 {
			sniOffset = 1
		}
	}

	// Apply middle split if configured
	if w.cfg.FragMiddleSNI && sniOffset > 0 {
		// Find the actual SNI value position and split in the middle
		sniValueOffset := w.findSNIValueOffset(raw[payloadStart:])
		if sniValueOffset > 0 {
			sniOffset = sniValueOffset + 5 // Split in middle of SNI hostname
		}
	}

	// Fragment the packet
	fragments, err := w.fragmentTCPPacket(raw, payloadStart+sniOffset)
	if err != nil {
		_ = w.sock.SendIPv4(raw, dst)
		return
	}

	// Send fragments based on configuration
	if w.cfg.FragSNIReverse {
		_ = w.sock.SendIPv4(fragments[1], dst)
		if w.cfg.Seg2Delay > 0 {
			time.Sleep(time.Duration(w.cfg.Seg2Delay) * time.Millisecond)
		} else {
			time.Sleep(10 * time.Millisecond)
		}
		_ = w.sock.SendIPv4(fragments[0], dst)
	} else {
		_ = w.sock.SendIPv4(fragments[0], dst)
		if w.cfg.Seg2Delay > 0 {
			time.Sleep(time.Duration(w.cfg.Seg2Delay) * time.Millisecond)
		} else {
			time.Sleep(10 * time.Millisecond)
		}
		_ = w.sock.SendIPv4(fragments[1], dst)
	}
}

func (w *Worker) feed(key string, chunk []byte) (string, bool) {
	w.mu.Lock()
	st := w.flows[key]
	if st == nil {
		st = &flowState{buf: nil, last: time.Now()}
		w.flows[key] = st
	}
	if len(st.buf) < w.limit {
		need := w.limit - len(st.buf)
		if len(chunk) < need {
			st.buf = append(st.buf, chunk...)
		} else {
			st.buf = append(st.buf, chunk[:need]...)
		}
	}
	st.last = time.Now()
	buf := append([]byte(nil), st.buf...)
	w.mu.Unlock()
	host, ok := sni.ParseTLSClientHelloSNI(buf)
	if ok && host != "" {
		w.mu.Lock()
		delete(w.flows, key)
		w.mu.Unlock()
		return host, true
	}
	return "", false
}

func (w *Worker) findSNIOffsetInPayload(payload []byte) int {
	// Check for TLS handshake
	if len(payload) < 5 || payload[0] != 0x16 || payload[1] != 0x03 {
		return -1
	}

	// Skip TLS header (5 bytes) and handshake type (1 byte) and length (3 bytes)
	if len(payload) < 43 {
		return -1
	}

	// Skip version (2) + random (32) + session_id_len (1)
	pos := 38
	if pos >= len(payload) {
		return -1
	}

	sessionIdLen := int(payload[pos])
	pos += 1 + sessionIdLen

	// Skip cipher_suites
	if pos+2 > len(payload) {
		return -1
	}
	cipherLen := int(payload[pos])<<8 | int(payload[pos+1])
	pos += 2 + cipherLen

	// Skip compression_methods
	if pos+1 > len(payload) {
		return -1
	}
	compLen := int(payload[pos])
	pos += 1 + compLen

	// Now in extensions
	if pos+2 > len(payload) {
		return -1
	}

	extLen := int(payload[pos])<<8 | int(payload[pos+1])
	pos += 2

	// Search for SNI extension (type 0x0000)
	extEnd := pos + extLen
	for pos+4 < extEnd && pos+4 < len(payload) {
		extType := int(payload[pos])<<8 | int(payload[pos+1])
		extDataLen := int(payload[pos+2])<<8 | int(payload[pos+3])

		if extType == 0 { // SNI extension
			return pos
		}

		pos += 4 + extDataLen
	}

	return -1
}

func (w *Worker) findSNIValueOffset(payload []byte) int {
	offset := w.findSNIOffsetInPayload(payload)
	if offset < 0 {
		return -1
	}

	// Skip to the actual SNI hostname
	// Skip extension type (2) + extension length (2) + list length (2) + name type (1) + name length (2)
	if offset+9 < len(payload) {
		return offset + 9
	}

	return -1
}

func (w *Worker) buildFakeSNI(original []byte) []byte {
	ipHdrLen := int((original[0] & 0x0F) * 4)
	tcpHdrLen := int((original[ipHdrLen+12] >> 4) * 4)

	// Create fake packet with default fake SNI payload
	fakePayload := sock.DefaultFakeSNI
	fake := make([]byte, ipHdrLen+tcpHdrLen+len(fakePayload))

	// Copy IP header
	copy(fake, original[:ipHdrLen])

	// Copy TCP header
	copy(fake[ipHdrLen:], original[ipHdrLen:ipHdrLen+tcpHdrLen])

	// Add fake SNI payload
	copy(fake[ipHdrLen+tcpHdrLen:], fakePayload)

	// Apply faking strategy
	switch w.cfg.FakeStrategy {
	case "ttl":
		fake[8] = w.cfg.FakeTTL
	case "pastseq":
		// Adjust sequence number to be in the past
		seq := binary.BigEndian.Uint32(fake[ipHdrLen+4 : ipHdrLen+8])
		binary.BigEndian.PutUint32(fake[ipHdrLen+4:ipHdrLen+8], seq-uint32(len(fakePayload)))
	case "randseq":
		// Random sequence offset
		seq := binary.BigEndian.Uint32(fake[ipHdrLen+4 : ipHdrLen+8])
		binary.BigEndian.PutUint32(fake[ipHdrLen+4:ipHdrLen+8], seq-uint32(w.cfg.FakeSeqOffset))
	case "tcp_check":
		// Will break checksum after calculation
	}

	// Fix IP header
	binary.BigEndian.PutUint16(fake[2:4], uint16(len(fake))) // Total length
	sock.FixIPv4Checksum(fake[:ipHdrLen])

	// Fix TCP checksum
	sock.FixTCPChecksum(fake)

	// Break checksum if strategy requires it
	if w.cfg.FakeStrategy == "tcp_check" {
		fake[ipHdrLen+16] ^= 0xFF
	}

	return fake
}

func (w *Worker) fragmentTCPPacket(packet []byte, splitPos int) ([][]byte, error) {
	if splitPos <= 0 || splitPos >= len(packet) {
		return nil, errors.New("invalid split position")
	}

	ipHdrLen := int((packet[0] & 0x0F) * 4)
	tcpHdrLen := int((packet[ipHdrLen+12] >> 4) * 4)
	payloadStart := ipHdrLen + tcpHdrLen

	if splitPos <= payloadStart || splitPos >= len(packet) {
		return nil, errors.New("split position outside payload")
	}

	// Fragment 1: up to split position
	frag1 := make([]byte, splitPos)
	copy(frag1, packet[:splitPos])

	// Fragment 2: from split position to end
	frag2Len := len(packet) - splitPos + ipHdrLen + tcpHdrLen
	frag2 := make([]byte, frag2Len)

	// Copy IP header
	copy(frag2, packet[:ipHdrLen])

	// Copy TCP header
	copy(frag2[ipHdrLen:], packet[ipHdrLen:ipHdrLen+tcpHdrLen])

	// Copy remaining payload
	copy(frag2[ipHdrLen+tcpHdrLen:], packet[splitPos:])

	// Adjust fragment 1 IP length
	binary.BigEndian.PutUint16(frag1[2:4], uint16(len(frag1)))

	// Adjust fragment 2
	binary.BigEndian.PutUint16(frag2[2:4], uint16(len(frag2)))

	// Adjust sequence number in fragment 2
	seq := binary.BigEndian.Uint32(frag2[ipHdrLen+4 : ipHdrLen+8])
	binary.BigEndian.PutUint32(frag2[ipHdrLen+4:ipHdrLen+8], seq+uint32(splitPos-payloadStart))

	// Fix checksums
	sock.FixIPv4Checksum(frag1[:ipHdrLen])
	sock.FixTCPChecksum(frag1)
	sock.FixIPv4Checksum(frag2[:ipHdrLen])
	sock.FixTCPChecksum(frag2)

	return [][]byte{frag1, frag2}, nil
}

func (w *Worker) Stop() {
	if w.cancel != nil {
		w.cancel()
	}
	w.wg.Wait()
	if w.q != nil {
		_ = w.q.Close()
	}
	if w.sock != nil {
		w.sock.Close()
	}
}

func (w *Worker) gc() {
	defer w.wg.Done()
	t := time.NewTicker(2 * time.Second)
	defer t.Stop()
	for {
		select {
		case <-w.ctx.Done():
			return
		case now := <-t.C:
			w.mu.Lock()
			for k, st := range w.flows {
				if now.Sub(st.last) > w.ttl {
					delete(w.flows, k)
				}
			}
			w.mu.Unlock()
		}
	}
}
