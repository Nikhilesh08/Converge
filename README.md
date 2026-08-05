# ✨ Converge — Real-Time Chat App ✨

Converge is a full-stack real-time messaging platform built with the MERN stack, Socket.io, and WebRTC. Beyond basic chat, it supports group conversations, voice/video calling, file sharing, message reactions, and more.

🔗 **Live Demo:** [converge-lemon.vercel.app](https://converge-lemon.vercel.app)

## 🚀 Features

### Messaging
- ⚡ Real-time 1-on-1 and group messaging with Socket.io
- 👥 Group chats — create groups, add/remove members, leave, or delete a group
- 😀 Emoji picker for messages
- 🖼️ Image sharing (via Cloudinary)
- 🎙️ Voice notes — record and send audio messages
- 📎 Document/file attachments (PDFs, docs, etc.)
- 😍 Message reactions (emoji reactions on any message)
- 🗑️ Delete messages
- ✅ Read receipts (message seen status)
- ✍️ Typing indicators (1-on-1 and group)
- 🟢 Online/offline presence with last-seen timestamps

### Calling
- 📞 Real-time audio & video calls via WebRTC signaling over Socket.io
- 🖥️ Screen sharing during calls
- 🎛️ Mic/camera toggle controls
- 📁 Peer-to-peer file transfer during calls

### Core
- 🔐 Authentication & authorization with JWT (httpOnly cookies)
- 🧑‍🎨 Editable user profiles with profile picture upload
- 🎨 32 selectable DaisyUI themes (light, dark, synthwave, dracula, and more)
- 🗂️ Global state management with Zustand
- 🐞 Centralized error handling on client and server

## 🛠️ Tech Stack

| Layer     | Technology                                                       |
|-----------|--------------------------------------------------------------------|
| Frontend  | React 18, Vite, TailwindCSS, DaisyUI, Zustand, React Router        |
| Realtime  | Socket.io, WebRTC (audio/video calls, screen share, P2P transfer)  |
| Backend   | Node.js, Express, Socket.io                                        |
| Database  | MongoDB (Mongoose)                                                  |
| Auth      | JWT + bcrypt                                                        |
| Media     | Cloudinary                                                          |
| Hosting   | Vercel                                                               |

## 📁 Project Structure

```
Converge/
├── backend/
│   └── src/
│       ├── controllers/   # auth, message, and group logic
│       ├── lib/           # db, cloudinary, socket.io, utils
│       ├── middleware/    # JWT route protection
│       ├── models/        # User, Message, Group schemas
│       ├── routes/        # /api/auth, /api/messages, /api/groups
│       └── seeds/         # DB seed script
├── frontend/
│   └── src/
│       ├── components/    # chat UI, modals, sidebar, video call UI
│       ├── pages/         # Login, SignUp, Home, Profile, Settings
│       ├── store/         # Zustand stores (auth, chat, calls, theme)
│       ├── lib/           # axios instance, utils
│       └── constants/     # DaisyUI theme list
├── package.json           # Root build/start scripts
└── LICENSE
```

## ⚙️ Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Nikhilesh08/Converge.git
cd Converge
```

### 2. Set up environment variables

**`backend/.env`**

```env
MONGODB_URI=your_mongodb_connection_string
PORT=5001
JWT_SECRET=your_jwt_secret

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

**`frontend/.env`**

```env
VITE_API_URL=http://localhost:5001/api
```

### 3. Install dependencies & build

```bash
npm run build
```

This installs dependencies for both `backend` and `frontend`, then builds the frontend for production.

### 4. Run the app

**Production (root scripts):**

```bash
npm start
```

**Development (with hot reload, run in two terminals):**

```bash
# terminal 1 — backend
cd backend && npm run dev

# terminal 2 — frontend
cd frontend && npm run dev
```

## 📄 License

This project is licensed under the [MIT License](LICENSE).

## 🙌 Acknowledgements

Built with ❤️ using the MERN stack, Socket.io, and WebRTC.
