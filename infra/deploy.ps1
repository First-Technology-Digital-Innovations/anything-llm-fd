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

az deployment group create `
    --resource-group $resourceGroup `
    --template-file main.bicep `
    --parameters parameters.json