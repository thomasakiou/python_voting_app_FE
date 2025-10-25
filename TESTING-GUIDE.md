# Voting System Testing Guide

## Overview
This guide explains how to test the voting system with 50 concurrent voters while respecting the system's constraints:
- **One vote per voter per office** (prevents duplicate voting)
- **Temporary password changes for testing** (voters.csv remains unchanged)
- **Admin authentication required** for office and candidate access

## Test Data Setup

### 1. Voter Accounts
The `voters.csv` file contains 50 test voter accounts:
- **fel01** and **fatty** (special test accounts)
- **voter001** through **voter050** (bulk test accounts)
- All accounts have default password: `Vote@123`

### 2. Admin Account
- **Username:** admin
- **Password:** 123456
- **Required for:** Accessing offices and candidates data

## Testing Tools Available

### 1. Web-Based Concurrent Test (Recommended)
**File:** `concurrent-voting-test.html`
**Access:** http://localhost:8080/concurrent-voting-test.html

**Features:**
- Interactive web interface
- Real-time logging and progress tracking
- Multiple test modes:
  - **Single Office Test:** All voters vote for same office
  - **Multi-Office Test:** Votes distributed across multiple offices
  - **Full Election Test:** Complete election simulation
- Automatic password change handling
- Visual results dashboard

**How to Use:**
1. Open the file in a web browser (via local server)
2. Select test mode from dropdown
3. Choose number of voters (1-50)
4. Select office for single-office tests
5. Click "Start Concurrent Voting Test"
6. Monitor progress in real-time
7. View results summary when complete

### 2. Node.js Script
**File:** `voting-load-test.js`
**Usage:** `node voting-load-test.js`

**Features:**
- Command-line testing
- Configurable voter count and concurrency
- JSON results output
- Performance metrics

### 3. PowerShell Script
**File:** `Test-ConcurrentVoting.ps1`
**Usage:** `.\Test-ConcurrentVoting.ps1`

**Features:**
- Windows PowerShell native
- Parallel execution using jobs
- Detailed logging
- Error handling

## Password Management Tools

### 1. Web-Based Password Setup
**File:** `password-setup.html`
**Access:** http://localhost:8080/password-setup.html

**Features:**
- Bulk password changes for all voters
- Individual password updates
- Real-time status feedback

### 2. PowerShell Password Setup
**File:** `Setup-VoterPasswords.ps1`
**Usage:** `.\Setup-VoterPasswords.ps1`

**Features:**
- Automated password generation
- Batch processing
- Error recovery

### 3. Pre-generated Password List
**File:** `voter-passwords.js`
**Contains:** Mapping of voter usernames to new passwords

## Testing Scenarios

### Scenario 1: Single Office Stress Test
- **Purpose:** Test system load with all voters voting for same office
- **Tool:** Web interface with "Single Office Test" mode
- **Expected:** Some voters may get "already voted" errors (correct behavior)

### Scenario 2: Multi-Office Distribution
- **Purpose:** Test realistic voting distribution across offices
- **Tool:** Web interface with "Multi-Office Test" mode
- **Expected:** Votes distributed, minimal conflicts

### Scenario 3: Full Election Simulation
- **Purpose:** Complete election with random candidate selection
- **Tool:** Web interface with "Full Election Test" mode
- **Expected:** Each voter votes once per office they're assigned

### Scenario 4: Password Change Handling
- **Purpose:** Test automatic password change during voting
- **Setup:** Use voters with default passwords
- **Expected:** System automatically changes passwords as needed

## System Constraints & Expected Behaviors

### ✅ Correct Behaviors
1. **One Vote Per Office:** Voters cannot vote twice for same office
2. **Authentication Required:** Must login before voting
3. **Password Changes:** System handles password updates automatically
4. **Admin Access:** Only admin can access office management

### ❌ Expected Errors (Normal)
- "User has already voted for this office" (duplicate voting prevention)
- "Authentication failed" (password change required)
- "Office not found" (invalid office codes)

## Performance Expectations

### With 50 Concurrent Voters:
- **Expected Response Time:** 1-5 seconds per vote
- **Success Rate:** 90-100% (depending on test scenario)
- **Password Changes:** Automatic, transparent to test
- **Database Load:** Backend should handle concurrent requests

## Security Notes

### Data Protection
- `voters.csv` is protected by `.gitignore`
- Test password files are excluded from git
- No sensitive data should be committed

### Testing vs Production
- **Testing:** Passwords can be changed programmatically
- **Production:** Voters must change passwords manually
- **Separation:** Test changes don't affect production voter data

## Troubleshooting

### Common Issues:
1. **"Failed to load offices"**
   - Solution: Ensure admin authentication (admin/123456)

2. **"All voters failed to vote"** 
   - Solution: Check API connectivity, verify backend is running

3. **"Login failed: 403" errors for all voters**
   - **Cause:** Voters must change from default password "Vote@123" before voting
   - **Solution:** Click "🔐 Setup Test Passwords" button BEFORE running tests
   - **Note:** The setup will test multiple password change endpoints automatically

4. **"Password change failed" during setup**
   - **Expected:** Some endpoints may not exist or work
   - **Solution:** The system will try multiple endpoints and formats automatically
   - **Fallback:** Tests will use pre-generated passwords for simulation

5. **High failure rate in single-office tests**
   - Expected: Due to "one vote per office" constraint
   - Normal behavior when multiple voters try to vote for same office

### Password Change Endpoint Discovery:
The system automatically tests these endpoints:
- `/voting/change-password` (JSON format)
- `/voting/api/change-password` (JSON format) 
- `/voting/change-password` (Form data format)
- `/voting/api/change-password` (Form data format)

If none work, the system falls back to pre-generated password simulation.

### API Endpoints Used:
- `POST /voting/login` - Authentication
- `GET /voting/offices` - Office list (admin required)
- `GET /voting/candidates` - Candidate list
- `POST /voting/votes` - Submit votes
- `POST /voting/api/change-password` - Password changes

## Running the Tests

### Quick Start:
1. **Start local server:** `python -m http.server 8080`
2. **Open test interface:** http://localhost:8080/concurrent-voting-test.html
3. **🔐 FIRST: Setup passwords** - Click "Setup Test Passwords" button
4. **Load offices and candidates:** Click "Load Offices" 
5. **Select test mode:** Choose appropriate scenario
6. **Run test:** Click "Start Concurrent Test" and monitor progress
7. **Review results:** Check success rates and error patterns

### Critical First Step:
**⚠️ ALWAYS click "🔐 Setup Test Passwords" before running any tests!**
This attempts to change voter passwords from the default "Vote@123" which is required for voting.

### Advanced Testing:
1. **Setup passwords first:** Use password-setup.html if needed
2. **Run multiple scenarios:** Test different voting patterns
3. **Analyze performance:** Monitor response times and success rates
4. **Validate constraints:** Confirm voting rules are enforced

This comprehensive testing framework ensures the voting system works correctly under load while maintaining data integrity and security.