// The demo 8bitcn's docs page leads with, copied from
// https://github.com/TheOrcDev/8bitcn-ui/blob/9aedd7165837143803b95cdb2ab111923cf63efe/content/docs/components/input-otp.mdx
// (its first ComponentPreview). Only the "@/" import paths point at the vendored files.
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "../../vendor/8bitcn/components/ui/8bit/input-otp";

export default function Demo() {
  return (
    <>
      <InputOTP maxLength={6}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
    </>
  );
}
