$env:STORAGE_LOCATION = "$HOME\Documents\anythingllm"; `
    If (!(Test-Path $env:STORAGE_LOCATION)) { New-Item $env:STORAGE_LOCATION -ItemType Directory }; `
    Copy-Item ".\docker\.env" -Destination "$env:STORAGE_LOCATION\.env" -Force; `
    docker run -d -p 3001:3001 `
    --cap-add SYS_ADMIN `
    -v "$env:STORAGE_LOCATION`:/app/server/storage" `
    -v "$env:STORAGE_LOCATION\.env:/app/server/.env" `
    -e STORAGE_DIR="/app/server/storage" `
    anythingllm-fd-anything-llm;