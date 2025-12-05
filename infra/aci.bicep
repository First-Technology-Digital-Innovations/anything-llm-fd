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
          image: 'mintplexlabs/anythingllm:latest'
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
