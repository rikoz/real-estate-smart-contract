import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "@openzeppelin/hardhat-upgrades";
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
	defaultNetwork: "hardhat",

	solidity: {
		version: "0.8.24",
		settings: {
			optimizer: {
				enabled: true,
				runs: 1,
			},
			evmVersion: "london",
		},
	},

	networks: {
		sepolia: {
			url: process.env.SEPOLIA_MAINNET_URL || "",
			accounts:
				process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
		},
	},
	etherscan: {
		apiKey: {
			sepolia: process.env.ETHERSCAN_API || "R8YVUNZZ67E8HYN4RZBYSD8662NR37YER9",
		},
	},
};

export default config;
