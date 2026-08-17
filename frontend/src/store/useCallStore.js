import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";
import toast from "react-hot-toast";

let peerConnection = null;
let localStream = null;
let dataChannel = null;
// FIX: Queue to hold ICE candidates that arrive before the connection is ready
let pendingIceCandidates = [];

export const useCallStore = create((set, get) => ({
  callState: "idle",
  callerInfo: null,
  remoteStream: null,
  localStream: null,
  screenStream: null,
  isMicOn: true,
  isVideoOn: true,

  initWebRTCListeners: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // FIX: Remove existing listeners before adding new ones to prevent React remount duplication
    socket.off("callUser");
    socket.off("callAccepted");
    socket.off("iceCandidate");
    socket.off("callEnded");

    socket.on("callUser", async ({ signal, from, name }) => {
      set({ callState: "ringing", callerInfo: { id: from, name, signal } });
    });

    socket.on("callAccepted", async (signal) => {
      set({ callState: "active" });
      if (peerConnection) {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(signal),
        );

        // FIX: Process any ICE candidates that were queued while we were waiting for the answer
        pendingIceCandidates.forEach((candidate) => {
          peerConnection
            .addIceCandidate(new RTCIceCandidate(candidate))
            .catch((e) => console.error(e));
        });
        pendingIceCandidates = [];
      }
    });

    socket.on("iceCandidate", async (candidate) => {
      // FIX: If remote description is set, add candidate. Otherwise, queue it up!
      if (peerConnection && peerConnection.remoteDescription) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error("Error adding received ice candidate", error);
        }
      } else {
        pendingIceCandidates.push(candidate);
      }
    });

    socket.on("callEnded", () => {
      get().endCall(false);
      toast("Call ended");
    });
  },

  setupPeerConnection: (partnerId, isInitiator) => {
    const socket = useAuthStore.getState().socket;

    // FIX: Added robust STUN servers for production NAT traversal
    const iceServers = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
    ];

    // Optional: Prepare for production TURN server (inject via Vite ENV)
    if (import.meta.env.VITE_TURN_URL) {
      iceServers.push({
        urls: import.meta.env.VITE_TURN_URL,
        username: import.meta.env.VITE_TURN_USERNAME,
        credential: import.meta.env.VITE_TURN_PASSWORD,
      });
    }

    peerConnection = new RTCPeerConnection({ iceServers });

    if (localStream) {
      localStream
        .getTracks()
        .forEach((track) => peerConnection.addTrack(track, localStream));
    }

    peerConnection.ontrack = (event) => {
      set({ remoteStream: event.streams[0] });
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("iceCandidate", {
          to: partnerId,
          candidate: event.candidate,
        });
      }
    };

    if (isInitiator) {
      dataChannel = peerConnection.createDataChannel("fileTransfer");
      get().setupDataChannel(dataChannel);
    } else {
      peerConnection.ondatachannel = (event) => {
        dataChannel = event.channel;
        get().setupDataChannel(dataChannel);
      };
    }
  },

  setupDataChannel: (channel) => {
    channel.onmessage = (event) => {
      const blob = new Blob([event.data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Converge_Transfer_File";
      a.click();
      toast.success("Received a P2P file!");
    };
  },

  startCall: async (targetUser) => {
    const socket = useAuthStore.getState().socket;
    const authUser = useAuthStore.getState().authUser;

    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      set({
        localStream,
        callState: "calling",
        callerInfo: targetUser,
        isMicOn: true,
        isVideoOn: true,
      });

      // Clear old queued candidates
      pendingIceCandidates = [];
      get().setupPeerConnection(targetUser._id, true);

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socket.emit("callUser", {
        userToCall: targetUser._id,
        signalData: offer,
        from: authUser._id,
        name: authUser.fullName,
      });
    } catch (error) {
      console.error("Camera access error:", error);
      toast.error("Could not access camera/microphone");
      set({ callState: "idle" });
    }
  },

  answerCall: async () => {
    const socket = useAuthStore.getState().socket;
    const { callerInfo } = get();

    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      set({ localStream, callState: "active", isMicOn: true, isVideoOn: true });

      get().setupPeerConnection(callerInfo.id, false);
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(callerInfo.signal),
      );

      // FIX: Process any ICE candidates that were queued while ringing
      pendingIceCandidates.forEach((candidate) => {
        peerConnection
          .addIceCandidate(new RTCIceCandidate(candidate))
          .catch((e) => console.error(e));
      });
      pendingIceCandidates = [];

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socket.emit("answerCall", { signal: answer, to: callerInfo.id });
    } catch (error) {
      console.error("Camera access error:", error);
      toast.error("Could not access camera/microphone");
    }
  },

  toggleMic: () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        set({ isMicOn: audioTrack.enabled });
      }
    }
  },

  toggleVideo: () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        set({ isVideoOn: videoTrack.enabled });
      }
    }
  },

  toggleScreenShare: async () => {
    try {
      const { screenStream } = get();

      if (screenStream) {
        screenStream.getTracks().forEach((track) => track.stop());
        const videoTrack = localStream.getVideoTracks()[0];
        const sender = peerConnection
          .getSenders()
          .find((s) => s.track.kind === "video");
        if (sender) sender.replaceTrack(videoTrack);

        set({ screenStream: null });
      } else {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        const screenTrack = stream.getVideoTracks()[0];
        const sender = peerConnection
          .getSenders()
          .find((s) => s.track.kind === "video");
        if (sender) sender.replaceTrack(screenTrack);

        set({ screenStream: stream });

        screenTrack.onended = () => {
          const videoTrack = localStream.getVideoTracks()[0];
          const sender = peerConnection
            .getSenders()
            .find((s) => s.track.kind === "video");
          if (sender) sender.replaceTrack(videoTrack);
          set({ screenStream: null });
        };
      }
    } catch (error) {
      toast.error("Screen sharing cancelled or failed");
    }
  },

  endCall: (emitEvent = true) => {
    const socket = useAuthStore.getState().socket;
    const { callerInfo, screenStream } = get();

    if (emitEvent && callerInfo) {
      socket.emit("endCall", { to: callerInfo.id || callerInfo._id });
    }

    if (localStream) localStream.getTracks().forEach((track) => track.stop());
    if (screenStream) screenStream.getTracks().forEach((track) => track.stop());
    if (peerConnection) {
      peerConnection.close();
    }

    // FIX: Clear state fully
    peerConnection = null;
    localStream = null;
    dataChannel = null;
    pendingIceCandidates = [];

    set({
      callState: "idle",
      remoteStream: null,
      localStream: null,
      screenStream: null,
      callerInfo: null,
    });
  },

  sendP2PFile: (file) => {
    if (!dataChannel || dataChannel.readyState !== "open") {
      toast.error("You must be in an active video call to send direct files");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      dataChannel.send(e.target.result);
      toast.success("File sent directly to peer!");
    };
    reader.readAsArrayBuffer(file);
  },
}));
