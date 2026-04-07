# Azure Container Instance (ACI)

Create an Azure Container Instance container group with two containers:

## Deployment Instructions

- Copy the `.env.template` file in this folder and rename to `.env` (this will be ignored by `git`).
- Populate with the necessary values.

  ```env
  TENANT_ID=
  SUBSCRIPTION_ID=
  RESOURCE_GROUP=
  LOCATION=
  ```

- Copy the `parameters.template.json` file and rename to `parameters.json` and update for your needs:
  - `timeZone`: Set this to the time zone you want to use. e.g. `Australia/Brisbane`
  - `containerGroupName`: The name of the container group to create.
  - `storageAccountName`: The name of the storage account to create.
  - `overridePublicUrl`: If you want to use a custom domain name set that to you url (e.g. `allm.example.com`). Then in your DNS provider you will need to create a CNAME record that points `allm.example.com` to the url of the container group which will be in the form `<container-group-name>.<location>.azurecontainer.io`
  - `secureAuthToken`: The password for the admin user. This value is used to authenticate to the AnythingLLM admin panel.
  - `secureJwtSecret`: Random string for seeding. Generate random string at least 12 chars long.

- Run the PowerShell script [deploy.json](./deploy.ps1)

## Bicep Files

| File                    | Description                                                                   |
| ----------------------- | ----------------------------------------------------------------------------- |
| `main.bicep`            | The main Bicep file that orchestrates the deployment of the entire solution.  |
| `storage-account.bicep` | Creates a storage account and file shares to persist data for the containers. |
| `aci.bicep`             | Defines the Azure Container Instance container group with two containers.     |
