
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface PasswordFieldProps {
  password: string;
  setPassword: (value: string) => void;
  clearErrors: () => void;
  showConfirmation?: boolean;
  confirmPassword?: string;
  setConfirmPassword?: (value: string) => void;
  isSignUp?: boolean;
}

export const PasswordField = ({
  password,
  setPassword,
  clearErrors,
  showConfirmation = false,
  confirmPassword = "",
  setConfirmPassword,
  isSignUp = false
}: PasswordFieldProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPasswordField, setShowConfirmPasswordField] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordFeedback, setPasswordFeedback] = useState("");

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPasswordField(!showConfirmPasswordField);
  };

  // Calculate password strength
  useEffect(() => {
    if (!password || password.length === 0) {
      setPasswordStrength(0);
      setPasswordFeedback("");
      return;
    }

    // Basic password strength calculation
    let strength = 0;
    let feedback = "";

    // Length check
    if (password.length >= 8) {
      strength += 25;
    } else {
      feedback = "Password should be at least 8 characters";
    }

    // Contains uppercase
    if (/[A-Z]/.test(password)) {
      strength += 25;
    } else if (!feedback) {
      feedback = "Add uppercase letters";
    }

    // Contains lowercase
    if (/[a-z]/.test(password)) {
      strength += 25;
    } else if (!feedback) {
      feedback = "Add lowercase letters";
    }

    // Contains numbers or special chars
    if (/[0-9!@#$%^&*(),.?":{}|<>]/.test(password)) {
      strength += 25;
    } else if (!feedback) {
      feedback = "Add numbers or special characters";
    }

    // Set feedback based on strength
    if (strength === 100) {
      feedback = "Strong password";
    } else if (strength >= 75) {
      feedback = "Good password";
    } else if (strength >= 50) {
      feedback = "Fair password";
    } else if (strength >= 25) {
      feedback = "Weak password";
    }

    setPasswordStrength(strength);
    setPasswordFeedback(feedback);
  }, [password]);

  // Get color based on strength
  const getStrengthColor = () => {
    if (passwordStrength >= 75) return "bg-green-500";
    if (passwordStrength >= 50) return "bg-yellow-500";
    if (passwordStrength >= 25) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-2">
      <div>
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => {
              clearErrors();
              setPassword(e.target.value);
            }}
            required
            className="pr-10"
            placeholder={isSignUp ? "Create a strong password" : "Enter your password"}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
            onClick={togglePasswordVisibility}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>

        {isSignUp && password.length > 0 && (
          <div className="mt-2">
            <Progress value={passwordStrength} className={`h-1 ${getStrengthColor()}`} />
            <p className="text-xs mt-1 text-gray-600">{passwordFeedback}</p>
          </div>
        )}
      </div>

      {showConfirmation && setConfirmPassword && (
        <div>
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPasswordField ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => {
                clearErrors();
                setConfirmPassword(e.target.value);
              }}
              required
              className="pr-10"
              placeholder="Confirm your password"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              onClick={toggleConfirmPasswordVisibility}
            >
              {showConfirmPasswordField ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
          {confirmPassword && password !== confirmPassword && (
            <p className="text-xs mt-1 text-red-500">Passwords do not match</p>
          )}
        </div>
      )}
    </div>
  );
};
