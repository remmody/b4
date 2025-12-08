package dns

func ParseQueryDomain(payload []byte) (string, bool) {
	// DNS header is 12 bytes
	if len(payload) < 12 {
		return "", false
	}

	pos := 12
	var domain []byte

	for pos < len(payload) {
		length := int(payload[pos])
		if length == 0 {
			break
		}
		if pos+1+length > len(payload) {
			return "", false
		}
		if len(domain) > 0 {
			domain = append(domain, '.')
		}
		domain = append(domain, payload[pos+1:pos+1+length]...)
		pos += 1 + length
	}

	if len(domain) == 0 {
		return "", false
	}
	return string(domain), true
}
