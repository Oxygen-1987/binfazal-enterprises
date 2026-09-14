// src/components/layout/user-menu.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LogOut,
  User as UserIcon,
  Camera,
  X,
  Loader2,
  Check,
  Shield,
  Mail,
  Phone,
  Briefcase,
  Pencil,
  Save,
} from "lucide-react";

export function UserMenu() {
  const { userProfile, signOut, refreshProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    full_name: "",
    phone: "",
    designation: "",
    address: "",
  });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync edit data when userProfile changes
  useEffect(() => {
    if (userProfile) {
      setEditData({
        full_name: userProfile.full_name || "",
        phone: userProfile.phone || "",
        designation: userProfile.designation || "",
        address: userProfile.address || "",
      });
    }
  }, [userProfile]);

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("File size should be less than 2MB");
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userProfile.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Delete old avatar if exists
      if (userProfile.avatar_url) {
        try {
          const oldPath = userProfile.avatar_url.split("/").pop();
          if (oldPath) {
            await supabase.storage.from("avatars").remove([oldPath]);
          }
        } catch (e) {
          console.log("Old avatar not found");
        }
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // Update user record
      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: publicUrl })
        .eq("id", userProfile.id);

      if (updateError) throw updateError;

      await refreshProfile();
      setSuccessMessage("Avatar updated!");
      setTimeout(() => setSuccessMessage(""), 2000);
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      alert("Error uploading avatar: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!userProfile?.avatar_url) return;
    if (!confirm("Remove your avatar?")) return;

    setUploading(true);
    try {
      const oldPath = userProfile.avatar_url.split("/").pop();
      if (oldPath) {
        await supabase.storage.from("avatars").remove([oldPath]);
      }

      await supabase
        .from("users")
        .update({ avatar_url: null })
        .eq("id", userProfile.id);

      await refreshProfile();
      setSuccessMessage("Avatar removed!");
      setTimeout(() => setSuccessMessage(""), 2000);
    } catch (error: any) {
      console.error("Error removing avatar:", error);
      alert("Error removing avatar");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!userProfile) return;

    if (!editData.full_name.trim()) {
      alert("Full name is required");
      return;
    }

    setSaving(true);
    try {
      const updates: any = {
        full_name: editData.full_name.trim(),
        phone: editData.phone.trim() || null,
        address: editData.address.trim() || null,
      };

      // Only employees have designation
      if (userProfile.role === "employee") {
        updates.designation = editData.designation.trim() || null;
      }

      const { error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", userProfile.id);

      if (error) throw error;

      await refreshProfile();
      setSuccessMessage("Profile updated!");
      setIsEditing(false);
      setTimeout(() => setSuccessMessage(""), 2000);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      alert("Error updating profile: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (userProfile) {
      setEditData({
        full_name: userProfile.full_name || "",
        phone: userProfile.phone || "",
        designation: userProfile.designation || "",
        address: userProfile.address || "",
      });
    }
    setIsEditing(false);
  };

  const handleLogout = async () => {
    if (confirm("Are you sure you want to logout?")) {
      await signOut();
    }
  };

  const closeModal = () => {
    setShowProfileModal(false);
    setIsEditing(false);
    setSuccessMessage("");
  };

  if (!userProfile) {
    return <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />;
  }

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Avatar Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 p-1 pr-2 transition-colors"
        >
          <div className="relative">
            {userProfile.avatar_url ? (
              <img
                src={userProfile.avatar_url}
                alt={userProfile.full_name}
                className="w-9 h-9 rounded-full object-cover border-2 border-[#FF6B00]"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF6B00] to-[#CC5500] flex items-center justify-center text-white font-semibold text-sm border-2 border-[#FF6B00]">
                {getInitials(userProfile.full_name)}
              </div>
            )}
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-black ${
                userProfile.role === "owner" ? "bg-[#FF6B00]" : "bg-blue-500"
              }`}
            />
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium leading-tight truncate max-w-[120px]">
              {userProfile.full_name}
            </p>
            <p className="text-xs text-gray-500 capitalize">
              {userProfile.designation || userProfile.role}
            </p>
          </div>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg overflow-hidden z-50">
            <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/10 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center space-x-3">
                {userProfile.avatar_url ? (
                  <img
                    src={userProfile.avatar_url}
                    alt={userProfile.full_name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-[#FF6B00]"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF6B00] to-[#CC5500] flex items-center justify-center text-white font-bold">
                    {getInitials(userProfile.full_name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">
                    {userProfile.full_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {userProfile.email}
                  </p>
                  <span
                    className={`inline-flex items-center text-xs mt-1 px-2 py-0.5 rounded-full ${
                      userProfile.role === "owner"
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    }`}
                  >
                    <Shield className="h-3 w-3 mr-1" />
                    {userProfile.role === "owner"
                      ? "Owner"
                      : userProfile.designation || "Employee"}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-1">
              <button
                onClick={() => {
                  setShowProfileModal(true);
                  setIsOpen(false);
                }}
                className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <UserIcon className="h-4 w-4 text-gray-500" />
                <span>My Profile</span>
              </button>

              <button
                onClick={() => {
                  setShowProfileModal(true);
                  setIsEditing(true);
                  setIsOpen(false);
                }}
                className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Pencil className="h-4 w-4 text-gray-500" />
                <span>Edit Profile</span>
              </button>

              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          {" "}
          <Card className="w-full max-w-md my-8 bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800">
            <CardContent className="p-6 bg-white dark:bg-gray-900">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">
                  {isEditing ? "Edit Profile" : "My Profile"}
                </h2>
                <Button variant="ghost" size="icon" onClick={closeModal}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {successMessage && (
                <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-3 rounded-md text-sm flex items-center mb-4">
                  <Check className="h-4 w-4 mr-2" />
                  {successMessage}
                </div>
              )}

              {/* Avatar */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative">
                  {userProfile.avatar_url ? (
                    <img
                      src={userProfile.avatar_url}
                      alt={userProfile.full_name}
                      className="w-24 h-24 rounded-full object-cover border-4 border-[#FF6B00]"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#FF6B00] to-[#CC5500] flex items-center justify-center text-white text-2xl font-bold border-4 border-[#FF6B00]">
                      {getInitials(userProfile.full_name)}
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute bottom-0 right-0 bg-[#FF6B00] hover:bg-[#E66000] text-white p-2 rounded-full shadow-lg transition-colors"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Click camera to upload (max 2MB)
                </p>
                {userProfile.avatar_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 mt-1"
                    onClick={handleRemoveAvatar}
                    disabled={uploading}
                  >
                    Remove Avatar
                  </Button>
                )}
              </div>

              {/* View Mode */}
              {!isEditing ? (
                <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-3 text-sm">
                    <UserIcon className="h-4 w-4 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Full Name</p>
                      <p className="font-medium">{userProfile.full_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="font-medium">{userProfile.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <Shield className="h-4 w-4 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Role</p>
                      <p className="font-medium capitalize">
                        {userProfile.role}
                      </p>
                    </div>
                  </div>
                  {userProfile.designation && (
                    <div className="flex items-center space-x-3 text-sm">
                      <Briefcase className="h-4 w-4 text-gray-400" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">Designation</p>
                        <p className="font-medium">{userProfile.designation}</p>
                      </div>
                    </div>
                  )}
                  {userProfile.phone && (
                    <div className="flex items-center space-x-3 text-sm">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">Phone</p>
                        <p className="font-medium">{userProfile.phone}</p>
                      </div>
                    </div>
                  )}
                  {userProfile.address && (
                    <div className="flex items-start space-x-3 text-sm pt-2">
                      <UserIcon className="h-4 w-4 text-gray-400 mt-1" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">Address</p>
                        <p className="font-medium">{userProfile.address}</p>
                      </div>
                    </div>
                  )}

                  <div className="pt-4">
                    <Button
                      onClick={() => setIsEditing(true)}
                      className="w-full"
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Profile
                    </Button>
                  </div>
                </div>
              ) : (
                /* Edit Mode */
                <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      value={editData.full_name}
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          full_name: e.target.value,
                        }))
                      }
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email (cannot be changed)</Label>
                    <Input
                      id="email"
                      value={userProfile.email}
                      disabled
                      className="bg-gray-100 dark:bg-gray-800"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={editData.phone}
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      placeholder="0300-1234567"
                    />
                  </div>

                  {userProfile.role === "employee" && (
                    <div className="space-y-2">
                      <Label htmlFor="designation">Designation</Label>
                      <Input
                        id="designation"
                        value={editData.designation}
                        onChange={(e) =>
                          setEditData((prev) => ({
                            ...prev,
                            designation: e.target.value,
                          }))
                        }
                        placeholder="e.g., Machine Operator"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={editData.address}
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          address: e.target.value,
                        }))
                      }
                      placeholder="Enter your address"
                    />
                  </div>

                  <div className="flex space-x-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="flex-1"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="flex-1"
                    >
                      {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              )}

              {!isEditing && (
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="outline"
                    className="w-full text-red-500 border-red-200 hover:bg-red-50"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
