import { Box, Fade } from "@mui/material";
import { useState, type ReactNode } from "react";
import { B4SetConfig } from "@models/config";
import { B4Tabs, B4Tab, B4Section } from "@b4.elements";
import { TcpIcon, FragIcon, FakingIcon, ConnectionIcon } from "@b4.icons";
import { TcpConnection } from "./TcpConnection";
import { TcpSplitting } from "./TcpSplitting";
import { TcpFaking } from "./TcpFaking";
import { TcpIncoming } from "./TcpIncoming";

interface TcpTabContainerProps {
  config: B4SetConfig;
  main: B4SetConfig;
  onChange: (
    field: string,
    value: string | number | boolean | string[] | number[],
  ) => void;
}

interface TabPanelProps {
  children?: ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: Readonly<TabPanelProps>) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tcp-tabpanel-${index}`}
      aria-labelledby={`tcp-tab-${index}`}
    >
      {value === index && (
        <Fade in>
          <Box sx={{ pt: 2 }}>{children}</Box>
        </Fade>
      )}
    </div>
  );
}

enum TCP_TABS {
  CONNECTION = 0,
  SPLITTING,
  FAKING,
  INCOMING,
}

export const TcpTabContainer = ({
  config,
  main,
  onChange,
}: TcpTabContainerProps) => {
  const [activeTab, setActiveTab] = useState<TCP_TABS>(TCP_TABS.CONNECTION);

  return (
    <B4Section
      title="TCP Configuration"
      description="Configure TCP packet handling and DPI bypass techniques"
      icon={<TcpIcon />}
    >
      <B4Tabs
        value={activeTab}
        onChange={(_, v: number) => {
          setActiveTab(v);
        }}
      >
        <B4Tab icon={<ConnectionIcon />} label="Connection" inline />
        <B4Tab icon={<FragIcon />} label="Splitting" inline />
        <B4Tab icon={<FakingIcon />} label="Faking" inline />
        <B4Tab icon={<TcpIcon />} label="Incoming" inline />
      </B4Tabs>

      <TabPanel value={activeTab} index={TCP_TABS.CONNECTION}>
        <TcpConnection config={config} main={main} onChange={onChange} />
      </TabPanel>

      <TabPanel value={activeTab} index={TCP_TABS.SPLITTING}>
        <TcpSplitting config={config} onChange={onChange} />
      </TabPanel>

      <TabPanel value={activeTab} index={TCP_TABS.FAKING}>
        <TcpFaking config={config} onChange={onChange} />
      </TabPanel>

      <TabPanel value={activeTab} index={TCP_TABS.INCOMING}>
        <TcpIncoming config={config} onChange={onChange} />
      </TabPanel>
    </B4Section>
  );
};
