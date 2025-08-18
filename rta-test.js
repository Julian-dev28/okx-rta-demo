#!/usr/bin/env node

// OKX X Layer RTA Demo - Complete Benchmark
// Demonstrates RPC polling vs WebSocket subscriptions (realtime vs newHeads)

const https = require('https');
const http = require('http');
const WebSocket = require('ws');

// Configuration
const RTA_ENDPOINT = "https://testrpc.xlayer.tech/terigon-rta";
const WS_ENDPOINT = "wss://testws.xlayer.tech/unlimited/abc";

// Test keys (provided)
const PUBLIC_KEY = "your_public_key_here";
const PRIVATE_KEY = "your_private_key_here";
const TEST_RECIPIENT = "your_test_recipient_address_here";

// Colors for output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
};

// Function to make RPC call
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

// Function to send a real transaction using ethers
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

// Function to continuously poll nonce until change is detected
async function pollUntilNonceChange(endpoint, address, initialNonce, tag, maxWaitMs = 60000) {
    const startTime = Date.now();
    const pollInterval = 100; // Poll every 100ms
    
    while (Date.now() - startTime < maxWaitMs) {
        const response = await makeRpcCall(endpoint, "eth_getTransactionCount", [address, tag]);
        
        if (response.result && response.result !== initialNonce) {
            const timeToChange = Date.now() - startTime;
            return {
                success: true,
                newNonce: response.result,
                timeToChangeMs: timeToChange,
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
        message: "Timeout waiting for nonce change"
    };
}

// WebSocket subscription manager
class SubscriptionManager {
    constructor(wsEndpoint) {
        this.wsEndpoint = wsEndpoint;
        this.ws = null;
        this.subscriptions = new Map();
        this.messageHandlers = new Map();
        this.ourTransactions = new Set();
        this.realtimeData = [];
        this.newHeadsData = [];
    }
    
    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.wsEndpoint);
            
            this.ws.on('open', () => {
                console.log(`${colors.green}✓ WebSocket connected${colors.reset}`);
                resolve();
            });
            
            this.ws.on('message', (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    
                    // Handle subscription confirmations
                    if (msg.result && typeof msg.result === 'string' && msg.result.startsWith('0x')) {
                        this.subscriptions.set(msg.id, msg.result);
                        return;
                    }
                    
                    // Handle subscription messages
                    if (msg.params && msg.params.subscription) {
                        const subId = msg.params.subscription;
                        const result = msg.params.result;
                        
                        // Store data based on subscription type
                        const handler = this.messageHandlers.get(subId);
                        if (handler) {
                            handler(result);
                        }
                    }
                } catch (e) {
                    console.log(`Message parse error: ${e.message}`);
                }
            });
            
            this.ws.on('error', reject);
        });
    }
    
    async subscribeToRealtime() {
        const id = Math.floor(Math.random() * 10000);
        this.ws.send(JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_subscribe",
            params: ["realtime", {
                "NewHeads": false,
                "TransactionExtraInfo": true,
                "TransactionReceipt": true,
                "TransactionInnerTxs": false
            }],
            id: id
        }));
        
        // Set up handler for realtime data
        setTimeout(() => {
            const subId = this.subscriptions.get(id);
            if (subId) {
                this.messageHandlers.set(subId, (result) => {
                    const timestamp = Date.now();
                    this.realtimeData.push({ result, timestamp });
                    if (result.TxHash) {
                        console.log(`${colors.green} REALTIME subscription received:${colors.reset}`);
                        console.log(JSON.stringify(result, null, 2));
                    }
                });
            }
        }, 1000);
        
        return id;
    }
    
    async subscribeToNewHeads() {
        const id = Math.floor(Math.random() * 10000);
        this.ws.send(JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_subscribe",
            params: ["newHeads", {}],
            id: id
        }));
        
        // Set up handler for newHeads data
        setTimeout(() => {
            const subId = this.subscriptions.get(id);
            if (subId) {
                this.messageHandlers.set(subId, (result) => {
                    const timestamp = Date.now();
                    this.newHeadsData.push({ result, timestamp });
                    if (result.number) {
                        const blockNum = parseInt(result.number, 16);
                        console.log(`${colors.yellow}📦 NEWHEADS subscription received block ${blockNum}:${colors.reset}`);
                        console.log(JSON.stringify(result, null, 2));
                    }
                });
            }
        }, 1000);
        
        return id;
    }
    
    trackTransaction(txHash) {
        this.ourTransactions.add(txHash);
    }
    
    close() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

// Main test
async function main() {
    console.log(`${colors.blue}========================================================================`);
    console.log("OKX X LAYER RTA BENCHMARK: RPC Polling vs WebSocket Subscriptions");
    console.log(`========================================================================${colors.reset}`);
    console.log("");
    
    try {
        const initialNonceResponse = await makeRpcCall(RTA_ENDPOINT, "eth_getTransactionCount", [PUBLIC_KEY, "pending"]);
        const initialNonce = initialNonceResponse.result;
        
        const initialBalanceResponse = await makeRpcCall(RTA_ENDPOINT, "eth_getBalance", [PUBLIC_KEY, "pending"]);
        const initialBalanceEther = parseInt(initialBalanceResponse.result, 16) / 1e18;
        
        console.log(`${colors.green}✓ Initial balance: ${initialBalanceEther.toFixed(6)} ETH (nonce: ${parseInt(initialNonce, 16)})${colors.reset}`);
        console.log("");
        
        const pollingResults = [];
        
        // TX1: RPC POLLING TEST
        console.log(`${colors.blue}TRANSACTION 1: RPC Polling Test (pending vs latest)${colors.reset}`);
        
        const txResult1 = await sendTransaction(PRIVATE_KEY, TEST_RECIPIENT, 0.001);
        
        if (!txResult1.success) {
            console.log(`${colors.red}TX1 failed: ${txResult1.error}${colors.reset}`);
            return;
        }
        
        console.log(`${colors.green}✓ TX1 sent: ${txResult1.txHash}${colors.reset}`);
        console.log(`${colors.cyan}Retrieving: pending vs latest nonce updates...${colors.reset}`);
        
        const [pending1Result, latest1Result] = await Promise.allSettled([
            pollUntilNonceChange(RTA_ENDPOINT, txResult1.from, initialNonce, "pending", 30000),
            pollUntilNonceChange(RTA_ENDPOINT, txResult1.from, initialNonce, "latest", 30000)
        ]);
        
        if (pending1Result.status === 'fulfilled' && pending1Result.value.success) {
            console.log(`${colors.green}🟢 TX1 PENDING: ${pending1Result.value.timeToChangeMs}ms${colors.reset}`);
            pollingResults.push({ tx: 1, type: 'pending', time: pending1Result.value.timeToChangeMs });
        }
        
        if (latest1Result.status === 'fulfilled' && latest1Result.value.success) {
            console.log(`${colors.yellow}🟡 TX1 LATEST: ${latest1Result.value.timeToChangeMs}ms${colors.reset}`);
            pollingResults.push({ tx: 1, type: 'latest', time: latest1Result.value.timeToChangeMs });
        }

        // TX2: RPC POLLING TEST
        console.log("");
        console.log(`${colors.blue}TRANSACTION 2: RPC Polling Test (pending vs latest)${colors.reset}`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Get nonce before TX2
        const tx2NonceResponse = await makeRpcCall(RTA_ENDPOINT, "eth_getTransactionCount", [PUBLIC_KEY, "pending"]);
        const tx2InitialNonce = tx2NonceResponse.result;
        console.log(`${colors.green}✓ TX2 nonce: ${tx2InitialNonce}${colors.reset}`);
        
        const txResult2 = await sendTransaction(PRIVATE_KEY, TEST_RECIPIENT, 0.001);
        if (txResult2.success) {
            console.log(`${colors.green}✓ TX2 sent: ${txResult2.txHash}${colors.reset}`);
            console.log(`${colors.cyan}Retrieving: pending vs latest nonce updates...${colors.reset}`);
            
            const [pending2Result, latest2Result] = await Promise.allSettled([
                pollUntilNonceChange(RTA_ENDPOINT, txResult2.from, tx2InitialNonce, "pending", 30000),
                pollUntilNonceChange(RTA_ENDPOINT, txResult2.from, tx2InitialNonce, "latest", 30000)
            ]);
            
            if (pending2Result.status === 'fulfilled' && pending2Result.value.success) {
                console.log(`${colors.green}🟢 TX2 PENDING: ${pending2Result.value.timeToChangeMs}ms${colors.reset}`);
                pollingResults.push({ tx: 2, type: 'pending', time: pending2Result.value.timeToChangeMs });
            }
            
            if (latest2Result.status === 'fulfilled' && latest2Result.value.success) {
                console.log(`${colors.yellow}🟡 TX2 LATEST: ${latest2Result.value.timeToChangeMs}ms${colors.reset}`);
                pollingResults.push({ tx: 2, type: 'latest', time: latest2Result.value.timeToChangeMs });
            }
        }
        
        // WEBSOCKET SUBSCRIPTION SETUP
        console.log("");
        console.log(`${colors.blue}WEBSOCKET SETUP: Creating realtime and newHeads subscriptions${colors.reset}`);
        
        const subManager = new SubscriptionManager(WS_ENDPOINT);
        await subManager.connect();
        
        await subManager.subscribeToRealtime();
        await subManager.subscribeToNewHeads();
        
        console.log(`${colors.green}✓ Both subscriptions active${colors.reset}`);
        console.log("");
        
        // TX3: WEBSOCKET SUBSCRIPTION TEST
        console.log(`${colors.blue}TRANSACTION 3: WebSocket Subscription Test${colors.reset}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const txResult3 = await sendTransaction(PRIVATE_KEY, TEST_RECIPIENT, 0.001);
        if (txResult3.success) {
            console.log(`${colors.green}✓ TX3 sent: ${txResult3.txHash}${colors.reset}`);
            subManager.trackTransaction(txResult3.txHash);
            
            console.log(`${colors.cyan}Waiting for subscription data...${colors.reset}`);
            await new Promise(resolve => setTimeout(resolve, 8000));
        }
        
        // TX4: WEBSOCKET SUBSCRIPTION TEST
        console.log("");
        console.log(`${colors.blue}TRANSACTION 4: WebSocket Subscription Test${colors.reset}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const txResult4 = await sendTransaction(PRIVATE_KEY, TEST_RECIPIENT, 0.001);
        if (txResult4.success) {
            console.log(`${colors.green}✓ TX4 sent: ${txResult4.txHash}${colors.reset}`);
            subManager.trackTransaction(txResult4.txHash);
            
            console.log(`${colors.cyan}Waiting for subscription data...${colors.reset}`);
            await new Promise(resolve => setTimeout(resolve, 8000));
        }
        
        subManager.close();
        
        console.log("");
        console.log(`${colors.blue}================ BENCHMARK RESULTS ================${colors.reset}`);
        
        // Show polling results
        console.log(`${colors.cyan}RPC POLLING RESULTS (TX1 & TX2):${colors.reset}`);
        pollingResults.forEach(result => {
            const color = result.type === 'pending' ? colors.green : colors.yellow;
            console.log(`${color}TX${result.tx} ${result.type.toUpperCase()}: ${result.time}ms${colors.reset}`);
        });
        
        // Calculate polling averages
        const pendingTimes = pollingResults.filter(r => r.type === 'pending').map(r => r.time);
        const latestTimes = pollingResults.filter(r => r.type === 'latest').map(r => r.time);
        
        if (pendingTimes.length > 0 && latestTimes.length > 0) {
            const avgPending = pendingTimes.reduce((sum, time) => sum + time, 0) / pendingTimes.length;
            const avgLatest = latestTimes.reduce((sum, time) => sum + time, 0) / latestTimes.length;
            const improvement = avgLatest - avgPending;
            
            console.log("");
            console.log(`${colors.green}⚡ RPC POLLING: Pending ${avgPending.toFixed(0)}ms vs Latest ${avgLatest.toFixed(0)}ms`);
            console.log(`⚡ IMPROVEMENT: ${improvement.toFixed(0)}ms faster (${((improvement/avgLatest)*100).toFixed(1)}% improvement)${colors.reset}`);
        }
        
        // Show subscription data summary
        console.log("");
        console.log(`${colors.cyan}WEBSOCKET SUBSCRIPTION RESULTS (TX3 & TX4):${colors.reset}`);
        console.log(`Realtime messages received: ${subManager.realtimeData.length}`);
        console.log(`NewHeads messages received: ${subManager.newHeadsData.length}`);
        
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