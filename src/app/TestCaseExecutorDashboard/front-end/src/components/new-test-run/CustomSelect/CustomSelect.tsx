import 'bootstrap/dist/css/bootstrap.min.css';
interface SelectProps {
  options: string[];
  defaultText: string;
  className?: string;
  onChange: (value: string) => void;
}

export default function CustomSelect({
  options,
  defaultText,
  onChange,
}: SelectProps) {
  return (
    <select
      onChange={(e) => onChange(e.target.value)}
      defaultValue=""
    >
      <option value="" disabled>
        {defaultText}
      </option>

      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}