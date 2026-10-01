export default function OtpNotice() {
  return (
    <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg p-3 flex items-start gap-2">
      <span className="text-base leading-none">📩</span>
      <p>
        <b>OTP not received?</b> Please check your <b>Spam/Junk folder</b> once.
        Emails from a new sender sometimes land there.
      </p>
    </div>
  );
}