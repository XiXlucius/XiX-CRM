import { Check, X } from 'lucide-react';
import { PASSWORD_RULES } from '../lib/validation';

export function PasswordRequirements({ value }: { value: string }) {
  return (
    <ul className="mt-2 space-y-1">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(value);
        return (
          <li
            key={rule.id}
            className={`flex items-center gap-2 text-xs transition-colors ${
              ok ? 'text-success-400' : 'text-metal-500'
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
