# Load .env file and set environment variables
$envFilePath = ".env"
if (Test-Path $envFilePath) {
    Get-Content $envFilePath | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]+)=(.*)\s*$") {
            $name = $matches[1]
            $value = $matches[2]
            [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
            Write-Host "env variable: $name=$value"
        }
    }
}

$tenantId = [System.Environment]::GetEnvironmentVariable("TENANT_ID", "Process")
$subscriptionId = [System.Environment]::GetEnvironmentVariable("SUBSCRIPTION_ID", "Process")
$resourceGroup = [System.Environment]::GetEnvironmentVariable("RESOURCE_GROUP", "Process")
$location = [System.Environment]::GetEnvironmentVariable("LOCATION", "Process")

az config set core.login_experience_v2=off # Disable the new login experience
az login --tenant $tenantId

az account set --subscription $subscriptionId
az group create --name $resourceGroup --location $location

# --- ACR & Docker Build/Push ---

# Determine ACR name (must be globally unique, alphanumeric)
$acrName = $env:ACR_NAME
if (-not $acrName) {
    # Fallback: generate from resource group name
    $sanitizedRg = ($resourceGroup -replace '[^a-zA-Z0-9]', '').ToLower()
    $acrName = "${sanitizedRg}acr"
}

Write-Host "Checking for ACR: $acrName..."
$acrExists = az acr show --name $acrName --resource-group $resourceGroup --query "id" --output tsv 2>$null

if (-not $acrExists) {
    Write-Host "Creating ACR '$acrName' in resource group '$resourceGroup'..."
    az acr create --resource-group $resourceGroup --name $acrName --sku Basic --admin-enabled true
}
else {
    Write-Host "ACR '$acrName' already exists."
}

Write-Host "Logging into ACR..."
az acr login --name $acrName

$imageTag = "anything-llm:latest"
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
Pop-Location

Write-Host "Pushing image to ACR..."
docker push $fullImageName
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker push failed."
    exit 1
}

# Retrieve ACR credentials for Bicep
$acrServer = "$acrName.azurecr.io"
$acrUsername = az acr credential show --name $acrName --query "username" --output tsv
$acrPassword = az acr credential show --name $acrName --query "passwords[0].value" --output tsv

# --- Deployment ---

Write-Host "Deploying Bicep template..."
az deployment group create `
    --resource-group $resourceGroup `
    --template-file main.bicep `
    --parameters parameters.json `
    containerImage=$fullImageName `
    acrServer=$acrServer `
    acrUsername=$acrUsername `
    acrPassword=$acrPassword