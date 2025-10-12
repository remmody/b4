package nfq

import (
	"encoding/binary"
	"fmt"
	"net"
	"os"
	"time"

	"github.com/daniellavrushin/b4/log"
	"github.com/daniellavrushin/b4/sni"
	"github.com/daniellavrushin/b4/sock"
	"github.com/florianl/go-nfqueue"
	"github.com/google/gopacket"
	"github.com/google/gopacket/layers"
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
	// Use configuration from fragmenter
	if w.cfg.FakeSNI {
		for i := 0; i < w.cfg.FakeSNISeqLength; i++ {
			fake, ok := sock.BuildFakeTCP(raw, w.cfg.FakeTTL, w.frag.FakeStrategy, w.cfg.FakeSeqOffset)
			if ok {
				_ = w.sock.SendIPv4(fake, dst)
				time.Sleep(5 * time.Millisecond)
			}
		}
	}

	// Find SNI offset
	sniOffset := sock.FindSNIOffset(raw)
	if sniOffset <= 0 {
		sniOffset = w.cfg.FragSNIPosition
		if sniOffset <= 0 {
			sniOffset = 1
		}
	}

	// Apply middle split if configured
	if w.cfg.FragMiddleSNI && sniOffset > 0 {
		// Get payload start
		ipHdrLen := int((raw[0] & 0x0F) * 4)
		tcpHdrLen := int((raw[ipHdrLen+12] >> 4) * 4)
		payloadStart := ipHdrLen + tcpHdrLen

		// Find middle of SNI value (not just the extension)
		if len(raw) > payloadStart+sniOffset+10 {
			sniOffset += 5 // Split in middle of SNI hostname
		}
	}

	pkt := gopacket.NewPacket(raw, layers.LayerTypeIPv4, gopacket.Default)
	frags, err := w.frag.FragmentPacket(pkt, sniOffset)
	if err != nil {
		_ = w.sock.SendIPv4(raw, dst)
		return
	}

	// Send fragments based on reverse configuration
	if w.frag.ReverseOrder {
		// Send second fragment first
		_ = w.sock.SendIPv4(frags[1], dst)
		time.Sleep(10 * time.Millisecond) // Delay between fragments
		_ = w.sock.SendIPv4(frags[0], dst)
	} else {
		// Normal order
		_ = w.sock.SendIPv4(frags[0], dst)
		time.Sleep(10 * time.Millisecond) // Delay between fragments
		_ = w.sock.SendIPv4(frags[1], dst)
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
