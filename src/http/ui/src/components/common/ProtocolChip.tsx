import { TcpIcon, UdpIcon } from "@b4.icons";
import { B4Badge } from "@b4.elements";

interface ProtocolChipProps {
  protocol: "TCP" | "UDP" | "P-TCP" | "P-UDP";
}

export const ProtocolChip = ({ protocol }: ProtocolChipProps) => {
  // P-TCP and P-UDP use same icons as TCP and UDP
  const baseProtocol = protocol.replace("P-", "") as "TCP" | "UDP";
  const icon = baseProtocol === "TCP" ? <TcpIcon /> : <UdpIcon />;

  return (
    <B4Badge
      icon={icon}
      label={protocol}
      variant="outlined"
      color={baseProtocol === "TCP" ? "primary" : "secondary"}
    />
  );
};
