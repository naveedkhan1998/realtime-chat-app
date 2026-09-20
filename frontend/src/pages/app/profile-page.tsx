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
  Lock,
  Eye,
  EyeOff,
  LogOut,
  CheckCircle2,
  Sparkles,
  KeyRound,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useAppDispatch } from '@/app/hooks';
import { logOut } from '@/features/authSlice';
import {
  useGetUserProfileQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
} from '@/services/userApi';
import { getAvatarUrl, cn } from '@/lib/utils';
import { Helmet } from 'react-helmet-async';

interface ProfileFormData {
  name: string;
}

interface PasswordFormData {
  password: string;
  password2: string;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { data: user, isLoading: isLoadingProfile } = useGetUserProfileQuery();
  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
  const [changePassword, { isLoading: isChangingPassword }] =
    useChangePasswordMutation();

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isDirty: isProfileDirty },
    reset: resetProfile,
  } = useForm<ProfileFormData>();

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
    watch,
  } = useForm<PasswordFormData>();

  const password = watch('password') || '';
  const password2 = watch('password2') || '';

  const isPasswordMinLength = password.length >= 8;
  const doPasswordsMatch = Boolean(password && password === password2);

  useEffect(() => {
    if (user) {
      resetProfile({ name: user.name });
    }
  }, [user, resetProfile]);

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/chat');
    }
  };

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
      formData.append('name', data.name.trim());
      if (selectedFile) {
        formData.append('avatar', selectedFile);
      }

      await updateProfile(formData).unwrap();
      toast({
        title: 'Profile updated',
        description: 'Your profile changes have been saved.',
      });
      setSelectedFile(null);
      setPreviewUrl(null);
      resetProfile({ name: data.name.trim() });
    } catch (error: unknown) {
      const err = error as { data?: { detail?: string; message?: string } };
      toast({
        title: 'Update failed',
        description:
          err?.data?.detail ||
          err?.data?.message ||
          'Failed to update profile.',
        variant: 'destructive',
      });
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      await changePassword(data).unwrap();
      toast({
        title: 'Password updated',
        description: 'Your account password has been successfully changed.',
      });
      resetPassword();
    } catch (error: unknown) {
      const err = error as { data?: { detail?: string; message?: string } };
      toast({
        title: 'Password update failed',
        description:
          err?.data?.detail ||
          err?.data?.message ||
          'Failed to change password.',
        variant: 'destructive',
      });
    }
  };

  const handleLogout = () => {
    dispatch(logOut());
    toast({
      title: 'Signed out',
      description: 'You have been safely signed out of your account.',
    });
    navigate('/login');
  };

  if (isLoadingProfile) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background/50">
      <Helmet>
        <title>Account Profile | MNK Chat</title>
        <meta
          name="description"
          content="Manage your personal profile, credentials, and account settings"
        />
      </Helmet>

      {/* Header - Modern Glass Banner */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-3.5 sm:px-6 py-3 sm:py-4 border-b bg-card/60 backdrop-blur-xl border-border/50">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
            aria-label="Back to chat"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold truncate text-foreground tracking-tight flex items-center gap-2">
              <span>Account Profile</span>
            </h1>
            <p className="text-xs sm:text-sm truncate text-muted-foreground hidden xs:block">
              Manage your personal identity, avatar, and credentials
            </p>
          </div>
        </div>

        {/* Quick Sign Out Action in Header */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="h-9 px-3 rounded-xl text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors gap-1.5"
          title="Sign out of account"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </Button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 max-w-2xl w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-6 pb-28 sm:pb-12">
        {/* HERO CARD: Ambient Discord Cover + Avatar Cluster */}
        <div className="overflow-hidden rounded-3xl border border-border/50 bg-card/60 backdrop-blur-xl shadow-md">
          {/* Ambient Cover Banner with Deep Gradient Mesh */}
          <div className="h-32 sm:h-40 w-full bg-gradient-to-tr from-indigo-950/80 via-slate-900 to-purple-950/80 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.25),transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.2),transparent_60%)]" />

            <div className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 flex items-center gap-2">
              <Badge
                variant="secondary"
                className="bg-background/80 backdrop-blur-md text-[11px] font-semibold border-border/50 py-1 px-2.5 rounded-lg shadow-sm text-foreground"
              >
                <Sparkles className="w-3 h-3 text-primary mr-1" />
                Verified Teammate
              </Badge>
            </div>
          </div>

          {/* Profile Identity Details */}
          <div className="px-4 sm:px-6 pb-6 pt-0 relative">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-5 -mt-14 sm:-mt-16 mb-4">
              {/* Avatar Cluster with Camera Button */}
              <div className="relative shrink-0 self-start sm:self-auto">
                <Avatar className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl ring-4 ring-card shadow-2xl border border-border/40">
                  <AvatarImage
                    src={previewUrl || getAvatarUrl(user?.avatar)}
                    alt={user?.name}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-3xl font-bold rounded-3xl bg-primary/15 text-primary">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>

                {/* Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1.5 -right-1.5 flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all cursor-pointer border-2 border-card"
                  title="Upload new avatar photo"
                >
                  <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Names & Metadata */}
              <div className="flex-1 min-w-0 pt-1 sm:pt-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold truncate text-foreground tracking-tight">
                    {user?.name}
                  </h2>
                  <span
                    className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-card shrink-0"
                    title="Online"
                  />
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5 font-mono">
                  {user?.email}
                </p>

                {/* Badges / Chips */}
                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  {user?.auth_provider === 'google' ? (
                    <Badge
                      variant="outline"
                      className="text-[11px] py-0.5 px-2 rounded-lg bg-card/80 border-border/50 font-medium text-foreground gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
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
                      Google Linked
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[11px] py-0.5 px-2 rounded-lg bg-card/80 border-border/50 font-medium text-foreground gap-1.5"
                    >
                      <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
                      Email Verified
                    </Badge>
                  )}

                  {user?.date_joined && (
                    <Badge
                      variant="outline"
                      className="text-[11px] py-0.5 px-2 rounded-lg bg-card/80 border-border/50 font-medium text-muted-foreground gap-1.5"
                    >
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      Member since{' '}
                      {new Date(user.date_joined).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {selectedFile && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary mt-3">
                <span className="truncate">
                  New avatar selected: {selectedFile.name}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  className="ml-2 font-semibold underline hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 1: Personal Details Form */}
        <form
          onSubmit={handleProfileSubmit(onProfileSubmit)}
          className="rounded-3xl border border-border/50 bg-card/60 backdrop-blur-xl p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-sm"
        >
          <div className="border-b border-border/40 pb-3">
            <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
              Personal Information
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Update your display name visible across conversations and channels
            </p>
          </div>

          {/* Full Name Field */}
          <div className="space-y-1.5">
            <Label
              htmlFor="name"
              className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 text-foreground"
            >
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              Display Name
            </Label>
            <Input
              id="name"
              {...registerProfile('name', { required: 'Name is required' })}
              className="h-11 px-4 text-[16px] sm:text-sm rounded-xl bg-card/80 border-border/50 focus:border-primary/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="Your full name"
            />
            {profileErrors.name && (
              <p className="text-xs text-destructive font-medium">
                {profileErrors.name.message}
              </p>
            )}
          </div>

          {/* Email Address (Read-only) */}
          <div className="space-y-1.5">
            <Label
              htmlFor="email"
              className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 text-foreground"
            >
              <Mail className="w-3.5 h-3.5 text-muted-foreground" />
              Email Address
            </Label>
            <div className="relative">
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="h-11 pl-4 pr-9 text-[16px] sm:text-sm rounded-xl bg-muted/30 border-border/40 text-muted-foreground cursor-not-allowed"
              />
              <Lock className="w-4 h-4 text-muted-foreground/60 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Your primary email address is managed through your initial sign-up
              provider.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            {(isProfileDirty || selectedFile) && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  if (user) resetProfile({ name: user.name });
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
                className="h-10 px-4 rounded-xl text-xs sm:text-sm"
              >
                Reset
              </Button>
            )}
            <Button
              type="submit"
              disabled={isUpdating || (!isProfileDirty && !selectedFile)}
              className="h-10 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md shadow-primary/25 active:scale-95 transition-all text-xs sm:text-sm"
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

        {/* SECTION 2: Security & Password */}
        {user?.auth_provider === 'email' ? (
          <form
            onSubmit={handlePasswordSubmit(onPasswordSubmit)}
            className="rounded-3xl border border-border/50 bg-card/60 backdrop-blur-xl p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-sm"
          >
            <div className="border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-primary" />
                <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                  Security & Password
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Ensure your account is protected with a secure password
              </p>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 text-foreground"
              >
                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...registerPassword('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters',
                    },
                  })}
                  className="h-11 pl-4 pr-11 text-[16px] sm:text-sm rounded-xl bg-card/80 border-border/50 focus:border-primary/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {passwordErrors.password && (
                <p className="text-xs text-destructive font-medium">
                  {passwordErrors.password.message}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label
                htmlFor="password2"
                className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 text-foreground"
              >
                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                Confirm New Password
              </Label>
              <div className="relative">
                <Input
                  id="password2"
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...registerPassword('password2', {
                    required: 'Please confirm your password',
                    validate: value =>
                      value === password || 'Passwords do not match',
                  })}
                  className="h-11 pl-4 pr-11 text-[16px] sm:text-sm rounded-xl bg-card/80 border-border/50 focus:border-primary/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Re-enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                  aria-label={
                    showConfirmPassword ? 'Hide password' : 'Show password'
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {passwordErrors.password2 && (
                <p className="text-xs text-destructive font-medium">
                  {passwordErrors.password2.message}
                </p>
              )}
            </div>

            {/* Live Password Strength Checklist */}
            {password.length > 0 && (
              <div className="p-3 rounded-xl bg-muted/20 border border-border/40 text-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'w-4 h-4 rounded-full flex items-center justify-center text-[10px]',
                      isPasswordMinLength
                        ? 'bg-emerald-500/20 text-emerald-500'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                  <span
                    className={
                      isPasswordMinLength
                        ? 'text-foreground font-medium'
                        : 'text-muted-foreground'
                    }
                  >
                    At least 8 characters
                  </span>
                </div>

                {password2.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'w-4 h-4 rounded-full flex items-center justify-center text-[10px]',
                        doPasswordsMatch
                          ? 'bg-emerald-500/20 text-emerald-500'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                    <span
                      className={
                        doPasswordsMatch
                          ? 'text-foreground font-medium'
                          : 'text-muted-foreground'
                      }
                    >
                      Passwords match
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end pt-2">
              <Button
                type="submit"
                disabled={
                  isChangingPassword ||
                  !isPasswordMinLength ||
                  !doPasswordsMatch
                }
                className="h-10 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md shadow-primary/25 active:scale-95 transition-all text-xs sm:text-sm"
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
            </div>
          </form>
        ) : (
          <div className="rounded-3xl border border-border/50 bg-card/60 backdrop-blur-xl p-4 sm:p-6 shadow-sm flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-foreground">
                Google Single Sign-On Active
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
                Your account authentication and password security are managed
                via Google OAuth. Password changes are disabled for SSO
                accounts.
              </p>
            </div>
          </div>
        )}

        {/* SECTION 3: Account Sign Out & Session */}
        <div className="rounded-3xl border border-destructive/20 bg-destructive/5 backdrop-blur-xl p-4 sm:p-6 space-y-3">
          <div>
            <h3 className="text-base font-bold text-destructive">
              Account Session
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Sign out of this browser session. You will be redirected to the
              login portal.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleLogout}
            className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/15 hover:border-destructive/50 transition-all font-semibold text-xs sm:text-sm h-10 px-4 gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out of MNK Chat
          </Button>
        </div>
      </div>
    </div>
  );
}
