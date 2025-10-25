/**
 * Advanced Concurrent Voting Test Script
 * 
 * This script simulates multiple voters voting simultaneously to test:
 * - System performance under load
 * - Concurrency handling
 * - Database integrity
 * - API response times
 * 
 * Usage: node voting-load-test.js
 */

const https = require('https');

const CONFIG = {
    API_BASE: 'https://vmi2848672.contaboserver.net/voting',
    DEFAULT_PASSWORD: 'Vote@123',
    CONCURRENT_VOTERS: 50,
    REQUEST_TIMEOUT: 30000, // 30 seconds
    DELAY_BETWEEN_REQUESTS: 100 // milliseconds
};

class VotingLoadTest {
    constructor() {
        this.results = {
            total: 0,
            successful: 0,
            failed: 0,
            responseTimes: [],
            errors: {},
            startTime: 0,
            endTime: 0
        };
        this.voters = [];
        this.offices = [];
        this.candidates = {};
    }

    // Generate voter credentials
    generateVoters(count) {
        const voters = [
            { username: 'admin', password: '123456' },
            { username: 'fel01', password: CONFIG.DEFAULT_PASSWORD },
            { username: 'fatty', password: CONFIG.DEFAULT_PASSWORD }
        ];

        for (let i = voters.length; i < count; i++) {
            const voterNum = String(i - 1).padStart(3, '0');
            voters.push({
                username: `voter${voterNum}`,
                password: CONFIG.DEFAULT_PASSWORD
            });
        }

        return voters.slice(0, count);
    }

    // Make HTTP request
    async makeRequest(method, path, data = null, headers = {}) {
        return new Promise((resolve, reject) => {
            const url = new URL(CONFIG.API_BASE + path);
            const startTime = Date.now();

            const options = {
                hostname: url.hostname,
                port: url.port || 443,
                path: url.pathname,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
                timeout: CONFIG.REQUEST_TIMEOUT
            };

            if (method === 'POST' && path === '/login') {
                options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            }

            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    const responseTime = Date.now() - startTime;
                    
                    try {
                        const parsedData = JSON.parse(responseData);
                        resolve({
                            status: res.statusCode,
                            data: parsedData,
                            responseTime: responseTime
                        });
                    } catch (error) {
                        resolve({
                            status: res.statusCode,
                            data: responseData,
                            responseTime: responseTime
                        });
                    }
                });
            });

            req.on('error', (error) => {
                reject({
                    error: error.message,
                    responseTime: Date.now() - startTime
                });
            });

            req.on('timeout', () => {
                req.destroy();
                reject({
                    error: 'Request timeout',
                    responseTime: CONFIG.REQUEST_TIMEOUT
                });
            });

            if (data) {
                req.write(data);
            }

            req.end();
        });
    }

    // Login voter
    async loginVoter(username, password) {
        const loginData = new URLSearchParams();
        loginData.append('username', username);
        loginData.append('password', password);

        const response = await this.makeRequest('POST', '/login', loginData.toString(), {
            'Content-Type': 'application/x-www-form-urlencoded'
        });

        if (response.status === 200) {
            return response.data.access_token;
        } else {
            throw new Error(`Login failed: ${response.status} - ${JSON.stringify(response.data)}`);
        }
    }

    // Cast vote
    async castVote(token, candidateCode, officeCode) {
        const voteData = JSON.stringify({
            candidate_code: candidateCode,
            office_code: officeCode
        });

        const response = await this.makeRequest('POST', '/votes/', voteData, {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        });

        if (response.status === 200) {
            return response.data;
        } else {
            throw new Error(`Vote failed: ${response.status} - ${JSON.stringify(response.data)}`);
        }
    }

    // Load offices and candidates
    async loadOfficesAndCandidates() {
        console.log('🔄 Loading offices and candidates...');
        
        try {
            const officesResponse = await this.makeRequest('GET', '/offices/');
            if (officesResponse.status !== 200) {
                throw new Error(`Failed to load offices: ${officesResponse.status}`);
            }
            
            this.offices = officesResponse.data;
            console.log(`✅ Loaded ${this.offices.length} offices`);

            // Load candidates for each office
            for (const office of this.offices) {
                try {
                    const candidatesResponse = await this.makeRequest('GET', `/candidates/${office.office_code}/candidates`);
                    if (candidatesResponse.status === 200) {
                        this.candidates[office.office_code] = candidatesResponse.data;
                        console.log(`✅ Loaded ${candidatesResponse.data.length} candidates for ${office.office_code}`);
                    }
                } catch (error) {
                    console.log(`⚠️  Failed to load candidates for ${office.office_code}: ${error.message}`);
                    this.candidates[office.office_code] = [];
                }
            }
        } catch (error) {
            throw new Error(`Failed to load offices: ${error.message}`);
        }
    }

    // Simulate single voter
    async simulateVoter(voter, voterIndex, officeCode) {
        const startTime = Date.now();
        
        try {
            // Login
            const token = await this.loginVoter(voter.username, voter.password);
            
            // Select random candidate
            const candidates = this.candidates[officeCode] || [];
            if (candidates.length === 0) {
                throw new Error(`No candidates available for office ${officeCode}`);
            }
            
            const randomCandidate = candidates[Math.floor(Math.random() * candidates.length)];
            
            // Cast vote
            const voteResult = await this.castVote(token, randomCandidate.candidate_code, officeCode);
            
            const responseTime = Date.now() - startTime;
            this.results.successful++;
            this.results.responseTimes.push(responseTime);
            
            console.log(`✅ Voter ${voterIndex + 1} (${voter.username}) voted for ${randomCandidate.name} (${responseTime}ms)`);
            
            return { success: true, voter: voter.username, responseTime };
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            this.results.failed++;
            
            // Track error types
            const errorType = error.message.split(':')[0];
            this.results.errors[errorType] = (this.results.errors[errorType] || 0) + 1;
            
            console.log(`❌ Voter ${voterIndex + 1} (${voter.username}) failed: ${error.message} (${responseTime}ms)`);
            
            return { success: false, voter: voter.username, error: error.message, responseTime };
        } finally {
            this.results.total++;
        }
    }

    // Run concurrent test
    async runConcurrentTest(voterCount = CONFIG.CONCURRENT_VOTERS, officeCode = null) {
        console.log(`🚀 Starting concurrent voting test with ${voterCount} voters`);
        
        // Reset results
        this.results = {
            total: 0,
            successful: 0,
            failed: 0,
            responseTimes: [],
            errors: {},
            startTime: Date.now(),
            endTime: 0
        };

        // Load offices and candidates
        await this.loadOfficesAndCandidates();
        
        // Use first office if not specified
        if (!officeCode && this.offices.length > 0) {
            officeCode = this.offices[0].office_code;
        }
        
        if (!officeCode) {
            throw new Error('No office available for testing');
        }
        
        console.log(`🎯 Target office: ${officeCode}`);
        
        // Generate voters
        this.voters = this.generateVoters(voterCount);
        
        // Create promises with delays
        const votePromises = this.voters.map((voter, index) => {
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve(this.simulateVoter(voter, index, officeCode));
                }, index * CONFIG.DELAY_BETWEEN_REQUESTS);
            });
        });

        // Execute all votes concurrently
        console.log(`⏳ Executing ${votePromises.length} concurrent votes...`);
        
        try {
            await Promise.all(votePromises);
        } catch (error) {
            console.error(`💥 Test execution failed: ${error.message}`);
        }
        
        this.results.endTime = Date.now();
        this.printResults();
    }

    // Run sequential test for comparison
    async runSequentialTest(voterCount = CONFIG.CONCURRENT_VOTERS, officeCode = null) {
        console.log(`🚀 Starting sequential voting test with ${voterCount} voters`);
        
        // Reset results
        this.results = {
            total: 0,
            successful: 0,
            failed: 0,
            responseTimes: [],
            errors: {},
            startTime: Date.now(),
            endTime: 0
        };

        // Load offices and candidates
        await this.loadOfficesAndCandidates();
        
        // Use first office if not specified
        if (!officeCode && this.offices.length > 0) {
            officeCode = this.offices[0].office_code;
        }
        
        console.log(`🎯 Target office: ${officeCode}`);
        
        // Generate voters
        this.voters = this.generateVoters(voterCount);
        
        // Execute votes sequentially
        for (let i = 0; i < this.voters.length; i++) {
            console.log(`⏳ Processing voter ${i + 1}/${this.voters.length}`);
            await this.simulateVoter(this.voters[i], i, officeCode);
        }
        
        this.results.endTime = Date.now();
        this.printResults();
    }

    // Print test results
    printResults() {
        const duration = this.results.endTime - this.results.startTime;
        const successRate = this.results.total > 0 ? (this.results.successful / this.results.total * 100).toFixed(1) : 0;
        const avgResponseTime = this.results.responseTimes.length > 0 ? 
            (this.results.responseTimes.reduce((a, b) => a + b, 0) / this.results.responseTimes.length).toFixed(0) : 0;
        
        console.log('\n' + '='.repeat(50));
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('='.repeat(50));
        console.log(`📈 Total Requests: ${this.results.total}`);
        console.log(`✅ Successful Votes: ${this.results.successful}`);
        console.log(`❌ Failed Votes: ${this.results.failed}`);
        console.log(`🎯 Success Rate: ${successRate}%`);
        console.log(`⏱️  Total Duration: ${duration}ms`);
        console.log(`📊 Average Response Time: ${avgResponseTime}ms`);
        console.log(`🚀 Requests per Second: ${(this.results.total / (duration / 1000)).toFixed(2)}`);
        
        if (Object.keys(this.results.errors).length > 0) {
            console.log('\n❌ ERROR BREAKDOWN:');
            Object.entries(this.results.errors).forEach(([errorType, count]) => {
                console.log(`   ${errorType}: ${count}`);
            });
        }
        
        if (this.results.responseTimes.length > 0) {
            const sortedTimes = this.results.responseTimes.sort((a, b) => a - b);
            const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
            const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
            
            console.log('\n📊 RESPONSE TIME PERCENTILES:');
            console.log(`   Min: ${Math.min(...sortedTimes)}ms`);
            console.log(`   Max: ${Math.max(...sortedTimes)}ms`);
            console.log(`   95th percentile: ${p95}ms`);
            console.log(`   99th percentile: ${p99}ms`);
        }
        
        console.log('='.repeat(50));
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const testType = args[0] || 'concurrent'; // 'concurrent' or 'sequential'
    const voterCount = parseInt(args[1]) || CONFIG.CONCURRENT_VOTERS;
    const officeCode = args[2] || null;
    
    const tester = new VotingLoadTest();
    
    try {
        if (testType === 'sequential') {
            await tester.runSequentialTest(voterCount, officeCode);
        } else {
            await tester.runConcurrentTest(voterCount, officeCode);
        }
    } catch (error) {
        console.error(`💥 Test failed: ${error.message}`);
        process.exit(1);
    }
}

// Export for use as module
if (require.main === module) {
    main();
}

module.exports = VotingLoadTest;