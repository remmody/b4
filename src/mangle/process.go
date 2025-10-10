package mangle

import (
	"encoding/binary"
	"time"
)

type SectionConfig struct {
	TLSEnabled     bool
	FakeSNI        bool
	FakeSNISeqLen  uint
	FakeSNIType    int
	FakeCustomPkt  []byte
	FakingStrategy uint32
	FakingTTL      uint8
	FakeseqOffset  uint32
	FragStrategy   int
	FragSNIReverse bool
	FragSNIFaked   bool
	FragMiddleSNI  bool
	FragSNIPos     int
	Seg2Delay      uint
	FKWinsize      uint16
	MatchDomain    func(string) bool
}

func ProcessTCPPacket(packet []byte, config *SectionConfig, sender func([]byte) error) (int, error) {
	if len(packet) < 20 {
		return PktAccept, nil
	}
	ipVersion := packet[0] >> 4
	isIPv6 := ipVersion == 6
	var tcpStart int
	if isIPv6 {
		tcpStart = 40
		if len(packet) < 60 {
			return PktAccept, nil
		}
	} else {
		ihl := int(packet[0]&0x0F) * 4
		tcpStart = ihl
		if len(packet) < ihl+20 {
			return PktAccept, nil
		}
	}
	dstPort := binary.BigEndian.Uint16(packet[tcpStart+2 : tcpStart+4])
	if dstPort != 443 {
		return PktAccept, nil
	}
	flags := packet[tcpStart+13]
	isSYN := flags&0x02 != 0
	if isSYN {
		return PktContinue, nil
	}
	if !config.TLSEnabled {
		return PktContinue, nil
	}
	dataOffset := int((packet[tcpStart+12] >> 4) * 4)
	payloadStart := tcpStart + dataOffset
	if len(packet) <= payloadStart {
		return PktAccept, nil
	}
	payload := packet[payloadStart:]
	sniOffset, sniLen := findSNIInTLS(payload)
	if sniOffset < 0 {
		return PktContinue, nil
	}
	sni := string(payload[sniOffset : sniOffset+sniLen])
	if config.MatchDomain != nil && !config.MatchDomain(sni) {
		return PktContinue, nil
	}
	return processTLSTarget(packet, config, sender, payloadStart, sniOffset, sniLen)
}

func processTLSTarget(packet []byte, config *SectionConfig, sender func([]byte) error, payloadStart, sniOffset, sniLen int) (int, error) {
	pkt := make([]byte, len(packet))
	copy(pkt, packet)
	ipVersion := pkt[0] >> 4
	isIPv6 := ipVersion == 6
	var ipHeaderLen int
	var tcpStart int
	if isIPv6 {
		ipHeaderLen = 40
		tcpStart = 40
	} else {
		ipHeaderLen = int(pkt[0]&0x0F) * 4
		tcpStart = ipHeaderLen
	}
	if config.FKWinsize > 0 {
		binary.BigEndian.PutUint16(pkt[tcpStart+14:tcpStart+16], config.FKWinsize)
		SetTCPChecksum(pkt, isIPv6)
	}
	if config.FakeSNI {
		fakeType := FakeType{
			Type:        config.FakeSNIType,
			FakeData:    config.FakeCustomPkt,
			SequenceLen: config.FakeSNISeqLen,
			Seg2Delay:   config.Seg2Delay,
			Strategy: FailingStrategy{
				Strategy:      config.FakingStrategy,
				FakingTTL:     config.FakingTTL,
				RandseqOffset: config.FakeseqOffset,
			},
		}
		if err := SendFakeSequence(pkt, fakeType, sender); err != nil {
			return PktAccept, err
		}
	}
	switch config.FragStrategy {
	case FragStratTCP, FragStratIP:
		return fragmentAndSendTLS(pkt, config, sender, payloadStart, sniOffset, sniLen)
	default:
		if err := sender(pkt); err != nil {
			return PktAccept, err
		}
		return PktDrop, nil
	}
}

func fragmentAndSendTLS(packet []byte, config *SectionConfig, sender func([]byte) error, payloadStart, sniOffset, sniLen int) (int, error) {
	ipVersion := packet[0] >> 4
	var ipHeaderLen int
	if ipVersion == 6 {
		ipHeaderLen = 40
	} else {
		ipHeaderLen = int(packet[0]&0x0F) * 4
	}
	var positions []int
	if config.FragSNIPos > 0 {
		positions = append(positions, config.FragSNIPos)
	}
	if config.FragMiddleSNI {
		midOffset := sniOffset + sniLen/2
		positions = append(positions, midOffset)
	}
	if len(positions) > 1 {
		for i := 0; i < len(positions)-1; i++ {
			for j := i + 1; j < len(positions); j++ {
				if positions[i] > positions[j] {
					positions[i], positions[j] = positions[j], positions[i]
				}
			}
		}
	}
	if config.FragStrategy == FragStratIP {
		tcpHeaderLen := payloadStart - ipHeaderLen
		for i := range positions {
			positions[i] = tcpHeaderLen + positions[i]
			positions[i] = (positions[i] + 7) &^ 7
		}
	}
	sendWithDelay := func(pkt []byte) error {
		return sender(pkt)
	}
	if config.FragSNIFaked {
	}
	err := FragmentAndSend(packet, positions, config.FragStrategy, config.FragSNIReverse, sendWithDelay)
	if err != nil {
		return PktAccept, err
	}
	return PktDrop, nil
}

func findSNIInTLS(data []byte) (offset int, length int) {
	if len(data) < 5 {
		return -1, 0
	}
	if data[0] != 0x16 {
		return -1, 0
	}
	if data[1] != 0x03 {
		return -1, 0
	}
	recordLen := int(binary.BigEndian.Uint16(data[3:5]))
	if len(data) < 5+recordLen {
		recordLen = len(data) - 5
	}
	handshake := data[5 : 5+recordLen]
	if len(handshake) < 1 {
		return -1, 0
	}
	if handshake[0] != 0x01 {
		return -1, 0
	}
	if len(handshake) < 38 {
		return -1, 0
	}
	pos := 38
	if pos >= len(handshake) {
		return -1, 0
	}
	sessionIDLen := int(handshake[pos])
	pos++
	pos += sessionIDLen
	if pos+2 > len(handshake) {
		return -1, 0
	}
	cipherSuitesLen := int(binary.BigEndian.Uint16(handshake[pos : pos+2]))
	pos += 2 + cipherSuitesLen
	if pos >= len(handshake) {
		return -1, 0
	}
	compMethodsLen := int(handshake[pos])
	pos++
	pos += compMethodsLen
	if pos+2 > len(handshake) {
		return -1, 0
	}
	extensionsLen := int(binary.BigEndian.Uint16(handshake[pos : pos+2]))
	pos += 2
	extensionsEnd := pos + extensionsLen
	if extensionsEnd > len(handshake) {
		extensionsEnd = len(handshake)
	}
	for pos+4 <= extensionsEnd {
		extType := binary.BigEndian.Uint16(handshake[pos : pos+2])
		extLen := int(binary.BigEndian.Uint16(handshake[pos+2 : pos+4]))
		pos += 4
		if pos+extLen > extensionsEnd {
			break
		}
		if extType == 0 {
			extData := handshake[pos : pos+extLen]
			if len(extData) < 2 {
				break
			}
			listLen := int(binary.BigEndian.Uint16(extData[0:2]))
			if len(extData) < 2+listLen {
				break
			}
			serverNameList := extData[2 : 2+listLen]
			if len(serverNameList) < 3 {
				break
			}
			if serverNameList[0] == 0 {
				nameLen := int(binary.BigEndian.Uint16(serverNameList[1:3]))
				if len(serverNameList) >= 3+nameLen {
					sniStart := 5 + pos + 3
					return sniStart, nameLen
				}
			}
		}
		pos += extLen
	}
	return -1, 0
}

func DelayedSender(baseSender func([]byte) error, delay time.Duration) func([]byte) error {
	return func(pkt []byte) error {
		if delay > 0 {
			time.Sleep(delay)
		}
		return baseSender(pkt)
	}
}
