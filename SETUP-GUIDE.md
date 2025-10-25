# 🗳️ Voting System Setup Guide

## Current Status
✅ **API Working** - Backend is accessible
✅ **Admin Access** - Can login with admin/123456  
✅ **Offices Created** - 5 offices configured
✅ **Candidates Ready** - Candidates available for voting
🔶 **Voters Needed** - Need to upload voter accounts

## Step-by-Step Setup

### 1. Access Admin Panel
1. Open your main voting app: `index.html`
2. Login with credentials:
   - **Username:** `admin`
   - **Password:** `123456`
3. Navigate to the admin dashboard

### 2. Upload Voter Accounts
1. In admin panel, find "User Management" or "Upload Users" section
2. Upload the `voters.csv` file (which contains 50 voter accounts)
3. Verify upload was successful
4. Check that voters appear in user list

### 3. Verify Setup
1. Open `setup-checker.html` in browser
2. Click "Test Authentication" - should show successful login for admin
3. Click "Check Offices & Candidates" - should show your 5 offices and candidates
4. Try logging in as a voter (e.g., fel01/Vote@123) through main app

### 4. Run Concurrent Voting Test
1. Open `concurrent-voting-test.html`
2. Click "Load Offices" - should populate with your 5 offices
3. Select an office (e.g., "P01 - President")  
4. Set voter count (start with 5-10 for initial test)
5. Click "Start Concurrent Test"

## Expected Results

### Small Test (5-10 voters):
- **Success Rate:** 90-100%
- **Average Response Time:** 200-800ms
- **All votes should complete successfully**

### Full Test (50 voters):
- **Success Rate:** 85-95% (some may fail due to concurrency)
- **Average Response Time:** 500-1500ms  
- **Monitor for any bottlenecks or errors**

## Troubleshooting

### If voters can't login:
- Check voters were uploaded correctly
- Verify default password is "Vote@123"
- Try manual login with fel01/Vote@123

### If offices don't load:
- Ensure admin credentials work (admin/123456)
- Check browser console for errors
- Verify backend is accessible

### If votes fail:
- Check voter has correct role (should be "voter" not "admin")  
- Verify office and candidate codes match
- Monitor backend logs for database errors

## Files Overview
- `voters.csv` - 50 voter accounts (ready to upload)
- `concurrent-voting-test.html` - Main testing interface
- `setup-checker.html` - System verification tool
- `voting-load-test.js` - Advanced Node.js testing script
- `Test-ConcurrentVoting.ps1` - PowerShell testing script

## Quick Commands for Testing

```powershell
# Test admin login
$body = "username=admin&password=123456"
$headers = @{"Content-Type" = "application/x-www-form-urlencoded"}
$response = Invoke-RestMethod -Uri "https://vmi2848672.contaboserver.net/voting/login" -Method POST -Body $body -Headers $headers

# Test voter login (after upload)
$body = "username=fel01&password=Vote@123" 
$response = Invoke-RestMethod -Uri "https://vmi2848672.contaboserver.net/voting/login" -Method POST -Body $body -Headers $headers
```

Your system is almost ready! Just upload the voters and you'll be able to run full concurrent testing. 🚀