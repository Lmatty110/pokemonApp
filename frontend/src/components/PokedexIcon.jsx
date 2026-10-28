export default function PokedexIcon({ className = "w-6 h-6" }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true">
      <path d="M11 6h37a6 6 0 0 1 6 6v40a6 6 0 0 1-6 6H11a5 5 0 0 1-5-5V11a5 5 0 0 1 5-5Z" fill="currentColor" stroke="#17202A" strokeWidth="3" />
      <path d="M36 6v52" stroke="#17202A" strokeWidth="3" />
      <circle cx="18" cy="17" r="7" fill="#8BE9FD" stroke="white" strokeWidth="3" />
      <circle cx="31" cy="11" r="2" fill="#F4D03F" />
      <rect x="12" y="29" width="18" height="15" rx="2" fill="#D6F5F3" stroke="#17202A" strokeWidth="2.5" />
      <path d="M44 30v16M36 38h16" stroke="#17202A" strokeWidth="4" strokeLinecap="round" />
      <circle cx="47" cy="17" r="3" fill="#58D68D" stroke="#17202A" strokeWidth="2" />
      <circle cx="18" cy="51" r="3" fill="#17202A" />
    </svg>
  );
}

