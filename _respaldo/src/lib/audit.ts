import { supabase } from './supabase';

export async function logAudit(
  action: string,
  entity: string,
  entityId: string,
  oldValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null,
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('audit_log').insert({
      user_email: user?.email ?? 'unknown',
      action,
      entity,
      entity_id: entityId,
      old_value: oldValue,
      new_value: newValue,
    });
  } catch {
    // audit logging is best-effort, never block the UI
  }
}
