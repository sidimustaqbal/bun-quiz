# Deployment to aaPanel with Supervisor

This guide outlines the steps to deploy the "fun-quiz" application to aaPanel using the Supervisor Manager.

## Prerequisites

- **aaPanel** installed on your server.
- **Bun** installed on your server.
  - Verify installation path: `which bun` (usually `/root/.bun/bin/bun` or `/usr/local/bin/bun`).
- **Supervisor Manager** installed from the aaPanel App Store.
- **Nginx** installed from the aaPanel App Store.

## 1. Prepare the Application

1.  **Clone or Upload** your project to the server (e.g., `/www/wwwroot/bun-quiz`).
2.  **Install Dependencies**:
    ```bash
    cd /www/wwwroot/bun-quiz
    bun install
    ```
3.  **Check Environment**:
    - Ensure `.env.production` exists.
    - If you want to change the port, edit `.env.production` or the `supervisord.conf` file.

## 2. Configure Supervisor

1.  Open **Supervisor Manager** in aaPanel.
2.  Click **Add Daemon**.
3.  Fill in the details:
    - **Name**: `bun-quiz`
    - **Run User**: `root` (or `www` if you have permission issues, but `root` is easier for Bun access if installed as root).
    - **Run Directory**: `/www/wwwroot/bun-quiz`
    - **Start Command**: `/root/.bun/bin/bun run start`
      - _Note: Replace `/root/.bun/bin/bun` with the actual path from `which bun`._
    - **Processes**: `1`
4.  Click **Confirm**.
5.  Check the status. It should be **Running**.

### Alternative: Use the provided `supervisord.conf`

If you prefer to use the file included in the project:

1.  Copy the content of `supervisord.conf` in the project root.
2.  Paste it into the Supervisor configuration or manually configure using the settings inside it.

## 3. Configure Nginx Reverse Proxy

To access your app via a domain (e.g., `quiz.example.com`):

1.  Go to **Website** -> **Add Site**.
2.  Enter your domain name.
3.  Select **Proxy** tab (or go to Configuration -> Reverse Proxy after creation).
4.  Add Proxy:
    - **Name**: `bun-app`
    - **Target URL**: `http://127.0.0.1:8000` (matches the `PORT` in `.env.production`).
5.  Save.

## 4. Troubleshooting

- **App not starting?**
  - Check Supervisor logs (in Supervisor Manager -> Log).
  - Try running manual command: `cd /www/wwwroot/bun-quiz && /root/.bun/bin/bun run start` to see errors.
- **502 Bad Gateway?**
  - Ensure the app is running on port 8000.
  - Check if `PORT` env var is correctly picked up.
