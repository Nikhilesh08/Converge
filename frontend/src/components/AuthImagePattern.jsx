import { Video, Mic, MessageSquare, Zap, Lock } from "lucide-react";

const AuthImagePattern = ({ title, subtitle }) => {
  return (
    <div className="hidden lg:flex items-center justify-center bg-base-200 p-12 relative overflow-hidden">
      {/* Ultra-subtle background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-md w-full z-10 flex flex-col items-center">
        {/* Sleek Floating Video UI Mockup */}
        <div className="relative w-full aspect-video bg-base-100/50 rounded-2xl border border-white/5 shadow-2xl overflow-hidden mb-10 group backdrop-blur-sm">
          {/* Abstract dark gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-base-300/80 to-base-100/80" />

          {/* Central Pulsing Camera Core */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="relative flex items-center justify-center">
              {/* Rotating outer rings */}
              <div className="absolute w-24 h-24 border border-primary/20 rounded-full animate-[spin_4s_linear_infinite]" />
              <div className="absolute w-32 h-32 border border-primary/10 rounded-full animate-[spin_5s_linear_infinite_reverse]" />

              {/* Core Icon */}
              <div className="w-16 h-16 bg-base-200 rounded-full flex items-center justify-center border border-white/5 shadow-lg group-hover:scale-110 transition-transform duration-500">
                <Video className="w-7 h-7 text-primary/80" />
              </div>
            </div>
          </div>

          {/* Top Left: Live Status Badge */}
          <div className="absolute top-4 left-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/5 shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
              <span className="text-[11px] font-semibold text-white/80 tracking-wide uppercase">
                WebRTC Live
              </span>
            </div>
          </div>

          {/* Bottom Center: Call Controls Mockup */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
            <div className="p-2.5 bg-black/40 backdrop-blur-md rounded-xl border border-white/5 text-white/60 hover:text-white transition-colors cursor-default">
              <Mic size={16} />
            </div>
            <div className="p-2.5 bg-black/40 backdrop-blur-md rounded-xl border border-white/5 text-white/60 hover:text-white transition-colors cursor-default">
              <MessageSquare size={16} />
            </div>
          </div>

          {/* Hover Reveal: Latency Feature Tag */}
          <div className="absolute top-10 -right-10 opacity-0 group-hover:right-4 group-hover:opacity-100 transition-all duration-500 ease-out">
            <div className="flex items-center gap-2 px-3 py-2 bg-base-200/90 backdrop-blur-md rounded-xl border border-white/5 shadow-xl">
              <Zap size={14} className="text-warning" />
              <span className="text-xs font-medium text-base-content/80">
                0ms Latency
              </span>
            </div>
          </div>

          {/* Hover Reveal: Security Feature Tag */}
          <div className="absolute bottom-10 -left-10 opacity-0 group-hover:left-4 group-hover:opacity-100 transition-all duration-500 ease-out delay-100">
            <div className="flex items-center gap-2 px-3 py-2 bg-base-200/90 backdrop-blur-md rounded-xl border border-white/5 shadow-xl">
              <Lock size={14} className="text-success" />
              <span className="text-xs font-medium text-base-content/80">
                E2E Encrypted
              </span>
            </div>
          </div>
        </div>

        {/* Clean, standard typography (No more oversized chunky fonts) */}
        <h2 className="text-2xl font-bold text-base-content mb-3 text-center tracking-tight">
          {title}
        </h2>
        <p className="text-base-content/60 text-center text-sm md:text-base leading-relaxed max-w-sm">
          {subtitle}
        </p>
      </div>
    </div>
  );
};

export default AuthImagePattern;
