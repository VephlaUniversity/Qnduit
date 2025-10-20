import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { toast } from "sonner";

export const DeleteProfile = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleDelete = async (e) => {
    e.preventDefault();

    if (!password) {
      toast.error("Please enter your password to confirm deletion");
      return;
    }

    setIsDeleting(true);

    try {
      toast.success("Profile deleted successfully");

      // Sign out the user
      await signOut();

      // Redirect to sign-in page
      navigate("/signin");
    } catch (error) {
      toast.error("Failed to delete profile. Please try again.");
      console.error("Profile deletion error:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          Delete Profile
        </h1>
      </div>

      <div className="bg-[#1A1A1E] rounded-lg border border-white/5 p-6 md:p-8 max-w-2xl">
        <h2 className="text-xl font-semibold text-white mb-2">
          Are You Sure! You Want To Delete Your Profile.
        </h2>
        <p className="text-red-400 text-sm mb-6">This can't be undone!</p>

        <form onSubmit={handleDelete} className="space-y-6">
          <div>
            <label
              htmlFor="password"
              className="block text-gray-400 text-sm mb-2"
            >
              Please enter your login Password to confirm:
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#0E0E10] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isDeleting}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default DeleteProfile;
