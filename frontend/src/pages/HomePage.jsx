import { useChatStore } from "../store/useChatStore";

import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";

const HomePage = () => {
  const { selectedUser } = useChatStore();

  return (
    // We use pt-16 (or pt-20) to push the chat area just below your Navbar
    <div className="h-screen bg-base-100 pt-16">
      {/* Removed max-w, rounded corners, and margins so it stretches edge-to-edge */}
      <div className="flex h-full w-full overflow-hidden border-t border-base-300">
        <Sidebar />

        {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
      </div>
    </div>
  );
};

export default HomePage;
