# Build and Publish New Image to UAT

1. **Build the Docker image**  
   This results in an image named `bcpai-img`.

   ```bash
   docker buildx build --no-cache --platform linux/amd64 --provenance=false --load -f docker/Dockerfile -t bcpai-img .
   ```
2. **Tag the Image**
    ```
    docker tag bcpai-img bcpairegistry.azurecr.io/bcpaiapp-dev:latest
    ```
3. **Log into the Tuning Fork tenant / Yamaha AI POV subscription**
    ```
    az login --tenant 2dbd02ad-b22f-42de-9803-833afbfb3548
    ```
4. **Connect to the Azure Container Registry**
    ```
    az acr login --name bcpaiRegistry
    ```

5. **Push the image to the registry**
    ```
    docker push bcpairegistry.azurecr.io/bcpaiapp-dev:latest
    ```

# Deploy to Prod instead of UAT
I haven't tested this yet, but it should be straightforward. There may be a slot-swap style deployment available for the containers/images. Otherwise, follow the exact same process as above, except use the production image tag instead.

**Production Tag**
    ```
    docker tag bcpai-img bcpairegistry.azurecr.io/bcpaiapp:latest
    ```

**Push Production Image**
    ```
    docker push bcpairegistry.azurecr.io/bcpaiapp:latest
    ```