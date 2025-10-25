# Concurrent Voting Test Script for PowerShell
# Tests multiple voters voting simultaneously

param(
    [int]$VoterCount = 50,
    [string]$OfficeCode = "",
    [int]$DelayMs = 100,
    [string]$TestType = "concurrent"  # "concurrent" or "sequential"
)

$API_BASE = "https://vmi2848672.contaboserver.net/voting"
$DEFAULT_PASSWORD = "Vote@123"

# Results tracking
$script:Results = @{
    Total = 0
    Successful = 0
    Failed = 0
    ResponseTimes = @()
    Errors = @{}
    StartTime = 0
    EndTime = 0
}

# Progress tracking
$script:Progress = @{
    Current = 0
    Total = 0
}

function Write-TestLog {
    param(
        [string]$Message,
        [string]$Type = "Info"
    )
    
    $timestamp = Get-Date -Format "HH:mm:ss"
    $color = switch ($Type) {
        "Success" { "Green" }
        "Error" { "Red" }
        "Warning" { "Yellow" }
        default { "White" }
    }
    
    Write-Host "[$timestamp] $Message" -ForegroundColor $color
}

function Generate-Voters {
    param([int]$Count)
    
    $voters = @(
        @{ username = "admin"; password = "123456" }
        @{ username = "fel01"; password = $DEFAULT_PASSWORD }
        @{ username = "fatty"; password = $DEFAULT_PASSWORD }
    )
    
    for ($i = $voters.Count; $i -lt $Count; $i++) {
        $voterNum = ($i - 1).ToString().PadLeft(3, '0')
        $voters += @{ username = "voter$voterNum"; password = $DEFAULT_PASSWORD }
    }
    
    return $voters[0..($Count - 1)]
}

function Invoke-APIRequest {
    param(
        [string]$Method,
        [string]$Endpoint,
        [hashtable]$Headers = @{},
        [string]$Body = $null
    )
    
    $uri = "$API_BASE$Endpoint"
    $startTime = Get-Date
    
    try {
        $params = @{
            Uri = $uri
            Method = $Method
            Headers = $Headers
            TimeoutSec = 30
        }
        
        if ($Body) {
            $params.Body = $Body
        }
        
        $response = Invoke-RestMethod @params
        $responseTime = (Get-Date) - $startTime
        
        return @{
            Success = $true
            Data = $response
            ResponseTime = $responseTime.TotalMilliseconds
        }
    }
    catch {
        $responseTime = (Get-Date) - $startTime
        return @{
            Success = $false
            Error = $_.Exception.Message
            ResponseTime = $responseTime.TotalMilliseconds
        }
    }
}

function Login-Voter {
    param(
        [string]$Username,
        [string]$Password
    )
    
    $body = "username=$Username&password=$Password"
    $headers = @{ "Content-Type" = "application/x-www-form-urlencoded" }
    
    $result = Invoke-APIRequest -Method "POST" -Endpoint "/login" -Headers $headers -Body $body
    
    if ($result.Success) {
        return @{
            Success = $true
            Token = $result.Data.access_token
            ResponseTime = $result.ResponseTime
        }
    }
    else {
        return @{
            Success = $false
            Error = $result.Error
            ResponseTime = $result.ResponseTime
        }
    }
}

function Cast-Vote {
    param(
        [string]$Token,
        [string]$CandidateCode,
        [string]$OfficeCode
    )
    
    $headers = @{
        "Authorization" = "Bearer $Token"
        "Content-Type" = "application/json"
    }
    
    $voteData = @{
        candidate_code = $CandidateCode
        office_code = $OfficeCode
    } | ConvertTo-Json
    
    $result = Invoke-APIRequest -Method "POST" -Endpoint "/votes/" -Headers $headers -Body $voteData
    
    return $result
}

function Get-OfficesAndCandidates {
    Write-TestLog "Loading offices and candidates..." "Info"
    
    # Get offices
    $officesResult = Invoke-APIRequest -Method "GET" -Endpoint "/offices/"
    if (-not $officesResult.Success) {
        throw "Failed to load offices: $($officesResult.Error)"
    }
    
    $offices = $officesResult.Data
    Write-TestLog "Loaded $($offices.Count) offices" "Success"
    
    # Get candidates for each office
    $candidates = @{}
    foreach ($office in $offices) {
        $candidatesResult = Invoke-APIRequest -Method "GET" -Endpoint "/candidates/$($office.office_code)/candidates"
        if ($candidatesResult.Success) {
            $candidates[$office.office_code] = $candidatesResult.Data
            Write-TestLog "Loaded $($candidatesResult.Data.Count) candidates for $($office.office_code)" "Success"
        }
        else {
            Write-TestLog "Failed to load candidates for $($office.office_code): $($candidatesResult.Error)" "Warning"
            $candidates[$office.office_code] = @()
        }
    }
    
    return @{
        Offices = $offices
        Candidates = $candidates
    }
}

function Simulate-SingleVoter {
    param(
        [hashtable]$Voter,
        [int]$VoterIndex,
        [string]$OfficeCode,
        [array]$Candidates
    )
    
    $startTime = Get-Date
    
    try {
        # Login
        $loginResult = Login-Voter -Username $Voter.username -Password $Voter.password
        if (-not $loginResult.Success) {
            throw "Login failed: $($loginResult.Error)"
        }
        
        # Select random candidate
        if ($Candidates.Count -eq 0) {
            throw "No candidates available for office $OfficeCode"
        }
        
        $randomCandidate = $Candidates | Get-Random
        
        # Cast vote
        $voteResult = Cast-Vote -Token $loginResult.Token -CandidateCode $randomCandidate.candidate_code -OfficeCode $OfficeCode
        
        $totalTime = ((Get-Date) - $startTime).TotalMilliseconds
        
        if ($voteResult.Success) {
            $script:Results.Successful++
            $script:Results.ResponseTimes += $totalTime
            Write-TestLog "Voter $($VoterIndex + 1) ($($Voter.username)) voted for $($randomCandidate.name) (${totalTime}ms)" "Success"
            return @{ Success = $true; ResponseTime = $totalTime }
        }
        else {
            throw "Vote failed: $($voteResult.Error)"
        }
    }
    catch {
        $totalTime = ((Get-Date) - $startTime).TotalMilliseconds
        $script:Results.Failed++
        
        $errorType = $_.Exception.Message.Split(':')[0]
        if ($script:Results.Errors.ContainsKey($errorType)) {
            $script:Results.Errors[$errorType]++
        }
        else {
            $script:Results.Errors[$errorType] = 1
        }
        
        Write-TestLog "Voter $($VoterIndex + 1) ($($Voter.username)) failed: $($_.Exception.Message) (${totalTime}ms)" "Error"
        return @{ Success = $false; Error = $_.Exception.Message; ResponseTime = $totalTime }
    }
    finally {
        $script:Results.Total++
        $script:Progress.Current++
        
        # Update progress
        $progressPercent = [math]::Round(($script:Progress.Current / $script:Progress.Total) * 100, 1)
        Write-Progress -Activity "Voting Test" -Status "$($script:Progress.Current)/$($script:Progress.Total) voters processed" -PercentComplete $progressPercent
    }
}

function Start-ConcurrentTest {
    param(
        [int]$Count,
        [string]$OfficeCode
    )
    
    Write-TestLog "Starting concurrent voting test with $Count voters" "Warning"
    
    # Load offices and candidates
    $data = Get-OfficesAndCandidates
    
    if (-not $OfficeCode -and $data.Offices.Count -gt 0) {
        $OfficeCode = $data.Offices[0].office_code
    }
    
    if (-not $OfficeCode) {
        throw "No office available for testing"
    }
    
    Write-TestLog "Target office: $OfficeCode" "Info"
    
    $candidates = $data.Candidates[$OfficeCode]
    if ($candidates.Count -eq 0) {
        throw "No candidates found for office $OfficeCode"
    }
    
    # Generate voters
    $voters = Generate-Voters -Count $Count
    Write-TestLog "Generated $($voters.Count) voter accounts" "Info"
    
    # Initialize progress tracking
    $script:Progress.Current = 0
    $script:Progress.Total = $voters.Count
    
    # Create script blocks for parallel execution
    $jobs = @()
    
    for ($i = 0; $i -lt $voters.Count; $i++) {
        $voter = $voters[$i]
        
        # Add delay for concurrent execution
        if ($DelayMs -gt 0) {
            Start-Sleep -Milliseconds ($i * $DelayMs)
        }
        
        # Start background job
        $job = Start-Job -ScriptBlock {
            param($VoterData, $Index, $Office, $CandidateList, $ApiBase, $Functions)
            
            # Import functions
            Invoke-Expression $Functions
            
            return Simulate-SingleVoter -Voter $VoterData -VoterIndex $Index -OfficeCode $Office -Candidates $CandidateList
        } -ArgumentList $voter, $i, $OfficeCode, $candidates, $API_BASE, (Get-Content $PSCommandPath -Raw)
        
        $jobs += $job
    }
    
    Write-TestLog "Waiting for all $($jobs.Count) concurrent votes to complete..." "Info"
    
    # Wait for all jobs to complete
    $jobs | Wait-Job | Out-Null
    
    # Collect results
    foreach ($job in $jobs) {
        $result = Receive-Job -Job $job
        Remove-Job -Job $job
        
        if ($result.Success) {
            $script:Results.Successful++
            $script:Results.ResponseTimes += $result.ResponseTime
        }
        else {
            $script:Results.Failed++
        }
        $script:Results.Total++
    }
}

function Start-SequentialTest {
    param(
        [int]$Count,
        [string]$OfficeCode
    )
    
    Write-TestLog "Starting sequential voting test with $Count voters" "Warning"
    
    # Load offices and candidates
    $data = Get-OfficesAndCandidates
    
    if (-not $OfficeCode -and $data.Offices.Count -gt 0) {
        $OfficeCode = $data.Offices[0].office_code
    }
    
    Write-TestLog "Target office: $OfficeCode" "Info"
    
    $candidates = $data.Candidates[$OfficeCode]
    if ($candidates.Count -eq 0) {
        throw "No candidates found for office $OfficeCode"
    }
    
    # Generate voters
    $voters = Generate-Voters -Count $Count
    
    # Initialize progress tracking
    $script:Progress.Current = 0
    $script:Progress.Total = $voters.Count
    
    # Process voters sequentially
    for ($i = 0; $i -lt $voters.Count; $i++) {
        Simulate-SingleVoter -Voter $voters[$i] -VoterIndex $i -OfficeCode $OfficeCode -Candidates $candidates
    }
}

function Show-Results {
    $duration = ($script:Results.EndTime - $script:Results.StartTime).TotalMilliseconds
    $successRate = if ($script:Results.Total -gt 0) { [math]::Round(($script:Results.Successful / $script:Results.Total) * 100, 1) } else { 0 }
    $avgResponseTime = if ($script:Results.ResponseTimes.Count -gt 0) { [math]::Round(($script:Results.ResponseTimes | Measure-Object -Average).Average, 0) } else { 0 }
    
    Write-Host "`n" + "="*50 -ForegroundColor Cyan
    Write-Host "📊 TEST RESULTS SUMMARY" -ForegroundColor Cyan
    Write-Host "="*50 -ForegroundColor Cyan
    Write-Host "📈 Total Requests: $($script:Results.Total)"
    Write-Host "✅ Successful Votes: $($script:Results.Successful)" -ForegroundColor Green
    Write-Host "❌ Failed Votes: $($script:Results.Failed)" -ForegroundColor Red
    Write-Host "🎯 Success Rate: ${successRate}%" -ForegroundColor Yellow
    Write-Host "⏱️  Total Duration: ${duration}ms"
    Write-Host "📊 Average Response Time: ${avgResponseTime}ms"
    Write-Host "🚀 Requests per Second: $([math]::Round($script:Results.Total / ($duration / 1000), 2))"
    
    if ($script:Results.Errors.Count -gt 0) {
        Write-Host "`n❌ ERROR BREAKDOWN:" -ForegroundColor Red
        foreach ($error in $script:Results.Errors.GetEnumerator()) {
            Write-Host "   $($error.Key): $($error.Value)" -ForegroundColor Red
        }
    }
    
    if ($script:Results.ResponseTimes.Count -gt 0) {
        $sortedTimes = $script:Results.ResponseTimes | Sort-Object
        $p95Index = [math]::Floor($sortedTimes.Count * 0.95)
        $p99Index = [math]::Floor($sortedTimes.Count * 0.99)
        
        Write-Host "`n📊 RESPONSE TIME PERCENTILES:"
        Write-Host "   Min: $([math]::Round(($sortedTimes | Measure-Object -Minimum).Minimum, 0))ms"
        Write-Host "   Max: $([math]::Round(($sortedTimes | Measure-Object -Maximum).Maximum, 0))ms"
        Write-Host "   95th percentile: $([math]::Round($sortedTimes[$p95Index], 0))ms"
        Write-Host "   99th percentile: $([math]::Round($sortedTimes[$p99Index], 0))ms"
    }
    
    Write-Host "="*50 -ForegroundColor Cyan
}

# Main execution
try {
    Write-TestLog "🚀 Starting Voting Load Test" "Warning"
    Write-TestLog "Configuration: $VoterCount voters, Test Type: $TestType, Delay: ${DelayMs}ms" "Info"
    
    # Reset results
    $script:Results = @{
        Total = 0
        Successful = 0
        Failed = 0
        ResponseTimes = @()
        Errors = @{}
        StartTime = Get-Date
        EndTime = $null
    }
    
    if ($TestType -eq "sequential") {
        Start-SequentialTest -Count $VoterCount -OfficeCode $OfficeCode
    }
    else {
        Start-ConcurrentTest -Count $VoterCount -OfficeCode $OfficeCode
    }
    
    $script:Results.EndTime = Get-Date
    Write-Progress -Activity "Voting Test" -Completed
    
    Write-TestLog "🏁 Test completed!" "Success"
    Show-Results
}
catch {
    Write-TestLog "💥 Test failed: $($_.Exception.Message)" "Error"
    exit 1
}