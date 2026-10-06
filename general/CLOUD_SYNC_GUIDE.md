# Chronote Cloud Synchronization Guide: Obtaining OAuth Tokens

This guide explains how to obtain and configure OAuth 2.0 access tokens for **Google Drive** and **Microsoft OneDrive** in Chronote v0.2.0.

---

## 1. Security Architecture & Privacy Principles

Chronote follows a strict **Local-First Architecture** ([ADR-005](file:///e:/workspace/chronote/general/DECISIONS/ADR-005-cloud-strategy.md)):
- **Zero Proprietary Cloud Servers:** Chronote does not run an authentication server, intermediate proxy, or database in the cloud.
- **Direct HTTPS Communication:** Your desktop app talks directly to official APIs (`https://www.googleapis.com` and `https://graph.microsoft.com`).
- **Local Machine Isolation:** Your OAuth token is saved exclusively on your local machine in `.chronote/cloud_sync.json` (which is excluded from Git via `.gitignore`).
- **Scoped Permissions:** Chronote only requires permissions to create and manage its designated folder (default: `Chronote/`).

---

## 2. Google Drive Setup Guide

### Required OAuth Scopes
To enable file sync and profile identification, the access token requires:
1. `https://www.googleapis.com/auth/drive.file` — Grants access to create and edit files/folders created by Chronote.
2. `https://www.googleapis.com/auth/userinfo.email` — Reads your account email for the connection badge.
3. `https://www.googleapis.com/auth/userinfo.profile` — Reads your display name and avatar.

---

### Option A: Google OAuth 2.0 Playground (Fastest — 2 Minutes)
The Google OAuth 2.0 Playground is Google's official testing portal. It is the easiest way to generate a valid access token without writing any code.

1. Open your browser and navigate to the **[Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)**.
2. On the left side (**Step 1: Select & authorize APIs**):
   - Scroll down to **Drive API v3** and check:
     - `https://www.googleapis.com/auth/drive.file`
   - Scroll down to **Google OAuth2 API v2** and check:
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`
   - *(Alternatively, paste these scope URLs into the "Input your own scopes" box at the bottom of the list)*.
3. Click the blue **Authorize APIs** button.
4. Sign in with your Google Account and click **Allow** on the consent screen.
5. In **Step 2: Exchange authorization code for tokens**:
   - Click the blue **Exchange authorization code for tokens** button.
6. Under the response section, find the **Access token** field.
7. Copy the token string (starts with `ya29....`).
8. In Chronote:
   - Click the **Cloud Sync icon (☁)** in the header.
   - Select **Google Drive**.
   - Paste the copied access token into the **OAuth 2.0 Access Token** field.
   - Click **Test Connection**. You should see your name and email appear with a green badge!

---

### Option B: Using the `gcloud` CLI (For Developers)
If you already have the Google Cloud SDK (`gcloud`) installed:

```bash
# 1. Login with drive and profile scopes
gcloud auth login --enable-gdrive-access --scopes=https://www.googleapis.com/auth/drive.file,https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/userinfo.profile

# 2. Print your current access token
gcloud auth print-access-token
```
Copy the printed token and paste it into Chronote.

---

### Option C: Custom Google Cloud Console Project (For Production / Personal App)
If you want to create your own dedicated Google Cloud OAuth Client:
1. Go to the **[Google Cloud Console](https://console.cloud.google.com/)**.
2. Create a new project (e.g. `Chronote Sync`).
3. Navigate to **APIs & Services > Library** and enable **Google Drive API**.
4. Navigate to **APIs & Services > OAuth consent screen**:
   - Choose **External** user type.
   - Add your own email under **Test Users**.
5. Navigate to **APIs & Services > Credentials**:
   - Click **Create Credentials > OAuth client ID**.
   - Select Application type: **Desktop app**.
   - Save your **Client ID** and **Client Secret**.
6. Use an OAuth helper (or Postman / Python script) to authorize your user and obtain access and refresh tokens.

---

## 3. Microsoft OneDrive Setup Guide

### Required OAuth Scopes
Chronote interacts with Microsoft OneDrive using the **Microsoft Graph API v1.0**:
1. `Files.ReadWrite` (or `Files.ReadWrite.All`) — Grants read/write access to files in your OneDrive.
2. `User.Read` — Reads your profile name and email address.

---

### Option A: Microsoft Graph Explorer (Fastest — 2 Minutes)
Microsoft Graph Explorer is Microsoft's official testing tool for Microsoft Graph APIs.

1. Open your browser and navigate to **[Microsoft Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer)**.
2. In the top right corner, click the **Sign In** user icon and log in with your Microsoft personal account (`@outlook.com`, `@hotmail.com`) or Work/School Microsoft 365 account.
3. In the left panel or query bar, click the **Consent to permissions** (or **Modify permissions**) tab.
4. Search for:
   - `Files.ReadWrite`
   - `User.Read`
5. Click **Consent** next to each permission and accept the consent prompt.
6. Next to the "Run query" button area, locate and click the **Access token** tab.
7. Click the **Copy token** icon (copies the full JWT string `eyJ0eXAi...`).
8. In Chronote:
   - Click the **Cloud Sync icon (☁)** in the header.
   - Select **Microsoft OneDrive**.
   - Paste the token into the **OAuth 2.0 Access Token** field.
   - Click **Test Connection**. Your Microsoft account name and email will be displayed!

---

### Option B: Using Azure CLI (`az`)
If you have the Azure CLI installed:

```bash
# 1. Sign in to Azure
az login

# 2. Request an access token for Microsoft Graph
az account get-access-token --resource-type ms-graph --query accessToken -o tsv
```
Copy the output token and paste it into Chronote.

---

### Option C: Azure Portal / Microsoft Entra ID App Registration
To set up a permanent personal client registration:
1. Go to the **[Azure Portal](https://portal.azure.com/)** or **[Microsoft Entra Admin Center](https://entra.microsoft.com/)**.
2. Navigate to **App registrations > New registration**:
   - Name: `Chronote Sync`
   - Supported account types: *Accounts in any organizational directory and personal Microsoft accounts*.
   - Redirect URI: `http://localhost` (Public client/native).
3. Under **API permissions > Add a permission > Microsoft Graph > Delegated permissions**:
   - Add `User.Read` and `Files.ReadWrite`.
4. Use MSAL or standard OAuth 2.0 authorization code flow with PKCE to generate access tokens.

---

## 4. Sandbox (Mock) Mode (Instant Local Testing)

If you are developing locally, testing conflict resolution, or working offline without internet access:
1. Open the **Cloud Sync** modal in Chronote.
2. Select the **Sandbox (Mock)** provider card.
3. Type any text into the token field (e.g. `sandbox_token`).
4. Click **Test Connection**.
   - Connects immediately to the in-memory mock engine.
   - Simulates uploads, downloads, and conflict scenarios with realistic latencies and zero external network calls.

---

## 5. Frequently Asked Questions (FAQ)

### Q: Why do access tokens expire?
Standard OAuth 2.0 bearer tokens issued by Google and Microsoft typically expire after **1 hour** for security reasons. When an access token expires:
1. The sync indicator will display a yellow warning or red error badge (`401 Unauthorized`).
2. Generate a fresh token from the Playground or Graph Explorer (takes < 30 seconds).
3. Paste the new token into the Cloud Sync modal and click **Test Connection**. Chronote will immediately resume sync where it left off.

### Q: Can Chronote access other files in my Google Drive or OneDrive?
No. Chronote limits its scope:
- On Google Drive, the `drive.file` scope only permits Chronote to access files that Chronote itself created. It cannot read your personal photos, spreadsheets, or other documents.
- On OneDrive, Chronote creates a dedicated folder named `Chronote` (or whatever custom name you designate) and confines all operations strictly within that folder.

### Q: How does Chronote handle simultaneous offline edits?
If notes were edited on both your local machine and in the cloud:
1. The **Differential Sync Engine** detects concurrent modification timestamps.
2. Chronote automatically launches the **3-Way Conflict Wizard**.
3. You can review diffs title-by-title, tag-by-tag, and block-by-block, and select whether to keep Local, Remote, Both, or write a custom merged section.
