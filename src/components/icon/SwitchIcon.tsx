export default function SwitchIcon({
  isOn,
  disabled = false,
}: {
  isOn: boolean;
  disabled: boolean;
}) {
  return (
    <svg
      width="44"
      height="24"
      viewBox="0 0 44 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        width="44"
        height="24"
        rx="12"
        fill={isOn ? '#0F172A' : '#D1D5DB'}
      />
      <circle
        cx={isOn ? '32' : '12'}
        cy="12"
        r="10"
        fill="white"
        opacity={disabled ? 0.7 : 1}
      />
    </svg>
  );
}
