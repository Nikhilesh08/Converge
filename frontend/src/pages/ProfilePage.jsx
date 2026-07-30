import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import {
  Camera,
  Mail,
  User,
  Calendar,
  ShieldCheck,
  Trash2,
} from "lucide-react";

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState(null);

  // Check if a picture exists locally or in the DB
  const hasProfilePic = selectedImg || authUser?.profilePic;

  // Extract the first letter of the user's name for the WhatsApp-style fallback
  const initial = authUser?.fullName?.charAt(0).toUpperCase() || "?";

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.readAsDataURL(file);

    reader.onload = async () => {
      const base64Image = reader.result;
      setSelectedImg(base64Image);
      await updateProfile({ profilePic: base64Image });
    };
  };

  // Function to clear the profile picture
  const handleRemoveImage = async () => {
    setSelectedImg(null);
    await updateProfile({ profilePic: "" });
  };

  return (
    <div className="min-h-screen pt-20 pb-10 flex justify-center px-4">
      <div className="max-w-3xl w-full">
        {/* Enterprise-grade card container */}
        <div className="card bg-base-100 shadow-2xl border border-base-200">
          <div className="card-body p-6 lg:p-10">
            {/* Header */}
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold text-base-content">
                Profile Settings
              </h1>
              <p className="text-base-content/60 mt-2">
                Manage your personal information and account security.
              </p>
            </div>

            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4 mb-10">
              <div className="relative group inline-block">
                {/* Dynamic Avatar Render */}
                {hasProfilePic ? (
                  <div className="avatar">
                    <div className="w-32 h-32 rounded-full ring ring-primary ring-offset-base-100 ring-offset-4 transition-all duration-300 group-hover:ring-primary/70">
                      <img
                        src={selectedImg || authUser.profilePic}
                        alt="Profile"
                        className="object-cover"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="avatar placeholder">
                    <div className="w-32 h-32 bg-base-300 text-base-content rounded-full ring ring-primary ring-offset-base-100 ring-offset-4 transition-all duration-300 group-hover:ring-primary/70 flex items-center justify-center">
                      <span className="text-5xl font-semibold">{initial}</span>
                    </div>
                  </div>
                )}

                {/* Upload Button */}
                <label
                  htmlFor="avatar-upload"
                  className={`
                    absolute bottom-0 right-0 
                    bg-primary hover:bg-primary/90 text-primary-content
                    p-2.5 rounded-full cursor-pointer shadow-lg
                    transition-all duration-200 hover:scale-110 border-4 border-base-100 z-10
                    ${isUpdatingProfile ? "animate-pulse pointer-events-none" : ""}
                  `}
                  title="Upload Photo"
                >
                  <Camera className="w-5 h-5" />
                  <input
                    type="file"
                    id="avatar-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUpdatingProfile}
                  />
                </label>

                {/* Remove Button (Only visible if there is a photo to remove) */}
                {hasProfilePic && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    disabled={isUpdatingProfile}
                    className={`
                      absolute bottom-0 left-0 
                      bg-error hover:bg-error/90 text-white
                      p-2.5 rounded-full cursor-pointer shadow-lg
                      transition-all duration-200 hover:scale-110 border-4 border-base-100 z-10
                      ${isUpdatingProfile ? "animate-pulse pointer-events-none" : ""}
                    `}
                    title="Remove Photo"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
              <p className="text-sm text-base-content/60 font-medium mt-2">
                {isUpdatingProfile
                  ? "Updating profile..."
                  : "Manage your profile picture"}
              </p>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              <div className="form-control">
                <label className="label">
                  <span className="label-text flex items-center gap-2 font-medium text-base-content/70">
                    <User className="w-4 h-4" /> Full Name
                  </span>
                </label>
                <input
                  type="text"
                  value={authUser?.fullName}
                  readOnly
                  className="input input-bordered w-full bg-base-200/50 cursor-not-allowed focus:outline-none"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text flex items-center gap-2 font-medium text-base-content/70">
                    <Mail className="w-4 h-4" /> Email Address
                  </span>
                </label>
                <input
                  type="text"
                  value={authUser?.email}
                  readOnly
                  className="input input-bordered w-full bg-base-200/50 cursor-not-allowed focus:outline-none"
                />
              </div>
            </div>

            {/* Account Details */}
            <div>
              <h3 className="text-lg font-bold mb-4 text-base-content flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Account Information
              </h3>
              <div className="bg-base-200/50 rounded-2xl border border-base-200 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-base-300 hover:bg-base-300/30 transition-colors">
                  <div className="flex items-center gap-3 text-base-content/80">
                    <Calendar className="w-5 h-5" />
                    <span className="font-medium">Member Since</span>
                  </div>
                  <span className="font-semibold text-base-content">
                    {authUser.createdAt?.split("T")[0]}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 hover:bg-base-300/30 transition-colors">
                  <div className="flex items-center gap-3 text-base-content/80">
                    <ShieldCheck className="w-5 h-5" />
                    <span className="font-medium">Account Status</span>
                  </div>
                  <div className="badge badge-success gap-1.5 py-3 px-3 font-medium text-white">
                    <span className="size-1.5 bg-white rounded-full"></span>
                    Active
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
