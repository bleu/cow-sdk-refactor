import { Abi } from "@cowprotocol/common";
/**
 * The contract used to deploy contracts deterministically with CREATE2.
 * The address is chosen by the hardhat-deploy library.
 * It is the same in any EVM-based network.
 *
 * https://github.com/Arachnid/deterministic-deployment-proxy
 */
export const DEPLOYER_CONTRACT = "0x4e59b44847b379578588920ca78fbf26c0b4956c";

/**
 * Dictionary containing all deployed contract names.
 */
export const CONTRACT_NAMES = {
  authenticator: "GPv2AllowListAuthentication",
  settlement: "GPv2Settlement",
} as const;

/**
 * The name of a deployed contract.
 */
export type ContractName = (typeof CONTRACT_NAMES)[keyof typeof CONTRACT_NAMES];

/**
 * The deployment args for a contract.
 */
export type DeploymentArguments<T> =
  T extends typeof CONTRACT_NAMES.authenticator
    ? never
    : T extends typeof CONTRACT_NAMES.settlement
      ? [string, string]
      : unknown[];

/**
 * Allowed ABI definition types by Ethers.js.
 */

/**
 * Artifact information important for computing deterministic deployments.
 */
export interface ArtifactDeployment {
  abi: Abi;
  bytecode: string;
}

/**
 * An artifact with a contract name matching one of the deterministically
 * deployed contracts.
 */
export interface NamedArtifactDeployment<C extends ContractName>
  extends ArtifactDeployment {
  contractName: C;
}

export type MaybeNamedArtifactArtifactDeployment<C> = C extends ContractName
  ? NamedArtifactDeployment<C>
  : ArtifactDeployment;
