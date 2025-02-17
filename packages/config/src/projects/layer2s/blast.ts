import { assert, EthereumAddress, UnixTime } from '@l2beat/shared-pure'

import { EXITS } from '../../common'
import { ProjectDiscovery } from '../../discovery/ProjectDiscovery'
import { opStackL2 } from './templates/opStack'
import { Layer2 } from './types'

const discovery = new ProjectDiscovery('blast')

const upgradeability = {
  upgradableBy: ['ProxyAdmin'],
  upgradeDelay: 'No delay',
}

const optimismPortalImplementation =
  discovery.getContract('OptimismPortal').implementations?.[0]
const l2OutputOracleImplementation =
  discovery.getContract('L2OutputOracle').implementations?.[0]

assert(optimismPortalImplementation, 'OptimismPortal implementation not found')
assert(l2OutputOracleImplementation, 'L2OutputOracle implementation not found')

export const blast: Layer2 = opStackL2({
  discovery,
  display: {
    name: 'Blast',
    slug: 'blast',
    description:
      'Blast is an EVM-compatible Optimistic Rollup supporting native yield. It invests funds deposited into the L1 bridge into various DeFi protocols transferring yield back to the L2.',
    purposes: ['Universal', 'DeFi'],
    links: {
      websites: ['https://blast.io/en'],
      apps: [
        'https://blast.io/en/airdrop/early-access',
        'https://blast.io/en/bridge',
      ],
      documentation: ['https://docs.blast.io/about-blast'],
      explorers: ['https://blastscan.io', 'https://blastexplorer.io'],
      repositories: [],
      socialMedia: ['https://twitter.com/Blast_L2'],
    },
    activityDataSource: 'Blockchain RPC',
    tvlWarning: {
      content: 'The TVL does account for rehypothecated tokens.',
      sentiment: 'bad',
    },
  },
  nonTemplateTechnology: {
    exitMechanisms: [
      {
        ...EXITS.REGULAR_YIELDING(
          'optimistic',
          discovery.getContractValue<number>(
            'L2OutputOracle',
            'FINALIZATION_PERIOD_SECONDS',
          ),
        ),
        references: [
          {
            text: 'OptimismPortal.sol - Etherscan source code, proveWithdrawalTransaction function',
            href: `https://etherscan.io/address/${optimismPortalImplementation.toString()}#code`,
          },
          {
            text: 'OptimismPortal.sol - Etherscan source code, finalizeWithdrawalTransaction function',
            href: `https://etherscan.io/address/${optimismPortalImplementation.toString()}#code`,
          },
          {
            text: 'L2OutputOracle.sol - Etherscan source code, PROPOSER check',
            href: `https://etherscan.io/address/${l2OutputOracleImplementation.toString()}#code`,
          },
        ],
        risks: [EXITS.RISK_REHYPOTHECATED_ASSETS, EXITS.RISK_LACK_OF_LIQUIDITY],
      },
      {
        ...EXITS.FORCED('all-withdrawals'),
        references: [
          {
            text: 'Forced withdrawal from an OP Stack blockchain',
            href: 'https://stack.optimism.io/docs/security/forced-withdrawal/',
          },
        ],
      },
    ],
  },
  upgradeability,
  rpcUrl: 'https://rpc.blast.io/',
  chainConfig: {
    name: 'blast',
    chainId: 81457,
    explorerUrl: 'https://blastscan.io/',
    explorerApi: {
      url: 'https://api.blastscan.io/api',
      type: 'etherscan',
    },
    minTimestampForTvl: UnixTime.fromDate(new Date('2024-02-24T21:23:35Z')),
    multicallContracts: [
      {
        address: EthereumAddress('0xcA11bde05977b3631167028862bE2a173976CA11'),
        batchSize: 150,
        sinceBlock: 88189,
        version: '3',
      },
    ],
  },
  finality: {
    type: 'OPStack',
    lag: 0,
    stateUpdate: 'disabled',
  },
  genesisTimestamp: new UnixTime(1708825259), //First sequencer transaction
  nonTemplatePermissions: [
    ...discovery.getMultisigPermission(
      'BlastMultisig',
      'This address is the owner of all upgradable contracts. It is also designated as a Guardian of the OptimismPortal, meaning it can halt withdrawals and as a Challenger. It can upgrade the bridge implementation potentially gaining access to all funds, and change the sequencer, state root proposer or any other system component (unlimited upgrade power).',
    ),
    {
      name: 'SystemConfig owner',
      description:
        'Account privileged to change System Config parameters such as Sequencer Address and gas limit.',
      accounts: [discovery.getPermissionedAccount('SystemConfig', 'owner')],
    },
  ],
  nonTemplateContracts: [
    discovery.getContractDetails('L1BlastBridge', {
      description:
        'The L1 Bridge to Blast with the facility to invest escrowed tokens.',
      ...upgradeability,
    }),
    discovery.getContractDetails('ETHYieldManager', {
      description: 'Contract managing Yield Providers for ETH.',
      ...upgradeability,
    }),
    discovery.getContractDetails('USDYieldManager', {
      description: 'Contract managing Yield Providers for stablecoins.',
      ...upgradeability,
    }),
    discovery.getContractDetails('LidoYieldProvider', {
      description: 'Yield Provider for ETH investing ETH into stETH.',
      ...upgradeability,
    }),
    discovery.getContractDetails('DSRYieldProvider', {
      description:
        'Yield Provider for DAI investing DAI into the MakerDAO DSR.',
      ...upgradeability,
    }),
  ],
  nonTemplateEscrows: [
    discovery.getEscrowDetails({
      address: EthereumAddress('0x5F6AE08B8AeB7078cf2F96AFb089D7c9f51DA47d'),
      name: 'Pre-launch Blast Vault',
      description:
        'Pre-launch Blast Vault that keeps stETH. Funds from this Vault can be migrated to Blast bridge.',
      tokens: ['stETH'],
    }),
    discovery.getEscrowDetails({
      address: EthereumAddress('0x98078db053902644191f93988341E31289E1C8FE'),
      name: 'Interest-bearing ETH Vault',
      tokens: ['ETH', 'stETH'],
      description:
        'Escrow for ETH that is invested into a yield-bearing contracts such as stETH.',
    }),
    discovery.getEscrowDetails({
      address: EthereumAddress('0xa230285d5683C74935aD14c446e137c8c8828438'),
      name: 'Interest-bearing DAI Vault',
      tokens: [],
      description:
        'Escrow for DAI that is invested into a yield-bearing contracts such as MakerDAO DSR.',
    }),
  ],
  isNodeAvailable: true,
  nodeSourceLink: 'https://github.com/blast-io/blast',
  stateDerivation: {
    nodeSoftware:
      'Node software can be found [here](https://github.com/blast-io/blast).',
    compressionScheme:
      'Data batches are compressed using the [zlib](https://github.com/madler/zlib) algorithm with best compression level.',
    genesisState:
      'The genesis file can be found [here](https://github.com/blast-io/deployment/blob/master/mainnet/genesis.json).',
    dataFormat:
      "The format specification of Sequencer's data batches can be found [here](https://blog.oplabs.co/reproduce-bedrock-migration/).",
  },
  milestones: [
    {
      name: 'Blast Network Launch',
      link: 'https://x.com/Blast_L2/status/1763316176263008551?s=20',
      date: '2024-02-29T00:00:00Z',
      description: 'Blast Network is live on mainnet.',
    },
    {
      name: 'Blast upgrades to censor exploiter',
      link: 'https://x.com/miszke_eth/status/1772946372309737970',
      date: '2024-03-26T00:00:00Z',
      description:
        'The Munchables exploiter is prohibited from forcing transactions.',
    },
  ],
})
