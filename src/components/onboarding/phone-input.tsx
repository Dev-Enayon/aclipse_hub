"use client";

const DIAL_CODES = [
  { code: "+234", country: "Nigeria" },
  { code: "+233", country: "Ghana" },
  { code: "+229", country: "Benin" },
  { code: "+254", country: "Kenya" },
  { code: "+27", country: "South Africa" },
  { code: "+44", country: "United Kingdom" },
  { code: "+1", country: "USA / Canada" },
  { code: "+971", country: "UAE" },
];

export function PhoneInput({
  value,
  onChange,
  id,
  placeholder = "801 234 5678",
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
}) {
  const match = value.match(/^(\+\d{1,3})\s?(.*)$/);
  const dialCode = match ? match[1] : "+234";
  const rest = match ? match[2] : value;

  const handleCodeChange = (newCode: string) => {
    onChange(rest ? `${newCode} ${rest}` : newCode);
  };

  const handleNumberChange = (newValue: string) => {
    const digits = newValue.replace(/[^\d\s\-()]/g, "");
    onChange(`${dialCode} ${digits}`);
  };

  return (
    <div className="flex rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent bg-white">
      <select
        aria-label="Country code"
        value={dialCode}
        onChange={(e) => handleCodeChange(e.target.value)}
        className="bg-gray-50 border-r border-gray-300 px-2 py-2.5 text-sm text-gray-700 focus:outline-none max-w-[130px]"
      >
        {!DIAL_CODES.some((c) => c.code === dialCode) && (
          <option value={dialCode}>{dialCode}</option>
        )}
        {DIAL_CODES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.country} ({c.code})
          </option>
        ))}
      </select>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        value={rest}
        onChange={(e) => handleNumberChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none min-w-0"
      />
    </div>
  );
}
