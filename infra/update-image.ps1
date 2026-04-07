# Update script - builds and pushes new image, then restarts ACI
# Load environment variables
$envFilePath = ".env"
if (Test-Path $envFilePath) {
    Get-Content $envFilePath | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]+)=(.*)\s*$") {
            $name = $matches[1]
            $value = $matches[2]
            [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

$resourceGroup = [System.Environment]::GetEnvironmentVariable("RESOURCE_GROUP", "Process")

# Determine ACR name
$acrName = $env:ACR_NAME
if (-not $acrName) {
    $sanitizedRg = ($resourceGroup -replace '[^a-zA-Z0-9]', '').ToLower()
    $acrName = "${sanitizedRg}acr"
}

Write-Host "Logging into ACR..."
az acr login --name $acrName

# Use a timestamp for unique tagging, or you can use "latest"
$timestamp = Get-Date -Format "yyyyMMdd-HHmm"
$imageTag = "anything-llm:$timestamp"  # Or use "anything-llm:latest"
$fullImageName = "$acrName.azurecr.io/$imageTag"

Write-Host "Building Docker image: $fullImageName..."
# Build from the repository root
Push-Location ..
docker build -t $fullImageName -f docker/Dockerfile .
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker build failed."
    Pop-Location
    exit 1
}

# Also tag as latest
docker tag $fullImageName "$acrName.azurecr.io/anything-llm:latest"

Pop-Location

Write-Host "Pushing image to ACR..."
docker push $fullImageName
docker push "$acrName.azurecr.io/anything-llm:latest"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker push failed."
    exit 1
}

Write-Host "Restarting container group..."
az container restart --resource-group $resourceGroup --name bcpai

Write-Host "Image updated and container restarted successfully!"
Write-Host "New image: $fullImageName"