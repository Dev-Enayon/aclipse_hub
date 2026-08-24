"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import {
  ACADEMIC_SESSIONS,
  CLASSES_BY_LEVEL,
  DEPARTMENTS,
  GENDERS,
  GUARDIAN_RELATIONSHIPS,
  ONBOARDING_STEPS,
  PERFORMANCE_LEVELS,
  SCHOOL_LEVELS,
  SCHOOL_TYPES,
  SUBJECT_OPTIONS,
  SUBJECTS,
  classesForLevel,
  departmentRequired,
  validateStep,
  type StudentProfileInput,
} from "@/lib/student-form";
import { NIGERIAN_STATES, NIGERIA_STATE_LGAS } from "@/lib/nigeria";
import { PhoneInput } from "@/components/onboarding/phone-input";
import { MultiSelect } from "@/components/onboarding/multi-select";
import { Logo } from "@/components/logo";

const HOBBY_SUGGESTIONS = ["Reading", "Football", "Basketball", "Music", "Chess", "Drawing", "Coding", "Swimming", "Dancing", "Writing"];
const INTEREST_SUGGESTIONS = ["Science & Technology", "Business & Finance", "Arts & Design", "Medicine & Health", "Law", "Engineering", "Media & Communication", "Sports", "Agriculture", "Education"];

const EMPTY_PROFILE: StudentProfileInput = {
  surname: "",
  otherNames: "",
  preferredName: "",
  gender: "",
  dateOfBirth: "",
  phone: "",
  stateOfOrigin: "",
  lga: "",
  homeAddress: "",
  schoolLevel: "",
  classLevel: "",
  department: "",
  schoolName: "",
  schoolType: "",
  academicSession: "",
  previousClass: "",
  academicPerformance: "",
  favouriteSubject: "",
  difficultSubjects: [],
  jambRegNumber: "",
  jambTargetScore: null,
  intendedCourseOfStudy: "",
  firstChoiceUniversity: "",
  secondChoiceUniversity: "",
  utmeSubjects: [],
  mockScore: null,
  guardianName: "",
  guardianRelationship: "",
  guardianPhone: "",
  guardianEmail: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  aboutMe: "",
  hobbies: [],
  interests: [],
  careerAmbition: "",
  dreamJob: "",
};

function splitFullName(fullName: string): { surname: string; otherNames: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { surname: "", otherNames: "" };
  if (parts.length === 1) return { surname: parts[0], otherNames: "" };
  return { surname: parts[parts.length - 1], otherNames: parts.slice(0, -1).join(" ") };
}

type Errors = Record<string, string>;

export function OnboardingClient({
  initialData,
  isAuthenticated,
  accountName,
  accountEmail,
  accountImage,
}: {
  initialData: StudentProfileInput | null;
  isAuthenticated: boolean;
  accountName: string;
  accountEmail: string;
  accountImage: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<StudentProfileInput>(() => {
    if (initialData) return { ...EMPTY_PROFILE, ...initialData };
    return { ...EMPTY_PROFILE, ...splitFullName(accountName) };
  });
  const [errors, setErrors] = useState<Errors>({});
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Sign-up fields (only used for anonymous visitors creating an account)
  const [signup, setSignup] = useState({
    fullName: accountName,
    email: accountEmail,
    password: "",
    confirmPassword: "",
  });
  const [signupError, setSignupError] = useState<string | null>(null);
  const [accountCreating, setAccountCreating] = useState(false);

  // Anonymous visitors get an extra "Create Account" step in front of the
  // student information form.
  const steps = useMemo<readonly string[]>(
    () => (isAuthenticated ? ONBOARDING_STEPS : ["Create Account", ...ONBOARDING_STEPS]),
    [isAuthenticated]
  );
  const profileStep = isAuthenticated ? step : step - 1;

  const update = <K extends keyof StudentProfileInput>(field: K, value: StudentProfileInput[K]) => {
    setData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field as string]) return prev;
      const next = { ...prev };
      delete next[field as string];
      return next;
    });
  };

  const isJunior = data.schoolLevel === "JUNIOR_SECONDARY";
  const showDepartment =
    data.schoolLevel === "SENIOR_SECONDARY" && !!data.classLevel && departmentRequired(data.classLevel);
  const isJambite = data.classLevel === "JAMBITE";

  const lgas = useMemo(
    () => (data.stateOfOrigin ? NIGERIA_STATE_LGAS[data.stateOfOrigin] ?? [] : []),
    [data.stateOfOrigin]
  );

  async function persist(submit: boolean): Promise<{ ok: boolean; errors?: Errors }> {
    setSaveState("saving");
    try {
      const res = await fetch("/api/student/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, submit }),
      });
      if (res.status === 401) {
        router.push("/login?callbackUrl=/onboarding");
        return { ok: false };
      }
      const json = await res.json();
      if (!res.ok) {
        setSaveState("error");
        if (res.status === 422 && json.errors) return { ok: false, errors: json.errors as Errors };
        return { ok: false };
      }
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
      return { ok: true };
    } catch {
      setSaveState("error");
      return { ok: false };
    }
  }

  function validateAccount(): Errors {
    const errs: Errors = {};
    if (!signup.fullName.trim()) errs.fullName = "Full name is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signup.email.trim())) {
      errs.email = "Enter a valid email address";
    }
    if (signup.password.length < 8) {
      errs.password = "Password must be at least 8 characters";
    }
    if (signup.confirmPassword !== signup.password) {
      errs.confirmPassword = "Passwords do not match";
    }
    return errs;
  }

  async function handleContinue() {
    // Account creation step (anonymous visitors only)
    if (!isAuthenticated && step === 0) {
      const accountErrors = validateAccount();
      setErrors(accountErrors);
      if (Object.keys(accountErrors).length > 0) return;

      setAccountCreating(true);
      setSignupError(null);
      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: signup.fullName.trim(),
            email: signup.email.trim(),
            password: signup.password,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          if (res.status === 409) {
            setSignupError(
              (json.error || "An account with this email already exists.") +
                " Sign in instead — you'll continue where you left off."
            );
          } else {
            setSignupError(json.error || "Could not create your account. Please try again.");
          }
          return;
        }

        // Auto sign-in with the freshly created credentials
        const result = await signIn("credentials", {
          redirect: false,
          email: signup.email.trim().toLowerCase(),
          password: signup.password,
        });
        if (result?.error) {
          setSignupError(
            "Your account was created, but automatic sign-in failed. Please sign in manually."
          );
          return;
        }

        // Carry the entered name into the profile form
        setData((prev) => ({ ...prev, ...splitFullName(signup.fullName.trim()) }));
        setStep((s) => Math.min(s + 1, steps.length - 1));
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        setSignupError("Network error. Please try again.");
      } finally {
        setAccountCreating(false);
      }
      return;
    }

    const stepErrors = validateStep(profileStep, data);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;
    await persist(false);
    setStep((s) => Math.min(s + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    setSubmitting(true);
    const result = await persist(true);
    if (!result.ok) {
      setSubmitting(false);
      if (result.errors) {
        setErrors(result.errors);
        const profileIndexWithError = [
          () => Object.keys(validateStep(0, data)).some((k) => k in result.errors!),
          () => Object.keys(validateStep(1, data)).some((k) => k in result.errors!),
          () => Object.keys(validateStep(2, data)).some((k) => k in result.errors!),
          () => Object.keys(validateStep(3, data)).some((k) => k in result.errors!),
        ].findIndex((check) => check());
        if (profileIndexWithError >= 0) {
          setStep(isAuthenticated ? profileIndexWithError : profileIndexWithError + 1);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
      return;
    }
    setCompleted(true);
    setSubmitting(false);
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-md w-full">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile completed successfully!</h1>
          <p className="text-gray-600 mb-6">Welcome aboard, {data.preferredName || data.otherNames || accountName}. Redirecting you to your dashboard...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo className="w-8 h-8 rounded-lg" />
            <span className="text-lg font-bold text-gray-900">Aclipse Hub</span>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {accountImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={accountImage} alt="" className="w-9 h-9 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                    {(accountName || "S").charAt(0)}
                  </div>
                )}
                <span className="hidden sm:block text-sm text-gray-500">{accountEmail}</span>
              </>
            ) : (
              <span className="text-sm text-gray-500">
                Already have an account?{" "}
                <Link href="/login" className="text-primary font-medium hover:underline">
                  Sign in
                </Link>
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {isAuthenticated ? "Student Information Form" : "Create your account"}
          </h1>
          <p className="text-gray-600">
            {isAuthenticated
              ? "Tell us about yourself so we can personalize your learning experience."
              : "Set up your login details, then tell us about yourself so we can personalize your learning experience."}
          </p>
        </div>

        <ProgressIndicator step={step} steps={steps} />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Step {step + 1}: {steps[step]}
          </h2>

          {!isAuthenticated && step === 0 && (
            <AccountStep
              signup={signup}
              setSignup={setSignup}
              errors={errors}
              signupError={signupError}
            />
          )}
          {(isAuthenticated ? step === 0 : profileStep === 0) && (
            <PersonalStep data={data} errors={errors} update={update} lgas={lgas} />
          )}
          {profileStep === 1 && (
            <AcademicStep
              data={data}
              errors={errors}
              update={update}
              isJunior={isJunior}
              showDepartment={showDepartment}
              isJambite={isJambite}
            />
          )}
          {profileStep === 2 && (
            <AdditionalStep data={data} errors={errors} update={update} />
          )}
          {profileStep === 3 && (
            <GuardianStep data={data} errors={errors} update={update} />
          )}
          {profileStep === 4 && (
            <ProfileStep data={data} update={update} />
          )}
          {profileStep === 5 && (
            <ReviewStep
              data={data}
              goToStep={(s) => setStep(isAuthenticated ? s : s + 1)}
              isJambite={isJambite}
            />
          )}

          <div className="flex items-center justify-between gap-4 mt-8 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-3">
              {step > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  Back
                </button>
              )}
              {(isAuthenticated ? step < 5 : step > 0 && step < steps.length - 1) && (
                <button
                  type="button"
                  onClick={() => persist(false)}
                  disabled={saveState === "saving"}
                  className="px-4 py-2.5 rounded-lg text-sm text-primary hover:bg-blue-50 transition-colors font-medium disabled:opacity-50"
                >
                  {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved ✓" : "Save Progress"}
                </button>
              )}
              {saveState === "error" && (
                <span className="text-sm text-red-600">Save failed. Check your connection.</span>
              )}
            </div>

            {step < steps.length - 1 ? (
              <button
                type="button"
                onClick={handleContinue}
                disabled={accountCreating}
                className="px-6 py-2.5 rounded-lg bg-primary text-white hover:bg-blue-700 transition-colors font-medium disabled:opacity-60"
              >
                {accountCreating ? "Creating account…" : "Continue"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2.5 rounded-lg bg-accent text-white hover:bg-orange-600 transition-colors font-semibold disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Profile"}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function ProgressIndicator({ step, steps }: { step: number; steps: readonly string[] }) {
  const percent = ((step + 1) / steps.length) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        {steps.map((label, i) => (
          <div key={label} className={`flex items-center ${i <= step ? "text-primary" : "text-gray-400"}`}>
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                i < step
                  ? "bg-primary text-white"
                  : i === step
                  ? "bg-primary text-white ring-4 ring-blue-100"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </div>
          </div>
        ))}
      </div>
      <div className="hidden sm:flex items-center justify-between text-xs text-gray-500 -mt-1 px-1">
        {steps.map((label, i) => (
          <span key={label} className={i === step ? "font-semibold text-primary" : ""}>
            {label.split(" ")[0]}
          </span>
        ))}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-3">
        <div className="bg-primary h-1.5 rounded-full transition-all duration-300" style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
}

function AccountStep({
  signup,
  setSignup,
  errors,
  signupError,
}: {
  signup: { fullName: string; email: string; password: string; confirmPassword: string };
  setSignup: React.Dispatch<React.SetStateAction<{ fullName: string; email: string; password: string; confirmPassword: string }>>;
  errors: Errors;
  signupError: string | null;
}) {
  return (
    <div className="space-y-5">
      <Field label="Full Name" required error={errors.fullName}>
        <input
          type="text"
          value={signup.fullName}
          onChange={(e) => setSignup((s) => ({ ...s, fullName: e.target.value }))}
          className={inputCls(errors.fullName)}
          placeholder="e.g. Chidera Grace Okafor"
        />
      </Field>

      <Field label="Email Address" required error={errors.email} hint="You will use this to sign in.">
        <input
          type="email"
          value={signup.email}
          onChange={(e) => setSignup((s) => ({ ...s, email: e.target.value }))}
          className={inputCls(errors.email)}
          placeholder="you@example.com"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Password" required error={errors.password} hint="At least 8 characters.">
          <input
            type="password"
            value={signup.password}
            onChange={(e) => setSignup((s) => ({ ...s, password: e.target.value }))}
            className={inputCls(errors.password)}
            placeholder="••••••••"
          />
        </Field>
        <Field label="Confirm Password" required error={errors.confirmPassword}>
          <input
            type="password"
            value={signup.confirmPassword}
            onChange={(e) => setSignup((s) => ({ ...s, confirmPassword: e.target.value }))}
            className={inputCls(errors.confirmPassword)}
            placeholder="••••••••"
          />
        </Field>
      </div>

      {signupError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {signupError}
        </div>
      )}

      <p className="text-xs text-gray-400">
        By creating an account you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

const inputClass =
  "w-full px-3.5 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 placeholder-gray-400 bg-white";

function inputCls(hasError?: string | boolean) {
  return `${inputClass} ${hasError ? "border-red-400" : "border-gray-300"}`;
}

function PersonalStep({
  data,
  errors,
  update,
  lgas,
}: {
  data: StudentProfileInput;
  errors: Errors;
  update: <K extends keyof StudentProfileInput>(field: K, value: StudentProfileInput[K]) => void;
  lgas: string[];
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Surname" required error={errors.surname}>
          <input
            type="text"
            value={data.surname ?? ""}
            onChange={(e) => update("surname", e.target.value)}
            className={inputCls(errors.surname)}
            placeholder="e.g. Okafor"
          />
        </Field>
        <Field label="Other Names" required error={errors.otherNames}>
          <input
            type="text"
            value={data.otherNames ?? ""}
            onChange={(e) => update("otherNames", e.target.value)}
            className={inputCls(errors.otherNames)}
            placeholder="e.g. Chidera Grace"
          />
        </Field>
      </div>

      <Field label="Preferred Name" hint="What should we call you? (Optional)">
        <input
          type="text"
          value={data.preferredName ?? ""}
          onChange={(e) => update("preferredName", e.target.value)}
          className={inputCls()}
          placeholder="e.g. Dera"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Gender" error={errors.gender}>
          <select
            value={data.gender ?? ""}
            onChange={(e) => update("gender", e.target.value)}
            className={inputCls(errors.gender)}
          >
            <option value="">Select gender</option>
            {GENDERS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Date of Birth" error={errors.dateOfBirth}>
          <input
            type="date"
            value={data.dateOfBirth ?? ""}
            max={new Date().toISOString().slice(0, 10)}
            min="1990-01-01"
            onChange={(e) => update("dateOfBirth", e.target.value)}
            className={inputCls(errors.dateOfBirth)}
          />
        </Field>
      </div>

      <Field label="Phone Number" error={errors.phone}>
        <PhoneInput value={data.phone ?? ""} onChange={(v) => update("phone", v)} />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="State of Origin" error={errors.stateOfOrigin}>
          <select
            value={data.stateOfOrigin ?? ""}
            onChange={(e) => {
              update("stateOfOrigin", e.target.value);
              update("lga", "");
            }}
            className={inputCls(errors.stateOfOrigin)}
          >
            <option value="">Select state</option>
            {NIGERIAN_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Local Government Area" error={errors.lga}>
          <select
            value={data.lga ?? ""}
            onChange={(e) => update("lga", e.target.value)}
            disabled={!data.stateOfOrigin}
            className={`${inputCls(errors.lga)} disabled:bg-gray-100`}
          >
            <option value="">{data.stateOfOrigin ? "Select LGA" : "Select state first"}</option>
            {lgas.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Home Address">
        <textarea
          value={data.homeAddress ?? ""}
          onChange={(e) => update("homeAddress", e.target.value)}
          rows={3}
          className={inputCls()}
          placeholder="Enter your home address"
        />
      </Field>
    </div>
  );
}

function AcademicStep({
  data,
  errors,
  update,
  isJunior,
  showDepartment,
  isJambite,
}: {
  data: StudentProfileInput;
  errors: Errors;
  update: <K extends keyof StudentProfileInput>(field: K, value: StudentProfileInput[K]) => void;
  isJunior: boolean;
  showDepartment: boolean;
  isJambite: boolean;
}) {
  return (
    <div className="space-y-5">
      <Field label="School Level" required error={errors.schoolLevel}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SCHOOL_LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              aria-pressed={data.schoolLevel === level.value}
              onClick={() => {
                if (data.schoolLevel !== level.value) {
                  update("schoolLevel", level.value);
                  update("classLevel", "");
                  update("department", "");
                }
              }}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                data.schoolLevel === level.value
                  ? "border-primary bg-blue-50 ring-2 ring-primary/20"
                  : "border-gray-200 hover:border-gray-300 bg-gray-50"
              }`}
            >
              <span className="font-medium text-gray-900">{level.label}</span>
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Class" required error={errors.classLevel}>
          <select
            value={data.classLevel ?? ""}
            onChange={(e) => {
              const newClass = e.target.value;
              update("classLevel", newClass);
              if (!departmentRequired(newClass)) update("department", "");
            }}
            disabled={!data.schoolLevel}
            className={`${inputCls(errors.classLevel)} disabled:bg-gray-100`}
          >
            <option value="">{data.schoolLevel ? "Select class" : "Select school level first"}</option>
            {classesForLevel(data.schoolLevel).map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </Field>

        {showDepartment && (
          <Field label="Department" required error={errors.department}>
            <select
              value={data.department ?? ""}
              onChange={(e) => update("department", e.target.value)}
              className={inputCls(errors.department)}
            >
              <option value="">Select department</option>
              {DEPARTMENTS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </Field>
        )}
      </div>

      {isJunior && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
          Junior Secondary School students do not need to choose a department yet.
        </div>
      )}

      {isJambite && (
        <div className="border border-orange-200 bg-orange-50 rounded-xl p-5 space-y-5">
          <h3 className="font-semibold text-orange-900">JAMB Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="JAMB Registration Number" hint="Optional">
              <input
                type="text"
                value={data.jambRegNumber ?? ""}
                onChange={(e) => update("jambRegNumber", e.target.value.toUpperCase())}
                className={inputCls()}
                placeholder="e.g. 12345678AB"
              />
            </Field>
            <Field label="JAMB Target Score" error={errors.jambTargetScore}>
              <input
                type="number"
                min={0}
                max={400}
                value={data.jambTargetScore ?? ""}
                onChange={(e) =>
                  update("jambTargetScore", e.target.value === "" ? null : Number(e.target.value))
                }
                className={inputCls(errors.jambTargetScore)}
                placeholder="e.g. 280"
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Intended Course of Study">
              <input
                type="text"
                value={data.intendedCourseOfStudy ?? ""}
                onChange={(e) => update("intendedCourseOfStudy", e.target.value)}
                className={inputCls()}
                placeholder="e.g. Medicine & Surgery"
              />
            </Field>
            <Field label="Current Mock/Test Score" hint="Optional" error={errors.mockScore}>
              <input
                type="number"
                min={0}
                max={400}
                value={data.mockScore ?? ""}
                onChange={(e) =>
                  update("mockScore", e.target.value === "" ? null : Number(e.target.value))
                }
                className={inputCls(errors.mockScore)}
                placeholder="e.g. 220"
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="First Choice University">
              <input
                type="text"
                value={data.firstChoiceUniversity ?? ""}
                onChange={(e) => update("firstChoiceUniversity", e.target.value)}
                className={inputCls()}
                placeholder="e.g. University of Lagos"
              />
            </Field>
            <Field label="Second Choice University">
              <input
                type="text"
                value={data.secondChoiceUniversity ?? ""}
                onChange={(e) => update("secondChoiceUniversity", e.target.value)}
                className={inputCls()}
                placeholder="e.g. University of Ilorin"
              />
            </Field>
          </div>
          <Field label="UTME Subjects">
            <MultiSelect
              options={SUBJECTS.filter((s) => s !== "Other")}
              selected={data.utmeSubjects ?? []}
              onChange={(v) => update("utmeSubjects", v)}
              allowCustom={false}
            />
          </Field>
        </div>
      )}

      {!data.schoolLevel && !errors.schoolLevel && (
        <p className="text-sm text-gray-400">Select your school level to continue.</p>
      )}
    </div>
  );
}

function AdditionalStep({
  data,
  errors,
  update,
}: {
  data: StudentProfileInput;
  errors: Errors;
  update: <K extends keyof StudentProfileInput>(field: K, value: StudentProfileInput[K]) => void;
}) {
  const allClasses = [
    ...CLASSES_BY_LEVEL.JUNIOR_SECONDARY,
    ...CLASSES_BY_LEVEL.SENIOR_SECONDARY,
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="School Name">
          <input
            type="text"
            value={data.schoolName ?? ""}
            onChange={(e) => update("schoolName", e.target.value)}
            className={inputCls()}
            placeholder="e.g. Kings College Lagos"
          />
        </Field>
        <Field label="School Type" error={errors.schoolType}>
          <select
            value={data.schoolType ?? ""}
            onChange={(e) => update("schoolType", e.target.value)}
            className={inputCls(errors.schoolType)}
          >
            <option value="">Select school type</option>
            {SCHOOL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Academic Session" error={errors.academicSession}>
          <select
            value={data.academicSession ?? ""}
            onChange={(e) => update("academicSession", e.target.value)}
            className={inputCls(errors.academicSession)}
          >
            <option value="">Select session</option>
            {ACADEMIC_SESSIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Previous Class/Grade">
          <select
            value={data.previousClass ?? ""}
            onChange={(e) => update("previousClass", e.target.value)}
            className={inputCls()}
          >
            <option value="">Select previous class</option>
            {allClasses.map((c) => (
              <option key={c.value} value={c.label}>{c.label}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Academic Performance Level" error={errors.academicPerformance}>
        <select
          value={data.academicPerformance ?? ""}
          onChange={(e) => update("academicPerformance", e.target.value)}
          className={inputCls(errors.academicPerformance)}
        >
          <option value="">Select your performance level</option>
          {PERFORMANCE_LEVELS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </Field>

      <Field label="Favourite Subject">
        <input
          type="text"
          list="subject-options"
          value={data.favouriteSubject ?? ""}
          onChange={(e) => update("favouriteSubject", e.target.value)}
          className={inputCls()}
          placeholder="Type or pick a subject"
        />
        <datalist id="subject-options">
          {SUBJECT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value} />
          ))}
        </datalist>
      </Field>

      <Field label="Subjects You Find Difficult" hint="Select all that apply">
        <MultiSelect
          options={SUBJECTS}
          selected={data.difficultSubjects ?? []}
          onChange={(v) => update("difficultSubjects", v)}
        />
      </Field>
    </div>
  );
}

function GuardianStep({
  data,
  errors,
  update,
}: {
  data: StudentProfileInput;
  errors: Errors;
  update: <K extends keyof StudentProfileInput>(field: K, value: StudentProfileInput[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Parent/Guardian Full Name" required error={errors.guardianName}>
          <input
            type="text"
            value={data.guardianName ?? ""}
            onChange={(e) => update("guardianName", e.target.value)}
            className={inputCls(errors.guardianName)}
            placeholder="Full name"
          />
        </Field>
        <Field label="Relationship to Student" required error={errors.guardianRelationship}>
          <select
            value={data.guardianRelationship ?? ""}
            onChange={(e) => update("guardianRelationship", e.target.value)}
            className={inputCls(errors.guardianRelationship)}
          >
            <option value="">Select relationship</option>
            {GUARDIAN_RELATIONSHIPS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Parent/Guardian Phone Number" required error={errors.guardianPhone}>
          <PhoneInput
            value={data.guardianPhone ?? ""}
            onChange={(v) => update("guardianPhone", v)}
            placeholder="801 234 5678"
          />
        </Field>
        <Field label="Parent/Guardian Email" error={errors.guardianEmail}>
          <input
            type="email"
            value={data.guardianEmail ?? ""}
            onChange={(e) => update("guardianEmail", e.target.value)}
            className={inputCls(errors.guardianEmail)}
            placeholder="parent@example.com"
          />
        </Field>
      </div>

      <div className="pt-4 border-t border-gray-100 space-y-5">
        <h3 className="font-semibold text-gray-900">Emergency Contact</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Emergency Contact Name">
            <input
              type="text"
              value={data.emergencyContactName ?? ""}
              onChange={(e) => update("emergencyContactName", e.target.value)}
              className={inputCls()}
              placeholder="Contact name"
            />
          </Field>
          <Field label="Emergency Contact Phone Number" error={errors.emergencyContactPhone}>
            <PhoneInput
              value={data.emergencyContactPhone ?? ""}
              onChange={(v) => update("emergencyContactPhone", v)}
              placeholder="801 234 5678"
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

function ProfileStep({
  data,
  update,
}: {
  data: StudentProfileInput;
  update: <K extends keyof StudentProfileInput>(field: K, value: StudentProfileInput[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <Field label="Short Introduction / About Me">
        <textarea
          value={data.aboutMe ?? ""}
          onChange={(e) => update("aboutMe", e.target.value)}
          rows={4}
          className={inputClass}
          placeholder="Tell us a little about yourself..."
        />
      </Field>
      <Field label="Hobbies" hint="Pick suggestions or add your own">
        <MultiSelect options={HOBBY_SUGGESTIONS} selected={data.hobbies ?? []} onChange={(v) => update("hobbies", v)} />
      </Field>
      <Field label="Interests">
        <MultiSelect options={INTEREST_SUGGESTIONS} selected={data.interests ?? []} onChange={(v) => update("interests", v)} />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Career Ambition">
          <input
            type="text"
            value={data.careerAmbition ?? ""}
            onChange={(e) => update("careerAmbition", e.target.value)}
            className={inputCls()}
            placeholder="e.g. To become a medical doctor"
          />
        </Field>
        <Field label="Dream Job">
          <input
            type="text"
            value={data.dreamJob ?? ""}
            onChange={(e) => update("dreamJob", e.target.value)}
            className={inputCls()}
            placeholder="e.g. Software Engineer at Google"
          />
        </Field>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value?: string | number | null }) {
  const display =
    value === undefined || value === null || String(value).trim() === ""
      ? "—"
      : String(value);
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
      <dt className="text-sm text-gray-500 shrink-0">{label}</dt>
      <dd className="text-sm text-gray-900 font-medium text-right">{display}</dd>
    </div>
  );
}

function ReviewSection({
  title,
  stepIndex,
  goToStep,
  children,
}: {
  title: string;
  stepIndex: number;
  goToStep: (s: number) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <button
          type="button"
          onClick={() => goToStep(stepIndex)}
          className="text-sm text-primary hover:text-blue-700 font-medium"
        >
          Edit
        </button>
      </div>
      <dl className="px-4 py-2">{children}</dl>
    </div>
  );
}

function ReviewStep({
  data,
  goToStep,
  isJambite,
}: {
  data: StudentProfileInput;
  goToStep: (s: number) => void;
  isJambite: boolean;
}) {
  const labelFor = (options: readonly { value: string; label: string }[], value?: string) =>
    options.find((o) => o.value === value)?.label ?? value;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 mb-4">
        Please review your information before submitting. Use the Edit buttons to make changes.
      </p>

      <ReviewSection title="Personal Information" stepIndex={0} goToStep={goToStep}>
        <ReviewRow label="Surname" value={data.surname} />
        <ReviewRow label="Other Names" value={data.otherNames} />
        <ReviewRow label="Preferred Name" value={data.preferredName} />
        <ReviewRow label="Gender" value={labelFor(GENDERS, data.gender)} />
        <ReviewRow label="Date of Birth" value={data.dateOfBirth} />
        <ReviewRow label="Phone" value={data.phone} />
        <ReviewRow label="State of Origin" value={data.stateOfOrigin} />
        <ReviewRow label="LGA" value={data.lga} />
        <ReviewRow label="Home Address" value={data.homeAddress} />
      </ReviewSection>

      <ReviewSection title="Academic Information" stepIndex={1} goToStep={goToStep}>
        <ReviewRow label="School Level" value={labelFor(SCHOOL_LEVELS, data.schoolLevel)} />
        <ReviewRow label="Class" value={data.classLevel} />
        {departmentRequired(data.classLevel) && <ReviewRow label="Department" value={labelFor(DEPARTMENTS, data.department)} />}
        {isJambite && (
          <>
            <ReviewRow label="JAMB Reg. Number" value={data.jambRegNumber} />
            <ReviewRow label="JAMB Target Score" value={data.jambTargetScore} />
            <ReviewRow label="Intended Course" value={data.intendedCourseOfStudy} />
            <ReviewRow label="First Choice University" value={data.firstChoiceUniversity} />
            <ReviewRow label="Second Choice University" value={data.secondChoiceUniversity} />
            <ReviewRow label="UTME Subjects" value={(data.utmeSubjects ?? []).join(", ")} />
            <ReviewRow label="Mock Score" value={data.mockScore} />
          </>
        )}
      </ReviewSection>

      <ReviewSection title="Additional Details" stepIndex={2} goToStep={goToStep}>
        <ReviewRow label="School Name" value={data.schoolName} />
        <ReviewRow label="School Type" value={labelFor(SCHOOL_TYPES, data.schoolType)} />
        <ReviewRow label="Academic Session" value={data.academicSession} />
        <ReviewRow label="Previous Class" value={data.previousClass} />
        <ReviewRow label="Performance" value={labelFor(PERFORMANCE_LEVELS, data.academicPerformance)} />
        <ReviewRow label="Favourite Subject" value={data.favouriteSubject} />
        <ReviewRow label="Difficult Subjects" value={(data.difficultSubjects ?? []).join(", ")} />
      </ReviewSection>

      <ReviewSection title="Parent / Guardian" stepIndex={3} goToStep={goToStep}>
        <ReviewRow label="Guardian Name" value={data.guardianName} />
        <ReviewRow label="Relationship" value={labelFor(GUARDIAN_RELATIONSHIPS, data.guardianRelationship)} />
        <ReviewRow label="Guardian Phone" value={data.guardianPhone} />
        <ReviewRow label="Guardian Email" value={data.guardianEmail} />
        <ReviewRow label="Emergency Contact" value={data.emergencyContactName} />
        <ReviewRow label="Emergency Phone" value={data.emergencyContactPhone} />
      </ReviewSection>

      <ReviewSection title="Student Profile" stepIndex={4} goToStep={goToStep}>
        <ReviewRow label="About Me" value={data.aboutMe} />
        <ReviewRow label="Hobbies" value={(data.hobbies ?? []).join(", ")} />
        <ReviewRow label="Interests" value={(data.interests ?? []).join(", ")} />
        <ReviewRow label="Career Ambition" value={data.careerAmbition} />
        <ReviewRow label="Dream Job" value={data.dreamJob} />
      </ReviewSection>
    </div>
  );
}
