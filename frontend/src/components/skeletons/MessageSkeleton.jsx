const MessageSkeleton = () => {
  // Create an array of 6 items for skeleton messages
  const skeletonMessages = Array(6).fill(null);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {skeletonMessages.map((_, idx) => {
        // Randomize width for each skeleton bubble to make it look realistic
        const bubbleWidth =
          idx % 3 === 0
            ? "w-[120px]"
            : idx % 2 === 0
              ? "w-[250px]"
              : "w-[180px]";

        return (
          <div
            key={idx}
            className={`chat ${idx % 2 === 0 ? "chat-start" : "chat-end"}`}
          >
            <div className="chat-image avatar">
              <div className="size-10 rounded-full">
                {/* DaisyUI 'skeleton' class usually handles the pulse animation */}
                <div className="skeleton w-full h-full rounded-full" />
              </div>
            </div>

            <div className="chat-header mb-1">
              <div className="skeleton h-4 w-16" />
            </div>

            <div className="chat-bubble bg-transparent p-0">
              {/* Using the dynamic bubbleWidth here */}
              <div className={`skeleton h-16 ${bubbleWidth}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MessageSkeleton;
