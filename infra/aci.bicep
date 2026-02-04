param location string
param containerGroupName string
param storageAccountName string
param timeZone string
param caddyDataFileShareName string
param allmStorageFileShareName string
param overridePublicUrl string = ''
@secure()
param secureAuthToken string
@secure()
param secureJwtSecret string
@secure()
param postgresConnectionString string // ADD THIS LINE

param containerImage string = 'rgbcpaiacr/anything-llm:latest'
param acrServer string = ''
param acrUsername string = ''

@secure()
param acrPassword string = ''

// Azure OpenAI Configuration
param azureOpenAIEndpoint string = ''
@secure()
param azureOpenAIKey string = ''
param azureOpenAIModel string = 'gpt-4'
param llmProvider string = 'azure'
param embeddingEngine string = 'native'
param embeddingModelPref string = 'text-embedding-ada-002'

// Azure AD Configuration
param azureAdClientId string = ''
param azureAdTenantId string = ''
@secure()
param azureAdClientSecret string = ''
param azureAdAdminEmail string = ''

// Voice Chat Configuration
param voiceChatEnabled string = 'false'
param azureRealtimeEndpoint string = ''
@secure()
param azureRealtimeKey string = ''
param azureRealtimeModel string = 'gpt-realtime'
param voiceChatDefaultVoice string = 'alloy'
param voiceChatVadThreshold string = '0.5'
param voiceChatSessionTimeout string = '1500000'

var publicUrl = empty(overridePublicUrl)
  ? toLower('${containerGroupName}.${location}.azurecontainer.io')
  : overridePublicUrl
var allmPort = 3001

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

resource containerGroup 'Microsoft.ContainerInstance/containerGroups@2024-05-01-preview' = {
  name: containerGroupName
  location: location
  properties: {
    sku: 'Standard'
    imageRegistryCredentials: empty(acrServer)
      ? []
      : [
          {
            server: acrServer
            username: acrUsername
            password: acrPassword
          }
        ]
    containers: [
      {
        name: '${containerGroupName}-caddy'
        properties: {
          // https://hub.docker.com/_/caddy
          image: 'docker.io/caddy:latest'
          command: [
            'caddy'
            'reverse-proxy'
            '--from'
            '${publicUrl}'
            '--to'
            'localhost:${allmPort}'
          ]
          resources: {
            requests: {
              cpu: 1
              memoryInGB: 1
            }
          }
          ports: [
            {
              protocol: 'TCP'
              port: 443
            }
            {
              protocol: 'TCP'
              port: 80
            }
          ]
          volumeMounts: [
            {
              name: caddyDataFileShareName
              mountPath: '/data'
              readOnly: false
            }
          ]
        }
      }
      {
        name: '${containerGroupName}-allm'
        properties: {
          // https://hub.docker.com/r/mintplexlabs/anythingllm
          image: containerImage
          resources: {
            requests: {
              cpu: 1
              memoryInGB: 3
            }
          }
          command: [
            'bash'
            '-c'
            // The AnythingLLM .env file is one level up from the storage directory so we create a symlink to it.
            'touch /app/server/storage/.env && ln -sf /app/server/storage/.env /app/server/.env && /usr/local/bin/docker-entrypoint.sh'
          ]
          ports: [
            {
              port: allmPort
              protocol: 'TCP'
            }
          ]
          volumeMounts: [
            {
              name: allmStorageFileShareName
              mountPath: '/app/server/storage'
              readOnly: false
            }
          ]
          environmentVariables: [
            // https://github.com/Mintplex-Labs/anything-llm/blob/master/server/.env.example
            {
              name: 'TZ'
              value: timeZone
            }
            {
              name: 'STORAGE_DIR'
              value: '/app/server/storage'
            }
            {
              name: 'DISABLE_TELEMETRY'
              value: 'true'
            }
            {
              name: 'AUTH_TOKEN'
              value: secureAuthToken
            }
            {
              name: 'JWT_SECRET'
              value: secureJwtSecret
            }
            {
              name: 'LLM_PROVIDER'
              value: llmProvider
            }
            {
              name: 'AZURE_OPENAI_ENDPOINT'
              value: azureOpenAIEndpoint
            }
            {
              name: 'AZURE_OPENAI_KEY'
              value: azureOpenAIKey
            }
            {
              name: 'OPEN_MODEL_PREF'
              value: azureOpenAIModel
            }
            {
              name: 'EMBEDDING_ENGINE'
              value: embeddingEngine
            }
            {
              name: 'EMBEDDING_MODEL_PREF'
              value: embeddingModelPref
            }
            // ADD THESE THREE LINES FOR PGVECTOR:
            {
              name: 'VECTOR_DB'
              value: 'pgvector'
            }
            {
              name: 'PGVECTOR_DB_URL'
              value: postgresConnectionString
            }
            // Azure AD Configuration
            {
              name: 'AZURE_AD_CLIENT_ID'
              value: azureAdClientId
            }
            {
              name: 'AZURE_AD_TENANT_ID'
              value: azureAdTenantId
            }
            {
              name: 'AZURE_AD_CLIENT_SECRET'
              value: azureAdClientSecret
            }
            {
              name: 'AZURE_AD_REDIRECT_URI'
              value: 'https://${publicUrl}/api/auth/azure/callback'
            }
            {
              name: 'AZURE_AD_ADMIN_EMAIL'
              value: azureAdAdminEmail
            }
            {
              name: 'FRONTEND_URL'
              value: 'https://${publicUrl}'
            }
            // Voice Chat Configuration
            {
              name: 'VOICE_CHAT_ENABLED'
              value: voiceChatEnabled
            }
            {
              name: 'AZURE_REALTIME_ENDPOINT'
              value: azureRealtimeEndpoint
            }
            {
              name: 'AZURE_REALTIME_KEY'
              value: azureRealtimeKey
            }
            {
              name: 'AZURE_REALTIME_MODEL'
              value: azureRealtimeModel
            }
            {
              name: 'VOICE_CHAT_DEFAULT_VOICE'
              value: voiceChatDefaultVoice
            }
            {
              name: 'VOICE_CHAT_VAD_THRESHOLD'
              value: voiceChatVadThreshold
            }
            {
              name: 'VOICE_CHAT_SESSION_TIMEOUT'
              value: voiceChatSessionTimeout
            }
          ]
        }
      }
    ]
    osType: 'Linux'
    restartPolicy: 'Never'
    ipAddress: {
      type: 'Public'
      dnsNameLabel: containerGroupName
      ports: [
        {
          protocol: 'TCP'
          port: 443
        }
        {
          protocol: 'TCP'
          port: 80
        }
      ]
    }
    volumes: [
      {
        name: caddyDataFileShareName
        azureFile: {
          shareName: caddyDataFileShareName
          storageAccountName: storageAccount.name
          storageAccountKey: storageAccount.listKeys().keys[0].value
          readOnly: false
        }
      }
      {
        name: allmStorageFileShareName
        azureFile: {
          shareName: allmStorageFileShareName
          storageAccountName: storageAccount.name
          storageAccountKey: storageAccount.listKeys().keys[0].value
          readOnly: false
        }
      }
    ]
  }
}
