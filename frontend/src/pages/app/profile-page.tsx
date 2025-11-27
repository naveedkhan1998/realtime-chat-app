import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  ArrowLeft,
  Camera,
  Loader2,
  User,
  Mail,
  Calendar,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import {
  useGetUserProfileQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
} from '@/services/userApi';
import { getAvatarUrl } from '@/lib/utils';

interface ProfileFormData {
  name: string;
}

interface PasswordFormData {
  password: string;
  password2: string;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: user, isLoading: isLoadingProfile } = useGetUserProfileQuery();
  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
  const [changePassword, { isLoading: isChangingPassword }] =
    useChangePasswordMutation();

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    reset: resetProfile,
  } = useForm<ProfileFormData>();

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
    watch,
  } = useForm<PasswordFormData>();

  const password = watch('password');

  useEffect(() => {
    if (user) {
      resetProfile({ name: user.name });
    }
  }, [user, resetProfile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const onProfileSubmit = async (data: ProfileFormData) => {
    try {
      const formData = new FormData();
      formData.append('name', data.name);
      if (selectedFile) {
        formData.append('avatar', selectedFile);
      }

      await updateProfile(formData).unwrap();
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.data?.detail || 'Failed to update profile',
        variant: 'destructive',
      });
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      await changePassword(data).unwrap();
      toast({
        title: 'Password changed',
        description: 'Your password has been updated successfully.',
      });
      resetPassword();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.data?.detail || 'Failed to change password',
        variant: 'destructive',
      });
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-4 px-6 py-4 border-b bg-background/80 backdrop-blur-xl border-border/50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="rounded-xl"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Your Profile</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account settings
          </p>
        </div>
      </header>

      <div className="flex-1 max-w-2xl p-6 mx-auto space-y-8">
        {/* Profile Form */}
        <form
          onSubmit={handleProfileSubmit(onProfileSubmit)}
          className="space-y-6"
        >
          {/* Avatar & User Info Card */}
          <div className="p-6 border glass-card rounded-3xl border-border/50">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="w-28 h-28 ring-4 ring-primary/20 shadow-xl rounded-3xl">
                  <AvatarImage
                    src={previewUrl || getAvatarUrl(user?.avatar)}
                    alt={user?.name}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-4xl font-bold rounded-3xl bg-primary/10 text-primary">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute flex items-center justify-center w-10 h-10 transition-all duration-200 shadow-lg cursor-pointer -bottom-2 -right-2 bg-primary hover:bg-primary/90 rounded-xl shadow-primary/25 hover:scale-105"
                >
                  <Camera className="w-5 h-5 text-primary-foreground" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              <div className="flex-1">
                <h3 className="text-2xl font-bold text-foreground">
                  {user?.name}
                </h3>
                <p className="mt-1 text-muted-foreground">{user?.email}</p>
                {user?.date_joined && (
                  <p className="flex items-center gap-2 mt-2 text-sm text-muted-foreground/70">
                    <Calendar className="w-4 h-4" />
                    Member since{' '}
                    {new Date(user.date_joined).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields Card */}
          <div className="p-6 space-y-6 border glass-card rounded-3xl border-border/50">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                Full Name
              </Label>
              <Input
                id="name"
                {...registerProfile('name', { required: 'Name is required' })}
                className="h-12 px-5 transition-all duration-200 border rounded-xl bg-muted/30 border-border/50 focus:ring-2 focus:ring-primary/30 focus:border-primary/50 focus:bg-background"
              />
              {profileErrors.name && (
                <p className="text-sm text-destructive">
                  {profileErrors.name.message}
                </p>
              )}
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                Email Address
              </Label>
              <Input
                id="email"
                value={user?.email}
                disabled
                className="h-12 px-5 border cursor-not-allowed rounded-xl bg-muted/20 border-border/30 text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground/60">
                Email cannot be changed
              </p>
            </div>

            {/* Auth Provider */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                Account Type
              </Label>
              <div className="flex items-center gap-3 px-5 py-3 border bg-muted/30 rounded-xl border-border/30">
                {user?.auth_provider === 'google' ? (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span className="font-medium text-foreground">
                      Connected with Google
                    </span>
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium text-foreground">
                      Email & Password
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-4 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate(-1)}
              className="px-6 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUpdating}
              className="px-8 font-semibold shadow-lg rounded-xl shadow-primary/25"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>

        {/* Change Password Section */}
        {user?.auth_provider === 'email' && (
          <div className="pt-8 border-t border-border/50">
            <h2 className="mb-6 text-2xl font-bold text-foreground">
              Change Password
            </h2>

            <form
              onSubmit={handlePasswordSubmit(onPasswordSubmit)}
              className="p-6 space-y-5 border glass-card rounded-3xl border-border/50"
            >
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...registerPassword('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters',
                    },
                  })}
                  className="h-12 px-5 transition-all duration-200 border rounded-xl bg-muted/30 border-border/50 focus:ring-2 focus:ring-primary/30 focus:border-primary/50 focus:bg-background"
                />
                {passwordErrors.password && (
                  <p className="text-sm text-destructive">
                    {passwordErrors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password2">Confirm New Password</Label>
                <Input
                  id="password2"
                  type="password"
                  {...registerPassword('password2', {
                    required: 'Please confirm your password',
                    validate: value =>
                      value === password || 'Passwords do not match',
                  })}
                  className="h-12 px-5 transition-all duration-200 border rounded-xl bg-muted/30 border-border/50 focus:ring-2 focus:ring-primary/30 focus:border-primary/50 focus:bg-background"
                />
                {passwordErrors.password2 && (
                  <p className="text-sm text-destructive">
                    {passwordErrors.password2.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isChangingPassword}
                className="px-8 font-semibold shadow-lg rounded-xl shadow-primary/25"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
