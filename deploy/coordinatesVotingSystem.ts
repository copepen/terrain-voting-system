import hre from "hardhat";
import { Logger } from "tslog";
import "@nomiclabs/hardhat-ethers";
import { verify } from "../utils";
import { coordinatesVotingSystemArgs } from "../config/construct-arguments";

const log: Logger = new Logger();
const contractName = "CoordinatesVotingSystem";
const coordinatesVotingSystemArgValues = Object.values(
  coordinatesVotingSystemArgs
);

async function deploy() {
  log.info(`Deploying "${contractName}" on network: ${hre.network.name}`);
  const deployContract = await hre.ethers.getContractFactory(contractName);

  const deployContractInstance = await deployContract.deploy(
    coordinatesVotingSystemArgs.x1,
    coordinatesVotingSystemArgs.x2,
    coordinatesVotingSystemArgs.y1,
    coordinatesVotingSystemArgs.y2
  );

  await deployContractInstance.deployed();
  const deployContractAddress = deployContractInstance.address;
  log.info(
    `"${contractName}" was successfully deployed on network: ${hre.network.name}, address: ${deployContractAddress}`
  );
  return { deployedAddr: deployContractAddress };
}

async function main() {
  const { deployedAddr } = await deploy();
  await verify({
    contractName,
    address: deployedAddr,
    constructorArguments: coordinatesVotingSystemArgValues,
    contractPath:
      "contracts/CoordinatesVotingSystem.sol:CoordinatesVotingSystem",
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
