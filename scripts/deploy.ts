import { ethers } from "hardhat";

async function main() {
	// get signer
	const [deployer] = await ethers.getSigners();
	const ngnToken = "0xBcccFFe91e3e9fC289ce6179A8BBF4b351579233";
	// log the deployer address
	console.log("Deploying the contracts with the account:", deployer.address);
	const NigeriaGovernment = await ethers.getContractFactory(
		"NigeriaGovernment"
	);
	const NGNToken = await ethers.getContractFactory("NGNToken");
	// const ngnTokenContract = await NGNToken.deploy();
	// await ngnTokenContract.deployed();
	// console.log("NGNToken deployed to:", await ngnTokenContract.getAddress());

	const nigeriaGovernment = await NigeriaGovernment.deploy(
		deployer.address,
		deployer.address,
		ngnToken,
	);
	// await nigeriaGovernment.deployed([
	// 	deployer.address,
	// 	deployer.address,
	// 	ngnTokenContract.address,
	// ]);
	console.log("NigeriaGovernment deployed to:", await nigeriaGovernment.getAddress());
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
