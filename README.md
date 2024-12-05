# Rewards Market System

A comprehensive decentralized rewards system featuring campaign management, token staking, and configurable reward distributions. Built with security and flexibility in mind, this system enables complex reward campaigns with customizable mechanics.

## Core Contracts

### RewardsMarket.sol
A sophisticated campaign management system that enables configurable reward distributions through token burning or spending mechanics.

#### Key Features
- **Campaign Management**
  - Create campaigns with customizable parameters
  - Modify existing campaign configurations 
  - Deactivate campaigns when needed
  - Support for both time-limited and unlimited duration campaigns
  - Maximum reward caps with tracking
  - Campaign activity status tracking

- **Token Mechanics**
  - Support for native RewardToken burning
  - Integration with any ERC20 token
  - Configurable token recipient (burn or transfer)
  - Safe token transfer handling via OpenZeppelin's SafeERC20

- **Security Features**
  - ReentrancyGuard implementation
  - Pausable functionality for emergency stops
  - Owner-controlled administrative functions
  - Token recovery for mistakenly sent tokens
  - Comprehensive input validation

- **Campaign Querying**
  - Efficient pagination support
  - Active/Inactive campaign filtering
  - Detailed campaign information retrieval
  - User participation tracking

#### Campaign Structure
```solidity
struct Campaign {
  uint256 minBurnAmount;    // Minimum tokens required
  uint256 endDate;          // Campaign end timestamp
  uint256 maxRewards;       // Maximum reward limit
  uint256 rewardsIssued;    // Current reward count
  address targetContract;    // External contract for rewards
  bytes targetCalldata;     // External call configuration
  bool isActive;            // Campaign status
  uint256 createdAt;        // Creation timestamp
  address tokenAddress;      // Token to be spent
  address recipientAddress; // Token recipient
}
```

### RewardToken.sol
An ERC20 token implementation specifically designed for the rewards system.

#### Features
- **Token Standards**
  - ERC20 compliant
  - Burnable token functionality
  - Permit functionality for gasless approvals

- **Access Control**
  - Role-based access control system
  - Configurable minting permissions
  - Controlled burning mechanics

- **Integration Features**
  - Seamless integration with RewardsMarket
  - Burn-from capability for campaign mechanics
  - Supply tracking and management

### StakingVault.sol
A flexible staking system that manages token deposits and rewards distribution.

#### Key Features
- **Staking Mechanics**
  - Flexible stake duration configuration
  - Minimum/maximum stake amounts
  - Stake locking with time constraints
  - Early withdrawal penalties

- **Reward System**
  - Time-based reward calculation
  - Configurable reward rates
  - Compound interest mechanics
  - Reward boost multipliers

- **Security Features**
  - Emergency withdrawal system
  - Rate limiting on critical functions
  - Slippage protection
  - Reentrancy protection

## Development Commands

### Installation & Setup
```bash
# Install dependencies
yarn install

# Generate TypeChain types
yarn typechain

# Compile contracts
yarn compile
```

### Testing
```bash
# Run all tests
yarn test

# Run tests with gas reporting
yarn test:gas

# Run tests with coverage
yarn coverage

# Run specific test file
yarn test test/RewardsMarket.test.ts

# Run tests in watch mode
yarn test:watch
```

### Deployment
```bash
# Deploy to local network
yarn deploy:local

# Deploy to Base Sepolia testnet
yarn deploy:base-sepolia

# Verify contract source code
yarn verify:base-sepolia

# Deploy with specific parameters
yarn deploy:local --network localhost --tags RewardsMarket
```

### Code Quality
```bash
# Run all linters
yarn lint

# Solidity linting
yarn lint:sol

# TypeScript linting
yarn lint:ts

# Fix auto-fixable issues
yarn lint:fix

# Format code
yarn format
```

### Local Development
```bash
# Start local hardhat network
yarn network

# Start with mainnet fork
yarn network:fork

# Clear cache and artifacts
yarn clean

# Full cleanup including node_modules
yarn clean:full
```

### Utility Scripts
```bash
# List account information
yarn accounts

# Generate documentation
yarn docgen

# Flatten contracts
yarn flatten
```

## Development Environment

### Core Tools
- Hardhat v2.19.x
- TypeScript v5.x
- Ethers.js v6.x
- OpenZeppelin Contracts v5.x

### Testing Framework
- Chai for assertions
- Hardhat-deploy for deployment testing
- Hardhat Network for local blockchain
- Solidity Coverage for test coverage
- Gas Reporter for optimization

### Code Quality Tools
- Solhint for Solidity linting
- ESLint for TypeScript
- Prettier for formatting
- TypeChain for type safety

## Security Considerations

### Smart Contract Security
- Comprehensive reentrancy protection
- Secure token handling patterns
- Access control implementation
- Emergency pause functionality
- Rate limiting on sensitive operations

### Best Practices
- Pull over push payment patterns
- Check-Effects-Interactions pattern
- Secure math operations
- Gas optimization techniques
- Extensive input validation

### Audit Status
- Internal security review completed
- External audit pending
- Bug bounty program planned

## License

MIT

## Contributing

Contributions are welcome! Please check our contributing guidelines for details.