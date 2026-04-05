# DocMind — AI PDF Chat

A sleek AI-powered PDF document reader. Upload any PDF and ask questions — Claude reads the full document and answers based on its content.

## Deploy to Vercel (5 minutes)

### 1. Install dependencies
```bash
npm install
```

### 2. Test locally (optional)
Create a `.env.local` file:
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```
Then run:
```bash
npm run dev
```

### 3. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/pdf-chat.git
git push -u origin main
```

### 4. Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Import your GitHub repo
4. Click **Deploy** (Vercel auto-detects Vite)

### 5. Add your API Key
1. In your Vercel project, go to **Settings → Environment Variables**
2. Add a new variable:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** your key from [console.anthropic.com](https://console.anthropic.com)
3. Click **Save**, then go to **Deployments** and click **Redeploy**

That's it! Your app is live. 🎉

## Project Structure

```
pdf-chat/
├── api/
│   └── chat.js          # Vercel serverless function (keeps API key secure)
├── src/
│   ├── App.jsx          # Main React app
│   ├── main.jsx         # Entry point
│   └── index.css        # Global reset
├── public/
│   └── favicon.svg
├── index.html
├── vite.config.js
├── vercel.json
└── package.json
```

## How it works
- PDF is converted to base64 in the browser
- Sent to `/api/chat` (your secure Vercel serverless function)
- The serverless function adds your API key and calls Anthropic
- Claude reads the full PDF and answers questions based on its content
