import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Helmet } from 'react-helmet-async';
import {
  Camera,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  ShieldCheck,
  Check,
  X,
  Radio,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { PageFrame, Module } from '@/components/console/PageFrame';
import { Led, channelNo } from '@/components/console';

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleCancelFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
        title: 'Profile Updated',
        description: 'Operator record and callsign have been synchronized.',
      });
      setSelectedFile(null);
      setPreviewUrl(null);
      resetProfile({ name: data.name.trim() });
    } catch (error: unknown) {
      const err = error as { data?: { detail?: string; message?: string } };
      toast({
        title: 'Update Failed',
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
        title: 'Passcode Updated',
        description: 'Your terminal security passcode has been updated.',
      });
      resetPassword();
    } catch (error: unknown) {
      const err = error as { data?: { detail?: string; message?: string } };
      toast({
        title: 'Passcode Update Failed',
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
      title: 'Terminal Disconnected',
      description: 'Session severed. Stored credentials flushed.',
    });
    navigate('/login');
  };

  if (isLoadingProfile) {
    return (
      <PageFrame
        code="04"
        section="Operator"
        title="Identity & Profile"
        description="Reading operator flash registers..."
      >
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="size-12 rounded-xl bg-well border border-border flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Synchronizing Terminal Profile...
          </span>
        </div>
      </PageFrame>
    );
  }

  const registeredDate = user?.date_joined
    ? new Date(user.date_joined).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      })
    : 'UNKNOWN';

  return (
    <PageFrame
      code="04"
      section="Operator"
      title="Identity & Profile"
      description="Operator callsign parameters, cryptographic keys, and terminal station session."
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="font-mono text-xs gap-1.5 text-muted-foreground hover:text-destructive hover:border-destructive/40"
        >
          <LogOut className="size-3.5" />
          DISCONNECT
        </Button>
      }
    >
      <Helmet>
        <title>Operator Profile | MNK Chat</title>
        <meta
          name="description"
          content="Manage operator callsign, identity, and console authentication."
        />
      </Helmet>

      <div className="space-y-6">
        {/* MOD 01: Operator Badge / Telemetry Card */}
        <Module
          label="MOD·01 / OPERATOR BADGE"
          title="Hardware Identification"
          description="Station registration record and physical unit credentials"
        >
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Avatar Cluster */}
            <div className="relative shrink-0 self-start">
              <div className="relative">
                <Avatar className="size-24 sm:size-28 rounded-2xl ring-2 ring-border shadow-panel">
                  <AvatarImage
                    src={previewUrl || getAvatarUrl(user?.avatar)}
                    alt={user?.name}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-2xl sm:text-3xl font-mono font-bold rounded-2xl bg-well text-foreground">
                    {user?.name?.slice(0, 2)?.toUpperCase() || 'OP'}
                  </AvatarFallback>
                </Avatar>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 size-9 rounded-xl key flex items-center justify-center text-foreground hover:text-primary transition-colors cursor-pointer"
                  title="Upload avatar photo"
                  aria-label="Upload avatar photo"
                >
                  <Camera className="size-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>

            {/* Operator Telemetry Details */}
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                  {user?.name}
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-border bg-well font-mono text-[11px] text-live">
                  <Led tone="live" blink />
                  ONLINE
                </span>
                <span className="font-mono text-xs text-muted-foreground border border-border/60 bg-well/40 px-2 py-0.5 rounded">
                  OP·{channelNo(user?.id || 1)}
                </span>
              </div>

              {/* Hardware Spec Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                <div className="flex items-center justify-between p-2 rounded-lg bg-well/60 border border-border">
                  <span className="text-muted-foreground">NET ADDR</span>
                  <span className="font-semibold text-foreground truncate max-w-[180px]">
                    {user?.email || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-well/60 border border-border">
                  <span className="text-muted-foreground">PROTOCOL</span>
                  <span className="font-semibold text-foreground">
                    {user?.auth_provider === 'google' ? 'GOOGLE SSO' : 'PASSWORD CIPHER'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-well/60 border border-border">
                  <span className="text-muted-foreground">ENROLLED</span>
                  <span className="font-semibold text-foreground">
                    {registeredDate}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-well/60 border border-border">
                  <span className="text-muted-foreground">STATUS</span>
                  <span className="font-semibold text-live flex items-center gap-1">
                    <Radio className="size-3" />
                    AUTHENTICATED
                  </span>
                </div>
              </div>

              {/* Pending File Banner */}
              {selectedFile && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-primary/10 border border-primary/30 text-xs font-mono text-primary">
                  <div className="flex items-center gap-2 truncate">
                    <Led tone="signal" />
                    <span className="truncate">
                      NEW AVATAR STAGED: {selectedFile.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelFile}
                    className="p-1 hover:text-foreground transition-colors shrink-0"
                    title="Cancel upload"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </Module>

        {/* MOD 02: Callsign & Name Form */}
        <Module
          label="MOD·02 / CALL SIGN CONFIGURATION"
          title="Display Name"
          description="The handle transmitted across all audio channels, station chats, and logs"
        >
          <form
            onSubmit={handleProfileSubmit(onProfileSubmit)}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label
                htmlFor="name"
                className="label-engraved text-foreground"
              >
                Operator Callsign
              </Label>
              <Input
                id="name"
                {...registerProfile('name', { required: 'Callsign is required' })}
                className="font-mono text-sm h-11"
                placeholder="Enter operator callsign"
              />
              {profileErrors.name && (
                <p className="font-mono text-xs text-destructive">
                  {profileErrors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="label-engraved text-muted-foreground"
              >
                Station Email (Read-Only)
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="font-mono text-sm h-11 bg-well/40 opacity-70 pr-9 cursor-not-allowed"
                />
                <Lock className="size-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <p className="font-mono text-[10px] text-muted-foreground">
                Origin account address tied to master credential registry.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
              {(isProfileDirty || selectedFile) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (user) resetProfile({ name: user.name });
                    handleCancelFile();
                  }}
                  className="font-mono text-xs"
                >
                  DISCARD
                </Button>
              )}
              <Button
                type="submit"
                disabled={isUpdating || (!isProfileDirty && !selectedFile)}
                className="font-mono text-xs h-10 px-6 gap-2"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    WRITING FLASH...
                  </>
                ) : (
                  'SAVE CALLSIGN'
                )}
              </Button>
            </div>
          </form>
        </Module>

        {/* MOD 03: Security & Passcode */}
        {user?.auth_provider === 'email' ? (
          <Module
            label="MOD·03 / ACCESS CIPHER"
            title="Terminal Passcode"
            description="Rotate cryptographic credentials for local sign-in access"
          >
            <form
              onSubmit={handlePasswordSubmit(onPasswordSubmit)}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label
                  htmlFor="password"
                  className="label-engraved text-foreground"
                >
                  New Passcode
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    {...registerPassword('password', {
                      required: 'Passcode is required',
                      minLength: {
                        value: 8,
                        message: 'Minimum length 8 characters',
                      },
                    })}
                    className="font-mono text-sm h-11 pr-10"
                    placeholder="Minimum 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                    aria-label={showPassword ? 'Hide passcode' : 'Show passcode'}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                {passwordErrors.password && (
                  <p className="font-mono text-xs text-destructive">
                    {passwordErrors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="password2"
                  className="label-engraved text-foreground"
                >
                  Confirm Passcode
                </Label>
                <div className="relative">
                  <Input
                    id="password2"
                    type={showConfirmPassword ? 'text' : 'password'}
                    {...registerPassword('password2', {
                      required: 'Confirmation is required',
                      validate: value =>
                        value === password || 'Passcodes do not match',
                    })}
                    className="font-mono text-sm h-11 pr-10"
                    placeholder="Re-enter passcode"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                    aria-label={
                      showConfirmPassword ? 'Hide passcode' : 'Show passcode'
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                {passwordErrors.password2 && (
                  <p className="font-mono text-xs text-destructive">
                    {passwordErrors.password2.message}
                  </p>
                )}
              </div>

              {/* Requirement Checklist in Mono Well */}
              {password.length > 0 && (
                <div className="p-3 rounded-lg bg-well border border-border font-mono text-xs space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'size-4 rounded flex items-center justify-center text-[10px]',
                        isPasswordMinLength
                          ? 'bg-live/20 text-live'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <Check className="size-2.5 stroke-[3]" />
                    </span>
                    <span
                      className={
                        isPasswordMinLength
                          ? 'text-foreground font-semibold'
                          : 'text-muted-foreground'
                      }
                    >
                      ≥ 8 CHARACTERS
                    </span>
                  </div>

                  {password2.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'size-4 rounded flex items-center justify-center text-[10px]',
                          doPasswordsMatch
                            ? 'bg-live/20 text-live'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        <Check className="size-2.5 stroke-[3]" />
                      </span>
                      <span
                        className={
                          doPasswordsMatch
                            ? 'text-foreground font-semibold'
                            : 'text-muted-foreground'
                        }
                      >
                        HASH MATCH CONFIRMED
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end pt-2 border-t border-border">
                <Button
                  type="submit"
                  disabled={
                    isChangingPassword ||
                    !isPasswordMinLength ||
                    !doPasswordsMatch
                  }
                  className="font-mono text-xs h-10 px-6 gap-2"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      UPDATING CIPHER...
                    </>
                  ) : (
                    'UPDATE PASSCODE'
                  )}
                </Button>
              </div>
            </form>
          </Module>
        ) : (
          <Module
            label="MOD·03 / FEDERATED SSO"
            title="External Authentication"
            description="Account verification delegated to external identity provider"
          >
            <div className="flex items-start gap-3.5 p-3.5 rounded-lg bg-well border border-border font-mono text-xs">
              <ShieldCheck className="size-5 text-live shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-foreground">
                  GOOGLE SINGLE SIGN-ON ACTIVE
                </div>
                <div className="text-muted-foreground leading-relaxed">
                  Terminal access is verified through Google OAuth token exchange. Passcode modification is managed directly via your Google Account security center.
                </div>
              </div>
            </div>
          </Module>
        )}

        {/* MOD 04: Session Disconnect */}
        <Module
          label="MOD·04 / STATION DISCONNECT"
          title="Terminal Session"
          description="Sever station connection, purge local authentication tokens, and return to gateway portal"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl bg-destructive/5 border border-destructive/20">
            <div>
              <h4 className="font-mono text-sm font-bold text-destructive">
                TERMINAL DISCONNECT
              </h4>
              <p className="font-mono text-xs text-muted-foreground mt-0.5">
                Revokes active session tokens and returns this unit to the sign-in prompt.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={handleLogout}
              className="font-mono text-xs h-10 px-4 shrink-0 gap-2"
            >
              <LogOut className="size-3.5" />
              DISCONNECT TERMINAL
            </Button>
          </div>
        </Module>
      </div>
    </PageFrame>
  );
}
