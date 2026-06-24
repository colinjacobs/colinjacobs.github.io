# Deploying OBOL to Azure Container Apps

Run these yourself — I can prepare the package but logging into your own
Azure account has to be something you do, not something handed to an
assistant.

## 0. Prerequisites

- An Azure account (free tier is fine to start)
- Azure CLI installed: https://learn.microsoft.com/cli/azure/install-azure-cli
- This `obol-model` folder, with the `.gguf` model file sitting in it
  named exactly `qwen2.5-coder-1.5b-instruct-q8_0.gguf` (matches the
  Dockerfile's COPY line — rename if yours differs, or edit the
  Dockerfile to match).

Log in once, interactively:

    az login

## 1. Resource group + container registry

A resource group is just a named bucket Azure groups your resources
under, so you can find/delete everything from this project together
later.

    az group create --name halcyon-rg --location eastus

    az acr create --resource-group halcyon-rg --name halcyonacr --sku Basic

(`halcyonacr` has to be globally unique across all of Azure — if that
name is taken, pick another, e.g. `halcyonacr01`.)

## 2. Build the container image — in the cloud, not locally

`az acr build` uploads your folder and builds the Docker image on
Azure's infrastructure, so you don't need Docker installed locally at
all.

    cd /path/to/obol-model
    az acr build --registry halcyonacr --image obol-server:v1 .

**This upload will take a while** — the build context includes the
~1.85GB model file, so this is a genuine multi-minute step depending on
your upload bandwidth, not a stall. Let it run.

## 3. Container Apps environment

    az extension add --name containerapp --upgrade
    az provider register --namespace Microsoft.App
    az provider register --namespace Microsoft.OperationalInsights

    az containerapp env create \
      --name halcyon-env \
      --resource-group halcyon-rg \
      --location eastus

## 4. Registry credentials

For simplicity, enable admin credentials on the registry (fine for a
portfolio project; a production setup would use a managed identity
instead — worth mentioning if asked in an interview, not worth the
complexity here):

    az acr update --name halcyonacr --admin-enabled true
    az acr credential show --name halcyonacr

Note the `username` and one `password` value from that output — you'll
use them in the next step.

## 5. Deploy the container app

    az containerapp create \
      --name obol-server \
      --resource-group halcyon-rg \
      --environment halcyon-env \
      --image halcyonacr.azurecr.io/obol-server:v1 \
      --target-port 8765 \
      --ingress external \
      --registry-server halcyonacr.azurecr.io \
      --registry-username <username-from-step-4> \
      --registry-password <password-from-step-4> \
      --cpu 2.0 --memory 4.0Gi \
      --min-replicas 0 --max-replicas 1 \
      --env-vars OBOL_ALLOWED_ORIGIN=*

Notes on the choices here:
- `--cpu 2.0 --memory 4.0Gi`: the model itself needs ~2-2.5GB resident;
  this leaves real headroom rather than running right at the edge.
- `--min-replicas 0`: this is the scale-to-zero behavior — idle cost
  drops to ~nothing between visits, at the cost of a cold-start delay
  (model reload) on the first request after idle.
- `OBOL_ALLOWED_ORIGIN=*` is a **placeholder**. Once you know the exact
  URL your desktop shell will be hosted at, come back and update this
  (see step 7) — wildcard CORS on a publicly reachable model endpoint
  means any website could call it.

## 6. Get your live URL

    az containerapp show \
      --name obol-server \
      --resource-group halcyon-rg \
      --query properties.configuration.ingress.fqdn -o tsv

This prints something like:

    obol-server.whitewater-12345.eastus.azurecontainerapps.io

Your live endpoint is `https://<that-fqdn>/obol`. Test it directly:

    curl -X POST https://<fqdn>/obol \
      -H "Content-Type: application/json" \
      -d '{"input": "STATUS"}'

You should get back the same JSON shape you've been seeing locally. If
this works, the backend is genuinely live.

## 7. Point the desktop shell at it

In `apps/ai-assistant/index.js`, change:

    const OBOL_ENDPOINT = 'http://127.0.0.1:8765/obol';

to:

    const OBOL_ENDPOINT = 'https://<your-fqdn>/obol';

Then, once you know where the shell itself is hosted (next conversation
— this is a separate decision from the backend), update the CORS env
var to match it exactly instead of `*`:

    az containerapp update \
      --name obol-server \
      --resource-group halcyon-rg \
      --set-env-vars OBOL_ALLOWED_ORIGIN=https://your-actual-frontend-domain

## 8. Cost-watching

Check what you've actually spent any time:

    az consumption usage list --output table

(This can lag a day or so behind real usage — Azure's cost data isn't
instant.)

## 9. Tearing it down

If you ever want to stop everything and stop being billed entirely,
deleting the resource group removes everything created above in one
shot:

    az group delete --name halcyon-rg --yes --no-wait
