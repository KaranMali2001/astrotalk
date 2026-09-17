"use client";

import { api } from "@/lib/api";
import { setAuth, type AuthRole } from "@/lib/auth";
import { baseURL } from "@/lib/config/env";
import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";
import { GenderSelectionStep } from "./steps/GenderSelectionStep";
import { LanguageSelectionStep } from "./steps/LanguageSelectionStep";
import { NameAndDobStep } from "./steps/NameAndDobStep";
import { OtpVerificationStep } from "./steps/OtpVerificationStep";
import { PhoneNumberStep } from "./steps/PhoneNumberStep";
import { RelationshipGoalsStep } from "./steps/RelationshipGoalsStep";
import { RoleSelectionStep } from "./steps/RoleSelectionStep";
import { TopicSelectionStep } from "./steps/TopicSelectionStep";
import { UserTypeSelectionStep } from "./steps/UserTypeSelectionStep";
import { VideoPreviewStep } from "./steps/VideoPreviewStep";
import { VoiceRecordingStep } from "./steps/VoiceRecordingStep";

type Props = { role: AuthRole };

type LoginStepResponse = {
  data: {
    requestId: string;
    message?: string;
  };
};

type VerifyResponse = {
  data: {
    token: string;
    user?: unknown;
    prof?: unknown;
    onboardingComplete?: boolean;
  };
};

const hinglishSentences = [
  "Tell us about yourself with this sentence",
  "Mujhe aapki baat sunna bahut pasand hai",
  "Main yahan aapki help karne ke liye hoon",
  "Aap apni story share kar sakte hain",
  "Main aapka friend ban sakta hoon",
];

export function OtpLoginForm({ role: initialRole }: Props) {
  const router = useRouter();
  const [role, setRole] = useState<AuthRole>(initialRole);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10>(1);
  const [phoneNumber, setPhoneNumber] = useState("");
  const countryCode = "+91";
  const [requestId, setRequestId] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [language, setLanguage] = useState<string[]>([]);
  const [gender, setGender] = useState<"male" | "female" | null>(null);
  const [userType, setUserType] = useState<"listener" | "friend" | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [voiceRecording, setVoiceRecording] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [randomSentence] = useState(() => hinglishSentences[Math.floor(Math.random() * hinglishSentences.length)]);

  const endpoints =
    role === "user"
      ? { login: `${baseURL}/api/v1/user/otp-login`, verify: `${baseURL}/api/v1/user/verify-otp` }
      : { login: `${baseURL}/api/v1/professional/login`, verify: `${baseURL}/api/v1/professional/verify-otp` };

  function goToStep(newStep: typeof step) {
    setError(null);
    setStep(newStep);
  }

  function goBack() {
    if (step > 1) {
      setError(null);
      
      // Handle conditional back navigation based on flow
      if (step === 9) {
        // Step 9 is video preview
        if (userType === "listener") {
          setStep(8); // Back to voice recording for listeners
        } else {
          setStep((step - 1) as typeof step);
        }
      } else if (step === 8) {
        // Step 8 is voice recording
        if (userType === "listener") {
          setStep(7); // Back to topic selection for listeners
        } else {
          setStep((step - 1) as typeof step);
        }
      } else if (step === 7) {
        // Step 7 can be: relationship goals (males), topic selection (female listeners/professionals), or relationship goals (female friends)
        if (gender === "male") {
          // Males go: gender (4) -> language (5) -> relationship goals (7), so back should go to language (step 5)
          setStep(5);
        } else if (gender === "female") {
          // Females: if listener, back goes to user type (step 6)
          // Otherwise back goes to user type (step 6) for friends
          if (userType === "listener") {
            setStep(6); // Back to user type selection for listeners
          } else {
            setStep(6); // Back to user type selection for friends
          }
        } else {
          setStep((step - 1) as typeof step);
        }
      } else if (step === 6) {
        // Step 6 is user type selection, only for females, so back should go to language (step 5)
        setStep(5);
      } else if (step === 5) {
        // Step 5 is language selection, back should go to gender (step 4)
        setStep(4);
      } else {
        // For all other steps, go back normally
        setStep((step - 1) as typeof step);
      }
    }
  }

  async function handleRequestOtp(e: React.FormEvent, skipCheck = false) {
    if (e && e.preventDefault) e.preventDefault();
    setError(null);
    setInfo(null);
    const fullPhoneNumber = `${phoneNumber}`;
    if (!phoneNumber) {
      setError("Phone number is required");
      return;
    }
    if (phoneNumber.length !== 10) {
      setError("Phone number must be exactly 10 digits");
      return;
    }
    setLoading(true);

    try {
      // Check user existence first if not skipped
      if (!skipCheck) {
        // We use the raw axios call or a specifically imported api method if `checkUser` isn't on the general `api` object yet.
        // Assuming api.post is available as per file imports.
        // We need to import authAPI from lib/api or use a direct call.
        // Based on lib/api.ts, authAPI export exists. We should import it.
        // Since I cannot add import easily at top without potentially messing up lines, 
        // I will use the api.post directly matching the signature found in auth.api.ts
        
        const { data: checkData } = await api.post<{ data: { user: any; prof: any } }>(`${baseURL}/api/v1/auth/check`, {
             phoneNumber: fullPhoneNumber 
        });

        // The response structure in controller is: success(res, StatusCodes.OK, 'User found', { user: ..., prof: ... });
        // So data.data will contain { user, prof }
        const { user, prof } = checkData.data;
        
        if (user && prof) {
            // Both exist, let user choose
            setStep(10); // Role selection step
            setLoading(false);
            return;
        } else if (user) {
            setRole("user");
        } else if (prof) {
            setRole("professional");
        }
        // If neither, we stick to the initialRole or the one set in state
      }

      // Proceed to send OTP with the resolved role

      let targetRole = role;
      if (!skipCheck) {
        const { data: checkData } = await api.post<{ data: { user: any; prof: any } }>(`${baseURL}/api/v1/auth/check`, {
          phoneNumber: fullPhoneNumber
        });
        const { user, prof } = checkData.data;

        if (user && prof) {
          setStep(10);
          setLoading(false);
          return;
        }
        if (user) targetRole = "user";
        if (prof) targetRole = "professional";

        if (targetRole !== role) setRole(targetRole);
      }

      // Proceed to send OTP with the resolved role
      const currentEndpoints =
        targetRole === "user"
          ? { login: `${baseURL}/api/v1/user/otp-login`, verify: `${baseURL}/api/v1/user/verify-otp` }
          : { login: `${baseURL}/api/v1/professional/login`, verify: `${baseURL}/api/v1/professional/verify-otp` };

      const { data } = await api.post<LoginStepResponse>(currentEndpoints.login, { phoneNumber: fullPhoneNumber });
      if (!data?.data?.requestId) throw new Error("Missing requestId from server");
      setRequestId(data.data.requestId);
      if (data.data.message) setInfo(data.data.message);
      goToStep(2);
      setOtp("");
    } catch (err: any) {
      // If check fails (e.g. 500), we could fallback to normal flow or show error.
      // Currently showing error.
      console.error(err);
      setError(err?.response?.data?.error || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  function handleRoleSelection(selectedRole: "user" | "professional") {
      setRole(selectedRole);
      
      const fullPhoneNumber = `${phoneNumber}`;
      const currentEndpoints =
        selectedRole === "user"
          ? { login: `${baseURL}/api/v1/user/otp-login`, verify: `${baseURL}/api/v1/user/verify-otp` }
          : { login: `${baseURL}/api/v1/professional/login`, verify: `${baseURL}/api/v1/professional/verify-otp` };

      setLoading(true);
      api.post<LoginStepResponse>(currentEndpoints.login, { phoneNumber: fullPhoneNumber })
        .then(({ data }) => {
            if (!data?.data?.requestId) throw new Error("Missing requestId from server");
             setRequestId(data.data.requestId);
             if (data.data.message) setInfo(data.data.message);
             goToStep(2);
             setOtp("");
        })
        .catch(err => {
             setError(err?.response?.data?.error || "Request failed");
        })
        .finally(() => setLoading(false));
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const fullPhoneNumber = `${phoneNumber}`;
    if (!otp || !requestId || !phoneNumber) {
      setError("OTP, Request ID, and phone number are required");
      return;
    }
    if (phoneNumber.length !== 10) {
      setError("Phone number must be exactly 10 digits");
      return;
    }
    setLoading(true);
    try {
      // Verify OTP for the current role (user or professional)
      const verifyEndpoint = role === "user"
        ? `${baseURL}/api/v1/user/verify-otp`
        : `${baseURL}/api/v1/professional/verify-otp`;
      
      const { data } = await api.post<VerifyResponse>(verifyEndpoint, {
        otp,
        requestId,
        phoneNumber: fullPhoneNumber,
      });
      const authToken = data.data.token;
      if (!authToken) throw new Error("Missing token from server");
      setToken(authToken);
      
      // Check if onboarding is complete
      const onboardingComplete = data.data.onboardingComplete ?? false;
      
      if (onboardingComplete) {
        // User has already completed onboarding, redirect to dashboard
        setAuth(authToken, role);
        router.replace(role === "user" ? "/dashboard" : "/prof-dashboard");
      } else {
        // Continue to onboarding
        goToStep(3);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Verify failed");
    } finally {
      setLoading(false);
    }
  }

  function handleNameAndDobSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!dateOfBirth) {
      setError("Date of birth is required");
      return;
    }
    // Validate age (must be at least 18 years old)
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (age < 18 || (age === 18 && monthDiff < 0) || (age === 18 && monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      setError("You must be at least 18 years old");
      return;
    }
    
    // Go to gender selection for all users (this step is only for regular user onboarding)
    goToStep(4);
  }

  function handleGenderSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!gender) {
      setError("Please select your gender");
      return;
    }
    goToStep(5); // Go to language selection
  }

  function handleLanguageSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (language.length === 0) {
      setError("Please select at least one language");
      return;
    }
    if (gender === "female") {
      goToStep(6); // Show listener/friend selection
    } else {
      goToStep(7); // Go directly to relationship goals (step 7 shows relationship goals for males)
    }
  }

  function handleUserTypeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userType) {
      setError("Please select an option");
      return;
    }
    if (userType === "listener") {
      // Go directly to topic selection (step 7) - professional account will be created after step 9
      goToStep(7);
    } else {
      goToStep(7); // Step 7 will show relationship goals for friend type
    }
  }

  function handleCategoryToggle(categoryId: string) {
    setSelectedCategoryIds((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      }
      return [...prev, categoryId];
    });
  }

  function handleCategoriesSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedCategoryIds.length === 0) {
      setError("Please select at least one category");
      return;
    }
    // For users (friends), go directly to relationship goals
    // For professionals (listeners), go to voice recording
    if (userType === "listener" || role === "professional") {
      goToStep(8); // Go to voice recording for professionals
    } else {
      goToStep(7); // Go to relationship goals for users
    }
  }

  async function startVoiceRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setVoiceRecording(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      setError("Failed to access microphone. Please allow microphone access.");
      console.error("Error accessing microphone:", err);
    }
  }

  function stopVoiceRecording() {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  }

  function handleVoiceRecordingComplete() {
    if (!voiceRecording) {
      setError("Please record your voice first");
      return;
    }
    
    // For listeners, go to video preview (step 9) instead of completing onboarding
    // Onboarding will be completed after video preview
    if (userType === "listener") {
      goToStep(9);
    } else {
      // For regular professionals, complete onboarding immediately (existing behavior)
      // This should not happen in the current flow, but keeping as fallback
      setError("Unexpected flow - voice recording complete for non-listener");
    }
  }

  function handleReasonToggle(reason: string) {
    setSelectedReasons((prev) => {
      if (prev.includes(reason)) {
        return prev.filter((r) => r !== reason);
      } else if (prev.length < 2) {
        return [...prev, reason];
      }
      return prev;
    });
  }

  async function handleRelationshipGoalsSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedReasons.length === 0) {
      setError("Please select at least one option");
      return;
    }
    if (selectedReasons.length > 2) {
      setError("Please select at most 2 options");
      return;
    }
    
    // Register user after selecting relationship goals
    setError(null);
    setLoading(true);
    try {
      if (token) {
        // Set auth token first to include it in API calls
        setAuth(token, role);
        
        // Send onboarding data to backend
        const onboardingEndpoint = role === "user" 
          ? `${baseURL}/api/v1/user/complete-onboarding`
          : `${baseURL}/api/v1/professional/complete-onboarding`;
        
        const onboardingData: any = {
          username: role === "user" ? name : undefined,
          dateOfBirth,
          language,
          gender,
          categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
          relationshipGoals: selectedReasons,
        };

        await api.post(onboardingEndpoint, onboardingData);
        
        setInfo("Setup complete. Redirecting...");
        setTimeout(() => {
          router.replace(role === "user" ? "/dashboard" : "/prof-dashboard");
        }, 1000);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to complete setup");
    } finally {
      setLoading(false);
    }
  }

  async function handleFinalSubmit(e: React.FormEvent) {
    // This is used for video preview step (step 9) for listeners
    // First create/authenticate professional account, then complete onboarding
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    
    try {
      if (userType === "listener") {
        const fullPhoneNumber = `${phoneNumber}`;
        
        // Step 1: Silently create/authenticate professional account
        // Request professional login to get requestId
        const { data: loginData } = await api.post<LoginStepResponse>(
          `${baseURL}/api/v1/professional/login`, 
          { phoneNumber: fullPhoneNumber }
        );
        if (!loginData?.data?.requestId) throw new Error("Missing requestId from server");
        
        // Verify OTP for professional using the same OTP from step 2
        const verifyEndpoint = `${baseURL}/api/v1/professional/verify-otp`;
        const { data: verifyData } = await api.post<VerifyResponse>(verifyEndpoint, {
          otp, // Use the OTP that was entered in step 2
          requestId: loginData.data.requestId,
          phoneNumber: fullPhoneNumber,
        });
        
        const profToken = verifyData.data.token;
        if (!profToken) throw new Error("Missing token from server");
        setToken(profToken);
        setAuth(profToken, "professional");
        
        // Step 2: Complete professional onboarding with all collected data
        const onboardingEndpoint = `${baseURL}/api/v1/professional/complete-onboarding`;
        
        const onboardingData: any = {
          name, // Send the name collected during onboarding
          dateOfBirth, // Use dateOfBirth from user onboarding
          language, // Use language from user onboarding
          gender, // Use gender from user onboarding
          topics: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined, // topics is the field name for professional onboarding
          categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
        };

        // Convert voice recording to base64 for upload
        if (voiceRecording) {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            onboardingData.voiceRecording = base64Audio;
            try {
              await api.post(onboardingEndpoint, onboardingData);
              setInfo("We will take 2 hours to verify your profile. You'll be notified once it's approved.");
              setTimeout(() => {
                router.replace("/prof-dashboard");
              }, 3000);
            } catch (err: any) {
              setError(err?.response?.data?.error || "Failed to complete setup");
              setLoading(false);
            }
          };
          reader.readAsDataURL(voiceRecording);
        } else {
          // No voice recording, complete onboarding without it
          await api.post(onboardingEndpoint, onboardingData);
          setInfo("We will take 2 hours to verify your profile. You'll be notified once it's approved.");
          setTimeout(() => {
            router.replace("/prof-dashboard");
          }, 3000);
        }
      } else {
        // Fallback for non-listener flow (should not happen)
        setError("Unexpected flow - final submit for non-listener");
        setLoading(false);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to complete professional registration");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex-1 bg-white px-6 pt-6 pb-4 overflow-y-auto">
        {step === 1 ? (
          <PhoneNumberStep
            phoneNumber={phoneNumber}
            setPhoneNumber={setPhoneNumber}
            loading={loading}
            error={error}
            info={info}
            onSubmit={handleRequestOtp}
            role={role}
          />
        ) : step === 2 ? (
          <OtpVerificationStep
            otp={otp}
            setOtp={setOtp}
            phoneNumber={phoneNumber}
            countryCode={countryCode}
            loading={loading}
            error={error}
            info={info}
            onSubmit={handleVerifyOtp}
            onBack={goBack}
          />
        ) : step === 3 ? (
          <NameAndDobStep
            name={name}
            setName={setName}
            dateOfBirth={dateOfBirth}
            setDateOfBirth={setDateOfBirth}
            loading={loading}
            error={error}
            info={info}
            onSubmit={handleNameAndDobSubmit}
            onBack={goBack}
            role={userType === "listener" ? "professional" : role}
          />
        ) : step === 4 ? (
          <GenderSelectionStep
            gender={gender}
            setGender={setGender}
            loading={loading}
            error={error}
            onSubmit={handleGenderSubmit}
            onBack={goBack}
          />
        ) : step === 5 ? (
          <LanguageSelectionStep
            language={language}
            setLanguage={setLanguage}
            loading={loading}
            error={error}
            onSubmit={handleLanguageSubmit}
            onBack={goBack}
          />
        ) : step === 6 ? (
          <UserTypeSelectionStep
            userType={userType}
            setUserType={setUserType}
            loading={loading}
            error={error}
            onSubmit={handleUserTypeSubmit}
            onBack={goBack}
          />
        ) : step === 7 ? (
          (userType === "listener" || role === "professional") ? (
            <TopicSelectionStep
              selectedTopics={selectedCategoryIds}
              toggleTopic={handleCategoryToggle}
              loading={loading}
              error={error}
              onSubmit={handleCategoriesSubmit}
              onBack={goBack}
            />
          ) : (
            <RelationshipGoalsStep
              selectedReasons={selectedReasons}
              toggleReason={handleReasonToggle}
              loading={loading}
              error={error}
              info={info}
              onSubmit={handleRelationshipGoalsSubmit}
              onBack={goBack}
            />
          )
        ) : step === 8 ? (
          <VoiceRecordingStep
            isRecording={isRecording}
            voiceRecording={voiceRecording}
            randomSentence={randomSentence}
            onStartRecording={startVoiceRecording}
            onStopRecording={stopVoiceRecording}
            onReRecord={() => {
              setVoiceRecording(null);
              setIsRecording(false);
            }}
            onSubmit={handleVoiceRecordingComplete}
            onBack={goBack}
            error={error}
          />
        ) : step === 9 ? (
          <VideoPreviewStep
            loading={loading}
            error={error}
            info={info}
            onSubmit={handleFinalSubmit}
            onBack={goBack}
          />
        ) : step === 10 ? (
          <RoleSelectionStep
            onSelectRole={handleRoleSelection}
            onBack={() => setStep(1)}
          />
        ) : null}
      </div>
    </div>
  );
}
