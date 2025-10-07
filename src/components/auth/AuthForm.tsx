
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordField } from "./PasswordField";
import { useAuthentication } from "@/hooks/useAuthentication";
import { AuthAlert } from "./AuthAlert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Phone, MapPin, Mail, User, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { OFFICIAL_CHURCH_UNITS } from "@/constants/churchUnits";

export const AuthForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const returnTo = searchParams.get('returnTo');
  const isAdminLogin = returnTo === '/admin';

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [selectedPastor, setSelectedPastor] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [formStep, setFormStep] = useState(0); // 0: Basic info, 1: Additional info

  const {
    isLoading,
    errorMessage,
    setErrorMessage,
    passwordValidation,
    loginLocked,
    lockoutEndTime,
    clearErrors,
    validateAndSetPassword,
    signIn,
    signUp,
    resetPassword
  } = useAuthentication();

  // Redirect if user is already logged in and trying to access admin
  useEffect(() => {
    if (user && returnTo) {
      navigate(returnTo, { replace: true });
    }
  }, [user, returnTo, navigate]);

  const churchUnits = OFFICIAL_CHURCH_UNITS;

  // Fetch pastors dynamically from the database instead of using hardcoded values
  const [pastors, setPastors] = useState<{ id: string; name: string }[]>([]);

  // Fetch pastors when the component loads
  useEffect(() => {
    const fetchPastors = async () => {
      try {
        // First check if the members table exists
        const { data, error } = await supabase
          .from('members')
          .select('id, fullname')
          .eq('category', 'Pastors')
          .limit(10);

        if (error) {
          console.warn('Members table query failed:', error.message);
          // Set default pastors if table query fails
          setPastors([
            { id: 'default-1', name: 'Pastor Lawrence Ojide' },
            { id: 'default-2', name: 'Pastor John Doe' },
            { id: 'default-3', name: 'Pastor Sarah Johnson' }
          ]);
          return;
        }

        if (data && data.length > 0) {
          setPastors(data.map(pastor => ({
            id: pastor.id,
            name: pastor.fullname
          })));
        } else {
          // Set default pastors if no pastors found
          setPastors([
            { id: 'default-1', name: 'Pastor Lawrence Ojide' }
          ]);
        }
      } catch (error) {
        console.warn('Error fetching pastors, using defaults:', error);
        // Fallback to default pastors
        setPastors([
          { id: 'default-1', name: 'Pastor Lawrence Ojide' }
        ]);
      }
    };

    fetchPastors();
  }, []);

  const validateEmail = (email: string): boolean => {
    // More robust email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const validateBasicInfo = (): string | null => {
    if (isSignUp) {
      if (!fullName || fullName.trim().length < 2) {
        return "Please enter your full name (at least 2 characters)";
      }

      // Use our enhanced password validation
      if (password) {
        validateAndSetPassword(password);
        if (passwordValidation && !passwordValidation.isValid) {
          return passwordValidation.message;
        }
      } else {
        return "Please enter a password";
      }

      if (password !== confirmPassword) {
        return "Passwords do not match";
      }

      if (!acceptTerms) {
        return "You must accept the terms and conditions";
      }
    }

    if (!email) {
      return "Please enter your email address";
    }

    if (!validateEmail(email)) {
      return "Please enter a valid email address";
    }

    if (!password) {
      return "Please enter your password";
    }

    return null;
  };

  const validateAdditionalInfo = (): string | null => {
    // Phone validation is optional but if provided should be valid
    if (phone && phone.length > 0 && phone.length < 10) {
      return "Please enter a valid phone number";
    }

    return null;
  };

  const handleNextStep = () => {
    const validationError = validateBasicInfo();
    if (validationError) {
      clearErrors();
      setErrorMessage(validationError);
      return;
    }

    setFormStep(1);
  };

  const handlePrevStep = () => {
    setFormStep(0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isSignUp && formStep === 0) {
      handleNextStep();
      return;
    }

    // Validate form
    const basicValidation = validateBasicInfo();
    if (basicValidation) {
      clearErrors();
      setErrorMessage(basicValidation);
      return;
    }

    if (isSignUp) {
      const additionalValidation = validateAdditionalInfo();
      if (additionalValidation) {
        clearErrors();
        setErrorMessage(additionalValidation);
        return;
      }
    }

    // Proceed with authentication
    if (isSignUp) {
      console.log("Submitting signup form with:", {
        email,
        passwordLength: password.length,
        fullName,
        phone,
        address,
        selectedUnit,
        selectedPastor
      });
      signUp(email, password, fullName, selectedUnit, selectedPastor, phone, address);
    } else {
      signIn(email, password, returnTo || undefined);
    }
  };

  const handleForgotPassword = () => {
    if (!email) {
      clearErrors();
      setErrorMessage("Please enter your email address first");
      return;
    }

    if (!validateEmail(email)) {
      clearErrors();
      setErrorMessage("Please enter a valid email address");
      return;
    }

    resetPassword(email);
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFullName("");
    setPhone("");
    setAddress("");
    setSelectedUnit("");
    setSelectedPastor("");
    setAcceptTerms(false);
    setFormStep(0);
    clearErrors();
  };

  const toggleSignUpMode = () => {
    resetForm();
    setIsSignUp(!isSignUp);
  };

  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center py-8">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-white p-8 shadow-lg">
        <div className="text-center">
          {isAdminLogin && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Shield className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-blue-800 font-medium">Admin Access Required</p>
              <p className="text-xs text-blue-600">Please sign in to access the admin dashboard</p>
            </div>
          )}
          <h2 className="text-2xl font-bold">
            {isSignUp ? "Create an account" : isAdminLogin ? "Admin Login" : "Welcome back"}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isSignUp
              ? formStep === 0
                ? "Enter your basic information"
                : "Complete your profile"
              : isAdminLogin
              ? "Sign in with your admin credentials"
              : "Please sign in to your account"
            }
          </p>
        </div>

        <AuthAlert isSignUp={isSignUp} errorMessage={errorMessage} />

        {/* Show lockout message if account is locked */}
        {loginLocked && lockoutEndTime && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mt-4">
            <p className="text-amber-800 text-sm">
              Too many failed login attempts. Your account is temporarily locked until{" "}
              {lockoutEndTime.toLocaleTimeString()}.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {isSignUp && formStep === 0 ? (
            // Step 1: Basic Information
            <div className="space-y-4">
              <div className="relative">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    <User className="h-4 w-4" />
                  </div>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      clearErrors();
                      setFullName(e.target.value);
                    }}
                    required
                    className="pl-10"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="relative">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    <Mail className="h-4 w-4" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      clearErrors();
                      setEmail(e.target.value.toLowerCase()); // Force lowercase
                    }}
                    required
                    className="pl-10"
                    placeholder="your.email@example.com"
                  />
                </div>
              </div>

              <PasswordField
                password={password}
                setPassword={setPassword}
                clearErrors={clearErrors}
                showConfirmation={true}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                isSignUp={true}
              />

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={(checked) => {
                    clearErrors();
                    setAcceptTerms(checked as boolean);
                  }}
                />
                <label
                  htmlFor="terms"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I accept the{" "}
                  <a href="/terms" className="text-blue-600 hover:underline" target="_blank">
                    terms and conditions
                  </a>
                </label>
              </div>
            </div>
          ) : isSignUp && formStep === 1 ? (
            // Step 2: Additional Information
            <div className="space-y-4">
              <div>
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    <Phone className="h-4 w-4" />
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      clearErrors();
                      setPhone(e.target.value);
                    }}
                    className="pl-10"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address (Optional)</Label>
                <div className="relative">
                  <div className="absolute left-3 top-3 text-gray-500">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <Textarea
                    id="address"
                    value={address}
                    onChange={(e) => {
                      clearErrors();
                      setAddress(e.target.value);
                    }}
                    className="pl-10 min-h-[80px]"
                    placeholder="Your address"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="churchUnit">Church Unit</Label>
                <Select
                  value={selectedUnit}
                  onValueChange={(value) => {
                    clearErrors();
                    setSelectedUnit(value);
                    // Reset pastor if not auxano
                    if (value !== "auxano") {
                      setSelectedPastor("");
                    }
                  }}
                >
                  <SelectTrigger id="churchUnit" className="w-full">
                    <SelectValue placeholder="Select your church unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {churchUnits.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedUnit === "auxano" && (
                <div>
                  <Label htmlFor="pastor">Assign Pastor</Label>
                  <Select
                    value={selectedPastor}
                    onValueChange={(value) => {
                      clearErrors();
                      setSelectedPastor(value);
                    }}
                  >
                    <SelectTrigger id="pastor" className="w-full">
                      <SelectValue placeholder="Select your pastor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {pastors.map((pastor) => (
                        <SelectItem key={pastor.id} value={pastor.id}>
                          {pastor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ) : (
            // Sign In Form
            <div className="space-y-4">
              <div className="relative">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    <Mail className="h-4 w-4" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      clearErrors();
                      setEmail(e.target.value.toLowerCase()); // Force lowercase
                    }}
                    required
                    className="pl-10"
                    placeholder="your.email@example.com"
                  />
                </div>
              </div>

              <PasswordField
                password={password}
                setPassword={setPassword}
                clearErrors={clearErrors}
              />
            </div>
          )}

          {!isSignUp && (
            <div className="text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-blue-600 hover:underline"
              >
                Forgot password?
              </button>
            </div>
          )}

          <div className="flex flex-col space-y-3">
            {isSignUp && formStep === 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevStep}
                className="w-full"
              >
                Back
              </Button>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : isSignUp ? (
                formStep === 0 ? "Continue" : "Create Account"
              ) : (
                "Sign In"
              )}
            </Button>
          </div>
        </form>

        <div className="mt-4 text-center text-sm">
          <button
            type="button"
            onClick={toggleSignUpMode}
            className="text-blue-600 hover:underline"
          >
            {isSignUp
              ? "Already have an account? Sign in"
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
};
