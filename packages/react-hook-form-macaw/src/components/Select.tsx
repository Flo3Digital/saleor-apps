import { Select as $Select, type SelectProps as $SelectProps, Option } from "@saleor/macaw-ui/next";
import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";

export type SelectProps<T extends FieldValues = FieldValues> = Omit<
  $SelectProps<Option>,
  "name"
> & {
  name: FieldPath<T>;
  control: Control<T>;
  /**
   * Re-declare because inner Macaw type pointed to *any*
   */
  options: Option[];
};

export function Select<TFieldValues extends FieldValues = FieldValues>({
  type,
  required,
  name,
  control,
  options,
  ...rest
}: SelectProps<TFieldValues>): JSX.Element {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { value, onChange, ...field }, fieldState: { error } }) => (
        <$Select
          {...rest}
          {...field}
          options={options}
          value={options.find((o) => o.value === value) ?? null}
          onChange={(value) => onChange(value.value)}
          name={name}
          required={required}
          type={type}
          error={!!error}
          helperText={rest.helperText}
        />
      )}
    />
  );
}
