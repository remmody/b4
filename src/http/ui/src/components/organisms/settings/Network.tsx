import { Domain as DomainIcon } from "@mui/icons-material";
import B4Section from "@molecules/common/B4Section";
import { B4FormGroup } from "@molecules/common/B4FormGroup";
import B4TextField from "@atoms/common/B4TextField";
import B4Slider from "@atoms/common/B4Slider";
import { B4Config } from "@models/Config";

interface NetworkSettingsProps {
  config: B4Config;
  onChange: (field: string, value: number) => void;
}

export const NetworkSettings: React.FC<NetworkSettingsProps> = ({
  config,
  onChange,
}) => (
  <B4Section
    title="Network Configuration"
    description="Configure netfilter queue and network processing parameters"
    icon={<DomainIcon />}
  >
    <B4FormGroup label="Queue Settings" columns={2}>
      <B4TextField
        label="Queue Start Number"
        type="number"
        value={config.queue.start_num}
        onChange={(e) => onChange("queue.start_num", Number(e.target.value))}
        helperText="Netfilter queue number (0-65535)"
      />
      <B4Slider
        label="Worker Threads"
        value={config.queue.threads}
        onChange={(value) => onChange("queue.threads", value)}
        min={1}
        max={16}
        step={1}
        helperText="Number of worker threads for processing packets simultaneously (default 4)"
      />
    </B4FormGroup>

    <B4FormGroup label="Connection Limits" columns={2}>
      <B4Slider
        label="TCP Connection Bytes Limit"
        value={config.bypass.tcp.conn_bytes_limit}
        onChange={(value) => onChange("bypass.tcp.conn_bytes_limit", value)}
        min={1}
        max={100}
        step={1}
        helperText="Connection bytes limit for TCP (default 19)"
      />
      <B4Slider
        label="UDP Connection Bytes Limit"
        value={config.bypass.udp.conn_bytes_limit}
        onChange={(value) => onChange("bypass.udp.conn_bytes_limit", value)}
        min={1}
        max={50}
        step={1}
        helperText="Connection bytes limit for UDP (default 8)"
      />
    </B4FormGroup>
  </B4Section>
);
