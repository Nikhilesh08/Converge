import { useEffect, useRef } from "react";
import { useCallStore } from "../store/useCallStore";
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  MonitorUp,
  Mic,
  MicOff,
} from "lucide-react";

const VideoCallModal = () => {
  const {
    callState,
    callerInfo,
    localStream,
    remoteStream,
    screenStream,
    answerCall,
    endCall,
    toggleScreenShare,
    isMicOn,
    isVideoOn,
    toggleMic,
    toggleVideo,
  } = useCallStore();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Attach local / screen sharing stream and force browser playback
  useEffect(() => {
    if (localVideoRef.current && (localStream || screenStream)) {
      const streamToPlay = screenStream || localStream;

      // Only assign if different to prevent the stream from flashing black
      if (localVideoRef.current.srcObject !== streamToPlay) {
        localVideoRef.current.srcObject = streamToPlay;
      }

      // Force the browser to resume playing when the element unhides
      if (isVideoOn || screenStream) {
        localVideoRef.current.play().catch((error) => {
          console.warn("Browser blocked local video resume:", error);
        });
      }
    }
  }, [localStream, screenStream, callState, isVideoOn]);

  // Attach remote stream & bypass mobile/desktop autoplay policies
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch((error) => {
        console.warn(
          "Browser autoplay policy blocked audio/video. User interaction required:",
          error,
        );
      });
    }
  }, [remoteStream, callState]);

  if (callState === "idle") return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl aspect-video bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 flex flex-col items-center justify-center">
        {/* Ringing UI */}
        {callState === "ringing" && (
          <div className="text-center animate-pulse">
            <div className="size-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-primary">
              <Video className="size-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {callerInfo?.name} is calling...
            </h2>
            <div className="flex gap-4 justify-center mt-8">
              <button
                onClick={answerCall}
                className="btn btn-success btn-circle btn-lg shadow-lg shadow-success/30"
              >
                <Phone className="size-8 text-white" />
              </button>
              <button
                onClick={() => endCall(true)}
                className="btn btn-error btn-circle btn-lg shadow-lg shadow-error/30"
              >
                <PhoneOff className="size-8 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* Calling UI */}
        {callState === "calling" && (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">
              Calling {callerInfo?.fullName || callerInfo?.name}...
            </h2>
            <p className="text-zinc-400 mb-8">Waiting for them to pick up</p>
            <button
              onClick={() => endCall(true)}
              className="btn btn-error btn-circle btn-lg"
            >
              <PhoneOff className="size-8 text-white" />
            </button>
          </div>
        )}

        {/* Active Call UI */}
        {callState === "active" && (
          <>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Local Video Preview */}
            <div className="absolute bottom-6 right-6 w-48 aspect-video bg-black rounded-lg overflow-hidden border-2 border-zinc-700 shadow-xl">
              {/* Persistent Mute Indicator Overlay */}
              {!isMicOn && (
                <div className="absolute top-2 right-2 z-10 bg-black/70 p-1.5 rounded-full shadow-lg backdrop-blur-md">
                  <MicOff className="size-4 text-error" />
                </div>
              )}

              {/* Video Off Placeholder Overlay */}
              {!isVideoOn && !screenStream && (
                <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-zinc-800 z-10">
                  <VideoOff className="size-8 text-zinc-500" />
                </div>
              )}

              {/* Kept permanently mounted to avoid losing stream reference */}
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover relative z-0 ${!screenStream ? "mirror" : ""} ${
                  !isVideoOn && !screenStream ? "hidden" : "block"
                }`}
              />
            </div>

            {/* Controls */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 bg-black/60 p-3 rounded-full backdrop-blur-md">
              <button
                onClick={toggleMic}
                className={`btn btn-circle ${
                  isMicOn
                    ? "btn-ghost text-white hover:bg-white/20"
                    : "btn-error text-white"
                }`}
                title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
              >
                {isMicOn ? (
                  <Mic className="size-5" />
                ) : (
                  <MicOff className="size-5" />
                )}
              </button>

              <button
                onClick={toggleVideo}
                className={`btn btn-circle ${
                  isVideoOn
                    ? "btn-ghost text-white hover:bg-white/20"
                    : "btn-error text-white"
                }`}
                title={isVideoOn ? "Turn Off Camera" : "Turn On Camera"}
              >
                {isVideoOn ? (
                  <Video className="size-5" />
                ) : (
                  <VideoOff className="size-5" />
                )}
              </button>

              <button
                onClick={toggleScreenShare}
                className={`btn btn-circle ${
                  screenStream
                    ? "btn-primary"
                    : "btn-ghost text-white hover:bg-white/20"
                }`}
                title="Share Screen"
              >
                <MonitorUp className="size-5" />
              </button>

              <div className="w-px h-10 bg-white/20 mx-2 self-center"></div>

              <button
                onClick={() => endCall(true)}
                className="btn btn-error btn-circle"
                title="End Call"
              >
                <PhoneOff className="size-5 text-white" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VideoCallModal;
