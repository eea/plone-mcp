import { type XmcpConfig } from "xmcp";

const config: XmcpConfig = {
  http: true,
  stdio: true,
  paths: {
    tools: "./src/tools",
    prompts: "./src/prompts",
    resources: "./src/resources",
  },
};

export default config;
