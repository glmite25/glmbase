
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordField } from "./PasswordField";
import { useAuthentication } from "@/hooks/useAuthentication";
import { AuthAlert } from "./AuthAlert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const AuthForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [selectedPastor, setSelectedPastor] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  const { isLoading, errorMessage, clearErrors, signIn, signUp, resetPassword } = useAuthentication();

  const churchUnits = [
    { id: "3hmedia", name: "3H Media" },
    { id: "3hmusic", name: "3H Music" },
    { id: "3hmovies", name: "3H Movies" },
    { id: "3hsecurity", name: "3H Security" },
    { id: "discipleship", name: "Discipleship" },
    { id: "praisefeet", name: "Praise Feet" },
    { id: "tof", name: "TOF" },
    { id: "auxano", name: "Auxano Group" },
  ];

  const pastors = [
    { id: "timileyin_fadeyi", name: "Timileyin Fadeyi" },
    { id: "samuel_friday", name: "Samuel Friday" },
    { id: "femi_fatoyinbo", name: "Femi Fatoyinbo" },
    { id: "igbalaye_olajide", name: "Igbalaye Olajide" },
    { id: "olaiya_sunday", name: "Olaiya Sunday" },
  ];

  const validateForm = (): string | null => {
    if (isSignUp) {
      if (!fullName || fullName.trim().length < 2) {
        return "Please enter your full name (at least 2 characters)";
      }

      if (password.length < 6) {
        return "Password must be at least 6 characters long";
      }
    }

    if (!email || !email.includes('@') || !email.includes('.')) {
      return "Please enter a valid email address";
    }

    if (!password) {
      return "Please enter your password";
    }

    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      clearErrors();
      setErrorMessage(validationError);
      return;
    }

    // Proceed with authentication
    if (isSignUp) {
      console.log("Submitting signup form with:", {
        email,
        passwordLength: password.length,
        fullName,
        selectedUnit,
        selectedPastor
      });
      signUp(email, password, fullName, selectedUnit, selectedPastor);
    } else {
      signIn(email, password);
    }
  };

  const handleForgotPassword = () => {
    resetPassword(email);
  };

  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-white p-8 shadow-lg">
        <div className="text-center">
          <h2 className="text-2xl font-bold">
            {isSignUp ? "Create an account" : "Welcome back"}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isSignUp ? "Sign up to get started" : "Please sign in to your account"}
          </p>
        </div>

        <AuthAlert isSignUp={isSignUp} errorMessage={errorMessage} />

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-4">
            {isSignUp && (
              <>
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      clearErrors();
                      setFullName(e.target.value);
                    }}
                    required={isSignUp}
                  />
                </div>
                <div>
                  <Label htmlFor="churchUnit">Church Unit</Label>
                  <Select
                    value={selectedUnit}
                    onValueChange={(value) => {
                      clearErrors();
                      setSelectedUnit(value);
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
              </>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  clearErrors();
                  setEmail(e.target.value);
                }}
                required
              />
            </div>
            <PasswordField
              password={password}
              setPassword={setPassword}
              clearErrors={clearErrors}
            />
          </div>

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

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading
              ? "Loading..."
              : isSignUp
              ? "Create Account"
              : "Sign In"}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm">
          <button
            type="button"
            onClick={() => {
              clearErrors();
              setIsSignUp(!isSignUp);
            }}
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
