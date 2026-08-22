import { useEffect, useRef, useState } from "react";
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
    callStartTime,
    isRemoteSharingScreen,
  } = useCallStore();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const ringtoneRef = useRef(new Audio("/sounds/ringtone.mp3"));
  const ringbackRef = useRef(new Audio("/sounds/ringback.mp3"));

  useEffect(() => {
    let intervalId;
    if (callState === "active" && callStartTime) {
      intervalId = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - callStartTime) / 1000));
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(intervalId);
  }, [callState, callStartTime]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  useEffect(() => {
    const ringtone = ringtoneRef.current;
    const ringback = ringbackRef.current;
    ringtone.loop = true;
    ringback.loop = true;

    const isReceiver = !!callerInfo?.signal;

    if (callState === "ringing") {
      if (isReceiver) {
        ringtone
          .play()
          .catch((e) => console.warn("Browser blocked ringtone autoplay:", e));
      } else {
        ringback
          .play()
          .catch((e) => console.warn("Browser blocked ringback autoplay:", e));
      }
    } else if (callState === "calling") {
      if (!isReceiver) {
        ringback
          .play()
          .catch((e) => console.warn("Browser blocked ringback autoplay:", e));
      }
    } else {
      ringtone.pause();
      ringtone.currentTime = 0;
      ringback.pause();
      ringback.currentTime = 0;
    }

    return () => {
      ringtone.pause();
      ringback.pause();
    };
  }, [callState, callerInfo]);

  useEffect(() => {
    if (localVideoRef.current && (localStream || screenStream)) {
      const streamToPlay = screenStream || localStream;
      if (localVideoRef.current.srcObject !== streamToPlay) {
        localVideoRef.current.srcObject = streamToPlay;
      }
      if (isVideoOn || screenStream) {
        localVideoRef.current.play().catch((error) => {
          console.warn("Browser blocked local video resume:", error);
        });
      }
    }
  }, [localStream, screenStream, callState, isVideoOn]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch((error) => {
        console.warn("Browser autoplay policy blocked audio/video:", error);
      });
    }
  }, [remoteStream, callState]);

  if (callState === "idle") return null;

  const isActive = callState === "active";
  const name = callerInfo?.fullName || callerInfo?.name || "User";
  const profilePic = callerInfo?.profilePic || "/avatar.png";

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-300">
      <div
        className={`relative bg-zinc-950/90 border border-white/10 overflow-hidden flex flex-col items-center justify-center shadow-2xl transition-all duration-500 rounded-3xl w-full ${
          isActive
            ? "max-w-5xl h-[85vh] aspect-video"
            : "max-w-md aspect-[4/5] sm:aspect-square"
        }`}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />

        {!isActive && (
          <div className="flex flex-col items-center justify-between h-full w-full p-8 z-10">
            <div className="text-center">
              <span className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">
                Converge Video
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight truncate max-w-xs">
                {name}
              </h2>
              <p className="text-primary font-medium text-sm mt-1 animate-pulse">
                {callState === "calling" ? "Calling..." : "Ringing..."}
              </p>
            </div>

            <div className="relative flex items-center justify-center my-6">
              <div className="absolute size-40 rounded-full border border-primary/20 animate-ping duration-1000" />
              <div className="absolute size-32 rounded-full border border-primary/30 animate-pulse" />
              <div className="size-24 rounded-full overflow-hidden border-2 border-primary/50 shadow-2xl z-10 bg-zinc-800">
                <img
                  src={profilePic}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              {callState === "ringing" && callerInfo?.signal && (
                <button
                  onClick={answerCall}
                  className="size-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-transform hover:scale-110 active:scale-95"
                  title="Accept"
                >
                  <Phone className="size-7" />
                </button>
              )}
              <button
                onClick={() => endCall(true, "cancelled")}
                className="size-16 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 transition-transform hover:scale-110 active:scale-95"
                title="Decline"
              >
                <PhoneOff className="size-7" />
              </button>
            </div>
          </div>
        )}

        {isActive && (
          <>
            <div className="absolute top-0 left-0 w-full p-4 md:p-6 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 via-black/30 to-transparent pointer-events-none">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-full overflow-hidden border border-white/20">
                  <img
                    src={profilePic}
                    alt={name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm sm:text-base leading-tight">
                    {name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="size-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-white/80 font-mono text-xs tracking-wider">
                      {formatTime(elapsedTime)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Real-time Screen Sharing Notification Banner */}
              {isRemoteSharingScreen && (
                <div className="bg-primary/90 text-white px-4 py-1.5 rounded-full text-xs font-medium shadow-lg backdrop-blur-md animate-pulse flex items-center gap-2">
                  <MonitorUp size={14} />
                  <span>{name} is sharing their screen</span>
                </div>
              )}
            </div>

            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover z-0"
            />

            <div className="absolute bottom-20 right-4 md:bottom-6 md:right-6 w-28 sm:w-44 aspect-video bg-zinc-900 rounded-2xl overflow-hidden border border-white/20 shadow-2xl z-20">
              {!isMicOn && (
                <div className="absolute top-2 right-2 z-30 bg-black/70 p-1.5 rounded-full backdrop-blur-md">
                  <MicOff className="size-3 text-rose-500" />
                </div>
              )}
              {!isVideoOn && !screenStream && (
                <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-zinc-800 z-20">
                  <VideoOff className="size-6 text-zinc-400" />
                </div>
              )}
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover relative z-10 ${
                  !screenStream ? "scale-x-[-1]" : ""
                } ${!isVideoOn && !screenStream ? "hidden" : "block"}`}
              />
            </div>

            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-zinc-900/80 px-4 py-2.5 rounded-full backdrop-blur-2xl border border-white/10 shadow-2xl z-30 pointer-events-auto">
              <button
                onClick={toggleMic}
                className={`size-10 rounded-full flex items-center justify-center transition-all ${
                  isMicOn
                    ? "bg-white/10 text-white hover:bg-white/20"
                    : "bg-white text-black"
                }`}
                title="Mute/Unmute"
              >
                {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
              </button>

              <button
                onClick={toggleVideo}
                className={`size-10 rounded-full flex items-center justify-center transition-all ${
                  isVideoOn
                    ? "bg-white/10 text-white hover:bg-white/20"
                    : "bg-white text-black"
                }`}
                title="Camera On/Off"
              >
                {isVideoOn ? <Video size={18} /> : <VideoOff size={18} />}
              </button>

              <button
                onClick={toggleScreenShare}
                className={`size-10 rounded-full flex items-center justify-center transition-all ${
                  screenStream
                    ? "bg-primary text-white"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
                title="Share Screen"
              >
                <MonitorUp size={18} />
              </button>

              <div className="w-px h-6 bg-white/20 mx-1" />

              <button
                onClick={() => endCall(true)}
                className="size-10 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 transition-all hover:scale-105 active:scale-95"
                title="End Call"
              >
                <PhoneOff size={18} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VideoCallModal;
