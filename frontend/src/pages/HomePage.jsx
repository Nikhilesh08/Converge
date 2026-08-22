import { useChatStore } from "../store/useChatStore";
import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";

const HomePage = () => {
  const { selectedUser } = useChatStore();

  return (
    <div className="h-screen bg-base-100 pt-16">
      <div className="flex h-full w-full overflow-hidden border-t border-base-300">
        <Sidebar />

        {/* FIX: Chat Area Wrapper. Hidden on mobile if no user is selected. */}
        <div
          className={`flex-1 w-full h-full flex-col ${!selectedUser ? "hidden md:flex" : "flex"}`}
        >
          {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
