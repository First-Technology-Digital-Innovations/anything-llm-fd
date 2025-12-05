@description('The location to deploy the resources to.')
param location string = 'southafricanorth'

@description('The name of the container group to create.')
param containerGroupName string

@description('The name of the storage account to create.')
param storageAccountName string

@description('Set this if you are using a custom domain, e.g. via CloudFlare or similar.')
param overridePublicUrl string = ''

@description('Set this to the time zone you want to use.')
param timeZone string = 'Africa/Johannesburg'

@secure()
@description('The password for the admin user. This value is used to authenticate to the AnythingLLM admin panel.')
param secureAuthToken string

@secure()
@description('Random string for seeding. Please generate random string at least 12 chars long.')
param secureJwtSecret string

@description('Create a storage account and file shares to persist data for the AnythingLLM and Caddy containers.')
module storageAccount './storage-account.bicep' = {
  name: 'allmStorageAccount'
  params: {
    location: location
    storageAccountName: storageAccountName
    containerGroupName: containerGroupName
  }
}

@description('Create an ACI container group to run the AnythingLLM and Caddy containers.')
module allmAci './aci.bicep' = {
  name: 'allmAci'
  params: {
    location: location
    storageAccountName: storageAccountName
    containerGroupName: containerGroupName
    timeZone: timeZone
    allmStorageFileShareName: storageAccount.outputs.allmStorageFileShare
    caddyDataFileShareName: storageAccount.outputs.caddyDataFileShareName
    overridePublicUrl: overridePublicUrl
    secureAuthToken: secureAuthToken
    secureJwtSecret: secureJwtSecret
  }
}
