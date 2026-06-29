import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function PhoneInput(props: {
  value: string;
  onInput: (digits: string) => void;
  id?: string;
  required?: boolean;
}) {
  return (
    <div class="flex items-stretch gap-2">
      <span
        class={cn(
          "flex items-center border-2 border-ink bg-newsprint-dark px-3",
          "font-mono text-sm font-black text-ink shadow-hard-sm",
        )}
      >
        +976
      </span>
      <Input
        id={props.id}
        type="tel"
        inputmode="numeric"
        autocomplete="tel-national"
        placeholder="88889999"
        maxlength={8}
        value={props.value}
        onInput={(e) => props.onInput(e.currentTarget.value.replace(/\D/g, "").slice(0, 8))}
        class="font-mono text-lg tracking-wider"
        required={props.required}
      />
    </div>
  );
}
