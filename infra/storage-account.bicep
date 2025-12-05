param location string
param containerGroupName string
param storageAccountName string

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    dnsEndpointType: 'Standard'
    allowedCopyScope: 'AAD'
    allowCrossTenantReplication: false
    isSftpEnabled: false
    isNfsV3Enabled: false
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: true
    largeFileSharesState: 'Enabled'
    isHnsEnabled: true
    supportsHttpsTrafficOnly: true
    accessTier: 'Hot'
    encryption: {
      requireInfrastructureEncryption: true
      services: {
        file: {
          enabled: true
          keyType: 'Account'
        }
      }
      keySource: 'Microsoft.Storage'
    }
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Allow'
    }
  }
}

resource fileServices 'Microsoft.Storage/storageAccounts/fileServices@2023-05-01' = {
  parent: storageAccount
  name: 'default'
  properties: {
    protocolSettings: {
      smb: {
        versions: 'SMB3.0'
      }
    }
    shareDeleteRetentionPolicy: {
      enabled: false
      allowPermanentDelete: true
    }
  }
}

resource caddyDataFileShare 'Microsoft.Storage/storageAccounts/fileServices/shares@2023-05-01' = {
  parent: fileServices
  name: '${containerGroupName}-caddydata'
  properties: {
    shareQuota: 10
    accessTier: 'TransactionOptimized'
    enabledProtocols: 'SMB'
  }
}

resource allmStorageFileShare 'Microsoft.Storage/storageAccounts/fileServices/shares@2023-05-01' = {
  parent: fileServices
  name: '${containerGroupName}-allmstorage'
  properties: {
    shareQuota: 10
    accessTier: 'TransactionOptimized'
    enabledProtocols: 'SMB'
  }
}

output caddyDataFileShareName string = caddyDataFileShare.name
output allmStorageFileShare string = allmStorageFileShare.name
