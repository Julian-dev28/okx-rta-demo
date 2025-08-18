# OKX X Layer RTA Demo

A comprehensive benchmarking suite for X Layer's Realtime API (RTA) feature, comparing RPC polling performance against WebSocket subscriptions.

## ⚠️ Important Disclaimer

**Please note that RTA functions will become more readily available as we finalize our chain updates. Some parts of this repository may not work as expected during the migration process. We appreciate your patience as we continue to improve the infrastructure.**

## Overview

This demo showcases the performance differences between traditional RPC polling methods and modern WebSocket subscription approaches for blockchain transaction monitoring. The benchmark tests various scenarios:

- **RPC Polling**: Compares `pending` vs `latest` transaction state retrieval
- **WebSocket Subscriptions**: Tests `realtime` and `newHeads` subscription performance

## Features

- Real-time transaction monitoring via WebSocket subscriptions
- RPC polling performance comparison (pending vs latest)
- Transaction state change detection
- Comprehensive timing and performance metrics
- Color-coded console output for easy result interpretation

## Requirements

- Node.js (v14 or higher)
- npm or yarn
- Access to X Layer testnet

## Installation

```bash
npm install
```

## Configuration

The demo connects to the following endpoints:

- **RTA Endpoint**: `https://testrpc.xlayer.tech/terigon-rta`
- **WebSocket Endpoint**: `wss://testws.xlayer.tech/unlimited/abc`

## Usage

### Running the Complete Benchmark

```bash
npm test
```

or

```bash
node rta-test.js
```

### Development Mode

```bash
npm run dev
```

## What the Benchmark Tests

### RPC Polling Tests (Transactions 1-2)
- Sends test transactions to the network
- Monitors nonce changes using both `pending` and `latest` tags
- Measures time-to-detection for state changes
- Calculates average improvement of `pending` over `latest`

### WebSocket Subscription Tests (Transactions 3-4)
- Establishes WebSocket connections to the RTA endpoint
- Subscribes to `realtime` events with transaction details
- Subscribes to `newHeads` for block updates
- Tracks real-time message reception and timing

## Expected Output

The benchmark provides detailed console output including:

- Transaction confirmation times
- RPC polling performance metrics
- WebSocket subscription message counts
- Performance comparisons and improvements

### Sample Output

```
========================================================================
OKX X LAYER RTA BENCHMARK: RPC Polling vs WebSocket Subscriptions
========================================================================

✓ Initial balance: 99.987600 ETH (nonce: 4)

TRANSACTION 1: RPC Polling Test (pending vs latest)
Sending 0.001 ETH transaction...
✓ TX1 sent: 0xefe93353b089d8d33e694f4b24c63c0738a7f5e570f94941ab8ff618507d3f81
Racing: pending vs latest nonce updates...
🟢 TX1 PENDING: 360ms
🟡 TX1 LATEST: 12371ms

TRANSACTION 2: RPC Polling Test (pending vs latest)
✓ TX2 nonce: 0x5
Sending 0.001 ETH transaction...
✓ TX2 sent: 0x2e5b37c87f63f1e1a72d45e5ce2c5649d359476f27c139626a85a2bdf89a8655
Racing: pending vs latest nonce updates...
🟢 TX2 PENDING: 385ms
🟡 TX2 LATEST: 8306ms

WEBSOCKET SETUP: Creating realtime and newHeads subscriptions
✓ WebSocket connected
✓ Both subscriptions active

TRANSACTION 3: WebSocket Subscription Test
Sending 0.001 ETH transaction...
✓ TX3 sent: 0x9efd29bffcaaa052d4d999c18c091548ce734e328457a28a561e24b6b4dae3ad
Waiting for subscription data...
🚀 REALTIME subscription received:
{
  "TxHash": "0x9efd29bffcaaa052d4d999c18c091548ce734e328457a28a561e24b6b4dae3ad",
  "TxData": {
    "type": "0x0",
    "nonce": "0x6",
    "gasPrice": "0x174876e800",
    "maxFeePerGas": null,
    "maxPriorityFeePerGas": null,
    "gas": "0x5208",
    "value": "0x38d7ea4c68000",
    "input": "0x",
    "v": "0xf63",
    "r": "0x3ad069b5150d7a4a8f638389cb83fbc291d785baaedefc1c67af83cd7f1f4277",
    "s": "0x78febae12d69b50ebbaa606e87115edda49726be884346ef4b7be09cb2a4a415",
    "to": "0xe78c7f08d36b1f0f73328d95656f5b135fb2503d",
    "chainId": "0x7a0",
    "hash": "0x9efd29bffcaaa052d4d999c18c091548ce734e328457a28a561e24b6b4dae3ad"
  },
  "Receipt": {
    "root": "0x",
    "status": "0x1",
    "cumulativeGasUsed": "0x5208",
    "logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "logs": [],
    "transactionHash": "0x9efd29bffcaaa052d4d999c18c091548ce734e328457a28a561e24b6b4dae3ad",
    "contractAddress": "0x0000000000000000000000000000000000000000",
    "gasUsed": "0x5208",
    "blockHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
    "blockNumber": "0x1c44bb",
    "transactionIndex": "0x0"
  }
}

TRANSACTION 4: WebSocket Subscription Test
Sending 0.001 ETH transaction...
✓ TX4 sent: 0x482f30da95bbe16fa63cf79c37d339a22c49c3d3d37d1de1c00d15a48e9b799a
Waiting for subscription data...
🚀 REALTIME subscription received:
{
  "TxHash": "0x482f30da95bbe16fa63cf79c37d339a22c49c3d3d37d1de1c00d15a48e9b799a",
  "TxData": {
    "type": "0x0",
    "nonce": "0x7",
    "gasPrice": "0x174876e800",
    "maxFeePerGas": null,
    "maxPriorityFeePerGas": null,
    "gas": "0x5208",
    "value": "0x38d7ea4c68000",
    "input": "0x",
    "v": "0xf63",
    "r": "0x604ab3c1e99bb92d27a07d23ddd1d189f413078212aa116c17633e1d5b03042",
    "s": "0x1b544dde7281b82a59d0921f8fbdcefd074d30eb088a22d5e1b65b2df7bcdf39",
    "to": "0xe78c7f08d36b1f0f73328d95656f5b135fb2503d",
    "chainId": "0x7a0",
    "hash": "0x482f30da95bbe16fa63cf79c37d339a22c49c3d3d37d1de1c00d15a48e9b799a"
  },
  "Receipt": {
    "root": "0x",
    "status": "0x1",
    "cumulativeGasUsed": "0x5208",
    "logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "logs": [],
    "transactionHash": "0x482f30da95bbe16fa63cf79c37d339a22c49c3d3d37d1de1c00d15a48e9b799a",
    "contractAddress": "0x0000000000000000000000000000000000000000",
    "gasUsed": "0x5208",
    "blockHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
    "blockNumber": "0x1c44bd",
    "transactionIndex": "0x0"
  }
}

================ BENCHMARK RESULTS ================
RPC POLLING RESULTS (TX1 & TX2):
TX1 PENDING: 360ms
TX1 LATEST: 12371ms
TX2 PENDING: 385ms
TX2 LATEST: 8306ms

⚡ RPC POLLING: Pending 373ms vs Latest 10339ms
⚡ IMPROVEMENT: 9966ms faster (96.4% improvement)

WEBSOCKET SUBSCRIPTION RESULTS (TX3 & TX4):
Realtime messages received: 2
NewHeads messages received: 0
```

## Dependencies

- **ethers.js**: Ethereum library for transaction handling
- **ws**: WebSocket client for subscription management
- Built-in Node.js modules for HTTP/HTTPS requests

## Architecture

The demo is structured with:

- `makeRpcCall()`: Generic RPC request handler
- `sendTransaction()`: Ethereum transaction sender
- `pollUntilNonceChange()`: Nonce change detection
- `SubscriptionManager`: WebSocket subscription management class

## License

MIT License - see package.json for details

## Contributing

This is a demonstration repository for X Layer's RTA capabilities. For issues or questions regarding the RTA functionality, please contact the X Layer team.

---

*Generated for the X Layer ecosystem to demonstrate real-time blockchain API capabilities.*
