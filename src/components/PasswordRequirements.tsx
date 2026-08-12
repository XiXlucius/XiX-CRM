import { Check, X } from 'lucide-react';

interface Rule {
  label: string;
  test: (v: string) => boolean;
}

const RULES: Rule[] = [
  { label: 'Mínimo 6 caracteres', test: (v) => v.length >= 6 },
  { label: 'Una letra mayúscula', test: (v) => /[A-Z]/.test(v) },
  { label: 'Una letra minúscula', test: (v) => /[a-z]/.test(v) },
  { label: 'Un número', test: (v) => /\d/.test(v) },
];

export function PasswordRequirements({ value }: { value: string }) {
  return (
    <ul className="mt-2 space-y-1">
      {RULES.map((rule) => {
        const ok = rule.test(value);
        return (
          <li
            key={rule.label}
            className={`flex items-center gap-2 text-xs transition-colors ${
              ok ? 'text-emerald-400' : 'text-metal-500'
            }`}
          >
            {ok ? <Check size={13} /> : <X size={13} />}
            <span>{rule.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
