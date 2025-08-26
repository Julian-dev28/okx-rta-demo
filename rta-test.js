#!/usr/bin/env node

/**
 * X Layer RTA RPC Polling Performance Test
 * 
 * Tests RPC polling performance for transaction receipt detection on X Layer
 * 
 * Testing methodology:
 * - Tests "pending" vs "latest" tags with eth_getTransactionReceipt
 * - Measures time to detect transaction receipts via repeated API calls (100ms intervals)
 * - Sends multiple transactions to validate consistency
 * 
 * Key technical differences tested:
 * - "Pending" tag: attempts to detect receipts before mining completion
 * - "Latest" tag: detects receipts after mining completion
 * - Performance comparison between tag behaviors
 */

const https = require('https');
const http = require('http');

// X Layer RTA endpoint for testing
// Supports both "pending" (pre-mining) and "latest" (post-mining) state queries
const RTA_ENDPOINT = "https://testrpc.xlayer.tech/terigon-rta";

// Test keys (provided)
const PUBLIC_KEY = "your_public_key_here";
const PRIVATE_KEY = "your_private_key_here";
const TEST_RECIPIENT = "test_address";

// Colors for output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
};

// Core RPC function: Handles JSON-RPC calls to X Layer endpoint
// Used for: balance checks, nonce polling, transaction broadcasting
// Handles response parsing and error management
async function makeRpcCall(endpoint, method, params, id = Math.floor(Math.random() * 10000)) {
    const data = JSON.stringify({
        jsonrpc: "2.0",
        method: method,
        params: params,
        id: id
    });

    const url = new URL(endpoint);
    const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    };

    return new Promise((resolve, reject) => {
        const req = (url.protocol === 'https:' ? https : http).request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    resolve(body);
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

// Transaction broadcasting function: Creates and sends real blockchain transactions
// Uses ethers.js for wallet management, transaction signing, and gas estimation
// Generates actual on-chain events to measure detection performance timing
async function sendTransaction(fromPrivateKey, toAddress, valueInEther) {
    try {
        const { ethers } = require('ethers');
        
        const provider = new ethers.JsonRpcProvider(RTA_ENDPOINT);
        const wallet = new ethers.Wallet(fromPrivateKey, provider);
        
        const nonce = await wallet.getNonce();
        
        const tx = {
            to: toAddress,
            value: ethers.parseEther(valueInEther.toString()),
            nonce: nonce,
            gasLimit: 21000,
            gasPrice: ethers.parseUnits('100', 'gwei')
        };
        
        console.log(`${colors.cyan}Sending ${valueInEther} ETH transaction...${colors.reset}`);
        
        const signedTx = await wallet.sendTransaction(tx);
        
        return {
            success: true,
            txHash: signedTx.hash,
            from: wallet.address,
            to: toAddress,
            value: valueInEther,
            nonce: nonce
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// Transaction receipt polling function: Monitors transaction receipt availability 
// Polls every 100ms until transaction receipt is found or timeout occurs
// Tests timing difference between "pending" (pre-mining) vs "latest" (post-mining) detection
async function pollUntilTransactionReceipt(endpoint, transactionHash, tag, maxWaitMs = 60000) {
    const startTime = Date.now();
    const pollInterval = 100;
    
    while (Date.now() - startTime < maxWaitMs) {
        // Test if X Layer supports block tags with eth_getTransactionReceipt
        // Standard method is just [transactionHash], but X Layer might support [transactionHash, blockTag]
        const params = tag === "receipt" ? [transactionHash] : [transactionHash, tag];
        const response = await makeRpcCall(endpoint, "eth_getTransactionReceipt", params);
        
        if (response.result) {
            const timeToDetect = Date.now() - startTime;
            return {
                success: true,
                receipt: response.result,
                timeToChangeMs: timeToDetect,
                tag: tag
            };
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    return {
        success: false,
        timeToChangeMs: maxWaitMs,
        tag: tag,
        message: "Timeout waiting for transaction receipt"
    };
}


// Main test function: Coordinates RPC polling performance testing
// Phase 1: Setup and initial state - Balance verification
// Phase 2: RPC polling tests (TX1 & TX2) - "pending" vs "latest" receipt detection
// Phase 3: Results analysis - Performance metrics and timing differences
async function main() {
    console.log(`${colors.blue}========================================================================`);
    console.log("OKX X LAYER RTA BENCHMARK: RPC Polling Performance Test");
    console.log(`========================================================================${colors.reset}`);
    console.log("");
    
    try {
        const initialBalanceResponse = await makeRpcCall(RTA_ENDPOINT, "eth_getBalance", [PUBLIC_KEY, "pending"]);
        const initialBalanceEther = parseInt(initialBalanceResponse.result, 16) / 1e18;
        
        console.log(`${colors.green}✓ Initial balance: ${initialBalanceEther.toFixed(6)} ETH${colors.reset}`);
        console.log("");
        
        const pollingResults = [];
        
        // TX1: RPC POLLING TEST - Transaction receipt detection with pending vs latest tags
        // Tests: How quickly transaction receipts can be detected via API polling
        // Key Measurement: Time from transaction broadcast to receipt availability
        console.log(`${colors.blue}TRANSACTION 1: RPC Polling Test (pending vs latest)${colors.reset}`);
        
        const txResult1 = await sendTransaction(PRIVATE_KEY, TEST_RECIPIENT, 0.001);
        
        if (!txResult1.success) {
            console.log(`${colors.red}TX1 failed: ${txResult1.error}${colors.reset}`);
            return;
        }
        
        console.log(`${colors.green}✓ TX1 sent: ${txResult1.txHash}${colors.reset}`);
        console.log(`${colors.cyan}Polling for transaction receipt with pending vs latest tags...${colors.reset}`);
        
        const [pendingResult1, latestResult1] = await Promise.allSettled([
            pollUntilTransactionReceipt(RTA_ENDPOINT, txResult1.txHash, "pending", 30000),
            pollUntilTransactionReceipt(RTA_ENDPOINT, txResult1.txHash, "latest", 30000)
        ]);
        
        if (pendingResult1.status === 'fulfilled' && pendingResult1.value.success) {
            console.log(`${colors.green}🟢 TX1 PENDING: ${pendingResult1.value.timeToChangeMs}ms${colors.reset}`);
            pollingResults.push({ tx: 1, type: 'pending', time: pendingResult1.value.timeToChangeMs });
        }
        
        if (latestResult1.status === 'fulfilled' && latestResult1.value.success) {
            console.log(`${colors.yellow}🟡 TX1 LATEST: ${latestResult1.value.timeToChangeMs}ms${colors.reset}`);
            pollingResults.push({ tx: 1, type: 'latest', time: latestResult1.value.timeToChangeMs });
        }

        // TX2: RPC POLLING TEST - Second iteration for statistical reliability
        // Purpose: Validates consistency of RPC polling performance measurements
        console.log("");
        console.log(`${colors.blue}TRANSACTION 2: RPC Polling Test${colors.reset}`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const txResult2 = await sendTransaction(PRIVATE_KEY, TEST_RECIPIENT, 0.001);
        if (txResult2.success) {
            console.log(`${colors.green}✓ TX2 sent: ${txResult2.txHash}${colors.reset}`);
            console.log(`${colors.cyan}Polling for transaction receipt with pending vs latest tags...${colors.reset}`);
            
            const [pendingResult2, latestResult2] = await Promise.allSettled([
                pollUntilTransactionReceipt(RTA_ENDPOINT, txResult2.txHash, "pending", 30000),
                pollUntilTransactionReceipt(RTA_ENDPOINT, txResult2.txHash, "latest", 30000)
            ]);
            
            if (pendingResult2.status === 'fulfilled' && pendingResult2.value.success) {
                console.log(`${colors.green}🟢 TX2 PENDING: ${pendingResult2.value.timeToChangeMs}ms${colors.reset}`);
                pollingResults.push({ tx: 2, type: 'pending', time: pendingResult2.value.timeToChangeMs });
            }
            
            if (latestResult2.status === 'fulfilled' && latestResult2.value.success) {
                console.log(`${colors.yellow}🟡 TX2 LATEST: ${latestResult2.value.timeToChangeMs}ms${colors.reset}`);
                pollingResults.push({ tx: 2, type: 'latest', time: latestResult2.value.timeToChangeMs });
            }
        }
        
        
        console.log("");
        // RESULTS ANALYSIS SECTION - Transaction receipt polling performance
        // Analysis: "pending" vs "latest" receipt detection timing via RPC polling
        // Key Metrics: Time from broadcast to receipt availability with different tags
        console.log(`${colors.blue}================ BENCHMARK RESULTS ================${colors.reset}`);
        
        // Show polling results
        console.log(`${colors.cyan}TRANSACTION RECEIPT POLLING RESULTS (TX1 & TX2):${colors.reset}`);
        pollingResults.forEach(result => {
            const color = result.type === 'pending' ? colors.green : colors.yellow;
            console.log(`${color}TX${result.tx} ${result.type.toUpperCase()}: ${result.time}ms${colors.reset}`);
        });
        
        // Statistical analysis: Calculate average performance metrics for both tags
        const pendingTimes = pollingResults.filter(r => r.type === 'pending').map(r => r.time);
        const latestTimes = pollingResults.filter(r => r.type === 'latest').map(r => r.time);
        
        if (pendingTimes.length > 0 && latestTimes.length > 0) {
            const avgPending = pendingTimes.reduce((sum, time) => sum + time, 0) / pendingTimes.length;
            const avgLatest = latestTimes.reduce((sum, time) => sum + time, 0) / latestTimes.length;
            const improvement = avgLatest - avgPending;
            
            console.log("");
            console.log(`${colors.green}⚡ RECEIPT POLLING: Pending ${avgPending.toFixed(0)}ms vs Latest ${avgLatest.toFixed(0)}ms`);
            console.log(`⚡ IMPROVEMENT: ${improvement.toFixed(0)}ms faster (${((improvement/avgLatest)*100).toFixed(1)}% improvement)${colors.reset}`);
        }
        
    } catch (error) {
        console.log(`${colors.red}Error in benchmark: ${error.message}${colors.reset}`);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
        process.exit(1);
    });
}
