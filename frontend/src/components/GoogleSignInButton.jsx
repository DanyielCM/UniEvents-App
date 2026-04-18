import { useGoogleLogin } from "@react-oauth/google";
import { motion } from "framer-motion";

function GoogleLogo({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

export default function GoogleSignInButton({
  onSuccess,
  onError,
  label = "Continuă cu Google",
  loadingLabel = "Se conectează…",
  disabled = false,
  className = "",
}) {
  const login = useGoogleLogin({
    flow: "implicit",
    scope: "openid email profile",
    onSuccess: (tokenResponse) => onSuccess?.(tokenResponse),
    onError: (err) => onError?.(err),
    onNonOAuthError: (err) => onError?.(err),
  });

  return (
    <motion.button
      type="button"
      whileHover={disabled ? {} : { scale: 1.02, y: -1 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      onClick={() => !disabled && login()}
      disabled={disabled}
      className={
        "group inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-800 shadow-[0_4px_16px_-8px_rgba(39,47,84,0.25)] transition-colors hover:border-[#83BDE5] hover:bg-[#F7FBFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#83BDE5] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 " +
        className
      }
    >
      <GoogleLogo className="h-5 w-5 shrink-0" />
      <span className="text-[15px]">{disabled ? loadingLabel : label}</span>
    </motion.button>
  );
}
