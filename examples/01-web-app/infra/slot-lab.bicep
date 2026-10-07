targetScope = 'resourceGroup'

@minLength(3)
@maxLength(16)
param prefix string
param location string = resourceGroup().location
@description('Exact sub_claim_prefix from the approved repository OIDC settings; default subject template only.')
@minLength(10)
param oidcSubjectPrefix string

var tags = { purpose: 'copilot-training', learner: prefix }
var siteName = '${prefix}-api'
var settings = [
  { name: 'NODE_ENV', value: 'production' }
  { name: 'WEBSITE_RUN_FROM_PACKAGE', value: '1' }
  { name: 'SCM_DO_BUILD_DURING_DEPLOYMENT', value: 'false' }
]
var websiteRole = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'de139f84-1756-47ae-9be6-808fbbe84772')
var readerRole = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'acdd72a7-3385-48ef-bd42-f606fba81ae7')

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${prefix}-plan'
  location: location
  tags: tags
  kind: 'linux'
  sku: { name: 'S1', tier: 'Standard', capacity: 1 }
  properties: { reserved: true }
}
resource app 'Microsoft.Web/sites@2023-12-01' = {
  name: siteName
  location: location
  tags: tags
  kind: 'app,linux'
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|22-lts'
      appCommandLine: 'node src/server.js'
      appSettings: settings
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      alwaysOn: false
    }
  }
}
resource slot 'Microsoft.Web/sites/slots@2023-12-01' = {
  parent: app
  name: 'staging'
  location: location
  tags: tags
  kind: 'app,linux'
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|22-lts'
      appCommandLine: 'node src/server.js'
      appSettings: settings
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      alwaysOn: false
    }
  }
}
resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${prefix}-logs'
  location: location
  tags: tags
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
    workspaceCapping: { dailyQuotaGb: 1 }
  }
}
resource diagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'training-logs'
  scope: app
  properties: {
    workspaceId: logs.id
    logAnalyticsDestinationType: 'Dedicated'
    logs: [
      { category: 'AppServiceConsoleLogs', enabled: true }
      { category: 'AppServiceHTTPLogs', enabled: true }
    ]
  }
}
resource stagingIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${prefix}-staging'
  location: location
  tags: tags
}
resource productionIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${prefix}-production'
  location: location
  tags: tags
}
resource stagingFederation 'Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials@2023-01-31' = {
  parent: stagingIdentity
  name: 'github-environment'
  properties: {
    issuer: 'https://token.actions.githubusercontent.com'
    subject: '${oidcSubjectPrefix}:environment:lab-staging'
    audiences: ['api://AzureADTokenExchange']
  }
}
resource productionFederation 'Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials@2023-01-31' = {
  parent: productionIdentity
  name: 'github-environment'
  properties: {
    issuer: 'https://token.actions.githubusercontent.com'
    subject: '${oidcSubjectPrefix}:environment:lab-production'
    audiences: ['api://AzureADTokenExchange']
  }
}
resource stagingWrite 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(slot.id, stagingIdentity.id, websiteRole)
  scope: slot
  properties: {
    roleDefinitionId: websiteRole
    principalId: stagingIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}
resource stagingRead 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(app.id, stagingIdentity.id, readerRole)
  scope: app
  properties: {
    roleDefinitionId: readerRole
    principalId: stagingIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}
resource productionWrite 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(app.id, productionIdentity.id, websiteRole)
  scope: app
  properties: {
    roleDefinitionId: websiteRole
    principalId: productionIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

output appName string = app.name
output stagingClientId string = stagingIdentity.properties.clientId
output productionClientId string = productionIdentity.properties.clientId
output productionHost string = app.properties.defaultHostName
output stagingHost string = slot.properties.defaultHostName
output workspaceId string = logs.properties.customerId
