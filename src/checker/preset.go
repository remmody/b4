package checker

import (
	"strconv"

	"github.com/daniellavrushin/b4/config"
)

type ConfigPreset struct {
	Name        string
	Description string
	Config      config.SetConfig
}

// PresetGenerator defines parameter variations for testing
type PresetGenerator struct {
	FragStrategies  []string // tcp, ip, none
	SNIPositions    []int    // 1, 2
	FakeStrategies  []string // ttl, randseq, pastseq, md5sum
	FakeTTLs        []uint8  // 3, 5, 8
	SNISeqLengths   []int    // 1, 2, 3, 5
	UDPModes        []string // drop, fake
	QUICFilters     []string // disabled, all
	Seg2Delays      []int    // 0, 5, 10
	SNIReverseFlags []bool   // true, false
	MiddleSNIFlags  []bool   // true, false
	SynFakeFlags    []bool   // true, false
	SynFakeLens     []int    // 0, 64, 256, 512
}

// GetDefaultGenerator returns a generator with common parameter variations
func GetDefaultGenerator() PresetGenerator {
	return PresetGenerator{
		FragStrategies:  []string{"tcp", "ip", "none"},
		SNIPositions:    []int{1, 3, 5},
		FakeStrategies:  []string{"pastseq", "ttl", "randseq", "md5sum"},
		FakeTTLs:        []uint8{3, 5, 8},
		SNISeqLengths:   []int{1, 2, 3},
		UDPModes:        []string{"fake", "drop"},
		QUICFilters:     []string{"disabled", "parse", "all"},
		Seg2Delays:      []int{0, 5, 10},
		SNIReverseFlags: []bool{true, false},
		MiddleSNIFlags:  []bool{true, false},
		SynFakeFlags:    []bool{true},
		SynFakeLens:     []int{0, 64, 256, 512},
	}
}

// GetTestPresets generates all preset combinations
func GetTestPresets() []ConfigPreset {
	gen := GetDefaultGenerator()
	presets := []ConfigPreset{}

	// Strategy: SYN fake variations
	for _, synFake := range gen.SynFakeFlags {
		for _, synLen := range gen.SynFakeLens {
			if !synFake && synLen > 0 {
				continue // Skip invalid combo
			}
			for _, reverse := range gen.SNIReverseFlags {
				for _, middle := range gen.MiddleSNIFlags {
					if reverse && middle {
						continue // Skip conflicting flags
					}
					for _, snipos := range gen.SNIPositions {

						preset := gen.generateSynFakePreset(synFake, synLen, reverse, middle, snipos)
						presets = append(presets, preset)
					}
				}
			}
		}
	}

	// Strategy: TCP fragmentation variations
	for _, pos := range gen.SNIPositions {
		for _, reverse := range gen.SNIReverseFlags {
			for _, middle := range gen.MiddleSNIFlags {
				if reverse && middle {
					continue // Skip conflicting flags
				}
				preset := gen.generateTCPFragPreset(pos, reverse, middle)
				presets = append(presets, preset)
			}
		}
	}

	// Strategy: IP fragmentation variations
	for _, reverse := range gen.SNIReverseFlags {
		preset := gen.generateIPFragPreset(reverse)
		presets = append(presets, preset)
	}

	// Strategy: Fake packet variations
	for _, strategy := range gen.FakeStrategies {
		for _, ttl := range gen.FakeTTLs {
			for _, seqLen := range gen.SNISeqLengths {
				preset := gen.generateFakePreset(strategy, ttl, seqLen)
				presets = append(presets, preset)
			}
		}
	}

	// Strategy: UDP/QUIC variations
	for _, mode := range gen.UDPModes {
		for _, filter := range gen.QUICFilters {
			preset := gen.generateUDPPreset(mode, filter)
			presets = append(presets, preset)
		}
	}

	// Strategy: Aggressive combinations
	for _, delay := range gen.Seg2Delays {
		if delay > 0 {
			preset := gen.generateAggressivePreset(delay)
			presets = append(presets, preset)
		}
	}

	// Strategy 99: Minimal/stealth
	presets = append(presets, gen.generateMinimalPreset())
	presets = append(presets, gen.generateNoFragPreset())

	return presets
}

func (g *PresetGenerator) generateSynFakePreset(synFake bool, synLen int, reverse, middle bool, snipos int) ConfigPreset {
	name := "syn-fake"
	desc := "SYN fake packets"

	if synFake {
		name += "-enabled"
		desc += " enabled"
	} else {
		name += "-disabled"
		desc += " disabled"
	}

	if synFake && synLen > 0 {
		name += "-len" + strconv.Itoa(synLen)
		desc += " with length " + strconv.Itoa(synLen)
	}

	return ConfigPreset{
		Name:        name,
		Description: desc,
		Config: config.SetConfig{
			TCP:           config.TCPConfig{ConnBytesLimit: 19, Seg2Delay: 0, SynFake: synFake, SynFakeLen: synLen},
			UDP:           config.UDPConfig{Mode: "fake", FakeSeqLength: 6, FakeLen: 64, FakingStrategy: "none", FilterQUIC: "disabled", FilterSTUN: true, ConnBytesLimit: 8},
			Fragmentation: config.FragmentationConfig{Strategy: "tcp", SNIPosition: snipos, SNIReverse: reverse, MiddleSNI: middle},
			Faking:        config.FakingConfig{SNI: true, TTL: 8, Strategy: "pastseq", SeqOffset: 10000, SNISeqLength: 1, SNIType: 2},
		},
	}
}

func (g *PresetGenerator) generateTCPFragPreset(pos int, reverse, middle bool) ConfigPreset {
	name := "tcp-frag"
	desc := "TCP fragmentation"

	if pos > 1 {
		name += "-pos" + string(rune('0'+pos))
		desc += " at position " + string(rune('0'+pos))
	}
	if reverse {
		name += "-reverse"
		desc += " with reversed order"
	}
	if middle {
		name += "-middle"
		desc += " in middle of SNI"
	}

	return ConfigPreset{
		Name:        name,
		Description: desc,
		Config: config.SetConfig{
			TCP: config.TCPConfig{ConnBytesLimit: 19, Seg2Delay: 0},
			UDP: config.UDPConfig{Mode: "fake", FakeSeqLength: 6, FakeLen: 64, FakingStrategy: "none", FilterQUIC: "disabled", FilterSTUN: true, ConnBytesLimit: 8},
			Fragmentation: config.FragmentationConfig{
				Strategy:    "tcp",
				SNIPosition: pos,
				SNIReverse:  reverse,
				MiddleSNI:   middle,
			},
			Faking: config.FakingConfig{SNI: true, TTL: 8, Strategy: "pastseq", SeqOffset: 10000, SNISeqLength: 1, SNIType: 2},
		},
	}
}

func (g *PresetGenerator) generateIPFragPreset(reverse bool) ConfigPreset {
	name := "ip-frag"
	desc := "IP-level fragmentation"

	if reverse {
		name += "-reverse"
		desc += " with reversed order"
	}

	return ConfigPreset{
		Name:        name,
		Description: desc,
		Config: config.SetConfig{
			TCP: config.TCPConfig{ConnBytesLimit: 19, Seg2Delay: 0},
			UDP: config.UDPConfig{Mode: "fake", FakeSeqLength: 6, FakeLen: 64, FakingStrategy: "none", FilterQUIC: "disabled", FilterSTUN: true, ConnBytesLimit: 8},
			Fragmentation: config.FragmentationConfig{
				Strategy:    "ip",
				SNIPosition: 1,
				SNIReverse:  reverse,
				MiddleSNI:   false,
			},
			Faking: config.FakingConfig{SNI: true, TTL: 8, Strategy: "pastseq", SeqOffset: 10000, SNISeqLength: 1, SNIType: 2},
		},
	}
}

func (g *PresetGenerator) generateFakePreset(strategy string, ttl uint8, seqLen int) ConfigPreset {
	return ConfigPreset{
		Name:        "fake-" + strategy + "-ttl" + string(rune('0'+ttl)) + "-len" + string(rune('0'+seqLen)),
		Description: "Fake packets with " + strategy + " strategy, TTL=" + string(rune('0'+ttl)),
		Config: config.SetConfig{
			TCP:           config.TCPConfig{ConnBytesLimit: 19, Seg2Delay: 0},
			UDP:           config.UDPConfig{Mode: "fake", FakeSeqLength: 6, FakeLen: 64, FakingStrategy: "none", FilterQUIC: "disabled", FilterSTUN: true, ConnBytesLimit: 8},
			Fragmentation: config.FragmentationConfig{Strategy: "tcp", SNIPosition: 1, SNIReverse: false, MiddleSNI: false},
			Faking:        config.FakingConfig{SNI: true, TTL: ttl, Strategy: strategy, SeqOffset: 10000, SNISeqLength: seqLen, SNIType: 2},
		},
	}
}

func (g *PresetGenerator) generateUDPPreset(mode, filter string) ConfigPreset {
	fakeSeqLen := 0
	if mode == "fake" {
		fakeSeqLen = 10
	}

	return ConfigPreset{
		Name:        "udp-" + mode + "-quic-" + filter,
		Description: "UDP mode " + mode + " with QUIC filter " + filter,
		Config: config.SetConfig{
			TCP:           config.TCPConfig{ConnBytesLimit: 19, Seg2Delay: 0},
			UDP:           config.UDPConfig{Mode: mode, FakeSeqLength: fakeSeqLen, FakeLen: 128, FakingStrategy: "ttl", FilterQUIC: filter, FilterSTUN: true, ConnBytesLimit: 8},
			Fragmentation: config.FragmentationConfig{Strategy: "tcp", SNIPosition: 1, SNIReverse: false, MiddleSNI: false},
			Faking:        config.FakingConfig{SNI: true, TTL: 8, Strategy: "pastseq", SeqOffset: 10000, SNISeqLength: 1, SNIType: 2},
		},
	}
}

func (g *PresetGenerator) generateAggressivePreset(delay int) ConfigPreset {
	return ConfigPreset{
		Name:        "aggressive-delay" + string(rune('0'+delay)),
		Description: "Aggressive: multi-fake + delay " + string(rune('0'+delay)) + "ms",
		Config: config.SetConfig{
			TCP:           config.TCPConfig{ConnBytesLimit: 19, Seg2Delay: delay},
			UDP:           config.UDPConfig{Mode: "fake", FakeSeqLength: 12, FakeLen: 64, FakingStrategy: "ttl", FilterQUIC: "all", FilterSTUN: true, ConnBytesLimit: 8},
			Fragmentation: config.FragmentationConfig{Strategy: "tcp", SNIPosition: 1, SNIReverse: true, MiddleSNI: true},
			Faking:        config.FakingConfig{SNI: true, TTL: 5, Strategy: "randseq", SeqOffset: 50000, SNISeqLength: 5, SNIType: 2},
		},
	}
}

func (g *PresetGenerator) generateMinimalPreset() ConfigPreset {
	return ConfigPreset{
		Name:        "minimal-no-fake",
		Description: "TCP fragmentation only, no fake packets",
		Config: config.SetConfig{
			TCP:           config.TCPConfig{ConnBytesLimit: 19, Seg2Delay: 0},
			UDP:           config.UDPConfig{Mode: "fake", FakeSeqLength: 0, FakeLen: 64, FakingStrategy: "none", FilterQUIC: "disabled", FilterSTUN: true, ConnBytesLimit: 8},
			Fragmentation: config.FragmentationConfig{Strategy: "tcp", SNIPosition: 1, SNIReverse: false, MiddleSNI: false},
			Faking:        config.FakingConfig{SNI: false, TTL: 8, Strategy: "pastseq", SeqOffset: 10000, SNISeqLength: 0, SNIType: 2},
		},
	}
}

func (g *PresetGenerator) generateNoFragPreset() ConfigPreset {
	return ConfigPreset{
		Name:        "no-frag-fake-only",
		Description: "Only fake packets, no fragmentation",
		Config: config.SetConfig{
			TCP:           config.TCPConfig{ConnBytesLimit: 19, Seg2Delay: 0},
			UDP:           config.UDPConfig{Mode: "fake", FakeSeqLength: 6, FakeLen: 64, FakingStrategy: "none", FilterQUIC: "disabled", FilterSTUN: true, ConnBytesLimit: 8},
			Fragmentation: config.FragmentationConfig{Strategy: "none", SNIPosition: 0, SNIReverse: false, MiddleSNI: false},
			Faking:        config.FakingConfig{SNI: true, TTL: 8, Strategy: "pastseq", SeqOffset: 10000, SNISeqLength: 3, SNIType: 2},
		},
	}
}
