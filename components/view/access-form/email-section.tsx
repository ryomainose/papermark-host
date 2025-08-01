import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";

import { Brand, DataroomBrand } from "@prisma/client";
import { useDebouncedCallback } from "use-debounce";

import { cn } from "@/lib/utils";
import { determineTextColor } from "@/lib/utils/determine-text-color";
import { validateEmail } from "@/lib/utils/validate-email";

import { DEFAULT_ACCESS_FORM_TYPE } from ".";

export default function EmailSection({
  data,
  setData,
  brand,
  disableEditEmail,
  useCustomAccessForm,
  onValidationChange,
}: {
  data: DEFAULT_ACCESS_FORM_TYPE;
  setData: Dispatch<SetStateAction<DEFAULT_ACCESS_FORM_TYPE>>;
  brand?: Partial<Brand> | Partial<DataroomBrand> | null;
  disableEditEmail?: boolean;
  useCustomAccessForm?: boolean;
  onValidationChange: (isValid: boolean) => void;
}) {
  const { email } = data;
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    // Load email from localStorage when the component mounts
    const storedEmail = window.localStorage.getItem("papermark.email");
    if (storedEmail) {
      setData((prevData) => ({
        ...prevData,
        email: storedEmail.toLowerCase(),
      }));
    }
  }, [setData]);

  const handleInvalid = (e: React.InvalidEvent<HTMLInputElement>) => {
    e.preventDefault(); // Prevent default browser validation popup
    setEmailError("有効なメールアドレスを入力してください");
  };

  const debouncedValidation = useDebouncedCallback(
    (value: string) => {
      const isValid = !value || validateEmail(value);
      if (isDirty && value && !isValid) {
        setEmailError("有効なメールアドレスを入力してください");
      } else {
        setEmailError(null);
      }
      // Notify parent component about validation status
      onValidationChange?.(isValid);
    },
    500, // 500ms delay
  );

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value.toLowerCase();
    setEmailError(null); // Clear error when typing

    debouncedValidation(newEmail);

    // Update the state
    setData({ ...data, email: newEmail });
    // Store in localStorage
    window.localStorage.setItem("papermark.email", newEmail);

    // Optional: Clear error if input becomes valid
    if (e.target.validity.valid) {
      setEmailError(null);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsDirty(true);
    const value = e.target.value;
    const isValid = !value || validateEmail(value);
    if (value && !isValid) {
      setEmailError("有効なメールアドレスを入力してください");
    }
    onValidationChange?.(isValid);
  };

  const handleFocus = () => {
    // Optionally clear error when user focuses the input to type again
    setEmailError(null);
  };

  return (
    <div className="relative space-y-2">
      <label
        htmlFor="email"
        className="block text-sm font-medium leading-6 text-white"
        style={{
          color: determineTextColor(brand?.accentColor),
        }}
      >
        メールアドレス
      </label>
      <input
        name="email"
        id="email"
        type="email"
        autoCorrect="off"
        autoComplete="email"
        autoFocus
        required
        className={cn(
          "flex w-full rounded-md border-0 bg-black py-1.5 text-gray-500 shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-300 sm:text-sm sm:leading-6",
          emailError && isDirty && "ring-red-500",
        )}
        style={{
          backgroundColor:
            brand && brand.accentColor ? brand.accentColor : "black",
          color: disableEditEmail
            ? "hsl(var(--muted-foreground))"
            : determineTextColor(brand?.accentColor),
        }}
        value={email || ""}
        placeholder="メールアドレスを入力"
        onChange={handleEmailChange}
        onInvalid={handleInvalid}
        onBlur={handleBlur}
        onFocus={handleFocus}
        disabled={disableEditEmail}
        data-1p-ignore
        aria-invalid={emailError ? "true" : "false"}
        aria-describedby={emailError ? "email-error" : undefined}
      />
      {emailError && (
        <p
          id="email-error"
          className="mt-1 text-sm text-red-500"
          style={{
            color: determineTextColor(brand?.accentColor),
          }}
        >
          {emailError}
        </p>
      )}
      <p className="text-sm text-gray-500">
        {useCustomAccessForm
          ? "このデータはコンテンツ提供者と共有されます。"
          : "このデータは送信者と共有されます。"}
      </p>
    </div>
  );
}
