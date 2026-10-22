import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type DefaultValues, type FieldValues } from 'react-hook-form';
import { useNavigate } from 'react-router';
import type { z } from 'zod';

/**
 * Shared wiring for search forms: validates with the shared schema, then navigates to the
 * result URL built from the parsed (normalised) values.
 */
export function useSearchForm<S extends z.ZodType<FieldValues, FieldValues>>(
  schema: S,
  defaultValues: DefaultValues<z.input<S>>,
  toUrl: (values: z.output<S>) => string,
) {
  const navigate = useNavigate();
  const form = useForm<z.input<S>, unknown, z.output<S>>({
    resolver: zodResolver(schema as never) as never,
    defaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });
  const onSubmit = form.handleSubmit((values) => {
    void navigate(toUrl(values));
  });
  return { form, onSubmit };
}
