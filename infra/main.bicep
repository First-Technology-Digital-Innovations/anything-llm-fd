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

@description('The container image to deploy.')
param containerImage string = 'rgbcpaiacr/anything-llm:latest'

@description('The ACR server.')
param acrServer string = ''

@description('The ACR username.')
param acrUsername string = ''

@secure()
@description('The ACR password.')
param acrPassword string = ''

@description('PostgreSQL admin username.')
param postgresAdminUsername string = 'bcpallm_admin'

@secure()
@description('PostgreSQL admin password.')
param postgresAdminPassword string

// Azure OpenAI Configuration
@description('Azure OpenAI Endpoint')
param azureOpenAIEndpoint string = ''

@secure()
@description('Azure OpenAI Key')
param azureOpenAIKey string = ''

@description('Azure OpenAI Model')
param azureOpenAIModel string = 'gpt-4'

@description('LLM Provider')
param llmProvider string = 'azure'

@description('Embedding Engine')
param embeddingEngine string = 'native'

@description('Embedding Model Preference')
param embeddingModelPref string = 'Xenova/all-MiniLM-L6-v2'

// Azure AD Configuration
@description('Azure AD Client ID')
param azureAdClientId string = ''

@description('Azure AD Tenant ID')
param azureAdTenantId string = ''

@secure()
@description('Azure AD Client Secret')
param azureAdClientSecret string = ''

@description('Azure AD Admin Email')
param azureAdAdminEmail string = ''

// Voice Chat Configuration
@description('Enable voice chat functionality')
param voiceChatEnabled string = 'false'

@description('Azure Realtime Endpoint')
param azureRealtimeEndpoint string = ''

@secure()
@description('Azure Realtime Key')
param azureRealtimeKey string = ''

@description('Azure Realtime Model')
param azureRealtimeModel string = 'gpt-realtime'

@description('Voice chat default voice')
param voiceChatDefaultVoice string = 'alloy'

@description('Voice chat VAD threshold')
param voiceChatVadThreshold string = '0.5'

@description('Voice chat session timeout')
param voiceChatSessionTimeout string = '1500000'

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
    postgresConnectionString: postgresServer.outputs.connectionString
    containerImage: containerImage
    acrServer: acrServer
    acrUsername: acrUsername
    acrPassword: acrPassword
    azureOpenAIEndpoint: azureOpenAIEndpoint
    azureOpenAIKey: azureOpenAIKey
    azureOpenAIModel: azureOpenAIModel
    llmProvider: llmProvider
    embeddingEngine: embeddingEngine
    embeddingModelPref: embeddingModelPref
    azureAdClientId: azureAdClientId
    azureAdTenantId: azureAdTenantId
    azureAdClientSecret: azureAdClientSecret
    azureAdAdminEmail: azureAdAdminEmail
    voiceChatEnabled: voiceChatEnabled
    azureRealtimeEndpoint: azureRealtimeEndpoint
    azureRealtimeKey: azureRealtimeKey
    azureRealtimeModel: azureRealtimeModel
    voiceChatDefaultVoice: voiceChatDefaultVoice
    voiceChatVadThreshold: voiceChatVadThreshold
    voiceChatSessionTimeout: voiceChatSessionTimeout
  }
}

@description('Create PostgreSQL Flexible Server for vector database.')
module postgresServer 'postgres.bicep' = {
  name: 'allmPostgresServer'
  params: {
    location: location
    serverName: '${containerGroupName}-postgres'
    adminUsername: postgresAdminUsername
    adminPassword: postgresAdminPassword
  }
}
