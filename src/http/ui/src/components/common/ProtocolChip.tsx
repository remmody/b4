import { TcpIcon, UdpIcon } from "@b4.icons";
import { B4Badge } from "@b4.elements";

interface ProtocolChipProps {
  protocol: "TCP" | "UDP";
}

export const ProtocolChip = ({ protocol }: ProtocolChipProps) => {
  const icon = protocol === "TCP" ? <TcpIcon /> : <UdpIcon />;

  return (
    <B4Badge
      icon={icon}
      label={protocol}
      variant="outlined"
      color={protocol === "TCP" ? "primary" : "secondary"}
    />
  );
};
