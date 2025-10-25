# Bulk Password Setup Script for Voting Test
# Changes all voter passwords from default "Vote@123" to new passwords

param(
    [int]$VoterCount = 50,
    [string]$PasswordPattern = "TestPass{0}!",
    [switch]$TestMode = $false
)

$API_BASE = "https://vmi2848672.contaboserver.net/voting"
$DEFAULT_PASSWORD = "Vote@123"

Write-Host "🔧 Bulk Voter Password Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Generate voter list
function Generate-Voters {
    param([int]$Count)
    
    $voters = @(
        @{ username = "fel01" }
        @{ username = "fatty" }
    )
    
    for ($i = $voters.Count; $i -lt $Count; $i++) {
        $voterNum = ($i - 1).ToString().PadLeft(3, '0')
        $voters += @{ username = "voter$voterNum" }
    }
    
    return $voters[0..($Count - 1)]
}

# Change single voter password
function Change-VoterPassword {
    param(
        [string]$Username,
        [string]$OldPassword,
        [string]$NewPassword
    )
    
    try {
        $body = @{
            username = $Username
            old_password = $OldPassword
            new_password = $NewPassword
        } | ConvertTo-Json
        
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        $response = Invoke-RestMethod -Uri "$API_BASE/api/change-password" -Method POST -Body $body -Headers $headers -ErrorAction Stop
        
        return @{
            Success = $true
            Username = $Username
            NewPassword = $NewPassword
            Message = $response.message
        }
    }
    catch {
        return @{
            Success = $false
            Username = $Username
            Error = $_.Exception.Message
        }
    }
}

# Test voter login
function Test-VoterLogin {
    param(
        [string]$Username,
        [string]$Password
    )
    
    try {
        $body = "username=$Username&password=$Password"
        $headers = @{"Content-Type" = "application/x-www-form-urlencoded"}
        
        $response = Invoke-RestMethod -Uri "$API_BASE/login" -Method POST -Body $body -Headers $headers -ErrorAction Stop
        
        return @{
            Success = $true
            Username = $Username
            Token = $response.access_token.Substring(0, 20) + "..."
        }
    }
    catch {
        return @{
            Success = $false
            Username = $Username
            Error = $_.Exception.Message
        }
    }
}

# Main execution
try {
    Write-Host "📊 Configuration:" -ForegroundColor Yellow
    Write-Host "  Voter Count: $VoterCount"
    Write-Host "  Password Pattern: $PasswordPattern"
    Write-Host "  API Base: $API_BASE"
    Write-Host ""
    
    if ($TestMode) {
        Write-Host "🧪 Running in TEST MODE - no passwords will be changed" -ForegroundColor Yellow
    }
    
    # Generate voters
    $voters = Generate-Voters -Count $VoterCount
    Write-Host "👥 Generated $($voters.Count) voter accounts" -ForegroundColor Green
    
    # Results tracking
    $results = @{
        Total = 0
        Successful = 0
        Failed = 0
        Passwords = @()
    }
    
    Write-Host "`n🔄 Processing password changes..." -ForegroundColor Yellow
    
    # Process each voter
    for ($i = 0; $i -lt $voters.Count; $i++) {
        $voter = $voters[$i]
        $newPassword = $PasswordPattern -f ($i + 1)
        
        Write-Progress -Activity "Changing Passwords" -Status "Processing $($voter.username)" -PercentComplete (($i + 1) / $voters.Count * 100)
        
        if (-not $TestMode) {
            $result = Change-VoterPassword -Username $voter.username -OldPassword $DEFAULT_PASSWORD -NewPassword $newPassword
            
            if ($result.Success) {
                $results.Successful++
                $results.Passwords += @{
                    Username = $voter.username
                    Password = $newPassword
                }
                Write-Host "✅ $($voter.username): Password changed successfully" -ForegroundColor Green
            }
            else {
                $results.Failed++
                Write-Host "❌ $($voter.username): $($result.Error)" -ForegroundColor Red
            }
        }
        else {
            # Test mode - just simulate
            $results.Successful++
            $results.Passwords += @{
                Username = $voter.username
                Password = $newPassword
            }
            Write-Host "🧪 $($voter.username): Would change to $newPassword" -ForegroundColor Cyan
        }
        
        $results.Total++
        
        # Small delay to avoid overwhelming server
        Start-Sleep -Milliseconds 200
    }
    
    Write-Progress -Activity "Changing Passwords" -Completed
    
    # Display results
    Write-Host "`n📊 RESULTS SUMMARY" -ForegroundColor Cyan
    Write-Host "===================" -ForegroundColor Cyan
    Write-Host "Total Processed: $($results.Total)"
    Write-Host "Successful: $($results.Successful)" -ForegroundColor Green
    Write-Host "Failed: $($results.Failed)" -ForegroundColor Red
    
    if ($results.Total -gt 0) {
        $successRate = [math]::Round(($results.Successful / $results.Total) * 100, 1)
        Write-Host "Success Rate: $successRate%" -ForegroundColor Yellow
    }
    
    # Generate password file for concurrent testing
    if ($results.Passwords.Count -gt 0) {
        Write-Host "`n📝 Generating password list..." -ForegroundColor Yellow
        
        $jsContent = "// Generated voter passwords for concurrent testing`n"
        $jsContent += "const votersWithPasswords = [`n"
        
        foreach ($item in $results.Passwords) {
            $jsContent += "    { username: `"$($item.Username)`", password: `"$($item.Password)`" },`n"
        }
        
        $jsContent += "];`n"
        $jsContent += "`n// Usage in your concurrent voting test:`n"
        $jsContent += "// Replace the generateVoters function to return this array"
        
        $outputFile = "voter-passwords.js"
        $jsContent | Out-File -FilePath $outputFile -Encoding UTF8
        
        Write-Host "✅ Password list saved to: $outputFile" -ForegroundColor Green
        
        # Test a few logins
        if (-not $TestMode -and $results.Successful -gt 0) {
            Write-Host "`n🧪 Testing logins..." -ForegroundColor Yellow
            
            $testVoters = $results.Passwords | Select-Object -First 3
            foreach ($testVoter in $testVoters) {
                $loginResult = Test-VoterLogin -Username $testVoter.Username -Password $testVoter.Password
                
                if ($loginResult.Success) {
                    Write-Host "✅ $($testVoter.Username): Login successful" -ForegroundColor Green
                }
                else {
                    Write-Host "❌ $($testVoter.Username): Login failed - $($loginResult.Error)" -ForegroundColor Red
                }
            }
        }
    }
    
    Write-Host "`n🎯 Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Use the generated voter-passwords.js in your concurrent test"
    Write-Host "2. Update the generateVoters function to use the new passwords"
    Write-Host "3. Run your concurrent voting test with the new credentials"
    
    if ($TestMode) {
        Write-Host "`n💡 Re-run without -TestMode to actually change passwords" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "💥 Script failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n🏁 Password setup complete!" -ForegroundColor Green